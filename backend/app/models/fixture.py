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
  id: str = Field(..., description="治具編號")   # ⭐ 主鍵統一
  fixture_name: str = Field(..., description="治具名稱")
  fixture_type: Optional[str] = None

  self_purchased_qty: int = 0
  customer_supplied_qty: int = 0

  storage_location: Optional[str] = None
  replacement_cycle: Optional[int] = None
  cycle_unit: Optional[str] = None

  status: Optional[str] = None
  owner_id: Optional[int] = None
  note: Optional[str] = None



class FixtureCreate(FixtureBase):
  """建立治具時使用"""
  pass


class FixtureUpdate(BaseModel):
  """更新治具時使用（全部欄位選填）"""

  fixture_name: Optional[str] = None
  fixture_type: Optional[str] = None

  self_purchased_qty: Optional[int] = None
  customer_supplied_qty: Optional[int] = None

  storage_location: Optional[str] = None
  replacement_cycle: Optional[int] = None
  cycle_unit: Optional[str] = None

  status: Optional[str] = None

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
      description = "可用總數量（serial available + datecode available）" )

  created_at: Optional[datetime] = None
  updated_at: Optional[datetime] = None

  model_config = ConfigDict(from_attributes=True)

# ============================================================
# view_fixture_status 視圖用模型
# ============================================================

class FixtureStatusViewRow(BaseModel):
  """
  對應資料庫 view_fixture_status 的欄位。
  為了安全起見全部設為 Optional，並允許 extra key 被忽略，
  這樣即使 SQL 有多回幾個欄位也不會爆。
  """
  fixture_id: Optional[str] = None
  fixture_name: Optional[str] = None
  storage_location: Optional[str] = None
  customer_id: Optional[str] = None

  total_qty: Optional[int] = None
  in_use_qty: Optional[int] = None
  available_qty: Optional[int] = None

  used_count: Optional[int] = None
  last_used_at: Optional[datetime] = None

  replacement_due: Optional[date] = None
  replacement_status: Optional[str] = None

  owner_name: Optional[str] = None

  model_config = ConfigDict(extra="ignore")

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
    status: str

# ============================================================
# 治具狀態視圖（視圖模式）
# ============================================================

class FixtureStatus_View(BaseModel):
    fixture_id: str
    status: str
    owner_name: Optional[str] = None
    last_used_at: Optional[datetime] = None


# ============================================================
# 治具統計（總覽統計）
# ============================================================

class FixtureStatistics(BaseModel):
    total_fixtures: int
    available_qty: int
    deployed_qty: int
    maintenance_qty: int
    scrapped_qty: int
    returned_qty: int


# ============================================================
# 治具狀態（基本狀態欄位）
# ============================================================

class FixtureStatus(BaseModel):
    status: str


# ============================================================
# 週期單位（可選擇單位）
# ============================================================

class CycleUnit(BaseModel):
    value: str  # days, uses, etc.