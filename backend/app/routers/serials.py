"""
序號管理 API (v3.7 修正版)
Serial Number Management API

重點更動：
✔ 移除 get_current_customer_id（因 users table 無 customer_id）
✔ 改為從 Query 傳入 customer_id
✔ 與 fixture_serials / fixtures 結構完全一致
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
)
from backend.app.utils.serial_tools import (
    expand_serial_range,
    normalise_serial_list,
)

router = APIRouter(
    prefix="/serials",
    tags=["序號管理 Serials"]
)

# ============================================================
# 工具：確認治具是否屬於該客戶
# ============================================================

def ensure_fixture(customer_id: str, fixture_id: str):
    row = db.execute_query(
        """
        SELECT id, fixture_name 
        FROM fixtures
        WHERE id=%s AND customer_id=%s
        """,
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")
    return row[0]

# ============================================================
# 查詢治具所有序號
# ============================================================
@router.get("", summary="查詢序號列表（含 datecode）")
async def list_serials(
    fixture_id: str = Query(...),
    customer_id: str = Query(..., description="客戶名稱"),
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    ensure_fixture(customer_id, fixture_id)

    # ------------------------------
    # 查詢實體序號 fixture_serials
    # ------------------------------
    where = ["customer_id=%s", "fixture_id=%s"]
    params = [customer_id, fixture_id]

    if search:
        where.append("serial_number LIKE %s")
        params.append(f"%{search}%")

    sql_real = f"""
        SELECT 
            id,
            customer_id,
            fixture_id,
            serial_number,
            status,
            receipt_date,
            created_at,
            NULL AS quantity,
            'serial' AS record_type
        FROM fixture_serials
        WHERE {" AND ".join(where)}
        ORDER BY serial_number ASC
    """

    real_rows = db.execute_query(sql_real, tuple(params))

    # ------------------------------
    # 查詢 datecode 虛擬序號（來自 transactions）
    # ------------------------------
    sql_datecode = """
        SELECT
            id,
            customer_id,
            fixture_id,
            datecode AS serial_number,
            'datecode' AS status,
            transaction_date AS receipt_date,
            created_at,
            quantity,
            'datecode' AS record_type
        FROM material_transactions
        WHERE 
            record_type = 'datecode'
            AND customer_id = %s
            AND fixture_id = %s
    """
    datecode_rows = db.execute_query(sql_datecode, (customer_id, fixture_id))

    # search 支援比對 datecode 字串
    if search:
        datecode_rows = [
            r for r in datecode_rows
            if search in r["serial_number"]
        ]

    # ------------------------------
    # 合併兩種序號來源
    # ------------------------------
    rows = real_rows + datecode_rows

    # 排序：字母/數字順序
    rows.sort(key=lambda r: r["serial_number"])

    return {
        "total": len(rows),
        "serials": rows
    }

# ============================================================
# 檢查序號是否存在
# ============================================================

@router.get("/exists", summary="檢查序號是否存在")
async def serial_exists(
    fixture_id: str,
    serial_no: str,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    ensure_fixture(customer_id, fixture_id)

    row = db.execute_query(
        """
        SELECT id 
        FROM fixture_serials
        WHERE customer_id=%s AND fixture_id=%s AND serial_number=%s
        """,
        (customer_id, fixture_id, serial_no)
    )

    return {"exists": bool(row)}

# ============================================================
# 新增單筆序號
# ============================================================

@router.post("", summary="新增序號（單筆）")
async def add_serial(
    fixture_id: str,
    serial_no: str,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin)
):
    ensure_fixture(customer_id, fixture_id)

    # 是否重複
    exists = db.execute_query(
        """
        SELECT id FROM fixture_serials
        WHERE customer_id=%s AND fixture_id=%s AND serial_number=%s
        """,
        (customer_id, fixture_id, serial_no)
    )
    if exists:
        raise HTTPException(400, f"序號 {serial_no} 已存在")

    now = datetime.now()

    new_id = db.insert(
        "fixture_serials",
        {
            "customer_id": customer_id,
            "fixture_id": fixture_id,
            "serial_number": serial_no,
            "status": "available",
            "receipt_date": now.date(),
            "created_at": now,
        }
    )

    return {"message": "新增成功", "id": new_id}

# ============================================================
# 批量新增序號
# ============================================================

@router.post("/batch", summary="批量新增序號")
async def add_serials_batch(
    fixture_id: str,
    serial_start: Optional[str] = None,
    serial_end: Optional[str] = None,
    serials: Optional[str] = None,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin)
):
    ensure_fixture(customer_id, fixture_id)

    # 模式 1：序號區間
    if serial_start and serial_end:
        serial_list = expand_serial_range(serial_start, serial_end)

    # 模式 2：逗號清單
    elif serials:
        serial_list = [x.strip() for x in serials.split(",")]
        serial_list = normalise_serial_list(serial_list)

    else:
        raise HTTPException(400, "請提供序號區間或序號列表")

    now = datetime.now()
    inserted = 0
    skipped = 0

    for sn in serial_list:
        exists = db.execute_query(
            """
            SELECT id FROM fixture_serials
            WHERE customer_id=%s AND fixture_id=%s AND serial_number=%s
            """,
            (customer_id, fixture_id, sn)
        )

        if exists:
            skipped += 1
            continue

        db.insert(
            "fixture_serials",
            {
                "customer_id": customer_id,
                "fixture_id": fixture_id,
                "serial_number": sn,
                "status": "available",
                "receipt_date": now.date(),
                "created_at": now,
            }
        )
        inserted += 1

    return {
        "message": "批量新增完成",
        "inserted": inserted,
        "skipped": skipped,
        "total": len(serial_list)
    }

# ============================================================
# 刪除序號
# ============================================================

@router.delete("/{serial_id}", summary="刪除序號")
async def delete_serial(
    serial_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        """
        DELETE FROM fixture_serials 
        WHERE id=%s
        """,
        (serial_id,)
    )

    if affected == 0:
        raise HTTPException(404, "序號不存在")

    return {"message": "刪除成功"}
