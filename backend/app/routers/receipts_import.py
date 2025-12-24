from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from datetime import date
import pandas as pd

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/receipts", tags=["Receipts Import"])


@router.post("/import")
async def import_receipts(
    file: UploadFile = File(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    """
    收料 Excel 匯入（batch / individual / datecode）
    - customer_id 由 Query 帶
    - vendor 欄位已淘汰（避免多客戶混入）
    """

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "請使用 .xlsx 匯入")

    # 讀取 Excel
    try:
        df = pd.read_excel(file.file)
    except Exception as e:
        raise HTTPException(400, f"Excel 讀取失敗：{str(e)}")

    # === 欄位規格（與後端統一） ===
    # batch:
    #   fixture_id | order_no | record_type=batch | serial_start | serial_end | note
    #
    # individual:
    #   fixture_id | order_no | record_type=individual | serials | note
    #
    # datecode:
    #   fixture_id | order_no | record_type=datecode | datecode | quantity | note

    required_cols = ["fixture_id", "record_type"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(400, f"缺少必要欄位：{missing}")

    total_created = 0
    errors = []

    for idx, row in df.iterrows():
        row_no = idx + 2  # Excel 行號（含 header）

        try:
            fixture_id = str(row.get("fixture_id", "")).strip()
            if not fixture_id:
                errors.append(f"第 {row_no} 行：缺少 fixture_id")
                continue

            order_no = str(row.get("order_no", "")).strip()
            note = str(row.get("note", "")).strip()

            record_type = str(row.get("record_type", "")).strip().lower()
            if record_type not in ["batch", "individual", "datecode"]:
                errors.append(f"第 {row_no} 行：record_type 不合法")
                continue

            source_type = str(row.get("source_type", "customer_supplied")).strip()
            if source_type not in ["self_purchased", "customer_supplied"]:
                errors.append(f"第 {row_no} 行：source_type 不合法")
                continue

            operator = user["username"]
            created_by = user["id"]

            # ===== 依 record_type 處理 =====
            datecode = None
            serials_str = ""

            if record_type == "batch":
                start = row.get("serial_start")
                end = row.get("serial_end")
                try:
                    start_i = int(start)
                    end_i = int(end)
                    if start_i > end_i:
                        raise ValueError
                    serials_str = ",".join(str(i) for i in range(start_i, end_i + 1))
                except Exception:
                    errors.append(f"第 {row_no} 行：batch 序號範圍錯誤")
                    continue

            elif record_type == "individual":
                serials_raw = str(row.get("serials", "")).strip()
                if not serials_raw:
                    errors.append(f"第 {row_no} 行：individual 缺少 serials")
                    continue
                serials_str = ",".join(
                    s.strip() for s in serials_raw.split(",") if s.strip()
                )
                if not serials_str:
                    errors.append(f"第 {row_no} 行：individual serials 無效")
                    continue

            else:  # datecode
                datecode = str(row.get("datecode", "")).strip()
                quantity = row.get("quantity")

                if not datecode:
                    errors.append(f"第 {row_no} 行：datecode 缺少 datecode")
                    continue
                try:
                    quantity = int(quantity)
                    if quantity <= 0:
                        raise ValueError
                except Exception:
                    errors.append(f"第 {row_no} 行：datecode quantity 錯誤")
                    continue

                serials_str = str(quantity)

            # ===== 呼叫 SP =====
            db.execute_query(
                """
                CALL sp_material_receipt(
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    @tx_id, @msg
                )
                """,
                (
                    customer_id,
                    fixture_id,
                    order_no,
                    source_type,
                    operator,
                    note,
                    created_by,
                    record_type,
                    datecode,
                    serials_str
                )
            )

            out = db.execute_query("SELECT @tx_id AS id, @msg AS msg")
            if not out or not out[0]["id"]:
                errors.append(f"第 {row_no} 行：{out[0]['msg'] if out else '匯入失敗'}")
                continue

            total_created += 1

        except Exception as e:
            errors.append(f"第 {row_no} 行：{str(e)}")

    return {
        "count": total_created,
        "errors": errors
    }
