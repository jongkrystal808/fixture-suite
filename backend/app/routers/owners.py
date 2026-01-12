"""
Owners API (v4.2 - user assignment aligned)
對齊：
- owners.primary_user_id / secondary_user_id
- 無 email / customer_name
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_customer_id,
)
from backend.app.models.owner import (
    OwnerCreate,
    OwnerUpdate,
    OwnerResponse,
    OwnerListResponse,
    OwnerSimple,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/owners",
    tags=["治具負責人 Owners"]
)

# ============================================================
# 🔧 Internal Helper
# ============================================================

def fetch_owner(owner_id: int, customer_id: str):
    rows = db.execute_query(
        """
        SELECT
            o.id,
            o.customer_id,
            o.primary_user_id,
            u1.username AS primary_user_name,
            o.secondary_user_id,
            u2.username AS secondary_user_name,
            o.note,
            o.is_active,
            o.created_at
        FROM owners o
        LEFT JOIN users u1 ON u1.id = o.primary_user_id
        LEFT JOIN users u2 ON u2.id = o.secondary_user_id
        WHERE o.id = %s
          AND (o.customer_id = %s OR o.customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )
    return rows[0] if rows else None


# ============================================================
# 取得列表
# ============================================================

@router.get("", response_model=OwnerListResponse)
async def list_owners(
    search: Optional[str] = Query(None),
    is_active: Optional[int] = Query(1),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["(o.customer_id = %s OR o.customer_id IS NULL)"]
    params = [customer_id]

    if is_active is not None:
        where.append("o.is_active = %s")
        params.append(is_active)

    if search:
        where.append("(u1.username LIKE %s OR u2.username LIKE %s)")
        params.extend([f"%{search}%"] * 2)

    where_sql = " AND ".join(where)

    base_sql = f"""
        FROM owners o
        LEFT JOIN users u1 ON u1.id = o.primary_user_id
        LEFT JOIN users u2 ON u2.id = o.secondary_user_id
        WHERE {where_sql}
    """

    rows = db.execute_query(
        f"""
        SELECT
            o.id,
            o.customer_id,
            o.primary_user_id,
            u1.username AS primary_user_name,
            o.secondary_user_id,
            u2.username AS secondary_user_name,
            o.note,
            o.is_active,
            o.created_at
        {base_sql}
        ORDER BY o.id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, skip])
    )

    total = db.execute_query(
        f"SELECT COUNT(*) AS total {base_sql}",
        tuple(params)
    )[0]["total"]

    return OwnerListResponse(
        total=total,
        owners=[OwnerResponse(**row) for row in rows]
    )


# ============================================================
# Simple（下拉）
# ============================================================

@router.get("/simple", response_model=List[OwnerSimple])
async def owner_simple_list(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT
            o.id,
            o.primary_user_id,
            u.username AS primary_user_name
        FROM owners o
        JOIN users u ON u.id = o.primary_user_id
        WHERE o.is_active = 1
          AND (o.customer_id = %s OR o.customer_id IS NULL)
        ORDER BY u.username
        """,
        (customer_id,)
    )
    return [OwnerSimple(**row) for row in rows]


# ============================================================
# 新增
# ============================================================

@router.post("", response_model=OwnerResponse, status_code=201)
async def create_owner(
    data: OwnerCreate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    new_id = db.execute_insert(
        """
        INSERT INTO owners
        (customer_id, primary_user_id, secondary_user_id, note, is_active)
        VALUES (%s, %s, %s, %s, 1)
        """,
        (
            customer_id,
            data.primary_user_id,
            data.secondary_user_id,
            data.note,
        )
    )

    row = fetch_owner(new_id, customer_id)
    if not row:
        raise HTTPException(500, "建立後查詢失敗")

    return OwnerResponse(**row)


# ============================================================
# 取得單筆
# ============================================================

@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    row = fetch_owner(owner_id, customer_id)
    if not row:
        raise HTTPException(404, "負責人不存在")
    return OwnerResponse(**row)


# ============================================================
# 更新
# ============================================================

@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: int,
    data: OwnerUpdate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    fields = []
    params = []

    for k, v in data.model_dump(exclude_unset=True).items():
        fields.append(f"{k}=%s")
        params.append(v)

    if not fields:
        raise HTTPException(400, "沒有可更新欄位")

    params.extend([owner_id, customer_id])

    db.execute_update(
        f"""
        UPDATE owners
        SET {", ".join(fields)}
        WHERE id=%s
          AND (customer_id=%s OR customer_id IS NULL)
        """,
        tuple(params)
    )

    row = fetch_owner(owner_id, customer_id)
    if not row:
        raise HTTPException(500, "更新後查詢失敗")

    return OwnerResponse(**row)
