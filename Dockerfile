# 治具管理系統 - Docker 映像檔
FROM python:3.9-slim

# 設定工作目錄
WORKDIR /app

# 設定環境變數
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 複製需求檔案
COPY backend/requirements.txt ./backend/

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# 複製整個 backend 目錄
COPY backend/ ./backend/

# 建立上傳目錄
RUN mkdir -p /app/backend/uploads && chmod 755 /app/backend/uploads

# 暴露埠號
EXPOSE 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v2/ || exit 1

# 啟動應用
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]