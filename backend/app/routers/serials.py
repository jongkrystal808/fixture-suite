"""
序號管理 API (v4.x FIXED)
Serial Number Management API

✔ customer_id 一律來自登入身分
✔ status 與 v4.x fixture_serials / SP 完全一致
✔ datecode 僅來自 receipt + datecode
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
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
        raise HTTPException(
            status_code=400,
            detail=f"治具 {fixture_id} 不存在或不屬於此客戶"
        )
    return row[0]


# ============================================================
# 查詢治具所有序號（含 datecode）
# ============================================================

@router.get("", summary="查詢序號列表（含 datecode）")
async def list_serials(
    fixture_id: str = Query(...),
    search: Optional[str] = None,
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
    ensure_fixture(customer_id, fixture_id)

    # ------------------------------
    # 實體序號 fixture_serials
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
        ORDER BY serial_number
    """

    real_rows = db.execute_query(sql_real, tuple(params))

    # ------------------------------
    # datecode（僅 receipt）
    # ------------------------------
    sql_datecode = """
        SELECT
            i.id,
            t.customer_id,
            t.fixture_id,
            i.datecode AS serial_number,
            'datecode' AS status,
            t.transaction_date AS receipt_date,
            t.created_at,
            i.quantity,
            'datecode' AS record_type
        FROM material_transactions t
        JOIN material_transaction_items i
          ON i.transaction_id = t.id
        WHERE t.customer_id=%s
          AND t.fixture_id=%s
          AND t.transaction_type='receipt'
          AND t.record_type='datecode'
    """

    datecode_rows = db.execute_query(sql_datecode, (customer_id, fixture_id))

    if search:
        datecode_rows = [
            r for r in datecode_rows
            if search in r["serial_number"]
        ]

    rows = real_rows + datecode_rows
    rows.sort(key=lambda r: r["serial_number"])

    return {
        "total": len(rows),
        "serials": rows,
    }


# ============================================================
# 檢查序號是否存在
# ============================================================

@router.get("/exists", summary="檢查序號是否存在")
async def serial_exists(
    fixture_id: str,
    serial_no: str,
    user=Depends(get_current_user)
):
    customer_id = user.customer_id
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
    admin=Depends(get_current_admin)
):
    customer_id = admin.customer_id
    ensure_fixture(customer_id, fixture_id)

    exists = db.execute_query(
        """
        SELECT id FROM fixture_serials
        WHERE customer_id=%s AND fixture_id=%s AND serial_number=%s
        """,
        (customer_id, fixture_id, serial_no)
    )
    if exists:
        raise HTTPException(400, f"序號 {serial_no} 已存在")

    now = datetime.utcnow()

    db.execute_update(
        """
        INSERT INTO fixture_serials
            (customer_id, fixture_id, serial_number, status, receipt_date, created_at)
        VALUES (%s,%s,%s,'in_stock',%s,%s)
        """,
        (customer_id, fixture_id, serial_no, now.date(), now)
    )

    return {"message": "新增成功"}


# ============================================================
# 批量新增序號
# ============================================================

@router.post("/batch", summary="批量新增序號")
async def add_serials_batch(
    fixture_id: str,
    serial_start: Optional[str] = None,
    serial_end: Optional[str] = None,
    serials: Optional[str] = None,
    admin=Depends(get_current_admin)
):
    customer_id = admin.customer_id
    ensure_fixture(customer_id, fixture_id)

    if serial_start and serial_end:
        serial_list = expand_serial_range(serial_start, serial_end)
    elif serials:
        serial_list = normalise_serial_list(
            [x.strip() for x in serials.split(",")]
        )
    else:
        raise HTTPException(400, "請提供序號區間或序號列表")

    now = datetime.utcnow()
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

        db.execute_update(
            """
            INSERT INTO fixture_serials
                (customer_id, fixture_id, serial_number, status, receipt_date, created_at)
            VALUES (%s,%s,%s,'in_stock',%s,%s)
            """,
            (customer_id, fixture_id, sn, now.date(), now)
        )
        inserted += 1

    return {
        "message": "批量新增完成",
        "inserted": inserted,
        "skipped": skipped,
        "total": len(serial_list),
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
        "DELETE FROM fixture_serials WHERE id=%s",
        (serial_id,)
    )

    if affected == 0:
        raise HTTPException(404, "序號不存在")

    return {"message": "刪除成功"}
