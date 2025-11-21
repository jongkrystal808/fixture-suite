"""
治具更換記錄資料模型 (v3.0)
Replacement Log Data Models

對應資料表: replacement_logs
"""

from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


# ============================================================
# 基礎欄位 (與資料庫欄位對應)
# ============================================================

class ReplacementBase(BaseModel):
    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID",
        example="MOXA"
    )
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具 ID",
        example="L-00017"
    )
    replacement_date: date = Field(
        ...,
        description="更換日期",
        example="2025-11-07"
    )
    reason: Optional[str] = Field(
        None,
        description="更換原因",
        example="達到使用壽命"
    )
    executor: Optional[str] = Field(
        None,
        max_length=50,
        description="執行人員",
        example="user001"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="已更換新治具"
    )


# ============================================================
# 建立記錄
# ============================================================

class ReplacementCreate(ReplacementBase):
    """新增更換記錄"""
    pass


# ============================================================
# 更新記錄
# ============================================================

class ReplacementUpdate(BaseModel):
    replacement_date: Optional[date] = Field(
        None,
        description="更換日期"
    )
    reason: Optional[str] = None
    executor: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# 回傳模型 (含 id / created_at)
# ============================================================

class ReplacementResponse(ReplacementBase):
    id: int = Field(..., description="更換記錄 ID (AUTO_INCREMENT)")
    created_at: Optional[str] = Field(
        None,
        description="建立時間"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 123,
                "customer_id": "MOXA",
                "fixture_id": "L-00017",
                "replacement_date": "2025-11-07",
                "reason": "達到使用壽命",
                "executor": "100182",
                "note": "已更換新治具",
                "created_at": "2025-11-07 10:20:00"
            }
        }


# ============================================================
# 進階回傳模型（JOIN fixture 取得治具名稱）
# ============================================================

class ReplacementWithDetails(ReplacementResponse):
    fixture_name: Optional[str] = Field(
        None,
        description="治具名稱 (JOIN fixtures 後取得)"
    )
