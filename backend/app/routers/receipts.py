"""
收料 API 路由
Receipt API Routes

提供收料相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Depends
from typing import List, Dict, Any, Optional

from backend.app.models.receipt import (
    ReceiptCreate,
    ReceiptResponse,
    ReceiptListResponse,
    ReceiptType
)
from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db
from backend.app.utils.validators import parse_serial_list


# 建立路由器
router = APIRouter(
    prefix="/receipts",
    tags=["收料管理 Receipts"]
)



@router.post("", response_model=ReceiptResponse, summary="建立收料記錄")
async def create_receipt(
        receipt_data: ReceiptCreate,
        current_username: str = Depends(get_current_username)
):
    print("🔍 current_username =", current_username)

    """
    建立收料記錄

    支援兩種模式：
    1. **批量收料** (receipt_type=batch): 使用流水號起訖
       - serial_start: 流水號起始
       - serial_end: 流水號結束

    2. **少量收料** (receipt_type=individual): 使用逗號分隔序號
       - serials: 序號列表 (逗號分隔)

    - **vendor**: 廠商
    - **order_no**: 單號
    - **fixture_code**: 治具編號
    - **operator**: 收料人員 (預設為登入用戶)
    - **note**: 備註

    需要登入
    """
    try:
        # 檢查治具是否存在
        fixture_check = "SELECT fixture_id FROM fixtures WHERE fixture_id = %s"
        fixture_exists = db.execute_query(fixture_check, (receipt_data.fixture_code,))

        if not fixture_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"治具編號 {receipt_data.fixture_code} 不存在"
            )

        # 驗證收料類型和對應欄位
        if receipt_data.receipt_type == ReceiptType.BATCH:
            if not receipt_data.serial_start or not receipt_data.serial_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="批量收料需要提供 serial_start 和 serial_end"
                )
        elif receipt_data.receipt_type == ReceiptType.INDIVIDUAL:
            if not receipt_data.serials:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="少量收料需要提供 serials"
                )
            # 驗證序號格式
            try:
                serial_list = parse_serial_list(receipt_data.serials)
                if not serial_list:
                    raise ValueError("序號列表為空")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"序號格式錯誤: {str(e)}"
                )

        # 設定操作人員（如果未提供，使用當前登入用戶）
        operator = receipt_data.operator or current_username

        # 插入收料記錄
        insert_query = """
                       INSERT INTO receipts
                       (type, vendor, order_no, fixture_code,
                        serial_start, serial_end, serials,
                        operator, note)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) \
                       """
        record_data = (
            receipt_data.receipt_type.value,
            receipt_data.vendor,
            receipt_data.order_no,
            receipt_data.fixture_code,
            receipt_data.serial_start,
            receipt_data.serial_end,
            receipt_data.serials,
            operator,
            receipt_data.note
        )
        receipt_id = db.insert("receipts", dict(zip(
            ["type", "vendor", "order_no", "fixture_code",
             "serial_start", "serial_end", "serials", "operator", "note"],
            record_data
        )))

        # 查詢剛建立的收料記錄
        return await get_receipt(receipt_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立收料記錄失敗: {str(e)}"
        )

@router.get("/{receipt_id}", response_model=ReceiptResponse, summary="取得收料記錄")

async def get_receipt(receipt_id: int):
    """
    根據 ID 取得收料記錄

    - **receipt_id**: 收料記錄 ID
    """
    try:
        query = """
                SELECT id, \
                       type, \
                       vendor, \
                       order_no, \
                       fixture_code, \
                       serial_start, \
                       serial_end, \
                       serials, \
                       operator, \
                       note, \
                       created_at
                FROM receipts
                WHERE id = %s \
                """

        result = db.execute_query(query, (receipt_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"收料記錄 {receipt_id} 不存在"
            )

        row = result[0]

        return ReceiptResponse(
            id=row["id"],
            receipt_type=row["type"],
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢收料記錄失敗: {str(e)}"
        )


@router.get("", response_model=ReceiptListResponse, summary="查詢收料記錄列表")
async def list_receipts(
        skip: int = Query(0, ge=0, description="略過筆數"),
        limit: int = Query(100, ge=1, le=1000, description="每頁筆數"),
        fixture_code: Optional[str] = Query(None, description="治具編號篩選"),
        vendor: Optional[str] = Query(None, description="廠商篩選"),
        order_no: Optional[str] = Query(None, description="單號篩選"),
        receipt_type: Optional[ReceiptType] = Query(None, description="收料類型篩選")
):
    """
    查詢收料記錄列表
    """
    print("========== RECEIPTS DEBUG ==========")
    print("收到請求:", {
        "skip": skip, "limit": limit,
        "fixture_code": fixture_code,
        "vendor": vendor,
        "order_no": order_no,
        "receipt_type": receipt_type.value if receipt_type else None
    })

    try:
        # 建立 WHERE 條件
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

        if receipt_type:
            where_conditions.append("type = %s")
            params.append(receipt_type.value)

        where_clause = ""
        if where_conditions:
            where_clause = "WHERE " + " AND ".join(where_conditions)

        # 查詢總筆數
        count_query = f"""
            SELECT COUNT(*)
            FROM receipts
            {where_clause}
        """

        print("COUNT SQL:", count_query)
        print("COUNT params:", params)

        count_result = db.execute_query(count_query, tuple(params))
        print("COUNT 結果:", count_result)

        total = count_result[0].get("COUNT(*)", 0) if count_result else 0

        # 查詢清單
        query = f"""
            SELECT 
                id, type, vendor, order_no, fixture_code,
                serial_start, serial_end, serials,
                operator, note, created_at
            FROM receipts
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """

        params_for_list = params + [limit, skip]

        print("LIST SQL:", query)
        print("LIST params:", params_for_list)

        result = db.execute_query(query, tuple(params_for_list))
        print("LIST 結果:", result)

        receipts = []
        for row in result:
            receipts.append(ReceiptResponse(
                id=row.get("id"),
                receipt_type=row.get("type"),
                vendor=row.get("vendor"),
                order_no=row.get("order_no"),
                fixture_code=row.get("fixture_code"),
                serial_start=row.get("serial_start"),
                serial_end=row.get("serial_end"),
                serials=row.get("serials"),
                operator=row.get("operator"),
                note=row.get("note"),
                created_at=row.get("created_at")
            ))

        print("========== END DEBUG ==========")

        return ReceiptListResponse(
            total=total,
            receipts=receipts
        )

    except Exception as e:
        print("🔥 Receipts API 發生錯誤:", e)
        print("========== END DEBUG (ERROR) ==========")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢收料記錄列表失敗: {str(e)}"
        )


@router.delete("/{receipt_id}", summary="刪除收料記錄")
async def delete_receipt(
        receipt_id: int,
        current_user: dict = Depends(get_current_user)
):
    """
    刪除收料記錄

    - **receipt_id**: 收料記錄 ID

    需要登入
    """
    try:
        # 檢查收料記錄是否存在
        check_query = "SELECT id FROM receipts WHERE id = %s"
        existing = db.execute_query(check_query, (receipt_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"收料記錄 {receipt_id} 不存在"
            )

        # 刪除收料記錄
        delete_query = "DELETE FROM receipts WHERE id = %s"
        db.execute_update(delete_query, (receipt_id,))

        return {
            "message": "收料記錄刪除成功",
            "receipt_id": receipt_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除收料記錄失敗: {str(e)}"
        )


@router.get("/statistics/summary", summary="收料統計摘要")
async def get_receipts_statistics():
    """
    取得收料統計摘要

    包含：
    - 總收料記錄數
    - 批量收料數
    - 少量收料數
    - 今日收料數
    - 本月收料數
    """
    try:
        query = """
                SELECT COUNT(*)                                                                                                       as total_receipts, \
                       SUM(CASE WHEN type = 'batch' THEN 1 ELSE 0 END)                                                                as batch_receipts, \
                       SUM(CASE WHEN type = 'individual' THEN 1 ELSE 0 END)                                                           as individual_receipts, \
                       SUM(CASE WHEN DATE (created_at) = CURDATE() THEN 1 ELSE 0 END)                                                 as today_receipts, \
                       SUM(CASE WHEN YEAR ( created_at) = YEAR(CURDATE()) 
                    AND MONTH(created_at) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as month_receipts
                FROM receipts \
                """

        result = db.execute_query(query)
        row = result[0]

        return {
            "total_receipts": row[0] or 0,
            "batch_receipts": row[1] or 0,
            "individual_receipts": row[2] or 0,
            "today_receipts": row[3] or 0,
            "month_receipts": row[4] or 0
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢統計資料失敗: {str(e)}"
        )


@router.get("/recent/list", response_model=ReceiptListResponse, summary="最近收料記錄")
async def get_recent_receipts(
        limit: int = Query(10, ge=1, le=100, description="記錄數")
):
    """
    取得最近的收料記錄

    - **limit**: 記錄數（預設 10，最多 100）

    用於儀表板顯示
    """
    try:
        query = """
                SELECT id, \
                       type, \
                       vendor, \
                       order_no, \
                       fixture_code, \
                       serial_start, \
                       serial_end, \
                       serials, \
                       operator, \
                       note, \
                       created_at
                FROM receipts
                ORDER BY created_at DESC
                    LIMIT %s \
                """

        result = db.execute_query(query, (limit,))

        receipts = []
        for row in result:
            receipts.append(ReceiptResponse(
                id=row.get("id"),
                receipt_type=row.get("type"),
                vendor=row.get("vendor"),
                order_no=row.get("order_no"),
                fixture_code=row.get("fixture_code"),
                serial_start=row.get("serial_start"),
                serial_end=row.get("serial_end"),
                serials=row.get("serials"),
                operator=row.get("operator"),
                note=row.get("note"),
                created_at=row.get("created_at")
            ))

        return ReceiptListResponse(
            total=len(receipts),
            receipts=receipts
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢最近收料記錄失敗: {str(e)}"
        )