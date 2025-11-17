"""
更換記錄 API 路由
Replacement Logs API Routes

提供治具更換記錄的 CRUD、批量新增、Excel 匯入等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db

router = APIRouter(
    prefix="/logs/replacement",
    tags=["更換記錄 Replacement Logs"],
)


# ==================== Pydantic 模型 ====================


class ReplacementLogBase(BaseModel):
    """更換記錄基礎欄位"""

    fixture_id: str = Field(..., description="治具編號")
    replacement_date: date = Field(..., description="更換日期 (YYYY-MM-DD)")
    reason: Optional[str] = Field(None, description="更換原因")
    executor: Optional[str] = Field(None, description="執行人員")
    note: Optional[str] = Field(None, description="備註")


class ReplacementLogCreate(ReplacementLogBase):
    """建立更換記錄用模型"""
    pass


class ReplacementLogResponse(ReplacementLogBase):
    """更換記錄回應模型"""

    replacement_id: int = Field(..., description="更換記錄 ID")
    fixture_name: Optional[str] = Field(None, description="治具名稱")
    created_at: datetime = Field(..., description="建立時間")


class ReplacementLogListResponse(BaseModel):
    """更換記錄列表回應"""

    total: int
    logs: List[ReplacementLogResponse]


class ReplacementLogBatchCreate(ReplacementLogBase):
    """批量建立相同內容的更換記錄"""

    record_count: int = Field(
        1,
        ge=1,
        le=10000,
        description="要建立的筆數（同樣內容重複 N 筆）",
    )


class ReplacementLogImportRow(ReplacementLogBase):
    """匯入單列資料 (對應 Excel 的一列)"""

    # fixture_id, replacement_date, reason, executor, note 都沿用 Base
    pass


class ReplacementLogImportResult(BaseModel):
    """匯入結果回應"""

    message: str
    success_count: int
    fail_count: int
    skipped_rows: List[dict]


# ==================== 工具函數 ====================


def _check_fixture_exists(fixture_id: str):
    """檢查治具是否存在"""
    sql = "SELECT fixture_id, fixture_name FROM fixtures WHERE fixture_id = %s"
    rows = db.execute_query(sql, (fixture_id,))
    if not rows:
        return None
    return rows[0]


# ==================== 建立單筆更換記錄 ====================


@router.post(
    "/",
    response_model=ReplacementLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="建立更換記錄",
)
async def create_replacement_log(
    log_data: ReplacementLogCreate,
    current_username: str = Depends(get_current_username),
):
    """
    建立單筆更換記錄
    """
    try:
        fixture_row = _check_fixture_exists(log_data.fixture_id)
        if not fixture_row:
            raise HTTPException(
                status_code=400,
                detail=f"治具編號 {log_data.fixture_id} 不存在",
            )

        executor = log_data.executor or current_username

        insert_sql = """
            INSERT INTO replacement_logs
                (fixture_id, replacement_date, reason, executor, note)
            VALUES (%s, %s, %s, %s, %s)
        """
        replacement_id = db.insert(
            insert_sql,
            (
                log_data.fixture_id,
                log_data.replacement_date,
                log_data.reason,
                executor,
                log_data.note,
            ),
        )

        # 重新查一次，帶出 created_at 與 fixture_name
        query = """
            SELECT rl.replacement_id,
                   rl.fixture_id,
                   f.fixture_name,
                   rl.replacement_date,
                   rl.reason,
                   rl.executor,
                   rl.note,
                   rl.created_at
            FROM replacement_logs rl
            JOIN fixtures f ON rl.fixture_id = f.fixture_id
            WHERE rl.replacement_id = %s
        """
        rows = db.execute_query(query, (replacement_id,))
        row = rows[0]

        return ReplacementLogResponse(
            replacement_id=row["replacement_id"],
            fixture_id=row["fixture_id"],
            fixture_name=row.get("fixture_name"),
            replacement_date=row["replacement_date"],
            reason=row["reason"],
            executor=row["executor"],
            note=row["note"],
            created_at=row["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"建立更換記錄失敗: {e}",
        )


# ==================== 批量建立相同內容的更換記錄 ====================


@router.post(
    "/batch",
    response_model=ReplacementLogImportResult,
    summary="批量建立相同內容的更換記錄",
)
async def create_replacement_logs_batch(
    batch_data: ReplacementLogBatchCreate,
    current_username: str = Depends(get_current_username),
):
    """
    批量建立「內容完全相同」的更換記錄
    使用欄位：fixture_id, replacement_date, reason, executor(可省略), note, record_count
    """
    try:
        fixture_row = _check_fixture_exists(batch_data.fixture_id)
        if not fixture_row:
            raise HTTPException(
                status_code=400,
                detail=f"治具編號 {batch_data.fixture_id} 不存在",
            )

        executor = batch_data.executor or current_username

        insert_sql = """
            INSERT INTO replacement_logs
                (fixture_id, replacement_date, reason, executor, note)
            VALUES (%s, %s, %s, %s, %s)
        """

        success_count = 0
        skipped_rows: List[dict] = []

        for i in range(batch_data.record_count):
            try:
                db.insert(
                    insert_sql,
                    (
                        batch_data.fixture_id,
                        batch_data.replacement_date,
                        batch_data.reason,
                        executor,
                        batch_data.note,
                    ),
                )
                success_count += 1
            except Exception as e:
                # 理論上這裡不太會出錯，但還是保留，以便之後擴充
                skipped_rows.append(
                    {
                        "index": i,
                        "error": str(e),
                    }
                )

        fail_count = len(skipped_rows)

        return ReplacementLogImportResult(
            message="批量建立完成",
            success_count=success_count,
            fail_count=fail_count,
            skipped_rows=skipped_rows,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"批量建立更換記錄失敗: {e}",
        )


# ==================== Excel 匯入多筆不同內容 ====================


@router.post(
    "/import",
    response_model=ReplacementLogImportResult,
    summary="匯入多筆不同內容的更換記錄（Excel 解析後傳 JSON）",
)
async def import_replacement_logs(
    rows: List[ReplacementLogImportRow],
    current_username: str = Depends(get_current_username),
):
    """
    匯入多筆更換記錄。

    🔹 前端會先把 .xlsx 解析成 JSON，再呼叫本 API。
    🔹 每一列對應一個 ReplacementLogImportRow：

        - fixture_id           : str
        - replacement_date     : YYYY-MM-DD
        - reason               : str (可空)
        - executor             : str (可空，若空則使用目前登入帳號)
        - note                 : str (可空)

    🔹 錯誤處理：
        - 單筆失敗不會中斷整批
        - 會跳過錯誤行並記錄
        - 回傳 success_count / fail_count / skipped_rows
    """
    success_count = 0
    skipped_rows: List[dict] = []

    # Excel 通常第 2 列才是資料，所以這裡 row_index 從 2 開始比較直覺
    excel_row_index = 2

    insert_sql = """
        INSERT INTO replacement_logs
            (fixture_id, replacement_date, reason, executor, note)
        VALUES (%s, %s, %s, %s, %s)
    """

    for row in rows:
        try:
            # 檢查治具存在
            fixture_row = _check_fixture_exists(row.fixture_id)
            if not fixture_row:
                skipped_rows.append(
                    {
                        "row": excel_row_index,
                        "fixture_id": row.fixture_id,
                        "error": f"治具編號 {row.fixture_id} 不存在",
                    }
                )
                excel_row_index += 1
                continue

            executor = row.executor or current_username

            db.insert(
                insert_sql,
                (
                    row.fixture_id,
                    row.replacement_date,
                    row.reason,
                    executor,
                    row.note,
                ),
            )
            success_count += 1

        except Exception as e:
            skipped_rows.append(
                {
                    "row": excel_row_index,
                    "fixture_id": row.fixture_id,
                    "error": str(e),
                }
            )
        finally:
            excel_row_index += 1

    fail_count = len(skipped_rows)

    message = (
        "匯入完成，全部成功"
        if fail_count == 0
        else "匯入完成，有部分資料被略過"
    )

    return ReplacementLogImportResult(
        message=message,
        success_count=success_count,
        fail_count=fail_count,
        skipped_rows=skipped_rows,
    )


# ==================== 查詢單筆更換記錄 ====================


@router.get(
    "/{replacement_id}",
    response_model=ReplacementLogResponse,
    summary="取得單筆更換記錄",
)
async def get_replacement_log(
    replacement_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    根據 ID 取得單筆更換記錄
    """
    try:
        query = """
            SELECT rl.replacement_id,
                   rl.fixture_id,
                   f.fixture_name,
                   rl.replacement_date,
                   rl.reason,
                   rl.executor,
                   rl.note,
                   rl.created_at
            FROM replacement_logs rl
            JOIN fixtures f ON rl.fixture_id = f.fixture_id
            WHERE rl.replacement_id = %s
        """
        rows = db.execute_query(query, (replacement_id,))
        if not rows:
            raise HTTPException(
                status_code=404,
                detail=f"更換記錄 {replacement_id} 不存在",
            )

        row = rows[0]
        return ReplacementLogResponse(
            replacement_id=row["replacement_id"],
            fixture_id=row["fixture_id"],
            fixture_name=row.get("fixture_name"),
            replacement_date=row["replacement_date"],
            reason=row["reason"],
            executor=row["executor"],
            note=row["note"],
            created_at=row["created_at"],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"查詢更換記錄失敗: {e}",
        )


# ==================== 查詢更換記錄列表 ====================


@router.get(
    "",
    response_model=ReplacementLogListResponse,
    summary="查詢更換記錄列表",
)
async def list_replacement_logs(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(30, ge=1, le=500, description="每頁筆數"),
    fixture_id: Optional[str] = Query(None, description="治具編號篩選"),
    executor: Optional[str] = Query(None, description="執行人員包含文字"),
    date_from: Optional[date] = Query(None, description="更換日期起 (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="更換日期迄 (YYYY-MM-DD，含當日)"),
    current_user: dict = Depends(get_current_user),
):
    """
    查詢更換記錄列表（支援分頁與條件篩選）
    """
    try:
        where_clauses = []
        params: dict = {}

        if fixture_id:
            where_clauses.append("rl.fixture_id = %(fixture_id)s")
            params["fixture_id"] = fixture_id

        if executor:
            where_clauses.append("rl.executor LIKE %(executor)s")
            params["executor"] = f"%{executor}%"

        if date_from:
            where_clauses.append("rl.replacement_date >= %(date_from)s")
            params["date_from"] = date_from

        if date_to:
            where_clauses.append("rl.replacement_date <= %(date_to)s")
            params["date_to"] = date_to

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        count_sql = f"""
            SELECT COUNT(*) AS total
            FROM replacement_logs rl
            {where_sql}
        """
        total_result = db.execute_query(count_sql, params)
        total = total_result[0]["total"] if total_result else 0

        query = f"""
            SELECT rl.replacement_id,
                   rl.fixture_id,
                   f.fixture_name,
                   rl.replacement_date,
                   rl.reason,
                   rl.executor,
                   rl.note,
                   rl.created_at
            FROM replacement_logs rl
            JOIN fixtures f ON rl.fixture_id = f.fixture_id
            {where_sql}
            ORDER BY rl.replacement_date DESC, rl.created_at DESC
            LIMIT %(limit)s OFFSET %(skip)s
        """
        params["limit"] = limit
        params["skip"] = skip

        rows = db.execute_query(query, params)

        logs: List[ReplacementLogResponse] = []
        for row in rows:
            logs.append(
                ReplacementLogResponse(
                    replacement_id=row["replacement_id"],
                    fixture_id=row["fixture_id"],
                    fixture_name=row.get("fixture_name"),
                    replacement_date=row["replacement_date"],
                    reason=row["reason"],
                    executor=row["executor"],
                    note=row["note"],
                    created_at=row["created_at"],
                )
            )

        return ReplacementLogListResponse(total=total, logs=logs)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"查詢更換記錄列表失敗: {e}",
        )


# ==================== 刪除更換記錄 ====================


@router.delete(
    "/{replacement_id}",
    summary="刪除更換記錄",
)
async def delete_replacement_log(
    replacement_id: int,
    current_user: dict = Depends(get_current_user),
):
    """
    刪除指定的更換記錄
    """
    try:
        check = db.execute_query(
            "SELECT replacement_id FROM replacement_logs WHERE replacement_id = %s",
            (replacement_id,),
        )
        if not check:
            raise HTTPException(
                status_code=404,
                detail=f"更換記錄 {replacement_id} 不存在",
            )

        db.execute_update(
            "DELETE FROM replacement_logs WHERE replacement_id = %s",
            (replacement_id,),
        )

        return {
            "message": "更換記錄刪除成功",
            "replacement_id": replacement_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"刪除更換記錄失敗: {e}",
        )
