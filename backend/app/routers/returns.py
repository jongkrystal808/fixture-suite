"""
退料 Returns Router (v3.5 統一 customer_id)
所有 API 的 customer_id 一律使用 Query(...)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import io

from backend.app.database import db
from backend.app.dependencies import get_current_user
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list

router = APIRouter(prefix="/returns", tags=["退料 Returns"])


# -------------------------------
# Helper：確認治具存在且隸屬客戶
# -------------------------------
def ensure_fixture_exists(fixture_id: str, customer_id: str):
  row = db.execute_query(
      "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
      (fixture_id, customer_id)
  )
  if not row:
      raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")


# ============================================================
# 列表
# GET /returns?customer_id=xxx&skip=0...
# ============================================================
@router.get("", summary="查詢退料紀錄")
def list_returns(
    customer_id: str = Query(...),
    fixture_id: Optional[str] = None,
    order_no: Optional[str] = None,
    operator: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    serial: Optional[str] = None,     # ★ 新增序號搜尋
    skip: int = 0,
    limit: int = 50,
    user=Depends(get_current_user)
):
    where = ["t.transaction_type='return'", "t.customer_id=%s"]
    params = [customer_id]

    if fixture_id:
        where.append("t.fixture_id LIKE %s")
        params.append(f"%{fixture_id}%")
    if order_no:
        where.append("t.order_no LIKE %s")
        params.append(f"%{order_no}%")
    if operator:
        where.append("t.operator LIKE %s")
        params.append(f"%{operator}%")
    if date_from:
        where.append("t.transaction_date >= %s")
        params.append(date_from)
    if date_to:
        where.append("t.transaction_date <= %s")
        params.append(date_to)

    # ★ 新增序號搜尋
    if serial:
        where.append("""
            t.id IN (
                SELECT transaction_id
                FROM material_transaction_details
                WHERE serial_number LIKE %s
            )
        """)
        params.append(f"%{serial}%")

    sql = f"""
        SELECT 
            t.*,
            GROUP_CONCAT(d.serial_number ORDER BY d.serial_number SEPARATOR ',') AS serial_list
        FROM material_transactions t
        LEFT JOIN material_transaction_details d
            ON d.transaction_id = t.id
        WHERE {' AND '.join(where)}
        GROUP BY t.id
        ORDER BY t.created_at DESC
        LIMIT %s OFFSET %s
    """

    params_page = params + [limit, skip]
    rows = db.execute_query(sql, tuple(params_page))

    count_sql = f"""
        SELECT COUNT(*) AS cnt
        FROM (
            SELECT t.id
            FROM material_transactions t
            LEFT JOIN material_transaction_details d ON d.transaction_id=t.id
            WHERE {' AND '.join(where)}
            GROUP BY t.id
        ) AS x
    """

    total = db.execute_query(count_sql, tuple(params))[0]["cnt"]

    return {"total": total, "returns": rows}


# ============================================================
# 取得單筆
# GET /returns/{id}?customer_id=xxx
# ============================================================
@router.get("/{return_id}", summary="取得退料單")
def get_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT * FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    ret_data = row[0]
    details = db.execute_query(
        "SELECT id, serial_number, created_at FROM material_transaction_details WHERE transaction_id=%s",
        (return_id,)
    )
    ret_data["details"] = details
    return ret_data


# ============================================================
# 新增退料 (統一 Query customer_id)
# POST /returns?customer_id=xxx
# ============================================================
@router.post("", summary="新增退料")
def create_return(
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    ensure_fixture_exists(fixture_id, customer_id)

    typ = data.get("type", "individual")

    if typ == "batch":
        serials = expand_serial_range(
            data.get("serial_start", ""),
            data.get("serial_end", "")
        )
    else:
        s = data.get("serials", "")
        if isinstance(s, list):
            serials = normalise_serial_list(s)
        else:
            serials = normalise_serial_list(
                [x.strip() for x in str(s).split(",") if x.strip()]
            )

    if not serials:
        raise HTTPException(400, "沒有提供任何序號")

    qty = len(serials)
    now = datetime.now()
    operator = data.get("operator") or user["username"]
    created_by = user["id"]

    try:
        return_id = db.execute_insert(
            """
            INSERT INTO material_transactions
              (transaction_type, transaction_date, customer_id, order_no, fixture_id,
               quantity, operator, note, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                'return',
                now.date(),
                customer_id,
                data.get("order_no"),
                fixture_id,
                qty,
                operator,
                data.get("note"),
                created_by
            )
        )
    except Exception as e:
        raise HTTPException(500, f"建立退料失敗: {e}")

    # 明細
    try:
        for sn in serials:
            db.execute_update(
                "INSERT INTO material_transaction_details (transaction_id, serial_number) VALUES (%s, %s)",
                (return_id, sn)
            )
    except Exception as e:
        db.execute_update("DELETE FROM material_transactions WHERE id=%s", (return_id,))
        raise HTTPException(500, f"寫入序號失敗，已回滾: {e}")

    return {"id": return_id, "fixture_id": fixture_id, "quantity": qty, "serials": serials}


# ============================================================
# 新增明細
# POST /returns/{id}/details?customer_id=xxx
# ============================================================
@router.post("/{return_id}/details", summary="新增序號到退料單")
def add_return_details(
    return_id: int,
    data: Dict[str, Any],
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    serials = data.get("serials", [])
    if not serials or not isinstance(serials, list):
        raise HTTPException(400, "請提供 serials 陣列")

    row = db.execute_query(
        "SELECT id, fixture_id FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    try:
        for sn in serials:
            db.execute_update(
                "INSERT INTO material_transaction_details (transaction_id, serial_number) VALUES (%s, %s)",
                (return_id, sn)
            )
        db.execute_update(
            "UPDATE material_transactions SET quantity = quantity + %s WHERE id=%s",
            (len(serials), return_id)
        )
    except Exception as e:
        raise HTTPException(500, f"新增序號失敗: {e}")

    return {"id": return_id, "added": len(serials)}


# ============================================================
# 刪除序號
# DELETE /returns/details/{detail_id}?customer_id=xxx
# ============================================================
@router.delete("/details/{detail_id}", summary="刪除退料序號")
def delete_return_detail(
    detail_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        """
        SELECT d.transaction_id, t.customer_id
        FROM material_transaction_details d
        JOIN material_transactions t ON t.id=d.transaction_id
        WHERE d.id=%s
        """,
        (detail_id,)
    )
    if not row:
        raise HTTPException(404, "明細不存在")
    if row[0]["customer_id"] != customer_id:
        raise HTTPException(403, "沒有權限刪除此序號")

    return_id = row[0]["transaction_id"]

    db.execute_update("DELETE FROM material_transaction_details WHERE id=%s", (detail_id,))
    db.execute_update(
        "UPDATE material_transactions SET quantity = GREATEST(quantity-1, 0) WHERE id=%s",
        (return_id,)
    )
    return {"deleted_detail_id": detail_id}


# ============================================================
# 刪除退料單
# DELETE /returns/{id}?customer_id=xxx
# ============================================================
@router.delete("/{return_id}", summary="刪除退料單")
def delete_return(
    return_id: int,
    customer_id: str = Query(...),
    user=Depends(get_current_user)
):
    row = db.execute_query(
        "SELECT id FROM material_transactions WHERE id=%s AND customer_id=%s AND transaction_type='return'",
        (return_id, customer_id)
    )
    if not row:
        raise HTTPException(404, "退料單不存在")

    db.execute_update("DELETE FROM material_transaction_details WHERE transaction_id=%s", (return_id,))
    db.execute_update("DELETE FROM material_transactions WHERE id=%s", (return_id,))
    return {"deleted_id": return_id}
