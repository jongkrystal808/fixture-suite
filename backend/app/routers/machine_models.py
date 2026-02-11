"""
機種管理 API (v4.x - Header-based Customer Context)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from backend.app.dependencies import (
    get_current_user,
    get_current_admin,
    get_current_customer_id,
)
from backend.app.database import db

from fastapi.responses import StreamingResponse
from io import BytesIO
from openpyxl import Workbook

router = APIRouter(
    prefix="/models",
    tags=["機種 Machine Models"],
)

# ============================================================
# Schemas
# ============================================================

class ModelBase(BaseModel):
    id: str
    model_name: str
    note: Optional[str] = None


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    model_name: Optional[str] = None
    note: Optional[str] = None


class ModelResponse(ModelBase):
    customer_id: str
    created_at: Optional[datetime] = None


# ============================================================
# Template
# ============================================================

@router.get("/template", summary="下載機種匯入樣本（XLSX）")
async def download_models_template(
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):
    wb = Workbook()
    ws = wb.active
    ws.title = "models"

    # ⭐ 向下相容 + 可擴充欄位
    ws.append([
        "id",
        "model_name",
        "note",
        "station_id",
        "fixture_id",
        "required_qty",
    ])

    # ── 範例 1：只匯入機種（✔ 合法）
    ws.append([
        "*[必填]AWK-1137C",
        "AWK-1137C",
        "只建立機種",
        "",
        "",
        "",
    ])

    # ── 範例 2：機種 + 站點 + 治具需求（✔ 合法）
    ws.append([
        "*[必填]EDS-108S",
        "EDS-108S",
        "含站點與治具需求",
        "ST01",
        "FX-001",
        2,
    ])

    # ── 範例 3：此站點不需要該治具（✔ 合法）
    ws.append([
        "*[必填]EDS-108S",
        "EDS-108S",
        "",
        "ST02",
        "FX-002",
        0,
    ])

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
            'attachment; filename="models_import_template.xlsx"'
        }
    )




# ============================================================
# Export
# ============================================================

@router.get("/export", summary="匯出機種（XLSX）")
async def export_models_xlsx(
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT id, model_name, note
        FROM machine_models
        WHERE customer_id = %s
        ORDER BY id
        """,
        (customer_id,)
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "models"
    ws.append(["id", "model_name", "note"])

    for r in rows:
        ws.append([r["id"], r.get("model_name", ""), r.get("note", "")])

    bio = BytesIO()
    wb.save(bio)
    bio.seek(0)

    return StreamingResponse(
        bio,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="models_{customer_id}.xlsx"'}
    )


# ============================================================
# List
# ============================================================

@router.get("", response_model=List[ModelResponse], summary="查詢機種列表")
async def list_models(
    q: Optional[str] = Query(None, description="搜尋 model id 或名稱"),
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):

    sql = """
        SELECT *
        FROM machine_models
        WHERE customer_id = %s
    """
    params = [customer_id]

    if q:
        sql += " AND (id LIKE %s OR model_name LIKE %s)"
        like = f"%{q}%"
        params.extend([like, like])

    sql += " ORDER BY id"

    rows = db.execute_query(sql, tuple(params))
    return [ModelResponse(**row) for row in rows]


# ============================================================
# Get
# ============================================================

@router.get("/{model_id}", response_model=ModelResponse, summary="查詢機種")
async def get_model(
    model_id: str,
    user=Depends(get_current_user),
    customer_id: str = Depends(get_current_customer_id),
):

    rows = db.execute_query(
        """
        SELECT *
        FROM machine_models
        WHERE id = %s AND customer_id = %s
        """,
        (model_id, customer_id)
    )

    if not rows:
        raise HTTPException(status_code=404, detail="機種不存在")

    return ModelResponse(**rows[0])


# ============================================================
# Create
# ============================================================

@router.post("", response_model=ModelResponse, status_code=status.HTTP_201_CREATED)
async def create_model(
    data: ModelCreate,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    exists = db.execute_query(
        """
        SELECT id
        FROM machine_models
        WHERE id = %s AND customer_id = %s
        """,
        (data.id, customer_id)
    )
    if exists:
        raise HTTPException(400, "該客戶下的機種代碼已存在")

    db.execute_update(
        """
        INSERT INTO machine_models (id, customer_id, model_name, note)
        VALUES (%s, %s, %s, %s)
        """,
        (data.id, customer_id, data.model_name, data.note)
    )

    return await get_model(data.id, admin)


# ============================================================
# Update
# ============================================================

@router.put("/{model_id}", response_model=ModelResponse)
async def update_model(
    model_id: str,
    data: ModelUpdate,
    admin=Depends(get_current_admin),
):
    customer_id = admin.customer_id

    # 確認存在
    rows = db.execute_query(
        "SELECT id FROM machine_models WHERE id=%s AND customer_id=%s",
        (model_id, customer_id)
    )
    if not rows:
        raise HTTPException(404, "機種不存在")

    fields = []
    params = []

    if data.model_name is not None:
        fields.append("model_name=%s")
        params.append(data.model_name)

    if data.note is not None:
        fields.append("note=%s")
        params.append(data.note)

    if fields:
        params.extend([model_id, customer_id])
        db.execute_update(
            f"""
            UPDATE machine_models
            SET {', '.join(fields)}
            WHERE id=%s AND customer_id=%s
            """,
            tuple(params)
        )

    return await get_model(model_id, admin)


# ============================================================
# Delete
# ============================================================

@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_model(
    model_id: str,
    admin=Depends(get_current_admin),
    customer_id: str = Depends(get_current_customer_id),
):

    affected = db.execute_update(
        """
        DELETE FROM machine_models
        WHERE id=%s AND customer_id=%s
        """,
        (model_id, customer_id)
    )

    if affected == 0:
        raise HTTPException(404, "機種不存在")

    return None
