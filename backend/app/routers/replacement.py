"""
治具更換記錄 API (v3.0)
Replacement Logs API

對應資料表: replacement_logs
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from backend.app.dependencies import get_current_user, get_current_admin, get_current_username
from backend.app.database import db

from backend.app.models.replacement import (
    ReplacementBase,
    ReplacementCreate,
    ReplacementUpdate,
    ReplacementResponse,
    ReplacementWithDetails
)

router = APIRouter(
    prefix="/logs/replacement",
    tags=["更換記錄 Replacement Logs"]
)


# ============================================================
# 工具：檢查治具是否屬於該客戶
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    sql = """
        SELECT id, fixture_name
        FROM fixtures
        WHERE id=%s AND customer_id=%s
    """
    rows = db.execute_query(sql, (fixture_id, customer_id))
    if not rows:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")
    return rows[0]


# ============================================================
# 1️⃣ 建立更換記錄
# ============================================================

@router.post(
    "",
    response_model=ReplacementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增治具更換記錄"
)
async def create_replacement_log(
    data: ReplacementCreate,
    username: str = Depends(get_current_username)
):
    ensure_fixture_exists(data.fixture_id, data.customer_id)

    executor = data.executor or username

    new_id = db.insert(
        """
        INSERT INTO replacement_logs
            (customer_id, fixture_id, replacement_date, reason, executor, note)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            data.customer_id,
            data.fixture_id,
            data.replacement_date,
            data.reason,
            executor,
            data.note
        )
    )

    # 回查
    row = db.execute_query(
        """
        SELECT
            rl.*,
            f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
            ON rl.fixture_id = f.id AND rl.customer_id = f.customer_id
        WHERE rl.id = %s
        """,
        (new_id,)
    )[0]

    return ReplacementResponse(**row)


# ============================================================
# 2️⃣ 更新更換記錄
# ============================================================

@router.put(
    "/{log_id}",
    response_model=ReplacementResponse,
    summary="更新更換記錄"
)
async def update_replacement_log(
    log_id: int,
    data: ReplacementUpdate,
    admin=Depends(get_current_admin)
):
    # 查詢是否存在
    exists = db.execute_query(
        "SELECT customer_id, fixture_id FROM replacement_logs WHERE id=%s",
        (log_id,)
    )
    if not exists:
        raise HTTPException(404, "更換記錄不存在")

    update_fields = []
    params = []

    if data.replacement_date is not None:
        update_fields.append("replacement_date=%s")
        params.append(data.replacement_date)

    if data.reason is not None:
        update_fields.append("reason=%s")
        params.append(data.reason)

    if data.executor is not None:
        update_fields.append("executor=%s")
        params.append(data.executor)

    if data.note is not None:
        update_fields.append("note=%s")
        params.append(data.note)

    if update_fields:
        sql = f"""
            UPDATE replacement_logs
            SET {', '.join(update_fields)}
            WHERE id=%s
        """
        params.append(log_id)
        db.execute_update(sql, tuple(params))

    # 回查
    row = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
            ON rl.fixture_id = f.id AND rl.customer_id = f.customer_id
        WHERE rl.id=%s
        """,
        (log_id,)
    )[0]

    return ReplacementResponse(**row)


# ============================================================
# 3️⃣ 查詢單筆更換記錄
# ============================================================

@router.get(
    "/{log_id}",
    response_model=ReplacementWithDetails,
    summary="取得單筆更換記錄"
)
async def get_replacement_log(
    log_id: int,
    current_user=Depends(get_current_user)
):
    rows = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
            ON rl.fixture_id = f.id AND rl.customer_id = f.customer_id
        WHERE rl.id=%s
        """,
        (log_id,)
    )

    if not rows:
        raise HTTPException(404, "更換記錄不存在")

    return ReplacementWithDetails(**rows[0])


# ============================================================
# 4️⃣ 列表查詢
# ============================================================

@router.get(
    "",
    response_model=List[ReplacementWithDetails],
    summary="查詢更換記錄列表"
)
async def list_replacement_logs(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    executor: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user=Depends(get_current_user)
):
    where = ["rl.customer_id = %(customer_id)s"]
    params = {"customer_id": customer_id}

    if fixture_id:
        where.append("rl.fixture_id = %(fixture_id)s")
        params["fixture_id"] = fixture_id

    if executor:
        where.append("rl.executor LIKE %(executor)s")
        params["executor"] = f"%{executor}%"

    if date_from:
        where.append("rl.replacement_date >= %(date_from)s")
        params["date_from"] = date_from

    if date_to:
        where.append("rl.replacement_date <= %(date_to)s")
        params["date_to"] = date_to

    where_sql = " AND ".join(where)

    sql = f"""
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
            ON rl.fixture_id = f.id AND rl.customer_id = f.customer_id
        WHERE {where_sql}
        ORDER BY rl.replacement_date DESC, rl.created_at DESC
        LIMIT %(limit)s OFFSET %(skip)s
    """

    params["limit"] = limit
    params["skip"] = skip

    rows = db.execute_query(sql, params)
    return [ReplacementWithDetails(**row) for row in rows]


# ============================================================
# 5️⃣ 刪除紀錄
# ============================================================

@router.delete(
    "/{log_id}",
    status_code=204,
    summary="刪除更換記錄"
)
async def delete_replacement_log(
    log_id: int,
    admin=Depends(get_current_admin)
):
    affected = db.execute_update(
        "DELETE FROM replacement_logs WHERE id=%s",
        (log_id,)
    )

    if affected == 0:
        raise HTTPException(404, "更換記錄不存在")

    return None
