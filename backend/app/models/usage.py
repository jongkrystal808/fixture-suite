"""
治具更換記錄資料模型 (v4.x)
Replacement Log Data Models

對應資料表: replacement_logs

v4.x 定位：
- Replacement = 純事件紀錄（event log）
- 不主控使用次數
- 不負責狀態歸零
"""

from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================
# 基礎欄位（對應 replacement_logs 資料表）
# ============================================================

class ReplacementBase(BaseModel):
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID"
    )

    # DB 語意：fixture / serial
    record_level: str = Field(
        ...,
        description="更換層級（DB 語意）：fixture / serial",
        example="fixture"
    )

    # record_level = serial 時需要
    serial_number: Optional[str] = Field(
        None,
        max_length=100,
        description="序號（record_level = serial 時必填）"
    )

    replacement_date: datetime = Field(
        ...,
        description="更換日期"
    )

    reason: Optional[str] = Field(
        None,
        description="更換原因"
    )

    executor: Optional[str] = Field(
        None,
        max_length=50,
        description="執行人員"
    )

    note: Optional[str] = Field(
        None,
        description="備註"
    )


# ============================================================
# 建立記錄（Create）
# ============================================================

class ReplacementCreate(ReplacementBase):
    """
    新增更換記錄（v4.x）

    - customer_id 由 Header Context 注入
    - 不處理 usage_before / usage_after
    """
    pass


# ============================================================
# 更新記錄（僅說明性欄位）
# ============================================================

class ReplacementUpdate(BaseModel):
    replacement_date: Optional[datetime] = None
    reason: Optional[str] = None
    executor: Optional[str] = None
    note: Optional[str] = None
    serial_number: Optional[str] = None  # 允許修正序號


# ============================================================
# 回傳模型（Response）
# ============================================================

class ReplacementResponse(ReplacementBase):
    id: int = Field(..., description="更換記錄 ID")

    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# 進階回傳模型（JOIN fixtures）
# ============================================================

class ReplacementWithDetails(ReplacementResponse):
    fixture_name: Optional[str] = Field(
        None,
        description="治具名稱（JOIN fixtures 取得）"
    )
