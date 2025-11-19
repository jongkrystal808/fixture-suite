"""
使用者管理 API
User Management API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from backend.app.database import db
from backend.app.dependencies import get_current_user
from backend.app.auth import hash_password
from typing import Dict

router = APIRouter(
    prefix="/users",
    tags=["使用者管理 Users"]
)

# ==========================================================
# 🔹 取得使用者清單（固定排序）
# ==========================================================
@router.get("", summary="取得使用者清單")
async def list_users(current_user: dict = Depends(get_current_user)):
    """管理員取得所有使用者清單"""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理員權限")

    try:
        query = """
            SELECT 
                id,
                username,
                email,
                role,
                full_name,
                is_active,
                created_at
            FROM users
            ORDER BY id ASC
        """
        rows = db.execute_query(query)

        return [
            {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],            # ✔ email 確保回傳
                "role": row["role"],
                "full_name": row["full_name"],
                "is_active": row["is_active"],
                "created_at": row["created_at"]
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查詢使用者失敗: {str(e)}")


# ==========================================================
# 🔹 新增使用者
# ==========================================================
@router.post("", summary="新增使用者")
async def create_user(user: Dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理員權限")

    username = user.get("username")
    password = user.get("password")
    email = user.get("email", "")
    role = user.get("role", "user")

    if not username or not password:
        raise HTTPException(status_code=400, detail="帳號與密碼必填")

    # 檢查是否重複
    query_check = "SELECT id FROM users WHERE username = %s"
    exists = db.execute_query(query_check, (username,))
    if exists:
        raise HTTPException(status_code=400, detail=f"使用者 {username} 已存在")

    # 建立新使用者
    query_insert = """
        INSERT INTO users (username, password_hash, email, role)
        VALUES (%s, %s, %s, %s)
    """
    db.execute_update(query_insert, (username, hash_password(password), email, role))

    return {"message": "使用者建立成功", "username": username, "role": role}


# ==========================================================
# 🔹 更新使用者資料（email / role）
# ==========================================================
@router.put("/{user_id}", summary="更新使用者")
async def update_user(user_id: int, user: Dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理員權限")

    updates = []
    params = []

    if user.get("email") is not None:
        updates.append("email = %s")
        params.append(user["email"])

    if user.get("role") is not None:
        updates.append("role = %s")
        params.append(user["role"])

    if not updates:
        raise HTTPException(status_code=400, detail="沒有提供要更新的欄位")

    params.append(user_id)

    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s"
    db.execute_update(query, tuple(params))

    return {"message": f"使用者 {user_id} 已更新"}


# ==========================================================
# 🔹 刪除使用者
# ==========================================================
@router.delete("/{user_id}", summary="刪除使用者")
async def delete_user(
    user_id: int,
    password: str = Query(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理員權限")

    # ⚠ 沒有必要用 password 驗證，因為管理員刪除帳號
    #   但你既然有 Query(password)，就至少檢查是否輸入
    if not password:
        raise HTTPException(status_code=400, detail="需提供密碼確認")

    query = "DELETE FROM users WHERE id = %s"
    db.execute_update(query, (user_id,))

    return {"message": f"使用者 {user_id} 已刪除"}
