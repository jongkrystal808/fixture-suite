"""
使用者管理 API (v3.0)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from backend.app.database import db
from backend.app.dependencies import get_current_admin
from backend.app.auth import hash_password
from typing import List

from backend.app.models.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse
)

router = APIRouter(
    prefix="/users",
    tags=["Users 使用者管理"]
)

# ============================================================
# 取得使用者列表
# ============================================================

@router.get("", response_model=UserListResponse, summary="取得使用者清單")
async def list_users(admin=Depends(get_current_admin)):
    rows = db.execute_query(
        """
        SELECT 
            id,
            username,
            email,
            full_name,
            role,
            is_active,
            created_at
        FROM users
        ORDER BY id ASC
        """
    )

    return UserListResponse(
        total=len(rows),
        users=[UserResponse(**row) for row in rows]
    )

# ============================================================
# 建立使用者
# ============================================================

@router.post("", response_model=UserResponse, summary="新增使用者")
async def create_user(
    data: UserCreate,
    admin=Depends(get_current_admin)
):
    # 檢查重複
    exists = db.execute_query(
        "SELECT id FROM users WHERE username=%s", (data.username,)
    )
    if exists:
        raise HTTPException(400, f"使用者 {data.username} 已存在")

    # 寫入資料
    new_id = db.insert(
        """
        INSERT INTO users (username, password_hash, full_name, email, role, is_active)
        VALUES (%s, %s, %s, %s, %s, 1)
        """,
        (
            data.username,
            hash_password(data.password),
            None,              # full_name 最後看你是否要支援
            None,              # email 有填寫你可放 data.email
            data.role.value,
        )
    )

    # 回查
    row = db.execute_query(
        """
        SELECT id, username, email, full_name, role, is_active, created_at
        FROM users
        WHERE id=%s
        """,
        (new_id,)
    )[0]

    return UserResponse(**row)

# ============================================================
# 更新使用者
# ============================================================

@router.put("/{user_id}", response_model=UserResponse, summary="更新使用者")
async def update_user(
    user_id: int,
    data: UserUpdate,
    admin=Depends(get_current_admin)
):
    # 檢查是否存在
    exists = db.execute_query("SELECT id FROM users WHERE id=%s", (user_id,))
    if not exists:
        raise HTTPException(404, "使用者不存在")

    # 更新欄位
    updates = []
    params = []

    if data.username is not None:
        updates.append("username=%s")
        params.append(data.username)

    if data.password is not None:
        updates.append("password_hash=%s")
        params.append(hash_password(data.password))

    if data.role is not None:
        updates.append("role=%s")
        params.append(data.role.value)

    if not updates:
        raise HTTPException(400, "沒有提供更新欄位")

    params.append(user_id)

    sql = f"""
        UPDATE users
        SET {', '.join(updates)}
        WHERE id=%s
    """
    db.execute_update(sql, tuple(params))

    # 回查
    row = db.execute_query(
        """
        SELECT id, username, email, full_name, role, is_active, created_at
        FROM users WHERE id=%s
        """,
        (user_id,)
    )[0]

    return UserResponse(**row)

# ============================================================
# 刪除使用者
# ============================================================

@router.delete("/{user_id}", summary="刪除使用者")
async def delete_user(
    user_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "DELETE FROM users WHERE id=%s",
        (user_id,)
    )

    if affected == 0:
        raise HTTPException(404, "使用者不存在")

    return {"message": "使用者已刪除"}
@router.put("/{user_id}/reset-password")
async def reset_password(user_id: int, data: dict, user=Depends(get_current_admin)):
    """
    管理員重設密碼
    Body: { "new_password": "1234" }
    """
    new_pwd = data.get("new_password")
    if not new_pwd:
        raise HTTPException(400, "缺少 new_password")

    hashed = hash_password(new_pwd)

    sql = "UPDATE users SET password_hash=%s WHERE id=%s"
    db.execute_update(sql, (hashed, user_id))

    return {"message": "密碼已更新"}

# ============================================================
# 使用者簡易清單（給下拉 / autocomplete 用）
# ============================================================

@router.get("/simple", summary="使用者簡易清單")
async def list_users_simple(admin=Depends(get_current_admin)):
    rows = db.execute_query(
        """
        SELECT
            id,
            username
        FROM users
        WHERE is_active = 1
        ORDER BY username
        """
    )

    return rows

@router.get("/simple", summary="使用者簡易清單")
async def list_users_simple(admin=Depends(get_current_admin)):
    rows = db.execute_query(
        """
        SELECT
            id,
            username,
            email
        FROM users
        WHERE is_active = 1
        ORDER BY username
        """
    )
    return rows
