/**
 * 統計與認證相關 API 服務
 * api-stats-auth.js
 */

// ============================================
// 統計查詢 API
// ============================================

/**
 * 取得統計摘要
 * @returns {Promise<Object>} 統計摘要資料
 */
async function apiGetSummary() {
  return api('/stats/summary');
}

/**
 * 查詢機種最大開站數
 * @param {string} modelId - 機種代碼
 * @returns {Promise<Array>} 各站點最大開站數
 */
async function apiGetMaxStations(modelId) {
  return api(`/stats/max-stations?model_id=${encodeURIComponent(modelId)}`);
}

/**
 * 查詢站點治具需求
 * @param {string} modelId - 機種代碼
 * @param {number} stationId - 站點 ID
 * @returns {Promise<Array>} 治具需求列表
 */
async function apiGetStationRequirements(modelId, stationId) {
  return api(`/stats/station-requirements?model_id=${encodeURIComponent(modelId)}&station_id=${stationId}`);
}

// ============================================
// 認證 API
// ============================================

/**
 * 使用者登入
 * @param {string} username - 使用者名稱
 * @param {string} password - 密碼
 * @returns {Promise<Object>} 登入結果（含 access_token）
 */
async function apiLogin(username, password) {
  return api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

/**
 * 使用者註冊
 * @param {Object} userData - 使用者資料
 * @returns {Promise<Object>} 註冊結果
 */
async function apiRegister(userData) {
  return api('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

/**
 * 取得當前使用者資訊
 * @returns {Promise<Object>} 使用者資料
 */
async function apiGetMe() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登入');
  }
  
  return api('/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

// ============================================
// 使用者管理 API（後台）
// ============================================

/**
 * 查詢使用者列表
 * @returns {Promise<Array>} 使用者列表
 */
async function apiListUsers() {
  return apiJson('/users');
}

/**
 * 建立使用者
 * @param {Object} user - 使用者資料
 * @returns {Promise<Object>} 建立的使用者
 */
async function apiCreateUser(user) {
  return apiJson('/users', {
    method: 'POST',
    body: JSON.stringify(user)
  });
}

/**
 * 更新使用者
 * @param {string} id - 使用者 ID
 * @param {Object} user - 使用者資料
 * @returns {Promise<Object>} 更新後的使用者
 */
async function apiUpdateUser(id, user) {
  return apiJson(`/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(user)
  });
}

/**
 * 刪除使用者
 * @param {string} id - 使用者 ID
 * @param {string} password - 密碼（確認）
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteUser(id, password) {
  return apiJson(`/users/${encodeURIComponent(id)}?password=${encodeURIComponent(password)}`, {
    method: 'DELETE'
  });
}

/**
 * 取得使用與更換記錄統計摘要
 * @returns {Promise<Object>} 使用/更換記錄摘要
 */
async function apiGetLogSummary() {
  return api('/stats/log-summary');
}

window.apiGetLogSummary = apiGetLogSummary;


// 匯出函數
window.apiGetSummary = apiGetSummary;
window.apiGetMaxStations = apiGetMaxStations;
window.apiGetStationRequirements = apiGetStationRequirements;
window.apiLogin = apiLogin;
window.apiRegister = apiRegister;
window.apiGetMe = apiGetMe;
window.apiListUsers = apiListUsers;
window.apiCreateUser = apiCreateUser;
window.apiUpdateUser = apiUpdateUser;
window.apiDeleteUser = apiDeleteUser;
