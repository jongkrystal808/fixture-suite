"""
認證 API 路由
Authentication API Routes

提供使用者認證相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.models import user
from backend.app.models.user import (
    UserCreate,
    UserLogin,
    LoginResponse,
    UserResponse,
    PasswordChange
)
from backend.app.auth import (
    create_access_token,
    verify_password,
    get_password_hash
)
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.utils.password import hash_password as sha256_hash


# 建立路由器
router = APIRouter(
    prefix="/auth",
    tags=["認證 Authentication"]
)


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

        user = result[0]  # ✅ 正確：取得查詢結果

        user_id = user["id"]
        username = user["username"]
        password_hash = user["password_hash"]
        role = user["role"]
        created_at = user["created_at"]

        # ✅ 驗證密碼
        if not verify_password(user_data.password, password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="使用者名稱或密碼錯誤"
            )

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


@router.post("/register", response_model=UserResponse, summary="使用者註冊")
async def register(user_data: UserCreate):

    check_query = "SELECT id FROM users WHERE username = %s"

    try:
        existing_user = db.execute_query(check_query, (user_data.username,))
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="使用者名稱已存在"
            )

        password_hash = get_password_hash(user_data.password)

        insert_query = """
            INSERT INTO users (username, password_hash, role)
            VALUES (%s, %s, %s)
        """

        # ✅ execute_update 只會回傳 affected_rows，不能得到新 ID
        # 所以換成 execute_insert
        user_id = db.execute_insert(
            insert_query,
            (user_data.username, password_hash, user_data.role.value)
        )

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

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"註冊失敗: {str(e)}"
        )


@router.get("/me", response_model=UserResponse, summary="取得當前使用者資訊")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    取得當前登入使用者的資訊

    需要提供有效的 JWT Token
    """
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        role=current_user["role"],
        created_at=current_user.get("created_at")
    )


@router.post("/change-password", summary="修改密碼")
async def change_password(
    password_data: PasswordChange,
    current_user: dict = Depends(get_current_user)
):
    """
    修改當前使用者的密碼

    - **old_password**: 舊密碼
    - **new_password**: 新密碼 (至少 6 字元，且不能與舊密碼相同)

    需要提供有效的 JWT Token
    """
    user_id = current_user["id"]

    try:
        # 查詢當前密碼
        query = "SELECT password_hash FROM users WHERE id = %s"
        result = db.execute_query(query, (user_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="使用者不存在"
            )

        current_password_hash = result[0][0]

        # 驗證舊密碼
        if not verify_password(password_data.old_password, current_password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="舊密碼錯誤"
            )

        # 加密新密碼
        new_password_hash = get_password_hash(password_data.new_password)

        # 更新密碼
        update_query = """
            UPDATE users
            SET password_hash = %s
            WHERE id = %s
        """

        db.execute_update(update_query, (new_password_hash, user_id))

        return {
            "message": "密碼修改成功",
            "username": current_user["username"]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"修改密碼失敗: {str(e)}"
        )


@router.post("/logout", summary="使用者登出")
async def logout(current_username: str = Depends(get_current_username)):
    """
    使用者登出

    注意：由於使用 JWT，Token 無法真正撤銷。
    實際的登出應該在客戶端刪除 Token。
    此 API 主要用於記錄登出事件。

    需要提供有效的 JWT Token
    """
    return {
        "message": "登出成功",
        "username": current_username,
        "note": "請在客戶端刪除 Token"
    }


@router.post("/verify-token", summary="驗證 Token")
async def verify_token_endpoint(current_user: dict = Depends(get_current_user)):
    """
    驗證 JWT Token 是否有效

    如果 Token 有效，回傳使用者資訊
    如果 Token 無效或過期，回傳 401 錯誤
    """
    return {
        "valid": True,
        "user": UserResponse(
            id=current_user["id"],
            username=current_user["username"],
            role=current_user["role"],
            created_at=current_user.get("created_at")
        )
    }


# ==================== 管理員專用 API ====================

@router.post("/admin/reset-password/{user_id}", summary="重設使用者密碼 (管理員)")
async def admin_reset_password(
    user_id: int,
    new_password: str,
    current_user: dict = Depends(get_current_user)
):
    """
    管理員重設指定使用者的密碼

    - **user_id**: 要重設密碼的使用者 ID
    - **new_password**: 新密碼

    需要管理員權限
    """
    # 檢查權限
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )

    try:
        # 檢查使用者是否存在
        check_query = "SELECT username FROM users WHERE id = %s"
        result = db.execute_query(check_query, (user_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="使用者不存在"
            )

        username = result[0][0]

        # 加密新密碼
        new_password_hash = get_password_hash(new_password)

        # 更新密碼
        update_query = """
            UPDATE users
            SET password_hash = %s
            WHERE id = %s
        """

        db.execute_update(update_query, (new_password_hash, user_id))

        return {
            "message": "密碼重設成功",
            "user_id": user_id,
            "username": username
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"重設密碼失敗: {str(e)}"
        )


# ==================== 測試用 API (生產環境應移除) ====================

@router.get("/test/public", summary="公開測試端點 (無需登入)")
async def test_public():
    """
    公開測試端點，無需登入即可存取
    """
    return {
        "message": "這是公開端點",
        "auth_required": False
    }


@router.get("/test/protected", summary="受保護測試端點 (需要登入)")
async def test_protected(current_user: dict = Depends(get_current_user)):
    """
    受保護的測試端點，需要登入才能存取
    """
    return {
        "message": "這是受保護端點",
        "auth_required": True,
        "user": {
            "id": current_user["id"],
            "username": current_user["username"],
            "role": current_user["role"]
        }
    }