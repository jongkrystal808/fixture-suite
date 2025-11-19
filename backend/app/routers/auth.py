"""
認證 API 路由
Authentication API Routes

提供使用者認證相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from backend.app.models.user import (
    UserCreate,
    UserLogin,
    LoginResponse,
    UserResponse,
    PasswordChange
)

from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.utils.password import (
    hash_password,      # SHA256
    verify_password     # SHA256 驗證
)
from backend.app.auth import (
    create_access_token
)


# 建立路由器
router = APIRouter(
    prefix="/auth",
    tags=["認證 Authentication"]
)


# ==========================================================
# 🔹 使用者登入
# ==========================================================
@router.post("/login", response_model=LoginResponse, summary="使用者登入")
async def login(user_data: UserLogin):

    query = """
        SELECT id, username, password_hash, role, created_at
        FROM users
        WHERE username = %s
    """

    try:
        result = db.execute_query(query, (user_data.username,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="使用者名稱或密碼錯誤"
            )

        user = result[0]
        user_id = user["id"]
        username = user["username"]
        password_hash_db = user["password_hash"]
        role = user["role"]
        created_at = user["created_at"]

        # 驗證密碼（SHA256）
        if not verify_password(user_data.password, password_hash_db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="使用者名稱或密碼錯誤"
            )

        # 產生 Token
        access_token = create_access_token(
            data={"sub": username, "user_id": user_id, "role": role}
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                username=username,
                role=role,
                created_at=created_at
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"登入失敗: {str(e)}"
        )


# ==========================================================
# 🔹 使用者註冊（SHA256）
# ==========================================================
@router.post("/register", response_model=UserResponse, summary="使用者註冊")
async def register(user_data: UserCreate):

    # 檢查是否已存在
    check_query = "SELECT id FROM users WHERE username = %s"
    existing = db.execute_query(check_query, (user_data.username,))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="使用者名稱已存在"
        )

    # 雜湊密碼（SHA256）
    hashed = hash_password(user_data.password)

    insert_query = """
        INSERT INTO users (username, password_hash, role)
        VALUES (%s, %s, %s)
    """

    user_id = db.execute_insert(
        insert_query,
        (user_data.username, hashed, user_data.role.value)
    )

    # 查詢回傳資料
    query = """
        SELECT id, username, role, created_at
        FROM users
        WHERE id = %s
    """

    result = db.execute_query(query, (user_id,))

    if not result:
        raise HTTPException(
            status_code=500,
            detail="建立使用者失敗"
        )

    user = result[0]

    return UserResponse(
        id=user["id"],
        username=user["username"],
        role=user["role"],
        created_at=user["created_at"]
    )


# ==========================================================
# 🔹 取得當前使用者資訊
# ==========================================================
@router.get("/me", response_model=UserResponse, summary="取得當前使用者資訊")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):

    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        role=current_user["role"],
        created_at=current_user.get("created_at")
    )


# ==========================================================
# 🔹 使用者修改自己的密碼（SHA256）
# ==========================================================
@router.post("/change-password", summary="修改密碼")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):

    user_id = current_user["id"]

    # 查詢當前密碼
    query = "SELECT password_hash FROM users WHERE id = %s"
    result = db.execute_query(query, (user_id,))
    if not result:
        raise HTTPException(
            status_code=404,
            detail="使用者不存在"
        )

    password_hash_db = result[0][0]

    # 驗證舊密碼
    if not verify_password(password_data.old_password, password_hash_db):
        raise HTTPException(
            status_code=400,
            detail="舊密碼錯誤"
        )

    # 雜湊新密碼（SHA256）
    new_hash = hash_password(password_data.new_password)

    update_query = "UPDATE users SET password_hash = %s WHERE id = %s"
    db.execute_update(update_query, (new_hash, user_id))

    return {"message": "密碼修改成功"}


# ==========================================================
# 🔹 使用者登出（記錄用途）
# ==========================================================
@router.post("/logout", summary="使用者登出")
async def logout(current_username: str = Depends(get_current_username)):
    return {
        "message": "登出成功",
        "username": current_username,
        "note": "請在前端刪除 Token"
    }


# ==========================================================
# 🔹 驗證 Token 是否有效
# ==========================================================
@router.post("/verify-token", summary="驗證 Token")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    return {
        "valid": True,
        "user": UserResponse(
            id=current_user["id"],
            username=current_user["username"],
            role=current_user["role"],
            created_at=current_user.get("created_at")
        )
    }


# ==========================================================
# 🔹 管理員重設使用者密碼（唯一正確版）
# ==========================================================

class ResetPasswordBody(BaseModel):
    new_password: str


@router.post("/admin/reset-password/{user_id}", summary="管理員重設指定使用者密碼")
async def admin_reset_password(
    user_id: int,
    body: ResetPasswordBody,
    current_user: dict = Depends(get_current_user)
):

    # 權限檢查
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="需要管理員權限")

    # 確認使用者存在
    query_check = "SELECT id FROM users WHERE id = %s"
    target = db.execute_query(query_check, (user_id,))
    if not target:
        raise HTTPException(status_code=404, detail="使用者不存在")

    # 雜湊新密碼（SHA256）
    new_hash = hash_password(body.new_password)

    query_update = "UPDATE users SET password_hash = %s WHERE id = %s"
    db.execute_update(query_update, (new_hash, user_id))

    return {
        "message": "密碼已成功重設",
        "user_id": user_id
    }
