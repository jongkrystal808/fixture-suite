# FastAPI 治具管理系統 - 超詳細部署指南
## 從零開始部署到 Rocky Linux 9.7

> 本指南假設您是第一次部署 Web 應用，將提供每一步的詳細說明

---

## 📑 目錄

- [Part 1: 準備工作](#part-1-準備工作)
- [Part 2: 上傳文件到伺服器](#part-2-上傳文件到伺服器)
- [Part 3: 執行部署](#part-3-執行部署)
- [Part 4: 驗證部署](#part-4-驗證部署)
- [Part 5: 日常使用](#part-5-日常使用)
- [Part 6: 故障排除](#part-6-故障排除)

---

## Part 1: 準備工作

### 1.1 確認伺服器資訊

在開始之前，請準備以下資訊：

```
伺服器 IP 地址: ___________________ (例如: 192.168.1.100)
SSH 連接端口: _____________________ (預設為 22)
登入使用者名稱: ___________________ (例如: root 或 admin)
登入密碼: _________________________ (請妥善保管)
```

### 1.2 連接到伺服器

#### Windows 使用者

**方式 1: 使用 PuTTY**

1. 下載 PuTTY: https://www.putty.org/
2. 開啟 PuTTY
3. 在 "Host Name" 欄位輸入伺服器 IP
4. Port 設定為 22
5. 點擊 "Open"
6. 首次連接會彈出安全警告，點擊 "Yes"
7. 輸入使用者名稱和密碼

**方式 2: 使用 Windows Terminal (Windows 10/11)**

```powershell
# 開啟 PowerShell 或 CMD
ssh root@192.168.1.100

# 首次連接會詢問是否信任，輸入 yes
# 然後輸入密碼
```

#### macOS / Linux 使用者

```bash
# 開啟終端機 (Terminal)
ssh root@192.168.1.100

# 輸入密碼
```

### 1.3 驗證系統版本

登入後，執行以下命令確認系統版本：

```bash
cat /etc/rocky-release
```

**期望輸出：**
```
Rocky Linux release 9.7 (Blue Onyx)
```

如果不是 Rocky Linux 9.x，本指南可能不完全適用。

### 1.4 確認網路連接

```bash
# 測試網路連接
ping -c 3 google.com

# 檢查網路介面
ip addr show
```

**期望輸出：**
- 能夠 ping 通外部網路
- 看到 eth0 或類似網路介面有 IP 地址

---

## Part 2: 上傳文件到伺服器

### 2.1 準備部署文件

您有以下幾種方式將文件傳到伺服器：

#### 方式 A: 使用 Git Clone（最簡單，推薦）

如果您的代碼在 Git 倉庫中：

```bash
# 在伺服器上執行
cd /tmp
git clone https://github.com/your-username/fixture-management.git
cd fixture-management
```

**如果沒有安裝 git：**
```bash
sudo dnf install -y git
```

#### 方式 B: 使用 SCP 上傳（從本機上傳）

**Windows 使用者 - 使用 WinSCP:**

1. 下載 WinSCP: https://winscp.net/
2. 開啟 WinSCP
3. 新建站點：
   - 檔案協議：SFTP
   - 主機名稱：您的伺服器 IP
   - 端口：22
   - 使用者名稱：root
   - 密碼：您的密碼
4. 點擊 "登入"
5. 將本機的文件拖拽到右側（伺服器端）的 `/root/` 目錄

**macOS / Linux 使用者:**

```bash
# 在您的本機電腦上執行
# 假設您的專案在 ~/Downloads/fixture-management

# 上傳整個專案目錄
scp -r ~/Downloads/fixture-management root@192.168.1.100:/root/

# 或上傳打包後的檔案
cd ~/Downloads
tar -czf fixture-app.tar.gz fixture-management/
scp fixture-app.tar.gz root@192.168.1.100:/root/
```

#### 方式 C: 直接在伺服器上創建文件

如果文件不多，可以直接在伺服器上創建：

```bash
# 創建目錄
mkdir -p /root/fixture-deployment
cd /root/fixture-deployment

# 創建 deploy.sh（稍後會用到）
vim deploy.sh
# 按 i 進入編輯模式
# 貼上部署腳本內容
# 按 ESC，輸入 :wq 保存退出
```

### 2.2 下載部署腳本

如果您沒有完整的專案代碼，只需要部署腳本：

```bash
# 創建工作目錄
mkdir -p /root/fixture-deployment
cd /root/fixture-deployment

# 下載部署腳本（需要替換成實際 URL）
# 如果您有 Web 伺服器存放這些文件：
curl -O http://your-file-server.com/deploy.sh
curl -O http://your-file-server.com/manage.sh

# 或者直接從 GitHub Raw 下載：
curl -O https://raw.githubusercontent.com/your-repo/main/deploy.sh
curl -O https://raw.githubusercontent.com/your-repo/main/manage.sh

# 賦予執行權限
chmod +x deploy.sh manage.sh

# 驗證文件已下載
ls -lh
```

**如果沒有外部伺服器，您需要手動創建這些文件：**

```bash
# 創建 deploy.sh
cat > deploy.sh << 'EOF'
#!/bin/bash
# 這裡貼上完整的 deploy.sh 內容
EOF

# 賦予執行權限
chmod +x deploy.sh
```

### 2.3 準備應用程式代碼

您的應用程式代碼應該包含以下結構：

```
fixture-management-system/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   └── utils/
│   ├── main.py
│   └── config.py
├── web/
│   ├── css/
│   ├── js/
│   └── index.html
├── database/
│   └── init_database_v4.1.sql
└── requirements.txt
```

**檢查是否有 requirements.txt：**

```bash
cd /path/to/your/project
cat requirements.txt
```

**如果沒有，創建一個：**

```bash
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
pymysql==1.1.0
cryptography==41.0.7
openpyxl==3.1.2
gunicorn==21.2.0
EOF
```

---

## Part 3: 執行部署

### 3.1 執行自動部署腳本

```bash
# 進入部署腳本所在目錄
cd /root/fixture-deployment  # 或您的實際目錄

# 確認腳本存在
ls -lh deploy.sh

# 執行部署（需要 10-15 分鐘）
sudo bash deploy.sh
```

### 3.2 部署過程中的互動提示

執行腳本後，會有以下提示需要您回應：

#### 提示 1: 確認繼續部署

```
========================================
FastAPI 治具管理系統 - 自動部署腳本
Rocky Linux 9.7
========================================

此腳本將安裝並配置以下組件:
  - Python 3.11
  - MySQL 8.0
  - Nginx
  - FastAPI 應用

確定要繼續嗎？(y/N)
```

**您的操作：** 輸入 `y` 然後按 Enter

#### 提示 2: MySQL 安全設定

如果是首次安裝 MySQL，會提示執行安全設定：

```
MySQL 臨時密碼: aBcD1234!@#$
請執行: mysql_secure_installation 進行安全設定
```

**重要：** 記下這個臨時密碼！

腳本會暫停，提示您設定 MySQL：

```bash
sudo mysql_secure_installation
```

**MySQL 安全設定互動過程：**

```
1. Enter password for user root: 
   → 輸入臨時密碼（上面顯示的）

2. New password: 
   → 輸入新密碼（至少 8 位，包含大小寫字母、數字、特殊字符）
   → 例如: MySecure@Pass2024

3. Re-enter new password: 
   → 再次輸入新密碼

4. Remove anonymous users? (Press y|Y for Yes, any other key for No) : 
   → 輸入 y

5. Disallow root login remotely? (Press y|Y for Yes, any other key for No) : 
   → 輸入 y

6. Remove test database and access to it? (Press y|Y for Yes, any other key for No) : 
   → 輸入 y

7. Reload privilege tables now? (Press y|Y for Yes, any other key for No) : 
   → 輸入 y
```

**完成後繼續部署腳本。**

#### 提示 3: 輸入 MySQL Root 密碼

```
請輸入 MySQL root 密碼: 
```

**您的操作：** 輸入剛才設定的 MySQL root 密碼

#### 提示 4: 提供 Git Repository（可選）

```
未檢測到應用程式碼
請輸入 Git Repository URL (或按 Enter 跳過): 
```

**選項 A：** 如果您的代碼在 Git，輸入 URL：
```
https://github.com/your-username/fixture-management.git
```

**選項 B：** 如果您已經手動上傳代碼，按 Enter 跳過

如果跳過，腳本會提示：
```
請手動上傳應用程式碼到 /opt/fixture-app
上傳完成後，請重新執行此腳本
```

### 3.3 手動上傳代碼（如果需要）

如果選擇跳過 Git Clone，需要手動上傳：

```bash
# 方式 1: 如果代碼已在伺服器其他位置
cp -r /root/fixture-management/* /opt/fixture-app/

# 方式 2: 解壓縮上傳的壓縮檔
cd /opt
tar -xzf /root/fixture-app.tar.gz

# 設定權限
sudo chown -R fixture:fixture /opt/fixture-app

# 重新執行部署腳本
cd /root/fixture-deployment
sudo bash deploy.sh
```

### 3.4 觀察部署過程

部署腳本會顯示進度：

```
[INFO] 檢查系統版本...
[INFO] 系統版本: Rocky Linux release 9.7 (Blue Onyx)
[INFO] 更新系統套件...
[INFO] 配置防火牆...
[INFO] 安裝 Python 3.11...
[INFO] Python 版本: Python 3.11.2
[INFO] 安裝 MySQL 8.0...
[INFO] 配置資料庫...
[INFO] 資料庫配置完成
[INFO] 安裝 Nginx...
[INFO] 創建應用使用者...
[INFO] 部署應用程式...
[INFO] 創建 Python 虛擬環境...
[INFO] 安裝 Python 依賴...
[INFO] 創建環境變數檔...
[INFO] 匯入資料庫結構...
[INFO] 配置 Systemd 服務...
[INFO] 應用服務啟動成功
[INFO] 配置 Nginx...
[INFO] Nginx 配置完成
[INFO] 設定備份腳本...
```

**如果看到 [ERROR]，記下錯誤訊息，稍後查看故障排除章節。**

### 3.5 部署完成

看到以下訊息表示部署成功：

```
=========================================
部署完成！
=========================================

應用資訊:
  - 應用目錄: /opt/fixture-app
  - 資料庫名稱: fixture_management
  - 資料庫使用者: fixture_user

訪問資訊:
  - HTTP:  http://192.168.1.100
  - HTTPS: https://192.168.1.100

管理命令:
  - 查看服務狀態: systemctl status fixture-app
  - 查看日誌: journalctl -u fixture-app -f
  - 重啟服務: systemctl restart fixture-app

注意事項:
  1. 請修改預設密碼: /opt/fixture-app/.env
  2. 如使用真實域名，請配置 Let's Encrypt SSL
  3. 請設定定期備份: crontab -e -u fixture
```

---

## Part 4: 驗證部署

### 4.1 檢查服務狀態

```bash
# 檢查應用服務
systemctl status fixture-app

# 期望輸出:
# ● fixture-app.service - Fixture Management FastAPI Application
#    Loaded: loaded (/etc/systemd/system/fixture-app.service; enabled; vendor preset: disabled)
#    Active: active (running) since ...
```

**如果狀態是 `active (running)`，表示服務正常運行。**

```bash
# 檢查 Nginx
systemctl status nginx

# 檢查 MySQL
systemctl status mysqld
```

### 4.2 測試 API 端點

```bash
# 測試後端直接訪問
curl http://localhost:8000/api/health

# 期望輸出: {"status":"ok"}

# 測試通過 Nginx 訪問
curl http://localhost/api/health

# 期望輸出: {"status":"ok"}

# 測試 HTTPS（會有自簽證書警告，正常）
curl -k https://localhost/api/health

# 期望輸出: {"status":"ok"}
```

### 4.3 檢查防火牆

```bash
# 查看防火牆規則
sudo firewall-cmd --list-all

# 期望輸出包含:
#   services: cockpit dhcpv6-client http https ssh
```

### 4.4 檢查資料庫

```bash
# 登入 MySQL
mysql -u fixture_user -p fixture_management

# 輸入密碼: Strong@Pass123（或您修改的密碼）

# 執行 SQL 查詢
SHOW TABLES;

# 期望輸出: 18 個表
# +------------------------------------+
# | Tables_in_fixture_management       |
# +------------------------------------+
# | customers                          |
# | deployment_history                 |
# | fixture_deployments                |
# | fixture_requirements               |
# | fixture_serials                    |
# | fixture_usage_summary              |
# | fixtures                           |
# | inventory_snapshots                |
# | machine_models                     |
# | material_transaction_details       |
# | material_transactions              |
# | model_stations                     |
# | owners                             |
# | replacement_logs                   |
# | serial_usage_summary               |
# | stations                           |
# | usage_logs                         |
# | users                              |
# +------------------------------------+

# 退出
EXIT;
```

### 4.5 從瀏覽器訪問

1. **開啟瀏覽器**

2. **訪問伺服器 IP**
   ```
   http://192.168.1.100
   ```
   或
   ```
   https://192.168.1.100
   ```

3. **HTTPS 證書警告（正常）**
   - Chrome: 點擊 "進階" → "繼續前往..."
   - Firefox: 點擊 "進階" → "接受風險並繼續"
   - Edge: 點擊 "進階" → "繼續前往..."

4. **應該看到登入頁面**

### 4.6 創建第一個管理員帳號

```bash
# 登入資料庫
mysql -u fixture_user -p fixture_management

# 創建管理員（密碼會自動以 SHA256 加密）
INSERT INTO users (username, password, email, role, is_active)
VALUES ('admin', SHA2('admin123', 256), 'admin@example.com', 'admin', 1);

# 驗證
SELECT id, username, email, role FROM users;

# 退出
EXIT;
```

現在您可以使用以下憑證登入：
- 使用者名稱: `admin`
- 密碼: `admin123`

**重要：登入後請立即修改密碼！**

---

## Part 5: 日常使用

### 5.1 使用管理工具

```bash
# 下載並執行管理工具
cd /root/fixture-deployment
bash manage.sh
```

管理工具選單：

```
=========================================
 治具管理系統 - 管理工具
=========================================

1) 查看服務狀態
2) 啟動服務
3) 停止服務
4) 重啟服務
5) 查看實時日誌
6) 查看錯誤日誌
7) 備份資料庫
8) 還原資料庫
9) 更新應用
10) 查看系統資源
11) 測試 API
12) 清理日誌
0) 退出

請選擇操作 [0-12]:
```

### 5.2 常用操作

#### 重啟應用

```bash
# 方式 1: 使用管理工具
bash manage.sh
# 選擇 "4) 重啟服務"

# 方式 2: 直接命令
sudo systemctl restart fixture-app
```

#### 查看日誌

```bash
# 實時查看日誌
sudo journalctl -u fixture-app -f

# 查看最近 100 條日誌
sudo journalctl -u fixture-app -n 100

# 查看今天的日誌
sudo journalctl -u fixture-app --since today

# 查看應用錯誤日誌
sudo tail -f /var/log/fixture-app/error.log
```

#### 備份資料庫

```bash
# 方式 1: 使用管理工具
bash manage.sh
# 選擇 "7) 備份資料庫"

# 方式 2: 手動備份
BACKUP_DIR="/home/fixture/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mysqldump -u fixture_user -p fixture_management | gzip > $BACKUP_DIR/backup_${DATE}.sql.gz
```

#### 更新應用

```bash
# 如果使用 Git
cd /opt/fixture-app
sudo -u fixture git pull
sudo systemctl restart fixture-app

# 如果需要更新依賴
cd /opt/fixture-app
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart fixture-app
```

### 5.3 修改配置

#### 修改資料庫密碼

```bash
# 1. 修改 MySQL 密碼
mysql -u root -p
ALTER USER 'fixture_user'@'localhost' IDENTIFIED BY 'NewPassword123!';
FLUSH PRIVILEGES;
EXIT;

# 2. 修改應用配置
sudo vim /opt/fixture-app/.env
# 修改: DB_PASSWORD=NewPassword123!

# 3. 重啟應用
sudo systemctl restart fixture-app
```

#### 修改 JWT Secret Key

```bash
# 生成新的 Secret Key
openssl rand -hex 32

# 編輯配置
sudo vim /opt/fixture-app/.env
# 修改: SECRET_KEY=新生成的密鑰

# 重啟應用
sudo systemctl restart fixture-app
```

#### 修改應用端口（不建議）

```bash
# 編輯服務檔案
sudo vim /etc/systemd/system/fixture-app.service

# 修改 --bind 參數
# 從: --bind 0.0.0.0:8000
# 改為: --bind 0.0.0.0:9000

# 重新載入並重啟
sudo systemctl daemon-reload
sudo systemctl restart fixture-app

# 同時修改 Nginx 配置
sudo vim /etc/nginx/conf.d/fixture-app.conf
# 修改 upstream 中的端口

# 重啟 Nginx
sudo systemctl restart nginx
```

### 5.4 配置域名和 SSL

如果您有域名，可以配置 Let's Encrypt 免費 SSL 證書：

```bash
# 1. 安裝 certbot
sudo dnf install -y certbot python3-certbot-nginx

# 2. 獲取證書（需要域名已指向此伺服器）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 3. 按提示操作
# - 輸入郵件地址
# - 同意服務條款 (Y)
# - 選擇是否重定向 HTTP 到 HTTPS (2)

# 4. 測試自動續期
sudo certbot renew --dry-run

# 5. 設定自動續期（已自動配置）
sudo systemctl status certbot-renew.timer
```

---

## Part 6: 故障排除

### 6.1 服務無法啟動

#### 問題：執行 `systemctl status fixture-app` 顯示 failed

**診斷步驟：**

```bash
# 1. 查看詳細錯誤
sudo journalctl -u fixture-app -n 100 --no-pager

# 2. 手動測試
cd /opt/fixture-app
source venv/bin/activate
cd backend
python main.py

# 看到的錯誤訊息會更清楚
```

**常見原因：**

A. **資料庫連接失敗**

錯誤訊息：
```
pymysql.err.OperationalError: (2003, "Can't connect to MySQL server")
```

解決方案：
```bash
# 檢查 MySQL 是否運行
sudo systemctl status mysqld

# 檢查密碼是否正確
cat /opt/fixture-app/.env | grep DB_PASSWORD

# 測試連接
mysql -u fixture_user -p fixture_management
```

B. **端口被占用**

錯誤訊息：
```
OSError: [Errno 98] Address already in use
```

解決方案：
```bash
# 查看誰在使用 8000 端口
sudo ss -tlnp | grep :8000

# 殺掉占用的程序
sudo kill -9 <PID>

# 重啟服務
sudo systemctl restart fixture-app
```

C. **權限問題**

錯誤訊息：
```
PermissionError: [Errno 13] Permission denied
```

解決方案：
```bash
# 重設權限
sudo chown -R fixture:fixture /opt/fixture-app
sudo chmod -R 755 /opt/fixture-app
sudo chmod 600 /opt/fixture-app/.env

# 重啟服務
sudo systemctl restart fixture-app
```

### 6.2 無法訪問網頁

#### 問題：瀏覽器訪問 IP 無法打開

**診斷步驟：**

```bash
# 1. 檢查防火牆
sudo firewall-cmd --list-all
# 應該看到 http 和 https

# 2. 測試 Nginx
curl -I http://localhost
# 應該返回 HTTP/1.1 200 OK 或 301

# 3. 測試後端
curl http://localhost:8000/api/health
# 應該返回 {"status":"ok"}

# 4. 查看 Nginx 錯誤日誌
sudo tail -50 /var/log/nginx/error.log
```

**常見原因：**

A. **防火牆未開放**

```bash
# 開放端口
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

B. **SELinux 阻擋**

```bash
# 檢查 SELinux
getenforce

# 臨時關閉測試
sudo setenforce 0

# 再次測試訪問
curl http://localhost

# 如果可以了，永久設為 permissive
sudo vim /etc/selinux/config
# 修改: SELINUX=permissive

# 重啟系統
sudo reboot
```

C. **Nginx 配置錯誤**

```bash
# 測試 Nginx 配置
sudo nginx -t

# 如果有錯誤，查看配置
sudo vim /etc/nginx/conf.d/fixture-app.conf

# 重啟 Nginx
sudo systemctl restart nginx
```

### 6.3 502 Bad Gateway

#### 問題：訪問網頁顯示 502

**診斷步驟：**

```bash
# 1. 確認後端是否運行
sudo systemctl status fixture-app

# 2. 測試後端直接訪問
curl http://localhost:8000/api/health

# 3. 查看 Nginx 日誌
sudo tail -50 /var/log/nginx/error.log
```

**解決方案：**

```bash
# 重啟後端服務
sudo systemctl restart fixture-app

# 等待 3 秒
sleep 3

# 重啟 Nginx
sudo systemctl restart nginx

# 測試
curl http://localhost/api/health
```

### 6.4 資料庫錯誤

#### 問題：應用日誌顯示資料庫錯誤

**診斷步驟：**

```bash
# 1. 檢查 MySQL 狀態
sudo systemctl status mysqld

# 2. 查看 MySQL 錯誤日誌
sudo tail -50 /var/log/mysql/error.log

# 3. 測試登入
mysql -u fixture_user -p fixture_management
```

**常見問題：**

A. **資料庫不存在**

```sql
-- 登入 MySQL
mysql -u root -p

-- 檢查資料庫
SHOW DATABASES;

-- 如果沒有 fixture_management，重新創建
CREATE DATABASE fixture_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 匯入結構
EXIT;
mysql -u fixture_user -p fixture_management < /opt/fixture-app/database/init_database_v4.1.sql
```

B. **使用者權限問題**

```sql
-- 登入 MySQL
mysql -u root -p

-- 重新授權
GRANT ALL PRIVILEGES ON fixture_management.* TO 'fixture_user'@'localhost';
FLUSH PRIVILEGES;

-- 測試
EXIT;
mysql -u fixture_user -p fixture_management
```

### 6.5 性能問題

#### 問題：應用反應緩慢

**診斷步驟：**

```bash
# 1. 查看系統資源
htop
# 按 q 退出

# 2. 查看 CPU 使用
top -bn1 | head -15

# 3. 查看記憶體
free -h

# 4. 查看磁碟 I/O
iostat -x 1 5

# 5. 查看 MySQL 慢查詢
mysql -u root -p
SHOW PROCESSLIST;
SHOW VARIABLES LIKE 'slow_query%';
```

**優化方案：**

A. **增加 Gunicorn Workers**

```bash
# 編輯服務檔案
sudo vim /etc/systemd/system/fixture-app.service

# 修改 workers 數量（建議為 CPU 核心數 * 2 + 1）
# 如果是 2 核 CPU，設為 5
--workers 5

# 重啟服務
sudo systemctl daemon-reload
sudo systemctl restart fixture-app
```

B. **優化 MySQL**

```bash
# 編輯 MySQL 配置
sudo vim /etc/my.cnf.d/mysql-server.cnf

# 加入以下配置
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 200
query_cache_size = 64M
query_cache_type = 1

# 重啟 MySQL
sudo systemctl restart mysqld
```

C. **清理日誌**

```bash
# 清理應用日誌
sudo find /var/log/fixture-app -name "*.log" -mtime +7 -delete

# 清理 journal
sudo journalctl --vacuum-time=7d
```

### 6.6 完全重置

如果遇到無法解決的問題，可以完全重置：

```bash
# 警告：這會刪除所有資料！

# 1. 備份資料庫（如果需要）
mysqldump -u fixture_user -p fixture_management > /tmp/backup.sql

# 2. 停止所有服務
sudo systemctl stop fixture-app nginx mysqld

# 3. 刪除應用
sudo rm -rf /opt/fixture-app

# 4. 刪除資料庫
mysql -u root -p
DROP DATABASE fixture_management;
DROP USER 'fixture_user'@'localhost';
EXIT;

# 5. 重新執行部署
cd /root/fixture-deployment
sudo bash deploy.sh
```

---

## 📞 獲取幫助

### 查看日誌

```bash
# 應用日誌
sudo journalctl -u fixture-app -n 100

# Nginx 日誌
sudo tail -100 /var/log/nginx/error.log

# MySQL 日誌
sudo tail -100 /var/log/mysql/error.log
```

### 常用命令速查

```bash
# 服務管理
sudo systemctl start fixture-app      # 啟動
sudo systemctl stop fixture-app       # 停止
sudo systemctl restart fixture-app    # 重啟
sudo systemctl status fixture-app     # 狀態

# 查看日誌
sudo journalctl -u fixture-app -f     # 實時
sudo journalctl -u fixture-app -n 50  # 最近 50 條

# 測試
curl http://localhost/api/health      # API 測試
sudo nginx -t                         # Nginx 配置測試

# 資料庫
mysql -u fixture_user -p fixture_management  # 登入
mysqldump -u fixture_user -p fixture_management > backup.sql  # 備份
```

---

## 🎓 總結

恭喜您完成部署！您的治具管理系統現在應該已經在運行了。

**重要的後續步驟：**

1. ✅ 修改預設密碼
2. ✅ 設定定期備份
3. ✅ 配置域名和 SSL（如有）
4. ✅ 創建使用者帳號
5. ✅ 測試所有功能

**需要幫助？**
- 查看完整文檔：DEPLOYMENT_GUIDE_ROCKY9.md
- 使用管理工具：bash manage.sh
- 查看日誌定位問題

祝使用愉快！ 🚀
