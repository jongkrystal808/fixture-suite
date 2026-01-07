"""
治具更換記錄 API (v4.0 FIXED)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_username,
)
from backend.app.database import db

from backend.app.models.replacement import (
    ReplacementCreate,
    ReplacementUpdate,
    ReplacementResponse,
    ReplacementWithDetails,
)

router = APIRouter(
    prefix="/replacement",
    tags=["更換記錄 Replacement Logs"],
)


# ============================================================
# 工具
# ============================================================

def ensure_fixture_exists(fixture_id: str, customer_id: str):
    rows = db.execute_query(
        """
        SELECT id
        FROM fixtures
        WHERE id=%s AND customer_id=%s
        """,
        (fixture_id, customer_id)
    )
    if not rows:
        raise HTTPException(
            status_code=400,
            detail=f"治具 {fixture_id} 不存在或不屬於此客戶",
        )


# ============================================================
# 1️⃣ 建立更換記錄（SP）
# ============================================================

@router.post(
    "",
    response_model=ReplacementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="新增治具更換記錄",
)
async def create_replacement_log(
    data: ReplacementCreate,
    user=Depends(get_current_user),
    username: str = Depends(get_current_username),
):
    customer_id = user.customer_id

    ensure_fixture_exists(data.fixture_id, customer_id)

    record_level = data.record_level or "fixture"
    serial_number = data.serial_number

    if record_level not in ("fixture", "serial"):
        raise HTTPException(400, "record_level 必須為 fixture 或 serial")

    if record_level == "serial" and not serial_number:
        raise HTTPException(400, "序號模式需要提供 serial_number")

    executor = data.executor or username

    try:
        db.execute_query(
            """
            CALL sp_insert_replacement_log(
                %s, %s, %s, %s, %s, %s, %s, %s,
                @replacement_id, @message
            )
            """,
            (
                customer_id,
                data.fixture_id,
                record_level,
                serial_number,
                data.replacement_date,
                data.reason,
                executor,
                data.note,
            ),
        )

        out = db.execute_query(
            "SELECT @replacement_id AS id, @message AS message"
        )[0]

        if not out["id"]:
            raise HTTPException(400, out["message"] or "新增更換記錄失敗")

        rep_id = out["id"]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"建立更換記錄失敗: {e}")

    row = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id=%s AND rl.customer_id=%s
        """,
        (rep_id, customer_id),
    )

    if not row:
        raise HTTPException(500, "新增成功但無法讀取資料")

    return ReplacementResponse(**row[0])


# ============================================================
# 2️⃣ 更新更換記錄
# ============================================================

@router.put(
    "/{log_id}",
    response_model=ReplacementResponse,
    summary="更新更換記錄",
)
async def update_replacement_log(
    log_id: int,
    data: ReplacementUpdate,
    admin=Depends(get_current_admin),
):
    customer_id = admin.customer_id

    exists = db.execute_query(
        """
        SELECT id FROM replacement_logs
        WHERE id=%s AND customer_id=%s
        """,
        (log_id, customer_id),
    )
    if not exists:
        raise HTTPException(404, "更換記錄不存在")

    fields = []
    params = []

    for field in ("replacement_date", "reason", "executor", "note"):
        val = getattr(data, field, None)
        if val is not None:
            fields.append(f"{field}=%s")
            params.append(val)

    if fields:
        params.extend([log_id, customer_id])
        db.execute_update(
            f"""
            UPDATE replacement_logs
            SET {', '.join(fields)}
            WHERE id=%s AND customer_id=%s
            """,
            tuple(params),
        )

    row = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id=%s AND rl.customer_id=%s
        """,
        (log_id, customer_id),
    )[0]

    return ReplacementResponse(**row)


# ============================================================
# 3️⃣ 查詢單筆
# ============================================================

@router.get(
    "/{log_id}",
    response_model=ReplacementWithDetails,
)
async def get_replacement_log(
    log_id: int,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    rows = db.execute_query(
        """
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE rl.id=%s AND rl.customer_id=%s
        """,
        (log_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "更換記錄不存在")

    return ReplacementWithDetails(**rows[0])


# ============================================================
# 4️⃣ 列表
# ============================================================

@router.get(
    "",
    response_model=List[ReplacementWithDetails],
)
async def list_replacement_logs(
    fixture_id: Optional[str] = None,
    executor: Optional[str] = None,
    serial_number: Optional[str] = None,
    record_level: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(get_current_user),
):
    customer_id = user.customer_id

    where = ["rl.customer_id = %(customer_id)s"]
    params = {"customer_id": customer_id}

    if fixture_id:
        where.append("rl.fixture_id = %(fixture_id)s")
        params["fixture_id"] = fixture_id

    if executor:
        where.append("rl.executor LIKE %(executor)s")
        params["executor"] = f"%{executor}%"

    if serial_number:
        where.append("rl.serial_number = %(serial_number)s")
        params["serial_number"] = serial_number

    if record_level:
        where.append("rl.record_level = %(record_level)s")
        params["record_level"] = record_level

    if date_from:
        where.append("rl.replacement_date >= %(date_from)s")
        params["date_from"] = date_from

    if date_to:
        where.append("rl.replacement_date <= %(date_to)s")
        params["date_to"] = date_to

    sql = f"""
        SELECT rl.*, f.fixture_name
        FROM replacement_logs rl
        JOIN fixtures f
          ON rl.fixture_id = f.id
         AND rl.customer_id = f.customer_id
        WHERE {' AND '.join(where)}
        ORDER BY rl.replacement_date DESC, rl.created_at DESC
        LIMIT %(limit)s OFFSET %(skip)s
    """

    params["limit"] = limit
    params["skip"] = skip

    rows = db.execute_query(sql, params)
    return [ReplacementWithDetails(**r) for r in rows]


# ============================================================
# 5️⃣ 刪除（SP）
# ============================================================

@router.delete(
    "/{log_id}",
    status_code=204,
)
async def delete_replacement_log(
    log_id: int,
    admin=Depends(get_current_admin),
):
    customer_id = admin.customer_id

    exists = db.execute_query(
        """
        SELECT id FROM replacement_logs
        WHERE id=%s AND customer_id=%s
        """,
        (log_id, customer_id),
    )
    if not exists:
        raise HTTPException(404, "更換記錄不存在")

    try:
        db.execute_query(
            "CALL sp_delete_replacement_log(%s, @message)",
            (log_id,),
        )
    except Exception as e:
        raise HTTPException(500, f"刪除更換記錄失敗: {e}")

    return None
