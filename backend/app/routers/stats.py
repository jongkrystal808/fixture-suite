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

# ============================================================
# Dashboard（Minimal v3）
# ============================================================

@router.get("/dashboard", summary="Dashboard 今日統計（Minimal）")
async def get_dashboard_minimal(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    """
    僅回傳：
    - 今日收料總數
    - 今日退料總數
    - 即將更換治具數量
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
          AND transaction_date >= CURDATE()
          AND transaction_date < CURDATE() + INTERVAL 1 DAY
        """,
        (customer_id,)
    )

    receipt_count = receipt_rows[0]["cnt"] if receipt_rows else 0

    # ========================================================
    # 2️⃣ 今日退料總數
    # ========================================================
    return_rows = db.execute_query(
        """
        SELECT COUNT(*) AS cnt
        FROM material_transactions
        WHERE customer_id = %s
          AND transaction_type = 'return'
          AND transaction_date >= CURDATE()
          AND transaction_date < CURDATE() + INTERVAL 1 DAY
        """,
        (customer_id,)
    )

    return_count = return_rows[0]["cnt"] if return_rows else 0

    # ========================================================
    # 3️⃣ 即將更換數量
    # ========================================================
    try:
        replacement_rows = db.execute_query(
            """
            SELECT COUNT(*) AS cnt
            FROM view_upcoming_fixture_replacements
            WHERE customer_id = %s
              AND usage_ratio >= 0.8
            """,
            (customer_id,)
        )
        replacement_count = replacement_rows[0]["cnt"]
    except Exception:
        replacement_count = 0

    return {
        "receipt_count": receipt_count,
        "return_count": return_count,
        "replacement_count": replacement_count,
    }

