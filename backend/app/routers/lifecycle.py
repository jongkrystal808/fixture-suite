# /backend/app/routers/lifecycle.py

"""
Lifecycle Router (v1)

基於：
view_lifecycle_status_v1

用途：
- 預警清單
- Dashboard KPI
- 異常分析
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id

router = APIRouter(
    prefix="/lifecycle",
    tags=["Lifecycle Engine"]
)


# ============================================================
# 1️⃣ 預警清單
# ============================================================
@router.get("/alerts", summary="壽命預警清單")
def get_lifecycle_alerts(
    entity_type: Optional[str] = Query(
        default=None,
        description="serial / fixture"
    ),
    status: Optional[str] = Query(
        default=None,
        description="warning / expired / premature_failure"
    ),
    fixture_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["customer_id = %s"]
    params = [customer_id]

    if entity_type:
        where.append("entity_type = %s")
        params.append(entity_type)

    if status:
        where.append("lifecycle_status = %s")
        params.append(status)
    else:
        # 預設只顯示異常
        where.append("lifecycle_status IN ('warning','expired','premature_failure')")

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    sql = f"""
        SELECT *
        FROM view_lifecycle_status_v1
        WHERE {' AND '.join(where)}
        ORDER BY
            CASE lifecycle_status
                WHEN 'premature_failure' THEN 1
                WHEN 'expired' THEN 2
                WHEN 'warning' THEN 3
                ELSE 4
            END,
            remaining_value ASC
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])
    rows = db.execute_query(sql, tuple(params))
    return rows


# ============================================================
# 2️⃣ Dashboard Overview KPI
# ============================================================
@router.get("/overview", summary="Lifecycle KPI 總覽")
def get_lifecycle_overview(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    sql = """
        SELECT
            lifecycle_status,
            COUNT(*) AS total
        FROM view_lifecycle_status_v1
        WHERE customer_id = %s
        GROUP BY lifecycle_status
    """

    rows = db.execute_query(sql, (customer_id,))

    # 預設 0
    result = {
        "normal": 0,
        "warning": 0,
        "expired": 0,
        "premature_failure": 0,
    }

    for r in rows:
        result[r["lifecycle_status"]] = r["total"]

    return result


# ============================================================
# 3️⃣ 異常分析（premature 分析用）
# ============================================================
@router.get("/anomalies", summary="提前失效統計")
def get_lifecycle_anomalies(
    group_by: str = Query(
        default="fixture",
        description="fixture / model"
    ),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    if group_by == "model":
        group_field = "fixture_id"
    else:
        group_field = "fixture_id"

    sql = f"""
        SELECT
            {group_field},
            COUNT(*) AS premature_count
        FROM view_lifecycle_status_v1
        WHERE customer_id = %s
          AND lifecycle_status = 'premature_failure'
        GROUP BY {group_field}
        ORDER BY premature_count DESC
    """

    rows = db.execute_query(sql, (customer_id,))
    return rows
