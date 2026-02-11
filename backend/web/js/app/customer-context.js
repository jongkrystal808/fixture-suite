/* ============================================================
 * Customer Context（v4.x FINAL）
 *
 * ✔ customer = permission context
 * ✔ 不再呼叫 customer CRUD API
 * ✔ customer 清單只來自 currentUser.allowed_customers
 * ✔ 負責：
 *   - 記住目前 customer
 *   - 切換 customer
 *   - 發出 customer-ready
 *   - 切換後刷新 UI（不 reload）
 * ============================================================ */

/* ============================================================
 * 全域狀態
 * ============================================================ */
window.currentCustomerId =
  localStorage.getItem("current_customer_id") || null;

// ⭐ 關鍵：customer 是否已 ready
window.__customerReady = false;

/* ============================================================
 * 防呆：修正舊格式 customer_id（例如 moxa:xxx）
 * ============================================================ */
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
 * 取得「允許的 customer 清單」
 * 👉 唯一來源：currentUser
 * ============================================================ */
function getAllowedCustomers() {
  const user = window.currentUser;
  if (!user) return [];

  // v4.x：後端標準格式
  if (Array.isArray(user.allowed_customers)) {
    return user.allowed_customers;
  }

  // 相容舊格式
  if (typeof user.customer_id === "string") {
    return [user.customer_id];
  }

  return [];
}

/* ============================================================
 * customer ready helper（給其他模組用）
 * ============================================================ */
function onCustomerReady(cb) {
  if (window.__customerReady) {
    cb();
  } else {
    document.addEventListener("customer:ready", cb, { once: true });
  }
}
window.onCustomerReady = onCustomerReady;

/* ============================================================
 * 設定目前 customer（核心）
 * ============================================================ */
function setCurrentCustomer(customerId) {
  if (!customerId) return;

  const allowed = getAllowedCustomers();
  if (!allowed.includes(customerId)) {
    console.error(
      "[customer] forbidden customer:",
      customerId,
      "allowed:",
      allowed
    );
    alert("無權限切換到該客戶");
    return;
  }

  window.currentCustomerId = customerId;
  localStorage.setItem("current_customer_id", customerId);

  // 更新 Header Select
  const select = document.getElementById("currentCustomerSelect");
  if (select) {
    select.value = customerId;
    select.classList.remove("hidden");
  }

  // ⭐ 宣告 customer ready（只做一次）
  if (!window.__customerReady) {
    window.__customerReady = true;
    document.dispatchEvent(new Event("customer:ready"));
  }

  console.log("[customer] switched to:", customerId);

  refreshModulesAfterCustomerChange();
}

/* ============================================================
 * Header 下拉切換
 * ============================================================ */
function switchCustomerFromHeader(customerId) {
  if (!customerId || customerId === window.currentCustomerId) return;

  const ok = confirm(`確定要切換客戶為「${customerId}」？`);
  if (!ok) {
    const select = document.getElementById("currentCustomerSelect");
    if (select) select.value = window.currentCustomerId || "";
    return;
  }

  setCurrentCustomer(customerId);
}

/* ============================================================
 * 初始化 Header customer select
 * ============================================================ */
async function initCustomerHeaderSelect() {
  const select = document.getElementById("currentCustomerSelect");
  if (!select) return;

  try {
    // ⭐ 呼叫 customers API
    const list = await api("/customers?limit=100");

    if (!Array.isArray(list) || list.length === 0) {
      select.classList.add("hidden");
      return;
    }

    select.innerHTML = `<option value="">--</option>`;

    list
      .filter(c => c.is_active) // 只顯示啟用
      .forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;

        // ⭐ 顯示名稱
        opt.textContent = c.customer_abbr || c.id;

        select.appendChild(opt);
      });

    select.classList.remove("hidden");

    if (window.currentCustomerId) {
      select.value = window.currentCustomerId;
    }

  } catch (err) {
    console.error("載入客戶失敗", err);
  }
}


/* ============================================================
 * 第一次登入：強制選 customer（若多個）
 * ============================================================ */
function ensureCustomerSelected() {
  const customers = getAllowedCustomers();

  // 只有一個 → 自動選
  if (customers.length === 1 && !window.currentCustomerId) {
    setCurrentCustomer(customers[0]);
    return;
  }

  if (customers.length <= 1) return;
  if (window.currentCustomerId) return;

  const select = document.getElementById("customerSelect");
  const modal = document.getElementById("customerSelectModal");
  if (!select || !modal) return;

  select.innerHTML =
    `<option value="" disabled selected>請選擇客戶</option>`;

  customers.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id;
    select.appendChild(opt);
  });

  modal.showModal();
}

function confirmCustomerSelection() {
  const select = document.getElementById("customerSelect");
  const value = select?.value;
  if (!value) return;

  document.getElementById("customerSelectModal")?.close();
  setCurrentCustomer(value);
}

/* ============================================================
 * 客戶切換後刷新模組（不 reload）
 * ============================================================ */
function refreshModulesAfterCustomerChange() {
  const activeTab = document.querySelector(
    'section[id^="tab-"]:not(.hidden)'
  );
  if (!activeTab) return;

  const tabId = activeTab.id;

  switch (tabId) {
    case "tab-dashboard":
      window.loadDashboard?.();
      break;

    case "tab-receipts": {
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
    }

    case "tab-query": {
      const type = document.getElementById("queryType")?.value;
      if (type === "model") {
        window.loadModelsQuery?.();
      } else {
        window.loadFixturesQuery?.();
      }
      break;
    }

    case "tab-stats":
      window.loadStats?.();
      break;

    case "tab-admin": {
      const activeAdmin = document.querySelector(
        ".admin-page:not(.hidden)"
      )?.id;

      if (activeAdmin === "admin-owners") {
        window.loadOwners?.();
      } else if (activeAdmin === "admin-fixtures") {
        window.loadAdminFixtures?.();
      }
      break;
    }

    default:
      console.warn("[customer] no refresh handler for", tabId);
  }
}

/* ============================================================
 * 登出時隱藏 Header select
 * ============================================================ */
function hideCustomerHeaderSelect() {
  const select = document.getElementById("currentCustomerSelect");
  if (select) {
    select.classList.add("hidden");
    select.value = "";
  }
}

/* ============================================================
 * user ready 後初始化（只做 customer UI，不載業務）
 * ============================================================ */
window.onUserReady?.(() => {
  initCustomerHeaderSelect();
  ensureCustomerSelected();
});

/* ============================================================
 * 全域導出
 * ============================================================ */
window.setCurrentCustomer = setCurrentCustomer;
window.switchCustomerFromHeader = switchCustomerFromHeader;
window.confirmCustomerSelection = confirmCustomerSelection;
window.hideCustomerHeaderSelect = hideCustomerHeaderSelect;