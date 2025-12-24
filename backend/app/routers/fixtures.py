from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional, List
import traceback
from openpyxl import Workbook, load_workbook
from io import BytesIO
from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.models.fixture import (
    FixtureCreate,
    FixtureUpdate,
    FixtureResponse,
    FixtureListResponse,
    FixtureSimple,
    FixtureStatus_View,
    FixtureStatistics,
    FixtureStatus,
    CycleUnit
)
from enum import Enum

class FixtureStatus(str, Enum):
    normal = "normal"
    returned = "returned"
    scrapped = "scrapped"

router = APIRouter(
    prefix="/fixtures",
    tags=["治具管理 Fixtures"]
)

# ============================================================
# ⭐ 重要：所有具體路徑必須在動態路徑 /{fixture_id} 之前定義
# ============================================================


# ============================================================
# 🔍 治具模糊搜尋（必須在 /{fixture_id} 之前）
# ============================================================
@router.get("/search", summary="治具模糊搜尋（for Modal / Stage）")
async def search_fixtures(
    customer_id: str = Query(...),
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=50),
    user=Depends(get_current_user)
):
    try:
        rows = db.execute_query(
            """
            SELECT id AS fixture_id, fixture_name
            FROM fixtures
            WHERE customer_id = %s
              AND LOWER(id) LIKE LOWER(%s)
            ORDER BY id
            LIMIT %s
            """,
            (customer_id, f"%{q}%", limit)
        )

        # 🔥 重點：搜尋「找不到」不是錯誤
        return rows or []

    except HTTPException:
        # 🔥 不要包 HTTPException
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"查詢治具失敗: {str(e)}"
        )


# ============================================================
# 📊 統計摘要（必須在 /{fixture_id} 之前）
# ============================================================
@router.get(
    "/statistics/summary",
    response_model=FixtureStatistics,
    summary="治具統計摘要"
)
async def fixture_statistics(customer_id: str = Query(...)):
    try:
        sql = """
            SELECT
                COUNT(*) AS total_fixtures,

                -- ⭐ 真正的總可用庫存
                SUM(available_qty) AS total_available_qty,

                SUM(deployed_qty) AS deployed_qty,
                SUM(maintenance_qty) AS maintenance_qty,
                SUM(scrapped_qty) AS scrapped_qty,
                SUM(returned_qty) AS returned_qty,

                SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) AS active_fixtures,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) AS returned_fixtures,
                SUM(CASE WHEN status = 'scrapped' THEN 1 ELSE 0 END) AS scrapped_fixtures
            FROM fixtures
            WHERE customer_id = %s
        """

        row = db.execute_query(sql, (customer_id,))[0]

        return {
            "total_fixtures": row["total_fixtures"],

            # ⭐ 關鍵：補這個（FastAPI 要的）
            "available_qty": row["total_available_qty"] or 0,

            "total_available_qty": row["total_available_qty"] or 0,
            "deployed_qty": row["deployed_qty"] or 0,
            "maintenance_qty": row["maintenance_qty"] or 0,
            "scrapped_qty": row["scrapped_qty"] or 0,
            "returned_qty": row["returned_qty"] or 0,
            "active_fixtures": row["active_fixtures"] or 0,
            "returned_fixtures": row["returned_fixtures"] or 0,
            "scrapped_fixtures": row["scrapped_fixtures"] or 0,
        }


    except Exception as e:
        print("❌ [fixture_statistics] ERROR:\n", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"查詢統計資料失敗: {repr(e)}"
        )



# ============================================================
# 📊 治具狀態總覽（必須在 /{fixture_id} 之前）
# ============================================================
@router.get("/status/view", response_model=List[FixtureStatus_View], summary="治具狀態總覽")
async def fixture_status_view(
    customer_id: str = Query(...),
    skip: int = 0,
    limit: int = 100
):
    try:
        sql = """
            SELECT *
            FROM view_fixture_status
            WHERE customer_id = %s
            ORDER BY fixture_id
            LIMIT %s OFFSET %s
        """
        rows = db.execute_query(sql, (customer_id, limit, skip))
        return [FixtureStatus_View(**row) for row in rows]

    except Exception as e:
        print("❌ [fixture_status_view] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具狀態失敗: {repr(e)}")


# ============================================================
# 📋 簡化治具列表（必須在 /{fixture_id} 之前）
# ============================================================
@router.get(
    "/simple/list",
    response_model=List[FixtureSimple],
    summary="簡化治具列表"
)
async def simple_fixture_list(customer_id: str = Query(...)):
    try:
        sql = """
            SELECT
                id AS fixture_id,
                fixture_name,

                -- ⭐ 單一真相來源
                available_qty AS total_qty,

                status
            FROM fixtures
            WHERE customer_id = %s
            ORDER BY id
        """
        rows = db.execute_query(sql, (customer_id,))
        return [FixtureSimple(**row) for row in rows]

    except Exception as e:
        print("❌ [simple_fixture_list] ERROR:\n", traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"查詢簡化治具列表失敗: {repr(e)}"
        )



# ============================================================
# 📥 下載治具匯入樣本（必須在 /{fixture_id} 之前）
# ============================================================
@router.get("/template", summary="下載治具匯入樣本（XLSX）")
async def download_fixtures_template(
    user=Depends(get_current_user)
):
    wb = Workbook()
    ws = wb.active
    ws.title = "fixtures"

    ws.append([
        "id",
        "fixture_name",
        "fixture_type",
        "storage_location",
        "replacement_cycle",
        "cycle_unit",
        "status",
        "note",
    ])

    ws.append([
        "FX-001",
        "治具範例一",
        "ICT",
        "A01",
        1000,
        "uses",
        "正常",
        "備註示例",
    ])
    ws.append([
        "FX-002",
        "治具範例二",
        "",
        "",
        "",
        "none",
        "正常",
        "",
    ])

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
            'attachment; filename="fixtures_import_template.xlsx"'
        }
    )


# ============================================================
# 📤 匯出治具（必須在 /{fixture_id} 之前）
# ============================================================
@router.get("/export", summary="匯出治具（XLSX）")
async def export_fixtures_xlsx(
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT
            id,
            fixture_name,
            fixture_type,
            storage_location,
            replacement_cycle,
            cycle_unit,
            status,
            note
        FROM fixtures
        WHERE customer_id = %s
        ORDER BY id
        """,
        (customer_id,)
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "fixtures"

    ws.append([
        "id",
        "fixture_name",
        "fixture_type",
        "storage_location",
        "replacement_cycle",
        "cycle_unit",
        "status",
        "note",
    ])

    for r in rows:
        ws.append([
            r["id"],
            r.get("fixture_name", ""),
            r.get("fixture_type", ""),
            r.get("storage_location", ""),
            r.get("replacement_cycle", ""),
            r.get("cycle_unit", ""),
            r.get("status", ""),
            r.get("note", ""),
        ])

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
            f'attachment; filename="fixtures_{customer_id}.xlsx"'
        }
    )


# ============================================================
# 📥 匯入治具（必須在 /{fixture_id} 之前）
# ============================================================
@router.post("/import", summary="匯入治具（XLSX）")
async def import_fixtures_xlsx(
    customer_id: str = Query(...),
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
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

    header = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
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

    if header[:len(required)] != required:
        raise HTTPException(
            status_code=400,
            detail=f"欄位錯誤，前 {len(required)} 欄必須是：{required}"
        )

    imported = 0
    updated = 0
    skipped = 0

    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not row[0] or not row[1]:
            skipped += 1
            continue

        fixture_id = str(row[0]).strip()
        fixture_name = str(row[1]).strip()

        fixture_type = row[2] or ""
        storage_location = row[3] or ""
        replacement_cycle = row[4]
        cycle_unit = row[5] or "uses"
        status = row[6] or "正常"
        note = row[7] or ""

        exist = db.execute_query(
            "SELECT id FROM fixtures WHERE customer_id=%s AND id=%s",
            (customer_id, fixture_id)
        )

        if exist:
            db.execute_update(
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
            db.execute_update(
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
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
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

    return {
        "message": "匯入完成",
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
    }


# ============================================================
# ⚠️ 以下是動態路徑，必須放在所有具體路徑之後
# ============================================================


# ============================================================
# 建立治具 (CREATE)
# ============================================================
@router.post("", response_model=FixtureResponse, summary="建立新治具")
async def create_fixture(
    data: FixtureCreate,
    customer_id: str = Query(..., description="客戶 ID"),
    current_user: dict = Depends(get_current_user)
):
    try:
        # -------------------------------------------------
        # 1️⃣ 檢查客戶存在
        # -------------------------------------------------
        customer_check = "SELECT id FROM customers WHERE id = %s"
        if not db.execute_query(customer_check, (customer_id,)):
            raise HTTPException(status_code=400, detail="客戶不存在")

        # -------------------------------------------------
        # 2️⃣ 檢查治具是否重複（同客戶）
        # -------------------------------------------------
        exist_check = """
            SELECT id FROM fixtures
            WHERE id = %s AND customer_id = %s
        """
        if db.execute_query(exist_check, (data.fixture_id, customer_id)):
            raise HTTPException(
                status_code=400,
                detail=f"治具 {data.fixture_id} 已存在於客戶 {customer_id} 下"
            )

        # -------------------------------------------------
        # 3️⃣ 插入新治具
        # -------------------------------------------------
        insert_sql = """
            INSERT INTO fixtures (
                id,
                customer_id,
                fixture_name,
                fixture_type,
                serial_number,
                self_purchased_qty,
                customer_supplied_qty,
                available_qty,
                deployed_qty,
                maintenance_qty,
                scrapped_qty,
                returned_qty,
                storage_location,
                replacement_cycle,
                cycle_unit,
                status,
                owner_id,
                note
            ) VALUES (
                %s, %s, %s, %s,
                %s,
                %s, %s,
                0, 0, 0, 0, 0,
                %s,
                %s, %s,
                %s,
                %s,
                %s
            )
        """

        params = (
            data.fixture_id,
            customer_id,
            data.fixture_name,
            data.fixture_type,
            data.serial_number,
            data.self_purchased_qty,
            data.customer_supplied_qty,
            data.storage_location,
            data.replacement_cycle,
            data.cycle_unit.value if isinstance(data.cycle_unit, CycleUnit) else data.cycle_unit,
            data.status.value if isinstance(data.status, FixtureStatus) else data.status,
            data.owner_id,
            data.note
        )

        db.execute_update(insert_sql, params)

        # -------------------------------------------------
        # 4️⃣ 回傳剛建立的治具
        # -------------------------------------------------
        return await get_fixture(data.fixture_id, customer_id)

    except Exception as e:
        print("❌ [create_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"建立治具失敗: {repr(e)}")


# ============================================================
# 取得治具詳情 (READ) - 動態路徑
# ============================================================
@router.get("/{fixture_id}", response_model=FixtureResponse, summary="取得治具詳情")
async def get_fixture(
    fixture_id: str,
    customer_id: str = Query(..., description="客戶 ID")
):
    try:
        sql = """
            SELECT
                f.id AS fixture_id,
                f.customer_id,
                f.fixture_name,
                f.fixture_type,
                f.serial_number,
                f.self_purchased_qty,
                f.customer_supplied_qty,
                f.available_qty,
                f.deployed_qty,
                f.maintenance_qty,
                f.scrapped_qty,
                f.returned_qty,
                f.storage_location,
                f.replacement_cycle,
                f.cycle_unit,
                f.status,
                f.last_replacement_date,
                f.last_notification_time,
                f.owner_id,
                f.note,
                f.created_at,
                f.updated_at,
                o.primary_owner AS owner_name,
                o.email AS owner_email
            FROM fixtures f
            LEFT JOIN owners o ON f.owner_id = o.id
            WHERE f.id = %s AND f.customer_id = %s
        """

        result = db.execute_query(sql, (fixture_id, customer_id))
        if not result:
            raise HTTPException(status_code=404, detail="治具不存在")

        return FixtureResponse(**result[0])

    except Exception as e:
        print("❌ [get_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具失敗: {repr(e)}")


# ============================================================
# 取得治具完整詳細資料 (DETAIL) - 動態路徑
# ============================================================
@router.get("/{fixture_id}/detail", summary="取得治具完整詳細資料")
async def get_fixture_detail(
    fixture_id: str,
    customer_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        # ---------------------------
        # 1) 基本資料
        # ---------------------------
        fixture_sql = """
            SELECT
                f.id AS fixture_id,
                f.customer_id,
                f.fixture_name,
                f.fixture_type,
                f.serial_number,
                f.self_purchased_qty,
                f.customer_supplied_qty,
                f.available_qty,
                f.deployed_qty,
                f.maintenance_qty,
                f.scrapped_qty,
                f.returned_qty,
                f.storage_location,
                f.replacement_cycle,
                f.cycle_unit,
                f.status,
                f.last_replacement_date,
                f.last_notification_time,
                f.owner_id,
                o.primary_owner AS owner_name,
                o.email AS owner_email,
                f.note,
                f.created_at,
                f.updated_at
            FROM fixtures f
            LEFT JOIN owners o ON f.owner_id = o.id
            WHERE f.id = %s AND f.customer_id = %s
            LIMIT 1
        """

        fixture_rows = db.execute_query(fixture_sql, (fixture_id, customer_id))
        if not fixture_rows:
            raise HTTPException(status_code=404, detail="治具不存在")
        fixture = fixture_rows[0]

        # ---------------------------
        # 2) 收料最新紀錄
        # ---------------------------
        last_receipt_sql = """
            SELECT id, transaction_date, order_no, operator, note
            FROM material_transactions
            WHERE fixture_id = %s AND customer_id = %s AND transaction_type = 'receipt'
            ORDER BY transaction_date DESC, id DESC
            LIMIT 1
        """
        last_receipt = db.execute_query(last_receipt_sql, (fixture_id, customer_id))
        last_receipt = last_receipt[0] if last_receipt else None

        # ---------------------------
        # 3) 退料最新紀錄
        # ---------------------------
        last_return_sql = """
            SELECT id, transaction_date, order_no, operator, note
            FROM material_transactions
            WHERE fixture_id = %s AND customer_id = %s AND transaction_type = 'return'
            ORDER BY transaction_date DESC, id DESC
            LIMIT 1
        """
        last_return = db.execute_query(last_return_sql, (fixture_id, customer_id))
        last_return = last_return[0] if last_return else None

        # ---------------------------
        # 4) 使用紀錄 usage_logs（最新100筆）
        # ---------------------------
        usage_sql = """
            SELECT id, used_at, station_id, operator, note
            FROM usage_logs
            WHERE fixture_id = %s AND customer_id = %s
            ORDER BY used_at DESC
            LIMIT 100
        """
        usage_logs = db.execute_query(usage_sql, (fixture_id, customer_id))

        # ---------------------------
        # 5) 更換紀錄 replacement_logs
        # ---------------------------
        replacement_sql = """
            SELECT id, replacement_date, reason, executor, note
            FROM replacement_logs
            WHERE fixture_id = %s AND customer_id = %s
            ORDER BY replacement_date DESC
            LIMIT 100
        """
        replacement_logs = db.execute_query(replacement_sql, (fixture_id, customer_id))

        # ---------------------------
        # 6) 序號明細 fixture_serials
        # ---------------------------
        serial_sql = """
            SELECT id, serial_number, source_type, status, current_station_id,
                   receipt_date, last_use_date, total_uses
            FROM fixture_serials
            WHERE fixture_id = %s AND customer_id = %s
            ORDER BY serial_number
        """
        serials = db.execute_query(serial_sql, (fixture_id, customer_id))

        # ---------------------------
        # 7) 統一回傳資料
        # ---------------------------
        return {
            "fixture": fixture,
            "serials": serials,
            "last_receipt": last_receipt,
            "last_return": last_return,
            "usage_logs": usage_logs,
            "replacement_logs": replacement_logs
        }

    except Exception as e:
        print("❌ [get_fixture_detail] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具詳細資料失敗: {repr(e)}")


# ============================================================
# 查詢治具列表 (LIST)
# ============================================================
@router.get("", summary="查詢治具列表")
async def list_fixtures(
    customer_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(8, ge=1, le=200),

    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),

    current_user: dict = Depends(get_current_user)
):
    try:
        # -----------------------------
        #   組 WHERE 條件
        # -----------------------------
        where = ["f.customer_id = %s"]
        params = [customer_id]

        if search:
            like = f"%{search}%"
            where.append("(f.id LIKE %s OR f.fixture_name LIKE %s)")
            params.extend([like, like])

        if status_filter:
            where.append("f.status = %s")
            params.append(status_filter)

        if owner_id:
            where.append("f.owner_id = %s")
            params.append(owner_id)

        where_sql = " AND ".join(where)

        # -----------------------------
        #   查詢總筆數
        # -----------------------------
        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM fixtures f
            WHERE {where_sql}
        """
        total_row = db.execute_query(count_sql, tuple(params))
        total = total_row[0]["total"]

        # -----------------------------
        #   查詢資料列
        # -----------------------------
        list_sql = f"""
            SELECT
                f.id AS fixture_id,
                f.customer_id,
                f.fixture_name,
                f.fixture_type,

                f.self_purchased_qty,
                f.customer_supplied_qty,
                f.available_qty,
                f.deployed_qty,
                f.maintenance_qty,
                f.scrapped_qty,
                f.returned_qty,

                f.storage_location,
                f.replacement_cycle,
                f.cycle_unit,

                f.status,
                f.owner_id,
                f.note,
                f.created_at,
                f.updated_at,

                o.primary_owner AS owner_name,
                o.email AS owner_email

            FROM fixtures f
            LEFT JOIN owners o ON f.owner_id = o.id
            WHERE {where_sql}
            ORDER BY f.id
            LIMIT %s OFFSET %s
        """

        final_params = params + [limit, skip]
        rows = db.execute_query(list_sql, tuple(final_params))

        return {
            "total": total,
            "fixtures": rows
        }

    except Exception as e:
        raise HTTPException(500, f"查詢治具列表失敗: {e}")


# ============================================================
# 更新治具 (UPDATE) - 動態路徑
# ============================================================
@router.put("/{fixture_id}", response_model=FixtureResponse, summary="更新治具")
async def update_fixture(
    fixture_id: str,
    data: FixtureUpdate,
    customer_id: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        # 確認存在
        exist_sql = """
            SELECT id FROM fixtures
            WHERE id = %s AND customer_id = %s
        """
        if not db.execute_query(exist_sql, (fixture_id, customer_id)):
            raise HTTPException(status_code=404, detail="治具不存在")

        update_fields = []
        params = []

        for field, value in data.dict(exclude_unset=True).items():
            update_fields.append(f"{field} = %s")
            params.append(value)

        if not update_fields:
            raise HTTPException(status_code=400, detail="沒有要更新的欄位")

        params.append(fixture_id)
        params.append(customer_id)

        update_sql = f"""
            UPDATE fixtures
            SET {', '.join(update_fields)}
            WHERE id = %s AND customer_id = %s
        """

        db.execute_update(update_sql, tuple(params))

        # 回傳更新後資料
        return await get_fixture(fixture_id, customer_id)

    except Exception as e:
        print("❌ [update_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"更新治具失敗: {repr(e)}")


# ============================================================
# 刪除治具 (DELETE) - 動態路徑
# ============================================================
@router.delete("/{fixture_id}", summary="刪除治具")
async def delete_fixture(
    fixture_id: str,
    customer_id: str = Query(...),
    admin: dict = Depends(get_current_admin)
):
    try:
        sql = """
            DELETE FROM fixtures
            WHERE id = %s AND customer_id = %s
        """
        affected = db.execute_update(sql, (fixture_id, customer_id))

        if affected == 0:
            raise HTTPException(status_code=404, detail="治具不存在")

        return {"message": "刪除成功", "fixture_id": fixture_id}

    except Exception as e:
        print("❌ [delete_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"刪除治具失敗: {repr(e)}")