"""
治具 Excel 匯入 Router（乾淨版）
- 僅保留一個 /fixtures/import
- 支援新增 / 更新
- 使用同一 DB connection
- 明確回傳 imported / updated / skipped / errors
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from openpyxl import load_workbook
from io import BytesIO

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/fixtures", tags=["Fixtures Import"])


@router.post("/import", summary="匯入治具（XLSX）")
async def import_fixtures_xlsx(
    customer_id: str = Query(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
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
    # 2️⃣ Header 檢查（彈性但完整）
    # =================================================
    header = [str(c.value).strip() if c.value else "" for c in ws[1]]
    required = [
        "id",
        "fixture_name",
        "fixture_type",
        "storage_location",
        "replacement_cycle",
        "cycle_unit",
        "status",
        "note",
    ]

    for col in required:
        if col not in header:
            raise HTTPException(
                status_code=400,
                detail=f"缺少必要欄位：{col}"
            )

    idx = {name: header.index(name) for name in required}

    # =================================================
    # 3️⃣ 初始化
    # =================================================
    imported = 0
    updated = 0
    skipped = 0
    errors = []

    conn = db.get_conn()

    try:
        cursor = conn.cursor()

        # =================================================
        # 4️⃣ 逐行處理
        # =================================================
        for row_no, row in enumerate(
            ws.iter_rows(min_row=2, values_only=True),
            start=2
        ):
            try:
                if not row or not row[idx["id"]] or not row[idx["fixture_name"]]:
                    skipped += 1
                    continue

                fixture_id = str(row[idx["id"]]).strip()
                fixture_name = str(row[idx["fixture_name"]]).strip()

                fixture_type = row[idx["fixture_type"]] or ""
                storage_location = row[idx["storage_location"]] or ""
                replacement_cycle = row[idx["replacement_cycle"]]
                cycle_unit = row[idx["cycle_unit"]] or "uses"
                note = row[idx["note"]] or ""

                raw_status = str(row[idx["status"]] or "").strip().lower()
                status_map = {
                    "normal": "normal",
                    "returned": "returned",
                    "scrapped": "scrapped",
                    "正常": "normal",
                    "返還": "returned",
                    "報廢": "scrapped",
                }

                status = status_map.get(raw_status)
                if not status:
                    errors.append(f"第 {row_no} 行：status 不合法")
                    continue

                # -----------------------------
                # 檢查是否存在
                # -----------------------------
                cursor.execute(
                    "SELECT id FROM fixtures WHERE customer_id=%s AND id=%s",
                    (customer_id, fixture_id)
                )
                exist = cursor.fetchone()

                # -----------------------------
                # 更新 or 新增
                # -----------------------------
                if exist:
                    cursor.execute(
                        """
                        UPDATE fixtures
                        SET
                            fixture_name=%s,
                            fixture_type=%s,
                            storage_location=%s,
                            replacement_cycle=%s,
                            cycle_unit=%s,
                            status=%s,
                            note=%s
                        WHERE customer_id=%s AND id=%s
                        """,
                        (
                            fixture_name,
                            fixture_type,
                            storage_location,
                            replacement_cycle,
                            cycle_unit,
                            status,
                            note,
                            customer_id,
                            fixture_id,
                        )
                    )
                    updated += 1
                else:
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
                            status,
                            note
                        )
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        """,
                        (
                            customer_id,
                            fixture_id,
                            fixture_name,
                            fixture_type,
                            storage_location,
                            replacement_cycle,
                            cycle_unit,
                            status,
                            note,
                        )
                    )
                    imported += 1

            except Exception as e:
                errors.append(f"第 {row_no} 行：{str(e)}")

        # =================================================
        # 5️⃣ Commit（一定在 try 裡）
        # =================================================
        conn.commit()

    finally:
        # =================================================
        # 6️⃣ 關閉連線（一定會執行）
        # =================================================
        conn.close()

    # =================================================
    # 7️⃣ 回傳結果
    # =================================================
    return {
        "message": "匯入完成",
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
