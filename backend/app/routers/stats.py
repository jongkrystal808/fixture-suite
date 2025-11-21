"""
統計與儀表板 API (v3.0)
Stats & Dashboard API

所有統計均需依 customer_id 隔離
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.app.database import db
from backend.app.dependencies import get_current_user

router = APIRouter(prefix="/stats", tags=["統計 Stats"])


# ============================================================
# 工具：安全取 INT
# ============================================================

def _int(sql: str, params: dict) -> int:
    try:
        row = db.execute_query(sql, params)
        if not row:
            return 0
        return int(list(row[0].values())[0] or 0)
    except Exception:
        return 0


# ============================================================
# 1️⃣ 儀表板總覽 (依 customer_id)
# ============================================================

@router.get("/summary")
async def get_summary(
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
) -> Dict[str, Any]:
    """
    儀表板主頁的統計摘要 (完全 v3.0)
    """

    # v3.0 fixtures 表的數量統計
    total_fixtures = _int(
        "SELECT COUNT(*) FROM fixtures WHERE customer_id=%(customer_id)s",
        {"customer_id": customer_id}
    )

    # v3.0 fixtures 使用 view_fixture_status 來看是否需更換
    need_replacement = _int(
        """
        SELECT COUNT(*) 
        FROM view_fixture_status 
        WHERE customer_id=%(customer_id)s AND replacement_status='需更換'
        """,
        {"customer_id": customer_id}
    )

    # 使用 fixtures.available_qty = 可用治具數量
    active_fixtures = _int(
        """
        SELECT COUNT(*) 
        FROM fixtures 
        WHERE customer_id=%(customer_id)s AND available_qty > 0
        """,
        {"customer_id": customer_id}
    )

    # 收料/退料資料（v3.0 receipts & returns_table 都含 customer_id）
    today_receipts = _int(
        """
        SELECT COUNT(*) 
        FROM receipts 
        WHERE customer_id=%(customer_id)s 
          AND DATE(created_at)=CURDATE()
        """,
        {"customer_id": customer_id}
    )

    month_receipts = _int(
        """
        SELECT COUNT(*) 
        FROM receipts
        WHERE customer_id=%(customer_id)s
          AND YEAR(created_at)=YEAR(CURDATE())
          AND MONTH(created_at)=MONTH(CURDATE())
        """,
        {"customer_id": customer_id}
    )

    today_returns = _int(
        """
        SELECT COUNT(*) 
        FROM returns_table 
        WHERE customer_id=%(customer_id)s 
          AND DATE(created_at)=CURDATE()
        """,
        {"customer_id": customer_id}
    )

    month_returns = _int(
        """
        SELECT COUNT(*) 
        FROM returns_table
        WHERE customer_id=%(customer_id)s
          AND YEAR(created_at)=YEAR(CURDATE())
          AND MONTH(created_at)=MONTH(CURDATE())
        """,
        {"customer_id": customer_id}
    )

    # 最近收料
    recent_receipts = db.execute_query(
        """
        SELECT id, type, customer_id, order_no, fixture_id, serial_start, serial_end,
               serials, operator, note, created_at
        FROM receipts
        WHERE customer_id=%(customer_id)s
        ORDER BY created_at DESC
        LIMIT 5
        """,
        {"customer_id": customer_id}
    )

    # 最近退料
    recent_returns = db.execute_query(
        """
        SELECT id, customer_id, order_no, fixture_id, serials, operator, note, created_at
        FROM returns_table
        WHERE customer_id=%(customer_id)s
        ORDER BY created_at DESC
        LIMIT 5
        """,
        {"customer_id": customer_id}
    )

    # 即將更換
    try:
        upcoming_replacements = db.execute_query(
            """
            SELECT fixture_id, fixture_name, last_replacement_date, cycle_unit, replacement_cycle
            FROM view_fixture_status
            WHERE customer_id=%(customer_id)s
              AND replacement_status='即將更換'
            ORDER BY last_replacement_date ASC
            LIMIT 10
            """,
            {"customer_id": customer_id}
        )
    except Exception:
        upcoming_replacements = []

    return {
        "totals": {
            "fixtures": total_fixtures,
            "active": active_fixtures,
            "need_replacement": need_replacement,
        },
        "receipts": {
            "today": today_receipts,
            "month": month_receipts,
            "recent": recent_receipts,
        },
        "returns": {
            "today": today_returns,
            "month": month_returns,
            "recent": recent_returns,
        },
        "upcoming_replacements": upcoming_replacements,
        "generated_at": datetime.utcnow().isoformat() + "Z"
    }


# ============================================================
# 2️⃣ 機種最大開站數 (v3.0 view_model_max_stations)
# ============================================================

@router.get("/max-stations")
async def get_max_stations(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    """
    查詢一個機種的站點最大開站數 (v3.0)
    """

    rows = db.execute_query(
        """
        SELECT station_id, max_qty
        FROM view_model_max_stations
        WHERE customer_id=%(customer_id)s
          AND model_id=%(model_id)s
        ORDER BY station_id
        """,
        {"customer_id": customer_id, "model_id": model_id}
    )

    return rows


# ============================================================
# 3️⃣ 站點治具需求數量 (fixture_requirements v3.0)
# ============================================================

@router.get("/requirements")
async def get_fixture_requirements_stats(
    model_id: str = Query(...),
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    """
    每個站點需要哪些治具（匯總）
    """

    rows = db.execute_query(
        """
        SELECT station_id, COUNT(*) AS fixture_types, SUM(required_qty) AS total_required
        FROM fixture_requirements
        WHERE customer_id=%(customer_id)s AND model_id=%(model_id)s
        GROUP BY station_id
        ORDER BY station_id
        """,
        {"customer_id": customer_id, "model_id": model_id}
    )

    return rows


# ============================================================
# 4️⃣ 治具狀態統計（v3.0 fixtures）
# ============================================================

@router.get("/fixture-status")
async def get_fixture_status(
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    """
    回傳治具數量狀態：
    available / deployed / maintenance / scrapped / returned
    """

    sql = """
        SELECT
            SUM(available_qty) AS available_qty,
            SUM(deployed_qty) AS deployed_qty,
            SUM(maintenance_qty) AS maintenance_qty,
            SUM(scrapped_qty) AS scrapped_qty,
            SUM(returned_qty) AS returned_qty
        FROM fixtures
        WHERE customer_id=%(customer_id)s
    """

    rows = db.execute_query(sql, {"customer_id": customer_id})
    return rows[0] if rows else {}


# ============================================================
# 5️⃣ 使用記錄統計 (v3.0 usage_logs)
# ============================================================

@router.get("/usage-summary")
async def usage_summary(
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    total_usage = _int(
        "SELECT COUNT(*) FROM usage_logs WHERE customer_id=%(customer_id)s",
        {"customer_id": customer_id}
    )

    today_usage = _int(
        """
        SELECT COUNT(*) 
        FROM usage_logs 
        WHERE customer_id=%(customer_id)s AND DATE(created_at)=CURDATE()
        """,
        {"customer_id": customer_id}
    )

    return {
        "total_usage_logs": total_usage,
        "today_usage_logs": today_usage,
    }


# ============================================================
# 6️⃣ 更換記錄統計 (v3.0 replacement_logs)
# ============================================================

@router.get("/replacement-summary")
async def replacement_summary(
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    total_repl = _int(
        "SELECT COUNT(*) FROM replacement_logs WHERE customer_id=%(customer_id)s",
        {"customer_id": customer_id}
    )

    today_repl = _int(
        """
        SELECT COUNT(*) 
        FROM replacement_logs 
        WHERE customer_id=%(customer_id)s AND DATE(created_at)=CURDATE()
        """,
        {"customer_id": customer_id}
    )

    return {
        "total_replacement_logs": total_repl,
        "today_replacement_logs": today_repl,
    }
