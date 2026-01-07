"""
退料 Returns Router (v3.7 增加 datecode 支援)
- v3.7: 新增 datecode 類型退料
- v3.6: 增加 source_type 欄位支援 (從序號自動識別)
- 完全對齊 receipts 結構
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(prefix="/returns", tags=["退料 Returns"])


# -------------------------------
# Helper
# -------------------------------
def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")


# ============================================================
# 列表（v4.x 正確版，含 datecode JOIN）
# GET /returns?customer_id=xxx&skip=0...
# ============================================================
@router.get("", summary="查詢退料紀錄")
def list_returns(
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    record_type: Optional[str] = Query(
        None, description="batch / individual / datecode"
    ),

    date_from: Optional[str] = None,
    date_to: Optional[str] = None,

    serial: Optional[str] = Query(
        None, description="僅適用於 serial 類型退料"
    ),

    skip: int = 0,
    limit: int = 50,

    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    # --------------------------------------------------
    # WHERE 條件
    # --------------------------------------------------
    where = [
        "t.transaction_type = 'return'",
        "t.customer_id = %s"
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

    # --------------------------------------------------
    # serial 搜尋（僅 serial 類型）
    # --------------------------------------------------
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

    # --------------------------------------------------
    # 主查詢（LEFT JOIN datecode 表）
    # --------------------------------------------------
    sql = f"""
        SELECT
            t.id,
            t.customer_id,
            t.record_type,
            t.order_no,
            t.fixture_id,
            t.source_type,
            t.operator,
            t.note,
            t.created_at,

            -- datecode 專用
            fdt.datecode,
            fdt.quantity

        FROM material_transactions t
        LEFT JOIN fixture_datecode_transactions fdt
               ON fdt.transaction_id = t.id
              AND t.record_type = 'datecode'

        WHERE {' AND '.join(where)}
        ORDER BY t.created_at DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(
        sql,
        tuple(params + [limit, skip])
    )

    # --------------------------------------------------
    # 總筆數（不 JOIN，避免倍增）
    # --------------------------------------------------
    count_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM material_transactions t
        WHERE {' AND '.join(where)}
    """

    total = db.execute_query(
        count_sql,
        tuple(params)
    )[0]["cnt"]

    return {
        "total": total,
        "returns": rows
    }


# ============================================================
# 取得單筆退料（v4.x）
# GET /returns/{id}?customer_id=xxx
# ============================================================
@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    rows = db.execute_query(
        """
        SELECT
            t.id,
            t.customer_id,
            t.record_type,
            t.order_no,
            t.fixture_id,
            t.datecode,
            t.operator,
            t.note,
            t.created_at
        FROM material_transactions t
        WHERE t.id = %s
          AND t.customer_id = %s
          AND t.transaction_type = 'return'
        """,
        (return_id, customer_id)
    )

    if not rows:
        raise HTTPException(404, "退料單不存在")

    # 只回傳主交易事件（不含明細）
    return rows[0]

# ============================================================
# 新增退料（v4.x 正確版）
# POST /returns?customer_id=xxx
# ============================================================
@router.post("", summary="新增退料")
def create_return(
    data: Dict[str, Any],
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    # -------------------------------
    # 基本欄位
    # -------------------------------
    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    record_type = data.get("record_type", "individual")
    order_no = data.get("order_no")
    operator = data.get("operator") or user["username"]
    note = data.get("note")

    # -------------------------------
    # 依 record_type 準備 serials_csv / datecode
    # -------------------------------
    serials_csv = None
    datecode = None

    if record_type == "batch":
        serials = expand_serial_range(
            data.get("serial_start", ""),
            data.get("serial_end", "")
        )
        if not serials:
            raise HTTPException(400, "批量模式需提供有效的序號範圍")

        serials_csv = ",".join(serials)

    elif record_type == "individual":
        s = data.get("serials", [])
        if isinstance(s, list):
            serials = normalise_serial_list(s)
        else:
            serials = normalise_serial_list(
                [x.strip() for x in str(s).split(",") if x.strip()]
            )

        if not serials:
            raise HTTPException(400, "個別模式需提供序號列表")

        serials_csv = ",".join(serials)

    elif record_type == "datecode":
        datecode = data.get("datecode")
        quantity = data.get("quantity")

        if not datecode:
            raise HTTPException(400, "datecode 模式需提供 datecode")
        if not quantity or int(quantity) <= 0:
            raise HTTPException(400, "datecode 模式需提供有效的 quantity")

        serials_csv = str(int(quantity))

    else:
        raise HTTPException(400, f"不支援的 record_type: {record_type}")

    # -------------------------------
    # 呼叫存儲過程 sp_material_return
    # -------------------------------
    try:
        db.execute_query(
            """
            CALL sp_material_return(
                %s, %s, %s, %s, %s, %s, %s, %s,
                @transaction_id, @message
            )
            """,
            (
                customer_id,
                fixture_id,
                order_no,
                operator,
                note,
                record_type,
                datecode,
                serials_csv,
            )
        )

        output = db.execute_query(
            "SELECT @transaction_id AS id, @message AS message"
        )

        if not output or output[0]["id"] is None:
            raise HTTPException(
                500,
                output[0]["message"] if output else "退料失敗"
            )

        transaction_id = output[0]["id"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"建立退料失敗: {e}")

    # -------------------------------
    # 回傳結果（對齊 v4.x API）
    # -------------------------------
    return {
        "id": transaction_id,
        "customer_id": customer_id,
        "record_type": record_type,
        "order_no": order_no,
        "fixture_id": fixture_id,
        "datecode": datecode,
        "quantity": int(serials_csv) if record_type == "datecode" else len(serials_csv.split(",")),
        "operator": operator,
        "note": note,
        "created_at": datetime.utcnow(),
    }



from openpyxl import Workbook
from fastapi.responses import StreamingResponse
import io

# ============================================================
# 匯出單筆退料為 XLSX（v4.x）
# GET /returns/{id}/export?customer_id=xxx
# ============================================================
@router.get("/{return_id}/export", summary="匯出退料明細為 XLSX")
def export_return_xlsx(
    return_id: int,
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    # 1️⃣ 取得主交易
    rows = db.execute_query(
        """
        SELECT
            id,
            record_type,
            fixture_id,
            datecode,
            order_no,
            created_at
        FROM material_transactions
        WHERE id = %s
          AND customer_id = %s
          AND transaction_type = 'return'
        """,
        (return_id, customer_id)
    )

    if not rows:
        raise HTTPException(404, "退料單不存在")

    tx = rows[0]
    record_type = tx["record_type"]

    # 2️⃣ 建立 Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Return"

    # ----------------------------
    # serial 退料（batch / individual）
    # ----------------------------
    if record_type in ("batch", "individual"):
        ws.append(["Serial Number"])

        items = db.execute_query(
            """
            SELECT serial_number
            FROM material_transaction_items
            WHERE transaction_id = %s
            ORDER BY serial_number
            """,
            (return_id,)
        )

        for r in items:
            ws.append([r["serial_number"]])

    # ----------------------------
    # datecode 退料
    # ----------------------------
    elif record_type == "datecode":
        ws.append(["Fixture ID", "Datecode", "Quantity"])

        qty_rows = db.execute_query(
            """
            SELECT quantity
            FROM fixture_datecode_transactions
            WHERE transaction_id = %s
              AND transaction_type = 'return'
            """,
            (return_id,)
        )

        quantity = qty_rows[0]["quantity"] if qty_rows else 0

        ws.append([
            tx["fixture_id"],
            tx["datecode"],
            quantity
        ])

    else:
        raise HTTPException(400, f"未知的 record_type: {record_type}")

    # 3️⃣ 輸出 XLSX stream
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"return_{return_id}.xlsx"

    return StreamingResponse(
        stream,
        media_type=(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

