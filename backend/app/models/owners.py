"""
負責人資料模型
Owner Data Models

提供負責人相關的 Pydantic 模型，用於 API 請求/回應的資料驗證
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, validator, EmailStr


class OwnerBase(BaseModel):
    """負責人基礎模型"""
    customer_name: Optional[str] = Field(
        None,
        max_length=100,
        description="客戶名稱",
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

    @validator('primary_owner', 'secondary_owner', 'customer_name')
    def validate_names(cls, v):
        """驗證名稱欄位"""
        if v is not None and v.strip():
            return v.strip()
        elif v is not None and not v.strip():
            raise ValueError('名稱不能只有空白字元')
        return v

    @validator('note')
    def validate_note(cls, v):
        """驗證備註欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class OwnerCreate(OwnerBase):
    """建立負責人模型"""
    pass


class OwnerUpdate(BaseModel):
    """更新負責人模型 (所有欄位都是可選的)"""
    customer_name: Optional[str] = Field(
        None,
        max_length=100,
        description="客戶名稱"
    )
    primary_owner: Optional[str] = Field(
        None,
        max_length=100,
        description="主負責人姓名"
    )
    secondary_owner: Optional[str] = Field(
        None,
        max_length=100,
        description="副負責人姓名"
    )
    email: Optional[EmailStr] = Field(
        None,
        description="Email 地址"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )
    is_active: Optional[bool] = Field(
        None,
        description="是否啟用"
    )

    @validator('primary_owner', 'secondary_owner', 'customer_name')
    def validate_names(cls, v):
        """驗證名稱欄位"""
        if v is not None and v.strip():
            return v.strip()
        elif v is not None and not v.strip():
            raise ValueError('名稱不能只有空白字元')
        return v

    @validator('note')
    def validate_note(cls, v):
        """驗證備註欄位"""
        if v is not None:
            return v.strip() if v.strip() else None
        return v


class OwnerResponse(OwnerBase):
    """負責人回應模型 (API 回傳用)"""
    id: int = Field(..., description="負責人 ID")
    created_at: Optional[datetime] = Field(None, description="建立時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "customer_name": "ABC 科技股份有限公司",
                "primary_owner": "張三",
                "secondary_owner": "李四",
                "email": "owner@example.com",
                "note": "負責 A 產線治具管理",
                "is_active": True,
                "created_at": "2025-11-07T10:30:00"
            }
        }


class OwnerListResponse(BaseModel):
    """負責人列表回應模型"""
    total: int = Field(..., description="總筆數")
    owners: list[OwnerResponse] = Field(..., description="負責人列表")

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "owners": [
                    {
                        "id": 1,
                        "customer_name": "ABC 科技",
                        "primary_owner": "張三",
                        "secondary_owner": "李四",
                        "email": "zhang@example.com",
                        "note": "負責 A 產線",
                        "is_active": True,
                        "created_at": "2025-11-07T10:30:00"
                    },
                    {
                        "id": 2,
                        "customer_name": "XYZ 企業",
                        "primary_owner": "王五",
                        "secondary_owner": None,
                        "email": "wang@example.com",
                        "note": "負責 B 產線",
                        "is_active": True,
                        "created_at": "2025-11-07T11:00:00"
                    }
                ]
            }
        }


class OwnerWithFixturesResponse(OwnerResponse):
    """負責人回應模型 (含治具數量統計)"""
    fixture_count: int = Field(
        default=0,
        description="負責的治具總數"
    )
    active_fixture_count: int = Field(
        default=0,
        description="狀態為'正常'的治具數量"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "customer_name": "ABC 科技",
                "primary_owner": "張三",
                "secondary_owner": "李四",
                "email": "owner@example.com",
                "note": "負責 A 產線治具管理",
                "is_active": True,
                "created_at": "2025-11-07T10:30:00",
                "fixture_count": 25,
                "active_fixture_count": 22
            }
        }


class OwnerSimple(BaseModel):
    """簡化的負責人模型 (用於下拉選單等)"""
    id: int = Field(..., description="負責人 ID")
    primary_owner: str = Field(..., description="主負責人姓名")
    customer_name: Optional[str] = Field(None, description="客戶名稱")
    is_active: bool = Field(default=True, description="是否啟用")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "primary_owner": "張三",
                "customer_name": "ABC 科技",
                "is_active": True
            }
        }