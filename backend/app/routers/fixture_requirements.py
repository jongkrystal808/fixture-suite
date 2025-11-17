"""
治具需求 CRUD
fixture_requirements

功能：
- 查詢某機種 + 特定站點的所有治具需求
- 新增治具需求
- 修改治具需求
- 刪除治具需求
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

router = APIRouter(
    prefix="/fixture-req",
    tags=["治具需求 Fixture Requirements"],
)

# =========================================================
# Pydantic Schema
# =========================================================

class FixtureRequirementBase(BaseModel):
    fixture_id: str = Field(..., description="治具編號")
    required_qty: int = Field(..., ge=1, description="需求數量")


class FixtureRequirementCreate(FixtureRequirementBase):
    pass


class FixtureRequirementUpdate(BaseModel):
    required_qty: Optional[int] = Field(None, ge=1, description="需求數量")


class FixtureRequirementResponse(FixtureRequirementBase):
    id: int = Field(..., description="需求 ID")
    fixture_name: Optional[str] = Field(None, description="治具名稱")

    class Config:
        from_attributes = True


# =========================================================
# 工具：確認機種/站點/治具是否存在
# =========================================================

def ensure_model_exists(model_id: str):
    rows = db.execute_query(
        "SELECT model_id FROM machine_models WHERE model_id=%s",
        (model_id,),
    )
    if not rows:
        raise HTTPException(404, "機種不存在")


def ensure_station_exists(station_id: int):
    rows = db.execute_query(
        "SELECT station_id FROM stations WHERE station_id=%s",
        (station_id,),
    )
    if not rows:
        raise HTTPException(404, "站點不存在")


def ensure_fixture_exists(fixture_id: str):
    rows = db.execute_query(
        "SELECT fixture_id FROM fixtures WHERE fixture_id=%s",
        (fixture_id,),
    )
    if not rows:
        raise HTTPException(404, "治具不存在")


# =========================================================
# 1. 查詢治具需求清單
# =========================================================

@router.get(
    "/{model_id}/{station_id}",
    response_model=List[FixtureRequirementResponse],
    summary="查詢某機種 + 站點的治具需求清單",
)
async def list_requirements(
    model_id: str,
    station_id: int,
    current_user=Depends(get_current_user),
):
    ensure_model_exists(model_id)
    ensure_station_exists(station_id)

    sql = """
        SELECT 
            fr.id,
            fr.fixture_id,
            fr.required_qty,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f ON fr.fixture_id = f.fixture_id
        WHERE fr.model_id=%s AND fr.station_id=%s
        ORDER BY fr.fixture_id
    """
    rows = db.execute_query(sql, (model_id, station_id))
    return [FixtureRequirementResponse(**row) for row in rows]


# =========================================================
# 2. 新增治具需求
# =========================================================

@router.post(
    "/{model_id}/{station_id}",
    response_model=FixtureRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增治具需求",
)
async def create_requirement(
    model_id: str,
    station_id: int,
    data: FixtureRequirementCreate,
    current_admin=Depends(get_current_admin),
):
    ensure_model_exists(model_id)
    ensure_station_exists(station_id)
    ensure_fixture_exists(data.fixture_id)

    # 檢查是否已存在相同 model + station + fixture
    exists = db.execute_query(
        """
        SELECT id FROM fixture_requirements
        WHERE model_id=%s AND station_id=%s AND fixture_id=%s
        """,
        (model_id, station_id, data.fixture_id),
    )
    if exists:
        raise HTTPException(400, "此治具需求已存在")

    db.execute_update(
        """
        INSERT INTO fixture_requirements (model_id, station_id, fixture_id, required_qty)
        VALUES (%s, %s, %s, %s)
        """,
        (model_id, station_id, data.fixture_id, data.required_qty),
    )

    # 回傳新增資料
    row = db.execute_query(
        """
        SELECT
            fr.id,
            fr.fixture_id,
            fr.required_qty,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f ON fr.fixture_id=f.fixture_id
        WHERE fr.model_id=%s AND fr.station_id=%s AND fr.fixture_id=%s
        """,
        (model_id, station_id, data.fixture_id),
    )[0]
    return FixtureRequirementResponse(**row)


# =========================================================
# 3. 更新治具需求
# =========================================================

@router.put(
    "/item/{req_id}",
    response_model=FixtureRequirementResponse,
    summary="更新治具需求 required_qty",
)
async def update_requirement(
    req_id: int,
    data: FixtureRequirementUpdate,
    current_admin=Depends(get_current_admin),
):
    # 確認存在
    row = db.execute_query(
        "SELECT id, fixture_id FROM fixture_requirements WHERE id=%s",
        (req_id,),
    )
    if not row:
        raise HTTPException(status_code=404, detail="治具需求不存在")

    if data.required_qty is not None:
        db.execute_update(
            "UPDATE fixture_requirements SET required_qty=%s WHERE id=%s",
            (data.required_qty, req_id),
        )

    # 回傳最新資料
    sql = """
        SELECT
            fr.id,
            fr.fixture_id,
            fr.required_qty,
            f.fixture_name
        FROM fixture_requirements fr
        JOIN fixtures f ON fr.fixture_id=f.fixture_id
        WHERE fr.id=%s
    """
    updated = db.execute_query(sql, (req_id,))[0]
    return FixtureRequirementResponse(**updated)


# =========================================================
# 4. 刪除治具需求
# =========================================================

@router.delete(
    "/item/{req_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="刪除治具需求",
)
async def delete_requirement(
    req_id: int,
    current_admin=Depends(get_current_admin),
):
    affected = db.execute_update(
        "DELETE FROM fixture_requirements WHERE id=%s",
        (req_id,),
    )
    if affected == 0:
        raise HTTPException(404, "治具需求不存在")
    return None
