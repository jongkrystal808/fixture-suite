"""
序號管理 API（v6 FINAL - SP-first）
Serial Number Management API

✅ customer_id 一律來自 X-Customer-Id（get_current_customer_id）
✅ fixture_serials 使用 v6 欄位：existence_status / usage_status
✅ 新增序號一律走 sp_material_receipt_v6（禁止直接 INSERT fixture_serials）
✅ datecode 來源改為 fixture_datecode_inventory（真相層）
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import pymysql

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
        raise HTTPException(
            status_code=400,
            detail=f"治具 {fixture_id} 不存在或不屬於此客戶"
        )
    return row[0]


# ============================================================
# 查詢治具所有序號（含 datecode）
# v6：serial -> fixture_serials（existence_status / usage_status）
#     datecode -> fixture_datecode_inventory（真相層）
# ============================================================

@router.get("", summary="查詢序號列表（含 datecode）")
async def list_serials(
    fixture_id: str = Query(...),
    search: Optional[str] = None,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
):
    ensure_fixture(customer_id, fixture_id)

    # ------------------------------
    # 實體序號 fixture_serials（v6）
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
            existence_status,
            usage_status,
            source_type,
            receipt_date,
            return_date,
            created_at,
            updated_at,
            NULL AS quantity,
            'serial' AS record_type
        FROM fixture_serials
        WHERE {" AND ".join(where)}
        ORDER BY serial_number
    """

    real_rows = db.execute_query(sql_real, tuple(params)) or []
    for r in real_rows:
        r["is_available"] = (r["existence_status"] == "in_stock" and r["usage_status"] == "idle")

        # 相容舊前端：給一個合併狀態（可選用）
        r["status"] = (
            r["existence_status"]
            if r["existence_status"] != "in_stock"
            else r["usage_status"]
        )

    # ------------------------------
    # datecode（v6 真相：fixture_datecode_inventory）
    # ------------------------------
    sql_datecode = """
        SELECT
            NULL AS id,
            customer_id,
            fixture_id,
            datecode AS serial_number,
            'datecode' AS status,
            NULL AS existence_status,
            NULL AS usage_status,
            source_type,
            NULL AS receipt_date,
            NULL AS return_date,
            updated_at AS created_at,
            updated_at AS updated_at,
            in_stock_qty AS quantity,
            'datecode' AS record_type
        FROM fixture_datecode_inventory
        WHERE customer_id=%s
          AND fixture_id=%s
    """
    datecode_rows = db.execute_query(sql_datecode, (customer_id, fixture_id)) or []

    if search:
        s = str(search)
        datecode_rows = [r for r in datecode_rows if s in str(r["serial_number"])]

    rows = real_rows + datecode_rows
    rows.sort(key=lambda r: (str(r["serial_number"] or "")))

    return {
        "total": len(rows),
        "serials": rows,
    }


# ============================================================
# 檢查序號是否存在（只查 fixture_serials）
# ============================================================

@router.get("/exists", summary="檢查序號是否存在")
async def serial_exists(
    fixture_id: str,
    serial_no: str,
    customer_id: str = Depends(get_current_customer_id),
    user=Depends(get_current_user),
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
# 新增單筆序號（v6：改走 sp_material_receipt_v6）
# ============================================================

@router.post("", summary="新增序號（單筆）- v6 SP-first")
async def add_serial(
    fixture_id: str,
    serial_no: str,
    order_no: Optional[str] = None,
    source_type: Optional[str] = None,  # customer_supplied / self_purchased
    note: Optional[str] = None,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):
    ensure_fixture(customer_id, fixture_id)

    st = source_type or "customer_supplied"
    if st not in ("customer_supplied", "self_purchased"):
        raise HTTPException(400, "source_type 必須為 customer_supplied / self_purchased")

    try:
        out = db.call_sp_with_out(
            "sp_material_receipt_v6",
            [
                customer_id,
                fixture_id,
                order_no,
                admin.get("username") if isinstance(admin, dict) else getattr(admin, "username", None),
                note,
                admin.get("id") if isinstance(admin, dict) else getattr(admin, "id", None),
                "individual",            # record_type
                st,                      # source_type
                serial_no,               # serials_csv
                None,                    # datecode
                1,                       # quantity
            ],
            ["o_transaction_id", "o_message"],
        )

        if not out or not out.get("o_transaction_id"):
            raise HTTPException(400, out.get("o_message") if out else "新增序號失敗")

    except Exception as e:
        msg = e.args[1] if isinstance(e, pymysql.MySQLError) and len(e.args) >= 2 else str(e)
        raise HTTPException(400, msg)

    return {"message": "新增成功", "transaction_id": out["o_transaction_id"]}


# ============================================================
# 批量新增序號（v6：改走 sp_material_receipt_v6）
# ============================================================

@router.post("/batch", summary="批量新增序號 - v6 SP-first")
async def add_serials_batch(
    fixture_id: str,
    serial_start: Optional[str] = None,
    serial_end: Optional[str] = None,
    serials: Optional[str] = None,
    order_no: Optional[str] = None,
    source_type: Optional[str] = None,  # customer_supplied / self_purchased
    note: Optional[str] = None,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):
    ensure_fixture(customer_id, fixture_id)

    if serial_start and serial_end:
        serial_list = expand_serial_range(serial_start, serial_end)
    elif serials:
        serial_list = normalise_serial_list([x.strip() for x in str(serials).split(",") if x.strip()])
    else:
        raise HTTPException(400, "請提供序號區間或序號列表")

    if not serial_list:
        raise HTTPException(400, "解析不到任何序號")

    st = source_type or "customer_supplied"
    if st not in ("customer_supplied", "self_purchased"):
        raise HTTPException(400, "source_type 必須為 customer_supplied / self_purchased")

    serials_csv = ",".join(serial_list)

    try:
        out = db.call_sp_with_out(
            "sp_material_receipt_v6",
            [
                customer_id,
                fixture_id,
                order_no,
                admin.get("username") if isinstance(admin, dict) else getattr(admin, "username", None),
                note,
                admin.get("id") if isinstance(admin, dict) else getattr(admin, "id", None),
                "batch",                 # record_type
                st,                      # source_type
                serials_csv,             # serials_csv
                None,                    # datecode
                len(serial_list),        # quantity
            ],
            ["o_transaction_id", "o_message"],
        )

        if not out or not out.get("o_transaction_id"):
            raise HTTPException(400, out.get("o_message") if out else "批量新增失敗")

    except Exception as e:
        msg = e.args[1] if isinstance(e, pymysql.MySQLError) and len(e.args) >= 2 else str(e)
        raise HTTPException(400, msg)

    return {
        "message": "批量新增完成",
        "total": len(serial_list),
        "transaction_id": out["o_transaction_id"],
    }


# ============================================================
# 刪除序號（v6：禁止硬刪）
# ============================================================

@router.delete("/{serial_id}", summary="刪除序號（v6：禁止硬刪）")
async def delete_serial(
    serial_id: int,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):
    # v6：序號屬於交易/歷史的一部分，硬刪會破壞一致性
    # 正確作法應走：退料 / 報廢 / 更換事件（由 SP 或指定流程處理）
    raise HTTPException(
        status_code=400,
        detail="v6 不允許硬刪序號。請改用退料/報廢流程或更換事件紀錄。"
    )


