"""
機種資料模型 (v3.0)
Machine Model Data Models

對應資料表: machine_models
"""

from typing import Optional
from pydantic import BaseModel, Field


# ============================================================
# 基礎模型 (與資料庫欄位一一對應)
# ============================================================

class MachineModelBase(BaseModel):
    id: str = Field(
        ...,
        max_length=50,
        description="機種代碼（主鍵）",
        example="EDS-518A-MM-SC"
    )
    customer_id: str = Field(
        ...,
        max_length=50,
        description="客戶 ID",
        example="MOXA"
    )
    model_name: str = Field(
        ...,
        max_length=255,
        description="機種名稱",
        example="EDS-518A-MM-SC 工控交換機"
    )
    note: Optional[str] = Field(
        None,
        description="備註",
        example="工控交換機主力機種"
    )


# ============================================================
# 建立模型
# ============================================================

class MachineModelCreate(MachineModelBase):
    """建立機種模型"""
    pass


# ============================================================
# 更新模型
# ============================================================

class MachineModelUpdate(BaseModel):
    model_name: Optional[str] = None
    note: Optional[str] = None


# ============================================================
# 回傳模型 (含 created_at)
# ============================================================

class MachineModelResponse(MachineModelBase):
    created_at: Optional[str] = Field(
        None,
        description="建立時間"
    )

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "EDS-518A-MM-SC",
                "customer_id": "MOXA",
                "model_name": "EDS-518A-MM-SC 工控交換機",
                "note": "主力機種",
                "created_at": "2025-01-01 10:00:00"
            }
        }
