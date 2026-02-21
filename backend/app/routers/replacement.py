"""
更換記錄 API (v6, SP-first, Lifecycle-compatible)
------------------------------------------------
設計目標（對齊 v6 Lifecycle Engine）：
- Replacement = Event（不影響 usage/use_count）
- UI record_level: fixture / individual / batch
- DB record_level: fixture / serial
- individual / batch → 多筆 serial event（多次呼叫 SP）
- occurred_at 為唯一事件時間欄位（DB 標準）
- ✅ 所有寫入一律透過 Stored Procedure：
    sp_insert_replacement_log_v6
- ✅ serial scrap / scrapped_at / event_type / cache rebuild 全交給 DB
- ⚠️ replacement_logs 應視為不可變 ledger
  - 本 API 預設禁止刪除 serial-level replacement（避免狀態不可逆）
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional, Dict, Any
from datetime import datetime
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from fastapi.responses import StreamingResponse
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(
    prefix="/replacement",
    tags=["更換紀錄 Replacement Logs v6"]
)

# =============================================================
# Helper：基本存在性檢查
# =============================================================
def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(
            400,
            f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}"
        )

# =============================================================
# Helper：補上 individual / batch 語意到 note（對齊 usage event）
# =============================================================
def decorate_note(record_level: str, note: Optional[str]) -> Optional[str]:
    base = (note or "").strip()
    if record_level in ("individual", "batch"):
        return f"[{record_level}] {base}" if base else f"[{record_level}]"
    return base or None

# =============================================================
# Helper：呼叫 sp_insert_replacement_log_v6
# =============================================================
def call_sp_insert_replacement_v6(
    customer_id: str,
    fixture_id: str,
    sp_record_level: str,      # 'fixture' or 'serial'
    serial_number: Optional[str],
    operator: str,
    note: Optional[str],
    occurred_at: datetime,
) -> Dict[str, Any]:
    """
    Stored Procedure 定義（你已在 DB 建好）：

    sp_insert_replacement_log_v6(
        IN  p_customer_id VARCHAR(50),
        IN  p_fixture_id VARCHAR(50),
        IN  p_record_level VARCHAR(20), -- 'fixture' | 'serial'
        IN  p_serial_number VARCHAR(100),
        IN  p_operator VARCHAR(100),
        IN  p_note TEXT,
        IN  p_occurred_at DATETIME,
        OUT o_inserted_count INT,
        OUT o_message VARCHAR(255)
    )
    """

    out = db.call_sp_with_out(
        "sp_insert_replacement_log_v6",
        [
            customer_id,
            fixture_id,
            sp_record_level,
            serial_number,
            operator,
            note,
            occurred_at,
        ],
        ["o_inserted_count", "o_message"],
    )

    if isinstance(out, dict):
        inserted = out.get("o_inserted_count")
        message = out.get("o_message")
    else:
        inserted = out[0] if out and len(out) > 0 else None
        message = out[1] if out and len(out) > 1 else None

    if not inserted:
        raise HTTPException(400, message or "更換紀錄新增失敗")

    return {
        "inserted_count": inserted,
        "message": message or "更換紀錄新增成功",
    }

# =============================================================
# 列表查詢（只讀 replacement_logs）
# =============================================================
@router.get("", summary="查詢更換紀錄列表 (v6)")
def list_replacement_logs(
    fixture_id: Optional[str] = None,
    serial_number: Optional[str] = None,
    operator: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["rl.customer_id=%s"]
    params = [customer_id]

    if fixture_id:
        where.append("rl.fixture_id=%s")
        params.append(fixture_id)

    if serial_number:
        where.append("rl.serial_number=%s")
        params.append(serial_number)

    if operator:
        where.append("rl.operator LIKE %s")
        params.append(f"%{operator}%")

    if date_from:
        where.append("rl.occurred_at >= %s")
        params.append(date_from)

    if date_to:
        where.append("rl.occurred_at <= %s")
        params.append(date_to)

    sql = f"""
        SELECT
            rl.*,
            f.fixture_name
        FROM replacement_logs rl
        LEFT JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE {' AND '.join(where)}
        ORDER BY rl.occurred_at DESC, rl.id DESC
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])
    return db.execute_query(sql, tuple(params))

# =============================================================
# 新增更換記錄（fixture / individual / batch）
# =============================================================
@router.post("", summary="新增更換紀錄（fixture / individual / batch｜v6）")
def create_replacement(
    data: Dict[str, Any],
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    """
    前端 payload（對齊 app-replacement.js）：

    {
      "fixture_id": "FX-0001",
      "record_level": "fixture" | "individual" | "batch",
      "serial_number": "SN001,SN002",     // individual
      "serial_start": "SN001",            // batch
      "serial_end": "SN010",              // batch
      "operator": "100182",
      "note": "備註",
      "occurred_at": "2026-01-14"
    }
    """

    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    operator = data.get("operator") or user["username"]

    raw_date = data.get("occurred_at") or data.get("replacement_date")
    if not raw_date:
        raise HTTPException(400, "缺少 occurred_at")

    try:
        # 只取 YYYY-MM-DD → 00:00:00
        occurred_at = datetime.strptime(str(raw_date)[:10], "%Y-%m-%d")
    except Exception:
        raise HTTPException(400, f"日期格式錯誤（需 YYYY-MM-DD）：{raw_date}")

    record_level = str(data.get("record_level") or "fixture").strip()
    note = decorate_note(record_level, data.get("note"))

    # ---------------------------------------------------------
    # 1) fixture-level（單筆）
    # ---------------------------------------------------------
    if record_level == "fixture":
        res = call_sp_insert_replacement_v6(
            customer_id=customer_id,
            fixture_id=fixture_id,
            sp_record_level="fixture",
            serial_number=None,
            operator=operator,
            note=note,
            occurred_at=occurred_at,
        )
        return {
            "mode": "fixture",
            "inserted_count": res["inserted_count"],
            "message": res["message"],
        }

    # ---------------------------------------------------------
    # 2) individual（多筆 serial）
    # ---------------------------------------------------------
    if record_level == "individual":
        raw = data.get("serial_number")
        if not raw:
            raise HTTPException(400, "individual 模式需要 serial_number")

        serials = normalise_serial_list(
            [x.strip() for x in str(raw).split(",") if x.strip()]
        )
        if not serials:
            raise HTTPException(400, "individual 模式解析不到任何序號")

        inserted = 0
        errors = []

        for sn in serials:
            try:
                r = call_sp_insert_replacement_v6(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="serial",
                    serial_number=sn,
                    operator=operator,
                    note=note,
                    occurred_at=occurred_at,
                )
                inserted += int(r.get("inserted_count") or 0)
            except HTTPException as he:
                errors.append(f"{sn}: {he.detail}")
            except Exception as e:
                errors.append(f"{sn}: {str(e)}")

        return {
            "mode": "individual",
            "requested": len(serials),
            "inserted_count": inserted,
            "errors": errors,
        }

    # ---------------------------------------------------------
    # 3) batch（序號區間 → 多筆 serial）
    # ---------------------------------------------------------
    if record_level == "batch":
        start = data.get("serial_start")
        end = data.get("serial_end")

        serials = expand_serial_range(start or "", end or "")
        if not serials:
            raise HTTPException(400, "batch 模式需要有效的 serial_start / serial_end")

        inserted = 0
        errors = []

        for sn in serials:
            try:
                r = call_sp_insert_replacement_v6(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="serial",
                    serial_number=sn,
                    operator=operator,
                    note=note,
                    occurred_at=occurred_at,
                )
                inserted += int(r.get("inserted_count") or 0)
            except HTTPException as he:
                errors.append(f"{sn}: {he.detail}")
            except Exception as e:
                errors.append(f"{sn}: {str(e)}")

        return {
            "mode": "batch",
            "range": {"start": start, "end": end},
            "requested": len(serials),
            "inserted_count": inserted,
            "errors": errors,
        }

    raise HTTPException(400, f"未知的 record_level: {record_level}")

# =============================================================
# 匯入樣本（Template）
# =============================================================
@router.get("/template", summary="下載更換記錄匯入樣本（xlsx）")
def download_replacement_template(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Replacement Import Template"

    headers = [
        "fixture_id",
        "record_level",
        "serial_number",
        "serial_start",
        "serial_end",
        "operator",
        "note",
        "occurred_at",
    ]
    ws.append(headers)

    descriptions = [
        "治具編號（必填）",
        "fixture / individual / batch",
        "序號（individual 模式使用，可逗號分隔）",
        "起始序號（batch 模式使用）",
        "結束序號（batch 模式使用）",
        "操作人員（可留空，自動帶登入者）",
        "備註（選填）",
        "更換日期 (YYYY-MM-DD)",
    ]
    ws.append(descriptions)

    # 範例 1：fixture-level
    ws.append([
        "L-00062",
        "fixture",
        "",
        "",
        "",
        "",
        "範例：治具層級更換",
        "2026-01-01",
    ])

    # 範例 2：individual serial
    ws.append([
        "L-00062",
        "individual",
        "SN001,SN002",
        "",
        "",
        "",
        "範例：單一序號更換",
        "2026-01-01",
    ])

    # 範例 3：batch serial
    ws.append([
        "L-00062",
        "batch",
        "",
        "SN0001",
        "SN0010",
        "",
        "範例：批量序號更換",
        "2026-01-01",
    ])

    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 22

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="replacement_import_template.xlsx"'
        },
    )

# =============================================================
# 匯入更換記錄（xlsx）
# =============================================================
@router.post("/import", summary="匯入更換記錄（xlsx｜v6）")
def import_replacement_logs(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "只支援 xlsx")

    content = file.file.read()
    try:
        wb = load_workbook(io.BytesIO(content), data_only=True)
    except Exception:
        raise HTTPException(400, "無法讀取 Excel 檔案")

    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    if not rows or len(rows) < 3:
        raise HTTPException(400, "Excel 內容不足（至少需要標題列與資料列）")

    headers = [str(h).strip() if h else "" for h in rows[0]]

    def col(name: str) -> int:
        if name not in headers:
            raise HTTPException(400, f"缺少欄位：{name}")
        return headers.index(name)

    success = 0
    errors = []

    for i, row in enumerate(rows[2:], start=3):
        try:
            data = {
                "fixture_id": row[col("fixture_id")],
                "record_level": row[col("record_level")] or "fixture",
                "serial_number": row[col("serial_number")],
                "serial_start": row[col("serial_start")],
                "serial_end": row[col("serial_end")],
                "operator": row[col("operator")] or user["username"],
                "note": row[col("note")],
                "occurred_at": row[col("occurred_at")],
            }
            create_replacement(data, user, customer_id)
            success += 1
        except Exception as e:
            errors.append(f"第 {i} 列：{str(e)}")

    return {
        "success_count": success,
        "error_count": len(errors),
        "errors": errors,
    }

# =============================================================
# 刪除單筆（v6：限制 serial-level，避免狀態不可逆）
# =============================================================
@router.delete("/{log_id}", summary="刪除更換紀錄（v6 限制）")
def delete_replacement(
    log_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    # 先讀出 log（判斷 record_level）
    rows = db.execute_query(
        """
        SELECT id, fixture_id, record_level, serial_number
        FROM replacement_logs
        WHERE id=%s AND customer_id=%s
        """,
        (log_id, customer_id),
    )
    if not rows:
        raise HTTPException(404, "更換紀錄不存在")

    r = rows[0]

    # serial-level 事件不可逆（會影響 fixture_serials scrapped 狀態）
    if r.get("record_level") == "serial":
        raise HTTPException(
            400,
            "serial-level replacement 屬不可逆事件（會影響序號 scrapped 狀態），v6 不允許刪除。"
        )

    # fixture-level：允許刪除（僅刪紀錄；若你希望也 rollback last_replacement_date，應改用 SP）
    db.execute_update(
        "DELETE FROM replacement_logs WHERE id=%s AND customer_id=%s",
        (log_id, customer_id),
    )

    # 仍可 rebuild（保守確保 cache 一致）
    fixture_id = r.get("fixture_id")
    if fixture_id:
        try:
            db.call_sp_with_out(
                "sp_rebuild_fixture_quantities_v6",
                [customer_id, fixture_id],
                []
            )
        except Exception:
            # rebuild 失敗不影響刪除結果（避免 API 500）
            pass

    return {"message": "已刪除（fixture-level）", "id": log_id}