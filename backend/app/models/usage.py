"""
使用記錄資料模型 (v3.0)
Usage Log Data Models

對應資料表: usage_logs
"""

from typing import Optional
from pydantic import BaseModel, Field


# ============================================================
# 基礎欄位（與資料庫對應）
# ============================================================

class UsageBase(BaseModel):
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
    model_id: str = Field(
        ...,
        max_length=50,
        description="機種 ID",
        example="EDS-518A-MM-SC"
    )
    station_id: str = Field(
        ...,
        max_length=50,
        description="站點 ID (VARCHAR)",
        example="T1_MP"
    )
    operator: str = Field(
        ...,
        max_length=50,
        description="操作員",
        example="100182"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="功能測試 OK"
    )


# ============================================================
# 建立記錄
# ============================================================

class UsageCreate(UsageBase):
    """新增使用記錄"""
    pass


# ============================================================
# 更新記錄 (選擇性)
# ============================================================

class UsageUpdate(BaseModel):
    note: Optional[str] = None


# ============================================================
# 回傳模型（含 id / created_at）
# ============================================================

class UsageResponse(UsageBase):
    id: int = Field(..., description="使用記錄 ID (AUTO_INCREMENT)")
    created_at: Optional[str] = Field(None, description="建立時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1012,
                "customer_id": "MOXA",
                "fixture_id": "L-00017",
                "model_id": "EDS-518A-MM-SC",
                "station_id": "T1_MP",
                "operator": "100182",
                "note": "治具使用正常",
                "created_at": "2025-01-07 14:35:21"
            }
        }


# ============================================================
# 列表用（通常 JOIN fixture/model/station）
# ============================================================

class UsageWithDetails(UsageResponse):
    fixture_name: Optional[str] = Field(
        None,
        description="治具名稱 (JOIN fixtures)"
    )
    model_name: Optional[str] = Field(
        None,
        description="機種名稱 (JOIN machine_models)"
    )
    station_name: Optional[str] = Field(
        None,
        description="站點名稱 (JOIN stations)"
    )
