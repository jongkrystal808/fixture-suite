"""
退料 Excel 匯入 Router（v4.x FINAL）
- SP-first
- 支援 batch / individual / datecode
- ✅ 對齊 sp_material_return_v4（11 個 IN 參數）
- ✅ SP 回傳：SELECT transaction_id, message
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd
from io import BytesIO
import pymysql

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_customer_id,
)

router = APIRouter(prefix="/returns", tags=["Returns Import"])


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
    v = (val or "").strip().lower()
    # 允許中英文（跟收料一致的容錯）
    if v in ("self_purchased", "自購"):
        return "self_purchased"
    if v in ("customer_supplied", "客供", "customer supplied"):
        return "customer_supplied"
    raise ValueError("source_type 不合法")


# ============================================================
# Excel 匯入
# ============================================================

@router.post("/import", summary="退料 Excel 匯入")
async def import_returns(
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
    # 3️⃣ DB 操作（逐行 try/except，單列失敗不影響其他列）
    # --------------------------------------------------
    conn = db.get_conn()
    try:
        cursor = conn.cursor(pymysql.cursors.DictCursor)

        for idx, row in df.iterrows():
            row_no = idx + 2  # Excel 實際行號（含標題列）
            try:
                # -------------------------
                # 基本欄位
                # -------------------------
                fixture_id = str(row.get("fixture_id", "")).strip()
                record_type = str(row.get("record_type", "")).strip().lower()
                source_type = normalize_source_type(str(row.get("source_type", "")))

                if not fixture_id:
                    raise ValueError("fixture_id 不可為空")

                if record_type not in ("batch", "individual", "datecode"):
                    raise ValueError("record_type 不合法")

                if source_type not in ("self_purchased", "customer_supplied"):
                    raise ValueError("source_type 不合法")

                # 檢查治具存在
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
                # 4️⃣ CALL SP（✅ 對齊 returns.py 的 create_return）
                # sp_material_return_v4(
                #   customer_id, fixture_id, order_no, operator, note, created_by,
                #   record_type, source_type, serials_csv, datecode, quantity
                # )
                # -------------------------
                cursor.execute(
                    """
                    CALL sp_material_return_v4(
                        %s, %s, %s, %s, %s, %s,
                        %s, %s,
                        %s,
                        %s, %s
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

                # SP 回傳 SELECT transaction_id, message
                result = cursor.fetchone()
                if not result or result.get("transaction_id") is None:
                    raise ValueError((result or {}).get("message") or "退料失敗")

                total_created += 1

            except Exception as e:
                errors.append(f"第 {row_no} 行：{e}")

        conn.commit()

    finally:
        conn.close()

    return {
        "count": total_created,
        "errors": errors,
    }
