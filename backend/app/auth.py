"""
JWT 認證與密碼處理 (v3.0)
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, status

# --- SHA256 密碼工具 ---
from backend.app.utils.password import (
    hash_password,
    verify_password,
)

# --- 讀取環境變數 (必須從 config.py 或 .env 載入) ---
from backend.config import settings


# ============================================================
# JWT 設定（從 .env 或 config.py 載入）
# ============================================================

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


# ============================================================
# 建立 Token
# ============================================================

def create_access_token(data: Dict[str, Any], expires: Optional[timedelta] = None) -> str:
    """建立 JWT Access Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_token_for_user(user_row: Dict[str, Any]) -> str:
    """
    為某個使用者建立 JWT Token
    user_row 來源：SELECT * FROM users WHERE username=...
    """
    payload = {
        "sub": user_row["username"],
        "user_id": user_row["id"],
        "role": user_row["role"],
        # v3.0 必須載入
        "customer_id": user_row.get("customer_id", None),
        "full_name": user_row.get("full_name", None),
        "email": user_row.get("email", None),
        "is_active": user_row.get("is_active", 1),
    }

    return create_access_token(payload)


# ============================================================
# Token 驗證
# ============================================================

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """驗證 JWT Token（失敗時回傳 None）"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def decode_token(token: str) -> Dict[str, Any]:
    """解碼 Token（失敗會拋例外）"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ============================================================
# 使用者資料解析（從 Token 中解析）
# ============================================================

def get_token_user(token: str) -> Optional[Dict[str, Any]]:
    payload = verify_token(token)
    if not payload:
        return None

    # v3.0 多欄位版本
    return {
        "user_id": payload.get("user_id"),
        "username": payload.get("sub"),
        "role": payload.get("role"),
        "customer_id": payload.get("customer_id"),
        "email": payload.get("email"),
        "full_name": payload.get("full_name"),
        "is_active": payload.get("is_active", 1),
    }


def get_token_user_role(token: str) -> Optional[str]:
    payload = verify_token(token)
    return payload.get("role") if payload else None


def is_admin(token: str) -> bool:
    return get_token_user_role(token) == "admin"


def require_admin(token: str) -> bool:
    if not is_admin(token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )
    return True


# ============================================================
# Token 過期檢查
# ============================================================

def is_token_expired(token: str) -> bool:
    payload = verify_token(token)
    if not payload:
        return True

    exp = payload.get("exp")
    if not exp:
        return True

    return datetime.utcnow().timestamp() > exp


# ============================================================
# 使用者啟用狀態檢查
# ============================================================

def ensure_user_active(user_payload: Dict[str, Any]):
    """檢查 is_active = 1"""
    if user_payload.get("is_active") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="此帳號已停用，請聯絡管理員"
        )
