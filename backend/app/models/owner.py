"""
負責人（Owner Assignment）資料模型
對應 owners 表（user assignment）
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================
# Create / Update Models
# ============================================================

class OwnerCreate(BaseModel):
    """
    新增 Owner Assignment
    """
    primary_user_id: int = Field(..., gt=0, description="主負責人 users.id")
    secondary_user_id: Optional[int] = Field(None, gt=0, description="副負責人 users.id")
    note: Optional[str] = None


class OwnerUpdate(BaseModel):
    """
    更新 Owner Assignment
    """
    primary_user_id: Optional[int] = Field(None, gt=0)
    secondary_user_id: Optional[int] = Field(None, gt=0)
    note: Optional[str] = None
    is_active: Optional[int] = Field(None, ge=0, le=1)


# ============================================================
# Response Models
# ============================================================

class OwnerResponse(BaseModel):
    id: int
    customer_id: Optional[str] = None

    primary_user_id: int
    primary_user_name: str

    secondary_user_id: Optional[int] = None
    secondary_user_name: Optional[str] = None

    note: Optional[str] = None
    is_active: int
    created_at: Optional[datetime] = None


class OwnerListResponse(BaseModel):
    total: int
    owners: List[OwnerResponse]


class OwnerSimple(BaseModel):
    """
    給下拉選單使用
    """
    id: int
    primary_user_id: int
    primary_user_name: str
