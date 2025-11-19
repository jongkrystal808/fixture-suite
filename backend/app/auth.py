"""
JWT 認證與密碼處理模組
Authentication and Password Utilities
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, status

# 使用 SHA256 密碼工具
from backend.app.utils.password import (
    hash_password,      # SHA256
    verify_password     # SHA256 驗證
)

# ============================================
# JWT 基本設定
# ============================================
SECRET_KEY = "your-secret-key-here-please-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

# ============================================
# JWT Token 生成與驗證
# ============================================
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """建立 JWT Access Token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """驗證 JWT Token 並解析"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def decode_token(token: str) -> Dict[str, Any]:
    """解碼 JWT Token（若無效會拋出例外）"""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


# ============================================
# Token 解析工具
# ============================================
def get_token_user(token: str) -> Optional[Dict[str, Any]]:
    """從 Token 解析出使用者資訊"""
    payload = verify_token(token)
    if not payload:
        return None
    return {
        "user_id": payload.get("user_id"),
        "username": payload.get("sub"),
        "role": payload.get("role"),
    }


def get_token_user_role(token: str) -> Optional[str]:
    """從 Token 中取得角色"""
    payload = verify_token(token)
    return payload.get("role") if payload else None


def is_admin(token: str) -> bool:
    """檢查是否為管理員"""
    return get_token_user_role(token) == "admin"


def require_admin(token: str) -> bool:
    """檢查 Token 是否具管理員權限"""
    if not is_admin(token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )
    return True


# ============================================
# Token 過期檢查
# ============================================
def is_token_expired(token: str) -> bool:
    """檢查 Token 是否過期"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp)
            return exp_datetime < datetime.utcnow()
        return True
    except JWTError:
        return True


# ============================================
# 測試用（開發期間）
# ============================================
if __name__ == "__main__":
    pwd = "admin123"
    hashed = hash_password(pwd)
    print(f"SHA256 雜湊: {hashed}")
    print(f"驗證結果: {verify_password(pwd, hashed)}")

    token = create_access_token({"sub": "admin", "user_id": 1, "role": "admin"})
    print("\nToken:", token)
    print("\nPayload:", verify_token(token))
