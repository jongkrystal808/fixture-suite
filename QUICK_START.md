# 快速部署指引

> 5 分鐘內將治具管理系統部署到 Rocky Linux 9.7

---

## 📋 前置需求

- 全新安裝的 Rocky Linux 9.7 伺服器
- Root 或 sudo 權限
- 至少 2GB RAM 和 20GB 硬碟空間
- 網路連接正常

---

## 🚀 方案 A: 一鍵自動部署（推薦）

### 步驟 1: 下載部署腳本

```bash
# 方式 1: 直接下載
curl -O https://your-server/deploy.sh

# 方式 2: 從 Git 倉庫
git clone https://your-repo.git
cd fixture-management-system
```

### 步驟 2: 執行部署腳本

```bash
# 賦予執行權限
chmod +x deploy.sh

# 執行部署（需要 sudo）
sudo bash deploy.sh
```

### 步驟 3: 按提示操作

腳本會詢問：
1. 是否繼續部署？ → 輸入 `y`
2. MySQL root 密碼 → 輸入您的密碼
3. Git Repository URL → 輸入倉庫地址或按 Enter 跳過

### 步驟 4: 等待完成

部署過程約 10-15 分鐘，會自動完成：
- ✅ 系統更新
- ✅ 安裝 Python 3.11、MySQL 8.0、Nginx
- ✅ 創建資料庫和使用者
- ✅ 部署應用程式
- ✅ 配置 Systemd 服務
- ✅ 設定 Nginx 反向代理

### 步驟 5: 驗證部署

```bash
# 檢查服務狀態
systemctl status fixture-app

# 測試 API
curl http://localhost/api/health

# 查看日誌
journalctl -u fixture-app -n 20
```

**完成！** 訪問 `http://your-server-ip` 開始使用

---

## 📝 方案 B: 手動部署

如果您想更好地了解每個步驟，可以手動執行：

### 1. 系統準備

```bash
# 更新系統
sudo dnf update -y

# 安裝基本工具
sudo dnf install -y wget curl vim git
```

### 2. 安裝 Python 3.11

```bash
# 安裝 Python 3.11
sudo dnf install -y python3.11 python3.11-pip

# 設定為預設版本
sudo alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# 驗證
python3 --version
```

### 3. 安裝 MySQL 8.0

```bash
# 安裝 MySQL Repository
sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm

# 安裝 MySQL
sudo dnf install -y mysql-server

# 啟動服務
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 安全設定
sudo mysql_secure_installation
```

### 4. 配置資料庫

```bash
# 登入 MySQL
mysql -u root -p

# 執行以下 SQL
CREATE DATABASE fixture_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fixture_user'@'localhost' IDENTIFIED BY 'Strong@Pass123';
GRANT ALL PRIVILEGES ON fixture_management.* TO 'fixture_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. 安裝 Nginx

```bash
# 安裝
sudo dnf install -y nginx

# 啟動
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6. 部署應用

```bash
# 創建使用者
sudo useradd -m -s /bin/bash fixture

# 創建應用目錄
sudo mkdir -p /opt/fixture-app
sudo chown fixture:fixture /opt/fixture-app

# 切換到應用使用者
sudo su - fixture

# Clone 代碼
cd /opt/fixture-app
git clone https://your-repo.git .

# 創建虛擬環境
python3 -m venv venv
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt
```

### 7. 創建配置檔

```bash
# 創建 .env 檔案
cat > /opt/fixture-app/.env <<EOF
DB_HOST=localhost
DB_PORT=3306
DB_USER=fixture_user
DB_PASSWORD=Strong@Pass123
DB_NAME=fixture_management
SECRET_KEY=$(openssl rand -hex 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ENVIRONMENT=production
EOF

# 設定權限
chmod 600 /opt/fixture-app/.env
```

### 8. 匯入資料庫

```bash
mysql -u fixture_user -p fixture_management < /opt/fixture-app/database/init_database_v4.1.sql
```

### 9. 配置 Systemd 服務

```bash
# 創建服務檔案
sudo vim /etc/systemd/system/fixture-app.service

# 貼上服務配置（見完整文檔）

# 啟動服務
sudo systemctl daemon-reload
sudo systemctl start fixture-app
sudo systemctl enable fixture-app
```

### 10. 配置 Nginx

```bash
# 創建配置檔
sudo vim /etc/nginx/conf.d/fixture-app.conf

# 貼上 Nginx 配置（見完整文檔）

# 測試並重啟
sudo nginx -t
sudo systemctl restart nginx
```

### 11. 配置防火牆

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔧 部署後設定

### 1. 修改預設密碼

```bash
# 編輯 .env 檔案
sudo vim /opt/fixture-app/.env

# 修改以下項目：
# DB_PASSWORD=your-strong-password
# SECRET_KEY=your-secret-key-32-characters-minimum
```

### 2. 創建管理員帳號

```bash
# 使用 API 或直接插入資料庫
mysql -u fixture_user -p fixture_management

INSERT INTO users (username, password, email, role, is_active)
VALUES ('admin', SHA2('your-password', 256), 'admin@example.com', 'admin', 1);
```

### 3. 設定備份

```bash
# 使用提供的管理工具
bash manage.sh

# 或設定 crontab
crontab -e -u fixture

# 加入每日備份
0 2 * * * /home/fixture/backup-database.sh >> /var/log/fixture-app/backup.log 2>&1
```

### 4. 配置 SSL（可選但建議）

#### 使用 Let's Encrypt

```bash
# 安裝 certbot
sudo dnf install -y certbot python3-certbot-nginx

# 獲取證書
sudo certbot --nginx -d your-domain.com

# 自動續期
sudo systemctl enable certbot-renew.timer
```

#### 或使用自簽證書（測試用）

```bash
# 已由部署腳本自動創建
ls -la /etc/nginx/ssl/
```

---

## 🛠 常用管理命令

### 使用管理工具（推薦）

```bash
# 下載管理工具
curl -O https://your-server/manage.sh
chmod +x manage.sh

# 執行
bash manage.sh
```

### 手動命令

```bash
# 服務管理
sudo systemctl status fixture-app    # 查看狀態
sudo systemctl start fixture-app     # 啟動
sudo systemctl stop fixture-app      # 停止
sudo systemctl restart fixture-app   # 重啟

# 查看日誌
sudo journalctl -u fixture-app -f    # 實時日誌
sudo journalctl -u fixture-app -n 50 # 最近 50 條

# 測試 API
curl http://localhost:8000/api/health
curl http://localhost/api/health

# 資料庫
mysql -u fixture_user -p fixture_management
```

---

## 📊 驗證清單

部署完成後，請檢查以下項目：

- [ ] MySQL 服務運行中
  ```bash
  sudo systemctl is-active mysqld
  ```

- [ ] 應用服務運行中
  ```bash
  sudo systemctl is-active fixture-app
  ```

- [ ] Nginx 服務運行中
  ```bash
  sudo systemctl is-active nginx
  ```

- [ ] API 端點正常回應
  ```bash
  curl http://localhost/api/health
  # 應返回: {"status":"ok"}
  ```

- [ ] 前端頁面可訪問
  ```bash
  curl -I http://localhost/
  # 應返回: HTTP/1.1 200 OK
  ```

- [ ] 資料庫連接正常
  ```bash
  mysql -u fixture_user -p fixture_management -e "SHOW TABLES;"
  # 應列出 18 個表
  ```

- [ ] 防火牆規則正確
  ```bash
  sudo firewall-cmd --list-all
  # 應包含 http 和 https
  ```

---

## 🐛 常見問題

### Q1: 服務無法啟動

```bash
# 查看詳細錯誤
sudo journalctl -u fixture-app -n 100

# 檢查權限
ls -la /opt/fixture-app/.env

# 手動測試
cd /opt/fixture-app
source venv/bin/activate
cd backend
python main.py
```

### Q2: 資料庫連接失敗

```bash
# 測試連接
mysql -u fixture_user -p fixture_management

# 檢查密碼
cat /opt/fixture-app/.env | grep DB_PASSWORD

# 查看 MySQL 日誌
sudo tail -f /var/log/mysql/error.log
```

### Q3: Nginx 502 錯誤

```bash
# 確認後端運行
curl http://localhost:8000/api/health

# 檢查 Nginx 配置
sudo nginx -t

# 查看 Nginx 日誌
sudo tail -f /var/log/nginx/error.log
```

### Q4: 無法訪問網頁

```bash
# 檢查防火牆
sudo firewall-cmd --list-all

# 檢查 SELinux
getenforce

# 臨時關閉 SELinux 測試
sudo setenforce 0
```

---

## 📞 獲取幫助

如果遇到問題：

1. **查看完整部署文檔**
   ```bash
   cat DEPLOYMENT_GUIDE_ROCKY9.md
   ```

2. **查看日誌**
   ```bash
   # 應用日誌
   sudo journalctl -u fixture-app -n 100
   
   # Nginx 日誌
   sudo tail -100 /var/log/nginx/error.log
   
   # MySQL 日誌
   sudo tail -100 /var/log/mysql/error.log
   ```

3. **使用管理工具**
   ```bash
   bash manage.sh
   # 選擇 "6) 查看錯誤日誌"
   ```

4. **聯繫技術支援**
   - Email: support@example.com
   - Issues: https://github.com/your-repo/issues

---

## 🎉 完成！

您的治具管理系統已成功部署！

**預設訪問資訊：**
- URL: `http://your-server-ip`
- HTTPS: `https://your-server-ip`（使用自簽證書）

**後續步驟：**
1. 修改預設密碼
2. 創建管理員帳號
3. 配置 SSL 證書（如有域名）
4. 設定定期備份
5. 配置監控告警

祝使用愉快！ 🚀
