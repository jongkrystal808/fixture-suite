# 治具管理系統 - Rocky Linux 9.7 部署套件

## 📦 套件內容

本部署套件包含以下文件：

### 1. **deployment.sh** - 主部署腳本
完整的自動化部署腳本，會安裝和配置所有必要的組件。

**功能**:
- ✅ 自動安裝系統套件 (Python 3.9, MySQL 8.0, Node.js)
- ✅ 創建和配置數據庫
- ✅ 部署應用程序到 /opt/fixture-management-system
- ✅ 創建 systemd 服務
- ✅ 配置防火牆
- ✅ 生成管理腳本

### 2. **pre-check.sh** - 部署前檢查腳本
在部署前檢查系統環境和項目結構。

**檢查項目**:
- 作業系統版本
- SELinux 狀態
- 網絡連接
- 磁盤空間和記憶體
- 項目文件結構
- 端口占用情況

### 3. **DEPLOYMENT_GUIDE.md** - 完整部署指南
詳細的部署文檔，包含：
- 系統要求
- 步驟說明
- 配置選項
- 故障排除
- 維護指南

### 4. **QUICK_REFERENCE.md** - 快速參考命令
常用命令速查表，包含：
- 服務管理命令
- 日誌查看命令
- 數據庫操作命令
- 系統診斷命令
- 維護命令

## 🚀 快速開始

### 最低系統要求

- **作業系統**: Rocky Linux 9.7
- **CPU**: 2 核心 (建議 4 核心)
- **記憶體**: 2GB (建議 4GB)
- **磁盤**: 10GB 可用空間
- **網絡**: 可訪問網際網路

### 必要的項目結構

確保您的項目包含以下結構：

```
fixture-suite/
├── database/
│   └── init_database.sql         # 必需
├── backend/
│   ├── main.py                   # 必需
│   ├── requirements.txt          # 必需
│   └── ...                       # 其他後端文件
├── frontend/                     # 可選
│   ├── package.json
│   └── ...
├── deployment.sh                 # 部署腳本
├── pre-check.sh                  # 檢查腳本
├── DEPLOYMENT_GUIDE.md           # 部署指南
└── QUICK_REFERENCE.md            # 快速參考
```

### 三步部署

#### 步驟 1: 上傳項目

將整個項目目錄上傳到服務器：

```bash
# 使用 SCP
scp -r fixture-suite/ user@server:/opt/

# 或使用 Git
git clone https://your-repo/fixture-suite.git /opt/fixture-suite
```

#### 步驟 2: 預檢查

```bash
cd /opt/fixture-suite
chmod +x pre-check.sh
sudo ./pre-check.sh
```

如果預檢查通過，繼續下一步。

#### 步驟 3: 執行部署

```bash
chmod +x deployment.sh
sudo ./deployment.sh
```

部署過程大約需要 10-20 分鐘，取決於網絡速度。

## 📋 部署後驗證

### 1. 檢查服務狀態

```bash
# 使用快速腳本
/opt/fixture-management-system/status.sh

# 或手動檢查
systemctl status fixture-management-backend
```

### 2. 訪問應用

```bash
# 獲取服務器 IP
ip addr show | grep "inet " | grep -v 127.0.0.1

# 訪問以下地址（替換為您的服務器 IP）：
# 後端 API: http://YOUR_IP:8000
# API 文檔: http://YOUR_IP:8000/docs
# 前端應用: http://YOUR_IP:3000 (如果有)
```

### 3. 測試 API

```bash
# 健康檢查
curl http://localhost:8000/health

# 查看 OpenAPI 文檔
curl http://localhost:8000/openapi.json
```

## 🔐 重要安全信息

### 數據庫密碼位置

部署完成後，數據庫密碼保存在以下文件：

- **MySQL Root 密碼**: `/root/.mysql_root_password`
- **應用數據庫密碼**: `/root/.mysql_app_password`

⚠️ **請務必妥善保管這些文件！**

### 應用配置文件

位置: `/opt/fixture-management-system/config/.env`

包含所有應用配置，包括：
- 數據庫連接信息
- 應用端口配置
- 安全密鑰
- CORS 設置

## 📚 文檔說明

### 何時查看 DEPLOYMENT_GUIDE.md

- 首次部署前
- 需要了解詳細配置選項
- 遇到問題需要排查
- 需要進行系統維護

### 何時查看 QUICK_REFERENCE.md

- 日常管理操作
- 需要快速查找命令
- 服務管理和監控
- 數據庫操作

## 🛠️ 常用管理命令

### 服務管理

```bash
# 查看狀態
systemctl status fixture-management-backend

# 重啟服務
systemctl restart fixture-management-backend

# 查看日誌
journalctl -u fixture-management-backend -f
```

### 快速腳本

```bash
# 查看系統狀態
/opt/fixture-management-system/status.sh

# 查看最近日誌
/opt/fixture-management-system/logs.sh

# 重啟所有服務
/opt/fixture-management-system/restart.sh
```

## 🔍 故障排除

### 服務無法啟動

```bash
# 查看詳細日誌
journalctl -u fixture-management-backend -n 100

# 手動測試
cd /opt/fixture-management-system/backend
source ../venv/bin/activate
python main.py
```

### 數據庫連接失敗

```bash
# 測試數據庫連接
mysql -u fixture_user -p$(cat /root/.mysql_app_password) fixture_management -e "SELECT 1;"

# 重啟 MySQL
systemctl restart mysqld
```

### 端口被占用

```bash
# 檢查端口占用
ss -tlnp | grep 8000

# 停止占用進程
kill -9 <PID>
```

更多故障排除方法請參考 **DEPLOYMENT_GUIDE.md**。

## 📞 獲取更多幫助

### 收集診斷信息

```bash
# 生成診斷報告
{
    echo "=== 系統信息 ==="
    cat /etc/rocky-release
    uname -a
    echo
    echo "=== 服務狀態 ==="
    systemctl status fixture-management-backend --no-pager
    echo
    echo "=== 最近錯誤 ==="
    journalctl -u fixture-management-backend -n 50 --no-pager
    echo
    echo "=== 磁盤空間 ==="
    df -h
    echo
    echo "=== 記憶體使用 ==="
    free -h
} > /tmp/diagnostic_report.txt

cat /tmp/diagnostic_report.txt
```

## 🔄 更新和升級

### 更新應用代碼

```bash
# 1. 備份
sudo cp -r /opt/fixture-management-system /opt/fixture-management-system.backup

# 2. 更新代碼
cd /opt/fixture-suite
git pull  # 或上傳新文件

# 3. 重新執行部署腳本（會保留數據庫）
sudo ./deployment.sh
```

### 更新系統套件

```bash
# 更新所有套件
sudo dnf update -y

# 重啟服務
sudo systemctl restart fixture-management-backend
```

## 📝 版本信息

- **套件版本**: v4.1
- **創建日期**: 2025-12-15
- **適用系統**: Rocky Linux 9.7
- **Python 版本**: 3.9+
- **MySQL 版本**: 8.0+

## ✅ 部署檢查清單

使用此清單確保完整部署：

- [ ] 系統是 Rocky Linux 9.7
- [ ] SELinux 已禁用或設置為 Permissive
- [ ] 項目結構完整（database/, backend/ 目錄存在）
- [ ] init_database.sql 文件存在
- [ ] requirements.txt 文件存在
- [ ] 執行 pre-check.sh 通過
- [ ] 執行 deployment.sh 成功
- [ ] 服務狀態正常
- [ ] 可以訪問 API 文檔 (http://IP:8000/docs)
- [ ] 數據庫密碼已保存
- [ ] 已測試 API 健康檢查

## 📄 許可證

請根據您的項目許可證要求使用本部署套件。

## 🤝 貢獻

如果您在使用過程中發現問題或有改進建議，請提交 Issue 或 Pull Request。

---

**祝您部署順利！** 🎉

如有任何問題，請參考詳細的 **DEPLOYMENT_GUIDE.md** 或 **QUICK_REFERENCE.md**。
