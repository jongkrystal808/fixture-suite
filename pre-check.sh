#!/bin/bash
################################################################################
# 治具管理系統 - 部署前檢查腳本
# 用途: 在執行部署前檢查系統環境和項目結構
################################################################################

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 計數器
PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS_COUNT++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN_COUNT++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL_COUNT++))
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           治具管理系統 - 部署前環境檢查                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

# 1. 檢查執行權限
print_header "1. 權限檢查"
if [[ $EUID -eq 0 ]]; then
    check_pass "正在以 root 權限執行"
else
    check_fail "需要 root 權限執行此腳本"
    check_info "請使用: sudo bash pre-check.sh"
fi

# 2. 檢查作業系統
print_header "2. 作業系統檢查"
if [[ -f /etc/rocky-release ]]; then
    OS_VERSION=$(cat /etc/rocky-release)
    check_pass "作業系統: $OS_VERSION"
    
    VERSION_NUM=$(echo "$OS_VERSION" | grep -oP '\d+\.\d+' | head -1)
    if [[ $(echo "$VERSION_NUM >= 9.0" | bc) -eq 1 ]]; then
        check_pass "版本符合要求 (>= 9.0)"
    else
        check_fail "版本過低，需要 Rocky Linux 9.0 或更高版本"
    fi
else
    check_fail "不是 Rocky Linux 系統"
fi

# 3. 檢查 SELinux
print_header "3. SELinux 檢查"
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    if [[ "$SELINUX_STATUS" == "Disabled" ]] || [[ "$SELINUX_STATUS" == "Permissive" ]]; then
        check_pass "SELinux 狀態: $SELINUX_STATUS"
    else
        check_warn "SELinux 狀態: $SELINUX_STATUS (建議設置為 Disabled 或 Permissive)"
        check_info "可執行: sudo setenforce 0"
    fi
else
    check_warn "無法檢測 SELinux 狀態"
fi

# 4. 檢查網絡連接
print_header "4. 網絡連接檢查"
if ping -c 1 8.8.8.8 &> /dev/null; then
    check_pass "網絡連接正常"
else
    check_fail "無法連接到網絡"
fi

if ping -c 1 mirror.rockylinux.org &> /dev/null; then
    check_pass "可以訪問 Rocky Linux 倉庫"
else
    check_warn "無法訪問 Rocky Linux 倉庫，可能影響套件安裝"
fi

# 5. 檢查磁盤空間
print_header "5. 磁盤空間檢查"
ROOT_AVAILABLE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [[ $ROOT_AVAILABLE -ge 10 ]]; then
    check_pass "根分區可用空間: ${ROOT_AVAILABLE}GB (足夠)"
elif [[ $ROOT_AVAILABLE -ge 5 ]]; then
    check_warn "根分區可用空間: ${ROOT_AVAILABLE}GB (建議至少 10GB)"
else
    check_fail "根分區可用空間: ${ROOT_AVAILABLE}GB (不足，需要至少 5GB)"
fi

# 6. 檢查記憶體
print_header "6. 記憶體檢查"
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
if [[ $TOTAL_MEM -ge 4 ]]; then
    check_pass "總記憶體: ${TOTAL_MEM}GB (足夠)"
elif [[ $TOTAL_MEM -ge 2 ]]; then
    check_warn "總記憶體: ${TOTAL_MEM}GB (建議至少 4GB)"
else
    check_fail "總記憶體: ${TOTAL_MEM}GB (不足，建議至少 2GB)"
fi

# 7. 檢查 CPU
print_header "7. CPU 檢查"
CPU_CORES=$(nproc)
if [[ $CPU_CORES -ge 4 ]]; then
    check_pass "CPU 核心數: $CPU_CORES (足夠)"
elif [[ $CPU_CORES -ge 2 ]]; then
    check_warn "CPU 核心數: $CPU_CORES (建議至少 4 核)"
else
    check_warn "CPU 核心數: $CPU_CORES (建議至少 2 核)"
fi

# 8. 檢查項目結構
print_header "8. 項目結構檢查"
PROJECT_ROOT="$(pwd)"
check_info "當前目錄: $PROJECT_ROOT"

# 檢查 database 目錄
if [[ -d "$PROJECT_ROOT/database" ]]; then
    check_pass "找到 database 目錄"
    
    if [[ -f "$PROJECT_ROOT/database/init_database.sql" ]]; then
        check_pass "找到 init_database.sql"
        SQL_SIZE=$(ls -lh "$PROJECT_ROOT/database/init_database.sql" | awk '{print $5}')
        check_info "文件大小: $SQL_SIZE"
    else
        check_fail "缺少 database/init_database.sql"
    fi
else
    check_fail "缺少 database 目錄"
fi

# 檢查 backend 目錄
if [[ -d "$PROJECT_ROOT/backend" ]]; then
    check_pass "找到 backend 目錄"
    
    if [[ -f "$PROJECT_ROOT/backend/requirements.txt" ]]; then
        check_pass "找到 requirements.txt"
        REQ_COUNT=$(grep -c '^[^#]' "$PROJECT_ROOT/backend/requirements.txt" 2>/dev/null || echo "0")
        check_info "依賴套件數: $REQ_COUNT"
    else
        check_fail "缺少 backend/requirements.txt"
    fi
    
    if [[ -f "$PROJECT_ROOT/backend/main.py" ]]; then
        check_pass "找到 main.py"
    else
        check_warn "未找到 backend/main.py (可能使用不同的啟動文件)"
    fi
else
    check_fail "缺少 backend 目錄"
fi

# 檢查 frontend 目錄
if [[ -d "$PROJECT_ROOT/frontend" ]]; then
    check_pass "找到 frontend 目錄"
    
    if [[ -f "$PROJECT_ROOT/frontend/package.json" ]]; then
        check_pass "找到 package.json"
    else
        check_warn "未找到 frontend/package.json"
    fi
else
    check_warn "未找到 frontend 目錄 (可選)"
fi

# 9. 檢查端口占用
print_header "9. 端口檢查"
for port in 8000 3000 3306; do
    if ss -tlnp | grep -q ":${port} "; then
        check_warn "端口 $port 已被占用"
        PROCESS=$(ss -tlnp | grep ":${port} " | awk '{print $6}')
        check_info "占用進程: $PROCESS"
    else
        check_pass "端口 $port 可用"
    fi
done

# 10. 檢查已安裝的軟件
print_header "10. 已安裝軟件檢查"

# Python
if command -v python3.9 &> /dev/null; then
    check_pass "Python 3.9 已安裝: $(python3.9 --version)"
else
    check_info "Python 3.9 未安裝 (將在部署時安裝)"
fi

# MySQL
if command -v mysql &> /dev/null; then
    MYSQL_VERSION=$(mysql --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    check_pass "MySQL 已安裝: $MYSQL_VERSION"
    
    if systemctl is-active --quiet mysqld; then
        check_pass "MySQL 服務正在運行"
    else
        check_warn "MySQL 服務未運行"
    fi
else
    check_info "MySQL 未安裝 (將在部署時安裝)"
fi

# Node.js
if command -v node &> /dev/null; then
    check_pass "Node.js 已安裝: $(node --version)"
else
    check_info "Node.js 未安裝 (如有前端將在部署時安裝)"
fi

# 11. 檢查防火牆
print_header "11. 防火牆檢查"
if systemctl is-active --quiet firewalld; then
    check_pass "防火牆正在運行"
    check_info "部署時將自動配置防火牆規則"
else
    check_warn "防火牆未運行"
fi

# 12. 檢查現有安裝
print_header "12. 現有安裝檢查"
if [[ -d "/opt/fixture-management-system" ]]; then
    check_warn "檢測到現有安裝: /opt/fixture-management-system"
    check_info "部署將覆蓋現有文件，建議先備份"
else
    check_pass "未檢測到現有安裝"
fi

if id "fixture-suite" &>/dev/null; then
    check_warn "用戶 fixture-suite 已存在"
else
    check_pass "用戶 fixture-suite 不存在"
fi

if systemctl list-unit-files | grep -q "fixture-management"; then
    check_warn "檢測到現有服務配置"
else
    check_pass "未檢測到現有服務"
fi

# 總結
print_header "檢查總結"
echo -e "${GREEN}通過: ${PASS_COUNT}${NC}"
echo -e "${YELLOW}警告: ${WARN_COUNT}${NC}"
echo -e "${RED}失敗: ${FAIL_COUNT}${NC}"
echo

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ 系統環境檢查通過！可以繼續部署。${NC}"
    echo
    echo "下一步："
    echo "  sudo ./deployment.sh"
    exit 0
elif [[ $FAIL_COUNT -le 2 ]]; then
    echo -e "${YELLOW}⚠ 發現一些問題，但可能不影響部署。${NC}"
    echo "  建議修復上述失敗項後再執行部署。"
    echo
    echo "如果確定要繼續："
    echo "  sudo ./deployment.sh"
    exit 1
else
    echo -e "${RED}✗ 發現多個嚴重問題，不建議繼續部署。${NC}"
    echo "  請先修復上述失敗項。"
    exit 2
fi
