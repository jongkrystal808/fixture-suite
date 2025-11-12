"""
治具管理 API 路由
Fixture Management API Routes

提供治具相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
import traceback

from backend.app.models.fixture import (
    FixtureCreate,
    FixtureUpdate,
    FixtureResponse,
    FixtureWithOwner,
    FixtureListResponse,
    FixtureSimple,
    FixtureStatus_View,
    FixtureStatistics,
    FixtureStatus,
    CycleUnit
)
from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

# 建立路由器
router = APIRouter(
    prefix="/fixtures",
    tags=["治具管理 Fixtures"]
)


# ------------------------- 建立治具 -------------------------
@router.post("", response_model=FixtureResponse, summary="建立治具")
async def create_fixture(
    fixture_data: FixtureCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    建立新治具

    - **fixture_id**: 治具編號 (主鍵)
    - **fixture_name**: 治具名稱
    - **self_purchased_qty**: 自購數量
    - **customer_supplied_qty**: 客供數量
    - **replacement_cycle**: 更換週期
    - **cycle_unit**: 週期單位 (days/uses/none)
    - **status**: 狀態 (正常/返還/報廢)
    - **owner_id**: 負責人 ID

    需要登入
    """
    try:
        # 檢查治具編號是否已存在
        check_query = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        existing = db.execute_query(check_query, (fixture_data.fixture_id,))
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {fixture_data.fixture_id} 已存在"
            )

        # 如果指定了 owner_id，檢查是否存在
        if fixture_data.owner_id:
            owner_check = "SELECT id FROM owners WHERE id = %s"
            owner_exists = db.execute_query(owner_check, (fixture_data.owner_id,))
            if not owner_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"負責人 ID {fixture_data.owner_id} 不存在"
                )

        # 插入治具
        insert_query = """
            INSERT INTO fixtures (
                fixture_id, fixture_name, fixture_type, serial_number,
                self_purchased_qty, customer_supplied_qty, storage_location,
                replacement_cycle, cycle_unit, status, owner_id, note
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        db.execute_update(
            insert_query,
            (
                fixture_data.fixture_id,
                fixture_data.fixture_name,
                fixture_data.fixture_type,
                fixture_data.serial_number,
                fixture_data.self_purchased_qty,
                fixture_data.customer_supplied_qty,
                fixture_data.storage_location,
                fixture_data.replacement_cycle,
                fixture_data.cycle_unit.value if isinstance(fixture_data.cycle_unit, CycleUnit) else fixture_data.cycle_unit,
                fixture_data.status.value if isinstance(fixture_data.status, FixtureStatus) else fixture_data.status,
                fixture_data.owner_id,
                fixture_data.note
            )
        )

        # 回傳剛建立的治具
        return await get_fixture(fixture_data.fixture_id)

    except HTTPException:
        raise
    except Exception as e:
        print("❌ [create_fixture] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"建立治具失敗: {repr(e)}")


# ------------------------- 取得治具詳情 -------------------------
@router.get("/{fixture_id}", response_model=FixtureWithOwner, summary="取得治具詳情")
async def get_fixture(fixture_id: str):
    """
    根據治具編號取得治具詳情

    - **fixture_id**: 治具編號

    回傳治具資訊（含負責人資訊）
    """
    try:
        query = """
            SELECT 
                f.fixture_id,
                f.fixture_name,
                f.fixture_type,
                f.serial_number,
                f.self_purchased_qty,
                f.customer_supplied_qty,
                (f.self_purchased_qty + f.customer_supplied_qty) AS total_qty,
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
            WHERE f.fixture_id = %s
        """
        result = db.execute_query(query, (fixture_id,))
        if not result:
            raise HTTPException(status_code=404, detail=f"治具 {fixture_id} 不存在")

        row = result[0]
        return FixtureWithOwner(
            fixture_id=row["fixture_id"],
            fixture_name=row["fixture_name"],
            fixture_type=row["fixture_type"],
            serial_number=row["serial_number"],
            self_purchased_qty=row["self_purchased_qty"],
            customer_supplied_qty=row["customer_supplied_qty"],
            total_qty=row["total_qty"],
            storage_location=row["storage_location"],
            replacement_cycle=row["replacement_cycle"],
            cycle_unit=row["cycle_unit"],
            status=row["status"],
            last_replacement_date=row["last_replacement_date"],
            last_notification_time=row["last_notification_time"],
            owner_id=row["owner_id"],
            note=row["note"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            owner_name=row["owner_name"],
            owner_email=row["owner_email"]
        )

    except HTTPException:
        raise
    except Exception as e:
        print("❌ [get_fixture] SQL 錯誤:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具失敗: {repr(e)}")


# ------------------------- 查詢治具列表 -------------------------
@router.get("", response_model=FixtureListResponse, summary="查詢治具列表")
async def list_fixtures(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
    status_filter: Optional[FixtureStatus] = Query(None, description="狀態篩選"),
    owner_id: Optional[int] = Query(None, description="負責人 ID 篩選"),
    search: Optional[str] = Query(None, description="搜尋關鍵字 (治具編號或名稱)")
):
    """
    查詢治具列表

    - **skip**: 略過筆數（分頁用）
    - **limit**: 每頁筆數（最多 1000）
    - **status_filter**: 狀態篩選（正常/返還/報廢）
    - **owner_id**: 負責人 ID 篩選
    - **search**: 搜尋關鍵字

    回傳治具列表和總筆數
    """
    try:
        where_conditions = []
        params: List = []

        if status_filter:
            where_conditions.append("f.status = %s")
            params.append(status_filter.value if isinstance(status_filter, FixtureStatus) else status_filter)

        if owner_id is not None:
            where_conditions.append("f.owner_id = %s")
            params.append(owner_id)

        if search:
            where_conditions.append("(f.fixture_id LIKE %s OR f.fixture_name LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like])

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

        # 總筆數
        count_query = f"""
            SELECT COUNT(*) AS total
            FROM fixtures f
            {where_clause}
        """
        count_result = db.execute_query(count_query, tuple(params))
        total = (count_result[0]["total"] if count_result else 0)

        # 資料清單
        query = f"""
            SELECT 
                f.fixture_id,
                f.fixture_name,
                f.fixture_type,
                f.serial_number,
                f.self_purchased_qty,
                f.customer_supplied_qty,
                (f.self_purchased_qty + f.customer_supplied_qty) AS total_qty,
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
            {where_clause}
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """
        params_with_page = list(params) + [limit, skip]
        result = db.execute_query(query, tuple(params_with_page))

        fixtures: List[FixtureWithOwner] = []
        for row in result:
            fixtures.append(FixtureWithOwner(
                fixture_id=row["fixture_id"],
                fixture_name=row["fixture_name"],
                fixture_type=row["fixture_type"],
                serial_number=row["serial_number"],
                self_purchased_qty=row["self_purchased_qty"],
                customer_supplied_qty=row["customer_supplied_qty"],
                total_qty=row["total_qty"],
                storage_location=row["storage_location"],
                replacement_cycle=row["replacement_cycle"],
                cycle_unit=row["cycle_unit"],
                status=row["status"],
                last_replacement_date=row["last_replacement_date"],
                last_notification_time=row["last_notification_time"],
                owner_id=row["owner_id"],
                note=row["note"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                owner_name=row["owner_name"],
                owner_email=row["owner_email"]
            ))

        return FixtureListResponse(total=total, fixtures=fixtures)

    except Exception as e:
        print("❌ [list_fixtures] SQL 查詢錯誤:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具列表失敗: {repr(e)}")


# ------------------------- 更新治具 -------------------------
@router.put("/{fixture_id}", response_model=FixtureWithOwner, summary="更新治具")
async def update_fixture(
    fixture_id: str,
    fixture_data: FixtureUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    更新治具資訊

    - **fixture_id**: 治具編號（URL 參數）

    所有欄位都是可選的，只更新提供的欄位

    需要登入
    """
    try:
        # 檢查治具是否存在
        check_query = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        existing = db.execute_query(check_query, (fixture_id,))
        if not existing:
            raise HTTPException(status_code=404, detail=f"治具 {fixture_id} 不存在")

        # 建立更新語句
        update_fields: List[str] = []
        params: List = []

        if fixture_data.fixture_name is not None:
            update_fields.append("fixture_name = %s")
            params.append(fixture_data.fixture_name)

        if fixture_data.fixture_type is not None:
            update_fields.append("fixture_type = %s")
            params.append(fixture_data.fixture_type)

        if fixture_data.serial_number is not None:
            update_fields.append("serial_number = %s")
            params.append(fixture_data.serial_number)

        if fixture_data.self_purchased_qty is not None:
            update_fields.append("self_purchased_qty = %s")
            params.append(fixture_data.self_purchased_qty)

        if fixture_data.customer_supplied_qty is not None:
            update_fields.append("customer_supplied_qty = %s")
            params.append(fixture_data.customer_supplied_qty)

        if fixture_data.storage_location is not None:
            update_fields.append("storage_location = %s")
            params.append(fixture_data.storage_location)

        if fixture_data.replacement_cycle is not None:
            update_fields.append("replacement_cycle = %s")
            params.append(fixture_data.replacement_cycle)

        if fixture_data.cycle_unit is not None:
            update_fields.append("cycle_unit = %s")
            params.append(fixture_data.cycle_unit.value if isinstance(fixture_data.cycle_unit, CycleUnit) else fixture_data.cycle_unit)

        if fixture_data.status is not None:
            update_fields.append("status = %s")
            params.append(fixture_data.status.value if isinstance(fixture_data.status, FixtureStatus) else fixture_data.status)

        if fixture_data.owner_id is not None:
            # 檢查負責人是否存在
            owner_check = "SELECT id FROM owners WHERE id = %s"
            owner_exists = db.execute_query(owner_check, (fixture_data.owner_id,))
            if not owner_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"負責人 ID {fixture_data.owner_id} 不存在"
                )
            update_fields.append("owner_id = %s")
            params.append(fixture_data.owner_id)

        if fixture_data.note is not None:
            update_fields.append("note = %s")
            params.append(fixture_data.note)

        if not update_fields:
            raise HTTPException(status_code=400, detail="沒有提供要更新的欄位")

        # 執行更新
        update_query = f"""
            UPDATE fixtures
            SET {', '.join(update_fields)}
            WHERE fixture_id = %s
        """
        params.append(fixture_id)
        db.execute_update(update_query, tuple(params))

        # 回傳更新後的治具
        return await get_fixture(fixture_id)

    except HTTPException:
        raise
    except Exception as e:
        print("❌ [update_fixture] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"更新治具失敗: {repr(e)}")


# ------------------------- 刪除治具 -------------------------
@router.delete("/{fixture_id}", summary="刪除治具")
async def delete_fixture(
    fixture_id: str,
    current_admin: dict = Depends(get_current_admin)
):
    """
    刪除治具

    - **fixture_id**: 治具編號

    需要管理員權限

    注意：這會同時刪除關聯的部署、需求、使用記錄、更換記錄等資料
    """
    try:
        # 檢查治具是否存在
        check_query = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        existing = db.execute_query(check_query, (fixture_id,))
        if not existing:
            raise HTTPException(status_code=404, detail=f"治具 {fixture_id} 不存在")

        # 刪除治具（CASCADE 會自動刪除關聯資料）
        delete_query = "DELETE FROM fixtures WHERE fixture_id = %s"
        db.execute_update(delete_query, (fixture_id,))
        return {"message": "治具刪除成功", "fixture_id": fixture_id}

    except HTTPException:
        raise
    except Exception as e:
        print("❌ [delete_fixture] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"刪除治具失敗: {repr(e)}")


# ------------------------- 簡化治具列表（下拉選單） -------------------------
@router.get("/simple/list", response_model=List[FixtureSimple], summary="取得簡化治具列表")
async def get_fixtures_simple(
    status_filter: Optional[FixtureStatus] = Query(None, description="狀態篩選")
):
    """
    取得簡化的治具列表（用於下拉選單等）

    - **status_filter**: 狀態篩選（可選）

    只回傳基本資訊：編號、名稱、總數量、狀態
    """
    try:
        where_clause = ""
        params: List = []

        if status_filter:
            where_clause = "WHERE status = %s"
            params.append(status_filter.value if isinstance(status_filter, FixtureStatus) else status_filter)

        query = f"""
            SELECT 
                fixture_id,
                fixture_name,
                (self_purchased_qty + customer_supplied_qty) AS total_qty,
                status
            FROM fixtures
            {where_clause}
            ORDER BY fixture_id
        """
        result = db.execute_query(query, tuple(params))

        fixtures: List[FixtureSimple] = []
        for row in result:
            fixtures.append(FixtureSimple(
                fixture_id=row["fixture_id"],
                fixture_name=row["fixture_name"],
                total_qty=row["total_qty"],
                status=row["status"]
            ))
        return fixtures

    except Exception as e:
        print("❌ [get_fixtures_simple] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具列表失敗: {repr(e)}")


# ------------------------- 治具狀態總覽（視圖） -------------------------
@router.get("/status/view", response_model=List[FixtureStatus_View], summary="治具狀態總覽")
async def get_fixtures_status_view(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
    replacement_status: Optional[str] = Query(None, description="更換狀態篩選 (需更換/正常)")
):
    """
    查詢治具狀態總覽（使用資料庫視圖）

    包含：
    - 部署站點列表
    - 累計使用次數
    - 更換狀態判斷
    - 負責人資訊

    - **skip**: 略過筆數
    - **limit**: 每頁筆數
    - **replacement_status**: 更換狀態篩選
    """
    try:
        where_clause = ""
        params: List = []

        if replacement_status:
            where_clause = "WHERE replacement_status = %s"
            params.append(replacement_status)

        query = f"""
            SELECT 
                fixture_id,
                fixture_name,
                serial_number,
                storage_location,
                status,
                deployed_stations,
                total_uses,
                last_replacement_date,
                last_notification_time,
                replacement_cycle,
                cycle_unit,
                replacement_status,
                owner,
                note
            FROM view_fixture_status
            {where_clause}
            ORDER BY fixture_id
            LIMIT %s OFFSET %s
        """
        params_with_page = list(params) + [limit, skip]
        result = db.execute_query(query, tuple(params_with_page))

        fixtures: List[FixtureStatus_View] = []
        for row in result:
            fixtures.append(FixtureStatus_View(
                fixture_id=row["fixture_id"],
                fixture_name=row["fixture_name"],
                serial_number=row["serial_number"],
                storage_location=row["storage_location"],
                status=row["status"],
                deployed_stations=row["deployed_stations"],
                total_uses=row["total_uses"],
                last_replacement_date=row["last_replacement_date"],
                last_notification_time=row["last_notification_time"],
                replacement_cycle=row["replacement_cycle"],
                cycle_unit=row["cycle_unit"],
                replacement_status=row["replacement_status"],
                owner=row["owner"],
                note=row["note"]
            ))
        return fixtures

    except Exception as e:
        print("❌ [get_fixtures_status_view] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具狀態失敗: {repr(e)}")


# ------------------------- 治具統計摘要 -------------------------
@router.get("/statistics/summary", response_model=FixtureStatistics, summary="治具統計摘要")
async def get_fixtures_statistics():
    """
    取得治具統計摘要

    包含：
    - 治具總數
    - 各狀態治具數
    - 需要更換的治具數
    - 總數量統計
    """
    try:
        # 基本統計
        query = """
            SELECT 
                COUNT(*) AS total_fixtures,
                SUM(CASE WHEN status = '正常' THEN 1 ELSE 0 END) AS active_fixtures,
                SUM(CASE WHEN status = '返還' THEN 1 ELSE 0 END) AS returned_fixtures,
                SUM(CASE WHEN status = '報廢' THEN 1 ELSE 0 END) AS scrapped_fixtures,
                SUM(self_purchased_qty + customer_supplied_qty) AS total_quantity,
                SUM(self_purchased_qty) AS self_purchased_total,
                SUM(customer_supplied_qty) AS customer_supplied_total
            FROM fixtures
        """
        result = db.execute_query(query)
        row = result[0] if result else {}

        # 需要更換的治具數（從視圖查詢）
        need_replacement_query = """
            SELECT COUNT(*) AS need_replacement
            FROM view_fixture_status
            WHERE replacement_status = '需更換'
        """
        need_replacement_result = db.execute_query(need_replacement_query)
        need_replacement = need_replacement_result[0]["need_replacement"] if need_replacement_result else 0

        return FixtureStatistics(
            total_fixtures=row.get("total_fixtures", 0) or 0,
            active_fixtures=row.get("active_fixtures", 0) or 0,
            returned_fixtures=row.get("returned_fixtures", 0) or 0,
            scrapped_fixtures=row.get("scrapped_fixtures", 0) or 0,
            need_replacement=need_replacement or 0,
            total_quantity=row.get("total_quantity", 0) or 0,
            self_purchased_total=row.get("self_purchased_total", 0) or 0,
            customer_supplied_total=row.get("customer_supplied_total", 0) or 0
        )

    except Exception as e:
        print("❌ [get_fixtures_statistics] 失敗:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢統計資料失敗: {repr(e)}")
