"""
站點 CRUD
stations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from pydantic import BaseModel, Field


from backend.app.dependencies import get_current_admin
from backend.app.database import db

router = APIRouter(
    prefix="/stations",
    tags=["站點 Stations"],
)


class StationBase(BaseModel):
    station_code: str = Field(..., description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    note: Optional[str] = Field(None, description="備註")


class StationCreate(StationBase):
    pass


class StationUpdate(BaseModel):
    station_code: Optional[str] = Field(None, description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    note: Optional[str] = Field(None, description="備註")


class StationResponse(StationBase):
    station_id: int = Field(..., description="站點 ID")

    class Config:
        from_attributes = True


# =======================
# 1. 查詢所有站點列表
# =======================
@router.get("", response_model=List[StationResponse], summary="查詢站點列表")
async def list_stations(
    q: Optional[str] = Query(None, description="搜尋關鍵字（站點代碼、名稱模糊查詢）"),
    current_user=Depends(get_current_admin),  # 確保管理員才可查詢
):
    sql = """
        SELECT station_id, station_code, station_name, note
        FROM stations
    """
    params = []
    if q:
        sql += " WHERE station_code LIKE %s OR station_name LIKE %s"
        search_pattern = f"%{q}%"
        params = [search_pattern, search_pattern]

    sql += " ORDER BY station_code"

    rows = db.execute_query(sql, tuple(params))
    return [StationResponse(**row) for row in rows]


# =======================
# 2. 查詢單一站點
# =======================
@router.get("/{station_id}", response_model=StationResponse, summary="查詢單一站點")
async def get_station(
    station_id: int,
    current_user=Depends(get_current_admin),
):
    sql = """
        SELECT station_id, station_code, station_name, note
        FROM stations
        WHERE station_id = %s
    """
    rows = db.execute_query(sql, (station_id,))
    if not rows:
        raise HTTPException(status_code=404, detail="站點不存在")
    return StationResponse(**rows[0])


# =======================
# 3. 新增站點
# =======================
@router.post("", response_model=StationResponse, status_code=status.HTTP_201_CREATED, summary="新增站點")
async def create_station(
    data: StationCreate,
    current_admin=Depends(get_current_admin),  # 需要管理員權限
):
    # 檢查是否已存在相同的站點代碼
    exists = db.execute_query(
        "SELECT station_id FROM stations WHERE station_code = %s", (data.station_code,)
    )
    if exists:
        raise HTTPException(status_code=400, detail="站點代碼已存在")

    # 新增站點
    insert_sql = """
        INSERT INTO stations (station_code, station_name, note)
        VALUES (%s, %s, %s)
    """
    db.execute_update(insert_sql, (data.station_code, data.station_name, data.note))

    # 回傳新增的站點
    return await get_station(station_id=db.execute_query("SELECT LAST_INSERT_ID()")[0][0])


# =======================
# 4. 更新站點
# =======================
@router.put("/{station_id}", response_model=StationResponse, summary="更新站點")
async def update_station(
    station_id: int,
    data: StationUpdate,
    current_admin=Depends(get_current_admin),  # 需要管理員權限
):
    # 確認站點是否存在
    existing = db.execute_query(
        "SELECT station_id FROM stations WHERE station_id = %s", (station_id,)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="站點不存在")

    # 更新站點
    fields = []
    params = []

    if data.station_code:
        fields.append("station_code = %s")
        params.append(data.station_code)
    if data.station_name:
        fields.append("station_name = %s")
        params.append(data.station_name)
    if data.note:
        fields.append("note = %s")
        params.append(data.note)

    sql = f"UPDATE stations SET {', '.join(fields)} WHERE station_id = %s"
    params.append(station_id)
    db.execute_update(sql, tuple(params))

    # 回傳更新後的站點
    return await get_station(station_id)


# =======================
# 5. 刪除站點
# =======================
@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除站點")
async def delete_station(
    station_id: int,
    current_admin=Depends(get_current_admin),  # 需要管理員權限
):
    # 刪除站點
    affected = db.execute_update(
        "DELETE FROM stations WHERE station_id = %s", (station_id,)
    )
    if affected == 0:
        raise HTTPException(status_code=404, detail="站點不存在")
    return None
