from fastapi import APIRouter, Depends, Query
from backend.app.dependencies import get_current_user
from backend.app.database import db
from datetime import date

router = APIRouter(
    prefix="/stats",
    tags=["Stats"]
)


@router.get("/dashboard")
def get_dashboard_stats(
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    today = date.today()

    # --------------------------------------------------
    # 1️⃣ 今日收料
    # --------------------------------------------------
    today_in_items = db.execute_query("""
        SELECT
            fixture_id,
            SUM(quantity) AS qty
        FROM material_transactions
        WHERE customer_id = %s
          AND transaction_type = 'receipt'
          AND transaction_date = %s
        GROUP BY fixture_id
    """, (customer_id, today))

    today_in_total = sum((r["qty"] or 0) for r in today_in_items)

    # --------------------------------------------------
    # 2️⃣ 今日退料
    # --------------------------------------------------
    today_out_items = db.execute_query("""
        SELECT
            fixture_id,
            SUM(quantity) AS qty
        FROM material_transactions
        WHERE customer_id = %s
          AND transaction_type = 'return'
          AND transaction_date = %s
        GROUP BY fixture_id
    """, (customer_id, today))

    today_out_total = sum((r["qty"] or 0) for r in today_out_items)

    # --------------------------------------------------
    # 3️⃣ 即將更換治具（View）
    # --------------------------------------------------
    upcoming = db.execute_query("""
        SELECT
            fixture_id,
            fixture_name,
            cycle_unit,
            total_uses,
            replacement_cycle,
            used_days,
            usage_ratio
        FROM view_upcoming_fixture_replacements
        WHERE customer_id = %s
          AND usage_ratio >= 0.8
        ORDER BY usage_ratio DESC
        LIMIT 20
    """, (customer_id,))

    # --------------------------------------------------
    # 4️⃣ 庫存概覽
    # --------------------------------------------------
    inventory = db.execute_query("""
        SELECT
            f.id AS fixture_id,
            f.fixture_name,
            f.storage_location,
            f.status,
            f.replacement_cycle,
            o.primary_owner_id,
            COALESCE(fus.total_uses, 0) AS total_uses
        FROM fixtures f
        LEFT JOIN owners o ON o.id = f.owner_id
        LEFT JOIN fixture_usage_summary fus
          ON fus.fixture_id = f.id
         AND fus.customer_id = f.customer_id
        WHERE f.customer_id = %s
        ORDER BY f.id
        LIMIT 200
    """, (customer_id,))

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
