/**
 * 使用者管理 API
 * api-users.js
 *
 * 對應後端：
 *  - GET    /api/v2/users
 *  - POST   /api/v2/users
 *  - PUT    /api/v2/users/{user_id}
 *  - DELETE /api/v2/users/{user_id}
 *  - POST   /api/v2/auth/admin/reset-password/{user_id}
 */

/** 取得使用者清單 */
async function apiListUsers() {
  return await api("/users");
}

/** 建立使用者 */
async function apiCreateUser(data) {
  return await apiJson("/users", "POST", data);
}

/** 更新使用者資料（角色 / 信箱 / 密碼等） */
async function apiUpdateUser(id, data) {
  return await apiJson(`/users/${id}`, "PUT", data);
}

/** 刪除使用者（以密碼驗證） */
async function apiDeleteUser(id, password) {
  // DELETE 通常不允許 body，因此改以 query string 傳遞密碼
  return await api(`/users/${id}?password=${encodeURIComponent(password)}`, "DELETE");
}

/** 管理員重設使用者密碼 */
async function apiAdminResetPassword(id, newPassword) {
  return await apiJson(`/auth/admin/reset-password/${id}`, "POST", {
    new_password: newPassword
  });
}

// 匯出全域
window.apiListUsers = apiListUsers;
window.apiCreateUser = apiCreateUser;
window.apiUpdateUser = apiUpdateUser;
window.apiDeleteUser = apiDeleteUser;
window.apiAdminResetPassword = apiAdminResetPassword;
