"""
依賴注入模組
Dependencies Module

提供 FastAPI 的依賴注入函數，用於認證和權限驗證
"""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.app.auth import extract_token_from_header, TokenData
from backend.app.database import db

# HTTP Bearer Token 安全方案
security = HTTPBearer()


# ==================== 取得 Token ====================

async def get_token_from_header(
        authorization: Optional[str] = Header(None)
) -> str:
    """
    從 Header 中取得 Token

    Args:
        authorization: Authorization header

    Returns:
        str: JWT Token

    Raises:
        HTTPException: 如果 Token 不存在或格式錯誤
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未提供認證 Token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = extract_token_from_header(authorization)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 格式錯誤",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token


async def get_token(
        credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    使用 HTTPBearer 取得 Token

    Args:
        credentials: HTTP Authorization credentials

    Returns:
        str: JWT Token
    """
    return credentials.credentials


# ==================== 驗證 Token ====================

async def verify_current_token(
        token: str = Depends(get_token)
) -> TokenData:
    """
    驗證當前 Token

    Args:
        token: JWT Token

    Returns:
        TokenData: Token 資料

    Raises:
        HTTPException: 如果 Token 無效或過期
    """
    token_data = TokenData(token)

    if not token_data.is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 無效",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token_data.is_expired:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token 已過期",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token_data


# ==================== 取得當前使用者 ====================

async def get_current_user(
        token_data: TokenData = Depends(verify_current_token)
) -> dict:
    """
    取得當前登入的使用者

    Args:
        token_data: Token 資料

    Returns:
        dict: 使用者資訊

    Raises:
        HTTPException: 如果使用者不存在
    """
    username = token_data.username

    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無法取得使用者資訊",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 從資料庫查詢使用者
    query = """
            SELECT id, username, role, created_at
            FROM users
            WHERE username = %s \
            """

    try:
        result = db.execute_query(query, (username,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="使用者不存在",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user = result[0]

        return {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢使用者失敗: {str(e)}"
        )


async def get_current_active_user(
        current_user: dict = Depends(get_current_user)
) -> dict:
    """
    取得當前活躍使用者

    Args:
        current_user: 當前使用者

    Returns:
        dict: 使用者資訊
    """
    # 這裡可以加入額外的檢查，例如使用者是否被停用等
    return current_user


# ==================== 權限驗證 ====================

async def get_current_admin(
        current_user: dict = Depends(get_current_user)
) -> dict:
    """
    取得當前管理員使用者 (需要管理員權限)

    Args:
        current_user: 當前使用者

    Returns:
        dict: 管理員使用者資訊

    Raises:
        HTTPException: 如果不是管理員
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )

    return current_user


async def require_admin_role(
        current_user: dict = Depends(get_current_user)
) -> bool:
    """
    要求管理員角色 (用於路由裝飾器)

    Args:
        current_user: 當前使用者

    Returns:
        bool: True

    Raises:
        HTTPException: 如果不是管理員
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理員權限"
        )

    return True


# ==================== 可選認證 ====================

async def get_current_user_optional(
        authorization: Optional[str] = Header(None)
) -> Optional[dict]:
    """
    取得當前使用者 (可選，允許未登入)

    Args:
        authorization: Authorization header

    Returns:
        Optional[dict]: 使用者資訊，如果未登入則返回 None
    """
    if not authorization:
        return None

    try:
        token = extract_token_from_header(authorization)
        if not token:
            return None

        token_data = TokenData(token)

        if not token_data.is_valid or token_data.is_expired:
            return None

        username = token_data.username
        if not username:
            return None

        # 從資料庫查詢使用者
        query = """
                SELECT id, username, role, created_at
                FROM users
                WHERE username = %s \
                """

        result = db.execute_query(query, (username,))

        if not result:
            return None

        user = result[0]

        return {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "created_at": user["created_at"]
        }

    except Exception:
        return None


# ==================== 使用者權限檢查 ====================

def check_user_permission(current_user: dict, required_role: str) -> bool:
    """
    檢查使用者權限

    Args:
        current_user: 當前使用者
        required_role: 需要的角色

    Returns:
        bool: 是否有權限
    """
    user_role = current_user.get("role", "")

    # 管理員有所有權限
    if user_role == "admin":
        return True

    # 檢查是否符合要求的角色
    return user_role == required_role


def check_resource_owner(
        current_user: dict,
        resource_user_id: int
) -> bool:
    """
    檢查使用者是否為資源擁有者

    Args:
        current_user: 當前使用者
        resource_user_id: 資源擁有者的使用者 ID

    Returns:
        bool: 是否為資源擁有者
    """
    user_id = current_user.get("id")
    user_role = current_user.get("role", "")

    # 管理員可以存取所有資源
    if user_role == "admin":
        return True

    # 檢查是否為資源擁有者
    return user_id == resource_user_id


async def verify_resource_access(
        current_user: dict,
        resource_user_id: int
) -> bool:
    """
    驗證資源存取權限 (擁有者或管理員)

    Args:
        current_user: 當前使用者
        resource_user_id: 資源擁有者的使用者 ID

    Returns:
        bool: True

    Raises:
        HTTPException: 如果沒有權限
    """
    if not check_resource_owner(current_user, resource_user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="沒有權限存取此資源"
        )

    return True


# ==================== 取得使用者名稱 (用於日誌) ====================

async def get_current_username(
        current_user: dict = Depends(get_current_user)
) -> str:
    """
    取得當前使用者名稱

    Args:
        current_user: 當前使用者

    Returns:
        str: 使用者名稱
    """
    return current_user.get("username", "")


async def get_current_user_id(
        current_user: dict = Depends(get_current_user)
) -> int:
    """
    取得當前使用者 ID

    Args:
        current_user: 當前使用者

    Returns:
        int: 使用者 ID
    """
    return current_user.get("id", 0)


# ==================== 使用範例 ====================

"""
在路由中使用:

from fastapi import APIRouter, Depends
from backend.app.dependencies import get_current_user, get_current_admin

router = APIRouter()

# 需要登入
@router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {"username": current_user["username"]}

# 需要管理員權限
@router.get("/admin/users")
async def list_users(current_admin: dict = Depends(get_current_admin)):
    return {"message": "管理員可以看到這個"}

# 可選登入
@router.get("/public")
async def public_endpoint(
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    if current_user:
        return {"message": f"歡迎, {current_user['username']}"}
    else:
        return {"message": "歡迎訪客"}
"""