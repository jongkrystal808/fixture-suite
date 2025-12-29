"""
機種 Excel 匯入 Router（乾淨版）
- 僅保留一個 /models/import
- 支援新增 / 更新
- 使用同一 DB connection
- 明確回傳 imported / updated / skipped / errors
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from openpyxl import load_workbook
from io import BytesIO

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/models", tags=["Machine Models Import"])


@router.post("/import", summary="匯入機種（XLSX）")
async def import_models_xlsx(
    customer_id: str = Query(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    # -------------------------------------------------
    # 1️⃣ 基本檢查
    # -------------------------------------------------
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "只接受 .xlsx 檔案")

    content = await file.read()
    wb = load_workbook(BytesIO(content))

    if "models" not in wb.sheetnames:
        raise HTTPException(400, 'XLSX 需包含 "models" 工作表')

    ws = wb["models"]

    # -------------------------------------------------
    # 2️⃣ Header 檢查（彈性）
    # -------------------------------------------------
    header = [str(c.value).strip() if c.value else "" for c in ws[1]]
    required = ["id", "model_name", "note"]

    for col in required:
        if col not in header:
            raise HTTPException(400, f"缺少必要欄位：{col}")

    idx = {name: header.index(name) for name in required}

    # -------------------------------------------------
    # 3️⃣ 初始化
    # -------------------------------------------------
    imported = 0
    updated = 0
    skipped = 0
    errors = []

    conn = db.get_conn()

    try:
        cursor = conn.cursor()

        # -------------------------------------------------
        # 4️⃣ 逐行處理
        # -------------------------------------------------
        for row_no, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                if not row or not row[idx["id"]] or not row[idx["model_name"]]:
                    skipped += 1
                    continue

                model_id = str(row[idx["id"]]).strip()
                model_name = str(row[idx["model_name"]]).strip()
                note = str(row[idx["note"]]).strip() if row[idx["note"]] else ""

                cursor.execute(
                    "SELECT id FROM machine_models WHERE customer_id=%s AND id=%s",
                    (customer_id, model_id)
                )
                exist = cursor.fetchone()

                if exist:
                    cursor.execute(
                        """
                        UPDATE machine_models
                        SET model_name=%s, note=%s
                        WHERE customer_id=%s AND id=%s
                        """,
                        (model_name, note, customer_id, model_id)
                    )
                    updated += 1
                else:
                    cursor.execute(
                        """
                        INSERT INTO machine_models (
                            customer_id, id, model_name, note
                        )
                        VALUES (%s,%s,%s,%s)
                        """,
                        (customer_id, model_id, model_name, note)
                    )
                    imported += 1

            except Exception as e:
                errors.append(f"第 {row_no} 行：{str(e)}")

        conn.commit()

    finally:
        conn.close()

    # -------------------------------------------------
    # 5️⃣ 回傳結果
    # -------------------------------------------------
    return {
        "message": "匯入完成",
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }
