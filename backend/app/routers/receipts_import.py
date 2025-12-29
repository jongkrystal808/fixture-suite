"""
收料 Excel 匯入 Router（乾淨版）
- 僅保留一個 /receipts/import
- 支援 batch / individual / datecode
- customer_id 一律由 Query 傳入
- 使用同一 DB connection 取得 SP OUT 參數
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
import pandas as pd
from io import BytesIO   # ⭐ FIX：一定要用 BytesIO

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/receipts", tags=["Receipts Import"])


@router.post("/import", summary="收料 Excel 匯入")
async def import_receipts(
    file: UploadFile = File(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # -------------------------------------------------
    # 1️⃣ 基本檢查
    # -------------------------------------------------
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "請使用 .xlsx 檔案匯入")

    # -------------------------------------------------
    # ⭐ FIX：不要再用 file.file
    # -------------------------------------------------
    try:
        content = await file.read()
        df = pd.read_excel(BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Excel 讀取失敗：{str(e)}")

    required_cols = ["fixture_id", "record_type"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(400, f"缺少必要欄位：{missing}")

    # -------------------------------------------------
    # 2️⃣ 初始化
    # -------------------------------------------------
    total_created = 0
    errors = []

    operator = user["username"]
    created_by = user["id"]

    conn = db.get_conn()

    try:
        cursor = conn.cursor()

        # -------------------------------------------------
        # 3️⃣ 逐行處理 Excel
        # -------------------------------------------------
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

                source_type = str(
                    row.get("source_type", "customer_supplied")
                ).strip()

                if source_type not in ["self_purchased", "customer_supplied"]:
                    errors.append(f"第 {row_no} 行：source_type 不合法")
                    continue

                datecode = None
                serials_str = ""

                # -------------------------
                # batch
                # -------------------------
                if record_type == "batch":
                    try:
                        start = int(row.get("serial_start"))
                        end = int(row.get("serial_end"))
                        if start > end:
                            raise ValueError
                        serials_str = ",".join(
                            str(i) for i in range(start, end + 1)
                        )
                    except Exception:
                        errors.append(f"第 {row_no} 行：batch 序號範圍錯誤")
                        continue

                # -------------------------
                # individual
                # -------------------------
                elif record_type == "individual":
                    raw = str(row.get("serials", "")).strip()
                    if not raw:
                        errors.append(f"第 {row_no} 行：individual 缺少 serials")
                        continue

                    serials = [
                        s.strip() for s in raw.split(",") if s.strip()
                    ]
                    if not serials:
                        errors.append(f"第 {row_no} 行：individual serials 無效")
                        continue

                    serials_str = ",".join(serials)

                # -------------------------
                # datecode
                # -------------------------
                else:
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

                # -------------------------------------------------
                # 4️⃣ 呼叫 SP（同一條連線）
                # -------------------------------------------------
                cursor.execute(
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

                cursor.execute("SELECT @tx_id AS id, @msg AS msg")
                out = cursor.fetchone()

                tx_id = out[0] if out else None
                msg = out[1] if out else None

                if not tx_id:
                    errors.append(
                        f"第 {row_no} 行：{msg or '收料失敗'}"
                    )
                    continue

                total_created += 1


            except Exception as e:
                errors.append(f"第 {row_no} 行：{str(e)}")

        conn.commit()

    finally:
        conn.close()

    # -------------------------------------------------
    # 5️⃣ 回傳結果
    # -------------------------------------------------
    return {
        "count": total_created,
        "errors": errors
    }
