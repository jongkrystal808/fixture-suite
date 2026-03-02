"""
治具管理系統 - FastAPI 主程式
Fixture Management System - Main Application

FastAPI 應用程式入口點
"""
import logging
logging.basicConfig(level=logging.DEBUG)

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
import os

# 導入路由
from backend.app.routers.auth import router as auth_router
from backend.app.routers.customers import router as customers_router
from backend.app.routers.fixtures import router as fixtures_router
from backend.app.routers.machine_models import router as machine_models_router
from backend.app.routers.model_detail import router as model_detail_router
from backend.app.routers.owners import router as owners_router
from backend.app.routers.material_transactions import router as material_transactions_router
from backend.app.routers.replacement import router as replacement_router
from backend.app.routers.serials import router as serials_router
from backend.app.routers.stations import router as stations_router
from backend.app.routers.stats import router as stats_router
from backend.app.routers.usage import router as usage_router
from backend.app.routers.users import router as users_router
from backend.app.routers.transactions import router as transactions_router
from backend.app.routers.fixtures_import import router as fixtures_import_router
from backend.app.routers.machine_models_import import router as machine_models_import_router
from backend.app.routers.inventory import router as inventory_router
from backend.app.routers.transactions_import import router as transaction_import_router
from backend.app.routers.lifecycle import router as lifecycle_router
from backend.app.routers.lifecycle_analysis import router as lifecycle_analysis_router


# 導入配置和資料庫
from backend.config import settings
from backend.app.database import db


# ==================== 應用程式生命週期 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    應用程式啟動和關閉時的處理
    """
    # 啟動時
    print("=" * 70)
    print("🚀 治具管理系統啟動中...")
    print("=" * 70)

    # 檢查資料庫連接
    try:
        if db.check_connection():
            print("✅ 資料庫連接成功")

            # 顯示資料庫資訊
            result = db.execute_query("SELECT VERSION()")
            if result:
                print(f"📊 MySQL 版本: {result[0][0]}")

            # 檢查資料表
            tables_result = db.execute_query("SHOW TABLES")
            if tables_result:
                table_count = len(tables_result)
                print(f"📁 找到 {table_count} 個資料表")
        else:
            print("⚠️  警告: 資料庫連接失敗")
    except Exception as e:
        print(f"❌ 資料庫連接錯誤: {str(e)}")

    print("-" * 70)
    print(f"🌐 API 文件: http://localhost:8000/docs")
    print(f"🌐 前端頁面: http://localhost:8000/")
    print(f"🔧 API 版本: {settings.API_VERSION}")
    print("=" * 70)

    yield

    # 關閉時
    print("\n" + "=" * 70)
    print("👋 治具管理系統關閉中...")

    # 關閉資料庫連接
    try:
        db.close()
        print("✅ 資料庫連接已關閉")
    except Exception as e:
        print(f"⚠️  關閉資料庫連接時發生錯誤: {str(e)}")

    print("=" * 70)


# ==================== 建立 FastAPI 應用程式 ====================

app = FastAPI(
    title=settings.API_TITLE,
    description="""
    ## 治具管理系統 API
    
    完整的治具生命週期管理系統，包含：
    
    ### 核心功能
    * 🔐 **認證系統** - JWT Token 認證、使用者管理
    * 🔧 **治具管理** - CRUD、狀態追蹤、庫存管理
    * 📦 **收退料** - 批量/少量收退料登記
    * 📝 **記錄管理** - 使用記錄、更換記錄
    * 🏭 **機種管理** - 機種資料、開站數查詢
    
    ### 特色
    * 支援批量和少量操作
    * 自動計算治具更換狀態
    * 即時庫存追蹤
    * 開站數智能計算
    * 完整的權限控管
    
    ### 技術架構
    * **後端框架**: FastAPI 0.100+
    * **資料庫**: MySQL 8.0+
    * **認證方式**: JWT (Bearer Token)
    * **API 風格**: RESTful
    
    ---
    
    **開發者**: 治具管理系統團隊  
    **版本**: 3.0.0  
    **最後更新**: 2025-11-21
    """,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)


# ==================== CORS 設定 ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應該限制來源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 請求計時中間件 ====================

# @app.middleware("http")
# async def add_process_time_header(request: Request, call_next):
#     """
#     記錄每個請求的處理時間
#     """
#     start_time = time.time()
#     response = await call_next(request)
#     process_time = time.time() - start_time
#     response.headers["X-Process-Time"] = str(process_time)
#     return response


# ==================== 全域異常處理 ====================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    處理資料驗證錯誤
    """
    errors = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        errors.append({
            "field": field,
            "message": message,
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "資料驗證失敗",
            "errors": errors
        }
    )


# @app.exception_handler(Exception)
# async def general_exception_handler(request: Request, exc: Exception):
#     """
#     處理未捕獲的異常
#     """
#     return JSONResponse(
#         status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         content={
#             "detail": "伺服器內部錯誤",
#             "message": str(exc),
#             "path": str(request.url)
#         }
#     )


# ==================== 註冊路由 ====================

# Just use /api/v2 as the base
# ============================================================
# 🔐 認證 / 使用者 / 客戶 相關
# ============================================================
app.include_router(auth_router, prefix="/api/v2")
app.include_router(users_router, prefix="/api/v2")
app.include_router(customers_router, prefix="/api/v2")



# ============================================================
# 📚 基礎資料（Master Data）
# ============================================================
app.include_router(owners_router, prefix="/api/v2")            # 負責人
app.include_router(stations_router, prefix="/api/v2")          # 站點
app.include_router(machine_models_router, prefix="/api/v2")    # 機種
app.include_router(model_detail_router, prefix="/api/v2")    # 機種站點對應/治具需求

app.include_router(machine_models_import_router, prefix="/api/v2")

app.include_router(inventory_router, prefix="/api/v2")

# ============================================================
# 🧰 治具主資料（Fixture Master）
# ============================================================
app.include_router(fixtures_router, prefix="/api/v2")
app.include_router(fixtures_import_router, prefix="/api/v2")
# 治具清單


# ============================================================
# 🔢 序號管理（Serial Management）
# ============================================================
app.include_router(serials_router, prefix="/api/v2")


# ============================================================
# 🔄 流程類（Process APIs）
# ============================================================

app.include_router(transactions_router, prefix="/api/v2")
app.include_router(material_transactions_router, prefix="/api/v2")  # 收退料
app.include_router(usage_router, prefix="/api/v2")           # 使用紀錄
app.include_router(replacement_router, prefix="/api/v2")     # 更換紀錄
app.include_router(transaction_import_router, prefix="/api/v2")

# ============================================================
# 📊 統計（Analytics / Dashboard）
# ============================================================
app.include_router(stats_router, prefix="/api/v2")
app.include_router(lifecycle_router, prefix="/api/v2")
app.include_router(lifecycle_analysis_router, prefix="/api/v2")

# ==================== 根路由 ====================

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
async def root():
    """
    系統首頁
    """
    return """
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>治具管理系統</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                padding: 60px;
                max-width: 800px;
                width: 100%;
            }
            h1 {
                color: #667eea;
                font-size: 3em;
                margin-bottom: 20px;
                text-align: center;
            }
            .subtitle {
                color: #666;
                font-size: 1.2em;
                text-align: center;
                margin-bottom: 40px;
            }
            .status {
                background: #f0f9ff;
                border-left: 4px solid #0ea5e9;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            .status-item {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 1.1em;
            }
            .status-label {
                color: #64748b;
            }
            .status-value {
                color: #0f172a;
                font-weight: bold;
            }
            .links {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 30px;
            }
            .link-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px 20px;
                border-radius: 12px;
                text-align: center;
                text-decoration: none;
                transition: transform 0.3s, box-shadow 0.3s;
                cursor: pointer;
            }
            .link-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
            }
            .link-card h3 {
                font-size: 1.5em;
                margin-bottom: 10px;
            }
            .link-card p {
                font-size: 0.9em;
                opacity: 0.9;
            }
            .icon {
                font-size: 2em;
                margin-bottom: 10px;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                color: #94a3b8;
                font-size: 0.9em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔧 治具管理系統</h1>
            <p class="subtitle">Fixture Management System v3.0.0</p>
            
            <div class="status">
                <div class="status-item">
                    <span class="status-label">系統狀態</span>
                    <span class="status-value">🟢 運行中</span>
                </div>
                <div class="status-item">
                    <span class="status-label">API 版本</span>
                    <span class="status-value">v2.0.0</span>
                </div>
                <div class="status-item">
                    <span class="status-label">資料庫</span>
                    <span class="status-value">MySQL 8.0+</span>
                </div>
            </div>
            
            <div class="links">
                <a href="/docs" class="link-card">
                    <div class="icon">📚</div>
                    <h3>API 文件</h3>
                    <p>Swagger UI 互動式文件</p>
                </a>
                
                <a href="/redoc" class="link-card">
                    <div class="icon">📖</div>
                    <h3>ReDoc 文件</h3>
                    <p>API 參考文件</p>
                </a>
                
                <a href="/web/index.html_bk" class="link-card">
                    <div class="icon">🌐</div>
                    <h3>前端頁面</h3>
                    <p>系統管理介面</p>
                </a>
            </div>
            
            <div class="footer">
                <p>© 2025 治具管理系統 | 開發團隊</p>
                <p>最後更新: 2025-11-07</p>
            </div>
        </div>
    </body>
    </html>
    """


@app.get("/api", tags=["系統資訊"])
async def api_info():
    """
    API 基本資訊
    """
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "status": "running",
        "database": {
            "host": settings.DB_HOST,
            "port": settings.DATABASE_PORT,
            "name": settings.DATABASE_NAME,
            "connected": db.check_connection()
        },
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        },
        "features": [
            "JWT 認證",
            "治具管理",
            "收退料管理",
            "使用/更換記錄",
            "機種管理",
            "開站數查詢"
        ]
    }


@app.get("/api/health", tags=["系統資訊"])
async def health_check():
    """
    健康檢查端點
    """
    db_status = "healthy" if db.check_connection() else "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "timestamp": time.time(),
        "database": db_status,
        "version": settings.API_VERSION
    }


# ==================== 靜態檔案 ====================

# 掛載前端靜態檔案（如果存在）
web_dir = os.path.join(os.path.dirname(__file__), "web")
if os.path.exists(web_dir):
    app.mount("/web", StaticFiles(directory=web_dir), name="web")
    print(f"✅ 靜態檔案已掛載: {web_dir}")


# ==================== 開發用端點 ====================

@app.get("/api/dev/routes", tags=["開發工具"], include_in_schema=False)
async def list_routes():
    """
    列出所有路由 (開發用)
    """
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name
            })
    return {"total": len(routes), "routes": routes}

@app.middleware("http")
async def debug_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("🔥 捕捉到錯誤:", e)
        raise


# ==================== 主程式入口 ====================

if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 70)
    print("🚀 啟動治具管理系統...")
    print("=" * 70)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 開發模式，自動重載
        log_level="debug"
    )
