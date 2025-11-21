"""
退料 Returns API (v3.0)

- vendor → customer_id
- fixture_code → fixture_id
- 支援 batch / individual
- 個別序號必須同步刪除 fixture_serials
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db

from backend.app.utils.serial_tools import (
    expand_serial_range,
    normalise_serial_list,
)

from backend.app.models.receipts import (
    ReturnCreate,
    ReturnBatchCreate,
    ReturnIndividualCreate,
    ReturnResponse,
)


router = APIRouter(
    prefix="/returns",
    tags=["退料 Returns"]
)


# ============================================================
# 工具：檢查治具是否屬於該客戶
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
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
# 查詢 (v3.0)
# ============================================================

@router.get("", summary="查詢退料紀錄")
def list_returns(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    user=Depends(get_current_user)
):
    where = ["customer_id=%s"]
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

    sql = f"""
        SELECT *
        FROM returns_table
        WHERE {' AND '.join(where)}
        ORDER BY created_at DESC
    """

    return db.execute_query(sql, tuple(params))


# ============================================================
# 新增退料 (v3.0)
# ============================================================

@router.post("", response_model=ReturnResponse, summary="新增退料紀錄")
def create_return(
    data: ReturnCreate,
    username: str = Depends(get_current_username)
):
    ensure_fixture_exists(data.fixture_id, data.customer_id)

    # 展開序號
    if data.type == "batch":
        serials = expand_serial_range(data.serial_start, data.serial_end)
    else:
        serial_list = [x.strip() for x in data.serials.split(",")]
        serials = normalise_serial_list(serial_list)

    operator = data.operator or username
    now = datetime.now()

    # 每個序號一筆退料紀錄
    ids = []
    for sn in serials:
        rid = db.insert(
            """
            INSERT INTO returns_table
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
                sn,  # 單一序號
                operator,
                data.note,
                now,
            )
        )
        ids.append(rid)

        # 刪除 fixture_serials 內的序號
        db.execute_update(
            """
            DELETE FROM fixture_serials
            WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
            """,
            (data.customer_id, data.fixture_id, sn),
        )

    return ReturnResponse(
        id=ids[0],   # 代表第一筆
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
# Excel 匯入退料
# ============================================================

@router.post("/import", summary="批量匯入退料")
def import_returns(
    rows: List[ReturnCreate],
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
                lst = [x.strip() for x in data.serials.split(",")]
                serials = normalise_serial_list(lst)

            operator = data.operator or username
            now = datetime.now()

            for sn in serials:
                db.insert(
                    """
                    INSERT INTO returns_table
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
                        sn,
                        operator,
                        data.note,
                        now,
                    )
                )

                db.execute_update(
                    """
                    DELETE FROM fixture_serials
                    WHERE customer_id=%s AND fixture_id=%s AND serial_no=%s
                    """,
                    (data.customer_id, data.fixture_id, sn),
                )

            success += 1

        except Exception as e:
            failed.append({"row": i, "error": str(e)})

    return {
        "message": "退料匯入完成",
        "success": success,
        "failed": failed,
    }


# ============================================================
# 刪除退料紀錄 (v3.0)
# ============================================================

@router.delete("/{return_id}", summary="刪除退料紀錄")
def delete_return(
    return_id: int,
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT customer_id, fixture_id, serials FROM returns_table WHERE id=%s",
        (return_id,)
    )

    if not row:
        raise HTTPException(404, "退料紀錄不存在")

    customer_id = row[0]["customer_id"]
    fixture_id = row[0]["fixture_id"]
    sn = row[0]["serials"]

    # 刪除 returns_table
    db.execute_update("DELETE FROM returns_table WHERE id=%s", (return_id,))

    # ⚠️ 退料紀錄刪除後是否還原序號？ → 依你的邏輯：**不還原序號**
    # 如果你想還原，我可以加回 fixture_serials

    return {"message": "刪除成功"}
