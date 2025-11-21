"""
Owners API (v3.0)
治具負責人管理 API

對應資料表：owners
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.models.owners import (
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

@router.get("", response_model=OwnerListResponse, summary="取得負責人列表")
async def list_owners(
    search: Optional[str] = Query(None),
    include_inactive: bool = False,
    user=Depends(get_current_user)
):
    where = []
    params = []

    if search:
        where.append("(primary_owner LIKE %s OR secondary_owner LIKE %s OR customer_name LIKE %s)")
        params += [f"%{search}%", f"%{search}%", f"%{search}%"]

    if not include_inactive:
        where.append("is_active = 1")

    where_sql = " AND ".join(where) if where else "1=1"

    rows = db.execute_query(
        f"""
        SELECT id, customer_name, primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners
        WHERE {where_sql}
        ORDER BY id ASC
        """,
        tuple(params)
    )

    return OwnerListResponse(
        total=len(rows),
        owners=[OwnerResponse(**row) for row in rows]
    )

# ============================================================
# 前端下拉選擇：只取啟用的簡易 owner 列表
# ============================================================

@router.get("/active", response_model=List[OwnerSimple], summary="取得啟用中的負責人簡易列表")
async def active_owner_list(user=Depends(get_current_user)):

    rows = db.execute_query(
        """
        SELECT id, primary_owner
        FROM owners
        WHERE is_active = 1
        ORDER BY primary_owner ASC
        """
    )

    return [OwnerSimple(**row) for row in rows]

# ============================================================
# 新增負責人
# ============================================================

@router.post("", response_model=OwnerResponse, summary="新增負責人")
async def create_owner(
    data: OwnerCreate,
    admin=Depends(get_current_admin)
):
    # 檢查是否已有同名 primary_owner（可加強）
    exists = db.execute_query(
        "SELECT id FROM owners WHERE primary_owner = %s AND customer_name = %s",
        (data.primary_owner, data.customer_name)
    )
    if exists:
        raise HTTPException(400, "已存在此負責人（同客戶+同主要負責人）")

    new_id = db.insert("owners", data.model_dump())

    row = db.execute_query(
        """
        SELECT id, customer_name, primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners WHERE id=%s
        """,
        (new_id,)
    )[0]

    return OwnerResponse(**row)

# ============================================================
# 取得單一負責人
# ============================================================

@router.get("/{owner_id}", response_model=OwnerResponse, summary="取得單一負責人")
async def get_owner(
    owner_id: int,
    user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT id, customer_name, primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners WHERE id=%s
        """,
        (owner_id,)
    )

    if not rows:
        raise HTTPException(404, "負責人不存在")

    return OwnerResponse(**rows[0])

# ============================================================
# 更新負責人
# ============================================================

@router.put("/{owner_id}", response_model=OwnerResponse, summary="更新負責人資料")
async def update_owner(
    owner_id: int,
    data: OwnerUpdate,
    admin=Depends(get_current_admin)
):
    # 檢查是否存在
    exists = db.execute_query(
        "SELECT id FROM owners WHERE id=%s", (owner_id,)
    )
    if not exists:
        raise HTTPException(404, "負責人不存在")

    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(400, "沒有提供任何可更新欄位")

    db.update("owners", update_data, "id = %s", (owner_id,))

    # 回查
    row = db.execute_query(
        """
        SELECT id, customer_name, primary_owner, secondary_owner,
               email, note, is_active, created_at
        FROM owners WHERE id=%s
        """,
        (owner_id,)
    )[0]

    return OwnerResponse(**row)

# ============================================================
# 停用 / 啟用負責人
# ============================================================

@router.post("/{owner_id}/activate", summary="啟用負責人")
async def activate_owner(
    owner_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "UPDATE owners SET is_active = 1 WHERE id=%s", (owner_id,)
    )
    if affected == 0:
        raise HTTPException(404, "負責人不存在")

    return {"message": "已啟用"}

@router.post("/{owner_id}/deactivate", summary="停用負責人")
async def deactivate_owner(
    owner_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "UPDATE owners SET is_active = 0 WHERE id=%s", (owner_id,)
    )
    if affected == 0:
        raise HTTPException(404, "負責人不存在")

    return {"message": "已停用"}

# ============================================================
# 刪除負責人（如果不想允許刪除可禁用此 API）
# ============================================================

@router.delete("/{owner_id}", summary="刪除負責人")
async def delete_owner(
    owner_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "DELETE FROM owners WHERE id=%s", (owner_id,)
    )
    if affected == 0:
        raise HTTPException(404, "負責人不存在")

    return {"message": "已刪除"}
