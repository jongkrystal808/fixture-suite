"""
退料 Excel 匯入 Router（v4.x FIXED）
- SP-first
- 支援 batch / individual / datecode
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd
from io import BytesIO

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_username,
)

router = APIRouter(prefix="/returns", tags=["Returns Import"])


@router.post("/import", summary="退料 Excel 匯入")
async def import_returns(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    username: str = Depends(get_current_username),
):
    customer_id = user.customer_id
    operator = username
    created_by = user.id

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "請使用 .xlsx 檔案匯入")

    try:
        df = pd.read_excel(BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(400, f"Excel 讀取失敗：{e}")

    required_cols = ["fixture_id", "record_type", "source_type"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(400, f"缺少必要欄位：{missing}")

    total_created = 0
    errors = []

    conn = db.get_conn()
    try:
        cursor = conn.cursor()

        for idx, row in df.iterrows():
            row_no = idx + 2
            try:
                fixture_id = str(row.get("fixture_id", "")).strip()
                record_type = str(row.get("record_type", "")).strip().lower()
                source_type = str(row.get("source_type", "")).strip()

                if record_type not in ("batch", "individual", "datecode"):
                    raise ValueError("record_type 不合法")

                if source_type not in ("self_purchased", "customer_supplied"):
                    raise ValueError("source_type 不合法")

                order_no = str(row.get("order_no", "")).strip() or None
                note = str(row.get("note", "")).strip() or None

                serials_csv = None
                datecode = None
                quantity = None

                if record_type in ("batch", "individual"):
                    raw = str(row.get("serials", "")).strip()
                    serials = [s.strip() for s in raw.split(",") if s.strip()]
                    if not serials:
                        raise ValueError("serials 無效")
                    serials_csv = ",".join(serials)
                else:
                    datecode = str(row.get("datecode", "")).strip()
                    quantity = int(row.get("quantity"))
                    if not datecode or quantity <= 0:
                        raise ValueError("datecode / quantity 錯誤")

                cursor.execute(
                    """
                    CALL sp_material_return(
                        %s,%s,%s,%s,%s,%s,
                        %s,%s,
                        %s,
                        %s,%s,
                        @tx_id,@msg
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

                cursor.execute("SELECT @tx_id AS id, @msg AS message")
                out = cursor.fetchone() or {}

                tx_id = out.get("id") if isinstance(out, dict) else out[0]
                msg = out.get("message") if isinstance(out, dict) else out[1]

                if not tx_id:
                    raise ValueError(msg or "退料失敗")

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
