"""
使用記錄 API 路由
Usage Logs API Routes

提供治具使用記錄的 CRUD、批量新增、Excel 匯入等功能
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_username
from backend.app.database import db

router = APIRouter(
    prefix="/logs/usage",
    tags=["使用記錄 Usage Logs"],
)


# ==================== Pydantic 模型 ====================


class UsageLogBase(BaseModel):
    """使用記錄基本欄位"""

    fixture_id: str = Field(..., description="治具編號")
    station_id: Optional[int] = Field(None, description="站點 ID")
    use_count: int = Field(1, ge=1, description="使用次數")
    abnormal_status: Optional[str] = Field(None, description="異常狀態")
    operator: Optional[str] = Field(None, description="操作人員")
    note: Optional[str] = Field(None, description="備註")
    used_at: Optional[datetime] = Field(None, description="使用時間（可空）")


class UsageLogCreate(UsageLogBase):
    """建立使用記錄用模型"""
    pass


class UsageLogResponse(UsageLogBase):
    """使用記錄回應模型"""

    log_id: int = Field(..., description="使用記錄 ID")
    fixture_name: Optional[str] = None
    station_code: Optional[str] = None
    station_name: Optional[str] = None
    used_at: Optional[datetime]


class UsageLogListResponse(BaseModel):
    """使用記錄列表回應"""

    total: int
    logs: List[UsageLogResponse]


class UsageLogBatchCreate(UsageLogBase):
    """批量建立相同內容的使用記錄"""

    record_count: int = Field(
        1,
        ge=1,
        le=10000,
        description="要建立的筆數（同樣內容重複 N 筆）",
    )


class UsageLogImportRow(UsageLogBase):
    """匯入單列資料 (Excel → JSON)"""
    pass


class UsageLogImportResult(BaseModel):
    """匯入結果回應"""

    message: str
    success_count: int
    fail_count: int
    skipped_rows: List[dict]


# ==================== 工具函式 ====================


def _check_fixture_exists(fid: str):
    sql = "SELECT fixture_id, fixture_name FROM fixtures WHERE fixture_id = %s"
    rows = db.execute_query(sql, (fid,))
    return rows[0] if rows else None


def _check_station_exists(station_id: Optional[int]):
    if station_id is None:
        return True
    sql = "SELECT station_id, station_code, station_name FROM stations WHERE station_id = %s"
    rows = db.execute_query(sql, (station_id,))
    return rows[0] if rows else None


# ==================== 建立單筆使用記錄 ====================


@router.post(
    "/",
    response_model=UsageLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="建立使用記錄",
)
async def create_usage_log(
    log_data: UsageLogCreate,
    current_username: str = Depends(get_current_username),
):
    try:
        fixture_row = _check_fixture_exists(log_data.fixture_id)
        if not fixture_row:
            raise HTTPException(400, f"治具 {log_data.fixture_id} 不存在")

        station_row = _check_station_exists(log_data.station_id)
        if log_data.station_id and not station_row:
            raise HTTPException(400, f"站點 ID {log_data.station_id} 不存在")

        operator = log_data.operator or current_username
        used_at = log_data.used_at or datetime.now()

        insert_sql = """
            INSERT INTO usage_logs
                (fixture_id, station_id, use_count, abnormal_status, operator, note, used_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        log_id = db.insert(
            insert_sql,
            (
                log_data.fixture_id,
                log_data.station_id,
                log_data.use_count,
                log_data.abnormal_status,
                operator,
                log_data.note,
                used_at,
            ),
        )

        return UsageLogResponse(
            log_id=log_id,
            fixture_id=log_data.fixture_id,
            fixture_name=fixture_row.get("fixture_name"),
            station_id=log_data.station_id,
            station_code=station_row.get("station_code") if station_row else None,
            station_name=station_row.get("station_name") if station_row else None,
            use_count=log_data.use_count,
            abnormal_status=log_data.abnormal_status,
            operator=operator,
            note=log_data.note,
            used_at=used_at,
        )
    except Exception as e:
        raise HTTPException(500, f"建立使用記錄失敗: {e}")


# ==================== 批量建立（相同內容） ====================


@router.post(
    "/batch",
    response_model=UsageLogImportResult,
    summary="批量建立相同內容的使用記錄",
)
async def create_usage_logs_batch(
    batch: UsageLogBatchCreate,
    current_username: str = Depends(get_current_username),
):
    try:
        fixture_row = _check_fixture_exists(batch.fixture_id)
        if not fixture_row:
            raise HTTPException(400, f"治具 {batch.fixture_id} 不存在")

        station_row = _check_station_exists(batch.station_id)
        if batch.station_id and not station_row:
            raise HTTPException(400, f"站點 ID {batch.station_id} 不存在")

        operator = batch.operator or current_username
        used_at = batch.used_at or datetime.now()

        sql = """
            INSERT INTO usage_logs
                (fixture_id, station_id, use_count, abnormal_status, operator, note, used_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        success = 0
        skipped = []

        for i in range(batch.record_count):
            try:
                db.insert(
                    sql,
                    (
                        batch.fixture_id,
                        batch.station_id,
                        batch.use_count,
                        batch.abnormal_status,
                        operator,
                        batch.note,
                        used_at,
                    ),
                )
                success += 1
            except Exception as e:
                skipped.append({"index": i, "error": str(e)})

        return UsageLogImportResult(
            message="批量建立完成",
            success_count=success,
            fail_count=len(skipped),
            skipped_rows=skipped,
        )

    except Exception as e:
        raise HTTPException(500, f"批量建立使用記錄失敗: {e}")


# ==================== 匯入 Excel （多筆不同內容） ====================


@router.post(
    "/import",
    response_model=UsageLogImportResult,
    summary="匯入多筆不同內容的使用記錄（Excel 解析後傳 JSON）",
)
async def import_usage_logs(
    rows: List[UsageLogImportRow],
    current_username: str = Depends(get_current_username),
):
    sql = """
        INSERT INTO usage_logs
            (fixture_id, station_id, use_count, abnormal_status, operator, note, used_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    success = 0
    skipped = []
    excel_row_num = 2  # Excel 的第 2 列開始才是資料

    for row in rows:
        try:
            fixture_row = _check_fixture_exists(row.fixture_id)
            if not fixture_row:
                skipped.append({
                    "row": excel_row_num,
                    "error": f"治具 {row.fixture_id} 不存在"
                })
                excel_row_num += 1
                continue

            station_row = _check_station_exists(row.station_id)
            if row.station_id and not station_row:
                skipped.append({
                    "row": excel_row_num,
                    "error": f"站點 ID {row.station_id} 不存在"
                })
                excel_row_num += 1
                continue

            operator = row.operator or current_username
            used_at = row.used_at or datetime.now()

            db.insert(
                sql,
                (
                    row.fixture_id,
                    row.station_id,
                    row.use_count,
                    row.abnormal_status,
                    operator,
                    row.note,
                    used_at,
                ),
            )
            success += 1
        except Exception as e:
            skipped.append({"row": excel_row_num, "error": str(e)})
        finally:
            excel_row_num += 1

    msg = "匯入完成，全部成功" if not skipped else "匯入完成，有部分資料被略過"

    return UsageLogImportResult(
        message=msg,
        success_count=success,
        fail_count=len(skipped),
        skipped_rows=skipped,
    )


# ==================== 查詢單筆使用記錄 ====================


@router.get(
    "/{log_id}",
    response_model=UsageLogResponse,
    summary="取得使用記錄",
)
async def get_usage_log(log_id: int):
    sql = """
        SELECT ul.*, f.fixture_name,
               s.station_code, s.station_name
        FROM usage_logs ul
        LEFT JOIN fixtures f ON ul.fixture_id = f.fixture_id
        LEFT JOIN stations s ON ul.station_id = s.station_id
        WHERE ul.log_id = %s
    """
    rows = db.execute_query(sql, (log_id,))
    if not rows:
        raise HTTPException(404, f"使用記錄 {log_id} 不存在")

    row = rows[0]
    return UsageLogResponse(
        log_id=row["log_id"],
        fixture_id=row["fixture_id"],
        fixture_name=row.get("fixture_name"),
        station_id=row["station_id"],
        station_code=row.get("station_code"),
        station_name=row.get("station_name"),
        use_count=row["use_count"],
        abnormal_status=row["abnormal_status"],
        operator=row["operator"],
        note=row["note"],
        used_at=row["used_at"],
    )


# ==================== 查詢列表 ====================


@router.get(
    "",
    response_model=UsageLogListResponse,
    summary="查詢使用記錄列表（支援篩選與分頁）",
)
async def list_usage_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=500),
    fixture_id: Optional[str] = None,
    station_id: Optional[int] = None,
    operator: Optional[str] = None,
    has_abnormal: Optional[bool] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    try:
        wh = []
        params = {}

        if fixture_id:
            wh.append("ul.fixture_id = %(fixture_id)s")
            params["fixture_id"] = fixture_id

        if station_id:
            wh.append("ul.station_id = %(station_id)s")
            params["station_id"] = station_id

        if operator:
            wh.append("ul.operator LIKE %(operator)s")
            params["operator"] = f"%{operator}%"

        if has_abnormal is not None:
            if has_abnormal:
                wh.append("ul.abnormal_status IS NOT NULL")
            else:
                wh.append("ul.abnormal_status IS NULL")

        if date_from:
            wh.append("ul.used_at >= %(date_from)s")
            params["date_from"] = date_from

        if date_to:
            wh.append("ul.used_at <= %(date_to)s")
            params["date_to"] = date_to

        where_sql = f"WHERE {' AND '.join(wh)}" if wh else ""

        # 取總筆數
        count_sql = f"SELECT COUNT(*) AS total FROM usage_logs ul {where_sql}"
        total = db.execute_query(count_sql, params)[0]["total"]

        # 資料列表
        query = f"""
            SELECT ul.*, f.fixture_name,
                   s.station_code, s.station_name
            FROM usage_logs ul
            LEFT JOIN fixtures f ON ul.fixture_id = f.fixture_id
            LEFT JOIN stations s ON ul.station_id = s.station_id
            {where_sql}
            ORDER BY ul.used_at DESC
            LIMIT %(limit)s OFFSET %(skip)s
        """
        params["limit"] = limit
        params["skip"] = skip

        rows = db.execute_query(query, params)

        logs = [
            UsageLogResponse(
                log_id=row["log_id"],
                fixture_id=row["fixture_id"],
                fixture_name=row.get("fixture_name"),
                station_id=row["station_id"],
                station_code=row.get("station_code"),
                station_name=row.get("station_name"),
                use_count=row["use_count"],
                abnormal_status=row["abnormal_status"],
                operator=row["operator"],
                note=row["note"],
                used_at=row["used_at"],
            )
            for row in rows
        ]

        return UsageLogListResponse(total=total, logs=logs)

    except Exception as e:
        raise HTTPException(500, f"查詢使用記錄列表失敗: {e}")


# ==================== 刪除使用記錄 ====================


@router.delete("/{log_id}", summary="刪除使用記錄")
async def delete_usage_log(log_id: int):
    try:
        exists = db.execute_query(
            "SELECT log_id FROM usage_logs WHERE log_id = %s", (log_id,)
        )
        if not exists:
            raise HTTPException(404, f"使用記錄 {log_id} 不存在")

        db.execute_update(
            "DELETE FROM usage_logs WHERE log_id = %s",
            (log_id,),
        )

        return {"message": "使用記錄刪除成功", "log_id": log_id}

    except Exception as e:
        raise HTTPException(500, f"刪除使用記錄失敗: {e}")
