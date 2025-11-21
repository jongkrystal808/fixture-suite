"""
站點資料模型 (v3.0 版本)
Station Data Models (Aligned with DB v3.0 Schema)

變更內容：
- station_code → id (站點主鍵)
- station_id:int → 移除
- 加入 customer_id
- 所有衍生模型更新為 v3.0 欄位
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================
# 基礎模型
# ============================================================

class StationBase(BaseModel):
    id: str = Field(
        ...,
        max_length=50,
        description="站點代碼（主鍵）",
        example="T1_MP"
    )
    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID",
        example="MOXA"
    )
    station_name: Optional[str] = Field(
        None,
        max_length=100,
        description="站點名稱",
        example="T1 主板測試站"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="主板測試第一站"
    )


class StationCreate(StationBase):
    """建立站點模型"""
    pass


class StationUpdate(BaseModel):
    station_name: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# 回傳模型
# ============================================================

class StationResponse(StationBase):
    created_at: Optional[str] = Field(None, description="建立時間")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "T1_MP",
                "customer_id": "MOXA",
                "station_name": "T1 主板測試站",
                "note": "主板測試第一站",
                "created_at": "2025-01-01 10:00:00"
            }
        }


# ============================================================
# 下拉選單用
# ============================================================

class StationSimple(BaseModel):
    id: str = Field(..., description="站點代碼")
    station_name: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# 附帶部署數／需求數等統計資訊
# ============================================================

class StationWithDeployment(StationResponse):
    deployed_fixture_count: int = Field(0, description="部署的治具種類數量")
    total_deployed_qty: int = Field(0, description="部署的治具總數量")


class StationWithRequirements(StationResponse):
    required_fixture_count: int = Field(0, description="需要的治具種類數量")
    model_count: int = Field(0, description="關聯的機種數量")


# ============================================================
# 站點統計資訊
# ============================================================

class StationStatistics(BaseModel):
    station: StationResponse
    fixture_types: int = Field(..., description="治具種類數")
    total_fixtures: int = Field(..., description="治具總數")
    active_fixtures: int = Field(..., description="正常治具數")
    models_using: int = Field(..., description="使用此站點的機種數")
