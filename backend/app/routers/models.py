"""
機種 CRUD
machine_models
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

router = APIRouter(
    prefix="/models",
    tags=["機種 Machine Models"],
)


class ModelBase(BaseModel):
    model_id: str
    model_name: str
    note: Optional[str] = None


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    model_name: Optional[str] = None
    note: Optional[str] = None


class ModelResponse(ModelBase):
    created_at: Optional[str] = None


@router.get("", response_model=List[ModelResponse])
async def list_models(
        q: Optional[str] = Query(None),
        current_user=Depends(get_current_user),
):
    sql = "SELECT * FROM machine_models"
    params = []

    if q:
        sql += " WHERE model_id LIKE %s OR model_name LIKE %s"
        like = f"%{q}%"
        params = [like, like]

    sql += " ORDER BY model_id"

    rows = db.execute_query(sql, tuple(params))
    return [ModelResponse(**row) for row in rows]


@router.get("/{model_id}", response_model=ModelResponse)
async def get_model(model_id: str, current_user=Depends(get_current_user)):
    sql = "SELECT * FROM machine_models WHERE model_id=%s"
    rows = db.execute_query(sql, (model_id,))
    if not rows:
        raise HTTPException(404, "機種不存在")
    return ModelResponse(**rows[0])


@router.post("", response_model=ModelResponse)
async def create_model(data: ModelCreate, admin=Depends(get_current_admin)):
    exists = db.execute_query(
        "SELECT model_id FROM machine_models WHERE model_id=%s",
        (data.model_id,),
    )
    if exists:
        raise HTTPException(400, "機種代碼已存在")

    db.execute_update(
        "INSERT INTO machine_models (model_id, model_name, note) VALUES (%s,%s,%s)",
        (data.model_id, data.model_name, data.note),
    )

    return await get_model(data.model_id, admin)


@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
        model_id: str,
        data: ModelUpdate,
        admin=Depends(get_current_admin),
):
    await get_model(model_id, admin)

    fields = []
    params = []

    if data.model_name is not None:
        fields.append("model_name=%s")
        params.append(data.model_name)
    if data.note is not None:
        fields.append("note=%s")
        params.append(data.note)

    if fields:
        sql = f"UPDATE machine_models SET {', '.join(fields)} WHERE model_id=%s"
        params.append(model_id)
        db.execute_update(sql, tuple(params))

    return await get_model(model_id, admin)


@router.delete("/{model_id}", status_code=204)
async def delete_model(model_id: str, admin=Depends(get_current_admin)):
    affected = db.execute_update(
        "DELETE FROM machine_models WHERE model_id=%s",
        (model_id,),
    )
    if affected == 0:
        raise HTTPException(404, "機種不存在")
    return None
