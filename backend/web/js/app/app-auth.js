/**
 * app-auth.js (v4.x FINAL)
 * - 登入 / 登出
 * - 載入目前使用者
 * - user-ready 狀態管理
 *
 * ❌ 不再管理 customer 清單
 * ❌ 不再呼叫 customer CRUD API
 */

window.currentUser = null;
window.__userReady = false;

/* ============================================================
 * user ready callback
 * ============================================================ */
function onUserReady(cb) {
  if (window.__userReady) {
    cb();
  } else {
    document.addEventListener("user:ready", cb, { once: true });
  }
}
window.onUserReady = onUserReady;

/* ============================================================
 * Login Modal
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
 * Login
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
      localStorage.setItem("access_token", res.access_token);
    }

    // 先關 modal，避免 UI race
    closeLogin();

    // 再載入 user
    await loadCurrentUser();


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
 * Logout
 * ============================================================ */
function doLogout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("current_customer_id");

  window.currentUser = null;
  window.__userReady = false;

  window.hideCustomerHeaderSelect?.();
  location.reload();
}

/* ============================================================
 * Load current user (CORE)
 * ============================================================ */
async function loadCurrentUser() {
  const token = localStorage.getItem("access_token");
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
    window.currentUser = user;

    display.textContent =
      (user.full_name || "") +
      (user.username ? ` (${user.username})` : "");

    btnLogin && (btnLogin.style.display = "none");
    btnLogout && (btnLogout.style.display = "inline-flex");

    if (!window.__userReady) {
      window.__userReady = true;
      document.dispatchEvent(new Event("user:ready"));
    }

  } catch (err) {
    console.warn("[auth] token expired");
    localStorage.removeItem("access_token");
    window.currentUser = null;
    window.__userReady = false;
    showLoginModal();
  }
}

/* ============================================================
 * Exports
 * ============================================================ */
window.showLoginModal = showLoginModal;
window.closeLogin = closeLogin;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.loadCurrentUser = loadCurrentUser;

/* ============================================================
 * App Init
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadCurrentUser();
});
