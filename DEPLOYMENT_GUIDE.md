# 治具管理系統 - Rocky Linux 9.7 部署指南

## 📋 系統信息

- **應用名稱**: fixture-suite (治具管理系統)
- **版本**: v4.1
- **Python 版本**: 3.9+
- **數據庫**: MySQL 8.0+ (fixture_management)
- **目標系統**: Rocky Linux 9.7

## 📁 項目結構要求

```
fixture-suite/
├── database/
│   └── init_database.sql         # 數據庫初始化腳本
├── backend/
│   ├── main.py                   # FastAPI 主程序
│   ├── requirements.txt          # Python 依賴
│   └── ...                       # 其他後端文件
├── frontend/                     # 前端文件（可選）
│   ├── package.json
│   └── ...
└── deployment.sh                 # 部署腳本
```

## 🚀 快速開始

### 1. 系統準備

確保您的系統滿足以下要求：

```bash
# 檢查系統版本
cat /etc/rocky-release

# 確認 SELinux 已禁用或設置為 Permissive
getenforce

# 如果需要，禁用 SELinux
sudo sed -i 's/^SELINUX=enforcing/SELINUX=disabled/' /etc/selinux/config
sudo setenforce 0
```

### 2. 上傳項目文件

將整個項目目錄上傳到服務器：

```bash
# 方式 1: 使用 SCP
scp -r fixture-suite/ user@server:/path/to/

# 方式 2: 使用 Git
git clone https://your-repo/fixture-suite.git
```

### 3. 執行部署

```bash
# 進入項目目錄
cd /path/to/fixture-suite

# 賦予執行權限
chmod +x deployment.sh

# 執行部署腳本
sudo ./deployment.sh
```

## 📝 部署腳本說明

### 自動安裝的組件

1. **系統套件**
   - EPEL 倉庫
   - 開發工具 (gcc, make 等)
   - 基礎工具 (wget, curl, git, vim)

2. **Python 環境**
   - Python 3.9
   - pip 和開發包
   - 虛擬環境 (venv)

3. **MySQL 數據庫**
   - MySQL 8.0 Server
   - 自動配置和安全加固
   - 創建數據庫和用戶
   - 導入數據庫結構

4. **應用程序**
   - 創建系統用戶 (fixture-suite)
   - 安裝到 /opt/fixture-management-system
   - 配置環境變量
   - 安裝 Python 依賴

5. **Node.js (可選)**
   - 如果檢測到 frontend 目錄
   - 自動安裝 Node.js 18.x
   - 安裝前端依賴並構建

6. **系統服務**
   - 創建 systemd 服務單元
   - 自動啟動和開機自啟
   - 日誌管理配置

## 🔧 配置文件

### 應用配置

位置: `/opt/fixture-management-system/config/.env`

```env
# 數據庫配置
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=fixture_management
DATABASE_USER=fixture_user
DATABASE_PASSWORD=<自動生成>

# 應用配置
APP_NAME=fixture-suite
APP_VERSION=v4.1
DEBUG=false
LOG_LEVEL=INFO

# 服務器配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
FRONTEND_PORT=3000

# 安全配置
SECRET_KEY=<自動生成>
```

### 數據庫密碼

- **Root 密碼**: `/root/.mysql_root_password`
- **應用密碼**: `/root/.mysql_app_password`

⚠️ **請妥善保管這些文件！**

## 🛠️ 管理命令

### 快速腳本

```bash
# 查看系統狀態
/opt/fixture-management-system/status.sh

# 查看最近日誌
/opt/fixture-management-system/logs.sh

# 重啟所有服務
/opt/fixture-management-system/restart.sh
```

### Systemd 命令

```bash
# 後端服務
systemctl status fixture-management-backend
systemctl start fixture-management-backend
systemctl stop fixture-management-backend
systemctl restart fixture-management-backend
systemctl enable fixture-management-backend

# 前端服務（如果有）
systemctl status fixture-management-frontend
systemctl restart fixture-management-frontend

# 查看實時日誌
journalctl -u fixture-management-backend -f
```

### 日誌位置

```bash
# 後端日誌
/opt/fixture-management-system/logs/backend.log
/opt/fixture-management-system/logs/backend-error.log

# 前端日誌（如果有）
/opt/fixture-management-system/logs/frontend.log

# Systemd 日誌
journalctl -u fixture-management-backend -n 100
```

## 🌐 訪問應用

部署完成後，您可以通過以下地址訪問：

```
後端 API: http://YOUR_SERVER_IP:8000
API 文檔: http://YOUR_SERVER_IP:8000/docs
前端應用: http://YOUR_SERVER_IP:3000 (如果有)
```

### 測試 API

```bash
# 健康檢查
curl http://localhost:8000/health

# 查看 API 文檔
curl http://localhost:8000/docs
```

## 🔒 安全建議

### 1. 防火牆配置

```bash
# 檢查防火牆狀態
firewall-cmd --list-all

# 僅允許特定 IP 訪問
firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="YOUR_IP" port port="8000" protocol="tcp" accept'
firewall-cmd --reload
```

### 2. SSL/TLS 配置

生產環境建議使用 Nginx 反向代理並配置 SSL：

```bash
# 安裝 Nginx
dnf install -y nginx

# 配置反向代理
# 編輯 /etc/nginx/conf.d/fixture-suite.conf
```

### 3. 數據庫安全

```bash
# 限制 MySQL 遠程訪問
# 編輯 /etc/my.cnf.d/mysql-server.cnf
bind-address = 127.0.0.1

# 重啟 MySQL
systemctl restart mysqld
```

### 4. 定期備份

```bash
# 創建備份腳本
cat > /opt/backup-fixture.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/fixture-suite"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 備份數據庫
mysqldump -u root -p$(cat /root/.mysql_root_password) fixture_management > $BACKUP_DIR/db_$DATE.sql

# 備份應用配置
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /opt/fixture-management-system/config

# 清理 30 天前的備份
find $BACKUP_DIR -mtime +30 -delete
EOF

chmod +x /opt/backup-fixture.sh

# 添加到 crontab (每天凌晨 2 點)
echo "0 2 * * * /opt/backup-fixture.sh" | crontab -
```

## 🔍 故障排除

### 問題 1: 後端服務無法啟動

```bash
# 檢查詳細錯誤
journalctl -u fixture-management-backend -n 50

# 檢查端口占用
ss -tlnp | grep 8000

# 手動測試
cd /opt/fixture-management-system/backend
source ../venv/bin/activate
python main.py
```

### 問題 2: 數據庫連接失敗

```bash
# 測試數據庫連接
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management

# 檢查 MySQL 服務
systemctl status mysqld

# 查看 MySQL 日誌
tail -f /var/log/mysqld.log
```

### 問題 3: Python 依賴安裝失敗

```bash
# 手動安裝依賴
cd /opt/fixture-management-system
source venv/bin/activate
pip install -r backend/requirements.txt -v
```

### 問題 4: 權限問題

```bash
# 修復權限
chown -R fixture-suite:fixture-suite /opt/fixture-management-system
chmod 600 /opt/fixture-management-system/config/.env
```

## 📚 數據庫說明

### 數據庫結構

系統使用 18 個數據表：

1. **核心主表** (5 個)
   - customers (客戶總表)
   - fixtures (治具總表)
   - stations (站點總表)
   - machine_models (機種總表)
   - owners (負責人總表)

2. **序號管理表** (1 個)
   - fixture_serials (治具序號表)

3. **關聯配置表** (3 個)
   - model_stations (機種-站點關聯)
   - fixture_requirements (治具需求)
   - fixture_deployments (治具部署)

4. **歷史記錄表** (3 個)
   - deployment_history (部署歷史)
   - usage_logs (使用記錄)
   - replacement_logs (更換記錄)

5. **物料交易表** (2 個)
   - material_transactions (物料異動主表)
   - material_transaction_details (物料異動明細)

6. **統計匯總表** (3 個)
   - fixture_usage_summary (治具使用統計)
   - serial_usage_summary (序號使用統計)
   - inventory_snapshots (庫存快照)

7. **系統表** (1 個)
   - users (使用者表)

### 初始數據

系統自動創建 3 個測試客戶：
- moxa (MOXA)
- bng (BNG)
- test (test)

## 🔄 更新和維護

### 更新應用代碼

```bash
# 1. 停止服務
systemctl stop fixture-management-backend

# 2. 備份現有代碼
cp -r /opt/fixture-management-system /opt/fixture-management-system.backup

# 3. 更新代碼
cd /opt/fixture-management-system/backend
git pull  # 或手動複製新文件

# 4. 更新依賴
source ../venv/bin/activate
pip install -r requirements.txt --upgrade

# 5. 重啟服務
systemctl start fixture-management-backend
```

### 數據庫遷移

```bash
# 如果有新的數據庫變更
mysql -u root -p$(cat /root/.mysql_root_password) fixture_management < new_migration.sql
```

## 📞 獲取幫助

如果遇到問題：

1. 查看日誌文件
2. 檢查系統服務狀態
3. 驗證配置文件
4. 測試數據庫連接

## 📄 附錄

### A. 完整的端口列表

- **8000**: 後端 API (FastAPI)
- **3000**: 前端應用 (可選)
- **3306**: MySQL 數據庫

### B. 重要目錄結構

```
/opt/fixture-management-system/
├── backend/              # 後端代碼
├── frontend/            # 前端代碼（可選）
├── venv/                # Python 虛擬環境
├── config/              # 配置文件
│   └── .env            # 環境變量
├── logs/                # 日誌目錄
│   ├── backend.log
│   └── backend-error.log
├── status.sh            # 狀態檢查腳本
├── logs.sh             # 日誌查看腳本
└── restart.sh          # 重啟腳本
```

### C. 環境變量說明

| 變量名 | 說明 | 默認值 |
|--------|------|--------|
| DATABASE_HOST | 數據庫主機 | localhost |
| DATABASE_PORT | 數據庫端口 | 3306 |
| DATABASE_NAME | 數據庫名稱 | fixture_management |
| DATABASE_USER | 數據庫用戶 | fixture_user |
| DATABASE_PASSWORD | 數據庫密碼 | 自動生成 |
| BACKEND_PORT | 後端端口 | 8000 |
| FRONTEND_PORT | 前端端口 | 3000 |
| DEBUG | 調試模式 | false |
| LOG_LEVEL | 日誌級別 | INFO |

---

**版本**: v4.1  
**更新時間**: 2025-12-15  
**適用系統**: Rocky Linux 9.7
