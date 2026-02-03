"""
治具資料 Pydantic 模型
backend/app/models/fixture.py

提供給 routers/fixtures.py 使用的 Schema：
- FixtureBase
- FixtureCreate
- FixtureUpdate
- FixtureResponse
- FixtureStatusViewRow
"""

from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# 共用基底模型
# ============================================================

class FixtureBase(BaseModel):
  id: str = Field(..., description="治具編號")
  fixture_name: str = Field(..., description="治具名稱")
  fixture_type: Optional[str] = None

  # ⚠️ 這些是 cache / summary，不是人為輸入
  self_purchased_qty: int = 0
  customer_supplied_qty: int = 0

  storage_location: Optional[str] = None
  replacement_cycle: Optional[int] = None
  cycle_unit: Optional[str] = None

  owner_id: Optional[int] = None
  note: Optional[str] = None



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
# 治具回應（API回傳資料模型）
# ============================================================
class FixtureResponse(FixtureBase):
  """API 回傳用治具資料（比 Base 多一些衍生欄位）"""

  owner_name: Optional[str] = Field(None, description="負責人姓名（JOIN owners 表）")
  customer_id: Optional[str] = Field(None, description="客戶代碼（如有）")

  total_qty: Optional[int] = Field(
      None,
      description="治具總數（收料總數 - 退料總數，包含 in_stock / deployed / maintenance / returned / scrapped）"
  )

  created_at: Optional[datetime] = None
  updated_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)

# ============================================================
# 治具列表回應（包含總數及治具資料）
# ============================================================

class FixtureListResponse(BaseModel):
    total: int
    fixtures: List[FixtureResponse]

# ============================================================
# 簡化的治具資料（下拉選單用）
# ============================================================

class FixtureSimple(BaseModel):
    fixture_id: str
    fixture_name: str

# ============================================================
# 治具狀態視圖（視圖模式）
# ============================================================
class FixtureStatusViewRow(BaseModel):
  """
  對應資料庫 view_fixture_status
  """
  fixture_id: Optional[str] = None
  fixture_name: Optional[str] = None
  storage_location: Optional[str] = None
  customer_id: Optional[str] = None

  total_qty: Optional[int] = None
  in_use_qty: Optional[int] = None
  in_stock_qty: Optional[int] = None

  used_count: Optional[int] = None
  last_used_at: Optional[datetime] = None

  replacement_due: Optional[date] = None
  replacement_status: Optional[str] = None

  owner_name: Optional[str] = None

  model_config = ConfigDict(extra="ignore")


# ============================================================
# 治具統計（總覽統計）
# ============================================================

class FixtureStatistics(BaseModel):
    total_fixtures: int
    in_stock_qty: int
    deployed_qty: int
    maintenance_qty: int
    scrapped_qty: int
    returned_qty: int



# ============================================================
# 週期單位（可選擇單位）
# ============================================================

from enum import Enum

class CycleUnit(str, Enum):
    uses = "uses"
    days = "days"
    none = "none"
