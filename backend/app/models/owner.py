"""
負責人資料模型
Owner Data Models
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator


# ============================================================
# 共用驗證工具
# ============================================================

def strip_or_none(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    v = v.strip()
    return v if v else None


# ============================================================
# Base
# ============================================================

class OwnerBase(BaseModel):
    """負責人基礎模型"""

    customer_id: Optional[str] = Field(
        None,
        description="客戶 ID（NULL 表示跨客戶）",
        example="CUST-001"
    )

    customer_name: Optional[str] = Field(
        None,
        max_length=100,
        description="客戶名稱（顯示用）",
        example="ABC 科技股份有限公司"
    )

    primary_owner: str = Field(
        ...,
        max_length=100,
        description="主負責人姓名",
        example="張三"
    )

    secondary_owner: Optional[str] = Field(
        None,
        max_length=100,
        description="副負責人姓名",
        example="李四"
    )

    email: Optional[EmailStr] = Field(
        None,
        description="Email 地址",
        example="owner@example.com"
    )

    note: Optional[str] = Field(
        None,
        description="備註",
        example="負責 A 產線治具管理"
    )

    is_active: bool = Field(
        default=True,
        description="是否啟用"
    )

    # ---------- validators ----------

    @validator("primary_owner", "secondary_owner", "customer_name", pre=True)
    def validate_names(cls, v):
        return strip_or_none(v)

    @validator("note", pre=True)
    def validate_note(cls, v):
        return strip_or_none(v)


# ============================================================
# Create / Update
# ============================================================

class OwnerCreate(OwnerBase):
    """建立負責人模型"""
    pass


class OwnerUpdate(BaseModel):
    """更新負責人模型"""

    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    primary_owner: Optional[str] = None
    secondary_owner: Optional[str] = None
    email: Optional[EmailStr] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None

    @validator("primary_owner", "secondary_owner", "customer_name", pre=True)
    def validate_names(cls, v):
        return strip_or_none(v)

    @validator("note", pre=True)
    def validate_note(cls, v):
        return strip_or_none(v)


# ============================================================
# Response Models
# ============================================================

class OwnerResponse(OwnerBase):
    """負責人回應模型"""

    id: int = Field(..., description="負責人 ID")
    created_at: Optional[datetime] = Field(None, description="建立時間")

    class Config:
        from_attributes = True


class OwnerListResponse(BaseModel):
    """負責人列表回應模型"""

    total: int
    owners: List[OwnerResponse]


class OwnerWithFixturesResponse(OwnerResponse):
    """負責人回應模型（含治具統計）"""

    fixture_count: int = 0
    active_fixture_count: int = 0


class OwnerSimple(BaseModel):
    """簡化負責人模型（下拉選單用）"""

    id: int
    primary_owner: str

    class Config:
        from_attributes = True
