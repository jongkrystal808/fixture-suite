/**
 * 認證與登入邏輯
 * auth.js
 */

// ============================================
// 登入/登出
// ============================================

/**
 * 打開登入介面
 */
function openLogin() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'flex';
}

/**
 * 關閉登入介面
 */
function closeLogin() {
  const modal = document.getElementById('loginModal');
  if (modal) modal.style.display = 'none';

  const msg = document.getElementById('loginMsg');
  if (msg) msg.textContent = '';
}

/**
 * 使用者登入（原 mockLogin 改名為 doLogin）
 */
async function doLogin() {
  const id = document.getElementById('loginId')?.value.trim();
  const pwd = document.getElementById('loginPwd')?.value;

  if (!id || !pwd) {
    const msg = document.getElementById('loginMsg');
    if (msg) msg.textContent = '請輸入帳號與密碼';
    return;
  }

  try {
    // 呼叫 API 登入
    const response = await apiLogin(id, pwd);

    // 儲存使用者資訊
    window.authUser = response.user || { id, role: 'user' };

    // 儲存 Token（如果有）
    if (response.access_token) {
      localStorage.setItem('auth_token', response.access_token);
    }

    // 更新 UI
    updateLoginState();

    // 關閉登入介面
    if (typeof closeLogin === 'function') {
      closeLogin();
    }

    // 刷新資料
    await refreshAfterLogin();

    toast('登入成功', 'success');
  } catch (e) {
    const msg = document.getElementById('loginMsg');
    if (msg) msg.textContent = '登入失敗：' + e.message;
  }
}

/**
 * 使用者登出
 */
async function doLogout() {
  window.authUser = null;
  localStorage.removeItem('auth_token');

  document.getElementById('loginState').textContent = '未登入';
  const btn = document.getElementById('btnLogin');
  if (btn) {
    btn.textContent = '登入';
    btn.onclick = openLogin;
  }

  toast('已登出', 'info');
}

/**
 * 更新登入狀態顯示
 */
function updateLoginState() {
  if (!window.authUser) return;

  const stateEl = document.getElementById('loginState');
  if (stateEl) {
    stateEl.textContent = `您好，${window.authUser.id || window.authUser.username}（${window.authUser.role || 'user'}）`;
  }

  const btn = document.getElementById('btnLogin');
  if (btn) {
    btn.textContent = '登出';
    btn.onclick = doLogout;
  }
}

/**
 * 登入後刷新資料
 */
async function refreshAfterLogin() {
  try {
    if (typeof loadDashboard === 'function') {
      await loadDashboard();
    }
  } catch (e) {
    console.warn('loadDashboard failed', e);
  }

  try {
    if (typeof renderStats === 'function') {
      renderStats();
    }
  } catch (e) {
    console.warn('renderStats failed', e);
  }
}

/**
 * 檢查登入狀態
 */
async function checkAuthStatus() {
  const token = localStorage.getItem('auth_token');
  if (!token) return false;

  try {
    const user = await apiGetMe();
    window.authUser = user;
    updateLoginState();
    return true;
  } catch (e) {
    localStorage.removeItem('auth_token');
    window.authUser = null;
    return false;
  }
}

/** 是否為管理員 */
function isAdmin() {
  return window.authUser && window.authUser.role === 'admin';
}

/** 是否已登入 */
function isLoggedIn() {
  return window.authUser !== null;
}

/** 要求登入 */
function requireLogin(message = '請先登入') {
  if (!isLoggedIn()) {
    toast(message, 'warning');
    openLogin();
    return false;
  }
  return true;
}

/** 要求管理員 */
function requireAdmin(message = '需要管理員權限') {
  if (!isAdmin()) {
    toast(message, 'error');
    return false;
  }
  return true;
}

// 匯出函數
window.openLogin = openLogin;
window.closeLogin = closeLogin;
window.doLogin = doLogin;  // ← 修改重點
window.doLogout = doLogout;
window.updateLoginState = updateLoginState;
window.refreshAfterLogin = refreshAfterLogin;
window.checkAuthStatus = checkAuthStatus;
window.isAdmin = isAdmin;
window.isLoggedIn = isLoggedIn;
window.requireLogin = requireLogin;
window.requireAdmin = requireAdmin;
