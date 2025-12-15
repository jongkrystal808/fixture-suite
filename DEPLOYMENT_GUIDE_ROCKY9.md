# FastAPI 治具管理系統部署指南
## 部署到 Rocky Linux 9.7

> 完整的生產環境部署流程，包含系統配置、安全加固、監控和備份

---

## 📑 目錄

- [系統需求](#系統需求)
- [部署架構](#部署架構)
- [準備工作](#準備工作)
- [安裝步驟](#安裝步驟)
- [應用部署](#應用部署)
- [反向代理配置](#反向代理配置)
- [系統服務配置](#系統服務配置)
- [安全加固](#安全加固)
- [監控與日誌](#監控與日誌)
- [備份策略](#備份策略)
- [故障排除](#故障排除)

---

## 🖥 系統需求

### 硬體需求

| 項目 | 最低需求 | 建議配置 | 說明 |
|------|----------|----------|------|
| **CPU** | 2 Core | 4 Core | 處理併發請求 |
| **記憶體** | 2 GB | 4-8 GB | MySQL + App |
| **硬碟** | 20 GB | 50 GB+ | 系統 + 資料庫 + 日誌 |
| **網路** | 100 Mbps | 1 Gbps | 內網使用 |

### 軟體需求

```
作業系統: Rocky Linux 9.7 (x86_64)
Python: 3.11+
MySQL: 8.0+
Nginx: 1.20+
```

---

## 🏗 部署架構

### 生產環境架構圖

```
                          Internet
                              │
                              │ HTTPS (443)
                              │
                    ┌─────────▼──────────┐
                    │   Firewall (UFW)   │
                    │   Port: 80, 443    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Nginx (反向代理)  │
                    │   Port: 80/443     │
                    │   - SSL 終止        │
                    │   - 靜態檔案服務    │
                    │   - 負載均衡        │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Gunicorn         │
                    │   + Uvicorn        │
                    │   Workers (4)      │
                    │   Port: 8000       │
                    │                    │
                    │   FastAPI App      │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │   MySQL 8.0        │
                    │   Port: 3306       │
                    │   (localhost only) │
                    └────────────────────┘

所有組件運行在同一台伺服器上
使用 systemd 管理服務
```

---

## 🚀 準備工作

### 1. 更新系統

```bash
# 更新系統套件
sudo dnf update -y

# 安裝基本工具
sudo dnf install -y \
    wget \
    curl \
    vim \
    git \
    unzip \
    net-tools \
    htop
```

### 2. 配置防火牆

```bash
# 安裝 firewalld（Rocky Linux 預設）
sudo dnf install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# 開放必要端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=mysql  # 如果需要遠程訪問
sudo firewall-cmd --reload

# 檢查防火牆狀態
sudo firewall-cmd --list-all
```

### 3. 設定 SELinux（可選，建議先設為 permissive）

```bash
# 檢查 SELinux 狀態
getenforce

# 臨時設為 permissive
sudo setenforce 0

# 永久設定（編輯配置檔）
sudo vim /etc/selinux/config
# 修改: SELINUX=permissive

# 或保持 enforcing 並配置相應政策（較複雜）
```

### 4. 創建應用使用者

```bash
# 創建專用使用者（不使用 root）
sudo useradd -m -s /bin/bash fixture
sudo passwd fixture

# 加入 wheel 群組（允許 sudo）
sudo usermod -aG wheel fixture

# 切換到應用使用者
su - fixture
```

---

## 📦 安裝步驟

### 步驟 1: 安裝 Python 3.11+

```bash
# Rocky Linux 9.7 預設 Python 3.9，需升級到 3.11
sudo dnf install -y python3.11 python3.11-pip python3.11-devel

# 設定預設 Python 版本
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
sudo alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip3.11 1

# 驗證版本
python3 --version  # Python 3.11.x
pip3 --version
```

### 步驟 2: 安裝 MySQL 8.0

```bash
# 下載 MySQL Yum Repository
sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm

# 安裝 MySQL Server
sudo dnf install -y mysql-server mysql-devel

# 啟動 MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 獲取臨時 root 密碼
sudo grep 'temporary password' /var/log/mysqld.log

# 執行安全設定（重要！）
sudo mysql_secure_installation

# 按提示操作：
# 1. 輸入臨時密碼
# 2. 設定新的 root 密碼（必須符合複雜度要求）
# 3. 移除匿名使用者: Y
# 4. 禁止 root 遠程登入: Y（建議）
# 5. 移除 test 資料庫: Y
# 6. 重新載入權限表: Y
```

### 步驟 3: 配置 MySQL

```bash
# 登入 MySQL
mysql -u root -p

# 創建資料庫和使用者
CREATE DATABASE fixture_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER 'fixture_user'@'localhost' IDENTIFIED BY 'Strong@Pass123';
GRANT ALL PRIVILEGES ON fixture_management.* TO 'fixture_user'@'localhost';
FLUSH PRIVILEGES;

# 驗證
SHOW DATABASES;
SELECT user, host FROM mysql.user;
EXIT;
```

### 步驟 4: 匯入資料庫結構

```bash
# 將 init_database_v4.1.sql 上傳到伺服器
# 方式 1: 使用 scp
scp database/init_database_v4.1.sql fixture@your-server:/home/fixture/

# 方式 2: 使用 git clone
cd /home/fixture
git clone https://your-repo.git fixture-app
cd fixture-app

# 匯入資料庫
mysql -u fixture_user -p fixture_management < database/init_database_v4.1.sql

# 驗證匯入
mysql -u fixture_user -p
USE fixture_management;
SHOW TABLES;  # 應該看到 18 個表
EXIT;
```

### 步驟 5: 安裝 Nginx

```bash
# 安裝 Nginx
sudo dnf install -y nginx

# 啟動並設定開機自啟
sudo systemctl start nginx
sudo systemctl enable nginx

# 驗證
curl http://localhost
```

---

## 🔧 應用部署

### 步驟 1: 準備應用目錄

```bash
# 創建目錄結構
sudo mkdir -p /opt/fixture-app
sudo chown -R fixture:fixture /opt/fixture-app

# 切換到應用使用者
su - fixture
cd /opt/fixture-app

# 上傳或 clone 專案
# 方式 1: 使用 git
git clone https://your-repo.git .

# 方式 2: 使用 scp 上傳打包檔案
# 在本地打包: tar -czf fixture-app.tar.gz backend/ web/ database/
# scp fixture-app.tar.gz fixture@your-server:/opt/fixture-app/
# tar -xzf fixture-app.tar.gz
```

### 步驟 2: 設定 Python 虛擬環境

```bash
cd /opt/fixture-app

# 創建虛擬環境
python3 -m venv venv

# 啟動虛擬環境
source venv/bin/activate

# 升級 pip
pip install --upgrade pip

# 安裝依賴
pip install -r requirements.txt

# 如果沒有 requirements.txt，手動安裝：
pip install \
    fastapi==0.104.1 \
    uvicorn[standard]==0.24.0 \
    pydantic==2.5.0 \
    python-jose[cryptography]==3.3.0 \
    passlib[bcrypt]==1.7.4 \
    python-multipart==0.0.6 \
    pymysql==1.1.0 \
    cryptography==41.0.7 \
    openpyxl==3.1.2 \
    gunicorn==21.2.0
```

### 步驟 3: 配置應用

```bash
# 創建配置檔（如果還沒有）
vim /opt/fixture-app/backend/config.py
```

```python
# config.py 內容
import os

# 資料庫配置
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "fixture_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Strong@Pass123")
DB_NAME = os.getenv("DB_NAME", "fixture_management")

# JWT 配置
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 小時

# 應用配置
APP_HOST = "0.0.0.0"
APP_PORT = 8000
APP_WORKERS = 4  # CPU 核心數

# 上傳配置
UPLOAD_DIR = "/opt/fixture-app/backend/uploads"
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB

# CORS 配置
ALLOWED_ORIGINS = [
    "http://localhost",
    "http://localhost:8000",
    "http://your-domain.com",
    "https://your-domain.com",
]
```

### 步驟 4: 創建環境變數檔

```bash
# 創建 .env 檔案（生產環境）
vim /opt/fixture-app/.env
```

```bash
# .env 內容
DB_HOST=localhost
DB_PORT=3306
DB_USER=fixture_user
DB_PASSWORD=Strong@Pass123
DB_NAME=fixture_management

SECRET_KEY=your-super-secret-key-change-this-now-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 環境標識
ENVIRONMENT=production
```

```bash
# 設定檔案權限（重要！）
chmod 600 /opt/fixture-app/.env
```

### 步驟 5: 測試應用

```bash
# 啟動虛擬環境
cd /opt/fixture-app
source venv/bin/activate

# 直接測試 Uvicorn
cd backend
python main.py

# 或使用 uvicorn 命令
uvicorn main:app --host 0.0.0.0 --port 8000

# 另開終端測試
curl http://localhost:8000/api/health
# 應該返回: {"status": "ok"}

# 測試完成後 Ctrl+C 停止
```

---

## 🔄 反向代理配置

### Nginx 配置

```bash
# 創建 Nginx 配置檔
sudo vim /etc/nginx/conf.d/fixture-app.conf
```

```nginx
# /etc/nginx/conf.d/fixture-app.conf

# Upstream 定義（Gunicorn）
upstream fixture_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

# HTTP Server（重定向到 HTTPS）
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向所有 HTTP 到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 證書配置（如果有）
    # ssl_certificate /etc/nginx/ssl/cert.pem;
    # ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # 臨時自簽證書（測試用）
    ssl_certificate /etc/nginx/ssl/self-signed.crt;
    ssl_certificate_key /etc/nginx/ssl/self-signed.key;
    
    # SSL 優化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # 日誌
    access_log /var/log/nginx/fixture-app-access.log;
    error_log /var/log/nginx/fixture-app-error.log;
    
    # 最大上傳大小
    client_max_body_size 10M;
    
    # 根目錄
    root /opt/fixture-app/web;
    index index.html;
    
    # 靜態檔案（前端）
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    # CSS 和 JS 緩存
    location ~* \.(css|js)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # 圖片和字體緩存
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理到 FastAPI
    location /api/ {
        proxy_pass http://fixture_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支援（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超時設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 緩衝設定
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    # 上傳檔案路徑
    location /uploads/ {
        alias /opt/fixture-app/backend/uploads/;
        expires 7d;
        add_header Cache-Control "private";
    }
    
    # 健康檢查
    location /health {
        proxy_pass http://fixture_backend;
        access_log off;
    }
}
```

### 創建自簽 SSL 證書（測試用）

```bash
# 創建 SSL 目錄
sudo mkdir -p /etc/nginx/ssl

# 生成自簽證書
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/self-signed.key \
    -out /etc/nginx/ssl/self-signed.crt \
    -subj "/C=TW/ST=Taiwan/L=Taipei/O=Company/CN=your-domain.com"

# 設定權限
sudo chmod 600 /etc/nginx/ssl/self-signed.key
sudo chmod 644 /etc/nginx/ssl/self-signed.crt
```

### 測試和重啟 Nginx

```bash
# 測試配置
sudo nginx -t

# 重啟 Nginx
sudo systemctl restart nginx

# 檢查狀態
sudo systemctl status nginx
```

---

## ⚙️ 系統服務配置

### 創建 Systemd 服務

```bash
# 創建服務檔案
sudo vim /etc/systemd/system/fixture-app.service
```

```ini
[Unit]
Description=Fixture Management FastAPI Application
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=notify
User=fixture
Group=fixture
WorkingDirectory=/opt/fixture-app/backend
Environment="PATH=/opt/fixture-app/venv/bin"
EnvironmentFile=/opt/fixture-app/.env

# 使用 Gunicorn + Uvicorn Workers
ExecStart=/opt/fixture-app/venv/bin/gunicorn \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    --access-logfile /var/log/fixture-app/access.log \
    --error-logfile /var/log/fixture-app/error.log \
    --log-level info \
    main:app

# 自動重啟
Restart=always
RestartSec=10

# 資源限制
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
```

### 創建日誌目錄

```bash
# 創建日誌目錄
sudo mkdir -p /var/log/fixture-app
sudo chown -R fixture:fixture /var/log/fixture-app

# 創建上傳目錄
sudo mkdir -p /opt/fixture-app/backend/uploads
sudo chown -R fixture:fixture /opt/fixture-app/backend/uploads
```

### 啟動服務

```bash
# 重新載入 systemd
sudo systemctl daemon-reload

# 啟動服務
sudo systemctl start fixture-app

# 設定開機自啟
sudo systemctl enable fixture-app

# 檢查狀態
sudo systemctl status fixture-app

# 查看日誌
sudo journalctl -u fixture-app -f

# 查看應用日誌
sudo tail -f /var/log/fixture-app/error.log
sudo tail -f /var/log/fixture-app/access.log
```

---

## 🔒 安全加固

### 1. 防火牆配置

```bash
# 只開放必要端口
sudo firewall-cmd --permanent --remove-service=mysql  # 不允許外部訪問
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 檢查
sudo firewall-cmd --list-all
```

### 2. 設定檔案權限

```bash
# 限制敏感檔案權限
chmod 600 /opt/fixture-app/.env
chmod 600 /opt/fixture-app/backend/config.py

# 設定目錄權限
sudo chown -R fixture:fixture /opt/fixture-app
sudo chmod -R 755 /opt/fixture-app

# 上傳目錄權限
sudo chmod 775 /opt/fixture-app/backend/uploads
```

### 3. MySQL 安全設定

```bash
# 編輯 MySQL 配置
sudo vim /etc/my.cnf.d/mysql-server.cnf
```

```ini
[mysqld]
# 只監聽本地
bind-address = 127.0.0.1

# 禁用 LOAD DATA LOCAL INFILE
local-infile = 0

# 日誌設定
log-error = /var/log/mysql/error.log
slow-query-log = 1
slow-query-log-file = /var/log/mysql/slow-query.log
long_query_time = 2

# 連接設定
max_connections = 200
max_connect_errors = 100

# 字元集
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
```

```bash
# 重啟 MySQL
sudo systemctl restart mysqld
```

### 4. Fail2Ban 防暴力破解（可選）

```bash
# 安裝 Fail2Ban
sudo dnf install -y epel-release
sudo dnf install -y fail2ban

# 創建配置
sudo vim /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/secure

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# 啟動 Fail2Ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

---

## 📊 監控與日誌

### 1. 日誌輪替配置

```bash
# 創建 logrotate 配置
sudo vim /etc/logrotate.d/fixture-app
```

```
/var/log/fixture-app/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 fixture fixture
    sharedscripts
    postrotate
        systemctl reload fixture-app > /dev/null 2>&1 || true
    endscript
}
```

### 2. 系統監控腳本

```bash
# 創建監控腳本
vim /home/fixture/monitor.sh
```

```bash
#!/bin/bash
# 監控腳本

LOG_FILE="/var/log/fixture-app/monitor.log"

# 檢查服務狀態
check_service() {
    if ! systemctl is-active --quiet fixture-app; then
        echo "[$(date)] ERROR: Fixture App service is down!" >> $LOG_FILE
        # 可以發送郵件或通知
        systemctl restart fixture-app
    fi
}

# 檢查磁碟空間
check_disk() {
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 80 ]; then
        echo "[$(date)] WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
    fi
}

# 檢查 MySQL
check_mysql() {
    if ! systemctl is-active --quiet mysqld; then
        echo "[$(date)] ERROR: MySQL service is down!" >> $LOG_FILE
        systemctl restart mysqld
    fi
}

# 執行檢查
check_service
check_disk
check_mysql

echo "[$(date)] Monitor check completed" >> $LOG_FILE
```

```bash
# 設定權限
chmod +x /home/fixture/monitor.sh

# 加入 crontab（每 5 分鐘檢查一次）
crontab -e
# 加入:
*/5 * * * * /home/fixture/monitor.sh
```

### 3. 性能監控

```bash
# 安裝 htop
sudo dnf install -y htop

# 查看系統資源
htop

# 查看連接數
ss -tunap | grep :8000

# 查看 Nginx 狀態
curl http://localhost/health
```

---

## 💾 備份策略

### 1. 資料庫備份腳本

```bash
# 創建備份腳本
vim /home/fixture/backup-database.sh
```

```bash
#!/bin/bash
# 資料庫備份腳本

BACKUP_DIR="/home/fixture/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fixture_management_${DATE}.sql.gz"

DB_USER="fixture_user"
DB_PASS="Strong@Pass123"
DB_NAME="fixture_management"

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 備份資料庫
mysqldump -u $DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    $DB_NAME | gzip > $BACKUP_DIR/$BACKUP_FILE

# 檢查備份是否成功
if [ $? -eq 0 ]; then
    echo "[$(date)] Database backup successful: $BACKUP_FILE"
    
    # 刪除 7 天前的備份
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
else
    echo "[$(date)] Database backup failed!"
    exit 1
fi
```

```bash
# 設定權限
chmod 700 /home/fixture/backup-database.sh

# 加入 crontab（每天凌晨 2 點備份）
crontab -e
# 加入:
0 2 * * * /home/fixture/backup-database.sh >> /var/log/fixture-app/backup.log 2>&1
```

### 2. 應用備份腳本

```bash
# 創建應用備份腳本
vim /home/fixture/backup-app.sh
```

```bash
#!/bin/bash
# 應用程式備份腳本

BACKUP_DIR="/home/fixture/backups/app"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fixture-app_${DATE}.tar.gz"

APP_DIR="/opt/fixture-app"

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 備份應用（排除虛擬環境和臨時檔案）
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='uploads/*' \
    -C /opt fixture-app

if [ $? -eq 0 ]; then
    echo "[$(date)] Application backup successful: $BACKUP_FILE"
    
    # 刪除 30 天前的備份
    find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
else
    echo "[$(date)] Application backup failed!"
    exit 1
fi
```

```bash
# 設定權限並加入 crontab
chmod 700 /home/fixture/backup-app.sh

# 每週日凌晨 3 點備份
crontab -e
# 加入:
0 3 * * 0 /home/fixture/backup-app.sh >> /var/log/fixture-app/backup.log 2>&1
```

### 3. 備份還原流程

```bash
# 還原資料庫
gunzip < backup_file.sql.gz | mysql -u fixture_user -p fixture_management

# 還原應用
sudo systemctl stop fixture-app
cd /opt
sudo tar -xzf /home/fixture/backups/app/backup_file.tar.gz
sudo chown -R fixture:fixture /opt/fixture-app
sudo systemctl start fixture-app
```

---

## 🔧 故障排除

### 常見問題

#### 1. 服務無法啟動

```bash
# 檢查服務狀態
sudo systemctl status fixture-app

# 查看詳細日誌
sudo journalctl -u fixture-app -n 100 --no-pager

# 檢查權限
ls -la /opt/fixture-app
ls -la /opt/fixture-app/.env

# 手動測試
cd /opt/fixture-app
source venv/bin/activate
cd backend
python main.py
```

#### 2. 資料庫連接失敗

```bash
# 檢查 MySQL 狀態
sudo systemctl status mysqld

# 測試連接
mysql -u fixture_user -p fixture_management

# 檢查防火牆
sudo firewall-cmd --list-all

# 檢查 MySQL 日誌
sudo tail -f /var/log/mysql/error.log
```

#### 3. Nginx 502 錯誤

```bash
# 檢查後端是否運行
sudo systemctl status fixture-app
curl http://localhost:8000/api/health

# 檢查 Nginx 配置
sudo nginx -t

# 查看 Nginx 錯誤日誌
sudo tail -f /var/log/nginx/error.log

# 檢查連接
ss -tunap | grep :8000
```

#### 4. 權限錯誤

```bash
# 重設權限
sudo chown -R fixture:fixture /opt/fixture-app
sudo chmod -R 755 /opt/fixture-app
sudo chmod 600 /opt/fixture-app/.env

# 檢查 SELinux（如果啟用）
sudo ausearch -m avc -ts recent
sudo sealert -a /var/log/audit/audit.log
```

#### 5. 性能問題

```bash
# 檢查系統資源
htop
free -h
df -h

# 檢查 MySQL 慢查詢
sudo mysql -u root -p
SHOW PROCESSLIST;
SHOW VARIABLES LIKE 'slow_query%';

# 調整 Gunicorn Workers
# 編輯: /etc/systemd/system/fixture-app.service
# 修改 --workers 數量（通常為 CPU 核心數 * 2 + 1）
```

### 日誌位置

```bash
# 應用日誌
/var/log/fixture-app/access.log
/var/log/fixture-app/error.log

# Systemd 日誌
sudo journalctl -u fixture-app -f

# Nginx 日誌
/var/log/nginx/fixture-app-access.log
/var/log/nginx/fixture-app-error.log

# MySQL 日誌
/var/log/mysql/error.log
/var/log/mysql/slow-query.log
```

---

## 📝 部署檢查清單

### 部署前

- [ ] 系統更新完成
- [ ] 防火牆配置正確
- [ ] MySQL 安裝並安全設定
- [ ] Python 3.11+ 安裝
- [ ] Nginx 安裝
- [ ] 應用使用者創建

### 部署中

- [ ] 應用程式碼上傳
- [ ] 虛擬環境建立並安裝依賴
- [ ] 資料庫初始化
- [ ] 配置檔設定（.env）
- [ ] Nginx 配置完成
- [ ] Systemd 服務創建
- [ ] SSL 證書配置（如果需要）

### 部署後

- [ ] 服務正常啟動
- [ ] API 端點測試通過
- [ ] 前端頁面可正常訪問
- [ ] 資料庫連接正常
- [ ] 日誌輪替配置
- [ ] 備份腳本設定
- [ ] 監控腳本運行
- [ ] 文檔更新

---

## 🚀 快速部署命令集

```bash
# 完整部署命令（依序執行）

# 1. 系統準備
sudo dnf update -y
sudo dnf install -y python3.11 python3.11-pip mysql-server nginx git

# 2. 服務啟動
sudo systemctl start mysqld nginx
sudo systemctl enable mysqld nginx

# 3. MySQL 設定
sudo mysql_secure_installation
mysql -u root -p <<EOF
CREATE DATABASE fixture_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fixture_user'@'localhost' IDENTIFIED BY 'Strong@Pass123';
GRANT ALL PRIVILEGES ON fixture_management.* TO 'fixture_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# 4. 應用部署
sudo mkdir -p /opt/fixture-app
sudo chown -R fixture:fixture /opt/fixture-app
cd /opt/fixture-app
git clone https://your-repo.git .
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. 資料庫匯入
mysql -u fixture_user -p fixture_management < database/init_database_v4.1.sql

# 6. 配置服務
sudo cp fixture-app.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start fixture-app
sudo systemctl enable fixture-app

# 7. 配置 Nginx
sudo cp fixture-app.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl restart nginx

# 8. 驗證
curl http://localhost/api/health
```

---

## 📚 參考資源

- [FastAPI 官方文檔](https://fastapi.tiangolo.com/)
- [Gunicorn 部署指南](https://docs.gunicorn.org/)
- [Nginx 配置參考](https://nginx.org/en/docs/)
- [Rocky Linux 文檔](https://docs.rockylinux.org/)
- [MySQL 8.0 參考手冊](https://dev.mysql.com/doc/refman/8.0/en/)

---

**文檔版本:** 1.0  
**最後更新:** 2025-12-15  
**適用系統:** Rocky Linux 9.7  
**維護者:** Development Team
