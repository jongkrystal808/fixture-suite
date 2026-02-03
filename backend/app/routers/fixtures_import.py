"""
治具 Excel 匯入 Router（v4.x FINAL）
- 路徑：POST /fixtures/import
- Header-based customer context
- 僅允許「新增治具」
- fixture_id 已存在 → 視為錯誤
- 任一列錯誤 → 全部 rollback
- 匯入回報格式完全對齊 models import
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from openpyxl import load_workbook
from io import BytesIO

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_customer_id,
)

router = APIRouter(prefix="/fixtures", tags=["Fixtures Import"])


# ============================================================
# Utils
# ============================================================

def compress_rows(rows: list[int]) -> list[str]:
    """
    將 [2,3,4,7,9] 壓縮為 ['2-4', '7', '9']
    """
    if not rows:
        return []

    rows = sorted(set(rows))
    result = []

    start = prev = rows[0]
    for r in rows[1:]:
        if r == prev + 1:
            prev = r
            continue
        result.append(f"{start}-{prev}" if start != prev else f"{start}")
        start = prev = r

    result.append(f"{start}-{prev}" if start != prev else f"{start}")
    return result


# ============================================================
# Router
# ============================================================

@router.post("/import", summary="匯入治具（XLSX）")
async def import_fixtures_xlsx(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):

    # =================================================
    # 1️⃣ 基本檢查
    # =================================================
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="只接受 .xlsx 檔案")

    content = await file.read()
    wb = load_workbook(BytesIO(content))

    if "fixtures" not in wb.sheetnames:
        raise HTTPException(
            status_code=400,
            detail='XLSX 需包含 "fixtures" 工作表'
        )

    ws = wb["fixtures"]

    # =================================================
    # 2️⃣ Header 檢查（必填 / 選填）
    # =================================================
    header = [str(c.value).strip() if c.value else "" for c in ws[1]]

    REQUIRED_COLS = ["id", "fixture_name"]
    OPTIONAL_COLS = [
        "fixture_type",
        "storage_location",
        "replacement_cycle",
        "cycle_unit",
        "note",
    ]

    for col in REQUIRED_COLS:
        if col not in header:
            raise HTTPException(
                status_code=400,
                detail=f"缺少必要欄位：{col}"
            )

    # 建立 idx（僅存在於 Excel 的欄位才會出現）
    idx = {name: header.index(name) for name in header}

    # =================================================
    # 3️⃣ 初始化匯入回報（對齊 models import）
    # =================================================
    result = {
        "fixtures": {
            "imported": 0,
            "skipped": 0,
            "success_rows": [],
            "skipped_rows": [],
        },
        "errors": [],
    }

    conn = db.get_conn()
    cursor = conn.cursor()

    try:
        # =================================================
        # 4️⃣ 逐行處理
        # =================================================
        for row_no, row in enumerate(
            ws.iter_rows(min_row=2, values_only=True),
            start=2
        ):
            try:
                # 空列
                if not row:
                    result["fixtures"]["skipped"] += 1
                    result["fixtures"]["skipped_rows"].append(row_no)
                    continue

                # ---------- 必填欄位 ----------
                fixture_id = str(row[idx["id"]] or "").strip()
                fixture_name = str(row[idx["fixture_name"]] or "").strip()

                if not fixture_id or not fixture_name:
                    result["fixtures"]["skipped"] += 1
                    result["fixtures"]["skipped_rows"].append(row_no)
                    continue

                # ---------- 選填欄位（安全讀取） ----------
                fixture_type = (
                    str(row[idx["fixture_type"]]).strip()
                    if "fixture_type" in idx and row[idx["fixture_type"]] is not None
                    else ""
                )

                storage_location = (
                    str(row[idx["storage_location"]]).strip()
                    if "storage_location" in idx and row[idx["storage_location"]] is not None
                    else ""
                )

                replacement_cycle = (
                    int(row[idx["replacement_cycle"]])
                    if "replacement_cycle" in idx and row[idx["replacement_cycle"]] is not None
                    else None
                )

                cycle_unit = (
                    str(row[idx["cycle_unit"]]).strip().lower()
                    if "cycle_unit" in idx and row[idx["cycle_unit"]] is not None
                    else "uses"
                )

                note = (
                    str(row[idx["note"]]).strip()
                    if "note" in idx and row[idx["note"]] is not None
                    else ""
                )

                # ---------- 驗證 ----------
                if cycle_unit not in ("uses", "days", "none"):
                    raise ValueError("cycle_unit 必須是 uses / days / none")

                if cycle_unit == "none":
                    replacement_cycle = None

                # ---------- 不允許已存在 ----------
                cursor.execute(
                    """
                    SELECT 1 FROM fixtures
                    WHERE customer_id=%s AND id=%s
                    """,
                    (customer_id, fixture_id)
                )
                if cursor.fetchone():
                    raise ValueError(
                        f"治具編號 {fixture_id} 已存在，禁止重複匯入"
                    )

                # ---------- INSERT ----------
                cursor.execute(
                    """
                    INSERT INTO fixtures (
                        customer_id,
                        id,
                        fixture_name,
                        fixture_type,
                        storage_location,
                        replacement_cycle,
                        cycle_unit,
                        note
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        customer_id,
                        fixture_id,
                        fixture_name,
                        fixture_type,
                        storage_location,
                        replacement_cycle,
                        cycle_unit,
                        note,
                    )
                )

                result["fixtures"]["imported"] += 1
                result["fixtures"]["success_rows"].append(row_no)

            except Exception as e:
                result["errors"].append(
                    f"第 {row_no} 行：{str(e)}"
                )

        # =================================================
        # 5️⃣ 無有效資料（非錯誤）
        # =================================================
        if (
                result["fixtures"]["imported"] == 0
                and not result["errors"]
        ):
            conn.rollback()
            return {
                "message": "未匯入任何有效治具資料",
                "fixtures": {
                    "imported": 0,
                    "skipped": result["fixtures"]["skipped"],
                    "success_rows": [],
                    "skipped_rows": compress_rows(
                        result["fixtures"]["skipped_rows"]
                    ),
                },
                "errors": [],
                "warning": "檔案中沒有可匯入的有效資料列",
            }

        if result["errors"]:
            conn.rollback()
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "匯入失敗，資料未寫入",
                    **result,
                }
            )

        conn.commit()

    finally:
        cursor.close()
        conn.close()

    # =================================================
    # 6️⃣ 成功回傳（models import 風格）
    # =================================================
    return {
        "message": "匯入完成",
        "fixtures": {
            "imported": result["fixtures"]["imported"],
            "skipped": result["fixtures"]["skipped"],
            "success_rows": compress_rows(
                result["fixtures"]["success_rows"]
            ),
            "skipped_rows": compress_rows(
                result["fixtures"]["skipped_rows"]
            ),
        },
        "errors": [],
    }
