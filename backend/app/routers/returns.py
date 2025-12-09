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
# 列表
# GET /returns?customer_id=xxx&skip=0...
# ============================================================
@router.get("", summary="查詢退料紀錄")
def list_returns(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    serial: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user)
):
    where = ["t.transaction_type='return'", "t.customer_id=%s"]
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
    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)
    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    if serial:
        where.append("""
            t.id IN (
                SELECT transaction_id
                FROM material_transaction_details
                WHERE serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    # ★ 查詢包含 record_type 和 datecode,以及序號來源統計
    sql = f"""
        SELECT 
            t.*,
            GROUP_CONCAT(d.serial_number ORDER BY d.serial_number SEPARATOR ',') AS serial_list,
            (
                SELECT CONCAT(
                    '自購: ', 
                    COUNT(CASE WHEN fs.source_type = 'self_purchased' THEN 1 END),
                    ', 客供: ',
                    COUNT(CASE WHEN fs.source_type = 'customer_supplied' THEN 1 END)
                )
                FROM material_transaction_details d2
                LEFT JOIN fixture_serials fs ON fs.serial_number = d2.serial_number 
                    AND fs.customer_id = t.customer_id
                    AND fs.fixture_id = t.fixture_id
                WHERE d2.transaction_id = t.id
            ) AS source_type_summary
        FROM material_transactions t
        LEFT JOIN material_transaction_details d ON d.transaction_id = t.id
        WHERE {' AND '.join(where)}
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT %s OFFSET %s
    """

    params_page = params + [limit, skip]
    rows = db.execute_query(sql, tuple(params_page))

    # 計算總筆數
    count_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM (
            SELECT t.id
            FROM material_transactions t
            LEFT JOIN material_transaction_details d ON d.transaction_id=t.id
            WHERE {' AND '.join(where)}
            GROUP BY t.id
        ) AS x
    """

    total = db.execute_query(count_sql, tuple(params))[0]["cnt"]

    return {"total": total, "returns": rows}


# ============================================================
# 取得單筆
# GET /returns/{id}?customer_id=xxx
# ============================================================
@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT * FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    return_data = row[0]
    details = db.execute_query(
        "SELECT id, serial_number, created_at FROM material_transaction_details WHERE transaction_id=%s",
        (return_id,)
    )
    return_data["details"] = details
    return return_data


# ============================================================
# 新增退料 (v3.7 增加 datecode 支援)
# POST /returns?customer_id=xxx
# ============================================================
@router.post("", summary="新增退料")
def create_return(
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    typ = data.get("type", "individual")
    created_by = user["id"]
    operator = data.get("operator") or user["username"]

    # ====================================
    # ★ 序號 / 數量解析
    # ====================================
    if typ == "batch":
        serials = expand_serial_range(data.get("serial_start", ""), data.get("serial_end", ""))
        if not serials:
            raise HTTPException(400, "批量模式需提供有效的序號範圍")
        serials_str = ",".join(serials)
        datecode = None

    elif typ == "datecode":
        datecode = data.get("datecode")
        quantity = data.get("quantity")

        if not datecode:
            raise HTTPException(400, "datecode 模式需提供 datecode")
        if not quantity or quantity <= 0:
            raise HTTPException(400, "datecode 模式需提供有效的 quantity")

        serials_str = str(quantity)

    else:  # individual
        s = data.get("serials", "")
        if isinstance(s, list):
            serials = normalise_serial_list(s)
        else:
            serials = normalise_serial_list([x.strip() for x in str(s).split(",") if x.strip()])

        if not serials:
            raise HTTPException(400, "個別模式需提供序號列表")
        serials_str = ",".join(serials)
        datecode = None

    # ====================================
    # ★ 呼叫存儲過程 sp_material_return
    # ====================================
    try:
        db.execute_query(
            """
            CALL sp_material_return(
                %s, %s, %s, %s, %s, %s, %s, %s, %s,
                @transaction_id, @message
            )
            """,
            (
                customer_id,
                fixture_id,
                data.get("order_no"),
                operator,
                data.get("note"),
                created_by,
                typ,
                datecode,
                serials_str,
            )
        )

        output = db.execute_query("SELECT @transaction_id AS id, @message AS message")
        if not output or output[0]["id"] is None:
            msg = output[0]["message"] if output else "退料失敗"
            raise HTTPException(500, msg)

        trans_id = output[0]["id"]

    except Exception as e:
        raise HTTPException(500, f"建立退料失敗: {e}")

    # ====================================
    # ★ 返回結果（含 quantity）
    # ====================================
    result = {
        "id": trans_id,
        "fixture_id": fixture_id,
        "type": typ,
        "message": "退料成功"
    }

    if typ == "datecode":
        qty = data.get("quantity")
        result["datecode"] = datecode
    else:
        qty = len(serials_str.split(","))

    result["quantity"] = qty

    return result


# ============================================================
# 刪除退料單
# DELETE /returns/{id}?customer_id=xxx
# ============================================================
@router.delete("/{return_id}", summary="刪除退料單")
def delete_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # 先查出該退料單是否存在，並取得 fixture_id
    return_record = db.execute_query(
        """
        SELECT id, fixture_id
        FROM material_transactions
        WHERE id=%s AND customer_id=%s AND transaction_type='return'
        """,
        (return_id, customer_id)
    )
    if not return_record:
        raise HTTPException(404, "退料單不存在")

    fixture_id = return_record[0]["fixture_id"]

    # 刪除主表 (ON DELETE CASCADE 會自動刪除明細)
    db.execute_update(
        "DELETE FROM material_transactions WHERE id=%s",
        (return_id,)
    )

    # ★ 刪除後重算該治具庫存（序號 + datecode 一起重算）
    try:
        db.execute_query(
            "CALL sp_update_fixture_by_transaction(%s, %s)",
            (customer_id, fixture_id)
        )
    except Exception as e:
        # 不讓整個 API 爆掉，但回傳警告訊息
        return {
            "message": "退料單已刪除，但重算庫存時發生錯誤",
            "error": str(e)
        }

    return {"message": "退料單已刪除並更新庫存"}


# ============================================================
# 刪除明細
# DELETE /returns/details/{id}?customer_id=xxx
# ============================================================
@router.delete("/details/{detail_id}", summary="刪除退料明細")
def delete_return_detail(
    detail_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # 檢查明細是否屬於該客戶
    detail = db.execute_query("""
        SELECT d.id, d.transaction_id
        FROM material_transaction_details d
        JOIN material_transactions t ON t.id = d.transaction_id
        WHERE d.id = %s AND t.customer_id = %s AND t.transaction_type='return'
    """, (detail_id, customer_id))

    if not detail:
        raise HTTPException(404, "明細不存在")

    db.execute_update(
        "DELETE FROM material_transaction_details WHERE id=%s",
        (detail_id,)
    )

    return {"message": "明細已刪除"}


# ============================================================
# 匯出單筆退料為 CSV
# GET /returns/{id}/export?customer_id=xxx
# ============================================================
@router.get("/{return_id}/export", summary="匯出退料明細為 CSV")
def export_return_csv(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    return_record = db.execute_query(
        "SELECT * FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not return_record:
        raise HTTPException(404, "退料單不存在")

    details = db.execute_query(
        "SELECT serial_number FROM material_transaction_details WHERE transaction_id=%s ORDER BY serial_number",
        (return_id,)
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Serial Number"])

    for d in details:
        writer.writerow([d["serial_number"]])

    content = output.getvalue()
    output.close()

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=return_{return_id}.csv"}
    )


# ============================================================
# 匯入 CSV/XLSX
# POST /returns/import?customer_id=xxx
# ============================================================
@router.post("/import", summary="批量匯入退料")
async def import_returns_xlsx(
    file: UploadFile = File(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    import openpyxl
    from io import BytesIO

    content = await file.read()
    success_count = 0
    errors = []

    try:
        # 嘗試解析 Excel
        wb = openpyxl.load_workbook(BytesIO(content))
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
    except Exception:
        # 嘗試解析 CSV
        try:
            content_str = content.decode("utf-8")
            csv_reader = csv.DictReader(io.StringIO(content_str))
            rows = list(csv_reader)
        except Exception as e:
            raise HTTPException(400, f"無法解析檔案: {e}")

    created_by = user["id"]
    operator = user["username"]

    for idx, row in enumerate(rows, start=2):
        try:
            if isinstance(row, dict):
                # CSV 格式
                fixture_id = row.get("fixture_id")
                order_no = row.get("order_no")
                typ = row.get("type", "individual")
                datecode = row.get("datecode")  # ★
                note = row.get("note", "")
                
                if typ == "batch":
                    serial_start = row.get("serial_start")
                    serial_end = row.get("serial_end")
                    serials = expand_serial_range(serial_start, serial_end)
                elif typ == "datecode":
                    quantity = int(row.get("quantity", 0))
                    serials = None
                else:
                    serials_str = row.get("serials", "")
                    serials = [s.strip() for s in serials_str.split(",") if s.strip()]
            else:
                # Excel 格式
                fixture_id = row[0]
                order_no = row[1] if len(row) > 1 else None
                typ = row[2] if len(row) > 2 else "individual"
                
                if typ == "datecode":
                    datecode = row[3] if len(row) > 3 else None
                    quantity = int(row[4]) if len(row) > 4 else 0
                    note = row[5] if len(row) > 5 else ""
                    serials = None
                elif typ == "batch":
                    serial_start = row[3] if len(row) > 3 else ""
                    serial_end = row[4] if len(row) > 4 else ""
                    note = row[5] if len(row) > 5 else ""
                    serials = expand_serial_range(serial_start, serial_end)
                else:
                    serials_str = row[3] if len(row) > 3 else ""
                    note = row[4] if len(row) > 4 else ""
                    serials = [s.strip() for s in str(serials_str).split(",") if s.strip()]

            if not fixture_id:
                errors.append(f"第 {idx} 行: 缺少 fixture_id")
                continue

            # 準備呼叫存儲過程
            if typ == "datecode":
                serials_str = str(quantity)
            else:
                if not serials:
                    errors.append(f"第 {idx} 行: 沒有序號")
                    continue
                serials_str = ",".join(serials)

            # 呼叫存儲過程
            result = db.execute_query(
                """
                CALL sp_material_return(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s,
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
                    typ,
                    datecode if typ == "datecode" else None,
                    serials_str
                )
            )

            output = db.execute_query("SELECT @transaction_id AS id, @message AS message")
            if output and output[0]["id"]:
                success_count += 1
            else:
                errors.append(f"第 {idx} 行: {output[0]['message'] if output else '退料失敗'}")

        except Exception as e:
            errors.append(f"第 {idx} 行: {str(e)}")

    return {
        "count": success_count,
        "errors": errors
    }
