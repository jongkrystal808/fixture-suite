"""
配置管理模組
負責載入環境變數和系統配置
"""
import os
from typing import Optional
from pathlib import Path


class Settings:
    """系統配置類別"""

    def __init__(self):
        """初始化配置,從環境變數讀取"""

        # 資料庫配置
        self.DB_HOST: str = os.getenv("DB_HOST", "localhost")
        self.DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
        self.DB_NAME: str = os.getenv("DB_NAME", "fixture_management")
        self.DB_USER: str = os.getenv("DB_USER", "root")
        # 支援兩種環境變數名稱
        self.DB_PASS: str = os.getenv("DB_PASSWORD") or os.getenv("DB_PASS", "Chch1014")

        # API 配置
        self.API_TITLE: str = "治具管理系統 API"
        self.API_VERSION: str = "2.0.0"
        self.API_DESCRIPTION: str = "治具生命週期管理系統的後端 API"

        # CORS 配置
        self.CORS_ORIGINS: list = ["*"]  # 生產環境應改為具體域名

        # JWT 配置
        self.SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
        self.ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
        self.ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

        # 檔案上傳配置
        upload_dir = os.getenv("UPLOAD_DIR")
        if upload_dir:
            self.UPLOAD_DIR: Path = Path(upload_dir)
        else:
            self.UPLOAD_DIR: Path = Path(__file__).parent.parent / "uploads"

        self.MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

        # 分頁配置
        self.DEFAULT_PAGE_SIZE: int = 10
        self.MAX_PAGE_SIZE: int = 100

        # 資料庫連接配置
        self.DB_POOL_SIZE: int = 5
        self.DB_MAX_OVERFLOW: int = 10
        self.DB_POOL_TIMEOUT: int = 30
        self.DB_POOL_RECYCLE: int = 3600

        # 重試配置
        self.DB_RETRY_TIMES: int = int(os.getenv("DB_RETRY_TIMES", "10"))
        self.DB_RETRY_DELAY: float = float(os.getenv("DB_RETRY_DELAY", "2.0"))

        # 環境設定
        self.ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

        # 確保上傳目錄存在
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Debug 輸出(可選)
        if self.ENVIRONMENT == "development":
            print(f"🔧 配置載入:")
            print(f"   DB_HOST: {self.DB_HOST}")
            print(f"   DB_PORT: {self.DB_PORT}")
            print(f"   DB_NAME: {self.DB_NAME}")
            print(f"   DB_USER: {self.DB_USER}")
            print(f"   UPLOAD_DIR: {self.UPLOAD_DIR}")

    @property
    def DATABASE_URL(self) -> str:
        """獲取資料庫連接 URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASS}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"


def load_env_file(env_path: str = ".env"):
    """
    載入 .env 檔案 (僅用於本地開發)

    Args:
        env_path: .env 檔案路徑
    """
    # Docker 環境中不需要載入 .env
    if os.getenv("ENVIRONMENT") in ["test", "production", "docker"]:
        print("🐳 Docker 環境,跳過 .env 載入")
        return

    env_file = Path(__file__).parent / env_path

    if not env_file.exists():
        print(f"⚠️  警告: 找不到 {env_path} 檔案")
        return

    print(f"📄 從 {env_file} 載入環境變數")

    with open(env_file, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                try:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    # 只在環境變數不存在時設定
                    if key not in os.environ:
                        os.environ[key] = value
                except ValueError:
                    continue

    print(f"✅ 已載入環境變數從 {env_path}")


# 先載入 .env (如果不是 Docker 環境)
load_env_file()

# 建立全域配置實例
settings = Settings()