"""
Model Detail API v4.x (Fixed / Header-based customer context)

整合：
- Model ↔ Stations 綁定管理
- Fixture Requirements 治具需求管理
- Model Detail (stations + requirements + max-stations)
- 多客戶隔離 / JOIN customer_id 完整一致

對應資料表：
- machine_models
- stations
- fixtures
- model_stations
- fixture_requirements
- view_model_max_stations (optional)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_admin, get_current_customer_id

router = APIRouter(
    prefix="/model-detail",
    tags=["Model Detail"],
)

# --------------------------------------------------------------
# 🔧 Pydantic Models
# --------------------------------------------------------------

class StationBound(BaseModel):
    station_id: str
    station_name: Optional[str] = None
    note: Optional[str] = None

class FixtureRequirement(BaseModel):
    id: int
    station_id: str
    fixture_id: str
    fixture_name: Optional[str] = None
    required_qty: int
    available_qty: Optional[int] = 0
    note: Optional[str] = None

class FixtureRequirementCreate(BaseModel):
    # ❗customer_id 不允許由前端傳（v4.x）
    model_id: str
    station_id: str
    fixture_id: str
    required_qty: int = Field(..., ge=0)
    note: Optional[str] = None

class FixtureRequirementUpdate(BaseModel):
    required_qty: Optional[int] = Field(None, ge=0)
    note: Optional[str] = None

class BindStationInput(BaseModel):
    station_id: str


# --------------------------------------------------------------
# 🔧 Tools：確認資料存在（customer_id 隔離）
# --------------------------------------------------------------

def ensure_model(customer_id: str, model_id: str) -> None:
    row = db.execute_query(
        "SELECT id FROM machine_models WHERE customer_id=%s AND id=%s",
        (customer_id, model_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="機種不存在")

def ensure_station(customer_id: str, station_id: str) -> None:
    row = db.execute_query(
        "SELECT id FROM stations WHERE customer_id=%s AND id=%s",
        (customer_id, station_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="站點不存在")

def ensure_fixture(customer_id: str, fixture_id: str) -> None:
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE customer_id=%s AND id=%s",
        (customer_id, fixture_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="治具不存在")


# --------------------------------------------------------------
# 1️⃣ 取得已綁定站點
# --------------------------------------------------------------

@router.get("/stations", response_model=List[StationBound], summary="取得已綁定站點")
async def list_bound_stations(
    model_id: str = Query(...),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    ensure_model(customer_id, model_id)

    sql = """
        SELECT
            s.id AS station_id,
            s.station_name,
            s.note
        FROM model_stations ms
        JOIN stations s
            ON ms.station_id = s.id
           AND ms.customer_id = s.customer_id
        WHERE ms.customer_id=%s
          AND ms.model_id=%s
        ORDER BY s.id
    """
    rows = db.execute_query(sql, (customer_id, model_id))
    return rows or []


# --------------------------------------------------------------
# 2️⃣ 取得尚未綁定的站點
# --------------------------------------------------------------

@router.get("/stations/available", response_model=List[StationBound], summary="取得尚未綁定的站點")
async def list_available_stations(
    model_id: str = Query(...),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    ensure_model(customer_id, model_id)

    sql = """
        SELECT
            s.id AS station_id,
            s.station_name,
            s.note
        FROM stations s
        WHERE s.customer_id=%s
          AND s.id NOT IN (
              SELECT station_id
              FROM model_stations
              WHERE customer_id=%s AND model_id=%s
          )
        ORDER BY s.id
    """
    rows = db.execute_query(sql, (customer_id, customer_id, model_id))
    return rows or []


# --------------------------------------------------------------
# 3️⃣ 新增綁定
# --------------------------------------------------------------

@router.post("/stations", status_code=status.HTTP_201_CREATED)
async def bind_station(
    model_id: str = Query(...),
    data: BindStationInput = None,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    if not data or not data.station_id:
        raise HTTPException(status_code=400, detail="station_id is required")

    ensure_model(customer_id, model_id)
    ensure_station(customer_id, data.station_id)

    exists = db.execute_query(
        """
        SELECT 1
        FROM model_stations
        WHERE customer_id=%s AND model_id=%s AND station_id=%s
        LIMIT 1
        """,
        (customer_id, model_id, data.station_id)
    )
    if exists:
        raise HTTPException(status_code=400, detail="此站點已綁定")

    db.execute_update(
        """
        INSERT INTO model_stations (customer_id, model_id, station_id)
        VALUES (%s, %s, %s)
        """,
        (customer_id, model_id, data.station_id)
    )

    return {"message": "綁定成功"}


# --------------------------------------------------------------
# 4️⃣ 移除綁定
# --------------------------------------------------------------

@router.delete("/stations")
async def unbind_station(
    model_id: str = Query(...),
    station_id: str = Query(...),
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    ensure_model(customer_id, model_id)
    ensure_station(customer_id, station_id)

    # 1️⃣ 先刪除該站點下所有治具需求
    db.execute_update(
        """
        DELETE FROM fixture_requirements
        WHERE customer_id=%s
          AND model_id=%s
          AND station_id=%s
        """,
        (customer_id, model_id, station_id)
    )

    # 2️⃣ 再刪除站點綁定
    affected = db.execute_update(
        """
        DELETE FROM model_stations
        WHERE customer_id=%s
          AND model_id=%s
          AND station_id=%s
        """,
        (customer_id, model_id, station_id)
    )

    if affected == 0:
        raise HTTPException(status_code=404, detail="站點尚未綁定")

    return {
        "message": "站點已解綁，並已刪除該站點下所有治具需求"
    }


# --------------------------------------------------------------
# 5️⃣ 查詢某站點的治具需求
# --------------------------------------------------------------

@router.get("/requirements", response_model=List[FixtureRequirement])
async def list_requirements(
    model_id: str = Query(...),
    station_id: str = Query(...),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):

    ensure_model(customer_id, model_id)
    ensure_station(customer_id, station_id)

    sql = """
        SELECT
            fr.id,
            fr.station_id,
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            COALESCE(f.available_qty, 0) AS available_qty,
            fr.note
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
    return rows or []


# --------------------------------------------------------------
# 6️⃣ 新增治具需求
# --------------------------------------------------------------

@router.post(
    "/requirements",
    response_model=FixtureRequirement,
    status_code=status.HTTP_201_CREATED
)
async def create_requirement(
    data: FixtureRequirementCreate,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    ensure_model(customer_id, data.model_id)
    ensure_station(customer_id, data.station_id)
    ensure_fixture(customer_id, data.fixture_id)

    exists = db.execute_query(
        """
        SELECT 1
        FROM fixture_requirements
        WHERE customer_id=%s
          AND model_id=%s
          AND station_id=%s
          AND fixture_id=%s
        LIMIT 1
        """,
        (customer_id, data.model_id, data.station_id, data.fixture_id),
    )
    if exists:
        raise HTTPException(status_code=400, detail="此治具需求已存在")

    db.execute_update(
        """
        INSERT INTO fixture_requirements
            (customer_id, model_id, station_id, fixture_id, required_qty, note)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            customer_id,
            data.model_id,
            data.station_id,
            data.fixture_id,
            data.required_qty,
            data.note,
        )
    )

    row = db.execute_query(
        """
        SELECT 
            fr.id,
            fr.station_id,
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            COALESCE(f.available_qty, 0) AS available_qty,
            fr.note
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id = f.id
           AND fr.customer_id = f.customer_id
        WHERE fr.customer_id=%s
          AND fr.model_id=%s
          AND fr.station_id=%s
          AND fr.fixture_id=%s
        ORDER BY fr.id DESC
        LIMIT 1
        """,
        (customer_id, data.model_id, data.station_id, data.fixture_id),
    )

    return row[0]

# --------------------------------------------------------------
# 7️⃣ 更新治具需求
# --------------------------------------------------------------

@router.put(
    "/requirements/{req_id}",
    response_model=FixtureRequirement
)
async def update_requirement(
    req_id: int,
    data: FixtureRequirementUpdate,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    row = db.execute_query(
        """
        SELECT id
        FROM fixture_requirements
        WHERE id=%s AND customer_id=%s
        """,
        (req_id, customer_id)
    )
    if not row:
        raise HTTPException(status_code=404, detail="治具需求不存在")

    fields = []
    params = []

    if data.required_qty is not None:
        fields.append("required_qty=%s")
        params.append(data.required_qty)

    if data.note is not None:
        fields.append("note=%s")
        params.append(data.note)

    if not fields:
        raise HTTPException(status_code=400, detail="沒有要更新的欄位")

    params.extend([req_id, customer_id])

    db.execute_update(
        f"""
        UPDATE fixture_requirements
        SET {', '.join(fields)}
        WHERE id=%s AND customer_id=%s
        """,
        tuple(params)
    )

    updated = db.execute_query(
        """
        SELECT
            fr.id,
            fr.station_id,
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            COALESCE(f.available_qty, 0) AS available_qty,
            fr.note
        FROM fixture_requirements fr
        JOIN fixtures f
            ON fr.fixture_id=f.id
           AND fr.customer_id=f.customer_id
        WHERE fr.id=%s AND fr.customer_id=%s
        """,
        (req_id, customer_id)
    )[0]

    return updated


# --------------------------------------------------------------
# 8️⃣ 刪除治具需求
# --------------------------------------------------------------

@router.delete(
    "/requirements/{req_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_requirement(
    req_id: int,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    affected = db.execute_update(
        """
        DELETE FROM fixture_requirements
        WHERE id=%s AND customer_id=%s
        """,
        (req_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(status_code=404, detail="治具需求不存在")

    return None


# --------------------------------------------------------------
# 9️⃣ Model Detail（三段式 UI 專用）
# --------------------------------------------------------------

@router.get(
    "/{model_id}/detail",
    summary="取得機種完整資訊（站點 + 治具需求 + 最大可開站數）"
)
async def get_model_detail(
    model_id: str,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    ensure_model(customer_id, model_id)

    # 1️⃣ 基本資料
    model = db.execute_query(
        """
        SELECT id, customer_id, model_name, note, created_at
        FROM machine_models
        WHERE id=%s AND customer_id=%s
        """,
        (model_id, customer_id)
    )[0]

    # 2️⃣ 綁定站點
    stations = db.execute_query(
        """
        SELECT
            ms.station_id,
            s.station_name
        FROM model_stations ms
        JOIN stations s 
            ON ms.station_id=s.id
           AND ms.customer_id=s.customer_id
        WHERE ms.model_id=%s AND ms.customer_id=%s
        ORDER BY ms.station_id
        """,
        (model_id, customer_id)
    )

    # 3️⃣ 治具需求
    requirements = db.execute_query(
        """
        SELECT
            fr.id,
            fr.station_id,
            s.station_name,
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            COALESCE(f.available_qty, 0) AS available_qty,
            fr.note
        FROM fixture_requirements fr
        JOIN stations s
            ON fr.station_id = s.id
           AND fr.customer_id = s.customer_id
        JOIN fixtures f
            ON fr.fixture_id = f.id
           AND fr.customer_id = f.customer_id
        WHERE fr.model_id=%s AND fr.customer_id=%s
        ORDER BY fr.station_id, fr.fixture_id
        """,
        (model_id, customer_id)
    )

    # 4️⃣ 最大可開站數（瓶頸計算）
    max_map = {}

    for r in requirements:
        sid = r["station_id"]
        req_qty = r["required_qty"]
        avail_qty = r["available_qty"] or 0

        if req_qty <= 0:
            continue

        max_open = avail_qty // req_qty

        if sid not in max_map or max_open < max_map[sid]["max_station"]:
            max_map[sid] = {
                "station_id": sid,
                "station_name": r["station_name"],
                "max_station": max_open,
                "bottleneck_fixture_id": r["fixture_id"],
                "bottleneck_qty": avail_qty,
            }

    return {
        "model": model,
        "stations": stations,
        "requirements": requirements,
        "capacity": list(max_map.values()),
    }


# --------------------------------------------------------------
# 🔟 取得某治具可使用的站點列表（Usage v4.0）
# --------------------------------------------------------------

@router.get(
    "/stations-by-fixture/{fixture_id}",
    summary="查詢治具可使用的站點列表"
)
async def get_stations_by_fixture(
    fixture_id: str,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):

    # 確保治具存在
    exists = db.execute_query(
        """
        SELECT id FROM fixtures
        WHERE id=%s AND customer_id=%s
        """,
        (fixture_id, customer_id)
    )
    if not exists:
        raise HTTPException(status_code=404, detail="治具不存在")

    rows = db.execute_query(
        """
        SELECT DISTINCT
            ms.station_id,
            s.station_name
        FROM fixture_model_map fm
        JOIN model_stations ms
            ON fm.customer_id = ms.customer_id
           AND fm.model_id = ms.model_id
        JOIN stations s
            ON ms.station_id = s.id
           AND ms.customer_id = s.customer_id
        WHERE fm.customer_id=%s
          AND fm.fixture_id=%s
        ORDER BY ms.station_id
        """,
        (customer_id, fixture_id)
    )

    return rows or []
