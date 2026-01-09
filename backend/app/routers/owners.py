"""
Owners API (v4.1 FIXED - SQL 參數化修正)
關鍵修正：
1. execute_insert 使用 tuple params（不是 dict）
2. SQL 使用 %s placeholder（不是 :name）
3. 加入完整 error logging
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging

from backend.app.database import db
from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_customer_id,
)
from backend.app.models.owner import (
    OwnerCreate,
    OwnerUpdate,
    OwnerResponse,
    OwnerListResponse,
    OwnerSimple,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/owners",
    tags=["治具負責人 Owners"]
)

# ============================================================
# 🔧 Internal Helper（只做 DB,不是 API）
# ============================================================

def fetch_owner(owner_id: int, customer_id: str):
    """取得單筆 owner（含 JOIN users）"""
    try:
        rows = db.execute_query(
            """
            SELECT
                o.id,
                o.customer_id,
                o.primary_owner_id,
                u1.username AS primary_owner_name,
                o.secondary_owner_id,
                u2.username AS secondary_owner_name,
                o.email,
                o.note,
                o.is_active,
                o.created_at
            FROM owners o
            LEFT JOIN users u1 ON u1.id = o.primary_owner_id
            LEFT JOIN users u2 ON u2.id = o.secondary_owner_id
            WHERE o.id = %s
              AND (o.customer_id = %s OR o.customer_id IS NULL)
            """,
            (owner_id, customer_id)
        )
        return rows[0] if rows else None
    except Exception as e:
        logger.error(f"❌ fetch_owner failed: {e}", exc_info=True)
        raise


# ============================================================
# 取得負責人列表
# ============================================================

@router.get("", response_model=OwnerListResponse)
async def list_owners(
    search: Optional[str] = Query(None),
    is_active: Optional[int] = Query(1),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["(o.customer_id = %s OR o.customer_id IS NULL)"]
    params = [customer_id]

    if is_active is not None:
        where.append("o.is_active = %s")
        params.append(is_active)

    if search:
        where.append("(u1.username LIKE %s OR u2.username LIKE %s OR o.email LIKE %s)")
        params.extend([f"%{search}%"] * 3)

    where_sql = " AND ".join(where)

    base_sql = f"""
        FROM owners o
        LEFT JOIN users u1 ON u1.id = o.primary_owner_id
        LEFT JOIN users u2 ON u2.id = o.secondary_owner_id
        WHERE {where_sql}
    """

    rows = db.execute_query(
        f"""
        SELECT
            o.id,
            o.customer_id,
            o.primary_owner_id,
            u1.username AS primary_owner_name,
            o.secondary_owner_id,
            u2.username AS secondary_owner_name,
            o.email,
            o.note,
            o.is_active,
            o.created_at
        {base_sql}
        ORDER BY o.id DESC
        LIMIT %s OFFSET %s
        """,
        tuple(params + [limit, skip])
    )

    total = db.execute_query(
        f"SELECT COUNT(*) AS total {base_sql}",
        tuple(params)
    )[0]["total"]

    return OwnerListResponse(
        total=total,
        owners=[OwnerResponse(**row) for row in rows]
    )


# ============================================================
# 簡易清單（下拉）
# ============================================================

@router.get("/simple", response_model=List[OwnerSimple])
async def owner_simple_list(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT
            o.id,
            o.primary_owner_id,
            u.username AS primary_owner
        FROM owners o
        JOIN users u ON u.id = o.primary_owner_id
        WHERE o.is_active = 1
          AND (o.customer_id = %s OR o.customer_id IS NULL)
        ORDER BY u.username
        """,
        (customer_id,)
    )
    return [OwnerSimple(**row) for row in rows]


# ============================================================
# 新增負責人（✅ 完全修正版）
# ============================================================

@router.post("", response_model=OwnerResponse, status_code=201)
async def create_owner(
    data: OwnerCreate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    """
    新增負責人

    修正重點：
    1. 完整 logging
    2. 正確的參數化查詢
    3. 完善的錯誤處理
    """
    try:
        logger.info(f"🔵 Creating owner: {data.dict()}")
        logger.info(f"   Customer ID: {customer_id}")

        # 1. 確認 primary owner 存在
        user_row = db.execute_query(
            "SELECT id, email FROM users WHERE id=%s",
            (data.primary_owner_id,)
        )

        if not user_row:
            logger.warning(f"❌ Primary owner {data.primary_owner_id} not found")
            raise HTTPException(400, "primary_owner 不存在")

        logger.info(f"   ✅ Primary owner found: {user_row[0]}")

        # 2. Email 自動補
        email = data.email or user_row[0].get("email")
        if not email:
            logger.warning(f"❌ No email for user {data.primary_owner_id}")
            raise HTTPException(400, "該使用者未設定 Email")

        logger.info(f"   ✅ Email resolved: {email}")

        # 3. Secondary 正規化
        secondary_owner_id = data.secondary_owner_id or None

        if secondary_owner_id:
            logger.info(f"   Secondary owner: {secondary_owner_id}")

        # 4. 執行 INSERT
        insert_sql = """
            INSERT INTO owners
            (
              customer_id,
              primary_owner_id,
              secondary_owner_id,
              email,
              note,
              is_active
            )
            VALUES (%s, %s, %s, %s, %s, 1)
        """

        insert_params = (
            customer_id,
            data.primary_owner_id,
            secondary_owner_id,
            email,
            data.note,
        )

        logger.debug(f"   SQL: {insert_sql}")
        logger.debug(f"   Params: {insert_params}")

        new_id = db.execute_insert(insert_sql, insert_params)

        logger.info(f"   ✅ Insert completed, new_id: {new_id} (type: {type(new_id)})")

        # 5. 驗證 ID
        if not new_id or new_id <= 0:
            logger.error(f"❌ Invalid ID returned: {new_id}")
            raise HTTPException(500, "建立失敗：無效的 ID")

        # 6. 回查
        logger.info(f"   🔍 Fetching owner {new_id}...")
        row = fetch_owner(new_id, customer_id)

        if not row:
            logger.error(f"❌ Owner {new_id} created but not found")
            raise HTTPException(500, "建立後查詢失敗")

        logger.info(f"   ✅ Owner created successfully: {row}")
        return OwnerResponse(**row)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error: {type(e).__name__}: {str(e)}", exc_info=True)
        raise HTTPException(500, f"建立失敗：{str(e)}")


# ============================================================
# 取得單筆
# ============================================================

@router.get("/{owner_id}", response_model=OwnerResponse)
async def get_owner(
    owner_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    row = fetch_owner(owner_id, customer_id)
    if not row:
        raise HTTPException(404, "負責人不存在")

    return OwnerResponse(**row)


# ============================================================
# 更新
# ============================================================

@router.put("/{owner_id}", response_model=OwnerResponse)
async def update_owner(
    owner_id: int,
    data: OwnerUpdate,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    fields = []
    params = []

    for k, v in data.model_dump(exclude_unset=True).items():
        fields.append(f"{k}=%s")
        params.append(v)

    if not fields:
        raise HTTPException(400, "沒有可更新欄位")

    params.extend([owner_id, customer_id])

    affected = db.execute_update(
        f"""
        UPDATE owners
        SET {", ".join(fields)}
        WHERE id=%s
          AND (customer_id=%s OR customer_id IS NULL)
        """,
        tuple(params)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    row = fetch_owner(owner_id, customer_id)
    if not row:
        raise HTTPException(500, "更新後查詢失敗")

    return OwnerResponse(**row)


# ============================================================
# 停用
# ============================================================

@router.put("/{owner_id}/disable")
async def disable_owner(
    owner_id: int,
    admin=Depends(get_current_admin),
    customer_id=Depends(get_current_customer_id),
):
    affected = db.execute_update(
        """
        UPDATE owners
        SET is_active=0
        WHERE id=%s
          AND (customer_id=%s OR customer_id IS NULL)
        """,
        (owner_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(404, "負責人不存在或無權限")

    return {"message": "已停用"}