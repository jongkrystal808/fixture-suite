"""
依賴注入模組 (v3.0 修正版)
Dependencies for Authentication / Authorization
"""

from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.app.auth import (
    get_token_user,
    ensure_user_active,
)
from backend.app.database import db


# ============================================================
# OAuth2 Bearer Token
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v2/auth/login")


# ============================================================
# 取得目前登入的使用者（依據你的 users table 修正）
# ============================================================

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """
    驗證 JWT Token 並取得使用者資訊 (v3.0)
    與你的 users 資料表欄位完全一致
    """

    payload = get_token_user(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    ensure_user_active(payload)

    # ▲ 修正：只查 users 表存在的欄位
    db_user = db.execute_query(
        """
        SELECT id, username, role, full_name, email, is_active, created_at
        FROM users
        WHERE id=%s
        """,
        (payload["user_id"],)
    )

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="使用者不存在"
        )

    return db_user[0]


# ============================================================
# 管理員驗證
# ============================================================

async def get_current_admin(
    current_user: Dict = Depends(get_current_user)
) -> Dict:
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )
    return current_user


# ============================================================
# Optional User（匿名可訪問）
# ============================================================

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Dict]:

    if not token:
        return None

    payload = get_token_user(token)
    if not payload:
        return None

    ensure_user_active(payload)

    db_user = db.execute_query(
        """
        SELECT id, username, role, full_name, email, is_active, created_at
        FROM users
        WHERE id=%s
        """,
        (payload["user_id"],)
    )

    if not db_user:
        return None

    return db_user[0]


# ============================================================
# 快速取 username / user_id
# ============================================================

async def get_current_username(
    user=Depends(get_current_user)
) -> str:
    return user["username"]


async def get_current_user_id(
    user=Depends(get_current_user)
) -> int:
    return user["id"]


# ============================================================
# 通用角色驗證
# ============================================================

async def require_role(
    allowed_roles: list[str],
    current_user: Dict = Depends(get_current_user)
) -> Dict:
    if current_user["role"] not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"需要角色之一：{', '.join(allowed_roles)}"
        )
    return current_user

# ============================================================
# 目前使用中的客戶（Customer Context）
# ============================================================

from typing import Optional
from fastapi import Header

async def get_current_customer_id(
    x_customer_id: Optional[str] = Header(default=None, alias="X-Customer-Id"),
    user: Dict = Depends(get_current_user)
) -> str:
    if not x_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未選擇客戶"
        )
    return x_customer_id
