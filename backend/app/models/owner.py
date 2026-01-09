"""
負責人資料模型
Owner Data Models
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, validator



# ============================================================
# Create / Update
# ============================================================


class OwnerCreate(BaseModel):
    primary_owner_id: int = Field(..., gt=0)
    secondary_owner_id: Optional[int] = Field(None, gt=0)
    email: str
    note: Optional[str] = None



class OwnerUpdate(BaseModel):
    primary_owner_id: Optional[int] = Field(None, gt=0)
    secondary_owner_id: Optional[int] = Field(None, gt=0)
    email: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[int] = None



# ============================================================
# Response Models
# ============================================================

class OwnerResponse(BaseModel):
    id: int
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None

    primary_owner_id: int
    primary_owner_name: str

    secondary_owner_id: Optional[int]
    secondary_owner_name: Optional[str]

    email: Optional[str]
    note: Optional[str]
    is_active: int
    created_at: Optional[datetime]


class OwnerListResponse(BaseModel):
    total: int
    owners: List[OwnerResponse]


class OwnerSimple(BaseModel):
    id: int
    primary_owner_id: int
    primary_owner: str
