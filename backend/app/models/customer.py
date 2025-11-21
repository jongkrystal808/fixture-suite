from pydantic import BaseModel
from typing import Optional


class CustomerBase(BaseModel):
    id: str
    customer_abbr: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True
    note: Optional[str] = None


class CustomerCreate(CustomerBase):
    """
    新增客戶時使用
    """
    pass


class CustomerUpdate(BaseModel):
    """
    更新客戶時使用（部分欄位可空）
    """
    customer_abbr: Optional[str] = None
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    note: Optional[str] = None


class CustomerResponse(CustomerBase):
    """
    回傳客戶資料（包含時間戳）
    """
    created_at: str
    updated_at: str
