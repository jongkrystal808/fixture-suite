"""
Inventory Router (Read-only)
庫存查詢 API（v6｜existence_status / usage_status）
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from backend.app.database import db
from backend.app.dependencies import get_current_customer_id

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


# ============================================================
# 序號庫存（Serial Inventory）
# ============================================================
@router.get("/serial")
def list_serial_inventory(
    customer_id: str = Depends(get_current_customer_id),

    existence_status: Optional[str] = Query(
        default=None,
        description="in_stock / returned / scrapped"
    ),
    usage_status: Optional[str] = Query(
        default=None,
        description="idle / deployed / maintenance"
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

    if existence_status:
        where.append("existence_status = %s")
        params.append(existence_status)

    if usage_status:
        where.append("usage_status = %s")
        params.append(usage_status)

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            fixture_id,
            serial_number,
            existence_status,
            usage_status,
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
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    sql = """
        SELECT *
        FROM v_inventory_history
        WHERE customer_id = %s
          AND fixture_id = %s
        ORDER BY transaction_date DESC, id DESC
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
    1. fixture_id only (summary)
    2. fixture_id + serial
    3. fixture_id + datecode
    """

    # ==================================================
    # 0️⃣ 只搜尋治具（summary）
    # ==================================================
    if keyword in ("", "*"):
        serial_summary = db.execute_one(
            """
            SELECT
                SUM(CASE WHEN existence_status='in_stock' THEN 1 ELSE 0 END) AS in_stock_qty,
                SUM(CASE WHEN existence_status='returned' THEN 1 ELSE 0 END) AS returned_qty,
                SUM(CASE WHEN existence_status='scrapped' THEN 1 ELSE 0 END) AS scrapped_qty,

                SUM(CASE WHEN existence_status='in_stock' AND usage_status='idle' THEN 1 ELSE 0 END) AS available_qty,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='deployed' THEN 1 ELSE 0 END) AS deployed_qty,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='maintenance' THEN 1 ELSE 0 END) AS maintenance_qty
            FROM fixture_serials
            WHERE customer_id = %s
              AND fixture_id = %s
            """,
            (customer_id, fixture_id)
        ) or {}

        datecode_summary = db.execute_query(
            """
            SELECT
                datecode,
                in_stock_qty,
                returned_qty,
                source_type
            FROM fixture_datecode_inventory
            WHERE customer_id = %s
              AND fixture_id = %s
            ORDER BY datecode
            """,
            (customer_id, fixture_id)
        ) or []

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
            ORDER BY transaction_date DESC, id DESC
            LIMIT 50
            """,
            (customer_id, fixture_id)
        ) or []

        return {
            "type": "fixture",
            "fixture_id": fixture_id,
            "found": True,
            "summary": {
                "serial_in_stock": serial_summary.get("in_stock_qty") or 0,
                "serial_available": serial_summary.get("available_qty") or 0,
                "serial_deployed": serial_summary.get("deployed_qty") or 0,
                "serial_maintenance": serial_summary.get("maintenance_qty") or 0,
                "serial_returned": serial_summary.get("returned_qty") or 0,
                "serial_scrapped": serial_summary.get("scrapped_qty") or 0,
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
            existence_status,
            usage_status,
            current_station_id,
            receipt_date,
            return_date,
            note
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
            FROM material_transactions mt
            WHERE mt.customer_id = %s
              AND mt.fixture_id = %s
              AND EXISTS (
                SELECT 1
                FROM material_transaction_items mti
                WHERE mti.transaction_id = mt.id
                  AND mti.serial_number = %s
              )
            ORDER BY transaction_date DESC, mt.id DESC
            """,
            (customer_id, fixture_id, keyword)
        ) or []

        is_available = (
            serial_row["existence_status"] == "in_stock"
            and serial_row["usage_status"] == "idle"
        )

        # 相容舊前端（仍回傳 status），但同時提供 v6 欄位
        api_status = (
            serial_row["existence_status"]
            if serial_row["existence_status"] != "in_stock"
            else serial_row["usage_status"]
        )

        return {
            "type": "serial",
            "fixture_id": fixture_id,
            "found": True,
            "status": api_status,                 # legacy compatibility
            "is_available": is_available,         # v6 recommended
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
            returned_qty,
            source_type,
            updated_at
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
            ORDER BY transaction_date DESC, id DESC
            """,
            (customer_id, fixture_id, keyword)
        ) or []

        api_status = "in_stock" if (datecode_row["in_stock_qty"] or 0) > 0 else "returned"

        return {
            "type": "datecode",
            "fixture_id": fixture_id,
            "found": True,
            "status": api_status,
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


@router.get("")
def list_inventory_overview(
    customer_id: str = Depends(get_current_customer_id),
    keyword: str = Query(""),
    hide_zero: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1),
):

    base_where = "f.customer_id = %s AND f.is_scrapped = 0"
    base_params = [customer_id]

    if keyword:
        base_where += " AND (f.id LIKE %s OR f.fixture_name LIKE %s)"
        base_params += [f"%{keyword}%", f"%{keyword}%"]

    # --------------------------------------------------
    # 主查詢（不加 HAVING）
    # --------------------------------------------------
    base_sql = f"""
        SELECT
            f.id AS fixture_id,
            f.fixture_name,

            COALESCE(s.serial_in_stock, 0) AS serial_in_stock,
            COALESCE(s.serial_available, 0) AS serial_available,
            COALESCE(s.serial_deployed, 0) AS serial_deployed,
            COALESCE(s.serial_returned, 0) AS serial_returned,

            COALESCE(d.datecode_in_stock, 0) AS datecode_in_stock,
            COALESCE(d.datecode_returned, 0) AS datecode_returned,
            COALESCE(d.datecode_self_in_stock, 0) AS datecode_self_in_stock,
            COALESCE(d.datecode_customer_in_stock, 0) AS datecode_customer_in_stock

        FROM fixtures f

        LEFT JOIN (
            SELECT
                fixture_id,
                SUM(CASE WHEN existence_status='in_stock' THEN 1 ELSE 0 END) AS serial_in_stock,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='idle' THEN 1 ELSE 0 END) AS serial_available,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='deployed' THEN 1 ELSE 0 END) AS serial_deployed,
                SUM(CASE WHEN existence_status='returned' THEN 1 ELSE 0 END) AS serial_returned
            FROM fixture_serials
            WHERE customer_id = %s
            GROUP BY fixture_id
        ) s ON s.fixture_id = f.id

        LEFT JOIN (
            SELECT
                fixture_id,
                SUM(in_stock_qty) AS datecode_in_stock,
                SUM(returned_qty) AS datecode_returned,
                SUM(CASE WHEN source_type='self' THEN in_stock_qty ELSE 0 END) AS datecode_self_in_stock,
                SUM(CASE WHEN source_type='customer' THEN in_stock_qty ELSE 0 END) AS datecode_customer_in_stock
            FROM fixture_datecode_inventory
            WHERE customer_id = %s
            GROUP BY fixture_id
        ) d ON d.fixture_id = f.id

        WHERE {base_where}
    """

    params = [
        customer_id,
        customer_id,
        *base_params
    ]

    # --------------------------------------------------
    # hide_zero → 用外層包 SELECT
    # --------------------------------------------------
    final_sql = f"SELECT * FROM ({base_sql}) AS inv"

    if hide_zero:
        final_sql += """
            WHERE (serial_in_stock + datecode_in_stock) > 0
        """

    # --------------------------------------------------
    # total
    # --------------------------------------------------
    count_sql = f"SELECT COUNT(*) AS cnt FROM ({final_sql}) AS sub"
    total = db.execute_one(count_sql, tuple(params))["cnt"]

    # --------------------------------------------------
    # 分頁
    # --------------------------------------------------
    final_sql += " ORDER BY fixture_id LIMIT %s OFFSET %s"
    rows = db.execute_query(
        final_sql,
        tuple(params + [limit, skip])
    ) or []

    return {
        "fixtures": rows,
        "total": total,
        "skip": skip,
        "limit": limit,
    }
