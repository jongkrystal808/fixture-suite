#!/bin/bash
################################################################################
# Fixture Suite Management System - Rocky Linux 9.7 部署腳本
# 版本: v4.1
# 應用名稱: fixture-suite
# 數據庫: fixture_management
# Python: 3.9
################################################################################

set -e  # 遇到錯誤立即停止

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變量
APP_NAME="fixture-suite"
APP_DIR="/opt/fixture-management-system"
APP_USER="fixture-suite"
SERVICE_NAME="fixture-management"
DB_NAME="fixture_management"
DB_USER="fixture_user"
PYTHON_VERSION="3.9"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# 項目結構變量
PROJECT_ROOT="$(pwd)"
DATABASE_DIR="${PROJECT_ROOT}/database"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

################################################################################
# 輔助函數
################################################################################

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "此腳本必須以 root 權限執行"
        echo "請使用: sudo bash deployment.sh"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/rocky-release ]]; then
        print_error "此腳本僅支援 Rocky Linux"
        exit 1
    fi
    
    local version=$(cat /etc/rocky-release | grep -oP '\d+\.\d+' | head -1)
    if [[ $(echo "$version < 9.0" | bc) -eq 1 ]]; then
        print_error "此腳本需要 Rocky Linux 9.0 或更高版本"
        exit 1
    fi
    
    print_success "作業系統檢查通過: $(cat /etc/rocky-release)"
}

check_selinux() {
    local selinux_status=$(getenforce 2>/dev/null || echo "unknown")
    if [[ "$selinux_status" == "Enforcing" ]]; then
        print_warning "SELinux 當前為 Enforcing 模式"
        read -p "是否將 SELinux 設置為 Permissive? (y/n): " answer
        if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
            setenforce 0
            sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
            print_success "SELinux 已設置為 Permissive"
        fi
    else
        print_success "SELinux 狀態: $selinux_status"
    fi
}

check_firewall() {
    if systemctl is-active --quiet firewalld; then
        print_info "防火牆正在運行，將配置必要的端口..."
        firewall-cmd --permanent --add-port=${BACKEND_PORT}/tcp
        firewall-cmd --permanent --add-port=${FRONTEND_PORT}/tcp
        firewall-cmd --permanent --add-service=mysql
        firewall-cmd --reload
        print_success "防火牆規則已更新"
    else
        print_warning "防火牆未運行"
    fi
}

check_project_structure() {
    print_header "檢查項目結構"
    
    local missing_dirs=()
    
    if [[ ! -d "$DATABASE_DIR" ]]; then
        missing_dirs+=("database")
    else
        print_success "找到 database 目錄"
    fi
    
    if [[ ! -d "$BACKEND_DIR" ]]; then
        missing_dirs+=("backend")
    else
        print_success "找到 backend 目錄"
    fi
    
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_warning "未找到 frontend 目錄（可選）"
    else
        print_success "找到 frontend 目錄"
    fi
    
    # 檢查關鍵文件
    if [[ ! -f "${DATABASE_DIR}/init_database.sql" ]]; then
        print_error "未找到 ${DATABASE_DIR}/init_database.sql"
        missing_dirs+=("init_database.sql")
    else
        print_success "找到 init_database.sql"
    fi
    
    if [[ ! -f "${BACKEND_DIR}/requirements.txt" ]]; then
        print_error "未找到 ${BACKEND_DIR}/requirements.txt"
        missing_dirs+=("requirements.txt")
    else
        print_success "找到 requirements.txt"
    fi
    
    if [[ ${#missing_dirs[@]} -gt 0 ]]; then
        print_error "缺少必要的文件或目錄: ${missing_dirs[*]}"
        print_info "請確保在項目根目錄執行此腳本"
        exit 1
    fi
}

################################################################################
# 安裝步驟
################################################################################

install_base_packages() {
    print_header "步驟 1: 安裝基礎套件"
    
    print_info "更新系統套件..."
    dnf update -y
    
    print_info "安裝 EPEL 倉庫..."
    dnf install -y epel-release
    
    print_info "安裝開發工具..."
    dnf groupinstall -y "Development Tools"
    
    print_info "安裝必要套件..."
    dnf install -y \
        wget \
        curl \
        git \
        vim \
        net-tools \
        firewalld \
        policycoreutils-python-utils \
        bc
    
    print_success "基礎套件安裝完成"
}

install_python() {
    print_header "步驟 2: 安裝 Python ${PYTHON_VERSION}"
    
    if command -v python${PYTHON_VERSION} &> /dev/null; then
        print_success "Python ${PYTHON_VERSION} 已安裝"
        python${PYTHON_VERSION} --version
        return
    fi
    
    print_info "安裝 Python ${PYTHON_VERSION}..."
    dnf install -y python${PYTHON_VERSION} python${PYTHON_VERSION}-devel python${PYTHON_VERSION}-pip
    
    # 更新 pip
    python${PYTHON_VERSION} -m pip install --upgrade pip
    
    print_success "Python ${PYTHON_VERSION} 安裝完成"
    python${PYTHON_VERSION} --version
}

install_mysql() {
    print_header "步驟 3: 安裝 MySQL 8.0"
    
    if command -v mysql &> /dev/null; then
        local mysql_version=$(mysql --version | grep -oP '\d+\.\d+\.\d+' | head -1)
        print_success "MySQL 已安裝 (版本: $mysql_version)"
        
        if systemctl is-active --quiet mysqld; then
            print_success "MySQL 服務正在運行"
            return
        fi
    fi
    
    print_info "安裝 MySQL 8.0 倉庫..."
    dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
    
    # 導入 GPG 密鑰
    rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
    
    print_info "安裝 MySQL Server..."
    dnf install -y mysql-server mysql-devel
    
    print_info "啟動 MySQL 服務..."
    systemctl enable mysqld
    systemctl start mysqld
    
    print_success "MySQL 8.0 安裝完成"
}

configure_mysql() {
    print_header "步驟 4: 配置 MySQL"
    
    # 獲取臨時密碼
    local temp_password=$(grep 'temporary password' /var/log/mysqld.log 2>/dev/null | tail -1 | awk '{print $NF}')
    
    if [[ -z "$temp_password" ]]; then
        print_info "未找到臨時密碼，MySQL 可能已經配置過"
        read -sp "請輸入 MySQL root 密碼: " MYSQL_ROOT_PASSWORD
        echo
    else
        print_info "找到 MySQL 臨時密碼"
        
        # 生成新的隨機密碼
        MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16)
        
        print_info "更改 root 密碼..."
        mysql --connect-expired-password -uroot -p"${temp_password}" <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
        
        echo "${MYSQL_ROOT_PASSWORD}" > /root/.mysql_root_password
        chmod 600 /root/.mysql_root_password
        print_success "Root 密碼已保存到: /root/.mysql_root_password"
    fi
    
    # 創建數據庫和用戶
    print_info "創建數據庫和用戶..."
    
    DB_PASSWORD=$(openssl rand -base64 16)
    
    mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" <<EOF
-- 創建數據庫
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 創建用戶
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';

-- 允許遠程連接（可選）
CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'%';

FLUSH PRIVILEGES;
EOF
    
    echo "${DB_PASSWORD}" > /root/.mysql_app_password
    chmod 600 /root/.mysql_app_password
    
    print_success "數據庫 ${DB_NAME} 創建完成"
    print_success "應用用戶密碼已保存到: /root/.mysql_app_password"
}

import_database() {
    print_header "步驟 5: 導入數據庫結構"
    
    if [[ ! -f "${DATABASE_DIR}/init_database.sql" ]]; then
        print_error "找不到 init_database.sql 文件"
        exit 1
    fi
    
    print_info "導入數據庫結構..."
    mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" ${DB_NAME} < "${DATABASE_DIR}/init_database.sql"
    
    print_success "數據庫結構導入完成"
    
    # 驗證
    print_info "驗證數據庫表..."
    local table_count=$(mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'")
    print_success "已創建 ${table_count} 個數據表"
}

create_app_user() {
    print_header "步驟 6: 創建應用用戶"
    
    if id "${APP_USER}" &>/dev/null; then
        print_success "用戶 ${APP_USER} 已存在"
    else
        useradd -r -m -s /bin/bash ${APP_USER}
        print_success "用戶 ${APP_USER} 創建完成"
    fi
}

setup_application() {
    print_header "步驟 7: 部署應用程序"
    
    # 創建應用目錄
    print_info "創建應用目錄..."
    mkdir -p ${APP_DIR}/{backend,frontend,logs,config}
    
    # 複製後端文件
    print_info "複製後端文件..."
    cp -r ${BACKEND_DIR}/* ${APP_DIR}/backend/
    
    # 複製前端文件（如果存在）
    if [[ -d "$FRONTEND_DIR" ]]; then
        print_info "複製前端文件..."
        cp -r ${FRONTEND_DIR}/* ${APP_DIR}/frontend/
    fi
    
    # 創建虛擬環境
    print_info "創建 Python 虛擬環境..."
    python${PYTHON_VERSION} -m venv ${APP_DIR}/venv
    
    # 安裝依賴
    print_info "安裝 Python 依賴..."
    source ${APP_DIR}/venv/bin/activate
    pip install --upgrade pip
    pip install -r ${APP_DIR}/backend/requirements.txt
    deactivate
    
    # 創建配置文件
    print_info "創建配置文件..."
    cat > ${APP_DIR}/config/.env <<EOF
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=${DB_NAME}
DATABASE_USER=${DB_USER}
DATABASE_PASSWORD=${DB_PASSWORD}

# Application Configuration
APP_NAME=${APP_NAME}
APP_VERSION=v4.1
DEBUG=false
LOG_LEVEL=INFO

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

# Security
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
CORS_ORIGINS=["http://localhost:${FRONTEND_PORT}","http://127.0.0.1:${FRONTEND_PORT}"]
EOF
    
    # 設置權限
    chown -R ${APP_USER}:${APP_USER} ${APP_DIR}
    chmod 600 ${APP_DIR}/config/.env
    
    print_success "應用程序部署完成"
}

install_nodejs() {
    print_header "步驟 8: 安裝 Node.js (可選)"
    
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_warning "跳過 Node.js 安裝（未檢測到前端目錄）"
        return
    fi
    
    if command -v node &> /dev/null; then
        print_success "Node.js 已安裝: $(node --version)"
        return
    fi
    
    print_info "安裝 Node.js 18.x..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    dnf install -y nodejs
    
    print_success "Node.js 安裝完成"
    node --version
    npm --version
}

setup_frontend() {
    print_header "步驟 9: 設置前端應用 (可選)"
    
    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_warning "跳過前端設置（未檢測到前端目錄）"
        return
    fi
    
    print_info "安裝前端依賴..."
    cd ${APP_DIR}/frontend
    sudo -u ${APP_USER} npm install
    
    print_info "構建前端..."
    sudo -u ${APP_USER} npm run build
    
    print_success "前端應用設置完成"
}

create_systemd_service() {
    print_header "步驟 10: 創建 Systemd 服務"
    
    # 後端服務
    print_info "創建後端服務..."
    cat > /etc/systemd/system/${SERVICE_NAME}-backend.service <<EOF
[Unit]
Description=Fixture Management System - Backend API
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/config/.env
ExecStart=${APP_DIR}/venv/bin/uvicorn main:app --host 0.0.0.0 --port ${BACKEND_PORT}
Restart=always
RestartSec=10

# 日誌
StandardOutput=append:${APP_DIR}/logs/backend.log
StandardError=append:${APP_DIR}/logs/backend-error.log

# 安全設置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${APP_DIR}/logs

[Install]
WantedBy=multi-user.target
EOF
    
    # 前端服務（如果需要）
    if [[ -d "${APP_DIR}/frontend" ]]; then
        print_info "創建前端服務..."
        cat > /etc/systemd/system/${SERVICE_NAME}-frontend.service <<EOF
[Unit]
Description=Fixture Management System - Frontend
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/frontend
ExecStart=/usr/bin/npm start -- --port ${FRONTEND_PORT}
Restart=always
RestartSec=10

StandardOutput=append:${APP_DIR}/logs/frontend.log
StandardError=append:${APP_DIR}/logs/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF
    fi
    
    # 重載 systemd
    systemctl daemon-reload
    
    print_success "Systemd 服務創建完成"
}

start_services() {
    print_header "步驟 11: 啟動服務"
    
    print_info "啟動後端服務..."
    systemctl enable ${SERVICE_NAME}-backend
    systemctl start ${SERVICE_NAME}-backend
    
    sleep 3
    
    if systemctl is-active --quiet ${SERVICE_NAME}-backend; then
        print_success "後端服務已啟動"
    else
        print_error "後端服務啟動失敗"
        journalctl -u ${SERVICE_NAME}-backend -n 50
    fi
    
    if [[ -f "/etc/systemd/system/${SERVICE_NAME}-frontend.service" ]]; then
        print_info "啟動前端服務..."
        systemctl enable ${SERVICE_NAME}-frontend
        systemctl start ${SERVICE_NAME}-frontend
        
        sleep 3
        
        if systemctl is-active --quiet ${SERVICE_NAME}-frontend; then
            print_success "前端服務已啟動"
        else
            print_error "前端服務啟動失敗"
            journalctl -u ${SERVICE_NAME}-frontend -n 50
        fi
    fi
}

create_management_scripts() {
    print_header "步驟 12: 創建管理腳本"
    
    # 狀態檢查腳本
    cat > ${APP_DIR}/status.sh <<'EOF'
#!/bin/bash
echo "=== Fixture Management System 狀態 ==="
echo
echo "後端服務:"
systemctl status fixture-management-backend --no-pager -l
echo
echo "前端服務:"
systemctl status fixture-management-frontend --no-pager -l 2>/dev/null || echo "前端服務未配置"
echo
echo "數據庫連接:"
mysql -u fixture_user -p$(cat /root/.mysql_app_password) -e "SELECT 'MySQL Connection OK' as Status;"
EOF
    
    # 日誌查看腳本
    cat > ${APP_DIR}/logs.sh <<'EOF'
#!/bin/bash
echo "最近的後端日誌:"
tail -50 /opt/fixture-management-system/logs/backend.log
echo
echo "最近的錯誤日誌:"
tail -50 /opt/fixture-management-system/logs/backend-error.log
EOF
    
    # 重啟腳本
    cat > ${APP_DIR}/restart.sh <<'EOF'
#!/bin/bash
echo "重啟所有服務..."
systemctl restart fixture-management-backend
systemctl restart fixture-management-frontend 2>/dev/null
echo "完成！"
EOF
    
    chmod +x ${APP_DIR}/*.sh
    
    print_success "管理腳本創建完成"
}

print_summary() {
    print_header "部署完成！"
    
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║         治具管理系統 - 部署成功！                           ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    echo "📋 系統信息:"
    echo "   應用名稱: ${APP_NAME}"
    echo "   安裝目錄: ${APP_DIR}"
    echo "   應用用戶: ${APP_USER}"
    echo
    echo "🔐 數據庫信息:"
    echo "   數據庫名: ${DB_NAME}"
    echo "   用戶名: ${DB_USER}"
    echo "   Root 密碼: /root/.mysql_root_password"
    echo "   應用密碼: /root/.mysql_app_password"
    echo
    echo "🌐 訪問地址:"
    echo "   後端 API: http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}"
    echo "   API 文檔: http://$(hostname -I | awk '{print $1}'):${BACKEND_PORT}/docs"
    if [[ -f "/etc/systemd/system/${SERVICE_NAME}-frontend.service" ]]; then
        echo "   前端應用: http://$(hostname -I | awk '{print $1}'):${FRONTEND_PORT}"
    fi
    echo
    echo "🛠️  管理命令:"
    echo "   查看狀態: ${APP_DIR}/status.sh"
    echo "   查看日誌: ${APP_DIR}/logs.sh"
    echo "   重啟服務: ${APP_DIR}/restart.sh"
    echo
    echo "   或使用 systemctl:"
    echo "   systemctl status ${SERVICE_NAME}-backend"
    echo "   systemctl restart ${SERVICE_NAME}-backend"
    echo "   journalctl -u ${SERVICE_NAME}-backend -f"
    echo
    echo "📁 重要文件位置:"
    echo "   配置文件: ${APP_DIR}/config/.env"
    echo "   日誌目錄: ${APP_DIR}/logs/"
    echo "   後端代碼: ${APP_DIR}/backend/"
    if [[ -d "${APP_DIR}/frontend" ]]; then
        echo "   前端代碼: ${APP_DIR}/frontend/"
    fi
    echo
    echo -e "${YELLOW}⚠️  安全提醒:${NC}"
    echo "   1. 請妥善保管數據庫密碼文件"
    echo "   2. 建議修改防火牆規則限制訪問"
    echo "   3. 生產環境建議啟用 HTTPS"
    echo "   4. 定期備份數據庫"
    echo
}

################################################################################
# 主函數
################################################################################

main() {
    clear
    echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           治具管理系統 - Rocky Linux 9.7 部署工具           ║
║                     Fixture Suite v4.1                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    # 預檢查
    check_root
    check_os
    check_selinux
    check_project_structure
    
    echo
    read -p "是否繼續部署？(y/n): " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "部署已取消"
        exit 0
    fi
    
    # 執行安裝步驟
    install_base_packages
    install_python
    install_mysql
    configure_mysql
    import_database
    create_app_user
    setup_application
    install_nodejs
    setup_frontend
    create_systemd_service
    check_firewall
    start_services
    create_management_scripts
    
    # 顯示摘要
    print_summary
    
    echo -e "${GREEN}✓ 部署完成！${NC}"
    echo
}

# 執行主函數
main "$@"
