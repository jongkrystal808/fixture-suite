"""
機種 ↔ 站點綁定 API (v3.0 完整版)
Model-Stations Binding (Aligned with DB v3.0 Schema)

變更內容：
- station_id 改 varchar(50)
- 加入 customer_id
- 使用 id (AUTO_INCREMENT) 作為主鍵
- UNIQUE KEY: (customer_id, model_id, station_id)
- 完整多客戶隔離
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from pydantic import BaseModel
from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db


router = APIRouter(
    prefix="/model-stations",
    tags=["Model Detail"],
)

# ============================================================
# Pydantic Models
# ============================================================

class StationBound(BaseModel):
    station_id: str            # varchar(50)
    station_name: Optional[str] = None
    note: Optional[str] = None


class BindStationInput(BaseModel):
    station_id: str            # varchar(50)


# ============================================================
# Tools: Check if model & station exist for customer
# ============================================================

def ensure_model_exist(model_id: str, customer_id: str):
    rows = db.execute_query(
        "SELECT id FROM machine_models WHERE id=%s AND customer_id=%s",
        (model_id, customer_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="此客戶下的機種不存在")


def ensure_station_exist(station_id: str, customer_id: str):
    rows = db.execute_query(
        "SELECT id FROM stations WHERE id=%s AND customer_id=%s",
        (station_id, customer_id),
    )
    if not rows:
        raise HTTPException(status_code=404, detail="此客戶下的站點不存在")


# ============================================================
# 1. 查詢某機種已綁定的站點
# ============================================================

@router.get(
    "",
    response_model=List[StationBound],
    summary="查詢機種已綁定的站點"
)
async def list_bound_stations(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    ensure_model_exist(model_id, customer_id)

    sql = """
        SELECT
            s.id AS station_id,
            s.station_name,
            s.note
        FROM model_stations ms
        JOIN stations s
            ON ms.station_id = s.id AND ms.customer_id = s.customer_id
        WHERE ms.model_id = %s AND ms.customer_id = %s
        ORDER BY s.id
    """

    rows = db.execute_query(sql, (model_id, customer_id))
    return [StationBound(**row) for row in rows]


# ============================================================
# 2. 查詢尚未綁定的站點
# ============================================================

@router.get(
    "/available",
    response_model=List[StationBound],
    summary="查詢尚未綁定的站點"
)
async def list_available_stations(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    ensure_model_exist(model_id, customer_id)

    sql = """
        SELECT
            s.id AS station_id,
            s.station_name,
            s.note
        FROM stations s
        WHERE s.customer_id = %s
          AND s.id NOT IN (
              SELECT station_id
              FROM model_stations
              WHERE model_id = %s AND customer_id = %s
          )
        ORDER BY s.id
    """

    rows = db.execute_query(sql, (customer_id, model_id, customer_id))
    return [StationBound(**row) for row in rows]


# ============================================================
# 3. 新增綁定
# ============================================================

@router.post(
    "",
    response_model=List[StationBound],
    status_code=status.HTTP_201_CREATED,
    summary="新增機種-站點綁定"
)
async def bind_station(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    data: BindStationInput = None,
    admin=Depends(get_current_admin)
):
    ensure_model_exist(model_id, customer_id)
    ensure_station_exist(data.station_id, customer_id)

    # 檢查是否已綁定
    exists = db.execute_query(
        """
        SELECT id FROM model_stations
        WHERE customer_id=%s AND model_id=%s AND station_id=%s
        """,
        (customer_id, model_id, data.station_id),
    )
    if exists:
        raise HTTPException(status_code=400, detail="此站點已綁定此機種")

    # 新增綁定
    db.execute_update(
        """
        INSERT INTO model_stations (customer_id, model_id, station_id)
        VALUES (%s, %s, %s)
        """,
        (customer_id, model_id, data.station_id),
    )

    # 回傳更新後綁定列表
    return await list_bound_stations(model_id=model_id, customer_id=customer_id)


# ============================================================
# 4. 刪除綁定
# ============================================================

@router.delete(
    "",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="移除機種-站點綁定"
)
async def unbind_station(
    model_id: str = Query(...),
    station_id: str = Query(...),
    customer_id: str = Query(...),
    admin=Depends(get_current_admin)
):
    ensure_model_exist(model_id, customer_id)
    ensure_station_exist(station_id, customer_id)

    affected = db.execute_update(
        """
        DELETE FROM model_stations
        WHERE customer_id=%s AND model_id=%s AND station_id=%s
        """,
        (customer_id, model_id, station_id),
    )

    if affected == 0:
        raise HTTPException(status_code=404, detail="綁定不存在")

    return None




@router.get("/{model_id}/detail")
async def get_model_detail(
    model_id: str,
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    """
    🔵 Model Detail API (v3.6)
    - 機種基本資料
    - 已綁定站點
    - 治具需求 (含 available_qty)
    - 最大開站量（動態計算，不使用 view）
    """

    print(f"🔥 get_model_detail(): model_id={model_id}, customer_id={customer_id}")

    try:
        # ---------------------------
        # 1) 機種基本資料
        # ---------------------------
        sql_model = """
            SELECT id, customer_id, model_name, note, created_at
            FROM machine_models
            WHERE id = %s AND customer_id = %s
            LIMIT 1
        """
        model_rows = db.execute_query(sql_model, (model_id, customer_id))
        if not model_rows:
            raise HTTPException(404, "找不到該機種")

        model = model_rows[0]

        # ---------------------------
        # 2) 綁定站點
        # ---------------------------
        sql_stations = """
            SELECT 
                ms.station_id,
                s.station_name
            FROM model_stations ms
            JOIN stations s ON ms.station_id = s.id
            WHERE ms.model_id = %s AND ms.customer_id = %s
            ORDER BY ms.station_id
        """
        stations = db.execute_query(sql_stations, (model_id, customer_id))

        # ---------------------------
        # 3) 治具需求
        # ---------------------------
        sql_requirements = """
            SELECT
                fr.id,
                fr.station_id,
                s.station_name,
                fr.fixture_id,
                f.fixture_name,
                fr.required_qty,
                f.available_qty,
                fr.note
            FROM fixture_requirements fr
            JOIN stations s ON fr.station_id = s.id
            JOIN fixtures f ON fr.fixture_id = f.id
            WHERE fr.model_id = %s AND fr.customer_id = %s
            ORDER BY fr.station_id, fr.fixture_id
        """
        requirements = db.execute_query(sql_requirements, (model_id, customer_id))

        # ---------------------------
        # 4) 最大開站量 → 依需求計算
        # ---------------------------
        max_map = {}   # {station_id: {station_name, max_qty, limiting_fixtures}}

        for r in requirements:
            station_id = r["station_id"]
            station_name = r["station_name"]
            required_qty = r["required_qty"]
            available_qty = r["available_qty"] or 0

            if required_qty <= 0:
                continue

            max_open = available_qty // required_qty

            if station_id not in max_map:
                max_map[station_id] = {
                    "station_id": station_id,
                    "station_name": station_name,
                    "max_available_stations": max_open,
                    "limiting_fixtures": []
                }
            else:
                # 取最小值
                max_map[station_id]["max_available_stations"] = min(
                    max_map[station_id]["max_available_stations"],
                    max_open
                )

            # 記錄限制因子
            max_map[station_id]["limiting_fixtures"].append({
                "fixture_id": r["fixture_id"],
                "fixture_name": r["fixture_name"],
                "available_qty": available_qty,
                "required_qty": required_qty,
                "max_stations_by_this_fixture": max_open
            })

        max_stations = list(max_map.values())

        # ---------------------------
        # 回傳
        # ---------------------------
        return {
            "model": model,
            "stations": stations,
            "requirements": requirements,
            "max_stations": max_stations,
        }

    except Exception as e:
        import traceback
        print("========== ERROR IN get_model_detail ==========")
        print(traceback.format_exc())
        print("==============================================")
        raise HTTPException(500, f"後端錯誤: {e}")

