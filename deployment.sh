#!/bin/bash

##############################################################################
# 治具管理系統 - Rocky Linux 9.7 部署腳本 (使用現有 MySQL)
# 版本: v4.1
# 用途: 部署 fixture-suite 應用程序到已配置 MySQL 的 Rocky Linux 9.7
##############################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

# 打印函數
print_header() {
    echo -e "\n${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

##############################################################################
# 配置變數
##############################################################################
APP_NAME="fixture-suite"
DB_NAME="fixture_management"
INSTALL_DIR="/opt/fixture-suite"
APP_USER="fixture-suite"
PYTHON_VERSION="3.9"

# 當前目錄（項目源碼目錄）
SOURCE_DIR=$(pwd)

##############################################################################
# 檢查權限
##############################################################################
if [ "$EUID" -ne 0 ]; then
    print_error "請使用 root 權限執行此腳本"
    echo "使用方式: sudo $0"
    exit 1
fi

print_header "治具管理系統部署開始"
print_info "應用名稱: $APP_NAME"
print_info "數據庫名稱: $DB_NAME"
print_info "安裝目錄: $INSTALL_DIR"
print_info "系統用戶: $APP_USER"

##############################################################################
# 步驟 1: 檢查項目結構
##############################################################################
print_header "步驟 1: 檢查項目結構"

if [ ! -d "$SOURCE_DIR/database" ]; then
    print_error "未找到 database 目錄"
    exit 1
fi
print_success "找到 database 目錄"

if [ ! -f "$SOURCE_DIR/database/init_database.sql" ]; then
    print_error "未找到 database/init_database.sql"
    exit 1
fi
print_success "找到 init_database.sql"

if [ ! -d "$SOURCE_DIR/backend" ]; then
    print_error "未找到 backend 目錄"
    exit 1
fi
print_success "找到 backend 目錄"

if [ ! -f "$SOURCE_DIR/backend/requirements.txt" ]; then
    print_error "未找到 backend/requirements.txt"
    exit 1
fi
print_success "找到 requirements.txt"

if [ ! -f "$SOURCE_DIR/backend/main.py" ]; then
    print_error "未找到 backend/main.py"
    exit 1
fi
print_success "找到 main.py"

##############################################################################
# 步驟 2: 安裝系統依賴
##############################################################################
print_header "步驟 2: 安裝系統依賴"

print_info "更新系統套件..."
dnf update -y &> /dev/null
print_success "系統套件已更新"

print_info "安裝基礎工具..."
dnf install -y epel-release wget curl vim git bc &> /dev/null
print_success "基礎工具已安裝"

##############################################################################
# 步驟 3: 檢查 Python
##############################################################################
print_header "步驟 3: 檢查 Python"

if command -v python3.9 &> /dev/null; then
    INSTALLED_VERSION=$(python3.9 --version 2>&1 | awk '{print $2}')
    print_success "Python 已安裝: Python $INSTALLED_VERSION"
else
    print_info "安裝 Python 3.9..."
    dnf install -y python3.9 python3.9-pip python3.9-devel &> /dev/null
    print_success "Python 3.9 安裝完成"
fi

##############################################################################
# 步驟 4: 檢查 MySQL
##############################################################################
print_header "步驟 4: 檢查 MySQL"

if systemctl is-active --quiet mysqld; then
    MYSQL_VERSION=$(mysql --version | awk '{print $5}' | sed 's/,//')
    print_success "MySQL 已安裝並運行 (版本: $MYSQL_VERSION)"
else
    print_error "MySQL 服務未運行"
    exit 1
fi

##############################################################################
# 步驟 5: 配置數據庫 (使用現有用戶)
##############################################################################
print_header "步驟 5: 配置數據庫"

print_info "請輸入 MySQL 用戶資訊"
echo -n "MySQL 用戶名 [dnpi]: "
read MYSQL_USER
MYSQL_USER=${MYSQL_USER:-dnpi}

echo -n "MySQL 主機名 [stringer]: "
read MYSQL_HOST
MYSQL_HOST=${MYSQL_HOST:-stringer}

echo -n "MySQL 密碼: "
read -s MYSQL_PASSWORD
echo

# 測試連接
print_info "測試 MySQL 連接..."
if mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    print_success "MySQL 連接成功"
else
    print_error "無法連接到 MySQL，請檢查用戶名、主機名和密碼"
    exit 1
fi

# 檢查數據庫是否存在
DB_EXISTS=$(mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
    -e "SHOW DATABASES LIKE '$DB_NAME';" 2>/dev/null | grep -c "$DB_NAME" || true)

if [ "$DB_EXISTS" -gt 0 ]; then
    print_warning "數據庫 '$DB_NAME' 已存在"
    echo -n "是否要重新初始化數據庫？這將刪除所有現有數據！ (yes/no) [no]: "
    read REINIT_DB

    if [ "$REINIT_DB" = "yes" ]; then
        print_info "備份現有數據庫..."
        BACKUP_FILE="/tmp/${DB_NAME}_backup_$(date +%Y%m%d_%H%M%S).sql"
        mysqldump -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
            "$DB_NAME" > "$BACKUP_FILE" 2>/dev/null
        print_success "備份已保存到: $BACKUP_FILE"

        print_info "刪除現有數據庫..."
        mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
            -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
        print_success "數據庫已刪除"

        print_info "創建新數據庫..."
        mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
            -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
        print_success "數據庫 '$DB_NAME' 已創建"

        print_info "初始化數據庫結構..."
        mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
            "$DB_NAME" < "$SOURCE_DIR/database/init_database.sql" 2>/dev/null
        print_success "數據庫初始化完成"
    else
        print_info "保留現有數據庫"
    fi
else
    print_info "創建數據庫..."
    mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
        -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    print_success "數據庫 '$DB_NAME' 已創建"

    print_info "初始化數據庫結構..."
    mysql -u "$MYSQL_USER" -h "$MYSQL_HOST" -p"$MYSQL_PASSWORD" \
        "$DB_NAME" < "$SOURCE_DIR/database/init_database.sql" 2>/dev/null
    print_success "數據庫初始化完成"
fi

##############################################################################
# 步驟 6: 創建系統用戶
##############################################################################
print_header "步驟 6: 創建系統用戶"

if id "$APP_USER" &>/dev/null; then
    print_warning "用戶 '$APP_USER' 已存在"
else
    print_info "創建系統用戶 '$APP_USER'..."
    useradd -r -m -s /bin/bash -d "$INSTALL_DIR" "$APP_USER"
    print_success "用戶已創建"
fi

##############################################################################
# 步驟 7: 部署應用程序
##############################################################################
print_header "步驟 7: 部署應用程序"

print_info "創建安裝目錄..."
mkdir -p "$INSTALL_DIR"
print_success "目錄已創建: $INSTALL_DIR"

print_info "複製應用程序文件..."
# 複製 backend 目錄
rsync -av --exclude='__pycache__' --exclude='*.pyc' \
    "$SOURCE_DIR/backend/" "$INSTALL_DIR/backend/" &> /dev/null
print_success "後端文件已複製"

# 複製數據庫文件（用於參考）
mkdir -p "$INSTALL_DIR/database"
cp "$SOURCE_DIR/database/init_database.sql" "$INSTALL_DIR/database/"
print_success "數據庫文件已複製"

# 如果有前端，也複製
if [ -d "$SOURCE_DIR/frontend" ]; then
    rsync -av --exclude='node_modules' \
        "$SOURCE_DIR/frontend/" "$INSTALL_DIR/frontend/" &> /dev/null
    print_success "前端文件已複製"
fi

##############################################################################
# 步驟 8: 創建 Python 虛擬環境
##############################################################################
print_header "步驟 8: 創建 Python 虛擬環境"

print_info "創建虛擬環境..."
python3.9 -m venv "$INSTALL_DIR/venv"
print_success "虛擬環境已創建"

print_info "升級 pip..."
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip &> /dev/null
print_success "pip 已升級"

print_info "安裝 Python 依賴套件..."
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/backend/requirements.txt" &> /dev/null
print_success "依賴套件已安裝"

##############################################################################
# 步驟 9: 創建配置文件
##############################################################################
print_header "步驟 9: 創建配置文件"

print_info "創建 .env 配置文件..."
cat > "$INSTALL_DIR/backend/.env" << EOF
# Database Configuration
DB_HOST=$MYSQL_HOST
DB_PORT=3306
DB_USER=$MYSQL_USER
DB_PASSWORD=$MYSQL_PASSWORD
DB_NAME=$DB_NAME

# Application Configuration
APP_NAME=$APP_NAME
APP_VERSION=4.1
DEBUG=false
LOG_LEVEL=INFO

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# CORS Configuration
ALLOWED_ORIGINS=*

# Session Configuration
SECRET_KEY=$(openssl rand -hex 32)
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

chmod 600 "$INSTALL_DIR/backend/.env"
print_success "配置文件已創建"

##############################################################################
# 步驟 10: 設置文件權限
##############################################################################
print_header "步驟 10: 設置文件權限"

print_info "設置目錄權限..."
chown -R "$APP_USER:$APP_USER" "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR"
chmod 600 "$INSTALL_DIR/backend/.env"
print_success "權限設置完成"

##############################################################################
# 步驟 11: 創建日誌目錄
##############################################################################
print_header "步驟 11: 創建日誌目錄"

print_info "創建日誌目錄..."
mkdir -p /var/log/$APP_NAME
chown -R "$APP_USER:$APP_USER" /var/log/$APP_NAME
chmod 755 /var/log/$APP_NAME
print_success "日誌目錄已創建: /var/log/$APP_NAME"

##############################################################################
# 步驟 12: 創建 systemd 服務
##############################################################################
print_header "步驟 12: 創建 systemd 服務"

print_info "創建後端服務..."
cat > /etc/systemd/system/${APP_NAME}-backend.service << EOF
[Unit]
Description=Fixture Suite Backend API Service
After=network.target mysqld.service
Wants=mysqld.service

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="PATH=$INSTALL_DIR/venv/bin"
EnvironmentFile=$INSTALL_DIR/backend/.env
ExecStart=$INSTALL_DIR/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=10
StandardOutput=append:/var/log/$APP_NAME/backend.log
StandardError=append:/var/log/$APP_NAME/backend-error.log

# 安全設置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/$APP_NAME $INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOF

print_success "後端服務文件已創建"

##############################################################################
# 步驟 13: 配置防火牆
##############################################################################
print_header "步驟 13: 配置防火牆"

if systemctl is-active --quiet firewalld; then
    print_info "配置防火牆規則..."
    firewall-cmd --permanent --add-port=8000/tcp &> /dev/null
    firewall-cmd --reload &> /dev/null
    print_success "防火牆規則已添加 (端口 8000)"
else
    print_warning "防火牆未運行，跳過配置"
fi

##############################################################################
# 步驟 14: 啟動服務
##############################################################################
print_header "步驟 14: 啟動服務"

print_info "重新加載 systemd..."
systemctl daemon-reload
print_success "systemd 已重新加載"

print_info "啟用並啟動後端服務..."
systemctl enable ${APP_NAME}-backend.service &> /dev/null
systemctl start ${APP_NAME}-backend.service
sleep 3

if systemctl is-active --quiet ${APP_NAME}-backend.service; then
    print_success "後端服務已啟動"
else
    print_error "後端服務啟動失敗"
    print_info "查看日誌: journalctl -u ${APP_NAME}-backend.service -n 50"
    exit 1
fi

##############################################################################
# 步驟 15: 創建管理腳本
##############################################################################
print_header "步驟 15: 創建管理腳本"

print_info "創建狀態檢查腳本..."
cat > "$INSTALL_DIR/status.sh" << 'EOF'
#!/bin/bash
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  治具管理系統 - 服務狀態"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
echo "後端服務狀態:"
systemctl status fixture-suite-backend.service --no-pager | head -n 10
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "最近日誌:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -n 20 /var/log/fixture-suite/backend.log
EOF

chmod +x "$INSTALL_DIR/status.sh"
print_success "狀態腳本已創建"

##############################################################################
# 完成
##############################################################################
print_header "部署完成！"

echo
print_success "應用程序已成功部署"
echo
print_info "安裝信息:"
echo "  • 安裝目錄: $INSTALL_DIR"
echo "  • 配置文件: $INSTALL_DIR/backend/.env"
echo "  • 日誌目錄: /var/log/$APP_NAME"
echo "  • 系統用戶: $APP_USER"
echo
print_info "數據庫信息:"
echo "  • 數據庫名: $DB_NAME"
echo "  • 主機: $MYSQL_HOST"
echo "  • 用戶: $MYSQL_USER"
echo
print_info "服務信息:"
echo "  • 後端 API: http://$(hostname -I | awk '{print $1}'):8000"
echo "  • API 文檔: http://$(hostname -I | awk '{print $1}'):8000/docs"
echo
print_info "管理命令:"
echo "  • 查看狀態: $INSTALL_DIR/status.sh"
echo "  • 重啟服務: sudo systemctl restart ${APP_NAME}-backend"
echo "  • 查看日誌: sudo journalctl -u ${APP_NAME}-backend -f"
echo "  • 停止服務: sudo systemctl stop ${APP_NAME}-backend"
echo
print_success "部署成功完成！"