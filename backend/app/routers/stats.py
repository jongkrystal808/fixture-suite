"""
統計與查詢 API 路由
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List

from backend.app.database import db
from backend.app.routers.auth import get_current_user

router = APIRouter(tags=["統計"])

@router.get("/summary")
async def get_summary(current_user = Depends(get_current_user)) -> Dict:
    """取得統計摘要"""
    # 總治具數
    total = db.execute_query("SELECT COUNT(*) as count FROM fixtures")[0]['count']

    # 啟用中的治具
    active = db.execute_query(
        "SELECT COUNT(*) as count FROM fixtures WHERE status = '正常'"
    )[0]['count']

    # 需要更換的治具
    need_replacement = db.execute_query(
        "SELECT COUNT(*) as count FROM view_fixture_status WHERE replacement_status = '需更換'"
    )[0]['count']

    # 最近收料記錄
    recent_receipts = db.execute_query(
        "SELECT * FROM receipts ORDER BY created_at DESC LIMIT 5"
    )

    # 最近退料記錄
    recent_returns = db.execute_query(
        "SELECT * FROM returns_table ORDER BY created_at DESC LIMIT 5"
    )

    return {
        "total_fixtures": total,
        "active_fixtures": active,
        "need_replacement": need_replacement,
        "recent_receipts": recent_receipts,
        "recent_returns": recent_returns
    }

@router.get("/max-stations")
async def get_max_stations(
    model_id: str = Query(..., description="機種代碼"),
    current_user = Depends(get_current_user)
) -> List[Dict]:
    """查詢機種最大開站數"""
    results = db.execute_query(
        """
        SELECT 
            station_code,
            station_name,
            max_stations_for_this_station
        FROM view_model_max_stations
        WHERE model_id = %s
        ORDER BY station_code
        """,
        (model_id,)
    )

    if not results:
        raise HTTPException(status_code=404, detail="找不到該機種的開站數資訊")

    return results

@router.get("/station-requirements")
async def get_station_requirements(
    model_id: str = Query(..., description="機種代碼"),
    station_id: int = Query(..., description="站點 ID"),
    current_user = Depends(get_current_user)
) -> List[Dict]:
    """查詢指定機種與站點的治具需求"""
    results = db.execute_query(
        """
        SELECT 
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            f.self_purchased_qty + f.customer_supplied_qty as stock_qty,
            FLOOR((f.self_purchased_qty + f.customer_supplied_qty) / fr.required_qty) as possible_stations
        FROM fixture_requirements fr
        JOIN fixtures f ON fr.fixture_id = f.fixture_id
        WHERE fr.model_id = %s 
          AND fr.station_id = %s
          AND f.status = '正常'
        ORDER BY possible_stations ASC
        """,
        (model_id, station_id)
    )

    return results