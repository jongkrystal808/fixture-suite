/**
 * app-auth.js (穩定最終版)
 * - 登入 / 登出
 * - 載入目前使用者
 * - 客戶選擇
 * - user-ready 狀態管理（不再 race）
 */

/* ============================================================
 * 🔐 全域狀態
 * ============================================================ */
window.currentUser = null;
window.currentCustomerId = null;
window.__userReady = false;

/**
 * 安全註冊 user ready callback
 * - 若 user 已 ready：立刻執行
 * - 否則：等 user:ready 事件
 */
function onUserReady(cb) {
  if (window.__userReady) {
    cb();
  } else {
    document.addEventListener("user:ready", cb, { once: true });
  }
}
window.onUserReady = onUserReady;

/* ============================================================
 * 顯示 / 關閉登入視窗
 * ============================================================ */
function showLoginModal() {
  const m = document.getElementById("loginModal");
  if (m) m.style.display = "flex";
}

function closeLogin() {
  const m = document.getElementById("loginModal");
  if (m) m.style.display = "none";
}

/* ============================================================
 * 登入
 * ============================================================ */
async function doLogin() {
  const idEl = document.getElementById("loginId");
  const pwEl = document.getElementById("loginPwd");
  const msg = document.getElementById("loginMsg");

  const username = idEl.value.trim();
  const password = pwEl.value.trim();
  msg.textContent = "";

  if (!username || !password) {
    msg.textContent = "請輸入帳號與密碼";
    pwEl.focus();
    return;
  }

  try {
    const res = await apiLogin(username, password);
    if (res?.access_token) {
      localStorage.setItem("auth_token", res.access_token);
    }

    await loadCurrentUser();
    closeLogin();
  } catch (err) {
    const status = err.status;
    const detail = err.data?.detail || "";
    msg.textContent =
      status === 401 ? "帳號或密碼錯誤" :
      status === 500 ? "伺服器錯誤" :
      detail || "登入失敗";
    pwEl.value = "";
    pwEl.focus();
  }
}

/* ============================================================
 * 登出
 * ============================================================ */
function doLogout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("current_customer_id");

  window.currentUser = null;
  window.currentCustomerId = null;
  window.__userReady = false;

  // 🔥 隱藏客戶選單
  if (window.hideCustomerHeaderSelect) {
    window.hideCustomerHeaderSelect();
  }

  location.reload();
}

/* ============================================================
 * 載入目前使用者（核心）
 * ============================================================ */
async function loadCurrentUser() {
  const token = localStorage.getItem("auth_token");
  const display = document.getElementById("currentUserDisplay");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  if (!token) {
    display.textContent = "未登入";
    btnLogin && (btnLogin.style.display = "inline-flex");
    btnLogout && (btnLogout.style.display = "none");
    showLoginModal();
    return;
  }

  try {
    const user = await apiGetMe();

    // ⭐ 關鍵：user 狀態
    window.currentUser = user;

    // 還原 customer
    const storedCustomerId = localStorage.getItem("current_customer_id");
    window.currentCustomerId = storedCustomerId;

    // UI
    display.textContent =
      (user.full_name || "") +
      (user.username ? ` (${user.username})` : "");
    btnLogin && (btnLogin.style.display = "none");
    btnLogout && (btnLogout.style.display = "inline-flex");

    // 🔥 載入 Header 客戶選單（關鍵！）
    if (window.loadCustomerHeaderSelect) {
      await window.loadCustomerHeaderSelect();
    }

    // ⭐ 宣告 user ready（只會一次）
    if (!window.__userReady) {
      window.__userReady = true;
      document.dispatchEvent(new Event("user:ready"));
    }

    // 若沒選客戶 → 彈出選擇視窗
    if (!storedCustomerId) {
      await loadCustomerSelector();
    }

  } catch (err) {
    console.warn("[auth] token expired");
    localStorage.removeItem("auth_token");
    window.currentUser = null;
    window.__userReady = false;
    showLoginModal();
  }
}

/* ============================================================
 * 客戶選擇
 * ============================================================ */
async function loadCustomerSelector() {
  const list = await apiListCustomers({ page: 1, pageSize: 200 });
  const select = document.getElementById("customerSelect");

  select.innerHTML =
    `<option value="" disabled selected>請選擇客戶</option>`;

  list.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `${c.id} — ${c.customer_abbr || c.id}`;
    select.appendChild(opt);
  });

  document.getElementById("customerSelectModal").showModal();
}

function confirmCustomerSelection() {
  const value = document.getElementById("customerSelect").value;
  if (!value) return;

  localStorage.setItem("current_customer_id", value);
  window.currentCustomerId = value;

  document.getElementById("customerSelectModal").close();

  // 🔥 更新 Header 選單的值
  if (window.setCurrentCustomer) {
    window.setCurrentCustomer(value);
  }

  location.reload();
}

/* ============================================================
 * 全域導出
 * ============================================================ */
window.showLoginModal = showLoginModal;
window.closeLogin = closeLogin;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.loadCurrentUser = loadCurrentUser;
window.loadCustomerSelector = loadCustomerSelector;
window.confirmCustomerSelection = confirmCustomerSelection;

/* ============================================================
 * App Init
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUser();
});