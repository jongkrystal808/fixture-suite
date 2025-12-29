/* ============================================================
 * Customer Context（全域客戶狀態管理 v2）
 * - Header 下拉切換客戶
 * - 第一次登入強制選擇
 * - 不 reload 頁面
 * ============================================================ */

window.currentCustomerId =
  localStorage.getItem("current_customer_id") || null;

/* ============================================================
 * 設定目前客戶（核心）
 * ============================================================ */
function setCurrentCustomer(customerId) {
  if (!customerId) return;

  window.currentCustomerId = customerId;
  localStorage.setItem("current_customer_id", customerId);

  // 更新 Header Select 顯示
  const select = document.getElementById("currentCustomerSelect");
  if (select) {
    select.value = customerId;
    select.classList.remove("hidden");
  }

  console.log("[customer] switched to:", customerId);

  // 通知其他模組（有就執行，沒有不爆）
  refreshModulesAfterCustomerChange();
}

/* ============================================================
 * Header 下拉切換
 * ============================================================ */
function switchCustomerFromHeader(customerId) {
  if (!customerId || customerId === window.currentCustomerId) return;

  const ok = confirm(`確定要切換客戶為「${customerId}」？`);
  if (!ok) {
    // 還原 select
    const select = document.getElementById("currentCustomerSelect");
    if (select) select.value = window.currentCustomerId || "";
    return;
  }

  setCurrentCustomer(customerId);
}

/* ============================================================
 * 載入客戶清單 → Header Select
 * ============================================================ */
async function loadCustomerHeaderSelect() {
  const select = document.getElementById("currentCustomerSelect");
  if (!select) return;

  const list = await apiListCustomers({ page: 1, pageSize: 200 });

  select.innerHTML = `<option value="">客戶：--</option>`;

  list.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.id}${c.customer_abbr ? " — " + c.customer_abbr : ""}`;
    select.appendChild(opt);
  });

  if (window.currentCustomerId) {
    select.value = window.currentCustomerId;
    select.classList.remove("hidden");
  }
}

/* ============================================================
 * 第一次登入：強制選客戶（沿用 modal）
 * ============================================================ */
async function loadCustomerSelector() {
  const list = await apiListCustomers({ page: 1, pageSize: 200 });

  const select = document.getElementById("customerSelect");
  if (!select) return;

  select.innerHTML = `<option value="" disabled selected>請選擇客戶</option>`;

  list.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.id}${c.customer_abbr ? " — " + c.customer_abbr : ""}`;
    select.appendChild(opt);
  });

  document.getElementById("customerSelectModal")?.showModal();
}

function confirmCustomerSelection() {
  const select = document.getElementById("customerSelect");
  const customerId = select?.value;
  if (!customerId) return;

  document.getElementById("customerSelectModal")?.close();
  setCurrentCustomer(customerId);
}

/* ============================================================
 * 客戶切換後刷新模組（不 reload）
 * ============================================================ */
function refreshModulesAfterCustomerChange() {
  // 收 / 退料
  window.loadReceipts?.();
  window.loadReturns?.();
  window.loadTransactionViewAll?.();

  // 查詢
  window.loadFixturesQuery?.();
  window.loadModelsQuery?.();

  // Dashboard / 統計
  window.loadDashboard?.();
  window.loadStats?.();
}

/* ============================================================
 * 導出全域
 * ============================================================ */
window.setCurrentCustomer = setCurrentCustomer;
window.switchCustomerFromHeader = switchCustomerFromHeader;
window.loadCustomerHeaderSelect = loadCustomerHeaderSelect;
window.loadCustomerSelector = loadCustomerSelector;
window.confirmCustomerSelection = confirmCustomerSelection;
