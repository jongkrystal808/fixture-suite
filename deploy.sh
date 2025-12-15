#!/bin/bash
#
# FastAPI 治具管理系統 - 一鍵部署腳本
# 適用於 Rocky Linux 9.7
#
# 使用方式: sudo bash deploy.sh
#

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置變數
APP_NAME="fixture-app"
APP_USER="fixture"
APP_DIR="/opt/${APP_NAME}"
DB_NAME="fixture_management"
DB_USER="fixture_user"
DB_PASS="Strong@Pass123"  # 請在生產環境中修改此密碼
DOMAIN="your-domain.com"  # 請修改為您的域名

# 日誌函數
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查是否為 root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "請使用 sudo 執行此腳本"
        exit 1
    fi
}

# 檢查系統版本
check_system() {
    log_info "檢查系統版本..."
    
    if [ -f /etc/rocky-release ]; then
        VERSION=$(cat /etc/rocky-release)
        log_info "系統版本: $VERSION"
        
        if [[ ! $VERSION =~ "Rocky Linux release 9" ]]; then
            log_warn "此腳本專為 Rocky Linux 9.x 設計，您的版本可能不相容"
            read -p "是否繼續？(y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    else
        log_error "無法檢測到 Rocky Linux 系統"
        exit 1
    fi
}

# 更新系統
update_system() {
    log_info "更新系統套件..."
    dnf update -y
    dnf install -y wget curl vim git unzip net-tools htop
}

# 配置防火牆
setup_firewall() {
    log_info "配置防火牆..."
    
    systemctl start firewalld
    systemctl enable firewalld
    
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    
    log_info "防火牆配置完成"
}

# 安裝 Python 3.11
install_python() {
    log_info "安裝 Python 3.11..."
    
    dnf install -y python3.11 python3.11-pip python3.11-devel
    
    alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
    alternatives --install /usr/bin/pip3 pip3 /usr/bin/pip3.11 1
    
    PYTHON_VERSION=$(python3 --version)
    log_info "Python 版本: $PYTHON_VERSION"
}

# 安裝 MySQL
install_mysql() {
    log_info "安裝 MySQL 8.0..."
    
    # 檢查是否已安裝
    if systemctl is-active --quiet mysqld; then
        log_warn "MySQL 已經在運行"
        return
    fi
    
    # 安裝 MySQL Repository
    dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
    
    # 安裝 MySQL Server
    dnf install -y mysql-server mysql-devel
    
    # 啟動 MySQL
    systemctl start mysqld
    systemctl enable mysqld
    
    # 獲取臨時密碼
    TEMP_PASS=$(grep 'temporary password' /var/log/mysqld.log | awk '{print $NF}')
    
    if [ -n "$TEMP_PASS" ]; then
        log_info "MySQL 臨時密碼: $TEMP_PASS"
        log_warn "請執行: mysql_secure_installation 進行安全設定"
    fi
}

# 配置 MySQL 資料庫
setup_database() {
    log_info "配置資料庫..."
    
    # 檢查 MySQL 是否運行
    if ! systemctl is-active --quiet mysqld; then
        log_error "MySQL 未運行"
        exit 1
    fi
    
    read -sp "請輸入 MySQL root 密碼: " MYSQL_ROOT_PASS
    echo
    
    # 創建資料庫和使用者
    mysql -u root -p"$MYSQL_ROOT_PASS" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    if [ $? -eq 0 ]; then
        log_info "資料庫配置完成"
    else
        log_error "資料庫配置失敗"
        exit 1
    fi
}

# 安裝 Nginx
install_nginx() {
    log_info "安裝 Nginx..."
    
    dnf install -y nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_info "Nginx 安裝完成"
}

# 創建應用使用者
create_app_user() {
    log_info "創建應用使用者..."
    
    if id "$APP_USER" &>/dev/null; then
        log_warn "使用者 $APP_USER 已存在"
    else
        useradd -m -s /bin/bash "$APP_USER"
        log_info "使用者 $APP_USER 創建完成"
    fi
}

# 部署應用
deploy_application() {
    log_info "部署應用程式..."
    
    # 創建應用目錄
    mkdir -p "$APP_DIR"
    
    # 檢查是否需要 clone 或上傳
    if [ ! -f "$APP_DIR/backend/main.py" ]; then
        log_warn "未檢測到應用程式碼"
        read -p "請輸入 Git Repository URL (或按 Enter 跳過): " GIT_URL
        
        if [ -n "$GIT_URL" ]; then
            git clone "$GIT_URL" "$APP_DIR"
        else
            log_warn "請手動上傳應用程式碼到 $APP_DIR"
            log_warn "上傳完成後，請重新執行此腳本"
            exit 0
        fi
    fi
    
    # 設定權限
    chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    
    # 創建虛擬環境
    log_info "創建 Python 虛擬環境..."
    su - "$APP_USER" -c "cd $APP_DIR && python3 -m venv venv"
    
    # 安裝依賴
    log_info "安裝 Python 依賴..."
    su - "$APP_USER" -c "cd $APP_DIR && source venv/bin/activate && pip install --upgrade pip"
    
    if [ -f "$APP_DIR/requirements.txt" ]; then
        su - "$APP_USER" -c "cd $APP_DIR && source venv/bin/activate && pip install -r requirements.txt"
    else
        log_warn "未找到 requirements.txt，安裝基本依賴..."
        su - "$APP_USER" -c "cd $APP_DIR && source venv/bin/activate && pip install \
            fastapi==0.104.1 \
            uvicorn[standard]==0.24.0 \
            pydantic==2.5.0 \
            python-jose[cryptography]==3.3.0 \
            passlib[bcrypt]==1.7.4 \
            python-multipart==0.0.6 \
            pymysql==1.1.0 \
            cryptography==41.0.7 \
            openpyxl==3.1.2 \
            gunicorn==21.2.0"
    fi
}

# 創建環境變數檔
create_env_file() {
    log_info "創建環境變數檔..."
    
    cat > "$APP_DIR/.env" <<EOF
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}

# JWT 配置
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# 環境標識
ENVIRONMENT=production
EOF
    
    chmod 600 "$APP_DIR/.env"
    chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
    
    log_info "環境變數檔創建完成"
}

# 匯入資料庫結構
import_database() {
    log_info "匯入資料庫結構..."
    
    DB_INIT_FILE="$APP_DIR/database/init_database_v4.1.sql"
    
    if [ ! -f "$DB_INIT_FILE" ]; then
        log_warn "未找到資料庫初始化檔案: $DB_INIT_FILE"
        return
    fi
    
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$DB_INIT_FILE"
    
    if [ $? -eq 0 ]; then
        log_info "資料庫結構匯入完成"
    else
        log_error "資料庫結構匯入失敗"
    fi
}

# 配置 Systemd 服務
setup_systemd_service() {
    log_info "配置 Systemd 服務..."
    
    # 創建日誌目錄
    mkdir -p /var/log/${APP_NAME}
    chown -R "$APP_USER:$APP_USER" /var/log/${APP_NAME}
    
    # 創建上傳目錄
    mkdir -p "$APP_DIR/backend/uploads"
    chown -R "$APP_USER:$APP_USER" "$APP_DIR/backend/uploads"
    
    # 創建服務檔案
    cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=Fixture Management FastAPI Application
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=notify
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
Environment="PATH=${APP_DIR}/venv/bin"
EnvironmentFile=${APP_DIR}/.env

ExecStart=${APP_DIR}/venv/bin/gunicorn \\
    --workers 4 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:8000 \\
    --timeout 120 \\
    --access-logfile /var/log/${APP_NAME}/access.log \\
    --error-logfile /var/log/${APP_NAME}/error.log \\
    --log-level info \\
    main:app

Restart=always
RestartSec=10
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新載入並啟動服務
    systemctl daemon-reload
    systemctl start ${APP_NAME}
    systemctl enable ${APP_NAME}
    
    # 檢查服務狀態
    sleep 3
    if systemctl is-active --quiet ${APP_NAME}; then
        log_info "應用服務啟動成功"
    else
        log_error "應用服務啟動失敗"
        systemctl status ${APP_NAME}
    fi
}

# 配置 Nginx
setup_nginx() {
    log_info "配置 Nginx..."
    
    # 創建自簽 SSL 證書
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/self-signed.key \
        -out /etc/nginx/ssl/self-signed.crt \
        -subj "/C=TW/ST=Taiwan/L=Taipei/O=Company/CN=${DOMAIN}" 2>/dev/null
    
    chmod 600 /etc/nginx/ssl/self-signed.key
    chmod 644 /etc/nginx/ssl/self-signed.crt
    
    # 創建 Nginx 配置
    cat > /etc/nginx/conf.d/${APP_NAME}.conf <<'EOF'
upstream fixture_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate /etc/nginx/ssl/self-signed.crt;
    ssl_certificate_key /etc/nginx/ssl/self-signed.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    access_log /var/log/nginx/fixture-app-access.log;
    error_log /var/log/nginx/fixture-app-error.log;
    
    client_max_body_size 10M;
    
    root /opt/fixture-app/web;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
    
    location ~* \.(css|js)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /api/ {
        proxy_pass http://fixture_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
        proxy_request_buffering off;
    }
    
    location /uploads/ {
        alias /opt/fixture-app/backend/uploads/;
        expires 7d;
        add_header Cache-Control "private";
    }
    
    location /health {
        proxy_pass http://fixture_backend;
        access_log off;
    }
}
EOF
    
    # 測試並重啟 Nginx
    nginx -t
    
    if [ $? -eq 0 ]; then
        systemctl restart nginx
        log_info "Nginx 配置完成"
    else
        log_error "Nginx 配置測試失敗"
    fi
}

# 設定備份腳本
setup_backup() {
    log_info "設定備份腳本..."
    
    # 創建備份目錄
    mkdir -p /home/${APP_USER}/backups/{database,app}
    chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}/backups
    
    # 資料庫備份腳本
    cat > /home/${APP_USER}/backup-database.sh <<'SCRIPT'
#!/bin/bash
BACKUP_DIR="/home/fixture/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="fixture_management_${DATE}.sql.gz"

DB_USER="fixture_user"
DB_PASS="Strong@Pass123"
DB_NAME="fixture_management"

mkdir -p $BACKUP_DIR

mysqldump -u $DB_USER -p$DB_PASS \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    $DB_NAME | gzip > $BACKUP_DIR/$BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "[$(date)] Database backup successful: $BACKUP_FILE"
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
else
    echo "[$(date)] Database backup failed!"
    exit 1
fi
SCRIPT
    
    chmod 700 /home/${APP_USER}/backup-database.sh
    chown ${APP_USER}:${APP_USER} /home/${APP_USER}/backup-database.sh
    
    log_info "備份腳本創建完成"
    log_warn "請手動設定 crontab: crontab -e -u ${APP_USER}"
    log_warn "加入: 0 2 * * * /home/${APP_USER}/backup-database.sh"
}

# 最終檢查
final_check() {
    log_info "執行最終檢查..."
    
    echo ""
    echo "========================================="
    echo "服務狀態檢查"
    echo "========================================="
    
    # 檢查 MySQL
    if systemctl is-active --quiet mysqld; then
        log_info "MySQL: 運行中 ✓"
    else
        log_error "MySQL: 未運行 ✗"
    fi
    
    # 檢查應用
    if systemctl is-active --quiet ${APP_NAME}; then
        log_info "應用服務: 運行中 ✓"
    else
        log_error "應用服務: 未運行 ✗"
    fi
    
    # 檢查 Nginx
    if systemctl is-active --quiet nginx; then
        log_info "Nginx: 運行中 ✓"
    else
        log_error "Nginx: 未運行 ✗"
    fi
    
    # 測試 API
    echo ""
    log_info "測試 API 端點..."
    
    sleep 2
    API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health)
    
    if [ "$API_RESPONSE" -eq 200 ]; then
        log_info "API 端點: 正常 ✓"
    else
        log_error "API 端點: 異常 (HTTP $API_RESPONSE) ✗"
    fi
    
    echo ""
    echo "========================================="
    echo "部署完成！"
    echo "========================================="
    echo ""
    echo "應用資訊:"
    echo "  - 應用目錄: $APP_DIR"
    echo "  - 資料庫名稱: $DB_NAME"
    echo "  - 資料庫使用者: $DB_USER"
    echo ""
    echo "訪問資訊:"
    echo "  - HTTP:  http://$(hostname -I | awk '{print $1}')"
    echo "  - HTTPS: https://$(hostname -I | awk '{print $1}')"
    echo ""
    echo "管理命令:"
    echo "  - 查看服務狀態: systemctl status ${APP_NAME}"
    echo "  - 查看日誌: journalctl -u ${APP_NAME} -f"
    echo "  - 重啟服務: systemctl restart ${APP_NAME}"
    echo ""
    echo "注意事項:"
    echo "  1. 請修改預設密碼: $APP_DIR/.env"
    echo "  2. 如使用真實域名，請配置 Let's Encrypt SSL"
    echo "  3. 請設定定期備份: crontab -e -u ${APP_USER}"
    echo ""
}

# 主函數
main() {
    echo ""
    echo "========================================="
    echo "FastAPI 治具管理系統 - 自動部署腳本"
    echo "Rocky Linux 9.7"
    echo "========================================="
    echo ""
    
    check_root
    check_system
    
    log_warn "此腳本將安裝並配置以下組件:"
    echo "  - Python 3.11"
    echo "  - MySQL 8.0"
    echo "  - Nginx"
    echo "  - FastAPI 應用"
    echo ""
    
    read -p "確定要繼續嗎？(y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "部署已取消"
        exit 0
    fi
    
    update_system
    setup_firewall
    install_python
    install_mysql
    setup_database
    install_nginx
    create_app_user
    deploy_application
    create_env_file
    import_database
    setup_systemd_service
    setup_nginx
    setup_backup
    final_check
}

# 執行主函數
main
