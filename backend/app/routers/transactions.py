# backend/app/routers/transactions.py

from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.database import db
import openpyxl
import io
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/transactions",
    tags=["通用交易 Transaction Wrapper"]
)



# ============================================================
# ★ 收退料總檢視（v4.x FINAL｜VIEW 版｜修法 B 穩定版）
# ============================================================

@router.get("/view-all", summary="收退料總檢視（收料 + 退料）")
async def view_all_transactions(
    fixture_id: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),  # receipt | return

    # ★ 修法 B 核心
    record_type_hint: Optional[str] = Query(None, enum=["serial", "datecode"]),
    serial: Optional[str] = Query(None),
    datecode: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),

    # UI 狀態用（保留，不主導邏輯）
    query_mode: Optional[str] = Query(None),

    skip: int = Query(0),
    limit: int = Query(200),

    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    # ============================================================
    # 防呆：record_type_hint 必須搭配對應條件
    # ============================================================
    if record_type_hint == "serial" and not serial:
        raise HTTPException(status_code=400, detail="serial 查詢缺少序號")

    if record_type_hint == "datecode" and not datecode:
        raise HTTPException(status_code=400, detail="datecode 查詢缺少 datecode")

    # ============================================================
    # WHERE 條件組裝
    # ============================================================
    where = ["e.customer_id = %s"]
    params = [customer_id]

    # ------------------------------------------------------------
    # UI mode（僅作語意限制，不負責細項）
    # ------------------------------------------------------------
    if query_mode == "datecode":
        where.append("e.record_type = 'datecode'")

    # ------------------------------------------------------------
    # 修法 B：record_type 收斂（最重要）
    # ------------------------------------------------------------
    if record_type_hint == "serial":
        where.append("e.record_type != 'datecode'")

    elif record_type_hint == "datecode":
        where.append("e.record_type = 'datecode'")

    # ------------------------------------------------------------
    # 共用欄位
    # ------------------------------------------------------------
    if fixture_id:
        where.append("e.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if operator:
        where.append("e.operator LIKE %s")
        params.append(f"%{operator}%")

    if transaction_type in ("receipt", "return"):
        where.append("e.transaction_type = %s")
        params.append(transaction_type)

    if order_no:
        where.append("e.order_no LIKE %s")
        params.append(f"%{order_no}%")

    if date_from:
        where.append("e.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("e.transaction_date <= %s")
        params.append(date_to)

    # ------------------------------------------------------------
    # serial 查詢（EXISTS，注意 alias）
    # ------------------------------------------------------------
    if serial:
        where.append("""
            EXISTS (
                SELECT 1
                FROM material_transaction_items i
                WHERE i.transaction_id = e.transaction_id
                  AND i.serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    # ------------------------------------------------------------
    # datecode 查詢（LEFT JOIN + WHERE）
    # ------------------------------------------------------------
    if datecode:
        where.append("fdt.datecode LIKE %s")
        params.append(f"%{datecode}%")

    where_sql = " AND ".join(where)
    # ============================================================
    # 主查詢（rows）
    # ============================================================
    sql = f"""
        SELECT
            e.transaction_id AS id,
            e.transaction_date,
            e.transaction_type,
            e.fixture_id,
            e.order_no,
            e.record_type,
            e.source_type,
            e.operator,
            e.note,
            e.display_quantity,
            e.display_quantity_text,

            -- datecode（僅 datecode record 有值）
            fdt.datecode

        FROM v_material_transactions_event e

        LEFT JOIN fixture_datecode_transactions fdt
          ON fdt.transaction_id = e.transaction_id

        WHERE {where_sql}

        ORDER BY e.transaction_date DESC, e.transaction_id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(
        sql,
        tuple(params + [limit, skip])
    )
    # ============================================================
    # total（JOIN 結構必須與 rows 一致）
    # ============================================================
    total = db.execute_query(
        f"""
        SELECT COUNT(*) AS total
        FROM v_material_transactions_event e
        LEFT JOIN fixture_datecode_transactions fdt
          ON fdt.transaction_id = e.transaction_id
        WHERE {where_sql}
        """,
        tuple(params)
    )[0]["total"]
    return {
        "total": total,
        "rows": rows
    }





# ============================================================
# ★ 序號檢視（收 / 退）
# ============================================================
@router.get("/serials", summary="序號交易列表（收 / 退）")
async def view_transaction_serials(
    fixture_id: Optional[str] = Query(None),
    serial: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),  # receipt | return
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),

    skip: int = Query(0),
    limit: int = Query(100),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user)
):

    where = [
        "t.customer_id = %s",
        "t.record_type != 'datecode'"
    ]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if order_no:
        where.append("t.order_no LIKE %s")
        params.append(f"%{order_no}%")

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
        SELECT COUNT(i.id) AS total
        FROM material_transactions t
        JOIN material_transaction_items i
          ON t.id = i.transaction_id
        WHERE {where_sql}
        """,
        tuple(params)
    )[0]["total"]

    return {
        "rows": rows,
        "total": total
    }



# ============================================================
# ★ 單一序號完整履歷（v6 FINAL）
# ============================================================
@router.get(
    "/fixtures/{fixture_id}/serials/{serial_number}/history",
    summary="序號完整履歷（v6）"
)
async def get_serial_history(
    fixture_id: str,
    serial_number: str,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user)
):
    serial = serial_number.strip()

    # ==========================================================
    # 1️⃣ 序號基本狀態（v6 schema）
    # ==========================================================
    serial_info = db.execute_one(
        """
        SELECT
            fs.serial_number,
            fs.fixture_id,
            fs.existence_status,
            fs.usage_status,
            fs.source_type,
            fs.receipt_date,
            fs.return_date,
            fs.created_at,
            fs.updated_at
        FROM fixture_serials fs
        WHERE fs.customer_id   = %s
          AND fs.fixture_id    = %s
          AND fs.serial_number = %s
        """,
        (customer_id, fixture_id, serial)
    )

    if not serial_info:
        raise HTTPException(status_code=404, detail="Serial not found")

    # 🔹 給舊前端相容的合併狀態
    serial_info["status"] = (
        serial_info["existence_status"]
        if serial_info["existence_status"] != "in_stock"
        else serial_info["usage_status"]
    )

    # ==========================================================
    # 2️⃣ 收 / 退料交易紀錄
    # ==========================================================
    transactions = db.execute_query(
        """
        SELECT
            t.transaction_date,
            t.transaction_type,
            t.order_no,
            t.operator,
            t.note
        FROM material_transactions t
        JOIN material_transaction_items i
          ON t.id = i.transaction_id
        WHERE t.customer_id   = %s
          AND i.fixture_id    = %s
          AND i.serial_number = %s
        ORDER BY t.transaction_date DESC, t.id DESC
        """,
        (customer_id, fixture_id, serial)
    ) or []

    # ==========================================================
    # 3️⃣ 使用紀錄（serial-level）
    # ==========================================================
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
        WHERE customer_id   = %s
          AND fixture_id    = %s
          AND record_level  = 'serial'
          AND serial_number = %s
        ORDER BY used_at DESC
        """,
        (customer_id, fixture_id, serial)
    ) or []

    # ==========================================================
    # 4️⃣ 更換紀錄
    # ==========================================================
    replacements = db.execute_query(
        """
        SELECT
            occurred_at,
            operator,
            note
        FROM replacement_logs
        WHERE customer_id   = %s
          AND fixture_id    = %s
          AND record_level  = 'serial'
          AND serial_number = %s
        ORDER BY occurred_at DESC
        """,
        (customer_id, fixture_id, serial)
    ) or []

    return {
        "serial": serial_info,
        "transactions": transactions,
        "usages": usages,
        "replacements": replacements,
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

    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user)
):

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




@router.get("/{transaction_id}/detail")
def get_transaction_detail(
    transaction_id: int,
    customer_id: str = Depends(get_current_customer_id),
):
    """
    交易明細（hover / drawer 共用）
    - 一筆交易展開為多列 item
    - serial / datecode 皆支援
    """

    rows = db.execute_query(
        """
        SELECT
            transaction_id,
            transaction_type,
            record_type,
            transaction_date,
            customer_id,
            fixture_id,
            order_no,
            source_type,
            operator,
            note,
            total_quantity,
            created_at,

            item_id,
            serial_number,
            datecode,
            item_quantity,
            serial_status,
            hover_item_text
        FROM view_material_transaction_details
        WHERE transaction_id = %s
          AND customer_id = %s
        ORDER BY
            serial_number IS NULL,
            serial_number,
            datecode
        """,
        (transaction_id, customer_id),
    )

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="交易不存在或不屬於目前客戶",
        )

    # =========================
    # Header（共用資訊）
    # =========================
    header = rows[0]

    return {
        "transaction_id": header["transaction_id"],
        "transaction_type": header["transaction_type"],
        "record_type": header["record_type"],
        "transaction_date": header["transaction_date"],
        "fixture_id": header["fixture_id"],
        "order_no": header["order_no"],
        "source_type": header["source_type"],
        "operator": header["operator"],
        "note": header["note"],
        "total_quantity": header["total_quantity"],
        "created_at": header["created_at"],

        # =========================
        # 明細 rows（hover / drawer 自由使用）
        # =========================
        "items": rows,
    }
