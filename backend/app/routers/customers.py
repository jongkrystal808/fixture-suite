"""
客戶管理 API
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from backend.app.database import db
from backend.app.dependencies import get_current_admin


router = APIRouter(
    prefix="/customers",
    tags=["客戶管理 Customers"]
)


# ===========================
# Pydantic Schemas
# ===========================

from backend.app.models.customer import (
    CustomerBase,
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse
)



# ===========================
# API Endpoints
# ===========================

@router.get("/", response_model=List[CustomerResponse])
async def list_customers(is_active: Optional[bool] = None):
    """
    取得客戶列表
    """
    query = "SELECT * FROM customers WHERE 1=1"
    params = []

    if is_active is not None:
        query += " AND is_active = %s"
        params.append(is_active)

    query += " ORDER BY id"

    result = db.execute_query(query, params)
    if not result:
        return []

    columns = [col[0] for col in db.cursor.description]
    return [dict(zip(columns, row)) for row in result]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str):
    """
    取得單一客戶資料
    """
    query = "SELECT * FROM customers WHERE id = %s"
    result = db.execute_query(query, (customer_id,))

    if not result:
        raise HTTPException(status_code=404, detail="客戶不存在")

    columns = [col[0] for col in db.cursor.description]
    return dict(zip(columns, result[0]))


@router.post("/", response_model=CustomerResponse, status_code=201)
async def create_customer(data: CustomerCreate, user=Depends(get_current_admin)):
    """
    新增客戶（需 Admin）
    """
    # 檢查是否重複
    exists = db.execute_query("SELECT id FROM customers WHERE id = %s", (data.id,))
    if exists:
        raise HTTPException(status_code=400, detail="客戶已存在")

    query = """
        INSERT INTO customers 
        (id, customer_abbr, contact_person, contact_phone, contact_email, address, is_active, note)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        data.id, data.customer_abbr, data.contact_person, data.contact_phone,
        data.contact_email, data.address, data.is_active, data.note
    )

    db.execute_update(query, params)

    return await get_customer(data.id)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(customer_id: str, data: CustomerUpdate, user=Depends(get_current_admin)):
    """
    更新客戶（需 Admin）
    """
    exists = db.execute_query("SELECT id FROM customers WHERE id = %s", (customer_id,))
    if not exists:
        raise HTTPException(status_code=404, detail="客戶不存在")

    # 動態生成 SQL
    fields = []
    params = []
    for key, value in data.dict(exclude_unset=True).items():
        fields.append(f"{key} = %s")
        params.append(value)

    if not fields:
        raise HTTPException(status_code=400, detail="沒有要更新的欄位")

    params.append(customer_id)

    query = f"UPDATE customers SET {', '.join(fields)} WHERE id = %s"

    db.execute_update(query, params)

    return await get_customer(customer_id)


@router.delete("/{customer_id}", status_code=204)
async def disable_customer(customer_id: str, user=Depends(get_current_admin)):
    """
    停用客戶（軟刪除）
    """
    affected = db.execute_update(
        "UPDATE customers SET is_active = FALSE WHERE id = %s",
        (customer_id,)
    )

    if affected == 0:
        raise HTTPException(status_code=404, detail="客戶不存在")

    return None
