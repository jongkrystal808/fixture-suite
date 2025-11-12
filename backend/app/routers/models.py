"""
機種管理 API 路由
Machine Models API Routes

提供機種管理和開站數查詢相關的 API 端點
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from pydantic import BaseModel, Field

from backend.app.dependencies import get_current_user, get_current_admin
from backend.app.database import db

# 建立路由器
router = APIRouter(
    prefix="/models",
    tags=["機種管理 Machine Models"]
)


# ==================== Pydantic 模型 ====================

class MachineModelBase(BaseModel):
    """機種基礎模型"""
    model_id: str = Field(..., description="機種編號")
    model_name: str = Field(..., description="機種名稱")
    note: Optional[str] = Field(None, description="備註")


class MachineModelCreate(MachineModelBase):
    """建立機種模型"""
    pass


class MachineModelResponse(MachineModelBase):
    """機種回應模型"""
    created_at: Optional[str] = Field(None, description="建立時間")

    class Config:
        from_attributes = True


class MaxStationResult(BaseModel):
    """最大開站數結果"""
    station_id: int = Field(..., description="站點 ID")
    station_code: str = Field(..., description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    max_stations: int = Field(..., description="最大可開站數")
    bottleneck_fixture: Optional[str] = Field(None, description="瓶頸治具")
    bottleneck_available: Optional[int] = Field(None, description="瓶頸治具可用數量")
    bottleneck_required: Optional[int] = Field(None, description="瓶頸治具需求數量")


class MaxStationsResponse(BaseModel):
    """最大開站數查詢回應"""
    model_id: str = Field(..., description="機種編號")
    model_name: str = Field(..., description="機種名稱")
    stations: List[MaxStationResult] = Field(..., description="各站點最大開站數")


class FixtureRequirementDetail(BaseModel):
    """治具需求詳情"""
    fixture_id: str = Field(..., description="治具編號")
    fixture_name: str = Field(..., description="治具名稱")
    required_qty: int = Field(..., description="需求數量")
    available_qty: int = Field(..., description="可用數量")
    max_stations: int = Field(..., description="此治具可支援的最大站數")


class StationRequirementsResponse(BaseModel):
    """站點需求詳情回應"""
    model_id: str = Field(..., description="機種編號")
    model_name: str = Field(..., description="機種名稱")
    station_id: int = Field(..., description="站點 ID")
    station_code: str = Field(..., description="站點代碼")
    station_name: Optional[str] = Field(None, description="站點名稱")
    fixture_requirements: List[FixtureRequirementDetail] = Field(..., description="治具需求列表")
    max_stations: int = Field(..., description="最大可開站數")


# ==================== 機種管理 API ====================

@router.post("", response_model=MachineModelResponse, summary="建立機種")
async def create_machine_model(
        model_data: MachineModelCreate,
        current_user: dict = Depends(get_current_user)
):
    """
    建立新機種

    - **model_id**: 機種編號
    - **model_name**: 機種名稱
    - **note**: 備註

    需要登入
    """
    try:
        # 檢查機種編號是否已存在
        check_query = "SELECT model_id FROM machine_models WHERE model_id = %s"
        existing = db.execute_query(check_query, (model_data.model_id,))

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"機種編號 {model_data.model_id} 已存在"
            )

        # 插入機種
        insert_query = """
                       INSERT INTO machine_models (model_id, model_name, note)
                       VALUES (%s, %s, %s) \
                       """

        db.execute_update(
            insert_query,
            (model_data.model_id, model_data.model_name, model_data.note)
        )

        # 查詢剛建立的機種
        return await get_machine_model(model_data.model_id)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立機種失敗: {str(e)}"
        )


@router.get("/{model_id}", response_model=MachineModelResponse, summary="取得機種詳情")
async def get_machine_model(model_id: str):
    """
    根據機種編號取得機種詳情

    - **model_id**: 機種編號
    """
    try:
        query = """
                SELECT model_id   AS model_code, \
                       model_name AS model_name, \
                       note       AS note, \
                       created_at AS created_at
                FROM machine_models
                WHERE model_id = %s
                """

        result = db.execute_query(query, (model_id,))

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"機種 {model_id} 不存在"
            )

        row = result[0]

        return MachineModelResponse(
            model_id=row["model_code"],
            model_name=row["model_name"],
            note=row["note"],
            created_at=str(row["created_at"]) if row["created_at"] else None
        )


    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢機種失敗: {str(e)}"
        )


@router.get("", response_model=List[MachineModelResponse], summary="查詢機種列表")
async def list_machine_models(
        search: Optional[str] = Query(None, description="搜尋關鍵字")
):
    """
    查詢機種列表

    - **search**: 搜尋關鍵字（機種編號或名稱）
    """
    try:
        where_clause = ""
        params = []

        if search:
            where_clause = "WHERE model_id LIKE %s OR model_name LIKE %s"
            search_pattern = f"%{search}%"
            params = [search_pattern, search_pattern]

        query = """
                SELECT model_id AS model_code, model_name, note, created_at
                FROM machine_models \
                """
        if where_clause:
            query += " " + where_clause
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"

        params.extend([100, 0])  # 預設 limit/offset，也可改成實際變數
        result = db.execute_query(query, tuple(params))

        # ✅ 防呆：確保 result 是 list
        if not isinstance(result, (list, tuple)):
            raise HTTPException(status_code=500, detail="資料庫查詢回傳格式錯誤")

        models = []
        for row in result or []:
            try:
                models.append(MachineModelResponse(
                    model_id=row["model_code"],
                    model_name=row["model_name"],
                    note=row["note"],
                    created_at=str(row["created_at"]) if row["created_at"] else None
                ))
            except Exception as e:
                print(f"⚠️ [list_machine_models] 解析行失敗: {row} - {e}")

        return models


    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢機種列表失敗: {str(e)}"
        )


@router.delete("/{model_id}", summary="刪除機種")
async def delete_machine_model(
        model_id: str,
        current_admin: dict = Depends(get_current_admin)
):
    """
    刪除機種

    - **model_id**: 機種編號

    需要管理員權限

    注意：這會同時刪除關聯的站點、治具需求等資料
    """
    try:
        # 檢查機種是否存在
        check_query = "SELECT model_id FROM machine_models WHERE model_id = %s"
        existing = db.execute_query(check_query, (model_id,))

        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"機種 {model_id} 不存在"
            )

        # 刪除機種（CASCADE 會自動刪除關聯資料）
        delete_query = "DELETE FROM machine_models WHERE model_id = %s"
        db.execute_update(delete_query, (model_id,))

        return {
            "message": "機種刪除成功",
            "model_id": model_id
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除機種失敗: {str(e)}"
        )


# ==================== 開站數查詢 API ⭐ 核心功能 ====================

@router.get("/{model_id}/max-stations", response_model=MaxStationsResponse, summary="查詢機種最大開站數")
async def get_max_stations(model_id: str):
    """
    查詢機種在各站點的最大可開站數 ⭐ 核心功能

    - **model_id**: 機種編號

    根據治具庫存和需求量，計算每個站點最多可以開設幾站

    範例：
    - 機種 EDS-518A-SS-SC-80 在 T1_MP 站
    - 需要治具：L-00017 × 8, L-33-14 × 1, L-42-21 × 1 等
    - 庫存數量：2455, 1, 5 等
    - 計算結果：最多可開 1 站（受限於 L-33-14 只有 1 個）
    """
    try:
        # 檢查機種是否存在
        model_query = """
                      SELECT model_id, model_name
                      FROM machine_models
                      WHERE model_id = %s \
                      """

        model_result = db.execute_query(model_query, (model_id,))

        if not model_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"機種 {model_id} 不存在"
            )

        model_name = model_result[0]["model_name"]


        # 查詢機種的所有站點
        stations_query = """
                         SELECT DISTINCT ms.station_id, s.station_code, s.station_name
                         FROM model_stations ms
                                  JOIN stations s ON ms.station_id = s.station_id
                         WHERE ms.model_id = %s
                         ORDER BY s.station_code \
                         """

        stations_result = db.execute_query(stations_query, (model_id,))

        if not stations_result:
            return MaxStationsResponse(
                model_id=model_id,
                model_name=model_name,
                stations=[]
            )

        stations = []

        # 對每個站點計算最大開站數
        for station_row in stations_result:
            station_id = station_row["station_id"]
            station_code = station_row["station_code"]
            station_name = station_row["station_name"]

            # 查詢此站點需要的所有治具及其需求量和庫存量
            requirements_query = """
                                 SELECT fr.fixture_id, \
                                        f.fixture_name, \
                                        fr.required_qty, \
                                        (f.self_purchased_qty + f.customer_supplied_qty)                          as available_qty, \
                                        FLOOR((f.self_purchased_qty + f.customer_supplied_qty) / fr.required_qty) as max_stations
                                 FROM fixture_requirements fr
                                          JOIN fixtures f ON fr.fixture_id = f.fixture_id
                                 WHERE fr.model_id = %s
                                   AND fr.station_id = %s
                                   AND f.status = '正常'
                                 ORDER BY max_stations ASC \
                                 """

            requirements_result = db.execute_query(
                requirements_query,
                (model_id, station_id)
            )

            if not requirements_result:
                # 沒有治具需求，無法開站
                stations.append(MaxStationResult(
                    station_id=station_id,
                    station_code=station_code,
                    station_name=station_name,
                    max_stations=0,
                    bottleneck_fixture=None,
                    bottleneck_available=None,
                    bottleneck_required=None
                ))
                continue

            # 找出瓶頸治具（最大開站數最小的治具）
            bottleneck = requirements_result[0]
            fixture_id = bottleneck["fixture_id"]
            fixture_name = bottleneck["fixture_name"]
            required_qty = bottleneck["required_qty"]
            available_qty = bottleneck["available_qty"]
            max_stations = int(bottleneck["max_stations"])

            stations.append(MaxStationResult(
                station_id=station_id,
                station_code=station_code,
                station_name=station_name,
                max_stations=max_stations,
                bottleneck_fixture=f"{fixture_id} ({fixture_name})",
                bottleneck_available=available_qty,
                bottleneck_required=required_qty
            ))

        return MaxStationsResponse(
            model_id=model_id,
            model_name=model_name,
            stations=stations
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢最大開站數失敗: {str(e)}"
        )


@router.get("/{model_id}/stations/{station_id}/requirements",
            response_model=StationRequirementsResponse,
            summary="查詢機種在特定站點的治具需求詳情")
async def get_station_requirements(
        model_id: str,
        station_id: int
):
    """
    查詢機種在特定站點的治具需求詳情

    - **model_id**: 機種編號
    - **station_id**: 站點 ID

    顯示：
    - 每個治具的需求數量
    - 每個治具的可用數量
    - 每個治具可支援的最大站數
    - 整體的最大開站數（由最少的決定）
    """
    try:
        # 檢查機種和站點是否存在
        check_query = """
                      SELECT mm.model_name, s.station_code, s.station_name
                      FROM machine_models mm
                               CROSS JOIN stations s
                      WHERE mm.model_id = %s \
                        AND s.station_id = %s \
                      """

        check_result = db.execute_query(check_query, (model_id, station_id))

        if not check_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"機種 {model_id} 或站點 {station_id} 不存在"
            )

        model_name = check_result[0]["model_name"]
        station_code = check_result[0][1]
        station_name = check_result[0][2]

        # 查詢治具需求
        requirements_query = """
                             SELECT fr.fixture_id, \
                                    f.fixture_name, \
                                    fr.required_qty, \
                                    (f.self_purchased_qty + f.customer_supplied_qty)                          as available_qty, \
                                    FLOOR((f.self_purchased_qty + f.customer_supplied_qty) / fr.required_qty) as max_stations
                             FROM fixture_requirements fr
                                      JOIN fixtures f ON fr.fixture_id = f.fixture_id
                             WHERE fr.model_id = %s
                               AND fr.station_id = %s
                               AND f.status = '正常'
                             ORDER BY max_stations ASC \
                             """

        requirements_result = db.execute_query(
            requirements_query,
            (model_id, station_id)
        )

        fixture_requirements = []
        min_max_stations = 0

        for row in requirements_result:
            max_stations_for_fixture = int(row[4])

            fixture_requirements.append(FixtureRequirementDetail(
                fixture_id=row[0],
                fixture_name=row[1],
                required_qty=row[2],
                available_qty=row[3],
                max_stations=max_stations_for_fixture
            ))

            # 找出最小值（瓶頸）
            if not fixture_requirements or max_stations_for_fixture < min_max_stations:
                min_max_stations = max_stations_for_fixture

        if not fixture_requirements:
            min_max_stations = 0
        else:
            min_max_stations = fixture_requirements[0].max_stations if fixture_requirements else 0

        return StationRequirementsResponse(
            model_id=model_id,
            model_name=model_name,
            station_id=station_id,
            station_code=station_code,
            station_name=station_name,
            fixture_requirements=fixture_requirements,
            max_stations=min_max_stations
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢站點需求失敗: {str(e)}"
        )


@router.get("/view/max-stations-summary", summary="查詢所有機種的最大開站數總覽")
async def get_all_max_stations_summary():
    """
    查詢所有機種在各站點的最大開站數總覽

    使用資料庫視圖 view_model_max_stations

    用於快速查看所有機種的產能
    """
    try:
        query = """
                SELECT model_id, \
                       model_name, \
                       station_id, \
                       station_code, \
                       max_stations_for_this_station
                FROM view_model_max_stations
                ORDER BY model_id, station_id \
                """

        result = db.execute_query(query)

        # 組織成按機種分組的格式
        models_dict = {}

        for row in result:
            model_id = row[0]
            model_name = row[1]
            station_id = row[2]
            station_code = row[3]
            max_stations = row[4]

            if model_id not in models_dict:
                models_dict[model_id] = {
                    "model_id": model_id,
                    "model_name": model_name,
                    "stations": []
                }

            models_dict[model_id]["stations"].append({
                "station_id": station_id,
                "station_code": station_code,
                "max_stations": max_stations
            })

        return {
            "total_models": len(models_dict),
            "models": list(models_dict.values())
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查詢總覽失敗: {str(e)}"
        )