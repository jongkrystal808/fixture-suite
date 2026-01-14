"""
治具更換事件資料模型 (v4.x FINAL)
Replacement Event Models

對應資料表: replacement_logs

設計原則：
- replacement = event（對齊 usage_logs）
- 不維護 summary / 不記 usage_before / after
- record_level 僅有 fixture / serial
- individual / batch 語意寫入 note
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================
# 基礎欄位（對齊 replacement_logs）
# ============================================================

class ReplacementBase(BaseModel):
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID"
    )

    record_level: Literal["fixture", "serial"] = Field(
        ...,
        description="事件層級（fixture / serial）",
        example="fixture"
    )

    serial_number: Optional[str] = Field(
        None,
        max_length=100,
        description="序號描述（record_level = serial 時使用）"
    )

    occurred_at: datetime = Field(
        ...,
        description="事件發生時間（replacement event）"
    )

    operator: Optional[str] = Field(
        None,
        max_length=100,
        description="操作人員（對齊 usage_logs.operator）"
    )

    note: Optional[str] = Field(
        None,
        description="事件備註（可含 individual / batch 語意）"
    )


# ============================================================
# 建立事件
# ============================================================

class ReplacementCreate(ReplacementBase):
    """
    新增更換事件（v4.x）
    """
    pass


# ============================================================
# 更新事件（僅允許修正描述性欄位）
# ============================================================

class ReplacementUpdate(BaseModel):
    occurred_at: Optional[datetime] = None
    operator: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# 回傳模型
# ============================================================

class ReplacementResponse(ReplacementBase):
    id: int = Field(..., description="更換事件 ID")
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================
# 進階回傳（JOIN fixtures）
# ============================================================

class ReplacementWithDetails(ReplacementResponse):
    fixture_name: Optional[str] = Field(
        None,
        description="治具名稱（JOIN fixtures 後取得）"
    )
