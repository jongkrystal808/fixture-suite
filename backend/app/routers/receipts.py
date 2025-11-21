"""
收料 Receipts API (v3.0)
依據新版資料庫結構:
- vendor → customer_id
- fixture_code → fixture_id
- 收料後自動寫入 fixture_serials
- 由 MySQL triggers 更新 fixtures 的數量欄位
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import datetime

from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db

from backend.app.utils.serial_tools import (
    expand_serial_range,
    normalise_serial_list,
)

from backend.app.models.receipts import (
    ReceiptCreate,
    ReceiptBatchCreate,
    ReceiptIndividualCreate,
    ReceiptResponse,
    ReceiptListResponse,
    ReturnCreate,
    ReturnBatchCreate,
    ReturnIndividualCreate,
)


router = APIRouter(
    prefix="/receipts",
    tags=["收料 Receipts"]
)


# ============================================================
# 工具：檢查治具是否屬於此客戶
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    sql = """
        SELECT id, fixture_name
        FROM fixtures
        WHERE id=%s AND customer_id=%s
    """
    row = db.execute_query(sql, (fixture_id, customer_id))
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")
    return row[0]


# ============================================================
# 列表查詢
# ============================================================

@router.get("", response_model=ReceiptListResponse, summary="查詢收料紀錄")
def list_receipts(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(get_current_user)
):
    where = ["customer_id = %s"]
    params = [customer_id]

    if fixture_id:
        where.append("fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")

    if order_no:
        where.append("order_no LIKE %s")
        params.append(f"%{order_no}%")

    if operator:
        where.append("operator LIKE %s")
        params.append(f"%{operator}%")

    where_sql = " AND ".join(where)

    total_sql = f"SELECT COUNT(*) AS total FROM receipts WHERE {where_sql}"
    total = db.execute_query(total_sql, tuple(params))[0]["total"]

    sql = f"""
        SELECT *
        FROM receipts
        WHERE {where_sql}
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
    """
    params += [limit, skip]

    rows = db.execute_query(sql, tuple(params))

    return ReceiptListResponse(
        total=total,
        receipts=[ReceiptResponse(**row) for row in rows]
    )


# ============================================================
# 新增收料紀錄
# ============================================================

@router.post("", response_model=ReceiptResponse, summary="新增收料紀錄")
def create_receipt(
    data: ReceiptCreate,
    username: str = Depends(get_current_username)
):
    # 檢查治具是否屬於此客戶
    ensure_fixture_exists(data.fixture_id, data.customer_id)

    # 批量模式 → 展開成 serial_list
    if data.type == "batch":
        serials = expand_serial_range(data.serial_start, data.serial_end)
    else:
        serial_list = [x.strip() for x in data.serials.split(",")]
        serials = normalise_serial_list(serial_list)

    operator = data.operator or username
    now = datetime.now()

    # 寫入 receipts (一筆紀錄)
    receipt_id = db.insert(
        """
        INSERT INTO receipts
            (customer_id, type, order_no, fixture_id,
             serial_start, serial_end, serials,
             operator, note, created_at)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            data.customer_id,
            data.type.value,
            data.order_no,
            data.fixture_id,
            data.serial_start,
            data.serial_end,
            ",".join(serials),
            operator,
            data.note,
            now,
        )
    )

    # 寫入序號 fixture_serials
    for sn in serials:
        db.execute_update(
            """
            INSERT INTO fixture_serials
                (customer_id, fixture_id, serial_no, created_at)
            VALUES (%s, %s, %s, %s)
            """,
            (data.customer_id, data.fixture_id, sn, now),
        )

    # 回傳
    return ReceiptResponse(
        id=receipt_id,
        customer_id=data.customer_id,
        type=data.type.value,
        order_no=data.order_no,
        fixture_id=data.fixture_id,
        serial_start=data.serial_start,
        serial_end=data.serial_end,
        serials=",".join(serials),
        operator=operator,
        note=data.note,
        created_at=now,
    )


# ============================================================
# Excel 批量匯入
# ============================================================

@router.post("/import", summary="批量匯入收料")
def import_receipts(
    rows: List[ReceiptCreate],
    username: str = Depends(get_current_username)
):
    success = 0
    failed = []

    for i, data in enumerate(rows, start=2):
        try:
            ensure_fixture_exists(data.fixture_id, data.customer_id)

            if data.type == "batch":
                serials = expand_serial_range(data.serial_start, data.serial_end)
            else:
                serial_list = [x.strip() for x in data.serials.split(",")]
                serials = normalise_serial_list(serial_list)

            now = datetime.now()
            operator = data.operator or username

            receipt_id = db.insert(
                """
                INSERT INTO receipts
                    (customer_id, type, order_no, fixture_id,
                     serial_start, serial_end, serials,
                     operator, note, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    data.customer_id,
                    data.type.value,
                    data.order_no,
                    data.fixture_id,
                    data.serial_start,
                    data.serial_end,
                    ",".join(serials),
                    operator,
                    data.note,
                    now,
                )
            )

            for sn in serials:
                db.execute_update(
                    """
                    INSERT INTO fixture_serials
                        (customer_id, fixture_id, serial_no, created_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (data.customer_id, data.fixture_id, sn, now),
                )

            success += 1

        except Exception as e:
            failed.append({"row": i, "error": str(e)})

    return {
        "message": "匯入完成",
        "success": success,
        "failed": failed,
    }


# ============================================================
# 刪除收料紀錄
# ============================================================

@router.delete("/{receipt_id}", summary="刪除收料紀錄")
def delete_receipt(
    receipt_id: int,
    user=Depends(get_current_user)
):
    # 必須先查序號，再刪除 fixture_serials
    row = db.execute_query(
        "SELECT customer_id, fixture_id, serials FROM receipts WHERE id=%s",
        (receipt_id,)
    )

    if not row:
        raise HTTPException(404, "收料記錄不存在")

    customer_id = row[0]["customer_id"]
    fixture_id = row[0]["fixture_id"]
    serials = row[0]["serials"].split(",")

    # 刪掉序號
    for sn in serials:
        db.execute_update(
            """
            DELETE FROM fixture_serials
            WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
            """,
            (customer_id, fixture_id, sn),
        )

    # 刪掉 receipts
    db.execute_update("DELETE FROM receipts WHERE id=%s", (receipt_id,))

    return {"message": "刪除成功"}
