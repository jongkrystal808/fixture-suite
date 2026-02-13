# backend/app/routers/transactions_import.py

"""
交易 Excel 匯入 Router（收 / 退 合併版 v6｜SAFE）
- 依 transaction_type 分流 receipt / return
- SP-first（v6）
- validate-first，不留下失敗交易
- ✅ datecode 完全不讀 serials（避免 NaN -> "nan"）
- ✅ batch 支援 serial_start ~ serial_end 區間展開
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import pandas as pd
from io import BytesIO
import pymysql
import re

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions Import"]
)

# ============================================================
# Helper（共用）
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise ValueError(f"治具 {fixture_id} 不存在或不屬於此客戶")


def normalize_source_type(val) -> str:
    v = ("" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val)).strip().lower()
    if v in ("self_purchased", "自購"):
        return "self_purchased"
    if v in ("customer_supplied", "客供", "customer supplied"):
        return "customer_supplied"
    raise ValueError("source_type 不合法（允許：self_purchased / customer_supplied）")


def normalize_tx_type(val) -> str:
    v = ("" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val)).strip().lower()
    if v in ("receipt", "return"):
        return v
    raise ValueError("transaction_type 必須為 receipt 或 return")


def normalize_record_type(val) -> str:
    v = ("" if val is None or (isinstance(val, float) and pd.isna(val)) else str(val)).strip().lower()
    if v in ("batch", "individual", "datecode"):
        return v
    raise ValueError("record_type 不合法（允許：batch / individual / datecode）")


def read_str_optional(val):
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    s = str(val).strip()
    return s or None


# ============================================================
# 🔥 新增：展開 batch 區間
# ============================================================

def expand_serial_range(start: str, end: str) -> list[str]:
    """
    展開 SN001 ~ SN100 類型區間
    """
    pattern = r"([A-Za-z\-]*)(\d+)$"

    m1 = re.match(pattern, start)
    m2 = re.match(pattern, end)

    if not m1 or not m2:
        raise ValueError("序號格式錯誤，無法展開區間")

    prefix1, num1 = m1.groups()
    prefix2, num2 = m2.groups()

    if prefix1 != prefix2:
        raise ValueError("serial_start 與 serial_end 前綴不同")

    width = len(num1)
    start_num = int(num1)
    end_num = int(num2)

    if start_num > end_num:
        raise ValueError("序號區間錯誤（start > end）")

    return [
        f"{prefix1}{str(i).zfill(width)}"
        for i in range(start_num, end_num + 1)
    ]


def parse_serials_csv(raw_serials) -> tuple[str, int]:
    if raw_serials is None:
        raise ValueError("serials 不可為空（batch/individual 必填）")
    if isinstance(raw_serials, float) and pd.isna(raw_serials):
        raise ValueError("serials 不可為空（batch/individual 必填）")

    if not isinstance(raw_serials, str):
        raw_serials = str(raw_serials)

    raw = raw_serials.strip()
    if not raw:
        raise ValueError("serials 不可為空（batch/individual 必填）")

    serials = [s.strip() for s in raw.split(",") if s.strip()]
    if not serials:
        raise ValueError("serials 無效")

    serials_csv = ",".join(serials)

    if serials_csv.lower() == "nan":
        raise ValueError("serials 欄位異常（NaN）")

    return serials_csv, len(serials)


def parse_datecode_qty(raw_datecode, raw_qty) -> tuple[str, int]:
    if raw_datecode is None or (isinstance(raw_datecode, float) and pd.isna(raw_datecode)):
        raise ValueError("datecode 不可為空")

    dc = str(raw_datecode).strip()
    if not dc:
        raise ValueError("datecode 不可為空")

    if raw_qty is None or (isinstance(raw_qty, float) and pd.isna(raw_qty)):
        raise ValueError("quantity 不可為空")

    qty = int(raw_qty)
    if qty <= 0:
        raise ValueError("quantity 必須 > 0")

    return dc, qty


def normalize_order_no(val):
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None

    s = str(val).strip()
    if not s:
        return None

    if s.endswith(".0"):
        s = s[:-2]

    return s


# ============================================================
# Excel 匯入（交易合併）
# ============================================================

@router.post("/import", summary="交易 Excel 匯入（收 / 退 合併）")
async def import_transactions(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):
    operator = user["username"]
    created_by = user["id"]

    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="請使用 .xlsx 檔案匯入")

    try:
        df = pd.read_excel(BytesIO(await file.read()))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel 讀取失敗：{e}")

    required_cols = [
        "transaction_type",
        "fixture_id",
        "record_type",
        "source_type",
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"缺少必要欄位：{missing}")

    total_created = 0
    errors: list[str] = []
    warnings: list[str] = []

    for idx, row in df.iterrows():
        row_no = idx + 2
        try:
            tx_type = normalize_tx_type(row.get("transaction_type"))
            fixture_id = read_str_optional(row.get("fixture_id"))
            record_type = normalize_record_type(row.get("record_type"))
            source_type = normalize_source_type(row.get("source_type"))

            if not fixture_id:
                raise ValueError("fixture_id 不可為空")

            ensure_fixture_exists(fixture_id, customer_id)

            order_no = normalize_order_no(row.get("order_no"))
            note = read_str_optional(row.get("note"))

            serials_csv = None
            datecode = None
            quantity = None

            # =========================
            # batch（已修正）
            # =========================
            if record_type == "batch":
                serial_start = read_str_optional(row.get("serial_start"))
                serial_end = read_str_optional(row.get("serial_end"))

                if not serial_start or not serial_end:
                    raise ValueError("batch 必須填寫 serial_start 與 serial_end")

                serial_list = expand_serial_range(serial_start, serial_end)

                # 🔥 大區間保護（上限 2000）
                MAX_BATCH_SIZE = 2000

                if len(serial_list) > MAX_BATCH_SIZE:
                    raise ValueError(
                        f"batch 區間過大（{len(serial_list)} 筆），上限為 {MAX_BATCH_SIZE} 筆"
                    )
                # 🔍 異常區間警告（但不阻擋）
                if size > WARNING_BATCH_SIZE:
                    warnings.append(
                        f"第 {row_no} 行：batch 區間偏大（{size} 筆），請確認是否為預期操作"
                    )

                serials_csv = ",".join(serial_list)
                quantity = len(serial_list)
                datecode = None


            # =========================
            # individual
            # =========================
            elif record_type == "individual":
                serials_csv, quantity = parse_serials_csv(row.get("serials"))
                datecode = None

            # =========================
            # datecode
            # =========================
            elif record_type == "datecode":
                datecode, quantity = parse_datecode_qty(
                    row.get("datecode"),
                    row.get("quantity"),
                )
                serials_csv = None

            sp_name = "sp_material_receipt_v6" if tx_type == "receipt" else "sp_material_return_v6"

            out = db.call_sp_with_out(
                sp_name,
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
                raise ValueError(out.get("o_message") if out else "交易失敗")

            total_created += 1

        except Exception as e:
            msg = str(e)
            if isinstance(e, pymysql.MySQLError) and getattr(e, "args", None) and len(e.args) >= 2:
                msg = e.args[1]
            errors.append(f"第 {row_no} 行：{msg}")

    return {
        "count": total_created,
        "failed": len(errors),
        "errors": errors,
        "warnings": warnings,
    }
