"""
收料 Excel 匯入 Router（v4.x FIXED）
- SP-first
- 支援 batch / individual / datecode
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd
from io import BytesIO
import pymysql

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id

router = APIRouter(prefix="/receipts", tags=["Receipts Import"])


# ============================================================
# Helper
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise ValueError(f"治具 {fixture_id} 不存在或不屬於此客戶")

def normalize_source_type(val: str) -> str:
    v = val.strip().lower()
    if v in ("self_purchased", "自購"):
        return "self_purchased"
    if v in ("customer_supplied", "客供", "customer supplied"):
        return "customer_supplied"
    raise ValueError("source_type 不合法")



# ============================================================
# Excel 匯入（收料 v4.x）
# ============================================================

@router.post("/import", summary="收料 Excel 匯入")
async def import_receipts(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):
    operator = user["username"]
    created_by = user["id"]

    # --------------------------------------------------
    # 1️⃣ 檔案檢查
    # --------------------------------------------------
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="請使用 .xlsx 檔案匯入")

    try:
        df = pd.read_excel(BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel 讀取失敗：{e}")

    # --------------------------------------------------
    # 2️⃣ 必要欄位檢查
    # --------------------------------------------------
    required_cols = ["fixture_id", "record_type", "source_type"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少必要欄位：{missing}")

    total_created = 0
    errors: list[str] = []

    # --------------------------------------------------
    # 3️⃣ DB 操作
    # --------------------------------------------------
    conn = db.get_conn()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        for idx, row in df.iterrows():
            row_no = idx + 2  # Excel 實際行號
            try:
                # -------------------------
                # 基本欄位
                # -------------------------
                fixture_id = str(row.get("fixture_id", "")).strip()
                record_type = str(row.get("record_type", "")).strip().lower()
                source_type = normalize_source_type(
                    str(row.get("source_type", "")).strip()
                )

                if not fixture_id:
                    raise ValueError("fixture_id 不可為空")

                if record_type not in ("batch", "individual", "datecode"):
                    raise ValueError("record_type 不合法")

                if source_type not in ("self_purchased", "customer_supplied"):
                    raise ValueError("source_type 不合法")

                # 檢查治具是否存在
                ensure_fixture_exists(fixture_id, customer_id)

                order_no = str(row.get("order_no", "")).strip() or None
                note = str(row.get("note", "")).strip() or None

                serials_csv = None
                datecode = None
                quantity = None

                # -------------------------
                # record_type 分流
                # -------------------------
                if record_type in ("batch", "individual"):
                    raw = str(row.get("serials", "") or "").strip()
                    serials = [s.strip() for s in raw.split(",") if s.strip()]
                    if not serials:
                        raise ValueError("serials 無效")
                    serials_csv = ",".join(serials)

                else:  # datecode
                    datecode = str(row.get("datecode", "")).strip()
                    q = row.get("quantity")

                    if not datecode:
                        raise ValueError("datecode 不可為空")

                    if q is None or pd.isna(q):
                        raise ValueError("quantity 不可為空")

                    quantity = int(q)
                    if quantity <= 0:
                        raise ValueError("quantity 必須 > 0")

                # -------------------------
                # 4️⃣ CALL SP（⚠️ 完全對齊 SP 定義順序）
                # -------------------------
                out = db.call_sp_with_out(
                    "sp_material_receipt_v4",
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
                    raise ValueError(out.get("o_message") or "收料失敗")

                total_created += 1

            except Exception as e:
                errors.append(f"第 {row_no} 行：{e}")

        conn.commit()

    finally:
        conn.close()

    # --------------------------------------------------
    # 6️⃣ 回傳結果
    # --------------------------------------------------
    return {
        "count": total_created,
        "errors": errors,
    }
