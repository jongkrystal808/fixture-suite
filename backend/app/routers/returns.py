from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from backend.app.database import db
from backend.app.dependencies import get_current_user

from backend.app.utils.serial_tools import (
    expand_serial_range,
    normalise_serial_list
)

router = APIRouter(
    prefix="/returns",
    tags=["退料 Returns"]
)

# ============================================================
# Schema
# ============================================================

class ReturnBase(BaseModel):
    type: str
    vendor: Optional[str] = None
    order_no: Optional[str] = None
    fixture_code: str
    serial_start: Optional[str] = None
    serial_end: Optional[str] = None
    serials: Optional[str] = None
    operator: Optional[str] = None
    note: Optional[str] = None

class ReturnCreate(ReturnBase):
    pass

class ReturnImportRow(ReturnBase):
    pass


# ============================================================
# 查詢
# ============================================================

@router.get("")
def list_returns(
    fixture_code: Optional[str] = None,
    vendor: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
):
    sql = "SELECT * FROM returns_table WHERE 1=1"
    params = []

    if fixture_code:
        sql += " AND fixture_code LIKE %s"
        params.append(f"%{fixture_code}%")

    if vendor:
        sql += " AND vendor LIKE %s"
        params.append(f"%{vendor}%")

    if order_no:
        sql += " AND order_no LIKE %s"
        params.append(f"%{order_no}%")

    if operator:
        sql += " AND operator LIKE %s"
        params.append(f"%{operator}%")

    sql += " ORDER BY created_at DESC"

    return db.query_all(sql, params)


# ============================================================
# 新增
# ============================================================

@router.post("")
def create_return(data: ReturnCreate, user=Depends(get_current_user)):

    if data.type not in ("batch", "individual"):
        raise HTTPException(400, "type 必須為 batch 或 individual")

    # -------------------------
    # batch
    # -------------------------
    if data.type == "batch":
        if not data.serial_start or not data.serial_end:
            raise HTTPException(400, "batch 模式缺序號起迄")

        try:
            serials = expand_serial_range(data.serial_start, data.serial_end)
        except Exception as e:
            raise HTTPException(400, f"序號展開錯誤：{e}")

        for s in serials:
            db.execute("""
                INSERT INTO returns_table (type, vendor, order_no, fixture_code,
                                           serials, operator, note)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, ("individual", data.vendor, data.order_no,
                  data.fixture_code, s, data.operator, data.note))

        return {"message": f"批量新增 {len(serials)} 筆"}

    # -------------------------
    # individual
    # -------------------------
    if not data.serials:
        raise HTTPException(400, "individual 模式需提供 serials（逗號分隔）")

    try:
        serial_list = normalise_serial_list(
            [x.strip() for x in data.serials.split(",")]
        )
    except Exception as e:
        raise HTTPException(400, f"序號格式錯誤：{e}")

    for s in serial_list:
        db.execute("""
            INSERT INTO returns_table (type, vendor, order_no, fixture_code,
                                       serials, operator, note)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, ("individual", data.vendor, data.order_no,
              data.fixture_code, s, data.operator, data.note))

    return {"message": f"新增 {len(serial_list)} 筆"}


# ============================================================
# 匯入
# ============================================================

@router.post("/import")
def import_returns(rows: List[ReturnImportRow], user=Depends(get_current_user)):

    success = 0
    skipped = []

    for idx, row in enumerate(rows, start=2):

        if not row.fixture_code:
            skipped.append({"row": idx, "error": "fixture_code 必填"})
            continue

        try:
            # -------------------------
            # batch
            # -------------------------
            if row.type == "batch":
                if not row.serial_start or not row.serial_end:
                    skipped.append({"row": idx, "error": "缺 serial_start / serial_end"})
                    continue

                serials = expand_serial_range(row.serial_start, row.serial_end)

                for s in serials:
                    db.execute("""
                        INSERT INTO returns_table (type, vendor, order_no, fixture_code,
                                                   serials, operator, note)
                        VALUES (%s,%s,%s,%s,%s,%s,%s)
                    """, ("individual", row.vendor, row.order_no,
                          row.fixture_code, s, row.operator, row.note))

                success += len(serials)
                continue

            # -------------------------
            # individual
            # -------------------------
            if not row.serials:
                skipped.append({"row": idx, "error": "serials 必填"})
                continue

            cleaned = normalise_serial_list(
                [x.strip() for x in row.serials.split(",")]
            )

            for s in cleaned:
                db.execute("""
                    INSERT INTO returns_table (type, vendor, order_no, fixture_code,
                                               serials, operator, note)
                    VALUES (%s,%s,%s,%s,%s,%s,%s)
                """, ("individual", row.vendor, row.order_no,
                      row.fixture_code, s, row.operator, row.note))

            success += len(cleaned)
            continue

        except Exception as e:
            skipped.append({"row": idx, "error": str(e)})

    return {
        "message": "退料匯入完成",
        "success_count": success,
        "fail_count": len(skipped),
        "skipped_rows": skipped
    }


# ============================================================
# 刪除
# ============================================================

@router.delete("/{id}")
def delete_return(id: int, user=Depends(get_current_user)):
    db.execute("DELETE FROM returns_table WHERE id=%s", (id,))
    return {"message": "刪除成功"}
