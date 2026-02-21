# /backend/app/routers/lifecycle_analysis.py

"""
Lifecycle Advanced Analysis
- MTBF
- Failure Rate
- Monthly Trend
- Lifespan Distribution
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id

router = APIRouter(
    prefix="/lifecycle-analysis",
    tags=["Lifecycle Analysis"]
)


# ============================================================
# 1️⃣ MTBF（平均壽命）
# ============================================================
@router.get("/mtbf", summary="平均壽命 (MTBF)")
def get_mtbf(
    fixture_id: Optional[str] = None,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    where.append("lifecycle_status IN ('premature_failure','normal_expired')")

    sql = f"""
        SELECT
            AVG(actual_value) AS avg_lifespan,
            COUNT(*) AS total_failures
        FROM view_lifecycle_status_v1
        WHERE {' AND '.join(where)}
    """

    row = db.execute_query(sql, tuple(params))[0]

    return {
        "average_lifespan": row["avg_lifespan"],
        "total_failures": row["total_failures"],
    }


# ============================================================
# 2️⃣ 提前失效率
# ============================================================
@router.get("/failure-rate", summary="提前失效率")
def get_failure_rate(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    sql = """
        SELECT
            SUM(lifecycle_status = 'premature_failure') AS premature,
            SUM(lifecycle_status = 'normal_expired') AS normal_expired
        FROM view_lifecycle_status_v1
        WHERE customer_id = %s
          AND lifecycle_status IN ('premature_failure','normal_expired')
    """

    row = db.execute_query(sql, (customer_id,))[0]

    premature = row["premature"] or 0
    normal = row["normal_expired"] or 0
    total = premature + normal

    rate = (premature / total * 100) if total > 0 else 0

    return {
        "premature_count": premature,
        "normal_expired_count": normal,
        "failure_rate_percent": round(rate, 2),
    }


# ============================================================
# 3️⃣ 每月提前失效趨勢
# ============================================================
@router.get("/monthly-trend", summary="每月提前失效趨勢")
def get_monthly_trend(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    sql = """
        SELECT
            DATE_FORMAT(scrapped_at, '%Y-%m') AS month,
            COUNT(*) AS premature_count
        FROM view_lifecycle_status_v1
        WHERE customer_id = %s
          AND lifecycle_status = 'premature_failure'
          AND scrapped_at IS NOT NULL
        GROUP BY month
        ORDER BY month
    """

    rows = db.execute_query(sql, (customer_id,))
    return rows


# ============================================================
# 4️⃣ 壽命分布
# ============================================================
@router.get("/lifespan-distribution", summary="壽命分布")
def get_lifespan_distribution(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    sql = """
        SELECT
            CASE
                WHEN actual_value < 10 THEN '<10'
                WHEN actual_value BETWEEN 10 AND 29 THEN '10-29'
                WHEN actual_value BETWEEN 30 AND 49 THEN '30-49'
                WHEN actual_value BETWEEN 50 AND 99 THEN '50-99'
                ELSE '100+'
            END AS lifespan_range,
            COUNT(*) AS total
        FROM view_lifecycle_status_v1
        WHERE customer_id = %s
          AND lifecycle_status IN ('premature_failure','normal_expired')
        GROUP BY lifespan_range
        ORDER BY lifespan_range
    """

    rows = db.execute_query(sql, (customer_id,))
    return rows