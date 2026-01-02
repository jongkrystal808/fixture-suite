/**
 * 認證 API (優化版)
 * - 自動略過 customer_id
 * - 錯誤傳遞更完整
 */

/* ============================================================
 * 登入
 * ============================================================ */
// api-auth.js
async function apiLogin(username, password) {
  return api("/auth/login", {
    method: "POST",
    body: { username, password },
    skipCustomerId: true,
    skipAuth: true
  });
}


/* ============================================================
 * 取得目前登入使用者
 * ============================================================ */

async function apiGetMe() {
  return api("/auth/me", {
    skipCustomerId: true   // /auth/me 不需要 customer_id
  });
}

/* ============================================================
 * 導出
 * ============================================================ */

window.apiLogin = apiLogin;
window.apiGetMe = apiGetMe;
