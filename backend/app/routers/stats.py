"""
統計與儀表板 API (v3.0 - Fixed)
使用 v3.0 Material Transactions 結構
"""

from fastapi import APIRouter, Depends, Query
from backend.app.dependencies import get_current_user
from backend.app.database import db

router = APIRouter(
    prefix="/stats",
    tags=["統計資訊 Stats"]
)

# ============================================================
# 1. 統計摘要 SUMMARY
# ============================================================

@router.get("/summary", summary="統計摘要")
async def get_summary(
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # ✔ 總治具數量
    total_fixtures = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM fixtures
        WHERE customer_id=%s
        """,
        (customer_id,)
    )[0]["cnt"]

    # ✔ 使用中（被部署）
    using_count = db.execute_query(
        """
        SELECT COUNT(DISTINCT fixture_id) AS cnt
        FROM fixture_deployments
        WHERE customer_id=%s
        """,
        (customer_id,)
    )[0]["cnt"]

    # ✔ 報廢數量
    scrap_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM fixtures
        WHERE customer_id=%s AND status='scrapped'
        """,
        (customer_id,)
    )[0]["cnt"]

    # ✔ 收料熱門 TOP 5（從 material_transactions）
    recent_receipts = db.execute_query(
        """
        SELECT fixture_id, SUM(quantity) AS count
        FROM material_transactions
        WHERE customer_id=%s AND transaction_type='receipt'
        GROUP BY fixture_id
        ORDER BY count DESC
        LIMIT 5
        """,
        (customer_id,)
    )

    # ✔ 退料熱門 TOP 5（修正：GROUP_BY -> GROUP BY）
    recent_returns = db.execute_query(
        """
        SELECT fixture_id, SUM(quantity) AS count
        FROM material_transactions
        WHERE customer_id=%s AND transaction_type='return'
        GROUP BY fixture_id
        ORDER BY count DESC
        LIMIT 5
        """,
        (customer_id,)
    )

    return {
        "total_fixtures": total_fixtures,
        "available_qty": total_fixtures - using_count - scrap_count,
        "using_count": using_count,
        "scrap_count": scrap_count,
        "recent_receipts": recent_receipts,
        "recent_returns": recent_returns
    }

# ============================================================
# 2. 治具狀態統計（使用資料庫 View）
# ============================================================

@router.get("/fixture-status", summary="治具狀態統計")
async def get_fixture_status(
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT *
        FROM view_fixture_status
        WHERE customer_id=%s
        """,
        (customer_id,)
    )
    return rows

# ============================================================
# 3. 最大開站數（資料庫 view）
# ============================================================
@router.get("/max-stations", summary="最大開站數")
async def get_max_stations(
    model_id: str = Query(...),
    user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT
            station_id,
            station_name,
            max_available_stations,
            limiting_fixtures
        FROM view_model_max_stations
        WHERE model_id=%s
        """,
        (model_id,)
    )
    return rows


# ============================================================
# 4. 序號統計（資料庫 view）
# ============================================================

@router.get("/serial-status", summary="序號統計")
async def get_serial_status(
    customer_id: str = Query(...),
    fixture_id: str = Query(None),
    user=Depends(get_current_user)
):
    sql = """
        SELECT *
        FROM view_serial_status
        WHERE customer_id=%s
    """
    params = [customer_id]

    if fixture_id:
        sql += " AND fixture_id=%s"
        params.append(fixture_id)

    return db.execute_query(sql, tuple(params))

# ============================================================
# 5. 單治具使用統計
# ============================================================

@router.get("/fixture-usage", summary="單治具使用統計（使用次數 / 更換次數 / 最近使用）")
async def get_fixture_usage(
    fixture_id: str = Query(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    # 使用次數
    usage_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM usage_logs
        WHERE customer_id=%s AND fixture_id=%s
        """,
        (customer_id, fixture_id)
    )[0]["cnt"]

    # 更換次數
    replacement_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM replacement_logs
        WHERE customer_id=%s AND fixture_id=%s
        """,
        (customer_id, fixture_id)
    )[0]["cnt"]

    # 最近使用紀錄
    recent_usage = db.execute_query(
        """
        SELECT *
        FROM usage_logs
        WHERE customer_id=%s AND fixture_id=%s
        ORDER BY used_at DESC
        LIMIT 5
        """,
        (customer_id, fixture_id)
    )

    return {
        "usage_count": usage_count,
        "replacement_count": replacement_count,
        "recent_usage": recent_usage
    }

# ============================================================
# 6. 整個機種治具需求總表
# ============================================================

@router.get("/model-requirements", summary="整個機種治具需求總表")
async def get_model_requirements(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT fr.fixture_id,
               f.fixture_name,
               fr.required_qty,
               fr.station_id
        FROM fixture_requirements fr
        JOIN fixtures f ON f.id = fr.fixture_id
        WHERE fr.model_id=%s AND fr.customer_id=%s
        ORDER BY fr.station_id, fr.fixture_id
        """,
        (model_id, customer_id)
    )
    return rows