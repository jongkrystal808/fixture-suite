"""
機種 ↔ 站點綁定 (model_stations)
獨立路由: /model-stations
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

router = APIRouter(
    prefix="/model-stations",
    tags=["機種-站點綁定 Model-Stations"],
)


# =========================================================
# Pydantic Schema
# =========================================================

class StationBound(BaseModel):
    station_id: int
    station_code: str
    station_name: str | None = None
    note: str | None = None


class BindStationInput(BaseModel):
    station_id: int = Field(..., description="站點 ID")


# =========================================================
# 工具：確認機種是否存在
# =========================================================

def ensure_model_exist(model_id: str):
    rows = db.execute_query(
        "SELECT model_id FROM machine_models WHERE model_id = %s",
        (model_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="機種不存在")


def ensure_station_exist(station_id: int):
    rows = db.execute_query(
        "SELECT station_id FROM stations WHERE station_id = %s",
        (station_id,),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="站點不存在")


# =========================================================
# 1. 查詢某機種已綁定的站點
# =========================================================

@router.get("/{model_id}", response_model=List[StationBound], summary="查詢機種已綁定的站點")
async def list_bound_stations(
    model_id: str,
    current_user=Depends(get_current_user),
):
    ensure_model_exist(model_id)

    sql = """
        SELECT
            s.station_id,
            s.station_code,
            s.station_name,
            s.note
        FROM model_stations ms
        JOIN stations s ON ms.station_id = s.station_id
        WHERE ms.model_id = %s
        ORDER BY s.station_code
    """
    rows = db.execute_query(sql, (model_id,))
    return [StationBound(**row) for row in rows]


# =========================================================
# 2. 查詢尚未綁定的站點
# =========================================================

@router.get(
    "/{model_id}/available",
    response_model=List[StationBound],
    summary="查詢尚未綁定的站點",
)
async def list_available_stations(
    model_id: str,
    current_user=Depends(get_current_user),
):
    ensure_model_exist(model_id)

    sql = """
        SELECT 
            s.station_id,
            s.station_code,
            s.station_name,
            s.note
        FROM stations s
        WHERE s.station_id NOT IN (
            SELECT station_id FROM model_stations WHERE model_id = %s
        )
        ORDER BY s.station_code
    """

    rows = db.execute_query(sql, (model_id,))
    return [StationBound(**row) for row in rows]


# =========================================================
# 3. 新增綁定
# =========================================================

@router.post(
    "/{model_id}",
    response_model=List[StationBound],
    status_code=status.HTTP_201_CREATED,
    summary="新增機種-站點綁定",
)
async def bind_station(
    model_id: str,
    data: BindStationInput,
    current_admin=Depends(get_current_admin),
):
    ensure_model_exist(model_id)
    ensure_station_exist(data.station_id)

    # 檢查是否已存在
    exists = db.execute_query(
        """
        SELECT id FROM model_stations
        WHERE model_id = %s AND station_id = %s
        """,
        (model_id, data.station_id),
    )

    if exists:
        raise HTTPException(status_code=400, detail="此站點已綁定此機種")

    # 新增綁定
    db.execute_update(
        """
        INSERT INTO model_stations (model_id, station_id)
        VALUES (%s, %s)
        """,
        (model_id, data.station_id),
    )

    # 回傳最新綁定列表
    return await list_bound_stations(model_id)


# =========================================================
# 4. 刪除綁定
# =========================================================

@router.delete(
    "/{model_id}/{station_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="移除機種-站點綁定",
)
async def unbind_station(
    model_id: str,
    station_id: int,
    current_admin=Depends(get_current_admin),
):
    ensure_model_exist(model_id)
    ensure_station_exist(station_id)

    affected = db.execute_update(
        """
        DELETE FROM model_stations
        WHERE model_id = %s AND station_id = %s
        """,
        (model_id, station_id),
    )

    if affected == 0:
        raise HTTPException(status_code=404, detail="綁定不存在")

    return None
