"""
使用記錄 API (v3.0)
Usage Logs API

對應資料表: usage_logs
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

from backend.app.models.usage import (
    UsageCreate,
    UsageUpdate,
    UsageResponse,
    UsageWithDetails
)

router = APIRouter(
    prefix="/logs/usage",
    tags=["使用記錄 Usage Logs"]
)


# ============================================================
# 資料存在性檢查
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    sql = """
        SELECT id, fixture_name
        FROM fixtures
        WHERE id=%s AND customer_id=%s
    """
    row = db.execute_query(sql, (fixture_id, customer_id))
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")
    return row[0]


def ensure_model_exists(model_id: str, customer_id: str):
    sql = """
        SELECT id, model_name
        FROM machine_models
        WHERE id=%s AND customer_id=%s
    """
    row = db.execute_query(sql, (model_id, customer_id))
    if not row:
        raise HTTPException(400, f"機種 {model_id} 不存在或不屬於客戶 {customer_id}")
    return row[0]


def ensure_station_exists(station_id: str, customer_id: str):
    sql = """
        SELECT id, station_name
        FROM stations
        WHERE id=%s AND customer_id=%s
    """
    row = db.execute_query(sql, (station_id, customer_id))
    if not row:
        raise HTTPException(400, f"站點 {station_id} 不存在或不屬於客戶 {customer_id}")
    return row[0]


# ============================================================
# 1️⃣ 新增使用記錄
# ============================================================

@router.post(
    "",
    response_model=UsageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增使用記錄(單筆)"
)
async def create_usage_log(
    data: UsageCreate,
    current_user=Depends(get_current_user)
):
    # 驗證資料
    ensure_fixture_exists(data.fixture_id, data.customer_id)
    ensure_model_exists(data.model_id, data.customer_id)
    ensure_station_exists(data.station_id, data.customer_id)

    operator = data.operator or current_user["username"]
    now = datetime.now()

    sql = """
        INSERT INTO usage_logs
            (customer_id, fixture_id, model_id, station_id, operator, note, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    log_id = db.insert(sql, (
        data.customer_id,
        data.fixture_id,
        data.model_id,
        data.station_id,
        operator,
        data.note,
        now,
    ))

    return UsageResponse(
        id=log_id,
        customer_id=data.customer_id,
        fixture_id=data.fixture_id,
        model_id=data.model_id,
        station_id=data.station_id,
        operator=operator,
        note=data.note,
        created_at=now,
    )


# ============================================================
# 2️⃣ 列表查詢使用記錄
# ============================================================

@router.get(
    "",
    response_model=List[UsageWithDetails],
    summary="查詢使用記錄列表"
)
async def list_usage_logs(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    model_id: Optional[str] = None,
    station_id: Optional[str] = None,
    operator: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user)
):
    wh = ["ul.customer_id = %(customer_id)s"]
    params = {"customer_id": customer_id}

    if fixture_id:
        wh.append("ul.fixture_id = %(fixture_id)s")
        params["fixture_id"] = fixture_id

    if model_id:
        wh.append("ul.model_id = %(model_id)s")
        params["model_id"] = model_id

    if station_id:
        wh.append("ul.station_id = %(station_id)s")
        params["station_id"] = station_id

    if operator:
        wh.append("ul.operator LIKE %(operator)s")
        params["operator"] = f"%{operator}%"

    if date_from:
        wh.append("ul.created_at >= %(date_from)s")
        params["date_from"] = date_from

    if date_to:
        wh.append("ul.created_at <= %(date_to)s")
        params["date_to"] = date_to

    where_sql = " AND ".join(wh)

    sql = f"""
        SELECT
            ul.*,
            f.fixture_name,
            mm.model_name,
            s.station_name
        FROM usage_logs ul
        LEFT JOIN fixtures f
            ON ul.fixture_id = f.id AND ul.customer_id = f.customer_id
        LEFT JOIN machine_models mm
            ON ul.model_id = mm.id AND ul.customer_id = mm.customer_id
        LEFT JOIN stations s
            ON ul.station_id = s.id AND ul.customer_id = s.customer_id
        WHERE {where_sql}
        ORDER BY ul.created_at DESC
        LIMIT %(limit)s OFFSET %(skip)s
    """

    params["limit"] = limit
    params["skip"] = skip

    rows = db.execute_query(sql, params)

    return [
        UsageWithDetails(
            **row,
            fixture_name=row.get("fixture_name"),
            model_name=row.get("model_name"),
            station_name=row.get("station_name"),
        )
        for row in rows
    ]


# ============================================================
# 3️⃣ 查詢單筆使用記錄
# ============================================================

@router.get(
    "/{log_id}",
    response_model=UsageWithDetails,
    summary="取得單筆使用記錄"
)
async def get_usage_log(
    log_id: int,
    current_user=Depends(get_current_user)
):
    sql = """
        SELECT
            ul.*,
            f.fixture_name,
            mm.model_name,
            s.station_name
        FROM usage_logs ul
        LEFT JOIN fixtures f
            ON ul.fixture_id = f.id AND ul.customer_id = f.customer_id
        LEFT JOIN machine_models mm
            ON ul.model_id = mm.id AND ul.customer_id = mm.customer_id
        LEFT JOIN stations s
            ON ul.station_id = s.id AND ul.customer_id = s.customer_id
        WHERE ul.id = %s
    """

    rows = db.execute_query(sql, (log_id,))
    if not rows:
        raise HTTPException(404, "使用記錄不存在")

    return UsageWithDetails(**rows[0])


# ============================================================
# 4️⃣ 刪除使用記錄
# ============================================================

@router.delete(
    "/{log_id}",
    summary="刪除使用記錄",
    status_code=204
)
async def delete_usage_log(
    log_id: int,
    current_admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "DELETE FROM usage_logs WHERE id=%s",
        (log_id,),
    )
    if affected == 0:
        raise HTTPException(404, "使用記錄不存在")

    return None
