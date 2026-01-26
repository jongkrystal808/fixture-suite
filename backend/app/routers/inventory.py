"""
Inventory Router (Read-only)
庫存查詢 API
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from backend.app.database import db
from backend.app.dependencies import get_current_customer_id

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)

# ============================================================
# 序號庫存
# ============================================================
@router.get("/serial")
def list_serial_inventory(
    customer_id: str = Depends(get_current_customer_id),
    status: Optional[str] = Query(
        default=None,
        description="in_stock / deployed / maintenance / returned / scrapped"
    ),
    fixture_id: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """
    查詢治具序號庫存（Read-only）
    來源：fixture_serials
    """

    where = ["customer_id = %s"]
    params = [customer_id]

    if status:
        where.append("status = %s")
        params.append(status)

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            fixture_id,
            serial_number,
            status,
            source_type,
            current_station_id,
            receipt_date,
            return_date,
            note
        FROM fixture_serials
        WHERE {where_sql}
        ORDER BY fixture_id, serial_number
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])

    rows = db.execute_query(sql, tuple(params))

    return {
        "items": rows,
        "skip": skip,
        "limit": limit,
    }


# ============================================================
# Datecode 庫存
# ============================================================
@router.get("/datecode")
def list_datecode_inventory(
    customer_id: str = Depends(get_current_customer_id),
    fixture_id: Optional[str] = Query(default=None),
    only_in_stock: bool = Query(default=True),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """
    查詢治具 Datecode 庫存（Read-only）
    來源：fixture_datecode_inventory
    """

    where = ["customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    if only_in_stock:
        where.append("in_stock_qty > 0")

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            fixture_id,
            datecode,
            in_stock_qty,
            returned_qty,
            source_type,
            updated_at
        FROM fixture_datecode_inventory
        WHERE {where_sql}
        ORDER BY fixture_id, datecode
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])

    rows = db.execute_query(sql, tuple(params))

    return {
        "items": rows,
        "skip": skip,
        "limit": limit,
    }



# ============================================================
# Inventory History（序號 / 批量 / Datecode 整合）
# ============================================================
@router.get("/history")
def list_inventory_history(
    customer_id: str = Depends(get_current_customer_id),
    fixture_id: str = Query(...),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
):
    """
    庫存異動歷史（Read-only）
    來源：
    - material_transactions
    - material_transaction_items
    """

    sql = """
          SELECT 
              mt.id,
              mt.transaction_type,                 -- receipt / return
              mt.record_type,                      -- individual / batch / datecode
              mt.transaction_date AS date,
              mt.order_no,
              mt.quantity,                         -- ✅ 正確的「數量」
              mt.note,
            
              -- 依 record_type 組合顯示內容
              CASE
                WHEN mt.record_type IN ('individual','batch')
                  THEN GROUP_CONCAT(mti.serial_number ORDER BY mti.serial_number SEPARATOR ', ')
                WHEN mt.record_type = 'datecode'
                  THEN CONCAT('Datecode: ', MAX(mti.datecode))
                ELSE NULL
              END AS content
            
            FROM material_transactions mt
            LEFT JOIN material_transaction_items mti
              ON mti.transaction_id = mt.id
            
            WHERE mt.customer_id = %s
              AND mt.fixture_id = %s
            
            GROUP BY mt.id
            
            ORDER BY mt.transaction_date DESC, mt.id DESC
            LIMIT %s OFFSET %s
          """

    rows = db.execute_query(
        sql,
        (customer_id, fixture_id, limit, skip)
    )

    return {
        "items": rows,
        "skip": skip,
        "limit": limit,
    }


@router.get("/search")
def search_inventory(
    fixture_id: str = Query(...),
    keyword: str = Query(""),
    customer_id: str = Depends(get_current_customer_id),
):
    """
    Inventory 搜尋：
    1. fixture_id + serial
    2. fixture_id + datecode
    3. fixture_id only（keyword 為空或 *）
    """

    # ==================================================
    # 0️⃣ 只搜尋治具編號（不帶 serial / datecode）
    # ==================================================
    if keyword in ("", "*"):
        # --- serial summary ---
        serial_summary = db.execute_one(
            """
            SELECT
                SUM(CASE WHEN status IN ('deployed','in_use') THEN 1 ELSE 0 END) AS in_use,
                SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) AS in_stock
            FROM fixture_serials
            WHERE customer_id = %s
              AND fixture_id = %s
            """,
            (customer_id, fixture_id)
        )

        # --- datecode summary ---
        datecode_summary = db.execute_query(
            """
            SELECT
                datecode,
                in_use_qty,
                in_stock_qty
            FROM fixture_datecode_inventory
            WHERE customer_id = %s
              AND fixture_id = %s
            """,
            (customer_id, fixture_id)
        )

        # --- recent history ---
        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions
            WHERE customer_id = %s
              AND fixture_id = %s
            ORDER BY transaction_date DESC
            LIMIT 50
            """,
            (customer_id, fixture_id)
        )

        return {
            "type": "fixture",
            "fixture_id": fixture_id,
            "found": True,
            "summary": {
                "serial_in_use": serial_summary["in_use"] or 0,
                "serial_in_stock": serial_summary["in_stock"] or 0,
                "datecodes": datecode_summary,
            },
            "history": history,
        }

    # ==================================================
    # 1️⃣ serial 搜尋
    # ==================================================
    serial_row = db.execute_one(
        """
        SELECT
            fixture_id,
            serial_number,
            status
        FROM fixture_serials
        WHERE customer_id = %s
          AND fixture_id = %s
          AND serial_number = %s
        LIMIT 1
        """,
        (customer_id, fixture_id, keyword)
    )

    if serial_row:
        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions
            WHERE customer_id = %s
              AND fixture_id = %s
              AND (
                serials LIKE %s
                OR serial_range LIKE %s
              )
            ORDER BY transaction_date DESC
            """,
            (
                customer_id,
                fixture_id,
                f"%{keyword}%",
                f"%{keyword}%"
            )
        )

        return {
            "type": "serial",
            "fixture_id": fixture_id,
            "found": True,
            "status": serial_row["status"],
            "data": serial_row,
            "history": history,
        }

    # ==================================================
    # 2️⃣ datecode 搜尋
    # ==================================================
    datecode_row = db.execute_one(
        """
        SELECT
            fixture_id,
            datecode,
            in_stock_qty,
            in_use_qty
        FROM fixture_datecode_inventory
        WHERE customer_id = %s
          AND fixture_id = %s
          AND datecode = %s
        LIMIT 1
        """,
        (customer_id, fixture_id, keyword)
    )

    if datecode_row:
        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions
            WHERE customer_id = %s
              AND fixture_id = %s
              AND datecode = %s
            ORDER BY transaction_date DESC
            """,
            (
                customer_id,
                fixture_id,
                keyword
            )
        )

        return {
            "type": "datecode",
            "fixture_id": fixture_id,
            "found": True,
            "status": (
                "in_use"
                if datecode_row["in_use_qty"] > 0
                else "in_stock"
            ),
            "data": datecode_row,
            "history": history,
        }

    # ==================================================
    # 3️⃣ 全部找不到
    # ==================================================
    return {
        "type": None,
        "fixture_id": fixture_id,
        "found": False,
        "message": "查無此治具 / 序號 / Datecode"
    }
