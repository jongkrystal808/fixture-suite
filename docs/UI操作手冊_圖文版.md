# Fixture-M UI 圖文操作手冊

版本：v1.0（圖文模板）  
更新日期：2026-03-06

本文件是「可直接填圖」模板。請先依 `docs/screenshots/README.md` 放置截圖，再由我幫你補齊最終圖文版。

## 0. 截圖索引
| 編號 | 檔名 | 畫面內容 |
|---|---|---|
| 01 | `01-login-modal.png` | 登入視窗 |
| 02 | `02-dashboard-home.png` | 首頁總覽 |
| 03 | `03-header-customer-switch.png` | 頂部客戶切換 |
| 04 | `04-nav-operations.png` | 左側操作中心選單 |
| 05 | `05-tx-form-register.png` | 收退料新增表單 |
| 06 | `06-tx-view-all.png` | 收退料總檢視 |
| 07 | `07-usage-form.png` | 使用記錄輸入 |
| 08 | `08-replacement-form.png` | 更換記錄輸入 |
| 09 | `09-inventory-overview.png` | 在庫總覽 |
| 10 | `10-lifecycle-analysis.png` | 壽命分析 |
| 11 | `11-query-center.png` | 查詢中心 |
| 12 | `12-admin-fixtures.png` | 資訊管理-治具管理 |
| 13 | `13-admin-stations.png` | 資訊管理-站點管理 |
| 14 | `14-admin-models.png` | 資訊管理-機種管理 |
| 15 | `15-admin-owners.png` | 資訊管理-負責人管理 |

---

## 1. 登入與客戶切換
### 1.1 登入
1. 開啟系統首頁。
2. 在登入視窗輸入帳號與密碼。
3. 點擊「登入」。

![登入視窗](./screenshots/01-login-modal.png)

### 1.2 登入後首頁
- 登入成功後進入首頁總覽。
- 可查看今日收料、今日退料、即將更換治具等資訊。

![首頁總覽](./screenshots/02-dashboard-home.png)

### 1.3 切換客戶
1. 點擊頂部客戶下拉選單。
2. 選擇目標客戶。
3. 系統會依客戶重新載入資料。

![客戶切換](./screenshots/03-header-customer-switch.png)

---

## 2. 操作中心（收退料 / 使用 / 更換）
### 2.1 進入操作中心
- 從左側選單進入「操作中心」。

![操作中心入口](./screenshots/04-nav-operations.png)

### 2.2 收料/退料登錄
1. 點「記錄收料/退料」。
2. 點「新增交易記錄」。
3. 依需求選擇 `batch / individual / datecode`。
4. 填寫必要欄位（治具 ID、來源類型、序號或 datecode/數量）。
5. 點「提交」。

![收退料表單](./screenshots/05-tx-form-register.png)

### 2.3 收退料查詢
1. 切到「收/退料總檢視」。
2. 以治具、單號、日期、序號或 datecode 條件查詢。

![收退料總檢視](./screenshots/06-tx-view-all.png)

### 2.4 使用記錄
1. 點「記錄治具使用」。
2. 輸入治具、機種、站點與使用次數。
3. 若為序號模式，填序號清單或區間。
4. 提交後確認結果。

![使用記錄](./screenshots/07-usage-form.png)

### 2.5 更換記錄
1. 點「記錄治具更換」。
2. 選擇 `serial` 或 `fixture`。
3. 選擇 `scrap` 或 `maintenance`。
4. 填寫必要欄位後提交。

![更換記錄](./screenshots/08-replacement-form.png)

---

## 3. 庫存與壽命
### 3.1 在庫總覽
- 查看在庫、部署、維修、報廢等狀態。

![在庫總覽](./screenshots/09-inventory-overview.png)

### 3.2 壽命分析
- 查看 normal / warning / expired 狀態與相關趨勢。

![壽命分析](./screenshots/10-lifecycle-analysis.png)

---

## 4. 查詢中心
1. 進入「查詢中心」。
2. 依關鍵字查詢治具或機種。
3. 可點擊「關聯機種」或「關聯治具」快速反查。

![查詢中心](./screenshots/11-query-center.png)

---

## 5. 資訊管理（Admin）
> 需管理員權限。

### 5.1 治具管理
![治具管理](./screenshots/12-admin-fixtures.png)

### 5.2 站點管理
![站點管理](./screenshots/13-admin-stations.png)

### 5.3 機種管理
![機種管理](./screenshots/14-admin-models.png)

### 5.4 負責人管理
![負責人管理](./screenshots/15-admin-owners.png)

---

## 6. 常見操作提醒
- 每次操作前確認右上角目前客戶。
- 序號建議固定格式（必要時補零）。
- 匯入前先下載範本並保留欄位名稱。
- 若顯示無權限，確認是否為 admin 帳號或權限範圍是否包含該客戶。
