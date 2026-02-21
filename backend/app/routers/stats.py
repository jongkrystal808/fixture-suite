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
# Lifecycle 狀態（v6 雙模型整合）
# 來源：view_lifecycle_status_v2
# ============================================================

@router.get("/lifecycle-status", summary="治具壽命狀態（Serial + Datecode）")
async def get_lifecycle_status(
    fixture_id: Optional[str] = Query(default=None),
    lifecycle_mode: Optional[str] = Query(default=None),  # serial / fixture
    status: Optional[str] = Query(default=None),          # normal / warning / expired
    skip: int = Query(default=0),
    limit: int = Query(default=50),
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    """
    v6 正式壽命 API
    讀取 view_lifecycle_status_v2
    """

    sql = """
        SELECT *
        FROM view_lifecycle_status_v2
        WHERE customer_id = %s
    """
    params = [customer_id]

    if fixture_id:
        sql += " AND fixture_id = %s"
        params.append(fixture_id)

    if lifecycle_mode:
        sql += " AND lifecycle_mode = %s"
        params.append(lifecycle_mode)

    if status:
        sql += " AND status = %s"
        params.append(status)

    sql += " ORDER BY usage_ratio DESC"
    sql += " LIMIT %s OFFSET %s"
    params.extend([limit, skip])

    rows = db.execute_query(sql, tuple(params)) or []

    return {
        "data": rows,
        "count": len(rows),
        "skip": skip,
        "limit": limit
    }


# ============================================================
# Dashboard（Event-based）
# ============================================================

@router.get("/dashboard", summary="Dashboard 今日統計（v6 format）")
async def get_dashboard(
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):

    # ========================================================
    # 今日收料總數
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
    # 今日退料總數
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
    # 即將更換治具（從 lifecycle view 來）
    # ========================================================
    upcoming = db.execute_query(
        """
        SELECT fixture_id,
               lifecycle_mode,
               actual_value,
               remaining_value,
               lifecycle_status,
               datecode
        FROM view_lifecycle_status_v2
        WHERE customer_id = %s
          AND actual_value >= warning_ratio
        ORDER BY actual_value DESC
        """,
        (customer_id,)
    ) or []

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