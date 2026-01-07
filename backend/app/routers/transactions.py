# backend/app/routers/transactions.py

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from backend.app.dependencies import get_current_user
from backend.app.database import db
import openpyxl
import io
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/transactions",
    tags=["通用交易 Transaction Wrapper"]
)

# ============================================================
# ★ 收退料總檢視（v4.x）
# ============================================================

@router.get("/view-all", summary="收退料總檢視（收料 + 退料）")
async def view_all_transactions(
    fixture_id: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),  # receipt | return
    serial: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),

    skip: int = Query(0),
    limit: int = Query(200),
    user=Depends(get_current_user)
):
    customer_id = user.customer_id

    where = ["t.customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if transaction_type in ("receipt", "return"):
        where.append("t.transaction_type = %s")
        params.append(transaction_type)

    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    if serial:
        where.append("""
            EXISTS (
                SELECT 1
                FROM material_transaction_items i
                WHERE i.transaction_id = t.id
                  AND i.serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            t.id,
            t.transaction_date,
            t.transaction_type,
            t.fixture_id,
            t.order_no,
            t.source_type,
            t.record_type,
            t.operator,
            t.note,
            CASE
                WHEN t.record_type = 'datecode'
                    THEN (
                        SELECT SUM(i.quantity)
                        FROM material_transaction_items i
                        WHERE i.transaction_id = t.id
                    )
                ELSE (
                        SELECT COUNT(*)
                        FROM material_transaction_items i
                        WHERE i.transaction_id = t.id
                )
            END AS quantity
        FROM material_transactions t
        WHERE {where_sql}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    total = db.execute_query(
        f"SELECT COUNT(*) AS total FROM material_transactions t WHERE {where_sql}",
        tuple(params)
    )[0]["total"]

    return {"total": total, "rows": rows}


# ============================================================
# ★ 序號檢視（收 / 退）
# ============================================================

@router.get("/serials", summary="序號交易列表")
async def view_transaction_serials(
    fixture_id: Optional[str] = Query(None),
    serial: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),

    skip: int = Query(0),
    limit: int = Query(100),
    user=Depends(get_current_user)
):
    customer_id = user.customer_id

    where = [
        "t.customer_id = %s",
        "t.record_type != 'datecode'"
    ]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id = %s")
        params.append(fixture_id)

    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if transaction_type:
        where.append("t.transaction_type = %s")
        params.append(transaction_type)

    if serial:
        where.append("i.serial_number LIKE %s")
        params.append(f"%{serial}%")

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            t.id AS transaction_id,
            t.transaction_date,
            t.transaction_type,
            t.fixture_id,
            t.order_no,
            t.operator,
            i.serial_number
        FROM material_transactions t
        JOIN material_transaction_items i
          ON t.id = i.transaction_id
        WHERE {where_sql}
        ORDER BY t.transaction_date DESC, t.id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    total = db.execute_query(
        f"""
        SELECT COUNT(*) AS total
        FROM material_transactions t
        JOIN material_transaction_items i
          ON t.id = i.transaction_id
        WHERE {where_sql}
        """,
        tuple(params)
    )[0]["total"]

    return {"rows": rows, "total": total}


# ============================================================
# ★ 單一序號完整履歷
# ============================================================

@router.get("/serials/{serial_number}/history", summary="序號完整履歷")
async def get_serial_history(
    serial_number: str,
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    serial = serial_number.strip()

    serial_info = db.execute_query(
        """
        SELECT *
        FROM fixture_serials
        WHERE serial_number = %s
          AND customer_id = %s
        """,
        (serial, customer_id)
    )

    if not serial_info:
        raise HTTPException(404, "Serial not found")

    transactions = db.execute_query(
        """
        SELECT
            t.transaction_date,
            t.transaction_type,
            t.order_no,
            t.fixture_id,
            t.operator,
            t.note
        FROM material_transactions t
        JOIN material_transaction_items i
          ON t.id = i.transaction_id
        WHERE i.serial_number = %s
          AND t.customer_id = %s
        ORDER BY t.transaction_date DESC, t.id DESC
        """,
        (serial, customer_id)
    )

    usages = db.execute_query(
        """
        SELECT
            used_at,
            model_id,
            station_id,
            use_count,
            operator,
            note
        FROM usage_logs
        WHERE serial_number = %s
          AND customer_id = %s
        ORDER BY used_at DESC
        """,
        (serial, customer_id)
    )

    replacements = db.execute_query(
        """
        SELECT
            created_at,
            usage_before,
            usage_after,
            auto_predicted_life,
            auto_predicted_replace_at
        FROM replacement_logs
        WHERE serial_number = %s
          AND customer_id = %s
        ORDER BY created_at DESC
        """,
        (serial, customer_id)
    )

    return {
        "serial": serial_info[0],
        "transactions": transactions,
        "usages": usages,
        "replacements": replacements
    }


@router.get("/summary/export")
async def export_summary(
    fixture_id: Optional[str] = Query(None),
    datecode: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),

    # ?type=summary | detailed
    export_type: str = Query("summary", alias="type"),

    user=Depends(get_current_user)
):
    customer_id = user.customer_id

    # --------------------------------------------------
    # WHERE 條件（v4.x）
    # --------------------------------------------------
    where = ["t.customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id = %s")
        params.append(fixture_id)

    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    where_sql = " AND ".join(where)

    # ==================================================
    # Summary 匯出
    # ==================================================
    if export_type == "summary":
        sql = f"""
            SELECT
                t.fixture_id,

                SUM(
                    CASE
                        WHEN t.transaction_type = 'receipt' THEN
                            CASE
                                WHEN t.record_type = 'datecode'
                                    THEN (
                                        SELECT COALESCE(SUM(i.quantity), 0)
                                        FROM material_transaction_items i
                                        WHERE i.transaction_id = t.id
                                    )
                                ELSE (
                                        SELECT COUNT(*)
                                        FROM material_transaction_items i
                                        WHERE i.transaction_id = t.id
                                    )
                            END
                        ELSE 0
                    END
                ) AS receipt_qty,

                SUM(
                    CASE
                        WHEN t.transaction_type = 'return' THEN
                            CASE
                                WHEN t.record_type = 'datecode'
                                    THEN (
                                        SELECT COALESCE(SUM(i.quantity), 0)
                                        FROM material_transaction_items i
                                        WHERE i.transaction_id = t.id
                                    )
                                ELSE (
                                        SELECT COUNT(*)
                                        FROM material_transaction_items i
                                        WHERE i.transaction_id = t.id
                                    )
                            END
                        ELSE 0
                    END
                ) AS return_qty

            FROM material_transactions t
            WHERE {where_sql}
            GROUP BY t.fixture_id
            ORDER BY t.fixture_id
        """

        rows = db.execute_query(sql, tuple(params))
        headers = ["治具ID", "收料數", "退料數", "總數"]

        # 計算 total
        for r in rows:
            r["total_qty"] = (r["receipt_qty"] or 0) - (r["return_qty"] or 0)

    # ==================================================
    # Detailed 匯出
    # ==================================================
    else:
        where_items = []
        params_items = []

        if datecode:
            where_items.append("i.datecode = %s")
            params_items.append(datecode)

        where_items_sql = (
            " AND " + " AND ".join(where_items)
            if where_items else ""
        )

        sql = f"""
            SELECT
                t.fixture_id,
                i.datecode,
                i.serial_number,

                SUM(
                    CASE WHEN t.transaction_type = 'receipt' THEN
                        CASE
                            WHEN t.record_type = 'datecode' THEN COALESCE(i.quantity, 0)
                            ELSE 1
                        END
                    ELSE 0 END
                ) AS receipt_qty,

                SUM(
                    CASE WHEN t.transaction_type = 'return' THEN
                        CASE
                            WHEN t.record_type = 'datecode' THEN COALESCE(i.quantity, 0)
                            ELSE 1
                        END
                    ELSE 0 END
                ) AS return_qty

            FROM material_transactions t
            JOIN material_transaction_items i
              ON i.transaction_id = t.id
            WHERE {where_sql}
            {where_items_sql}
            GROUP BY
                t.fixture_id,
                i.datecode,
                i.serial_number
            ORDER BY
                t.fixture_id,
                i.datecode,
                i.serial_number
        """

        rows = db.execute_query(
            sql,
            tuple(params + params_items)
        )

        headers = ["治具ID", "Datecode", "序號", "收料數", "退料數", "總數"]

        for r in rows:
            r["total_qty"] = (r["receipt_qty"] or 0) - (r["return_qty"] or 0)

    # --------------------------------------------------
    # 產生 Excel
    # --------------------------------------------------
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)

    for r in rows:
        ws.append([
            r.get("fixture_id"),
            r.get("datecode"),
            r.get("serial_number"),
            r.get("receipt_qty"),
            r.get("return_qty"),
            r.get("total_qty"),
        ] if export_type == "detailed" else [
            r.get("fixture_id"),
            r.get("receipt_qty"),
            r.get("return_qty"),
            r.get("total_qty"),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = (
        "transactions_summary.xlsx"
        if export_type == "summary"
        else "transactions_summary_detailed.xlsx"
    )

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
