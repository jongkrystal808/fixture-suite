"""
依賴注入模組 (v3.0)
Dependencies for Authentication / Authorization
"""

from typing import Optional, Dict
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from backend.app.auth import (
    get_token_user,
    verify_token,
    ensure_user_active,
)
from backend.app.database import db


# ============================================================
# OAuth2 Bearer Token
# ============================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v2/auth/login")


# ============================================================
# 取得目前登入的使用者
# ============================================================

async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """
    驗證 JWT Token 並取得使用者資訊 (v3.0)
    必須包含：
    - user_id
    - username
    - role
    - customer_id
    - full_name
    - email
    - is_active
    """
    payload = get_token_user(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效或已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 停用帳號禁止使用
    ensure_user_active(payload)

    # 進一步確認 user 是否存在資料庫
    db_user = db.execute_query(
        """
        SELECT id, username, full_name, email, role, is_active, customer_id, created_at
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
# 取得管理員使用者
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
# Optional User (可選登入)
# ============================================================

async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Dict]:
    """
    允許匿名（無 Token）訪問的接口
    """
    if not token:
        return None

    payload = get_token_user(token)
    if not payload:
        return None

    ensure_user_active(payload)

    db_user = db.execute_query(
        """
        SELECT id, username, full_name, email, role, is_active, customer_id, created_at
        FROM users
        WHERE id=%s
        """,
        (payload["user_id"],)
    )

    if not db_user:
        return None

    return db_user[0]


# ============================================================
# 快速取得 username / user_id / customer_id
# ============================================================

async def get_current_username(
    user=Depends(get_current_user)
) -> str:
    return user["username"]


async def get_current_user_id(
    user=Depends(get_current_user)
) -> int:
    return user["id"]


async def get_current_customer_id(
    user=Depends(get_current_user)
) -> str:
    """
    取得使用者所屬的 customer_id（v3.0 必備）
    """
    return user["customer_id"]


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
