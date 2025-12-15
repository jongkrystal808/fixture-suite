#!/bin/bash
#
# 治具管理系統 - 管理工具腳本
# 提供常用的管理命令
#

APP_NAME="fixture-app"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_menu() {
    clear
    echo "========================================="
    echo " 治具管理系統 - 管理工具"
    echo "========================================="
    echo ""
    echo "1) 查看服務狀態"
    echo "2) 啟動服務"
    echo "3) 停止服務"
    echo "4) 重啟服務"
    echo "5) 查看實時日誌"
    echo "6) 查看錯誤日誌"
    echo "7) 備份資料庫"
    echo "8) 還原資料庫"
    echo "9) 更新應用"
    echo "10) 查看系統資源"
    echo "11) 測試 API"
    echo "12) 清理日誌"
    echo "0) 退出"
    echo ""
    echo -n "請選擇操作 [0-12]: "
}

# 1. 查看服務狀態
check_status() {
    echo -e "${BLUE}=== 服務狀態 ===${NC}"
    echo ""
    
    # 檢查應用
    echo -e "${YELLOW}應用服務:${NC}"
    systemctl status ${APP_NAME} --no-pager | head -15
    echo ""
    
    # 檢查 MySQL
    echo -e "${YELLOW}MySQL 服務:${NC}"
    systemctl status mysqld --no-pager | head -10
    echo ""
    
    # 檢查 Nginx
    echo -e "${YELLOW}Nginx 服務:${NC}"
    systemctl status nginx --no-pager | head -10
    echo ""
    
    # 檢查端口
    echo -e "${YELLOW}端口監聽:${NC}"
    ss -tlnp | grep -E ':(80|443|3306|8000)\s'
    echo ""
}

# 2. 啟動服務
start_service() {
    echo -e "${BLUE}=== 啟動服務 ===${NC}"
    
    sudo systemctl start ${APP_NAME}
    sudo systemctl start nginx
    
    sleep 2
    
    if systemctl is-active --quiet ${APP_NAME}; then
        echo -e "${GREEN}✓ 服務啟動成功${NC}"
    else
        echo -e "${RED}✗ 服務啟動失敗${NC}"
        echo "查看日誌: journalctl -u ${APP_NAME} -n 50"
    fi
}

# 3. 停止服務
stop_service() {
    echo -e "${BLUE}=== 停止服務 ===${NC}"
    
    sudo systemctl stop ${APP_NAME}
    
    echo -e "${GREEN}✓ 服務已停止${NC}"
}

# 4. 重啟服務
restart_service() {
    echo -e "${BLUE}=== 重啟服務 ===${NC}"
    
    sudo systemctl restart ${APP_NAME}
    sudo systemctl restart nginx
    
    sleep 3
    
    if systemctl is-active --quiet ${APP_NAME}; then
        echo -e "${GREEN}✓ 服務重啟成功${NC}"
    else
        echo -e "${RED}✗ 服務重啟失敗${NC}"
    fi
}

# 5. 查看實時日誌
view_logs() {
    echo -e "${BLUE}=== 實時日誌 (按 Ctrl+C 退出) ===${NC}"
    echo ""
    
    sudo journalctl -u ${APP_NAME} -f
}

# 6. 查看錯誤日誌
view_error_logs() {
    echo -e "${BLUE}=== 最近 50 條錯誤日誌 ===${NC}"
    echo ""
    
    sudo journalctl -u ${APP_NAME} -n 50 --no-pager | grep -i error
    
    echo ""
    echo -e "${YELLOW}應用錯誤日誌:${NC}"
    sudo tail -50 /var/log/${APP_NAME}/error.log
}

# 7. 備份資料庫
backup_database() {
    echo -e "${BLUE}=== 備份資料庫 ===${NC}"
    
    BACKUP_DIR="/home/fixture/backups/database"
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="fixture_management_${DATE}.sql.gz"
    
    echo "備份位置: $BACKUP_DIR/$BACKUP_FILE"
    echo ""
    
    read -sp "請輸入資料庫密碼: " DB_PASS
    echo ""
    
    mkdir -p $BACKUP_DIR
    
    mysqldump -u fixture_user -p$DB_PASS \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        fixture_management | gzip > $BACKUP_DIR/$BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 備份成功: $BACKUP_FILE${NC}"
        ls -lh $BACKUP_DIR/$BACKUP_FILE
    else
        echo -e "${RED}✗ 備份失敗${NC}"
    fi
}

# 8. 還原資料庫
restore_database() {
    echo -e "${BLUE}=== 還原資料庫 ===${NC}"
    echo ""
    
    BACKUP_DIR="/home/fixture/backups/database"
    
    if [ ! -d "$BACKUP_DIR" ]; then
        echo -e "${RED}✗ 備份目錄不存在${NC}"
        return
    fi
    
    echo "可用的備份檔案:"
    ls -lh $BACKUP_DIR/*.sql.gz 2>/dev/null
    echo ""
    
    read -p "請輸入備份檔案名稱: " BACKUP_FILE
    
    if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        echo -e "${RED}✗ 檔案不存在${NC}"
        return
    fi
    
    echo -e "${RED}警告: 這將覆蓋現有資料！${NC}"
    read -p "確定要繼續嗎？(yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        echo "已取消"
        return
    fi
    
    read -sp "請輸入資料庫密碼: " DB_PASS
    echo ""
    
    gunzip < $BACKUP_DIR/$BACKUP_FILE | mysql -u fixture_user -p$DB_PASS fixture_management
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ 還原成功${NC}"
    else
        echo -e "${RED}✗ 還原失敗${NC}"
    fi
}

# 9. 更新應用
update_application() {
    echo -e "${BLUE}=== 更新應用 ===${NC}"
    echo ""
    
    APP_DIR="/opt/${APP_NAME}"
    
    echo "1. 停止服務..."
    sudo systemctl stop ${APP_NAME}
    
    echo "2. 備份當前版本..."
    BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
    sudo tar -czf /tmp/fixture-app-backup-${BACKUP_DATE}.tar.gz \
        -C /opt ${APP_NAME} \
        --exclude=venv \
        --exclude=__pycache__
    
    echo "3. 拉取最新代碼..."
    cd $APP_DIR
    
    if [ -d ".git" ]; then
        sudo -u fixture git pull
    else
        echo -e "${YELLOW}不是 Git 倉庫，請手動更新${NC}"
        read -p "按 Enter 繼續..."
        return
    fi
    
    echo "4. 更新依賴..."
    sudo -u fixture bash -c "source venv/bin/activate && pip install -r requirements.txt"
    
    echo "5. 重啟服務..."
    sudo systemctl start ${APP_NAME}
    
    sleep 3
    
    if systemctl is-active --quiet ${APP_NAME}; then
        echo -e "${GREEN}✓ 更新成功${NC}"
    else
        echo -e "${RED}✗ 更新失敗，正在回滾...${NC}"
        
        sudo systemctl stop ${APP_NAME}
        sudo rm -rf /opt/${APP_NAME}
        sudo tar -xzf /tmp/fixture-app-backup-${BACKUP_DATE}.tar.gz -C /opt/
        sudo systemctl start ${APP_NAME}
        
        echo -e "${YELLOW}已回滾到之前版本${NC}"
    fi
}

# 10. 查看系統資源
check_resources() {
    echo -e "${BLUE}=== 系統資源 ===${NC}"
    echo ""
    
    echo -e "${YELLOW}CPU 和記憶體:${NC}"
    top -bn1 | head -5
    echo ""
    
    echo -e "${YELLOW}磁碟使用:${NC}"
    df -h | grep -E '^/dev/'
    echo ""
    
    echo -e "${YELLOW}記憶體詳情:${NC}"
    free -h
    echo ""
    
    echo -e "${YELLOW}程序佔用 (Top 5):${NC}"
    ps aux --sort=-%mem | head -6
}

# 11. 測試 API
test_api() {
    echo -e "${BLUE}=== API 測試 ===${NC}"
    echo ""
    
    # 測試健康檢查
    echo -e "${YELLOW}1. 健康檢查端點:${NC}"
    HEALTH=$(curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:8000/api/health)
    echo "$HEALTH"
    echo ""
    
    # 測試 Nginx
    echo -e "${YELLOW}2. Nginx 代理測試:${NC}"
    PROXY=$(curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost/api/health)
    echo "$PROXY"
    echo ""
    
    # 測試 HTTPS
    echo -e "${YELLOW}3. HTTPS 測試:${NC}"
    HTTPS=$(curl -k -s -w "\nHTTP Status: %{http_code}\n" https://localhost/api/health)
    echo "$HTTPS"
    echo ""
    
    # 測試連接數
    echo -e "${YELLOW}4. 當前連接數:${NC}"
    ss -an | grep :8000 | wc -l
    echo ""
}

# 12. 清理日誌
clean_logs() {
    echo -e "${BLUE}=== 清理日誌 ===${NC}"
    echo ""
    
    echo "當前日誌大小:"
    du -sh /var/log/${APP_NAME}
    du -sh /var/log/nginx
    echo ""
    
    read -p "確定要清理 30 天前的日誌嗎？(y/N): " CONFIRM
    
    if [[ $CONFIRM =~ ^[Yy]$ ]]; then
        sudo find /var/log/${APP_NAME} -name "*.log" -mtime +30 -delete
        sudo find /var/log/nginx -name "*.log" -mtime +30 -delete
        
        echo -e "${GREEN}✓ 日誌清理完成${NC}"
        
        echo ""
        echo "清理後日誌大小:"
        du -sh /var/log/${APP_NAME}
        du -sh /var/log/nginx
    else
        echo "已取消"
    fi
}

# 主循環
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1) check_status ;;
        2) start_service ;;
        3) stop_service ;;
        4) restart_service ;;
        5) view_logs ;;
        6) view_error_logs ;;
        7) backup_database ;;
        8) restore_database ;;
        9) update_application ;;
        10) check_resources ;;
        11) test_api ;;
        12) clean_logs ;;
        0) 
            echo "再見！"
            exit 0
            ;;
        *)
            echo -e "${RED}無效的選項${NC}"
            ;;
    esac
    
    echo ""
    read -p "按 Enter 繼續..."
done
