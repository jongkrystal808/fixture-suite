"""
依賴注入模組
Dependencies Module

提供 FastAPI 的依賴注入函數，用於認證、角色與權限驗證
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from backend.app.auth import verify_token
from backend.app.database import db

# OAuth2 密鑰方案 (對應 /auth/login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v2/auth/login")



# ==================== 取得 Token ====================

async def get_token_from_header(authorization: Optional[str] = Header(None)) -> str:
    """從 Authorization Header 取得 Token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供認證 Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 格式錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return parts[1]


# ==================== 使用者驗證 ====================

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    驗證並回傳當前登入使用者資訊
    """
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    username = payload.get("sub")
    role = payload.get("role")

    if not user_id or not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 資料不完整",
        )

    try:
        query = """
            SELECT id, username, role, created_at
            FROM users
            WHERE id = %s
        """
        result = db.execute_query(query, (user_id,))
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="使用者不存在",
            )

        user = result[0]
        return {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢使用者失敗: {str(e)}",
        )


# ==================== 權限驗證 ====================

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """取得當前管理員使用者（需要 admin 權限）"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限",
        )
    return current_user


async def require_admin_role(current_user: dict = Depends(get_current_user)) -> bool:
    """僅允許管理員角色"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限",
        )
    return True


# ==================== 🔹 角色權限控制 (RBAC) ====================

async def require_role(
    allowed_roles: list[str],
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    通用角色驗證函式
    用於限制哪些角色可訪問特定資源。
    """
    role = current_user.get("role")
    if role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"無訪問權限（需要角色之一：{', '.join(allowed_roles)}）",
        )
    return current_user


async def require_backend_access(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    限制只有管理員能進入後台（後台專用保護）
    """
    role = current_user.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="非管理員無法進入後台",
        )
    return current_user


# ==================== 可選登入 ====================

async def get_current_user_optional(
    authorization: Optional[str] = Header(None),
) -> Optional[dict]:
    """允許未登入"""
    if not authorization:
        return None

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1]
    payload = verify_token(token)
    if not payload:
        return None

    user_id = payload.get("user_id")
    username = payload.get("sub")
    role = payload.get("role")

    if not user_id or not username:
        return None

    result = db.execute_query(
        "SELECT id, username, role, created_at FROM users WHERE id = %s", (user_id,)
    )
    if not result:
        return None

    user = result[0]
    return {
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "created_at": user["created_at"],
    }


# ==================== 輔助函式 ====================

async def get_current_username(current_user: dict = Depends(get_current_user)) -> str:
    """取得使用者名稱"""
    return current_user.get("username", "")


async def get_current_user_id(current_user: dict = Depends(get_current_user)) -> int:
    """取得使用者 ID"""
    return current_user.get("id", 0)
