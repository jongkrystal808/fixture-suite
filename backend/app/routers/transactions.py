# backend/app/routers/transactions.py
import io
import openpyxl
from fastapi import APIRouter, Depends, Query
from backend.app.routers import receipts, returns
from fastapi.responses import StreamingResponse
from backend.app.dependencies import get_current_user
from typing import Optional
from backend.app.database import db

router = APIRouter(prefix="/transactions", tags=["通用交易 Transaction Wrapper"])


# ============================================================
# 收料 / 退料共用列表 API
# ============================================================
@router.post("/{typ}/list")
async def list_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    if typ == "receipt":
        return receipts.list_receipts(**payload, user=user)
    if typ == "return":
        return returns.list_returns(**payload, user=user)
    return {"rows": [], "total": 0}


# ============================================================
# 收料 / 退料 create 包裝 (★ 含庫存自動更新)
# ============================================================
@router.post("/{typ}/create")
async def create_transactions(typ: str, payload: dict, user=Depends(get_current_user)):
    customer_id = payload["customer_id"]

    # 收料直接呼叫 receipts (不在這裡更新庫存)
    if typ == "receipt":
        return receipts.create_receipt(payload, customer_id, user)

    # 退料直接呼叫 returns (不在這裡更新庫存)
    if typ == "return":
        return returns.create_return(payload, customer_id, user)

    raise Exception("Unknown transaction type")



# ============================================================
# 匯出（receipt / return）
# ============================================================
@router.get("/{typ}/{id}/export")
async def export_transactions(typ: str, id: int, customer_id: str = Query(...), user=Depends(get_current_user)):

    if typ == "receipt":
        return receipts.export_receipt_csv(id, customer_id, user)

    if typ == "return":
        return returns.export_return_csv(id, customer_id, user)

    raise Exception("Unknown transaction type")


# ============================================================
# ★ 收退料總檢視
# ============================================================
@router.get("/view-all", summary="收退料總檢視（收料 + 退料統一查詢）")
async def view_all_transactions(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = Query(None),
    datecode: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    serial: Optional[str] = Query(None),  # ⭐ 新增
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: str = Query("time"),  # time | datecode

    skip: int = Query(0),
    limit: int = Query(200),
    user=Depends(get_current_user)
):
    where = ["t.customer_id = %s"]
    params = [customer_id]

    if fixture_id and fixture_id != "undefined":
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if datecode and datecode != "undefined":
        where.append("t.datecode LIKE %s")
        params.append(f"%{datecode}%")

    if operator and operator != "undefined":
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")

    if type in ("receipt", "return"):
        where.append("t.transaction_type = %s")
        params.append(type)

    if serial:
        where.append("""
            t.id IN (
                SELECT transaction_id
                FROM material_transaction_details
                WHERE serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    # ✅ 時間檢索
    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    where_sql = " AND ".join(where)

    # ✅ 排序切換
    if sort_by == "datecode":
        order_sql = "t.datecode DESC, t.created_at DESC, t.id DESC"
    else:
        order_sql = "t.created_at DESC, t.id DESC"

    sql = f"""
        SELECT 
            t.id,
            t.transaction_date,
            t.transaction_type,
            t.fixture_id,
            t.customer_id,
            t.order_no,
            t.source_type,
            t.datecode,
            t.quantity,
            t.operator,
            t.note
        FROM material_transactions t
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM material_transactions t
        WHERE {where_sql}
    """
    total = db.execute_query(count_sql, tuple(params))[0]["total"]

    return {"total": total, "rows": rows}



# ============================================================
# ★ 序號檢視（收料 / 退料）
# ============================================================
@router.get("/serials")
async def view_transaction_serials(
    customer_id: str = Query(...),

    fixture_id: Optional[str] = Query(None),
    order_no: Optional[str] = Query(None),
    serial: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    type: Optional[str] = Query(None),

    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),

    sort_by: str = Query("date"),  # date | order

    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),

    user=Depends(get_current_user)
):
    where = [
        "mt.customer_id = %s",
        "mt.record_type != 'datecode'",
        "mtd.serial_number IS NOT NULL"
    ]
    params = [customer_id]

    if fixture_id:
        where.append("mt.fixture_id = %s")
        params.append(fixture_id)

    if order_no:
        where.append("mt.order_no LIKE %s")
        params.append(f"%{order_no}%")

    if serial:
        where.append("mtd.serial_number LIKE %s")
        params.append(f"%{serial}%")

    if operator:
        where.append("mt.operator LIKE %s")
        params.append(f"%{operator}%")

    if type:
        where.append("mt.transaction_type = %s")
        params.append(type)

    if date_from:
        where.append("mt.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("mt.transaction_date <= %s")
        params.append(date_to)

    where_sql = " AND ".join(where)

    order_sql = (
        "mt.order_no DESC, mt.id DESC"
        if sort_by == "order"
        else "mt.transaction_date DESC, mt.id DESC"
    )

    # -------------------------
    # 主查詢
    # -------------------------
    sql = f"""
        SELECT
            mt.id               AS transaction_id,
            mt.transaction_date,
            mt.transaction_type,
            mt.customer_id,
            mt.fixture_id,
            mt.order_no,
            mt.source_type,
            mt.operator,
            mt.note,
            mtd.serial_number
        FROM material_transactions mt
        JOIN material_transaction_details mtd
          ON mt.id = mtd.transaction_id
        WHERE {where_sql}
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(sql, tuple(params + [limit, skip]))

    # -------------------------
    # 總筆數
    # -------------------------
    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM material_transactions mt
        JOIN material_transaction_details mtd
          ON mt.id = mtd.transaction_id
        WHERE {where_sql}
    """

    total_row = db.execute_one(count_sql, tuple(params))
    total = total_row["total"] if total_row else 0

    return {
        "rows": rows,
        "total": total
    }



# ============================================================
# ★ 序號詳細履歷
# ============================================================
@router.get("/serials/{serial_number}/history")
async def get_serial_history(
    serial_number: str,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    serial = serial_number.strip()

    # -------------------------
    # 基本資訊
    # -------------------------
    serial_sql = """
        SELECT
            fs.serial_number,
            fs.fixture_id,
            fs.customer_id,
            fs.status,
            fs.source_type,
            fs.current_station_id,
            fs.total_uses,
            fs.created_at
        FROM fixture_serials fs
        WHERE fs.serial_number = %s
          AND fs.customer_id = %s
        LIMIT 1
    """
    serial_info = db.execute_one(serial_sql, (serial, customer_id))
    if not serial_info:
        raise HTTPException(status_code=404, detail="Serial not found")

    # -------------------------
    # 收 / 退料紀錄
    # -------------------------
    tx_sql = """
        SELECT
            mt.transaction_date,
            mt.transaction_type,
            mt.order_no,
            mt.fixture_id,
            mt.source_type,
            mt.operator,
            mt.note
        FROM material_transactions mt
        JOIN material_transaction_details mtd
          ON mt.id = mtd.transaction_id
        WHERE mtd.serial_number = %s
          AND mt.customer_id = %s
        ORDER BY mt.transaction_date DESC, mt.id DESC
    """
    transactions = db.execute_query(tx_sql, (serial, customer_id))

    # -------------------------
    # 使用紀錄
    # -------------------------
    usage_sql = """
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
    """
    usages = db.execute_query(usage_sql, (serial, customer_id))

    # -------------------------
    # 更換紀錄
    # -------------------------
    replace_sql = """
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
    """
    replacements = db.execute_query(replace_sql, (serial, customer_id))

    return {
        "serial": serial_info,
        "transactions": transactions,
        "usages": usages,
        "replacements": replacements
    }


@router.get("/summary/export")
async def export_summary(
    customer_id: str = Query(...),

    fixture_id: Optional[str] = Query(None),
    datecode: Optional[str] = Query(None),
    operator: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    # ★ 先拿掉 tran_type，之後如果要用再另外加 alias
    # tran_type: Optional[str] = Query(None),   # receipt / return

    # ★ 這行重點：alias="type" 讓 ?type=summary/detailed 控制匯出模式
    export_type: str = Query("summary", alias="type"),      # summary / detailed

    user=Depends(get_current_user)
):

    # --------- WHERE 組合 ---------
    where = ["mt.customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("mt.fixture_id = %s")
        params.append(fixture_id)

    if datecode:
        where.append("mt.datecode = %s")
        params.append(datecode)

    if operator:
        where.append("mt.operator LIKE %s")
        params.append(f"%{operator}%")

    # ✅ 時間檢索（與 view-all 一致）
    if date_from:
        where.append("mt.transaction_date >= %s")
        params.append(date_from)

    if date_to:
        where.append("mt.transaction_date <= %s")
        params.append(date_to)


    # if tran_type:
    #     where.append("mt.transaction_type = %s")
    #     params.append(tran_type)

    where_sql = " AND ".join(where)

    # --------- Summary ---------
    if export_type == "summary":
        sql = f"""
            SELECT 
                mt.fixture_id,
                SUM(CASE WHEN mt.transaction_type='receipt' THEN mt.quantity ELSE 0 END) AS receipt_qty,
                SUM(CASE WHEN mt.transaction_type='return' THEN mt.quantity ELSE 0 END) AS return_qty,
                SUM(CASE WHEN mt.transaction_type='receipt' THEN mt.quantity ELSE 0 END)
                - SUM(CASE WHEN mt.transaction_type='return' THEN mt.quantity ELSE 0 END) AS total_qty
            FROM material_transactions mt
            WHERE {where_sql}
            GROUP BY mt.fixture_id
            ORDER BY mt.fixture_id
        """
        rows = db.execute_query(sql, tuple(params))
        headers = ["治具ID", "收料數", "退料數", "總數"]

    # --------- Detailed ---------
    else:
        sql = f"""
            SELECT
                mt.fixture_id,
                mt.datecode,
                mtd.serial_number,
                
                SUM(CASE WHEN mt.transaction_type='receipt' THEN 
                        CASE 
                            WHEN mt.record_type='datecode' THEN mt.quantity  -- datecode 模式用 quantity
                            WHEN mt.record_type IN ('batch','individual') THEN 1  -- 序號制每筆 1
                        END
                    ELSE 0 END
                ) AS receipt_qty,
            
                SUM(CASE WHEN mt.transaction_type='return' THEN 
                        CASE 
                            WHEN mt.record_type='datecode' THEN mt.quantity
                            WHEN mt.record_type IN ('batch','individual') THEN 1
                        END
                    ELSE 0 END
                ) AS return_qty,
            
                SUM(CASE WHEN mt.transaction_type='receipt' THEN 
                        CASE 
                            WHEN mt.record_type='datecode' THEN mt.quantity 
                            WHEN mt.record_type IN ('batch','individual') THEN 1 
                        END
                    ELSE 0 END
                )
                -
                SUM(CASE WHEN mt.transaction_type='return' THEN 
                        CASE 
                            WHEN mt.record_type='datecode' THEN mt.quantity
                            WHEN mt.record_type IN ('batch','individual') THEN 1
                        END
                    ELSE 0 END
                ) AS total_qty
            
            FROM material_transactions mt
            LEFT JOIN material_transaction_details mtd 
                   ON mtd.transaction_id = mt.id
            
            WHERE {where_sql}
            
            GROUP BY 
                mt.fixture_id,
                mt.datecode,
                mtd.serial_number
            ORDER BY 
                mt.fixture_id, 
                mt.datecode,
                mtd.serial_number;

        """
        rows = db.execute_query(sql, tuple(params))
        headers = ["治具ID", "Datecode", "序號", "收料數", "退料數", "總數"]

    # -------------------------------------------------------
    # 產生 Excel
    # -------------------------------------------------------
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(headers)

    for r in rows:
        ws.append(list(r.values()))

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
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
