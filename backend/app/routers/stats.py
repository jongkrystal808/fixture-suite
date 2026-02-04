"""
統計與儀表板 API (v4.x)

設計原則：
- Dashboard：Event-based（即時事件）
- Stats Tab：State-based（DB View）
- customer_id 一律由 Header Context 注入
"""

from fastapi import APIRouter, Depends, Query
from datetime import date
from typing import Optional

from backend.app.dependencies import (
    get_current_user,
    get_current_customer_id,
)
from backend.app.database import db

router = APIRouter(
    prefix="/stats",
    tags=["統計資訊 Stats"]
)


# ============================================================
# 治具壽命狀態（v4.x 核心 Stats API）
# ============================================================
@router.get(
    "/fixture-lifespan",
    summary="治具壽命狀態（依使用次數）"
)
async def get_fixture_lifespan(
    fixture_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(
        default=None,
        description="normal | warning | expired | no_cycle"
    ),
    skip: int = Query(default=0),
    limit: int = Query(default=20),

    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    base_sql = """
        FROM view_fixture_lifespan_status
        WHERE customer_id = %s
    """
    params = [customer_id]

    if fixture_id:
        base_sql += " AND fixture_id = %s"
        params.append(fixture_id)

    if status:
        base_sql += " AND lifespan_status = %s"
        params.append(status)

    # 1️⃣ 先算 total（不加 LIMIT）
    count_sql = "SELECT COUNT(*) AS cnt " + base_sql
    total = db.execute_query(count_sql, tuple(params))[0]["cnt"]

    # 2️⃣ 再取分頁資料
    data_sql = """
        SELECT
            customer_id,
            fixture_id,
            fixture_name,
            cycle_unit,
            replacement_cycle,
            total_uses,
            usage_ratio,
            remaining_uses,
            lifespan_status
    """ + base_sql + """
        ORDER BY (usage_ratio IS NULL), usage_ratio DESC
        LIMIT %s OFFSET %s
    """
    data_params = params + [limit, skip]

    rows = db.execute_query(data_sql, tuple(data_params))

    return {
        "total": total,
        "items": rows
    }


# ============================================================
#最大開站數（View）
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
# 序號狀態（View）
# ============================================================

@router.get("/serial-status", summary="序號狀態統計")
async def get_serial_status(
    fixture_id: Optional[str] = Query(default=None),
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
# 6. 儀表板 Dashboard（Event-based + State Summary）
# ============================================================

@router.get("/dashboard", summary="儀表板資料（v4.x FINAL）")
async def get_dashboard_stats(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    """
    Dashboard 設計原則：
    - Event-based：今天發生了什麼（收 / 退）
    - State-based：目前整體狀態（治具總覽，來自 View）
    - 不進行前端推算
    """

    # ========================================================
    # 1️⃣ 今日收料（Event-based）
    # ========================================================
    today_in_items = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(fd.quantity, 0)

                    WHEN t.record_type = 'batch'
                        THEN COALESCE(mi.cnt, 0)

                    WHEN t.record_type = 'individual'
                        THEN 1

                    ELSE 0
                END
            ) AS qty
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
          AND t.transaction_date >= CURDATE()
          AND t.transaction_date < CURDATE() + INTERVAL 1 DAY
        GROUP BY t.fixture_id
        """,
        (customer_id,)
    )

    today_in_total = sum((r.get("qty") or 0) for r in today_in_items)

    # ========================================================
    # 2️⃣ 今日退料（Event-based）
    # ========================================================
    today_out_items = db.execute_query(
        """
        SELECT
            t.fixture_id,
            SUM(
                CASE
                    WHEN t.record_type = 'datecode'
                        THEN COALESCE(fd.quantity, 0)

                    WHEN t.record_type = 'batch'
                        THEN COALESCE(mi.cnt, 0)

                    WHEN t.record_type = 'individual'
                        THEN 1

                    ELSE 0
                END
            ) AS qty
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
          AND t.transaction_date >= CURDATE()
          AND t.transaction_date < CURDATE() + INTERVAL 1 DAY
        GROUP BY t.fixture_id
        """,
        (customer_id,)
    )

    today_out_total = sum((r.get("qty") or 0) for r in today_out_items)

    # ========================================================
    # 3️⃣ 即將更換治具（State-based View，允許不存在）
    # ========================================================
    try:
        upcoming_replacements = db.execute_query(
            """
            SELECT
                fixture_id,
                fixture_name,
                usage_ratio
            FROM view_upcoming_fixture_replacements
            WHERE customer_id = %s
              AND usage_ratio >= 0.8
            ORDER BY usage_ratio DESC
            LIMIT 20
            """,
            (customer_id,)
        )
    except Exception:
        # view 尚未建立或暫時不可用時，不影響 Dashboard
        upcoming_replacements = []

    # ========================================================
    # 4️⃣ 治具整體狀態總覽（State-based View）
    # ========================================================
    fixture_summary_rows = db.execute_query(
        """
        SELECT
            total_fixtures,
            fixtures_in_stock,
            fixtures_deployed,
            fixtures_maintenance,
            fixtures_scrapped
        FROM view_fixture_dashboard_stats
        WHERE customer_id = %s
        """,
        (customer_id,)
    )

    fixture_summary = (
        fixture_summary_rows[0]
        if fixture_summary_rows
        else {
            "total_fixtures": 0,
            "fixtures_in_stock": 0,
            "fixtures_deployed": 0,
            "fixtures_maintenance": 0,
            "fixtures_scrapped": 0,
        }
    )

    # ========================================================
    # Response（前端可直接使用）
    # ========================================================
    return {
        # Event-based
        "today_in": {
            "total": today_in_total,
            "items": today_in_items,
        },
        "today_out": {
            "total": today_out_total,
            "items": today_out_items,
        },

        # State-based
        "fixture_summary": fixture_summary,

        # Mixed（State view + rule）
        "upcoming_replacements": upcoming_replacements,
    }
