"""
序號管理 API (v3.0)
Serial Number Management API

資料表: fixture_serials
用途:
- 查詢治具序號
- 新增序號
- 批量新增序號
- 刪除序號
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_customer_id,
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

@router.get("", summary="查詢序號列表")
async def list_serials(
    fixture_id: str = Query(...),
    search: Optional[str] = None,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user)
):
    ensure_fixture(customer_id, fixture_id)

    where = ["customer_id=%s", "fixture_id=%s"]
    params = [customer_id, fixture_id]

    if search:
        where.append("serial_no LIKE %s")
        params.append(f"%{search}%")

    sql = f"""
        SELECT id, customer_id, fixture_id, serial_no, created_at
        FROM fixture_serials
        WHERE {" AND ".join(where)}
        ORDER BY serial_no ASC
    """
    rows = db.execute_query(sql, tuple(params))

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
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user)
):
    ensure_fixture(customer_id, fixture_id)

    row = db.execute_query(
        """
        SELECT id FROM fixture_serials
        WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
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
    customer_id: str = Depends(get_current_customer_id),
    admin=Depends(get_current_admin)
):
    ensure_fixture(customer_id, fixture_id)

    # 是否重複
    exists = db.execute_query(
        """
        SELECT id FROM fixture_serials
        WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
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
            "serial_no": serial_no,
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
    customer_id: str = Depends(get_current_customer_id),
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
            WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
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
                "serial_no": sn,
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
    customer_id: str = Depends(get_current_customer_id),
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
