"""
交易 Transactions Router（v6 FINAL）
- 合併 receipt / return
- SP-first
- validate-first
- 不留下失敗交易
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
import io
import pymysql

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.models.transaction import TransactionCreate

from openpyxl import Workbook
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/transactions", tags=["交易 Transactions"])


# ============================================================
# Helper
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於此客戶")


# ============================================================
# 查詢交易（receipt + return）
# GET /transactions
# ============================================================

@router.get("")
def list_transactions(
    transaction_type: Optional[str] = None,  # receipt / return
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    record_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    serial: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    customer_id: str = Depends(get_current_customer_id),
):
    where = ["customer_id = %s"]
    params = [customer_id]

    if transaction_type:
        where.append("transaction_type = %s")
        params.append(transaction_type)

    if fixture_id:
        where.append("fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if order_no:
        where.append("order_no LIKE %s")
        params.append(f"%{order_no}%")

    if operator:
        where.append("operator LIKE %s")
        params.append(f"%{operator}%")

    if record_type:
        where.append("record_type = %s")
        params.append(record_type)

    if date_from:
        where.append("transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("transaction_date <= %s")
        params.append(date_to)

    if serial:
        where.append("""
            record_type IN ('batch','individual')
            AND EXISTS (
                SELECT 1
                FROM material_transaction_items i
                WHERE i.transaction_id = transaction_id
                  AND i.serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    where_sql = " AND ".join(where)

    rows = db.execute_query(
        f"""
        SELECT
            transaction_id AS id,
            transaction_type,
            transaction_date,
            record_type,
            fixture_id,
            order_no,
            source_type,
            quantity,
            operator,
            note
        FROM v_material_transactions_query
        WHERE {where_sql}
        ORDER BY transaction_date DESC, transaction_id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, skip]),
    )

    total = db.execute_query(
        f"SELECT COUNT(*) AS cnt FROM v_material_transactions_query WHERE {where_sql}",
        tuple(params),
    )[0]["cnt"]

    return {"total": total, "transactions": rows}


# ============================================================
# 取得單筆交易
# GET /transactions/{id}
# ============================================================

@router.get("/{transaction_id}")
def get_transaction(
    transaction_id: int,
    customer_id: str = Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT *
        FROM v_material_transactions_query
        WHERE transaction_id=%s AND customer_id=%s
        """,
        (transaction_id, customer_id),
    )
    if not rows:
        raise HTTPException(404, "交易不存在")
    return rows[0]


# ============================================================
# 新增交易（receipt / return）
# POST /transactions
# ============================================================

@router.post("")
def create_transaction(
    data: TransactionCreate,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    tx_type = data.transaction_type.value  # receipt | return

    fixture_id = data.fixture_id
    order_no = data.order_no
    operator = data.operator or user["username"]
    note = data.note
    created_by = user["id"]

    record_type = data.record_type.value
    source_type = data.source_type.value

    serials_csv = None
    datecode = None
    quantity = None

    if record_type in ("batch", "individual"):
        if not data.serials:
            raise HTTPException(400, "序號模式必須提供 serials")
        serials_csv = ",".join(data.serials)
        quantity = len(data.serials)

    elif record_type == "datecode":
        if not data.datecode or data.quantity is None or data.quantity <= 0:
            raise HTTPException(400, "datecode 模式需提供 datecode 與 quantity > 0")
        datecode = data.datecode
        quantity = data.quantity

    ensure_fixture_exists(fixture_id, customer_id)

    sp_name = {
        "receipt": "sp_material_receipt_v6",
        "return": "sp_material_return_v6",
    }.get(tx_type)

    if not sp_name:
        raise HTTPException(400, f"不支援的 transaction_type: {tx_type}")

    try:
        out = db.call_sp_with_out(
            sp_name,
            [
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
            ],
            ["o_transaction_id", "o_message"],
        )

        if not out or not out.get("o_transaction_id"):
            raise HTTPException(400, out.get("o_message") if out else "交易失敗")

    except Exception as e:
        msg = e.args[1] if isinstance(e, pymysql.MySQLError) and len(e.args) >= 2 else str(e)
        raise HTTPException(400, msg)

    return {
        "transaction_id": out["o_transaction_id"],
        "message": out.get("o_message") or "交易成功",
    }


# ============================================================
# 匯出交易 XLSX
# GET /transactions/{id}/export
# ============================================================

@router.get("/{transaction_id}/export")
def export_transaction_xlsx(
    transaction_id: int,
    customer_id: str = Depends(get_current_customer_id),
):
    tx = db.execute_query(
        """
        SELECT transaction_type, record_type, fixture_id
        FROM v_material_transactions_query
        WHERE transaction_id=%s AND customer_id=%s
        """,
        (transaction_id, customer_id),
    )
    if not tx:
        raise HTTPException(404, "交易不存在")

    tx = tx[0]
    record_type = tx["record_type"]

    wb = Workbook()
    ws = wb.active
    ws.title = tx["transaction_type"].capitalize()

    if record_type in ("batch", "individual"):
        ws.append(["Serial Number"])
        items = db.execute_query(
            "SELECT serial_number FROM material_transaction_items WHERE transaction_id=%s",
            (transaction_id,),
        )
        for r in items:
            ws.append([r["serial_number"]])

    else:
        ws.append(["Fixture ID", "Datecode", "Quantity"])
        items = db.execute_query(
            "SELECT datecode, quantity FROM fixture_datecode_transactions WHERE transaction_id=%s",
            (transaction_id,),
        )
        for i in items:
            ws.append([tx["fixture_id"], i["datecode"], i["quantity"]])

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            f'attachment; filename="{tx["transaction_type"]}_{transaction_id}.xlsx"'
        },
    )
