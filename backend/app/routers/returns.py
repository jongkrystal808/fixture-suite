"""
退料 Returns Router（v6 FINAL）
- SP-first 架構
- customer 由 X-Customer-Id 決定
- 僅呼叫 sp_material_return_v6
- 不假設 SP result set
- validate-first，不留下失敗交易
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import date
import io
import pymysql

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_customer_id,
)
from backend.app.models.transaction import TransactionCreate

from openpyxl import Workbook
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/returns", tags=["退料 Returns"])


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
# 查詢退料紀錄（v6｜VIEW）
# GET /returns
# ============================================================

@router.get("", summary="查詢退料紀錄")
def list_returns(
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
    where = [
        "transaction_type = 'return'",
        "customer_id = %s",
    ]
    params = [customer_id]

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

    sql = f"""
        SELECT
            transaction_id AS id,
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
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    total = db.execute_query(
        f"""
        SELECT COUNT(*) AS cnt
        FROM v_material_transactions_query
        WHERE {where_sql}
        """,
        tuple(params),
    )[0]["cnt"]

    return {
        "total": total,
        "returns": rows,
    }



# ============================================================
# 取得單筆退料
# GET /returns/{id}
# ============================================================

@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
    customer_id: str = Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT *
        FROM v_material_transactions_query
        WHERE transaction_id=%s
          AND customer_id=%s
          AND transaction_type='return'
        """,
        (return_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "退料單不存在")

    return rows[0]



# ============================================================
# 新增退料（v6 SP）
# POST /returns
# ============================================================

@router.post("", summary="新增退料")
def create_return(
    data: TransactionCreate,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    fixture_id = data.fixture_id
    order_no = data.order_no
    operator = data.operator or user["username"]
    note = data.note
    created_by = user["id"]

    record_type = data.record_type.value
    # =========================
    # source_type 預設規則
    # =========================
    if data.source_type is None:
        source_type = "customer_supplied"
    else:
        source_type = data.source_type.value

    # 保險：嚴格驗證
    if source_type not in ("customer_supplied", "self_purchased"):
        raise HTTPException(
            status_code=400,
            detail=f"非法 source_type: {source_type}"
        )

    serials_csv = None
    datecode = None
    quantity = None

    if record_type in ("batch", "individual"):
        if not data.serials:
            raise HTTPException(400, "序號模式必須提供 serials")
        serials_csv = ",".join(data.serials)
        quantity = len(data.serials)

    elif record_type == "datecode":
        if not data.datecode or data.quantity is None:
            raise HTTPException(400, "datecode 模式需提供 datecode 與 quantity")
        datecode = data.datecode
        quantity = data.quantity
        if quantity <= 0:
            raise HTTPException(400, "quantity 必須 > 0")

    else:
        raise HTTPException(400, f"不支援的 record_type: {record_type}")

    ensure_fixture_exists(fixture_id, customer_id)

    try:
        out = db.call_sp_with_out(
            "sp_material_return_v6",
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
            raise HTTPException(
                status_code=400,
                detail=out.get("o_message") if out else "退料失敗"
            )

    except Exception as e:
        msg = str(e)
        if isinstance(e, pymysql.MySQLError) and e.args and len(e.args) >= 2:
            msg = e.args[1]
        raise HTTPException(status_code=400, detail=msg)

    return {
        "transaction_id": out["o_transaction_id"],
        "message": out.get("o_message") or "退料成功"
    }



# ============================================================
# 匯出退料 XLSX
# GET /returns/{id}/export
# ============================================================

@router.get("/{return_id}/export", summary="匯出退料明細為 XLSX")
def export_return_xlsx(
    return_id: int,
    customer_id: str = Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT record_type, fixture_id
        FROM v_material_transactions_query
        WHERE transaction_id=%s
          AND customer_id=%s
          AND transaction_type='return'
        """,
        (return_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "退料單不存在")

    tx = rows[0]
    record_type = tx["record_type"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Return"

    if record_type in ("batch", "individual"):
        ws.append(["Serial Number"])
        items = db.execute_query(
            """
            SELECT serial_number
            FROM material_transaction_items
            WHERE transaction_id=%s
            ORDER BY serial_number
            """,
            (return_id,),
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
            (return_id,),
        )
        for i in items:
            ws.append([
                tx["fixture_id"],
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
            "Content-Disposition":
            f'attachment; filename="return_{return_id}.xlsx"'
        },
    )
