"""
治具管理 API (v3.0 完整版本)
Fixtures API (Aligned with DB v3.0 Schema)

所有邏輯皆完全對應資料庫 v3.0：
- 使用 id + customer_id 主鍵
- 所有數量欄位：available/deployed/maintenance/scrapped/returned_qty
- 不再使用序號欄位，由 fixture_serials 管理
- 所有查詢需強制提供 customer_id（多客戶隔離）
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
import traceback

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_admin

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

router = APIRouter(
    prefix="/fixtures",
    tags=["治具管理 Fixtures"]
)

# ============================================================
# 建立治具 (CREATE)
# ============================================================

@router.post("", response_model=FixtureResponse, summary="建立新治具")
async def create_fixture(
    data: FixtureCreate,
    current_user: dict = Depends(get_current_user)
):
    try:
        # 檢查客戶存在
        customer_check = "SELECT id FROM customers WHERE id = %s"
        if not db.execute_query(customer_check, (data.customer_id,)):
            raise HTTPException(status_code=400, detail="客戶不存在")

        # 檢查治具是否重複（同客戶）
        exist_check = """
            SELECT id FROM fixtures
            WHERE id = %s AND customer_id = %s
        """
        if db.execute_query(exist_check, (data.id, data.customer_id)):
            raise HTTPException(
                status_code=400,
                detail=f"治具 {data.id} 已存在於客戶 {data.customer_id} 下"
            )

        # 插入新治具（v3.0 欄位）
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
            data.id,
            data.customer_id,
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

        # 回傳剛建立的治具
        return await get_fixture(data.id, data.customer_id)

    except Exception as e:
        print("❌ [create_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"建立治具失敗: {repr(e)}")


# ============================================================
# 取得治具詳情 (READ)
# ============================================================

@router.get("/{fixture_id}", response_model=FixtureWithOwner, summary="取得治具詳情")
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

        return FixtureWithOwner(**result[0])

    except Exception as e:
        print("❌ [get_fixture] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具失敗: {repr(e)}")


# ============================================================
# 查詢治具列表 (LIST)
# ============================================================

@router.get("", response_model=FixtureListResponse, summary="查詢治具列表")
async def list_fixtures(
    customer_id: str = Query(..., description="客戶 ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status_filter: Optional[FixtureStatus] = None,
    owner_id: Optional[int] = None,
    search: Optional[str] = None
):
    try:
        where = ["f.customer_id = %s"]
        params = [customer_id]

        if status_filter:
            where.append("f.status = %s")
            params.append(
                status_filter.value if isinstance(status_filter, FixtureStatus) else status_filter
            )

        if owner_id:
            where.append("f.owner_id = %s")
            params.append(owner_id)

        if search:
            where.append("(f.id LIKE %s OR f.fixture_name LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like])

        where_sql = " AND ".join(where)

        # 查詢總數
        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM fixtures f
            WHERE {where_sql}
        """
        total = db.execute_query(count_sql, tuple(params))[0]["total"]

        # 查詢列表
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
            ORDER BY f.created_at DESC
            LIMIT %s OFFSET %s
        """

        final_params = params + [limit, skip]
        rows = db.execute_query(list_sql, tuple(final_params))

        return FixtureListResponse(
            total=total,
            fixtures=[FixtureWithOwner(**row) for row in rows]
        )

    except Exception as e:
        print("❌ [list_fixtures] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢治具列表失敗: {repr(e)}")


# ============================================================
# 更新治具 (UPDATE)
# ============================================================

@router.put("/{fixture_id}", response_model=FixtureWithOwner, summary="更新治具")
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
# 刪除治具 (DELETE)
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


# ============================================================
# 簡化治具列表 (DROPDOWN)
# ============================================================

@router.get("/simple/list", response_model=List[FixtureSimple], summary="簡化治具列表")
async def simple_fixture_list(customer_id: str = Query(...)):
    try:
        sql = """
            SELECT
                id AS fixture_id,
                fixture_name,
                (self_purchased_qty + customer_supplied_qty) AS total_qty,
                status
            FROM fixtures
            WHERE customer_id = %s
            ORDER BY id
        """
        rows = db.execute_query(sql, (customer_id,))
        return [FixtureSimple(**row) for row in rows]

    except Exception as e:
        print("❌ [simple_fixture_list] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢簡化治具列表失敗: {repr(e)}")


# ============================================================
# 治具狀態總覽 (VIEW)
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
# 統計摘要
# ============================================================

@router.get("/statistics/summary", response_model=FixtureStatistics, summary="治具統計摘要")
async def fixture_statistics(customer_id: str = Query(...)):
    try:
        sql = """
            SELECT
                COUNT(*) AS total_fixtures,
                SUM(self_purchased_qty + customer_supplied_qty) AS total_quantity,
                SUM(available_qty) AS available_qty,
                SUM(deployed_qty) AS deployed_qty,
                SUM(maintenance_qty) AS maintenance_qty,
                SUM(scrapped_qty) AS scrapped_qty,
                SUM(returned_qty) AS returned_qty,
                SUM(CASE WHEN status = '正常' THEN 1 ELSE 0 END) AS active_fixtures,
                SUM(CASE WHEN status = '返還' THEN 1 ELSE 0 END) AS returned_fixtures,
                SUM(CASE WHEN status = '報廢' THEN 1 ELSE 0 END) AS scrapped_fixtures
            FROM fixtures
            WHERE customer_id = %s
        """

        row = db.execute_query(sql, (customer_id,))[0]

        return FixtureStatistics(**row)

    except Exception as e:
        print("❌ [fixture_statistics] ERROR:\n", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"查詢統計資料失敗: {repr(e)}")
