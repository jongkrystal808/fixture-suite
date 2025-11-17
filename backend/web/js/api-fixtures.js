/**
 * 治具相關 API 服務
 * api-fixtures.js
 */

// ============================================
// 治具 CRUD API
// ============================================

/**
 * 查詢治具列表（支援分頁 / 篩選 / 搜尋）
 * @param {Object} options
 * @param {number} [options.page=1] - 第幾頁（從 1 開始）
 * @param {number} [options.pageSize=8] - 每頁筆數
 * @param {string} [options.statusFilter] - 狀態篩選（正常 / 返還 / 報廢）
 * @param {number} [options.ownerId] - 負責人 ID
 * @param {string} [options.search] - 關鍵字 (fixture_id / fixture_name)
 * @returns {Promise<{total:number, fixtures:Array}>}
 */
async function apiListFixtures(options = {}) {
  const {
    page = 1,
    pageSize = 8,
    statusFilter = '',
    ownerId = '',
    search = ''
  } = options;

  const params = new URLSearchParams();
  params.set('skip', String((page - 1) * pageSize));
  params.set('limit', String(pageSize));
  if (statusFilter) params.set('status_filter', statusFilter);
  if (ownerId) params.set('owner_id', String(ownerId));
  if (search) params.set('search', search);

  return api('/fixtures?' + params.toString());
}

/**
 * 查詢治具狀態視圖（對應 view_fixture_status）
 * @param {Object} options
 * @param {number} [options.page=1]
 * @param {number} [options.pageSize=50]
 * @param {string} [options.replacementStatus] - 更換狀態 (需更換/正常)
 * @returns {Promise<Array>}
 */
async function apiListFixturesStatus(options = {}) {
  const {
    page = 1,
    pageSize = 50,
    replacementStatus = ''
  } = options;

  const params = new URLSearchParams();
  params.set('skip', String((page - 1) * pageSize));
  params.set('limit', String(pageSize));
  if (replacementStatus) params.set('replacement_status', replacementStatus);

  return api('/fixtures/status/view?' + params.toString());
}

/**
 * 查詢單一治具
 * @param {string} fixtureId - 治具編號
 * @returns {Promise<Object>} 治具資料（含 owner）
 */
async function apiGetFixture(fixtureId) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`);
}

/**
 * 建立治具
 * @param {Object} fixture - 治具資料（需包含 fixture_id, fixture_name ...）
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
 * @param {string} fixtureId - 治具編號
 * @param {Object} patch - 要更新的欄位（FixtureUpdate 結構）
 * @returns {Promise<Object>} 更新後的治具
 */
async function apiUpdateFixture(fixtureId, patch) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: 'PUT',
    body: JSON.stringify(patch)
  });
}

/**
 * 刪除治具
 * @param {string} fixtureId - 治具編號
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteFixture(fixtureId) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: 'DELETE'
  });
}

/**
 * 簡化治具列表（下拉用）
 * @param {string} [statusFilter] - 狀態篩選
 * @returns {Promise<Array>}
 */
async function apiGetFixturesSimple(statusFilter = '') {
  const params = new URLSearchParams();
  if (statusFilter) params.set('status_filter', statusFilter);
  const query = params.toString() ? ('?' + params.toString()) : '';
  return api('/fixtures/simple/list' + query);
}

// 匯出函數
window.apiListFixtures = apiListFixtures;
window.apiListFixturesStatus = apiListFixturesStatus;
window.apiGetFixture = apiGetFixture;
window.apiCreateFixture = apiCreateFixture;
window.apiUpdateFixture = apiUpdateFixture;
window.apiDeleteFixture = apiDeleteFixture;
window.apiGetFixturesSimple = apiGetFixturesSimple;
