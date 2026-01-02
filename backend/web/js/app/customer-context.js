/* ============================================================
 * Customer Context（全域客戶狀態管理 v2）
 * - Header 下拉切換客戶
 * - 第一次登入強制選擇
 * - 不 reload 頁面
 * ============================================================ */

window.currentCustomerId =
  localStorage.getItem("current_customer_id") || null;

(function normalizeStoredCustomerId() {
  const raw = localStorage.getItem("current_customer_id");
  if (raw && raw.includes(":")) {
    const fixed = raw.split(":")[0];
    console.warn("[customer] normalize stored customer_id:", raw, "→", fixed);
    localStorage.setItem("current_customer_id", fixed);
    window.currentCustomerId = fixed;
  }
})();


/* ============================================================
 * 設定目前客戶（核心）
 * ============================================================ */
function setCurrentCustomer(customerId) {
  if (!customerId) return;

  // ⭐ 核心防線：永遠只接受純 customer_id
  let cleanId = customerId;
  if (typeof cleanId === "string" && cleanId.includes(":")) {
    console.warn("[customer] invalid customer_id detected:", cleanId);
    cleanId = cleanId.split(":")[0];
  }

  window.currentCustomerId = cleanId;
  localStorage.setItem("current_customer_id", cleanId);

  // 更新 Header Select 顯示
  const select = document.getElementById("currentCustomerSelect");
  if (select) {
    select.value = cleanId;
    select.classList.remove("hidden");
  }

  console.log("[customer] switched to:", cleanId);

  // refreshModulesAfterCustomerChange();
    console.log("[login] user ready");

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

  // 修改：登入後就顯示選單，不管有沒有選過客戶
  select.classList.remove("hidden");

  // 如果之前有選過客戶，就設定預設值
  if (window.currentCustomerId) {
    select.value = window.currentCustomerId;
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
  // 找出目前顯示中的主 tab
  const activeTab = document.querySelector(
    'section[id^="tab-"]:not(.hidden)'
  );

  if (!activeTab) {
    console.warn("[customer] no active tab found");
    return;
  }

  const tabId = activeTab.id;
  console.log("[customer] refresh for tab:", tabId);

  switch (tabId) {
    case "tab-dashboard":
      window.loadDashboard?.();
      break;

    case "tab-receipts":
      // 依目前子頁再細分（收料 / 退料 / 總檢視）
      const activeSub = document.querySelector(
        '#tab-receipts [data-rtab].subtab-active'
      )?.dataset?.rtab;

      if (activeSub === "receipts") {
        window.loadReceipts?.();
      } else if (activeSub === "returns") {
        window.loadReturns?.();
      } else if (activeSub === "viewall") {
        window.loadTransactionViewAll?.();
      }
      break;

    case "tab-query":
      // 依查詢類型決定
      const type = document.getElementById("queryType")?.value;
      if (type === "model") {
        window.loadModelsQuery?.();
      } else {
        window.loadFixturesQuery?.();
      }
      break;

    case "tab-stats":
      window.loadStats?.();
      break;

    case "tab-admin":
      // admin 再看是哪個子頁
      const activeAdmin = document.querySelector(
        ".admin-page:not(.hidden)"
      )?.id;

      if (activeAdmin === "admin-owners") {
        window.loadOwners?.();
      } else if (activeAdmin === "admin-users") {
        window.loadUsers?.();
      } else if (activeAdmin === "admin-fixtures") {
        window.loadAdminFixtures?.();
      }
      break;

    default:
      console.warn("[customer] no refresh handler for", tabId);
  }
}


/* ============================================================
 * 登出時隱藏客戶選單
 * ============================================================ */
function hideCustomerHeaderSelect() {
  const select = document.getElementById("currentCustomerSelect");
  if (select) {
    select.classList.add("hidden");
    select.value = "";
  }
}

/* ============================================================
 * 導出全域
 * ============================================================ */
window.setCurrentCustomer = setCurrentCustomer;
window.switchCustomerFromHeader = switchCustomerFromHeader;
window.loadCustomerHeaderSelect = loadCustomerHeaderSelect;
window.loadCustomerSelector = loadCustomerSelector;
window.confirmCustomerSelection = confirmCustomerSelection;
window.hideCustomerHeaderSelect = hideCustomerHeaderSelect;