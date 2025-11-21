"""
治具需求 API (v3.0)
Fixture Requirements API

對應資料表: fixture_requirements
四鍵唯一:
customer_id + model_id + station_id + fixture_id
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List
from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

from backend.app.models.fixture_requirement import (
    FixtureRequirementCreate,
    FixtureRequirementUpdate,
    FixtureRequirementResponse
)

router = APIRouter(
    prefix="/fixture-requirements",
    tags=["治具需求 Fixture Requirements"]
)


# ============================================================
# 工具：確認資料存在 (且同客戶)
# ============================================================

def ensure_model_exists(model_id: str, customer_id: str):
    rows = db.execute_query(
        """
        SELECT id FROM machine_models
        WHERE id=%s AND customer_id=%s
        """,
        (model_id, customer_id),
    )
    if not rows:
        raise HTTPException(404, "機種不存在或不屬於該客戶")


def ensure_station_exists(station_id: str, customer_id: str):
    rows = db.execute_query(
        """
        SELECT id FROM stations
        WHERE id=%s AND customer_id=%s
        """,
        (station_id, customer_id),
    )
    if not rows:
        raise HTTPException(404, "站點不存在或不屬於該客戶")


def ensure_fixture_exists(fixture_id: str, customer_id: str):
    rows = db.execute_query(
        """
        SELECT id FROM fixtures
        WHERE id=%s AND customer_id=%s
        """,
        (fixture_id, customer_id),
    )
    if not rows:
        raise HTTPException(404, "治具不存在或不屬於該客戶")


# ============================================================
# 1️⃣ 取得該客戶 + 機種 + 站點的治具需求清單
# ============================================================

@router.get(
    "",
    response_model=List[FixtureRequirementResponse],
    summary="查詢治具需求 (依 customer + model + station)"
)
async def list_requirements(
    customer_id: str = Query(...),
    model_id: str = Query(...),
    station_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    ensure_model_exists(model_id, customer_id)
    ensure_station_exists(station_id, customer_id)

    sql = """
        SELECT
            fr.id,
            fr.customer_id,
            fr.model_id,
            fr.station_id,
            fr.fixture_id,
            fr.required_qty,
            fr.note,
            fr.created_at,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id = f.id
           AND fr.customer_id = f.customer_id
        WHERE fr.customer_id=%s
          AND fr.model_id=%s
          AND fr.station_id=%s
        ORDER BY fr.fixture_id
    """

    rows = db.execute_query(sql, (customer_id, model_id, station_id))
    return [FixtureRequirementResponse(**row) for row in rows]


# ============================================================
# 2️⃣ 新增治具需求
# ============================================================

@router.post(
    "",
    response_model=FixtureRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增治具需求"
)
async def create_requirement(
    data: FixtureRequirementCreate,
    current_admin=Depends(get_current_admin)
):
    ensure_model_exists(data.model_id, data.customer_id)
    ensure_station_exists(data.station_id, data.customer_id)
    ensure_fixture_exists(data.fixture_id, data.customer_id)

    # 四鍵唯一判斷
    exists = db.execute_query(
        """
        SELECT id FROM fixture_requirements
        WHERE customer_id=%s
          AND model_id=%s
          AND station_id=%s
          AND fixture_id=%s
        """,
        (data.customer_id, data.model_id, data.station_id, data.fixture_id),
    )
    if exists:
        raise HTTPException(400, "此治具需求已存在")

    # 新增資料
    db.execute_update(
        """
        INSERT INTO fixture_requirements
            (customer_id, model_id, station_id, fixture_id, required_qty, note)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            data.customer_id,
            data.model_id,
            data.station_id,
            data.fixture_id,
            data.required_qty,
            data.note,
        )
    )

    # 回查新增資料
    row = db.execute_query(
        """
        SELECT
            fr.id,
            fr.customer_id,
            fr.model_id,
            fr.station_id,
            fr.fixture_id,
            fr.required_qty,
            fr.note,
            fr.created_at,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id=f.id
           AND fr.customer_id=f.customer_id
        WHERE fr.customer_id=%s
          AND fr.model_id=%s
          AND fr.station_id=%s
          AND fr.fixture_id=%s
        """,
        (data.customer_id, data.model_id, data.station_id, data.fixture_id)
    )[0]

    return FixtureRequirementResponse(**row)


# ============================================================
# 3️⃣ 更新治具需求
# ============================================================

@router.put(
    "/{req_id}",
    response_model=FixtureRequirementResponse,
    summary="更新治具需求"
)
async def update_requirement(
    req_id: int,
    data: FixtureRequirementUpdate,
    current_admin=Depends(get_current_admin)
):
    # 先取得原資料
    row = db.execute_query(
        """
        SELECT
            fr.id,
            fr.customer_id,
            fr.model_id,
            fr.station_id,
            fr.fixture_id,
            fr.required_qty,
            fr.note,
            fr.created_at,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id=f.id
           AND fr.customer_id=f.customer_id
        WHERE fr.id=%s
        """,
        (req_id,),
    )
    if not row:
        raise HTTPException(404, "治具需求不存在")

    original = row[0]

    # 更新
    if data.required_qty is not None:
        db.execute_update(
            "UPDATE fixture_requirements SET required_qty=%s WHERE id=%s",
            (data.required_qty, req_id),
        )

    if data.note is not None:
        db.execute_update(
            "UPDATE fixture_requirements SET note=%s WHERE id=%s",
            (data.note, req_id),
        )

    # 回傳更新後資料
    updated = db.execute_query(
        """
        SELECT
            fr.id,
            fr.customer_id,
            fr.model_id,
            fr.station_id,
            fr.fixture_id,
            fr.required_qty,
            fr.note,
            fr.created_at,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id=f.id
           AND fr.customer_id=f.customer_id
        WHERE fr.id=%s
        """,
        (req_id,)
    )[0]

    return FixtureRequirementResponse(**updated)


# ============================================================
# 4️⃣ 刪除治具需求
# ============================================================

@router.delete(
    "/{req_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除治具需求"
)
async def delete_requirement(
    req_id: int,
    current_admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "DELETE FROM fixture_requirements WHERE id=%s",
        (req_id,),
    )
    if affected == 0:
        raise HTTPException(404, "治具需求不存在")

    return None
