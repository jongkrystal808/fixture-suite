"""
Inventory Router (Read-only)
庫存查詢 API（v6｜existence_status / usage_status）
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from collections import defaultdict
import re
from backend.app.database import db
from backend.app.dependencies import get_current_customer_id

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


# ============================================================
# 序號庫存（Serial Inventory）
# - v6 專業版：fixture inline detail 時回傳「分狀態壓縮 ranges」
# - fallback：維持原本分頁 items
# ============================================================
@router.get("/serial")
def list_serial_inventory(
    customer_id: str = Depends(get_current_customer_id),
    existence_status: Optional[str] = Query(None),
    usage_status: Optional[str] = Query(None),
    fixture_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=5000),
):

    # -----------------------------
    # WHERE
    # -----------------------------
    where = ["customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    # ⚠️ 注意：如果你要「三狀態完整顯示」，
    # 前端呼叫這支時不要帶 existence_status/usage_status 篩選。
    if existence_status:
        where.append("existence_status = %s")
        params.append(existence_status)

    if usage_status:
        where.append("usage_status = %s")
        params.append(usage_status)

    where_sql = " AND ".join(where)

    # =========================================================
    # ✅ 專業模式：fixture inline detail（skip==0 且 fixture_id 有帶）
    # 只有在「未帶 existence_status / usage_status 篩選」時，
    # 才回傳三狀態壓縮（避免篩選造成 UI 顯示不完整）
    # =========================================================
    if fixture_id and skip == 0 and (not existence_status) and (not usage_status):
        rows = db.execute_query(
            f"""
            SELECT
                serial_number,
                existence_status,
                usage_status
            FROM fixture_serials
            WHERE customer_id = %s
              AND fixture_id = %s
            ORDER BY serial_number
            """,
            (customer_id, fixture_id),
        ) or []

        idle = []
        deployed = []
        maintenance = []
        returned_count = 0
        scrapped_count = 0

        for r in rows:
            sn = r.get("serial_number")
            ex = r.get("existence_status")
            us = r.get("usage_status")

            if not sn:
                continue

            if ex == "in_stock":
                if us == "idle":
                    idle.append(sn)
                elif us == "deployed":
                    deployed.append(sn)
                elif us == "maintenance":
                    maintenance.append(sn)
                else:
                    # 未知 usage_status（保守丟到 idle，避免 UI 完全消失）
                    idle.append(sn)

            elif ex == "returned":
                returned_count += 1
            elif ex == "scrapped":
                scrapped_count += 1

        return {
            "fixture_id": fixture_id,
            "total": len(rows),

            "idle": {
                "count": len(idle),
                "ranges": compress_serial_ranges(idle),
            },
            "deployed": {
                "count": len(deployed),
                "ranges": compress_serial_ranges(deployed),
            },
            "maintenance": {
                "count": len(maintenance),
                "ranges": compress_serial_ranges(maintenance),
            },

            "returned": returned_count,
            "scrapped": scrapped_count,
        }

    # =========================================================
    # ✅ 相容模式：如果 fixture_id + skip==0 但有帶篩選
    # 就回傳「單一壓縮 ranges」（你原本的行為）
    # =========================================================
    if fixture_id and skip == 0:
        rows = db.execute_query(
            f"""
            SELECT serial_number
            FROM fixture_serials
            WHERE {where_sql}
            ORDER BY serial_number
            """,
            tuple(params),
        ) or []

        serials = [r["serial_number"] for r in rows if r.get("serial_number")]
        ranges = compress_serial_ranges(serials)

        return {
            "fixture_id": fixture_id,
            "count": len(serials),
            "ranges": ranges,
            "filters": {
                "existence_status": existence_status,
                "usage_status": usage_status,
            }
        }

    # =========================================================
    # fallback：原本分頁 items
    # =========================================================
    rows = db.execute_query(
        f"""
        SELECT
            fixture_id,
            serial_number,
            existence_status,
            usage_status,
            source_type,
            current_station_id,
            receipt_date,
            return_date,
            note
        FROM fixture_serials
        WHERE {where_sql}
        ORDER BY fixture_id, serial_number
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, skip]),
    ) or []

    return {
        "items": rows,
        "skip": skip,
        "limit": limit,
    }


# ============================================================
# Datecode 庫存
# ============================================================
@router.get("/datecode")
def list_datecode_inventory(
    customer_id: str = Depends(get_current_customer_id),
    fixture_id: Optional[str] = Query(default=None),
    only_in_stock: bool = Query(default=True),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
):

    where = ["customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id = %s")
        params.append(fixture_id)

    if only_in_stock:
        where.append("in_stock_qty > 0")

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT
            fixture_id,
            datecode,
            in_stock_qty,
            returned_qty,
            source_type,
            updated_at
        FROM fixture_datecode_inventory
        WHERE {where_sql}
        ORDER BY fixture_id, datecode
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])
    rows = db.execute_query(sql, tuple(params)) or []

    # 🔥 加上 fixture-level usage（給 UI 用）
    total_usage = 0
    if fixture_id:
        usage_row = db.execute_one(
            """
            SELECT total_use_count
            FROM fixture_usage_summary
            WHERE customer_id = %s
              AND fixture_id = %s
            """,
            (customer_id, fixture_id)
        )
        if usage_row:
            total_usage = usage_row.get("total_use_count") or 0

    return {
        "items": rows,
        "total_usage": total_usage,
        "skip": skip,
        "limit": limit,
    }


# ============================================================
# Inventory History（序號 / 批量 / Datecode 整合）
# ============================================================
@router.get("/history")
def list_inventory_history(
    customer_id: str = Depends(get_current_customer_id),
    fixture_id: str = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
):
    sql = """
        SELECT *
        FROM v_inventory_history
        WHERE customer_id = %s
          AND fixture_id = %s
        ORDER BY transaction_date DESC, id DESC
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(
        sql,
        (customer_id, fixture_id, limit, skip)
    )

    return {
        "items": rows,
        "skip": skip,
        "limit": limit,
    }


@router.get("/search")
def search_inventory(
    fixture_id: str = Query(...),
    keyword: str = Query(""),
    customer_id: str = Depends(get_current_customer_id),
):
    """
    Inventory 搜尋：
    1. fixture_id only (summary)
    2. fixture_id + serial
    3. fixture_id + datecode
    """

    # ==================================================
    # 0️⃣ 只搜尋治具（summary）
    # ==================================================
    if keyword in ("", "*"):
        serial_summary = db.execute_one(
            """
            SELECT
                SUM(CASE WHEN existence_status='in_stock' THEN 1 ELSE 0 END) AS in_stock_qty,
                SUM(CASE WHEN existence_status='returned' THEN 1 ELSE 0 END) AS returned_qty,
                SUM(CASE WHEN existence_status='scrapped' THEN 1 ELSE 0 END) AS scrapped_qty,

                SUM(CASE WHEN existence_status='in_stock' AND usage_status='idle' THEN 1 ELSE 0 END) AS available_qty,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='deployed' THEN 1 ELSE 0 END) AS deployed_qty,
                SUM(CASE WHEN existence_status='in_stock' AND usage_status='maintenance' THEN 1 ELSE 0 END) AS maintenance_qty
            FROM fixture_serials
            WHERE customer_id = %s
              AND fixture_id = %s
            """,
            (customer_id, fixture_id)
        ) or {}

        datecode_summary = db.execute_query(
            """
            SELECT
                datecode,
                in_stock_qty,
                returned_qty,
                source_type
            FROM fixture_datecode_inventory
            WHERE customer_id = %s
              AND fixture_id = %s
            ORDER BY datecode
            """,
            (customer_id, fixture_id)
        ) or []

        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions
            WHERE customer_id = %s
              AND fixture_id = %s
            ORDER BY transaction_date DESC, id DESC
            LIMIT 50
            """,
            (customer_id, fixture_id)
        ) or []

        return {
            "type": "fixture",
            "fixture_id": fixture_id,
            "found": True,
            "summary": {
                "serial_in_stock": serial_summary.get("in_stock_qty") or 0,
                "serial_available": serial_summary.get("available_qty") or 0,
                "serial_deployed": serial_summary.get("deployed_qty") or 0,
                "serial_maintenance": serial_summary.get("maintenance_qty") or 0,
                "serial_returned": serial_summary.get("returned_qty") or 0,
                "serial_scrapped": serial_summary.get("scrapped_qty") or 0,
                "datecodes": datecode_summary,
            },
            "history": history,
        }

    # ==================================================
    # 1️⃣ serial 搜尋
    # ==================================================
    serial_row = db.execute_one(
        """
        SELECT
            fixture_id,
            serial_number,
            existence_status,
            usage_status,
            current_station_id,
            receipt_date,
            return_date,
            note
        FROM fixture_serials
        WHERE customer_id = %s
          AND fixture_id = %s
          AND serial_number = %s
        LIMIT 1
        """,
        (customer_id, fixture_id, keyword)
    )

    if serial_row:
        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions mt
            WHERE mt.customer_id = %s
              AND mt.fixture_id = %s
              AND EXISTS (
                SELECT 1
                FROM material_transaction_items mti
                WHERE mti.transaction_id = mt.id
                  AND mti.serial_number = %s
              )
            ORDER BY transaction_date DESC, mt.id DESC
            """,
            (customer_id, fixture_id, keyword)
        ) or []

        is_available = (
            serial_row["existence_status"] == "in_stock"
            and serial_row["usage_status"] == "idle"
        )

        # 相容舊前端（仍回傳 status），但同時提供 v6 欄位
        api_status = (
            serial_row["existence_status"]
            if serial_row["existence_status"] != "in_stock"
            else serial_row["usage_status"]
        )

        return {
            "type": "serial",
            "fixture_id": fixture_id,
            "found": True,
            "status": api_status,                 # legacy compatibility
            "is_available": is_available,         # v6 recommended
            "data": serial_row,
            "history": history,
        }

    # ==================================================
    # 2️⃣ datecode 搜尋
    # ==================================================
    datecode_row = db.execute_one(
        """
        SELECT
            fixture_id,
            datecode,
            in_stock_qty,
            returned_qty,
            source_type,
            updated_at
        FROM fixture_datecode_inventory
        WHERE customer_id = %s
          AND fixture_id = %s
          AND datecode = %s
        LIMIT 1
        """,
        (customer_id, fixture_id, keyword)
    )

    if datecode_row:
        history = db.execute_query(
            """
            SELECT
                transaction_date AS date,
                order_no,
                record_type,
                source_type,
                quantity,
                operator,
                note
            FROM material_transactions
            WHERE customer_id = %s
              AND fixture_id = %s
              AND datecode = %s
            ORDER BY transaction_date DESC, id DESC
            """,
            (customer_id, fixture_id, keyword)
        ) or []

        api_status = "in_stock" if (datecode_row["in_stock_qty"] or 0) > 0 else "returned"

        return {
            "type": "datecode",
            "fixture_id": fixture_id,
            "found": True,
            "status": api_status,
            "data": datecode_row,
            "history": history,
        }

    # ==================================================
    # 3️⃣ 全部找不到
    # ==================================================
    return {
        "type": None,
        "fixture_id": fixture_id,
        "found": False,
        "message": "查無此治具 / 序號 / Datecode"
    }


@router.get("")
def list_inventory_overview(
    customer_id: str = Depends(get_current_customer_id),
    keyword: str = Query(""),
    hide_zero: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1),
):

    where = ["f.customer_id = %s", "f.is_scrapped = 0"]
    params = [customer_id]

    if keyword:
        where.append("(f.id LIKE %s OR f.fixture_name LIKE %s)")
        params.extend([f"%{keyword}%", f"%{keyword}%"])

    if hide_zero:
        where.append("f.in_stock_qty > 0")

    where_sql = " AND ".join(where)

    # -----------------------------
    # total
    # -----------------------------
    total_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM fixtures f
        WHERE {where_sql}
    """
    total = db.execute_one(total_sql, tuple(params))["cnt"]

    # -----------------------------
    # data
    # -----------------------------
    data_sql = f"""
        SELECT
            f.id AS fixture_id,
            f.fixture_name,

            f.in_stock_qty,
            f.customer_supplied_qty,
            f.self_purchased_qty,
            f.returned_qty,

            f.deployed_qty,
            f.maintenance_qty,
            f.scrapped_qty

        FROM fixtures f
        WHERE {where_sql}
        ORDER BY f.id
        LIMIT %s OFFSET %s
    """

    rows = db.execute_query(
        data_sql,
        tuple(params + [limit, skip])
    ) or []

    return {
        "fixtures": rows,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ============================================================
# Helper：壓縮序號 range（後端版）
# ============================================================
def compress_serial_ranges(serials: list[str]) -> list[str]:
    def parse(s):
        m = re.match(r"^(.*?)(\d+)$", s)
        if not m:
            return None, None, None
        return m.group(1), int(m.group(2)), len(m.group(2))

    groups = defaultdict(list)

    for s in serials:
        prefix, num, width = parse(s)
        if prefix is None:
            groups["__RAW__"].append(s)
        else:
            groups[prefix].append((num, width))

    ranges = []

    for prefix, values in groups.items():
        if prefix == "__RAW__":
            ranges.extend(values)
            continue

        values.sort()
        start = values[0]
        prev = values[0]

        for cur in values[1:]:
            if cur[0] == prev[0] + 1:
                prev = cur
            else:
                ranges.append((prefix, start, prev))
                start = cur
                prev = cur

        ranges.append((prefix, start, prev))

    result = []
    for r in ranges:
        if isinstance(r, str):
            result.append(r)
        else:
            prefix, a, b = r
            start = f"{prefix}{str(a[0]).zfill(a[1])}"
            end   = f"{prefix}{str(b[0]).zfill(b[1])}"
            result.append(start if start == end else f"{start}-{end}")

    return result