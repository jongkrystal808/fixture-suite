from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from datetime import date
import pandas as pd

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/receipts", tags=["Receipts Import"])


@router.post("/import")
async def import_receipts(
    file: UploadFile = File(...),
    customer_id: str = "",
    user=Depends(get_current_user)
):
    """
    收料 Excel 匯入（batch 專用）
    - 正確呼叫 sp_material_receipt
    - 單筆失敗不影響其他筆
    - 回傳每一筆的結果訊息
    """

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="請使用 .xlsx 檔案")

    # 讀取 Excel
    try:
        df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel 讀取失敗：{str(e)}")

    # 必要欄位（batch 模式）
    required_cols = [
        "vendor",        # customer_id
        "order_no",
        "fixture_id",
        "type",          # batch
        "serial_start",
        "serial_end",
        "note"
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少欄位：{missing}")

    total_created = 0
    results = []

    for idx, row in df.iterrows():
        row_no = idx + 1

        try:
            # === 1. 基本欄位 ===
            row_customer_id = str(row.get("vendor", "")).strip()
            if not row_customer_id:
                raise ValueError("vendor(customer_id) 為空")

            fixture_id = str(row.get("fixture_id", "")).strip()
            if not fixture_id:
                raise ValueError("fixture_id 為空")

            order_no = str(row.get("order_no", "")).strip()
            note = str(row.get("note", "")).strip()

            record_type = str(row.get("type", "")).strip().lower()
            if record_type != "batch":
                raise ValueError(f"目前僅支援 batch，收到：{record_type}")

            # === 2. 產生序號清單 ===
            start = row.get("serial_start")
            end = row.get("serial_end")

            try:
                start_i = int(start)
                end_i = int(end)
            except Exception:
                raise ValueError(f"序號起迄格式錯誤：{start} ~ {end}")

            if start_i > end_i:
                raise ValueError("serial_start 不可大於 serial_end")

            serials = ",".join(str(i) for i in range(start_i, end_i + 1))

            if not serials:
                raise ValueError("序號清單為空")

            # === 3. 固定來源類型（可自行改）===
            source_type = "customer_supplied"

            # === 4. 呼叫 SP（⚠️ 參數順序正確）===
            with db.get_cursor() as cursor:
                cursor.execute(
                    """
                    CALL sp_material_receipt(
                        %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s, %s,
                        @tid, @msg
                    )
                    """,
                    (
                        row_customer_id,      # p_customer_id
                        fixture_id,           # p_fixture_id
                        order_no,             # p_order_no
                        source_type,          # p_source_type
                        user["username"],     # p_operator
                        note,                 # p_note
                        user["id"],           # p_created_by
                        "batch",              # p_record_type
                        None,                 # p_datecode
                        serials,              # p_serials_csv
                    )
                )

                cursor.execute("SELECT @tid AS tid, @msg AS msg")
                sp_result = cursor.fetchone() or {}
                tid = sp_result.get("tid")
                msg = sp_result.get("msg")

            if msg != "OK" or not tid:
                raise ValueError(msg or "SP 未回傳交易 ID")

            total_created += 1
            results.append({
                "row": row_no,
                "status": "success",
                "transaction_id": tid
            })

        except Exception as e:
            results.append({
                "row": row_no,
                "status": "failed",
                "error": str(e)
            })

    return {
        "created": total_created,
        "total": len(df),
        "results": results
    }
