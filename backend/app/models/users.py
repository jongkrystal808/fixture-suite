"""
使用者資料模型
User Data Models

提供使用者相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


class UserRole(str, Enum):
    """使用者角色列舉"""
    ADMIN = "admin"
    USER = "user"


class UserBase(BaseModel):
    """使用者基礎模型"""
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="使用者工號",
        example="user001"
    )
    role: UserRole = Field(
        default=UserRole.USER,
        description="使用者角色 (admin/user)"
    )

    @validator('username')
    def validate_username(cls, v):
        """驗證使用者名稱格式"""
        if not v.strip():
            raise ValueError('使用者名稱不能為空白')
        # 只允許英數字、底線、連字號
        if not all(c.isalnum() or c in ['_', '-'] for c in v):
            raise ValueError('使用者名稱只能包含英數字、底線或連字號')
        return v.strip()


class UserCreate(UserBase):
    """建立使用者模型 (註冊用)"""
    password: str = Field(
        ...,
        min_length=6,
        max_length=100,
        description="使用者密碼",
        example="password123"
    )

    @validator('password')
    def validate_password(cls, v):
        """驗證密碼強度"""
        if not v.strip():
            raise ValueError('密碼不能為空白')
        if len(v) < 6:
            raise ValueError('密碼長度至少需要 6 個字元')
        return v


class UserLogin(BaseModel):
    """使用者登入模型"""
    username: str = Field(
        ...,
        description="使用者工號",
        example="admin"
    )
    password: str = Field(
        ...,
        description="使用者密碼",
        example="admin123"
    )


class UserResponse(UserBase):
    """使用者回應模型 (API 回傳用，不含密碼)"""
    id: int = Field(..., description="使用者 ID")
    created_at: Optional[datetime] = Field(None, description="建立時間")

    class Config:
        from_attributes = True  # Pydantic v2 (舊版是 orm_mode = True)
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "admin",
                "role": "admin",
                "created_at": "2025-11-07T10:30:00"
            }
        }


class UserInDB(UserBase):
    """資料庫中的使用者模型 (含密碼 hash)"""
    id: int
    password_hash: str = Field(..., description="密碼雜湊值")
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """更新使用者模型 (所有欄位都是可選的)"""
    username: Optional[str] = Field(
        None,
        min_length=3,
        max_length=50,
        description="使用者工號"
    )
    password: Optional[str] = Field(
        None,
        min_length=6,
        max_length=100,
        description="新密碼 (如果要更改)"
    )
    role: Optional[UserRole] = Field(
        None,
        description="使用者角色"
    )

    @validator('username')
    def validate_username(cls, v):
        """驗證使用者名稱格式"""
        if v is not None:
            if not v.strip():
                raise ValueError('使用者名稱不能為空白')
            if not all(c.isalnum() or c in ['_', '-'] for c in v):
                raise ValueError('使用者名稱只能包含英數字、底線或連字號')
            return v.strip()
        return v

    @validator('password')
    def validate_password(cls, v):
        """驗證密碼強度"""
        if v is not None:
            if not v.strip():
                raise ValueError('密碼不能為空白')
            if len(v) < 6:
                raise ValueError('密碼長度至少需要 6 個字元')
            return v
        return v


class LoginResponse(BaseModel):
    """登入成功回應模型"""
    access_token: str = Field(..., description="存取權杖 (JWT)")
    token_type: str = Field(default="bearer", description="權杖類型")
    user: UserResponse = Field(..., description="使用者資訊")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "admin",
                    "role": "admin",
                    "created_at": "2025-11-07T10:30:00"
                }
            }
        }


class PasswordChange(BaseModel):
    """修改密碼模型"""
    old_password: str = Field(..., description="舊密碼")
    new_password: str = Field(
        ...,
        min_length=6,
        description="新密碼"
    )

    @validator('new_password')
    def validate_new_password(cls, v, values):
        """驗證新密碼"""
        if 'old_password' in values and v == values['old_password']:
            raise ValueError('新密碼不能與舊密碼相同')
        if len(v) < 6:
            raise ValueError('新密碼長度至少需要 6 個字元')
        return v


class UserListResponse(BaseModel):
    """使用者列表回應模型"""
    total: int = Field(..., description="總筆數")
    users: list[UserResponse] = Field(..., description="使用者列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "users": [
                    {
                        "id": 1,
                        "username": "admin",
                        "role": "admin",
                        "created_at": "2025-11-07T10:30:00"
                    },
                    {
                        "id": 2,
                        "username": "user001",
                        "role": "user",
                        "created_at": "2025-11-07T11:00:00"
                    }
                ]
            }
        }