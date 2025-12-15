# 治具管理系統 - 快速參考命令

## 🚀 部署命令

```bash
# 1. 準備系統
sudo sed -i 's/^SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
sudo setenforce 0

# 2. 上傳項目到服務器
scp -r fixture-suite/ user@server:/opt/

# 3. 執行部署
cd /opt/fixture-suite
chmod +x deployment.sh
sudo ./deployment.sh
```

## 🛠️ 服務管理命令

### 後端服務

```bash
# 啟動
sudo systemctl start fixture-management-backend

# 停止
sudo systemctl stop fixture-management-backend

# 重啟
sudo systemctl restart fixture-management-backend

# 查看狀態
sudo systemctl status fixture-management-backend

# 開機自啟
sudo systemctl enable fixture-management-backend

# 禁用開機自啟
sudo systemctl disable fixture-management-backend
```

### 前端服務（如果有）

```bash
# 啟動
sudo systemctl start fixture-management-frontend

# 停止
sudo systemctl stop fixture-management-frontend

# 重啟
sudo systemctl restart fixture-management-frontend

# 查看狀態
sudo systemctl status fixture-management-frontend
```

## 📋 快速腳本

```bash
# 查看系統狀態
/opt/fixture-management-system/status.sh

# 查看最近日誌
/opt/fixture-management-system/logs.sh

# 重啟所有服務
/opt/fixture-management-system/restart.sh
```

## 📝 日誌查看命令

### 應用日誌

```bash
# 查看後端日誌（最後 50 行）
tail -50 /opt/fixture-management-system/logs/backend.log

# 實時查看後端日誌
tail -f /opt/fixture-management-system/logs/backend.log

# 查看錯誤日誌
tail -50 /opt/fixture-management-system/logs/backend-error.log

# 實時查看錯誤日誌
tail -f /opt/fixture-management-system/logs/backend-error.log
```

### Systemd 日誌

```bash
# 查看最近日誌（最後 100 行）
journalctl -u fixture-management-backend -n 100

# 實時查看日誌
journalctl -u fixture-management-backend -f

# 查看今天的日誌
journalctl -u fixture-management-backend --since today

# 查看指定時間的日誌
journalctl -u fixture-management-backend --since "2025-12-15 10:00:00"

# 查看帶詳細信息的日誌
journalctl -u fixture-management-backend -xe
```

## 🗄️ 數據庫命令

### 連接數據庫

```bash
# 使用 root 用戶連接
mysql -u root -p$(cat /root/.mysql_root_password)

# 使用應用用戶連接
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management
```

### 數據庫備份

```bash
# 備份整個數據庫
mysqldump -u root -p$(cat /root/.mysql_root_password) fixture_management > backup_$(date +%Y%m%d).sql

# 備份特定表
mysqldump -u root -p$(cat /root/.mysql_root_password) fixture_management customers fixtures > backup_tables.sql

# 壓縮備份
mysqldump -u root -p$(cat /root/.mysql_root_password) fixture_management | gzip > backup_$(date +%Y%m%d).sql.gz
```

### 數據庫還原

```bash
# 從備份還原
mysql -u root -p$(cat /root/.mysql_root_password) fixture_management < backup_20251215.sql

# 從壓縮備份還原
gunzip < backup_20251215.sql.gz | mysql -u root -p$(cat /root/.mysql_root_password) fixture_management
```

### 常用查詢

```bash
# 查看所有表
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management -e "SHOW TABLES;"

# 查看表結構
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management -e "DESCRIBE customers;"

# 查看表數據量
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management -e "
SELECT 
    table_name AS 'Table',
    table_rows AS 'Rows'
FROM information_schema.tables
WHERE table_schema = 'fixture_management'
ORDER BY table_rows DESC;"

# 查看數據庫大小
mysql -u fixture_user -p$(cat /root/.mysql_app_password) -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'fixture_management'
GROUP BY table_schema;"
```

## 🔍 系統診斷命令

### 檢查服務狀態

```bash
# 檢查所有相關服務
systemctl status fixture-management-backend fixture-management-frontend mysqld

# 檢查服務是否運行
systemctl is-active fixture-management-backend
```

### 檢查端口

```bash
# 檢查端口占用
ss -tlnp | grep -E '8000|3000|3306'

# 或使用 netstat
netstat -tlnp | grep -E '8000|3000|3306'

# 檢查特定端口
lsof -i :8000
```

### 檢查進程

```bash
# 查看相關進程
ps aux | grep -E 'uvicorn|fixture|mysql'

# 查看進程樹
pstree -p | grep fixture
```

### 檢查資源使用

```bash
# CPU 和內存使用
top -u fixture-suite

# 磁盤使用
df -h /opt/fixture-management-system

# 查看具體目錄大小
du -sh /opt/fixture-management-system/*
```

## 🔧 配置管理命令

### 查看配置

```bash
# 查看環境配置
cat /opt/fixture-management-system/config/.env

# 查看系統服務配置
systemctl cat fixture-management-backend
```

### 編輯配置

```bash
# 編輯環境配置
sudo nano /opt/fixture-management-system/config/.env

# 編輯服務配置
sudo nano /etc/systemd/system/fixture-management-backend.service

# 重載配置（修改服務配置後）
sudo systemctl daemon-reload
sudo systemctl restart fixture-management-backend
```

## 🔒 防火牆命令

```bash
# 查看防火牆狀態
sudo firewall-cmd --state

# 列出所有規則
sudo firewall-cmd --list-all

# 開放端口
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload

# 移除端口
sudo firewall-cmd --permanent --remove-port=8000/tcp
sudo firewall-cmd --reload

# 允許特定 IP 訪問
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.1.100" port port="8000" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## 🧹 清理和維護命令

### 清理日誌

```bash
# 清理應用日誌（保留最近 1000 行）
tail -1000 /opt/fixture-management-system/logs/backend.log > /tmp/backend.log
mv /tmp/backend.log /opt/fixture-management-system/logs/backend.log

# 清理 systemd 日誌
sudo journalctl --vacuum-time=7d  # 清理 7 天前的日誌
sudo journalctl --vacuum-size=100M  # 限制總大小為 100MB
```

### 清理臨時文件

```bash
# 清理 Python 緩存
find /opt/fixture-management-system -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find /opt/fixture-management-system -type f -name "*.pyc" -delete

# 清理 npm 緩存（如果有前端）
cd /opt/fixture-management-system/frontend
sudo -u fixture-suite npm cache clean --force
```

## 🔄 更新命令

### 更新應用

```bash
# 1. 停止服務
sudo systemctl stop fixture-management-backend

# 2. 備份
sudo cp -r /opt/fixture-management-system /opt/fixture-management-system.backup.$(date +%Y%m%d)

# 3. 更新代碼（根據實際情況選擇）
cd /opt/fixture-management-system/backend
sudo -u fixture-suite git pull

# 或手動複製新文件
sudo cp -r /path/to/new/backend/* /opt/fixture-management-system/backend/

# 4. 更新依賴
cd /opt/fixture-management-system
source venv/bin/activate
pip install -r backend/requirements.txt --upgrade
deactivate

# 5. 重啟服務
sudo systemctl start fixture-management-backend
```

### 更新系統

```bash
# 更新所有套件
sudo dnf update -y

# 更新特定套件
sudo dnf update -y python3.9 mysql-server
```

## 🧪 測試命令

### API 測試

```bash
# 健康檢查
curl http://localhost:8000/health

# 查看 API 文檔
curl http://localhost:8000/docs

# 測試特定端點（範例）
curl -X GET http://localhost:8000/api/v1/customers

# 使用 JSON 數據 POST 請求
curl -X POST http://localhost:8000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{"id": "test", "name": "Test Customer"}'
```

### 性能測試

```bash
# 使用 ab (Apache Bench)
ab -n 1000 -c 10 http://localhost:8000/health

# 使用 wrk
wrk -t12 -c400 -d30s http://localhost:8000/health
```

## 🔐 安全相關命令

### 檢查安全設置

```bash
# 檢查 SELinux 狀態
getenforce

# 檢查文件權限
ls -la /opt/fixture-management-system/config/.env
ls -la /root/.mysql_*_password

# 檢查用戶和組
id fixture-suite
groups fixture-suite
```

### 更改密碼

```bash
# 更改 MySQL root 密碼
NEW_PASSWORD=$(openssl rand -base64 16)
mysql -u root -p$(cat /root/.mysql_root_password) -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${NEW_PASSWORD}';"
echo "${NEW_PASSWORD}" > /root/.mysql_root_password

# 更改應用數據庫密碼
NEW_APP_PASSWORD=$(openssl rand -base64 16)
mysql -u root -p$(cat /root/.mysql_root_password) -e "ALTER USER 'fixture_user'@'localhost' IDENTIFIED BY '${NEW_APP_PASSWORD}';"
echo "${NEW_APP_PASSWORD}" > /root/.mysql_app_password

# 記得更新應用配置
sudo nano /opt/fixture-management-system/config/.env
# 更新 DATABASE_PASSWORD 值
sudo systemctl restart fixture-management-backend
```

## 📦 完整重新部署

```bash
# 1. 備份數據庫
mysqldump -u root -p$(cat /root/.mysql_root_password) fixture_management > /tmp/fixture_backup.sql

# 2. 停止服務
sudo systemctl stop fixture-management-backend
sudo systemctl stop fixture-management-frontend

# 3. 刪除舊文件
sudo rm -rf /opt/fixture-management-system

# 4. 重新部署
cd /opt/fixture-suite
sudo ./deployment.sh

# 5. 還原數據（如果需要）
mysql -u root -p$(cat /root/.mysql_root_password) fixture_management < /tmp/fixture_backup.sql
```

## 🚨 緊急恢復命令

### 服務無法啟動

```bash
# 檢查詳細錯誤
journalctl -u fixture-management-backend -n 100 --no-pager

# 手動啟動測試
cd /opt/fixture-management-system/backend
source ../venv/bin/activate
python main.py
```

### 數據庫連接失敗

```bash
# 重啟 MySQL
sudo systemctl restart mysqld

# 測試連接
mysql -u fixture_user -p$(cat /root/.mysql_app_password) -e "SELECT 1;"
```

### 權限問題

```bash
# 修復所有權限
sudo chown -R fixture-suite:fixture-suite /opt/fixture-management-system
sudo chmod 755 /opt/fixture-management-system
sudo chmod 600 /opt/fixture-management-system/config/.env
sudo chmod 755 /opt/fixture-management-system/*.sh
```

---

## 📞 快速聯絡方式

如需幫助，請提供以下信息：

```bash
# 收集診斷信息
{
    echo "=== 系統信息 ==="
    cat /etc/rocky-release
    echo
    echo "=== 服務狀態 ==="
    systemctl status fixture-management-backend --no-pager
    echo
    echo "=== 最近錯誤 ==="
    journalctl -u fixture-management-backend -n 20 --no-pager
    echo
    echo "=== 端口狀態 ==="
    ss -tlnp | grep -E '8000|3000|3306'
} > /tmp/diagnostic.txt

cat /tmp/diagnostic.txt
```

---

**提示**: 將此文件保存為書籤，方便快速查找命令！
