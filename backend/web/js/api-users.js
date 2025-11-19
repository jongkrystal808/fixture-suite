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
  return await apiJson("/users", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

/** 更新使用者資料（角色 / Email） */
async function apiUpdateUser(id, data) {
  return await apiJson(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data)
  });
}

/** 刪除使用者（需密碼確認） */
async function apiDeleteUser(id, password) {
  return await api(
    `/users/${id}?password=${encodeURIComponent(password)}`,
    {
      method: "DELETE"
    }
  );
}

/** 管理員重設使用者密碼 */
async function apiAdminResetPassword(id, newPassword) {
  return await apiJson(`/auth/admin/reset-password/${id}`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword })
  });
}

// 匯出全域
window.apiListUsers = apiListUsers;
window.apiCreateUser = apiCreateUser;
window.apiUpdateUser = apiUpdateUser;
window.apiDeleteUser = apiDeleteUser;
window.apiAdminResetPassword = apiAdminResetPassword;
