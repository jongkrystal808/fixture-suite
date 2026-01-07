"""
收料 Receipts Router (v4.x FIXED)
- SP-first 架構
- Router 僅負責參數轉接 / 權限 / record_type 分流
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user
from backend.app.models.transaction import TransactionCreate

from openpyxl import Workbook
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/receipts", tags=["收料 Receipts"])


# ============================================================
# Helper
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(
            status_code=400,
            detail=f"治具 {fixture_id} 不存在或不屬於此客戶"
        )


# ============================================================
# 查詢收料紀錄
# GET /receipts
# ============================================================

@router.get("", summary="查詢收料紀錄")
def list_receipts(
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    record_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    serial: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    where = [
        "t.transaction_type = 'receipt'",
        "t.customer_id = %s",
    ]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if order_no:
        where.append("t.order_no LIKE %s")
        params.append(f"%{order_no}%")

    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if record_type:
        where.append("t.record_type = %s")
        params.append(record_type)

    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    if serial:
        where.append("""
            t.record_type IN ('batch','individual')
            AND EXISTS (
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
            t.record_type,
            t.fixture_id,
            t.order_no,
            t.operator,
            t.note,
            t.source_type,
            t.created_at,

            CASE
              WHEN t.record_type = 'datecode'
                THEN (
                  SELECT SUM(fd.quantity)
                  FROM fixture_datecode_transactions fd
                  WHERE fd.transaction_id = t.id
                )
              ELSE (
                  SELECT COUNT(*)
                  FROM material_transaction_items i
                  WHERE i.transaction_id = t.id
              )
            END AS quantity

        FROM material_transactions t
        WHERE {where_sql}
        ORDER BY t.created_at DESC, t.id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    total = db.execute_query(
        f"""
        SELECT COUNT(*) AS cnt
        FROM material_transactions t
        WHERE {where_sql}
        """,
        tuple(params),
    )[0]["cnt"]

    return {
        "total": total,
        "receipts": rows,
    }


# ============================================================
# 取得單筆收料
# GET /receipts/{id}
# ============================================================

@router.get("/{receipt_id}", summary="取得收料單")
def get_receipt(
    receipt_id: int,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    rows = db.execute_query(
        """
        SELECT
            id,
            record_type,
            fixture_id,
            order_no,
            operator,
            note,
            source_type,
            created_at
        FROM material_transactions
        WHERE id=%s
          AND customer_id=%s
          AND transaction_type='receipt'
        """,
        (receipt_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "收料單不存在")

    return rows[0]


# ============================================================
# 新增收料（SP）
# POST /receipts
# ============================================================

@router.post("", summary="新增收料")
def create_receipt(
    data: TransactionCreate,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    fixture_id = data.fixture_id
    order_no = data.order_no
    operator = data.operator or user.username
    note = data.note
    created_by = user.id

    record_type = data.record_type.value
    source_type = data.source_type.value

    serials_csv = None
    datecode = None
    quantity = None

    if record_type in ("batch", "individual"):
        if not data.serials:
            raise HTTPException(400, "序號模式必須提供 serials")
        serials_csv = ",".join(data.serials)
    elif record_type == "datecode":
        if not data.datecode or data.quantity is None:
            raise HTTPException(400, "datecode 模式需提供 datecode 與 quantity")
        datecode = data.datecode
        quantity = data.quantity
    else:
        raise HTTPException(400, f"不支援的 record_type: {record_type}")

    ensure_fixture_exists(fixture_id, customer_id)

    try:
        db.execute_query(
            """
            CALL sp_material_receipt(
                %s, %s, %s, %s, %s, %s,
                %s, %s,
                %s,
                %s, %s,
                @transaction_id, @message
            )
            """,
            (
                customer_id,
                fixture_id,
                order_no,
                operator,
                note,
                created_by,
                record_type,
                source_type,
                serials_csv,
                datecode,
                quantity,
            ),
        )

        out = db.execute_query(
            "SELECT @transaction_id AS id, @message AS message"
        )

        if not out or out[0]["id"] is None:
            raise HTTPException(400, out[0]["message"] or "收料失敗")

        return {
            "id": out[0]["id"],
            "record_type": record_type,
            "fixture_id": fixture_id,
            "order_no": order_no,
            "datecode": datecode,
            "quantity": quantity,
            "source_type": source_type,
            "operator": operator,
            "note": note,
            "created_at": datetime.utcnow(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"建立收料失敗: {e}")


# ============================================================
# 匯出收料 XLSX
# GET /receipts/{id}/export
# ============================================================

@router.get("/{receipt_id}/export", summary="匯出收料明細為 XLSX")
def export_receipt_xlsx(
    receipt_id: int,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    rows = db.execute_query(
        """
        SELECT id, record_type, fixture_id
        FROM material_transactions
        WHERE id=%s
          AND customer_id=%s
          AND transaction_type='receipt'
        """,
        (receipt_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "收料單不存在")

    receipt = rows[0]
    record_type = receipt["record_type"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Receipt"

    if record_type in ("batch", "individual"):
        ws.append(["Serial Number"])
        items = db.execute_query(
            """
            SELECT serial_number
            FROM material_transaction_items
            WHERE transaction_id=%s
            ORDER BY serial_number
            """,
            (receipt_id,),
        )
        for r in items:
            ws.append([r["serial_number"]])

    elif record_type == "datecode":
        ws.append(["Fixture ID", "Datecode", "Quantity"])
        items = db.execute_query(
            """
            SELECT datecode, quantity
            FROM fixture_datecode_transactions
            WHERE transaction_id=%s
            """,
            (receipt_id,),
        )
        for i in items:
            ws.append([
                receipt["fixture_id"],
                i["datecode"],
                i["quantity"],
            ])
    else:
        raise HTTPException(400, f"未知的 record_type: {record_type}")

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="receipt_{receipt_id}.xlsx"'
        },
    )
