/**
 * app-auth.js (優化完整版本)
 * - 登入
 * - 登出
 * - 自動載入目前使用者
 * - customer_id 選擇器
 * - 全域函式 export
 */

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
 * 登入流程（新版錯誤處理）
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

    if (res && res.access_token) {
      localStorage.setItem("auth_token", res.access_token);
    }

    await loadCurrentUser();
    closeLogin();

  } catch (err) {
    console.error("login error:", err);

    const status = err.status;
    const detail = err.data?.detail || "";

    if (status === 401) {
      msg.textContent = "帳號或密碼錯誤，請再試一次";
    } else if (status === 500) {
      msg.textContent = "伺服器錯誤，請聯絡管理員";
    } else {
      msg.textContent = detail || "登入失敗，請稍後再試";
    }

    pwEl.value = "";
    pwEl.focus();
  }
}

/* ============================================================
 * 登出
 * ============================================================ */

function doLogout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("current_customer_id"); // ★ 關鍵

  const display = document.getElementById("currentUserDisplay");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  if (display) display.textContent = "未登入";
  if (btnLogin) btnLogin.style.display = "inline-flex";
  if (btnLogout) btnLogout.style.display = "none";

    window.currentCustomerId = null;
  window.currentUser = null;

  location.reload();

  showLoginModal();
}

/* ============================================================
 * 自動載入目前使用者
 * ============================================================ */

async function loadCurrentUser() {
  const token = localStorage.getItem("auth_token");

  const display = document.getElementById("currentUserDisplay");
  const btnLogin = document.getElementById("btnLogin");
  const btnLogout = document.getElementById("btnLogout");

  if (!token) {
    display.textContent = "未登入";
    if (btnLogin) btnLogin.style.display = "inline-flex";
    if (btnLogout) btnLogout.style.display = "none";
    showLoginModal();
    return;
  }

  try {
    const user = await apiGetMe();

    const userText =
      (user.full_name ? user.full_name : "") +
      (user.username ? ` (${user.username})` : "");

    display.textContent = userText || "使用者";

    if (btnLogin) btnLogin.style.display = "none";
    if (btnLogout) btnLogout.style.display = "inline-flex";

  } catch (err) {
    console.warn("Token 已失效，重新登入");

    localStorage.removeItem("auth_token");
    display.textContent = "未登入";

    if (btnLogin) btnLogin.style.display = "inline-flex";
    if (btnLogout) btnLogout.style.display = "none";

    showLoginModal();
    return;
  }

  const storedCustomerId = localStorage.getItem("current_customer_id");
  window.currentCustomerId = storedCustomerId;

  if (!storedCustomerId) {
    await loadCustomerSelector();
  }
}

/* ============================================================
 * 客戶選擇器（第一次登入必須選客戶）
 * ============================================================ */

async function loadCustomerSelector() {
  const list = await apiListCustomers({ page: 1, pageSize: 200 });

  const select = document.getElementById("customerSelect");
  select.innerHTML = `<option value="" disabled selected>請選擇客戶</option>`;

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
  location.reload(); // 切換客戶後重新載入頁面
}
function afterLoginSuccess() {
  const cid = localStorage.getItem("current_customer_id");

  if (!cid) {
    // 第一次登入 → 一定要選客戶
    document.getElementById("customerSelectModal").showModal();
  } else {
    // 已有客戶 → 顯示在 header
    setCurrentCustomer(cid);
  }
}

/* ============================================================
 * 全域掛載（最重要）
 * ============================================================ */

window.showLoginModal = showLoginModal;
window.closeLogin = closeLogin;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.loadCurrentUser = loadCurrentUser;
window.loadCustomerSelector = loadCustomerSelector;
window.confirmCustomerSelection = confirmCustomerSelection;

// =====================================================
// 🚀 App Init（關鍵）
// =====================================================
document.addEventListener("DOMContentLoaded", async () => {
  await loadCurrentUser();           // 登入 / 取 user
});
