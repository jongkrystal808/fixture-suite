"""
Owners API (v4.0 FINAL - FIXED)
治具負責人管理 API（user_id 正規化 / 多客戶隔離）
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

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

router = APIRouter(
    prefix="/owners",
    tags=["治具負責人 Owners"]
)

# ============================================================
# 取得負責人列表
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
        where.append(
            "(u1.username LIKE %s OR u2.username LIKE %s OR o.email LIKE %s)"
        )
        params.extend([f"%{search}%"] * 3)

    where_sql = " AND ".join(where)

    base_sql = f"""
        FROM owners o
        LEFT JOIN users u1 ON u1.id = o.primary_owner_id
        LEFT JOIN users u2 ON u2.id = o.secondary_owner_id
        WHERE {where_sql}
    """

    rows = db.execute_query(
        f"""
        SELECT
            o.id,
            o.customer_id,

            o.primary_owner_id,
            u1.username AS primary_owner_name,

            o.secondary_owner_id,
            u2.username AS secondary_owner_name,

            o.email,
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
# 簡易清單（下拉用）
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
            o.primary_owner_id,
            u.username AS primary_owner
        FROM owners o
        JOIN users u ON u.id = o.primary_owner_id
        WHERE o.is_active = 1
          AND (o.customer_id = %s OR o.customer_id IS NULL)
        ORDER BY u.username
        """,
        (customer_id,)
    )
    return [OwnerSimple(**row) for row in rows]

# ============================================================
# 新增負責人
# ============================================================
@router.post("", response_model=OwnerResponse)
async def create_owner(
    data: OwnerCreate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    # primary owner 必須存在
    if not db.execute_query(
        "SELECT id FROM users WHERE id=%s",
        (data.primary_owner_id,)
    ):
        raise HTTPException(400, "primary_owner 不存在")

    if data.secondary_owner_id:
        if not db.execute_query(
            "SELECT id FROM users WHERE id=%s",
            (data.secondary_owner_id,)
        ):
            raise HTTPException(400, "secondary_owner 不存在")

    new_id = db.execute_insert(
        """
        INSERT INTO owners
        (
          customer_id,
          primary_owner_id,
          secondary_owner_id,
          email,
          note,
          is_active
        )
        VALUES (%s, %s, %s, %s, %s, 1)
        """,
        (
            customer_id,
            data.primary_owner_id,
            data.secondary_owner_id,
            data.email,
            data.note,
        )
    )

    return await get_owner(new_id, customer_id=customer_id)

# ============================================================
# 取得單筆
# ============================================================
@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT
            o.id,
            o.customer_id,

            o.primary_owner_id,
            u1.username AS primary_owner_name,

            o.secondary_owner_id,
            u2.username AS secondary_owner_name,

            o.email,
            o.note,
            o.is_active,
            o.created_at
        FROM owners o
        LEFT JOIN users u1 ON u1.id = o.primary_owner_id
        LEFT JOIN users u2 ON u2.id = o.secondary_owner_id
        WHERE o.id = %s
          AND (o.customer_id = %s OR o.customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )

    if not rows:
        raise HTTPException(404, "負責人不存在")

    return OwnerResponse(**rows[0])

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

    affected = db.execute_update(
        f"""
        UPDATE owners
        SET {", ".join(fields)}
        WHERE id=%s
          AND (customer_id=%s OR customer_id IS NULL)
        """,
        tuple(params)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    return await get_owner(owner_id, customer_id=customer_id)

# ============================================================
# 停用
# ============================================================
@router.put("/{owner_id}/disable")
async def disable_owner(
    owner_id: int,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    affected = db.execute_update(
        """
        UPDATE owners
        SET is_active=0
        WHERE id=%s
          AND (customer_id=%s OR customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    return {"message": "已停用"}
