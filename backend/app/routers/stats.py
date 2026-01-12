"""
統計與儀表板 API (v4.x)
符合 Event-based Material Transactions 模型
"""

from fastapi import APIRouter, Depends, Query
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.database import db
from datetime import date

router = APIRouter(
    prefix="/stats",
    tags=["統計資訊 Stats"]
)

# ============================================================
# 1. 統計摘要 SUMMARY
# ============================================================

@router.get("/summary", summary="統計摘要")
async def get_summary(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):

    # --------------------------------------------------
    # 總治具數
    # --------------------------------------------------
    total_fixtures = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM fixtures
        WHERE customer_id = %s
        """,
        (customer_id,)
    )[0]["cnt"]

    # --------------------------------------------------
    # 使用中（被部署）
    # --------------------------------------------------
    using_count = db.execute_query(
        """
        SELECT COUNT(DISTINCT fixture_id) AS cnt
        FROM fixture_deployments
        WHERE customer_id = %s
        """,
        (customer_id,)
    )[0]["cnt"]

    # --------------------------------------------------
    # 報廢數
    # --------------------------------------------------
    scrap_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM fixtures
        WHERE customer_id = %s
          AND status = 'scrapped'
        """,
        (customer_id,)
    )[0]["cnt"]

    # --------------------------------------------------
    # 收料 TOP 5（v4.x 正確算法）
    # --------------------------------------------------
    recent_receipts = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(fd.quantity, 0)
                    ELSE COALESCE(mi.cnt, 0)
                END
            ) AS count
        FROM material_transactions t
        LEFT JOIN (
            SELECT transaction_id, COUNT(*) AS cnt
            FROM material_transaction_items
            GROUP BY transaction_id
        ) mi ON mi.transaction_id = t.id
        LEFT JOIN fixture_datecode_transactions fd
               ON fd.transaction_id = t.id
              AND fd.transaction_type = 'receipt'
        WHERE t.customer_id = %s
          AND t.transaction_type = 'receipt'
        GROUP BY t.fixture_id
        ORDER BY count DESC
        LIMIT 5
        """,
        (customer_id,)
    )

    # --------------------------------------------------
    # 退料 TOP 5（v4.x 正確算法）
    # --------------------------------------------------
    recent_returns = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(fd.quantity, 0)
                    ELSE COALESCE(mi.cnt, 0)
                END
            ) AS count
        FROM material_transactions t
        LEFT JOIN (
            SELECT transaction_id, COUNT(*) AS cnt
            FROM material_transaction_items
            GROUP BY transaction_id
        ) mi ON mi.transaction_id = t.id
        LEFT JOIN fixture_datecode_transactions fd
               ON fd.transaction_id = t.id
              AND fd.transaction_type = 'return'
        WHERE t.customer_id = %s
          AND t.transaction_type = 'return'
        GROUP BY t.fixture_id
        ORDER BY count DESC
        LIMIT 5
        """,
        (customer_id,)
    )

    return {
        "total_fixtures": total_fixtures,
        "in_stock_qty": max(total_fixtures - using_count - scrap_count, 0),
        "using_count": using_count,
        "scrap_count": scrap_count,
        "recent_receipts": recent_receipts,
        "recent_returns": recent_returns
    }

# ============================================================
# 2. 治具狀態統計（資料庫 View）
# ============================================================

@router.get("/fixture-status", summary="治具狀態統計")
async def get_fixture_status(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    return db.execute_query(
        """
        SELECT *
        FROM view_fixture_status
        WHERE customer_id = %s
        """,
        (customer_id,)
    )

# ============================================================
# 3. 最大開站數（資料庫 View）
# ============================================================

@router.get("/max-stations", summary="最大開站數")
async def get_max_stations(
    model_id: str = Query(...),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    return db.execute_query(
        """
        SELECT
            station_id,
            station_name,
            max_available_stations,
            limiting_fixtures
        FROM view_model_max_stations
        WHERE model_id = %s
        """,
        (model_id,)
    )

# ============================================================
# 4. 序號統計（資料庫 View）
# ============================================================

@router.get("/serial-status", summary="序號統計")
async def get_serial_status(
    fixture_id: str = Query(None),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    sql = """
        SELECT *
        FROM view_serial_status
        WHERE customer_id = %s
    """
    params = [customer_id]

    if fixture_id:
        sql += " AND fixture_id = %s"
        params.append(fixture_id)

    return db.execute_query(sql, tuple(params))

# ============================================================
# 5. 單治具使用統計
# ============================================================

@router.get("/fixture-usage", summary="單治具使用統計")
async def get_fixture_usage(
    fixture_id: str = Query(...),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):

    usage_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM usage_logs
        WHERE customer_id = %s
          AND fixture_id = %s
        """,
        (customer_id, fixture_id)
    )[0]["cnt"]

    replacement_count = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM replacement_logs
        WHERE customer_id = %s
          AND fixture_id = %s
        """,
        (customer_id, fixture_id)
    )[0]["cnt"]

    recent_usage = db.execute_query(
        """
        SELECT *
        FROM usage_logs
        WHERE customer_id = %s
          AND fixture_id = %s
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
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    return db.execute_query(
        """
        SELECT
            fr.fixture_id,
            f.fixture_name,
            fr.required_qty,
            fr.station_id
        FROM fixture_requirements fr
        JOIN fixtures f ON f.id = fr.fixture_id
        WHERE fr.model_id = %s
          AND fr.customer_id = %s
        ORDER BY fr.station_id, fr.fixture_id
        """,
        (model_id, customer_id)
    )



@router.get("/dashboard")
def get_dashboard_stats(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    today = date.today()

    # --------------------------------------------------
    # 1️⃣ 今日收料（v4.x 正確算法）
    # --------------------------------------------------
    today_in_items = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(i.quantity, 0)
                    ELSE 1
                END
            ) AS qty
        FROM material_transactions t
        LEFT JOIN material_transaction_items i
            ON i.transaction_id = t.id
        WHERE t.customer_id = %s
          AND t.transaction_type = 'receipt'
          AND DATE(t.transaction_date) = %s
        GROUP BY t.fixture_id
        """,
        (customer_id, today)
    )

    today_in_total = sum((r.get("qty") or 0) for r in today_in_items)

    # --------------------------------------------------
    # 2️⃣ 今日退料（v4.x 正確算法）
    # --------------------------------------------------
    today_out_items = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(i.quantity, 0)
                    ELSE 1
                END
            ) AS qty
        FROM material_transactions t
        LEFT JOIN material_transaction_items i
            ON i.transaction_id = t.id
        WHERE t.customer_id = %s
          AND t.transaction_type = 'return'
          AND DATE(t.transaction_date) = %s
        GROUP BY t.fixture_id
        """,
        (customer_id, today)
    )

    today_out_total = sum((r.get("qty") or 0) for r in today_out_items)

    # --------------------------------------------------
    # 3️⃣ 即將更換治具（View，允許不存在）
    # --------------------------------------------------
    try:
        upcoming = db.execute_query(
            """
            SELECT *
            FROM view_upcoming_fixture_replacements
            WHERE customer_id = %s
              AND usage_ratio >= 0.8
            ORDER BY usage_ratio DESC
            LIMIT 20
            """,
            (customer_id,)
        )
    except Exception:
        upcoming = []

    # --------------------------------------------------
    # 4️⃣ 庫存概覽（穩定版）
    # --------------------------------------------------
    try:
        inventory = db.execute_query(
            """
            SELECT
                f.id AS fixture_id,
                f.fixture_name,
                f.storage_location,
                f.status,
                f.replacement_cycle,
                u.username AS owner_name
            FROM fixtures f
            LEFT JOIN owners o ON o.id = f.owner_id
            LEFT JOIN users u ON u.id = o.primary_user_id
            WHERE f.customer_id = %s
            ORDER BY f.id
            LIMIT 200
            """,
            (customer_id,)
        )
    except Exception:
        inventory = []

    return {
        "today_in": {
            "total": today_in_total,
            "items": today_in_items
        },
        "today_out": {
            "total": today_out_total,
            "items": today_out_items
        },
        "upcoming_replacements": upcoming,
        "inventory": inventory
    }
