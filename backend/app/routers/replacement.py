"""
更換記錄 API (v4.x FINAL, Event-based)
------------------------------------
設計完全對齊 usage.py v4.x：

- Replacement = Event（不影響 usage / use_count）
- UI record_level: fixture / individual / batch
- DB record_level: fixture / serial
- individual / batch → serial event（多筆）
- operator 若未提供 → 預設登入者
- occurred_at 為唯一事件時間欄位（DB 標準）
- summary（更換次數）由 DB 層自行維護
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import Optional, Dict, Any
from datetime import datetime, date
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from fastapi.responses import StreamingResponse
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(
    prefix="/replacement",
    tags=["更換紀錄 Replacement Logs v4.x"]
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
# 列表查詢
# =============================================================
@router.get("", summary="查詢更換紀錄列表 (v4.x)")
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
@router.post("", summary="新增更換紀錄（fixture / individual / batch）")
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
      "occurred_at": "2026-01-14T00:00:00Z"
    }
    """

    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    operator = data.get("operator") or user["username"]

    # ⭐ 對外叫 occurred_at，對內一律轉 occurred_at
    raw_date = data.get("occurred_at") or data.get("replacement_date")
    if not raw_date:
        raise HTTPException(400, "缺少 occurred_at")

    try:
        # ⭐ 只取 YYYY-MM-DD，補成 00:00:00
        occurred_at = datetime.strptime(str(raw_date)[:10], "%Y-%m-%d")
    except Exception:
        raise HTTPException(400, f"日期格式錯誤（需 YYYY-MM-DD）：{raw_date}")

    record_level = data.get("record_level", "fixture")
    note = decorate_note(record_level, data.get("note"))

    # ---------------------------------------------------------
    # 1. fixture-level（單筆 event）
    # ---------------------------------------------------------
    if record_level == "fixture":
        db.execute_update(
            """
            INSERT INTO replacement_logs
              (customer_id, fixture_id, record_level,
               serial_number, operator, note, occurred_at)
            VALUES (%s, %s, 'fixture', NULL, %s, %s, %s)
            """,
            (customer_id, fixture_id, operator, note, occurred_at),
        )
        return {"mode": "fixture", "message": "更換紀錄已新增"}

    # ---------------------------------------------------------
    # 2. individual（多筆 serial）
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

        for sn in serials:
            db.execute_update(
                """
                INSERT INTO replacement_logs
                  (customer_id, fixture_id, record_level,
                   serial_number, operator, note, occurred_at)
                VALUES (%s, %s, 'serial', %s, %s, %s, %s)
                """,
                (customer_id, fixture_id, sn, operator, note, occurred_at),
            )

        return {
            "mode": "individual",
            "requested": len(serials),
            "inserted_count": len(serials),
        }

    # ---------------------------------------------------------
    # 3. batch（序號區間 → serial events）
    # ---------------------------------------------------------
    if record_level == "batch":
        start = data.get("serial_start")
        end = data.get("serial_end")

        serials = expand_serial_range(start or "", end or "")
        if not serials:
            raise HTTPException(
                400,
                "batch 模式需要有效的 serial_start / serial_end"
            )

        for sn in serials:
            db.execute_update(
                """
                INSERT INTO replacement_logs
                  (customer_id, fixture_id, record_level,
                   serial_number, operator, note, occurred_at)
                VALUES (%s, %s, 'serial', %s, %s, %s, %s)
                """,
                (customer_id, fixture_id, sn, operator, note, occurred_at),
            )

        return {
            "mode": "batch",
            "range": {"start": start, "end": end},
            "requested": len(serials),
            "inserted_count": len(serials),
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
        "序號（individual 模式使用）",
        "起始序號（batch 模式使用）",
        "結束序號（batch 模式使用）",
        "操作人員（可留空，自動帶登入者）",
        "備註（選填）",
        "更換日期 (YYYY-MM-DD)",
    ]
    ws.append(descriptions)


    # -----------------------------
    # 範例資料（可直接刪除）
    # -----------------------------

    # 範例 1：fixture-level
    ws.append([
        "L-00062",          # fixture_id
        "fixture",          # record_level
        "",                 # serial_number
        "",                 # serial_start
        "",                 # serial_end
        "",                 # operator
        "範例：治具層級使用",   # note
        "2026-01-01",       # occured_at
    ])

    # 範例 2：individual serial
    ws.append([
        "L-00062",          # fixture_id
        "individual",          # record_level
        "SN001",            # serial_number
        "",                 # serial_start
        "",                 # serial_end
        "",                 # operator
        "範例：單一序號使用",   # note
        "2026-01-01",       # occured_at
    ])

    # 範例 3：batch serial
    ws.append([
        "L-00062",          # fixture_id
        "batch",          # record_level
        "",                 # serial_number
        "SN0001",           # serial_start
        "SN0010",           # serial_end
        "",                 # operator
        "範例：批量序號使用",  # note
        "2026-01-01",       # occured_at
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
            "Content-Disposition":
            'attachment; filename="replacement_import_template.xlsx"'
        },
    )

# =============================================================
# 匯入更換記錄（xlsx）
# =============================================================
@router.post("/import", summary="匯入更換記錄（xlsx）")
def import_replacement_logs(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "只支援 xlsx")

    content = file.file.read()
    wb = load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))

    if not rows or len(rows) < 3:
        raise HTTPException(400, "Excel 內容不足")

    headers = [str(h).strip() for h in rows[0]]

    def col(name: str):
        if name not in headers:
            raise HTTPException(400, f"缺少欄位：{name}")
        return headers.index(name)

    success = 0
    errors = []

    for i, row in enumerate(rows[2:], start=3):
        try:
            data = {
                "fixture_id": row[col("fixture_id")],
                "record_level": row[col("record_level")],
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
# 刪除單筆
# =============================================================
@router.delete("/{log_id}", summary="刪除更換紀錄")
def delete_replacement(
    log_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        "SELECT id FROM replacement_logs WHERE id=%s AND customer_id=%s",
        (log_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "更換紀錄不存在")

    db.execute_update(
        "DELETE FROM replacement_logs WHERE id=%s AND customer_id=%s",
        (log_id, customer_id),
    )

    return {"message": "已刪除", "id": log_id}
