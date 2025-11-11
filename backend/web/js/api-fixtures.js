/**
 * 治具相關 API 服務
 * api-fixtures.js
 */

// ============================================
// 治具 CRUD API
// ============================================

/**
 * 查詢治具列表
 * @returns {Promise<Array>} 治具列表
 */
async function apiListFixtures() {
  return api('/fixtures');
}

/**
 * 查詢治具狀態視圖
 * @returns {Promise<Array>} 治具狀態列表
 */
async function apiListFixturesStatus() {
  return api('/fixtures/status');
}

/**
 * 查詢單一治具
 * @param {string} id - 治具 ID
 * @returns {Promise<Object>} 治具資料
 */
async function apiGetFixture(id) {
  return api(`/fixtures/${id}`);
}

/**
 * 建立治具
 * @param {Object} fixture - 治具資料
 * @returns {Promise<Object>} 建立的治具
 */
async function apiCreateFixture(fixture) {
  return api('/fixtures', {
    method: 'POST',
    body: JSON.stringify(fixture)
  });
}

/**
 * 更新治具
 * @param {Object} fixture - 治具資料（需包含 id）
 * @returns {Promise<Object>} 更新後的治具
 */
async function apiUpdateFixture(fixture) {
  return api(`/fixtures/${fixture.id}`, {
    method: 'PUT',
    body: JSON.stringify(fixture)
  });
}

/**
 * 刪除治具
 * @param {string} id - 治具 ID
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteFixture(id) {
  return api(`/fixtures/${id}`, {
    method: 'DELETE'
  });
}

// 匯出函數
window.apiListFixtures = apiListFixtures;
window.apiListFixturesStatus = apiListFixturesStatus;
window.apiGetFixture = apiGetFixture;
window.apiCreateFixture = apiCreateFixture;
window.apiUpdateFixture = apiUpdateFixture;
window.apiDeleteFixture = apiDeleteFixture;
