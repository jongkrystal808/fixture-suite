/**
 * 認證相關 API
 * api-auth.js
 *
 * 包含：
 *  - 登入 /auth/login
 *  - 取得使用者資訊 /auth/me
 */

/**
 * 呼叫後端登入 API
 * @param {string} username
 * @param {string} password
 */
async function apiLogin(username, password) {
  return await apiJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username,
      password
    })
  });
}

/**
 * 取得目前登入的使用者（透過 JWT Token）
 * GET /auth/me
 */
async function apiGetMe() {
  return await api('/auth/me');
}

// 匯出全域
window.apiLogin = apiLogin;
window.apiGetMe = apiGetMe;
