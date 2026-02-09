"""
收料 / 退料 資料模型 (v4.1)
SP-first 設計：Model 僅作為 SP 參數鏡像
- 新增 transaction_type（用於 receipt / return 分流）
- 不影響既有 record_type / serial / datecode 驗證
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, validator
from enum import Enum


# ============================================================
# ENUM
# ============================================================

class TransactionType(str, Enum):
    RECEIPT = "receipt"
    RETURN = "return"


class RecordType(str, Enum):
    BATCH = "batch"
    INDIVIDUAL = "individual"
    DATECODE = "datecode"


class SourceType(str, Enum):
    SELF_PURCHASED = "self_purchased"
    CUSTOMER_SUPPLIED = "customer_supplied"


# ============================================================
# Transaction Create (Receipt / Return 共用)
# ============================================================

class TransactionCreate(BaseModel):
    # ⭐ 關鍵：新增交易方向（收 / 退）
    transaction_type: TransactionType

    fixture_id: str
    order_no: Optional[str] = None
    operator: Optional[str] = None
    note: Optional[str] = None

    record_type: RecordType
    source_type: Optional[SourceType] = None


    # serial 模式（batch / individual）
    serials: Optional[List[str]] = None

    # datecode 模式
    datecode: Optional[str] = None
    quantity: Optional[int] = None

    # --------------------------------------------------------
    # Validators
    # --------------------------------------------------------

    @validator("serials", always=True)
    def validate_serials(cls, v, values):
        rt = values.get("record_type")
        if rt in (RecordType.BATCH, RecordType.INDIVIDUAL):
            if not v or len(v) == 0:
                raise ValueError("batch / individual 模式需要 serials")
        if rt == RecordType.DATECODE and v:
            raise ValueError("datecode 模式不可傳入 serials")
        return v

    @validator("datecode", always=True)
    def validate_datecode(cls, v, values):
        rt = values.get("record_type")
        if rt == RecordType.DATECODE and not v:
            raise ValueError("datecode 模式需要 datecode")
        if rt != RecordType.DATECODE and v:
            raise ValueError("非 datecode 模式不可傳入 datecode")
        return v

    @validator("quantity", always=True)
    def validate_quantity(cls, v, values):
        rt = values.get("record_type")
        if rt == RecordType.DATECODE:
            if v is None or v <= 0:
                raise ValueError("datecode 模式需要 quantity > 0")
        if rt != RecordType.DATECODE and v is not None:
            raise ValueError("非 datecode 模式不可傳入 quantity")
        return v


# ============================================================
# Response Models (v4.x)
# ============================================================

class TransactionResponse(BaseModel):
    id: int
    transaction_type: TransactionType
    record_type: RecordType
    fixture_id: str
    order_no: Optional[str]
    datecode: Optional[str]
    quantity: Optional[int]
    source_type: SourceType
    operator: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    total: int
    items: List[TransactionResponse]
