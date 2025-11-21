"""
機種管理 API (v3.0 完整版本)
Machine Models API (Aligned with DB v3.0 Schema)

變更要點:
- model_id → id
- 新增 customer_id
- 所有查詢都必須過濾 customer_id (多客戶隔離)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from pydantic import BaseModel

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

router = APIRouter(
    prefix="/models",
    tags=["機種 Machine Models"],
)


# ============================================================
# Pydantic Schemas
# ============================================================

class ModelBase(BaseModel):
    id: str                        # 機種代碼
    customer_id: str               # 所屬客戶 (v3.0 新增)
    model_name: str
    note: Optional[str] = None


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    model_name: Optional[str] = None
    note: Optional[str] = None


class ModelResponse(ModelBase):
    created_at: Optional[str] = None


# ============================================================
# List Models (GET)
# ============================================================

@router.get("", response_model=List[ModelResponse])
async def list_models(
    customer_id: str = Query(..., description="客戶 ID"),
    q: Optional[str] = Query(None, description="搜尋 model id 或名稱"),
    current_user=Depends(get_current_user),
):
    """
    查詢機種列表 (v3.0)
    必須提供 customer_id
    """

    sql = """
        SELECT *
        FROM machine_models
        WHERE customer_id = %s
    """
    params = [customer_id]

    if q:
        sql += " AND (id LIKE %s OR model_name LIKE %s)"
        like = f"%{q}%"
        params += [like, like]

    sql += " ORDER BY id"

    rows = db.execute_query(sql, tuple(params))
    return [ModelResponse(**row) for row in rows]


# ============================================================
# Get Model Detail
# ============================================================

@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(
    model_id: str,
    customer_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    sql = """
        SELECT *
        FROM machine_models
        WHERE id = %s AND customer_id = %s
    """
    rows = db.execute_query(sql, (model_id, customer_id))

    if not rows:
        raise HTTPException(404, "機種不存在")

    return ModelResponse(**rows[0])


# ============================================================
# Create Model (POST)
# ============================================================

@router.post("", response_model=ModelResponse)
async def create_model(
    data: ModelCreate,
    admin=Depends(get_current_admin)
):
    """
    建立新機種
    - 同 customer_id 下 id 必須唯一
    - customer_id 必須存在
    """

    # 檢查客戶存在
    cust = db.execute_query("SELECT id FROM customers WHERE id = %s", (data.customer_id,))
    if not cust:
        raise HTTPException(400, "客戶不存在")

    # 檢查機種唯一性
    exists = db.execute_query(
        "SELECT id FROM machine_models WHERE id=%s AND customer_id = %s",
        (data.id, data.customer_id)
    )
    if exists:
        raise HTTPException(400, "該客戶下的機種代碼已存在")

    sql = """
        INSERT INTO machine_models (id, customer_id, model_name, note)
        VALUES (%s, %s, %s, %s)
    """

    db.execute_update(
        sql,
        (data.id, data.customer_id, data.model_name, data.note)
    )

    return await get_model(data.id, data.customer_id)


# ============================================================
# Update Model (PUT)
# ============================================================

@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    data: ModelUpdate,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin),
):
    # 確認存在
    await get_model(model_id, customer_id, admin)

    fields = []
    params = []

    if data.model_name is not None:
        fields.append("model_name=%s")
        params.append(data.model_name)

    if data.note is not None:
        fields.append("note=%s")
        params.append(data.note)

    if fields:
        sql = f"""
            UPDATE machine_models
            SET {', '.join(fields)}
            WHERE id=%s AND customer_id=%s
        """
        params.append(model_id)
        params.append(customer_id)
        db.execute_update(sql, tuple(params))

    return await get_model(model_id, customer_id)


# ============================================================
# Delete Model (DELETE)
# ============================================================

@router.delete("/{model_id}", status_code=204)
async def delete_model(
    model_id: str,
    customer_id: str = Query(...),
    admin=Depends(get_current_admin)
):
    sql = """
        DELETE FROM machine_models
        WHERE id=%s AND customer_id=%s
    """
    affected = db.execute_update(sql, (model_id, customer_id))

    if affected == 0:
        raise HTTPException(404, "機種不存在")

    return None
