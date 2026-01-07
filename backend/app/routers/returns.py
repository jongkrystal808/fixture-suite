"""
退料 Returns Router (v4.x FIXED)
- SP-first
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
import io

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_username,
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
# 列表
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
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    where = [
        "t.transaction_type = 'return'",
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
            t.transaction_date,
            t.created_at,
            t.source_type,

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
        f"""
        SELECT COUNT(*) AS cnt
        FROM material_transactions t
        WHERE {where_sql}
        """,
        tuple(params),
    )[0]["cnt"]

    return {
        "total": total,
        "returns": rows,
    }


# ============================================================
# 單筆
# ============================================================

@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
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
            transaction_date,
            created_at
        FROM material_transactions
        WHERE id = %s
          AND customer_id = %s
          AND transaction_type = 'return'
        """,
        (return_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "退料單不存在")

    return rows[0]


# ============================================================
# 新增退料（SP）
# ============================================================

@router.post("", summary="新增退料")
def create_return(
    data: TransactionCreate,
    user=Depends(get_current_user),
    username: str = Depends(get_current_username),
):
    customer_id = user.customer_id

    fixture_id = data.fixture_id
    order_no = data.order_no
    operator = data.operator or username
    note = data.note
    created_by = user.id

    record_type = data.record_type.value
    source_type = data.source_type.value

    serials_csv = None
    datecode = None
    quantity = None

    if record_type in ("batch", "individual"):
        serials_csv = ",".join(data.serials)
    else:
        datecode = data.datecode
        quantity = data.quantity

    ensure_fixture_exists(fixture_id, customer_id)

    try:
        db.execute_query(
            """
            CALL sp_material_return(
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
        )[0]

        if not out.get("id"):
            raise HTTPException(400, out.get("message") or "退料失敗")

        return {
            "id": out["id"],
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
        raise HTTPException(500, f"建立退料失敗: {e}")


# ============================================================
# 匯出
# ============================================================

@router.get("/{return_id}/export", summary="匯出退料明細為 XLSX")
def export_return_xlsx(
    return_id: int,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    rows = db.execute_query(
        """
        SELECT id, record_type, fixture_id, order_no, created_at
        FROM material_transactions
        WHERE id = %s
          AND customer_id = %s
          AND transaction_type = 'return'
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
            WHERE transaction_id = %s
            ORDER BY serial_number
            """,
            (return_id,),
        )
        for r in items:
            ws.append([r["serial_number"]])

    elif record_type == "datecode":
        ws.append(["Fixture ID", "Datecode", "Quantity"])
        item = db.execute_query(
            """
            SELECT datecode, quantity
            FROM material_transaction_items
            WHERE transaction_id = %s
            """,
            (return_id,),
        )
        if item:
            ws.append([
                tx["fixture_id"],
                item[0]["datecode"],
                item[0]["quantity"],
            ])
    else:
        raise HTTPException(400, f"未知的 record_type: {record_type}")

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            f'attachment; filename="return_{return_id}.xlsx"'
        },
    )
