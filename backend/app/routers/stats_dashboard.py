from fastapi import APIRouter, Depends
from backend.app.dependencies import get_current_user
from backend.app.database import db
from datetime import date

router = APIRouter(
    prefix="/stats",
    tags=["Stats"]
)

@router.get("/dashboard")
def get_dashboard_stats(
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
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
            LEFT JOIN users u ON u.id = o.primary_owner_id
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
