# 如何獲取和使用部署文件

> 詳細說明如何將部署文件傳送到伺服器的所有方法

---

## 🎯 您現在的情況

您有以下文件需要傳到 Rocky Linux 伺服器：

1. **deploy.sh** - 自動部署腳本（15KB）
2. **manage.sh** - 系統管理工具（8.5KB）
3. **DEPLOYMENT_GUIDE_ROCKY9.md** - 完整部署指南（24KB）
4. **QUICK_START.md** - 快速開始指南（8.3KB）
5. **您的應用程式代碼**（整個專案）

---

## 📦 方法總覽

| 方法 | 難度 | 適用情況 | 推薦度 |
|------|------|----------|--------|
| [方法 1: Git Clone](#方法-1-使用-git-clone推薦) | 簡單 | 代碼在 GitHub/GitLab | ⭐⭐⭐⭐⭐ |
| [方法 2: SCP 傳輸](#方法-2-使用-scp-傳輸) | 中等 | 本機有文件 | ⭐⭐⭐⭐ |
| [方法 3: 直接複製貼上](#方法-3-直接複製貼上) | 簡單 | 文件不多 | ⭐⭐⭐ |
| [方法 4: HTTP 下載](#方法-4-通過-http-下載) | 簡單 | 有文件伺服器 | ⭐⭐⭐⭐ |
| [方法 5: USB/光碟](#方法-5-使用-usb-或光碟) | 複雜 | 離線環境 | ⭐⭐ |

---

## 方法 1: 使用 Git Clone（推薦）

### 適用情況
- ✅ 您的代碼已經在 GitHub、GitLab 或其他 Git 平台
- ✅ 伺服器可以訪問 Internet
- ✅ 最簡單、最推薦的方式

### 步驟

#### Step 1: 將代碼推送到 Git 倉庫

**如果還沒有推送到 Git：**

```bash
# 在您的本機電腦上（開發環境）

# 初始化 Git（如果還沒有）
cd /path/to/your/fixture-management-system
git init

# 創建 .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/

# 敏感資料
.env
*.pem
*.key

# 日誌
*.log

# 上傳文件
uploads/*

# IDE
.vscode/
.idea/
*.swp
EOF

# 添加所有文件
git add .
git commit -m "Initial commit"

# 連接到 GitHub（需要先在 GitHub 創建倉庫）
git remote add origin https://github.com/your-username/fixture-management.git
git branch -M main
git push -u origin main
```

**將部署腳本也加入倉庫：**

```bash
# 將您下載的部署腳本放入專案根目錄
cp ~/Downloads/deploy.sh .
cp ~/Downloads/manage.sh .
cp ~/Downloads/*.md .

# 提交
git add deploy.sh manage.sh *.md
git commit -m "Add deployment scripts"
git push
```

#### Step 2: 在伺服器上 Clone

```bash
# SSH 登入到 Rocky Linux 伺服器
ssh root@192.168.1.100

# 安裝 Git（如果還沒有）
sudo dnf install -y git

# Clone 倉庫
cd /opt
git clone https://github.com/your-username/fixture-management.git fixture-app

# 或使用 HTTPS + Token（私有倉庫）
git clone https://your-token@github.com/your-username/fixture-management.git fixture-app

# 進入目錄
cd fixture-app
ls -lh

# 您應該看到：
# deploy.sh
# manage.sh
# backend/
# web/
# database/
# requirements.txt
# ...
```

#### Step 3: 執行部署

```bash
# 賦予執行權限
chmod +x deploy.sh manage.sh

# 執行部署
sudo bash deploy.sh
```

### 優點
- ✅ 最簡單
- ✅ 可以輕鬆更新（git pull）
- ✅ 有版本控制
- ✅ 團隊協作方便

### 缺點
- ❌ 需要網路連接
- ❌ 如果是私有倉庫，需要設定認證

---

## 方法 2: 使用 SCP 傳輸

### 適用情況
- ✅ 您在本機有完整的文件
- ✅ 不想或無法使用 Git
- ✅ 一次性部署

### Windows 使用者

#### 使用 WinSCP（圖形界面，推薦）

1. **下載並安裝 WinSCP**
   - 官網：https://winscp.net/
   - 選擇 "Installation package"
   - 下載後直接安裝

2. **啟動 WinSCP**
   
3. **新建連接**
   - 檔案協議：`SFTP`
   - 主機名稱：`192.168.1.100`（您的伺服器 IP）
   - 端口：`22`
   - 使用者名稱：`root`
   - 密碼：`您的密碼`

4. **點擊「登入」**

5. **上傳文件**
   - 左邊視窗：您的本機電腦
   - 右邊視窗：伺服器
   
   - 在右邊導航到 `/opt/`
   - 在左邊找到您的 `fixture-management-system` 資料夾
   - 將整個資料夾拖拽到右邊

6. **等待上傳完成**

7. **驗證**
   ```bash
   # 在 PuTTY 或 PowerShell SSH 會話中
   ls -lh /opt/fixture-management-system
   ```

#### 使用 PowerShell（命令行）

```powershell
# 在 Windows PowerShell 中

# 上傳單個文件
scp C:\Users\YourName\Downloads\deploy.sh root@192.168.1.100:/root/

# 上傳整個目錄
scp -r C:\Users\YourName\Projects\fixture-management root@192.168.1.100:/opt/

# 輸入密碼後等待上傳完成
```

### macOS / Linux 使用者

```bash
# 上傳單個文件
scp ~/Downloads/deploy.sh root@192.168.1.100:/root/

# 上傳整個目錄
scp -r ~/Projects/fixture-management root@192.168.1.100:/opt/

# 或使用 rsync（更高效）
rsync -avz -e ssh ~/Projects/fixture-management/ root@192.168.1.100:/opt/fixture-app/

# 參數說明：
# -a: 保留權限和時間戳
# -v: 顯示詳細資訊
# -z: 壓縮傳輸
# -e ssh: 使用 SSH 協議
```

### 上傳後的步驟

```bash
# SSH 登入伺服器
ssh root@192.168.1.100

# 檢查文件
ls -lh /opt/fixture-management-system

# 如果目錄名稱不對，重命名
mv /opt/fixture-management-system /opt/fixture-app

# 賦予執行權限
cd /opt/fixture-app
chmod +x deploy.sh manage.sh

# 執行部署
sudo bash deploy.sh
```

---

## 方法 3: 直接複製貼上

### 適用情況
- ✅ 只有少量文件需要傳輸（如部署腳本）
- ✅ 不熟悉其他工具
- ✅ 快速測試

### 步驟

#### Step 1: 準備文件內容

在您的電腦上：
1. 用文字編輯器打開 `deploy.sh`
2. 全選所有內容（Ctrl+A 或 Cmd+A）
3. 複製（Ctrl+C 或 Cmd+C）

#### Step 2: 在伺服器上創建文件

```bash
# SSH 登入伺服器
ssh root@192.168.1.100

# 創建工作目錄
mkdir -p /root/fixture-deployment
cd /root/fixture-deployment

# 創建文件並編輯
vim deploy.sh

# 或使用 nano（對新手更友好）
nano deploy.sh
```

#### Step 3: 貼上內容

**使用 vim：**
```
1. 按 i 進入插入模式
2. 右鍵點擊 → 貼上（或 Shift+Insert）
3. 按 ESC 退出插入模式
4. 輸入 :wq 保存並退出
```

**使用 nano：**
```
1. 直接右鍵點擊 → 貼上（或 Shift+Insert）
2. 按 Ctrl+X 退出
3. 按 Y 確認保存
4. 按 Enter 確認文件名
```

#### Step 4: 重複其他文件

```bash
# 創建 manage.sh
nano manage.sh
# 貼上內容，保存

# 賦予執行權限
chmod +x deploy.sh manage.sh

# 驗證
ls -lh
cat deploy.sh | head -20
```

### 優點
- ✅ 不需要額外工具
- ✅ 適合小文件

### 缺點
- ❌ 容易出錯（格式問題）
- ❌ 不適合大量文件
- ❌ 不適合二進制文件

---

## 方法 4: 通過 HTTP 下載

### 適用情況
- ✅ 您有一個可訪問的 Web 伺服器
- ✅ 文件已經托管在某處
- ✅ 最方便的遠程下載方式

### 選項 A: 使用 GitHub Raw URL

如果文件在 GitHub：

```bash
# 在伺服器上
cd /root/fixture-deployment

# 下載單個文件
curl -O https://raw.githubusercontent.com/your-username/fixture-management/main/deploy.sh

# 或使用 wget
wget https://raw.githubusercontent.com/your-username/fixture-management/main/deploy.sh

# 下載多個文件
curl -O https://raw.githubusercontent.com/your-username/fixture-management/main/manage.sh
curl -O https://raw.githubusercontent.com/your-username/fixture-management/main/DEPLOYMENT_GUIDE_ROCKY9.md

# 賦予執行權限
chmod +x deploy.sh manage.sh
```

### 選項 B: 使用臨時文件分享服務

1. **將文件上傳到分享服務**
   - https://transfer.sh/
   - https://wetransfer.com/
   - Google Drive
   - Dropbox

2. **在伺服器下載**

**從 transfer.sh：**
```bash
# 在本機上傳
curl --upload-file deploy.sh https://transfer.sh/deploy.sh

# 會返回一個 URL，例如：
# https://transfer.sh/abc123/deploy.sh

# 在伺服器下載
curl -O https://transfer.sh/abc123/deploy.sh
```

**從 Google Drive：**
```bash
# 1. 在 Google Drive 分享文件，設為「任何人都可以查看」
# 2. 複製分享連結：https://drive.google.com/file/d/FILE_ID/view
# 3. 在伺服器下載
wget --no-check-certificate 'https://docs.google.com/uc?export=download&id=FILE_ID' -O deploy.sh
```

### 選項 C: 架設臨時 HTTP 伺服器

**在您的本機電腦：**

```bash
# Python 3
cd /path/to/your/files
python3 -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080

# 會顯示：Serving HTTP on 0.0.0.0 port 8080
```

**在伺服器下載：**

```bash
# 假設您的電腦 IP 是 192.168.1.50
curl -O http://192.168.1.50:8080/deploy.sh
curl -O http://192.168.1.50:8080/manage.sh
```

**注意：** 
- 確保您的電腦和伺服器在同一網路
- 關閉本機防火牆或開放 8080 端口

---

## 方法 5: 使用 USB 或光碟

### 適用情況
- ✅ 伺服器無法訪問 Internet
- ✅ 離線環境
- ✅ 物理訪問伺服器

### 步驟

1. **在本機準備文件**
   ```bash
   # 打包所有文件
   tar -czf fixture-deployment.tar.gz fixture-management-system/
   
   # 或製作 zip
   zip -r fixture-deployment.zip fixture-management-system/
   ```

2. **複製到 USB**
   - 將壓縮檔複製到 USB 隨身碟

3. **插入伺服器**
   - 將 USB 插入伺服器

4. **掛載 USB**
   ```bash
   # 查看 USB 設備
   lsblk
   
   # 通常是 /dev/sdb1 或類似
   # 創建掛載點
   mkdir -p /mnt/usb
   
   # 掛載
   mount /dev/sdb1 /mnt/usb
   
   # 查看內容
   ls /mnt/usb
   ```

5. **複製文件**
   ```bash
   # 複製到伺服器
   cp /mnt/usb/fixture-deployment.tar.gz /opt/
   
   # 解壓縮
   cd /opt
   tar -xzf fixture-deployment.tar.gz
   
   # 卸載 USB
   umount /mnt/usb
   ```

---

## 📝 實戰範例

### 情境 1: 我在公司內網，有 GitLab

```bash
# 1. 推送代碼到 GitLab
git remote add origin https://gitlab.company.com/project/fixture.git
git push -u origin main

# 2. 在伺服器 Clone
ssh admin@server-ip
git clone https://gitlab.company.com/project/fixture.git /opt/fixture-app

# 3. 執行部署
cd /opt/fixture-app
chmod +x deploy.sh
sudo bash deploy.sh
```

### 情境 2: 我在家裡，用 Windows 電腦

```
1. 下載並安裝 WinSCP
2. 連接到伺服器
3. 拖拽整個專案資料夾到 /opt/
4. 用 PuTTY 連接執行：
   cd /opt/fixture-app
   chmod +x deploy.sh
   sudo bash deploy.sh
```

### 情境 3: 我只有部署腳本，沒有代碼

```bash
# 1. 複製 deploy.sh 內容
# 2. SSH 登入伺服器
ssh root@server-ip

# 3. 創建文件
cat > /root/deploy.sh << 'EOF'
# 貼上完整的 deploy.sh 內容
EOF

# 4. 執行
chmod +x /root/deploy.sh
sudo bash /root/deploy.sh

# 5. 腳本會提示輸入 Git URL，或跳過手動上傳
```

### 情境 4: 離線環境

```bash
# 在有網路的電腦上
1. 下載所有依賴
   pip download -r requirements.txt -d /tmp/packages
   
2. 打包
   tar -czf offline-deployment.tar.gz \
       fixture-app/ \
       /tmp/packages/ \
       deploy.sh \
       manage.sh

3. 複製到 USB

# 在伺服器上
1. 掛載 USB
   mount /dev/sdb1 /mnt/usb
   
2. 複製並解壓
   cp /mnt/usb/offline-deployment.tar.gz /opt/
   cd /opt
   tar -xzf offline-deployment.tar.gz
   
3. 離線安裝依賴
   cd fixture-app
   pip install --no-index --find-links=/opt/packages -r requirements.txt
```

---

## 🔍 驗證文件傳輸

不管使用哪種方法，都要驗證：

```bash
# 檢查文件是否存在
ls -lh /opt/fixture-app/

# 應該看到類似：
# drwxr-xr-x. 4 root root  128 Dec 15 10:00 backend
# drwxr-xr-x. 4 root root  128 Dec 15 10:00 web
# drwxr-xr-x. 2 root root   64 Dec 15 10:00 database
# -rwxr-xr-x. 1 root root  15K Dec 15 10:00 deploy.sh
# -rwxr-xr-x. 1 root root 8.5K Dec 15 10:00 manage.sh
# -rw-r--r--. 1 root root 1.2K Dec 15 10:00 requirements.txt

# 檢查文件內容（前 20 行）
head -20 /opt/fixture-app/deploy.sh

# 檢查文件完整性（如果有 md5）
md5sum /opt/fixture-app/deploy.sh

# 檢查目錄結構
tree /opt/fixture-app -L 2
# 或
find /opt/fixture-app -maxdepth 2 -type f
```

---

## 💡 常見問題

### Q1: 我不知道伺服器 IP

```bash
# 在伺服器上執行
ip addr show

# 或
hostname -I

# 找到類似 192.168.x.x 或 10.x.x.x 的 IP
```

### Q2: SSH 連接被拒絕

```bash
# 檢查 SSH 服務是否運行
sudo systemctl status sshd

# 啟動 SSH
sudo systemctl start sshd
sudo systemctl enable sshd

# 檢查防火牆
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### Q3: Permission denied

```bash
# 使用正確的使用者（通常是 root）
ssh root@server-ip

# 或使用有 sudo 權限的使用者
ssh admin@server-ip
sudo su -
```

### Q4: 文件傳輸中斷

```bash
# 使用 rsync 續傳
rsync -avz --partial -e ssh local-dir/ user@server:/remote-dir/

# --partial: 保留部分傳輸的文件，支援續傳
```

### Q5: 傳輸速度很慢

```bash
# 使用壓縮傳輸
scp -C large-file.tar.gz user@server:/path/

# 或先壓縮
tar -czf - directory/ | ssh user@server 'tar -xzf - -C /path/'
```

---

## 🎯 推薦流程

根據您的情況選擇：

**如果您熟悉 Git：**
```
Git Clone → 執行 deploy.sh
```

**如果您使用 Windows：**
```
WinSCP 上傳 → PuTTY 執行
```

**如果您使用 macOS/Linux：**
```
SCP 傳輸 → SSH 執行
```

**如果是測試/學習：**
```
複製貼上文件內容 → 執行
```

---

## 📚 下一步

文件傳輸完成後：

1. 查看：[DETAILED_DEPLOYMENT_GUIDE.md](./DETAILED_DEPLOYMENT_GUIDE.md)
2. 執行部署
3. 驗證系統
4. 開始使用

需要幫助？查看完整的部署指南！
