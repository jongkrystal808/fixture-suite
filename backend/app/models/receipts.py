"""
收料 / 退料 資料模型 (v3.0)
Receipts & Returns Models

對應資料表:
- receipts
- returns_table

v3.0 特色:
- vendor → customer_id
- fixture_code → fixture_id
- receipt_type → type
- 支援 batch / individual
- 完全對應 fixture_serials
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, validator
from enum import Enum


# ============================================================
# ENUM: 收料/退料類型
# ============================================================

class RecordType(str, Enum):
    BATCH = "batch"          # 批量：serial_start + serial_end
    INDIVIDUAL = "individual"  # 個別：serials


# ============================================================
# 收料基礎模型 (v3.0)
# ============================================================

class ReceiptBase(BaseModel):
    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID"
    )
    type: RecordType = Field(
        ...,
        description="收料類型 (batch/individual)"
    )
    order_no: str = Field(
        ...,
        max_length=100,
        description="單號"
    )
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID"
    )
    operator: Optional[str] = Field(
        None,
        max_length=50,
        description="操作者 (預設為登入帳號)"
    )
    note: Optional[str] = None


# ============================================================
# 批量收料 (batch)
# ============================================================

class ReceiptBatchCreate(ReceiptBase):
    type: RecordType = Field(default=RecordType.BATCH)
    serial_start: str = Field(
        ...,
        max_length=100,
        description="序號起始"
    )
    serial_end: str = Field(
        ...,
        max_length=100,
        description="序號結束"
    )


# ============================================================
# 個別收料 (individual)
# ============================================================

class ReceiptIndividualCreate(ReceiptBase):
    type: RecordType = Field(default=RecordType.INDIVIDUAL)
    serials: str = Field(
        ...,
        description="逗號分隔序號清單: A001, A002"
    )


# ============================================================
# 通用收料 (前端傳進來的資料支援 batch 或 individual)
# ============================================================

class ReceiptCreate(ReceiptBase):
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None
    serials: Optional[str] = None

    @validator("serials")
    def validate_serials(cls, v, values):
        if values.get("type") == RecordType.INDIVIDUAL:
            if not v:
                raise ValueError("individual 收料需要 serials")
        return v

    @validator("serial_start")
    def validate_serial_start(cls, v, values):
        if values.get("type") == RecordType.BATCH:
            if not v:
                raise ValueError("batch 收料需要 serial_start")
        return v

    @validator("serial_end")
    def validate_serial_end(cls, v, values):
        if values.get("type") == RecordType.BATCH:
            if not v:
                raise ValueError("batch 收料需要 serial_end")
        return v


# ============================================================
# 收料 回傳模型 (v3.0)
# ============================================================

class ReceiptResponse(BaseModel):
    id: int
    customer_id: str
    type: str
    order_no: str
    fixture_id: str
    serial_start: Optional[str]
    serial_end: Optional[str]
    serials: Optional[str]
    operator: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReceiptListResponse(BaseModel):
    total: int
    receipts: List[ReceiptResponse]


# ============================================================
# 退料模型 (v3.0) - mirrors receipts
# ============================================================

class ReturnBase(BaseModel):
    customer_id: str
    type: RecordType
    order_no: str
    fixture_id: str
    operator: Optional[str] = None
    note: Optional[str] = None


class ReturnBatchCreate(ReturnBase):
    type: RecordType = Field(default=RecordType.BATCH)
    serial_start: str
    serial_end: str


class ReturnIndividualCreate(ReturnBase):
    type: RecordType = Field(default=RecordType.INDIVIDUAL)
    serials: str


class ReturnCreate(ReturnBase):
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None
    serials: Optional[str] = None


class ReturnResponse(BaseModel):
    id: int
    customer_id: str
    type: str
    order_no: str
    fixture_id: str
    serial_start: Optional[str]
    serial_end: Optional[str]
    serials: Optional[str]
    operator: Optional[str]
    note: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ReturnListResponse(BaseModel):
    total: int
    returns: List[ReturnResponse]
