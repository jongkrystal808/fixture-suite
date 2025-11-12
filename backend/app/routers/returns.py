"""
退料 API 路由
Return API Routes

提供退料相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
import traceback

from backend.app.models.receipt import (
    ReturnCreate,
    ReturnResponse,
    ReturnListResponse,
    ReceiptType
)
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.utils.validators import parse_serial_list

# 建立路由器
router = APIRouter(
    prefix="/returns",
    tags=["退料管理 Returns"]
)


# ------------------------- 建立退料記錄 -------------------------
@router.post("", response_model=ReturnResponse, summary="建立退料記錄")
async def create_return(
        return_data: ReturnCreate,
        current_username: str = Depends(get_current_username)
):
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (return_data.fixture_code,))
        if not fixture_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {return_data.fixture_code} 不存在"
            )

        # 驗證退料類型與欄位
        if return_data.return_type == ReceiptType.BATCH:
            if not return_data.serial_start or not return_data.serial_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="批量退料需要提供 serial_start 和 serial_end"
                )
        elif return_data.return_type == ReceiptType.INDIVIDUAL:
            if not return_data.serials:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="少量退料需要提供 serials"
                )
            try:
                serial_list = parse_serial_list(return_data.serials)
                if not serial_list:
                    raise ValueError("序號列表為空")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"序號格式錯誤: {str(e)}"
                )

        operator = return_data.operator or current_username

        insert_query = """
            INSERT INTO returns_table 
                (type, vendor, order_no, fixture_code, serial_start, serial_end, serials, operator, note)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        return_id = db.insert(
            insert_query,
            (
                return_data.return_type.value,
                return_data.vendor,
                return_data.order_no,
                return_data.fixture_code,
                return_data.serial_start,
                return_data.serial_end,
                return_data.serials,
                operator,
                return_data.note
            )
        )

        return await get_return(return_id)

    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [create_return] 建立退料記錄失敗:\n", tb)
        raise HTTPException(status_code=500, detail=f"建立退料記錄失敗: {repr(e)}")


# ------------------------- 取得單筆退料 -------------------------
@router.get("/{return_id}", response_model=ReturnResponse, summary="取得退料記錄")
async def get_return(return_id: int):
    try:
        query = """
            SELECT id,
                   type AS return_type,
                   vendor,
                   order_no,
                   fixture_code,
                   serial_start,
                   serial_end,
                   serials,
                   operator,
                   note,
                   created_at
            FROM returns_table
            WHERE id = %s
        """
        result = db.execute_query(query, (return_id,))
        if not result:
            raise HTTPException(status_code=404, detail=f"退料記錄 {return_id} 不存在")

        row = result[0]
        return ReturnResponse(
            id=row["id"],
            return_type=row["return_type"],
            vendor=row["vendor"],
            order_no=row["order_no"],
            fixture_code=row["fixture_code"],
            serial_start=row["serial_start"],
            serial_end=row["serial_end"],
            serials=row["serials"],
            operator=row["operator"],
            note=row["note"],
            created_at=row["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [get_return] SQL 錯誤:\n", tb)
        raise HTTPException(status_code=500, detail=f"查詢退料記錄失敗: {repr(e)}")


# ------------------------- 查詢退料記錄列表 -------------------------
@router.get("", response_model=ReturnListResponse, summary="查詢退料記錄列表")
async def list_returns(
        skip: int = Query(0, ge=0, description="略過筆數"),
        limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
        fixture_code: Optional[str] = None,
        vendor: Optional[str] = None,
        order_no: Optional[str] = None,
        return_type: Optional[ReceiptType] = None
):
    try:
        where_conditions = []
        params = []

        if fixture_code:
            where_conditions.append("fixture_code = %s")
            params.append(fixture_code)
        if vendor:
            where_conditions.append("vendor LIKE %s")
            params.append(f"%{vendor}%")
        if order_no:
            where_conditions.append("order_no LIKE %s")
            params.append(f"%{order_no}%")
        if return_type:
            where_conditions.append("type = %s")
            params.append(return_type.value)

        where_clause = f"WHERE {' AND '.join(where_conditions)}" if where_conditions else ""

        # Count
        count_query = f"SELECT COUNT(*) AS total FROM returns_table {where_clause}"
        count_result = db.execute_query(count_query, tuple(params))
        total = count_result[0]["total"] if count_result else 0

        # Data query
        query = f"""
            SELECT 
                id,
                type AS return_type,
                vendor,
                order_no,
                fixture_code,
                serial_start,
                serial_end,
                serials,
                operator,
                note,
                created_at
            FROM returns_table
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, skip])
        result = db.execute_query(query, tuple(params))

        returns = []
        for row in result:
            returns.append(ReturnResponse(
                id=row["id"],
                return_type=row["return_type"],
                vendor=row["vendor"],
                order_no=row["order_no"],
                fixture_code=row["fixture_code"],
                serial_start=row["serial_start"],
                serial_end=row["serial_end"],
                serials=row["serials"],
                operator=row["operator"],
                note=row["note"],
                created_at=row["created_at"]
            ))

        return ReturnListResponse(total=total, returns=returns)
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [list_returns] SQL 錯誤:\n", tb)
        raise HTTPException(status_code=500, detail=f"查詢退料記錄列表失敗: {repr(e)}")


# ------------------------- 刪除退料記錄 -------------------------
@router.delete("/{return_id}", summary="刪除退料記錄")
async def delete_return(return_id: int, current_user: dict = Depends(get_current_user)):
    try:
        check_query = "SELECT id FROM returns_table WHERE id = %s"
        existing = db.execute_query(check_query, (return_id,))
        if not existing:
            raise HTTPException(status_code=404, detail=f"退料記錄 {return_id} 不存在")

        delete_query = "DELETE FROM returns_table WHERE id = %s"
        db.execute_update(delete_query, (return_id,))
        return {"message": "退料記錄刪除成功", "return_id": return_id}
    except HTTPException:
        raise
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [delete_return] SQL 錯誤:\n", tb)
        raise HTTPException(status_code=500, detail=f"刪除退料記錄失敗: {repr(e)}")


# ------------------------- 統計摘要 -------------------------
@router.get("/statistics/summary", summary="退料統計摘要")
async def get_returns_statistics():
    try:
        query = """
            SELECT 
                COUNT(*) AS total_returns,
                SUM(CASE WHEN type = 'batch' THEN 1 ELSE 0 END) AS batch_returns,
                SUM(CASE WHEN type = 'individual' THEN 1 ELSE 0 END) AS individual_returns,
                SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) AS today_returns,
                SUM(CASE WHEN YEAR(created_at) = YEAR(CURDATE()) 
                         AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) AS month_returns
            FROM returns_table
        """
        result = db.execute_query(query)
        row = result[0] if result else {}

        return {
            "total_returns": row.get("total_returns", 0) or 0,
            "batch_returns": row.get("batch_returns", 0) or 0,
            "individual_returns": row.get("individual_returns", 0) or 0,
            "today_returns": row.get("today_returns", 0) or 0,
            "month_returns": row.get("month_returns", 0) or 0
        }
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [get_returns_statistics] SQL 錯誤:\n", tb)
        raise HTTPException(status_code=500, detail=f"查詢統計資料失敗: {repr(e)}")


# ------------------------- 最近退料記錄 -------------------------
@router.get("/recent/list", response_model=ReturnListResponse, summary="最近退料記錄")
async def get_recent_returns(limit: int = Query(10, ge=1, le=100, description="記錄數")):
    try:
        query = """
            SELECT 
                id,
                type AS return_type,
                vendor,
                order_no,
                fixture_code,
                serial_start,
                serial_end,
                serials,
                operator,
                note,
                created_at
            FROM returns_table
            ORDER BY created_at DESC
            LIMIT %s
        """
        result = db.execute_query(query, (limit,))

        returns = []
        for row in result:
            returns.append(ReturnResponse(
                id=row["id"],
                return_type=row["return_type"],
                vendor=row["vendor"],
                order_no=row["order_no"],
                fixture_code=row["fixture_code"],
                serial_start=row["serial_start"],
                serial_end=row["serial_end"],
                serials=row["serials"],
                operator=row["operator"],
                note=row["note"],
                created_at=row["created_at"]
            ))

        return ReturnListResponse(total=len(returns), returns=returns)
    except Exception as e:
        tb = traceback.format_exc()
        print("❌ [get_recent_returns] SQL 錯誤:\n", tb)
        raise HTTPException(status_code=500, detail=f"查詢最近退料記錄失敗: {repr(e)}")
