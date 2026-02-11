"""
治具資料 Pydantic 模型
backend/app/models/fixture.py

v4.x 狀態模型對齊版
"""

from datetime import datetime, date
from typing import Optional, List
from enum import Enum

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# 共用基底模型（只放「人可以填的欄位」）
# ============================================================

class FixtureBase(BaseModel):
    id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    fixture_type: Optional[str] = None

    storage_location: Optional[str] = None
    replacement_cycle: Optional[int] = None
    cycle_unit: Optional[str] = None

    owner_id: Optional[int] = None
    note: Optional[str] = None


# ============================================================
# 建立 / 更新
# ============================================================

class FixtureCreate(FixtureBase):
    """建立治具時使用"""
    pass


class FixtureUpdate(BaseModel):
    """更新治具時使用（全部欄位選填）"""

    fixture_name: Optional[str] = None
    fixture_type: Optional[str] = None

    storage_location: Optional[str] = None
    replacement_cycle: Optional[int] = None
    cycle_unit: Optional[str] = None

    owner_id: Optional[int] = None
    note: Optional[str] = None


# ============================================================
# 治具回應（API 回傳資料模型）
# ============================================================

class FixtureResponse(FixtureBase):
    """API 回傳用治具資料（包含 DB 計算欄位）"""

    customer_id: Optional[str] = None
    owner_name: Optional[str] = Field(None, description="負責人姓名（JOIN owners 表）")

    # === DB 計算結果（只讀） ===
    in_stock_qty: int = 0
    deployed_qty: int = 0
    maintenance_qty: int = 0
    returned_qty: int = 0
    scrapped_qty: int = 0

    self_purchased_qty: int = 0
    customer_supplied_qty: int = 0

    # 顯示用 aggregate（非核心欄位）
    total_qty: Optional[int] = Field(
        None,
        description="顯示用總數（序號 + 日期碼聚合結果）"
    )

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================
# 治具列表回應
# ============================================================

class FixtureListResponse(BaseModel):
    total: int
    fixtures: List[FixtureResponse]


# ============================================================
# 簡化治具資料（下拉選單）
# ============================================================

class FixtureSimple(BaseModel):
    fixture_id: str
    fixture_name: str


# ============================================================
# 治具狀態視圖（View 專用）
# ============================================================

class FixtureStatusViewRow(BaseModel):
    """
    對應資料庫 view（僅顯示，不可回寫）
    """
    fixture_id: Optional[str] = None
    fixture_name: Optional[str] = None
    storage_location: Optional[str] = None
    customer_id: Optional[str] = None

    total_qty: Optional[int] = None
    in_stock_qty: Optional[int] = None
    in_use_qty: Optional[int] = None

    used_count: Optional[int] = None
    last_used_at: Optional[datetime] = None

    replacement_due: Optional[date] = None
    replacement_status: Optional[str] = None

    owner_name: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


# ============================================================
# 統計用（Dashboard）
# ============================================================

class FixtureStatistics(BaseModel):
    total_fixtures: int
    in_stock_qty: int
    deployed_qty: int
    maintenance_qty: int
    returned_qty: int
    scrapped_qty: int


# ============================================================
# 週期單位
# ============================================================

class CycleUnit(str, Enum):
    uses = "uses"
    days = "days"
    none = "none"
