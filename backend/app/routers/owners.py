"""
Owners API (v3.1 FIXED)
治具負責人管理 API
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
# 取得負責人列表（搜尋 / 分頁 / 客戶隔離）
# ============================================================

@router.get("", response_model=OwnerListResponse, summary="取得負責人列表")
async def list_owners(
    search: Optional[str] = Query(None),
    is_active: Optional[int] = Query(1),
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = []
    params = []

    # 客戶隔離（核心）
    where.append("(customer_id = %s OR customer_id IS NULL)")
    params.append(customer_id)

    # 啟用狀態
    if is_active is not None:
        where.append("is_active = %s")
        params.append(is_active)

    # 搜尋
    if search:
        where.append(
            "(primary_owner LIKE %s OR secondary_owner LIKE %s OR email LIKE %s)"
        )
        params += [f"%{search}%"] * 3

    where_sql = " AND ".join(where)

    rows = db.execute_query(
        f"""
        SELECT id, customer_id, customer_name,
               primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners
        WHERE {where_sql}
        ORDER BY id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, skip])
    )

    total = db.execute_scalar(
        f"""
        SELECT COUNT(*)
        FROM owners
        WHERE {where_sql}
        """,
        tuple(params)
    )

    return OwnerListResponse(
        total=total,
        owners=[OwnerResponse(**row) for row in rows]
    )

# ============================================================
# 下拉選單用（啟用 + 客戶隔離）
# ============================================================

@router.get("/simple", response_model=List[OwnerSimple], summary="負責人簡易清單")
async def owner_simple_list(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT id, primary_owner
        FROM owners
        WHERE is_active = 1
          AND (customer_id = %s OR customer_id IS NULL)
        ORDER BY primary_owner ASC
        """,
        (customer_id,)
    )

    return [OwnerSimple(**row) for row in rows]

# ============================================================
# 新增負責人
# ============================================================

@router.post("", response_model=OwnerResponse, summary="新增負責人")
async def create_owner(
    data: OwnerCreate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    # 唯一性檢查：同客戶 + primary_owner
    exists = db.execute_query(
        """
        SELECT id FROM owners
        WHERE primary_owner = %s
          AND (
            customer_id = %s
            OR (customer_id IS NULL AND %s IS NULL)
          )
        """,
        (data.primary_owner, customer_id, customer_id)
    )
    if exists:
        raise HTTPException(400, "此客戶下已存在相同主負責人")

    payload = data.model_dump()
    payload["customer_id"] = customer_id  # ⭐ 強制寫入目前客戶

    new_id = db.insert("owners", payload)

    row = db.execute_query(
        """
        SELECT id, customer_id, customer_name,
               primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners WHERE id=%s
        """,
        (new_id,)
    )[0]

    return OwnerResponse(**row)

# ============================================================
# 停用負責人（⚠️ 一定要在 /{owner_id} 前）
# ============================================================

@router.put("/{owner_id}/disable", summary="停用負責人")
async def disable_owner(
    owner_id: int,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    affected = db.execute_update(
        """
        UPDATE owners
        SET is_active = 0
        WHERE id=%s
          AND (customer_id = %s OR customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    return {"message": "已停用"}

# ============================================================
# 取得 / 更新單筆負責人（⚠️ 一定要最後）
# ============================================================

@router.get("/{owner_id}", response_model=OwnerResponse, summary="取得單一負責人")
async def get_owner(
    owner_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT id, customer_id, customer_name,
               primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners
        WHERE id=%s
          AND (customer_id = %s OR customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )

    if not rows:
        raise HTTPException(404, "負責人不存在")

    return OwnerResponse(**rows[0])


@router.put("/{owner_id}", response_model=OwnerResponse, summary="更新負責人")
async def update_owner(
    owner_id: int,
    data: OwnerUpdate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(400, "沒有可更新欄位")

    affected = db.execute_update(
        """
        UPDATE owners
        SET {fields}
        WHERE id=%s
          AND (customer_id = %s OR customer_id IS NULL)
        """.format(
            fields=", ".join(f"{k}=%s" for k in update_data.keys())
        ),
        tuple(update_data.values()) + (owner_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    row = db.execute_query(
        """
        SELECT id, customer_id, customer_name,
               primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners WHERE id=%s
        """,
        (owner_id,)
    )[0]

    return OwnerResponse(**row)
