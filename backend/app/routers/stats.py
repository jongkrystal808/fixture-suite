"""
統計與儀表板 API (v6)

設計原則：
- Dashboard：Event-based（即時事件）
- Stats Tab：State-based（DB View）
- customer_id 一律由 Header Context 注入
"""

from fastapi import APIRouter, Depends, Query
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
# Dashboard（Event-based）
# ============================================================

@router.get("/dashboard", summary="Dashboard 今日統計（v6 format）")
async def get_dashboard(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    """
    回傳格式：
    {
        today_in: { total, items },
        today_out: { total, items },
        upcoming_replacements: [],
        fixture_summary: {}
    }
    """

    # ========================================================
    # 1️⃣ 今日收料總數
    # ========================================================
    receipt_rows = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM material_transactions
        WHERE customer_id = %s
          AND transaction_type = 'receipt'
          AND DATE(transaction_date) = CURDATE()
        """,
        (customer_id,)
    )

    receipt_count = receipt_rows[0]["cnt"] if receipt_rows else 0

    # ========================================================
    # 1️⃣ 今日收料明細（依治具分組）
    # ========================================================
    receipt_items = db.execute_query(
        """
        SELECT mti.fixture_id,
               SUM(mti.quantity) AS qty
        FROM material_transactions mt
        JOIN material_transaction_items mti
          ON mt.id = mti.transaction_id
        WHERE mt.customer_id = %s
          AND mt.transaction_type = 'receipt'
          AND DATE(mt.transaction_date) = CURDATE()
        GROUP BY mti.fixture_id
        ORDER BY qty DESC
        """,
        (customer_id,)
    ) or []

    # ========================================================
    # 2️⃣ 今日退料總數
    # ========================================================
    return_rows = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM material_transactions
        WHERE customer_id = %s
          AND transaction_type = 'return'
          AND DATE(transaction_date) = CURDATE()
        """,
        (customer_id,)
    )

    return_count = return_rows[0]["cnt"] if return_rows else 0

    # ========================================================
    # 2️⃣ 今日退料明細（依治具分組）
    # ========================================================
    return_items = db.execute_query(
        """
        SELECT mti.fixture_id,
               SUM(mti.quantity) AS quantity
        FROM material_transactions mt
        JOIN material_transaction_items mti
          ON mt.id = mti.transaction_id
        WHERE mt.customer_id = %s
          AND mt.transaction_type = 'return'
          AND DATE(mt.transaction_date) = CURDATE()
        GROUP BY mti.fixture_id
        ORDER BY quantity DESC
        """,
        (customer_id,)
    ) or []

    # ========================================================
    # 3️⃣ 即將更換治具
    # ========================================================
    try:
        upcoming = db.execute_query(
            """
            SELECT fixture_id, fixture_name, usage_ratio
            FROM view_upcoming_fixture_replacements
            WHERE customer_id = %s
              AND usage_ratio >= 0.8
            """,
            (customer_id,)
        ) or []
    except Exception:
        upcoming = []

    # ========================================================
    # 4️⃣ 回傳 v6 格式
    # ========================================================
    return {
        "today_in": {
            "total": receipt_count,
            "items": receipt_items
        },
        "today_out": {
            "total": return_count,
            "items": return_items
        },
        "upcoming_replacements": upcoming,
        "fixture_summary": {}
    }
