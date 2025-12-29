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
# 刪除交易（receipt / return）
# ============================================================
@router.delete("/{typ}/{id}")
async def delete_transactions(typ: str, id: int, customer_id: str = Query(...), user=Depends(get_current_user)):

    if typ == "receipt":
        return receipts.delete_receipt(id, customer_id, user)

    if typ == "return":
        return returns.delete_return(id, customer_id, user)

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
