# backend/app/routers/stats.py
"""
統計與儀表板 API
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Dict, List, Any
from datetime import datetime

from backend.app.database import db
from backend.app.dependencies import get_current_user  # 用 dependencies 的權限驗證

router = APIRouter(prefix="/stats", tags=["統計 Stats"])

def _scalar_int(sql: str, params: tuple | None = None, key: str = "count") -> int:
    """安全取回單一整數（查不到回 0）"""
    try:
        row = db.execute_query(sql, params or ())
        if not row:
            return 0
        # DictCursor：以欄位名取值
        v = list(row[0].values())[0] if key not in row[0] else row[0][key]
        return int(v or 0)
    except Exception:
        return 0

def _recent_list(sql: str, params: tuple | None = None, limit: int = 5) -> List[Dict[str, Any]]:
    try:
        return db.execute_query(sql + " LIMIT %s", ( *(params or ()), limit ))
    except Exception:
        return []

@router.get("/summary")
async def get_summary(current_user=Depends(get_current_user)) -> Dict[str, Any]:
    """
    儀表板統計總覽（給 /api/v2/stats/summary）
    """
    try:
        # 基本統計
        total_fixtures = _scalar_int("SELECT COUNT(*) AS count FROM fixtures")
        active_fixtures = _scalar_int(
            "SELECT COUNT(*) AS count FROM fixtures WHERE status='正常'"
        )

        # 需更換（若沒有視圖 view_fixture_status，回傳 0）
        need_replacement = _scalar_int(
            "SELECT COUNT(*) AS count FROM view_fixture_status WHERE replacement_status='需更換'"
        )

        # 收/退料統計
        today_receipts = _scalar_int(
            "SELECT COUNT(*) AS count FROM receipts WHERE DATE(created_at)=CURDATE()"
        )
        month_receipts = _scalar_int(
            "SELECT COUNT(*) AS count FROM receipts "
            "WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
        )

        today_returns = _scalar_int(
            "SELECT COUNT(*) AS count FROM returns_table WHERE DATE(created_at)=CURDATE()"
        )
        month_returns = _scalar_int(
            "SELECT COUNT(*) AS count FROM returns_table "
            "WHERE YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
        )

        # 最近清單（給首頁卡片使用）
        recent_receipts = _recent_list(
            "SELECT id, type, vendor, order_no, fixture_code, serial_start, serial_end, serials, "
            "operator, note, created_at FROM receipts ORDER BY created_at DESC",
            limit=5
        )
        recent_returns = _recent_list(
            "SELECT id, vendor, order_no, fixture_code, serials, operator, note, created_at "
            "FROM returns_table ORDER BY created_at DESC",
            limit=5
        )

        # 可加上「即將到期需更換」(若有 view 或欄位就放這裡；沒有就回空陣列)
        try:
            upcoming_replacements = db.execute_query(
                "SELECT fixture_id, fixture_name, last_replacement_date, cycle_unit, replacement_cycle "
                "FROM view_fixture_status "
                "WHERE replacement_status='即將更換' "
                "ORDER BY last_replacement_date ASC LIMIT 10"
            )
        except Exception:
            upcoming_replacements = []

        return {
            "totals": {
                "fixtures": total_fixtures,
                "active": active_fixtures,
                "need_replacement": need_replacement,
            },
            "receipts": {
                "today": today_receipts,
                "month": month_receipts,
                "recent": recent_receipts,
            },
            "returns": {
                "today": today_returns,
                "month": month_returns,
                "recent": recent_returns,
            },
            "upcoming_replacements": upcoming_replacements,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        # 保留 traceback 在伺服器端，對客戶端回 500
        raise HTTPException(status_code=500, detail=f"統計查詢失敗: {e}")
