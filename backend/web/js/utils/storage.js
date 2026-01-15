/**
 * storage.js (v4.x FINAL)
 * 本地狀態存儲（無 mock）
 *
 * ✔ 統一 token / customer
 * ✔ 移除所有 mock 狀態
 * ✔ 僅保留「登入態 / customer context」
 */

// ==============================
// LocalStorage 命名空間
// ==============================
const LS_KEY = 'fixtureApp.v4';

// ==============================
// 統一 Storage Keys（單一真相）
// ==============================
const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',          // ⚠ 與 OAuth2 / Backend 對齊
  CURRENT_CUSTOMER: 'current_customer_id',
  USER_INFO: 'user_info'
};

// ==============================
// 全域狀態（只保留真實狀態）
// ==============================
window.authUser = null;

// ==============================
// 清除所有狀態（登出 / token 失效用）
// ==============================
function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CUSTOMER);
    localStorage.removeItem(STORAGE_KEYS.USER_INFO);
    window.authUser = null;
  } catch (e) {
    console.warn('[storage] clearState failed', e);
  }
}

// ==============================
// Customer Context 管理
// ==============================
const CustomerState = {
  getCurrentCustomer() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CUSTOMER);
  },

  setCurrentCustomer(customerId) {
    if (!customerId) return;
    localStorage.setItem(STORAGE_KEYS.CURRENT_CUSTOMER, customerId);

    // 通知整個 App（inventory / stats / query 都會用到）
    window.dispatchEvent(
      new CustomEvent('customer:changed', {
        detail: { customerId }
      })
    );
  },

  clearCurrentCustomer() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CUSTOMER);
  }
};

// ==============================
// Token 管理（OAuth2 / Bearer）
// ==============================
const TokenManager = {
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  setToken(token) {
    if (!token) return;
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  removeToken() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }
};

// ==============================
// User Info（/auth/me 結果）
// ==============================
function setAuthUser(user) {
  window.authUser = user;
  try {
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  } catch (e) {
    console.warn('[storage] setAuthUser failed', e);
  }
}

function getAuthUser() {
  if (window.authUser) return window.authUser;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_INFO);
    if (!raw) return null;
    window.authUser = JSON.parse(raw);
    return window.authUser;
  } catch {
    return null;
  }
}

// ==============================
// Expose to window
// ==============================
window.STORAGE_KEYS = STORAGE_KEYS;
window.clearState = clearState;
window.CustomerState = CustomerState;
window.TokenManager = TokenManager;
window.setAuthUser = setAuthUser;
window.getAuthUser = getAuthUser;
