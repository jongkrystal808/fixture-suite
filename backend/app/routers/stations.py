"""
站點管理 API (v3.0 完整版本)
Stations API (Aligned with DB v3.0 Schema)

變更內容：
- station_id (int) → id (varchar)
- station_code → id
- 新增 customer_id
- 所有操作均需 customer_id (多客戶隔離)
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from pydantic import BaseModel

from backend.app.dependencies import get_current_admin, get_current_user
from backend.app.database import db

router = APIRouter(
    prefix="/stations",
    tags=["站點 Stations"],
)


# ============================================================
# Pydantic Models
# ============================================================

class StationBase(BaseModel):
    id: str                     # 站點代碼 (主鍵)
    customer_id: str            # 客戶 ID (v3.0 新增)
    station_name: Optional[str] = None
    note: Optional[str] = None


class StationCreate(StationBase):
    pass


class StationUpdate(BaseModel):
    station_name: Optional[str] = None
    note: Optional[str] = None


class StationResponse(StationBase):
    created_at: Optional[str] = None


# ============================================================
# 1. 查詢站點列表 (依客戶分隔)
# ============================================================

@router.get("", response_model=List[StationResponse], summary="查詢站點列表")
async def list_stations(
    customer_id: str = Query(..., description="客戶 ID"),
    q: Optional[str] = Query(None, description="搜尋關鍵字"),
    current_user=Depends(get_current_user)
):
    sql = """
        SELECT *
        FROM stations
        WHERE customer_id = %s
    """
    params = [customer_id]

    if q:
        sql += " AND (id LIKE %s OR station_name LIKE %s)"
        like = f"%{q}%"
        params.extend([like, like])

    sql += " ORDER BY id"

    rows = db.execute_query(sql, tuple(params))
    return [StationResponse(**row) for row in rows]


# ============================================================
# 2. 查詢單一站點
# ============================================================

@router.get("/{station_id}", response_model=StationResponse, summary="查詢站點詳情")
async def get_station(
    station_id: str,
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    sql = """
        SELECT *
        FROM stations
        WHERE id = %s AND customer_id = %s
    """
    rows = db.execute_query(sql, (station_id, customer_id))

    if not rows:
        raise HTTPException(status_code=404, detail="站點不存在")

    return StationResponse(**rows[0])


# ============================================================
# 3. 新增站點
# ============================================================

@router.post("", response_model=StationResponse, status_code=status.HTTP_201_CREATED, summary="新增站點")
async def create_station(
    data: StationCreate,
    admin=Depends(get_current_admin)
):
    # 檢查客戶是否存在
    exists_customer = db.execute_query("SELECT id FROM customers WHERE id=%s", (data.customer_id,))
    if not exists_customer:
        raise HTTPException(400, "客戶不存在")

    # 檢查站點是否已存在（同客戶）
    exists = db.execute_query(
        "SELECT id FROM stations WHERE id=%s AND customer_id=%s",
        (data.id, data.customer_id)
    )
    if exists:
        raise HTTPException(status_code=400, detail="該客戶下站點代碼已存在")

    sql = """
        INSERT INTO stations (id, customer_id, station_name, note)
        VALUES (%s, %s, %s, %s)
    """
    db.execute_update(sql, (data.id, data.customer_id, data.station_name, data.note))

    return await get_station(data.id, data.customer_id)


# ============================================================
# 4. 更新站點
# ============================================================

@router.put("/{station_id}", response_model=StationResponse, summary="更新站點")
async def update_station(
    station_id: str,
    data: StationUpdate,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin),
):
    # 確認存在
    existing = db.execute_query(
        "SELECT id FROM stations WHERE id = %s AND customer_id = %s",
        (station_id, customer_id)
    )
    if not existing:
        raise HTTPException(status_code=404, detail="站點不存在")

    update_fields = []
    params = []

    if data.station_name is not None:
        update_fields.append("station_name = %s")
        params.append(data.station_name)

    if data.note is not None:
        update_fields.append("note = %s")
        params.append(data.note)

    if not update_fields:
        raise HTTPException(400, "沒有要更新的欄位")

    sql = f"""
        UPDATE stations
        SET {', '.join(update_fields)}
        WHERE id = %s AND customer_id = %s
    """
    params.extend([station_id, customer_id])
    db.execute_update(sql, tuple(params))

    return await get_station(station_id, customer_id)


# ============================================================
# 5. 刪除站點
# ============================================================

@router.delete("/{station_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除站點")
async def delete_station(
    station_id: str,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin)
):
    sql = """
        DELETE FROM stations
        WHERE id = %s AND customer_id = %s
    """
    affected = db.execute_update(sql, (station_id, customer_id))

    if affected == 0:
        raise HTTPException(status_code=404, detail="站點不存在")

    return None
