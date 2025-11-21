"""
治具需求資料模型 (v3.0)
Fixture Requirement Data Models

對應資料表: fixture_requirements
"""

from typing import Optional
from pydantic import BaseModel, Field


# ============================================================
# 基礎模型（與資料庫欄位一致）
# ============================================================

class FixtureRequirementBase(BaseModel):
    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID",
        example="MOXA"
    )
    model_id: str = Field(
        ...,
        max_length=50,
        description="機種代碼",
        example="EDS-518A-MM-SC"
    )
    station_id: str = Field(
        ...,
        max_length=50,
        description="站點代碼",
        example="T1_MP"
    )
    fixture_id: str = Field(
        ...,
        max_length=50,
        description="治具代碼",
        example="L-00017"
    )
    required_qty: int = Field(
        1,
        ge=1,
        description="需求數量"
    )
    note: Optional[str] = Field(
        None,
        description="備註"
    )


# ============================================================
# 建立模型
# ============================================================

class FixtureRequirementCreate(FixtureRequirementBase):
    """新增治具需求"""
    pass


# ============================================================
# 更新模型
# ============================================================

class FixtureRequirementUpdate(BaseModel):
    required_qty: Optional[int] = Field(
        None,
        ge=1,
        description="需求數量"
    )
    note: Optional[str] = None


# ============================================================
# 回傳模型（含 id/created_at）
# ============================================================

class FixtureRequirementResponse(FixtureRequirementBase):
    id: int = Field(..., description="需求記錄 ID（AUTO_INCREMENT）")
    created_at: Optional[str] = Field(None, description="建立時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 12,
                "customer_id": "MOXA",
                "model_id": "EDS-518A-MM-SC",
                "station_id": "T1_MP",
                "fixture_id": "L-00017",
                "required_qty": 8,
                "note": "T1 主板站需求",
                "created_at": "2025-01-01 10:00:00"
            }
        }
