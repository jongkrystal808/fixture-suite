/**
 * 治具相關 API 服務 (v3.0)
 * api-fixtures.js
 *
 * ✔ 新增 token 自動帶入 customer_id
 * ✔ 完整符合後端 /fixtures Router v3.0
 */

// ================================
// 工具：取得使用者 token 中的 customer_id
// ================================
function _getCurrentCustomerId() {
  return window.currentCustomerId || localStorage.getItem("current_customer_id");
}

// ================================
// 治具 CRUD API
// ================================

/**
 * 查詢治具列表（支援分頁 / 搜尋 / 篩選）
 */
async function apiListFixtures(params = {}) {
  const q = new URLSearchParams();

  // ⭐ 一定要帶 customer_id，否則後端會 422 / 或查不到資料
  const customer_id = params.customer_id || _getCurrentCustomerId();
  if (customer_id) q.set("customer_id", customer_id);

  if (params.search) q.set("search", params.search);
  if (params.status) q.set("status_filter", params.status);
  if (params.owner_id) q.set("owner_id", params.owner_id);

  if (params.skip !== undefined) q.set("skip", String(params.skip));
  if (params.limit !== undefined) q.set("limit", String(params.limit));

  return api(`/fixtures?${q.toString()}`);
}

/**
 * 查詢治具狀態視圖（對應 view_fixture_status）
 * 顯示：replacement_status / last_replacement_date
 */
async function apiListFixturesStatus(options = {}) {
  const {
    page = 1,
    pageSize = 50,
    replacementStatus = ""
  } = options;

  const params = new URLSearchParams();
  params.set("skip", String((page - 1) * pageSize));
  params.set("limit", String(pageSize));

  if (replacementStatus)
    params.set("replacement_status", replacementStatus);

  return api("/fixtures/status/view?" + params.toString());
}

/**
 * 查詢單一治具
 */
async function apiGetFixture(id) {
  const customer_id = _getCurrentCustomerId();
  return api(`/fixtures/${encodeURIComponent(id)}?customer_id=${customer_id}`);
}

/**
 * 建立治具（FixtureCreate）
 *
 * 需要欄位：
 * fixture_id
 * fixture_name
 * owner_id
 * self_purchased_qty
 * customer_supplied_qty
 * replacement_cycle
 * cycle_unit
 * note
 *
 * ⚠ customer_id 不用傳，由 token 決定
 */
function apiCreateFixture(data) {
  return api("/fixtures", {
    method: "POST",
    params: { customer_id: data.customer_id }, // ✅ query
    body: data                                  // ✅ body 只放 fixture 資料
  });
}


/**
 * 更新治具（FixtureUpdate）
 */
async function apiUpdateFixture(fixtureId, patch) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: "PUT",
    body: JSON.stringify(patch)
  });
}

/**
 * 刪除治具（後端要求 fixture_id）
 */
async function apiDeleteFixture(fixtureId) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: "DELETE"
  });
}

/**
 * 下拉選單：取得簡易治具清單
 * (/fixtures/simple/list)
 */
async function apiGetFixturesSimple(statusFilter = "") {
  const params = new URLSearchParams();
  if (statusFilter) params.set("status_filter", statusFilter);

  const query = params.toString() ? "?" + params.toString() : "";
  return api("/fixtures/simple/list" + query);
}

async function apiGetFixtureDetail(id) {
  const customer_id = _getCurrentCustomerId();
  return api(`/fixtures/${encodeURIComponent(id)}/detail?customer_id=${customer_id}`);
}

window.apiGetFixtureDetail = apiGetFixtureDetail;

// 匯出
window.apiListFixtures = apiListFixtures;
window.apiListFixturesStatus = apiListFixturesStatus;
window.apiGetFixture = apiGetFixture;
window.apiCreateFixture = apiCreateFixture;
window.apiUpdateFixture = apiUpdateFixture;
window.apiDeleteFixture = apiDeleteFixture;
window.apiGetFixturesSimple = apiGetFixturesSimple;
window.apiGetFixtureDetail = apiGetFixtureDetail;
// api-fixtures.js 補上

async function apiGetFixtureStatistics(customer_id) {
  const cid =
    customer_id ||
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id");

  const q = new URLSearchParams();
  if (cid) q.set("customer_id", cid);

  return api(`/fixtures/statistics/summary?${q.toString()}`);
}

async function apiGetFixtureStatus(customer_id) {
  const cid =
    customer_id ||
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id");

  const q = new URLSearchParams();
  if (cid) q.set("customer_id", cid);

  // 後端 fixtures.py 有 /fixtures/status/view
  return api(`/fixtures/status/view?${q.toString()}`);
}

window.apiGetFixtureStatistics = apiGetFixtureStatistics;
window.apiGetFixtureStatus = apiGetFixtureStatus;


function apiSearchFixtures(params = {}) {
  const q = new URLSearchParams();

  if (params.customer_id) q.set("customer_id", params.customer_id);
  if (params.q) q.set("q", params.q);
  if (params.limit) q.set("limit", params.limit);

  return api(`/fixtures/search?${q.toString()}`);
}

window.apiSearchFixtures = apiSearchFixtures;


/**
 * ===============================
 * Fixtures Import / Export API
 * ===============================
 */

/**
 * 匯出治具（XLSX）
 * - 直接用 window.open
 * - 避免 fetch + blob 處理
 */
function apiExportFixturesXlsx(customer_id) {
  window.open(
    `/api/v2/fixtures/export?customer_id=${encodeURIComponent(customer_id)}`,
    "_blank"
  );
}

/**
 * 下載治具匯入樣本（XLSX）
 */
function apiDownloadFixturesTemplate() {
  window.open(`/api/v2/fixtures/template`, "_blank");
}

/**
 * 匯入治具（XLSX）
 */
async function apiImportFixturesXlsx(customer_id, file) {
  const fd = new FormData();
  fd.append("file", file);

  return api(`/fixtures/import`, {
    method: "POST",
    params: { customer_id },
    body: fd,
    // ⚠️ api() 偵測到 FormData 時，不能強制加 Content-Type
  });
}

/* ===== 導出到全域（對齊 models） ===== */
window.apiExportFixturesXlsx = apiExportFixturesXlsx;
window.apiDownloadFixturesTemplate = apiDownloadFixturesTemplate;
window.apiImportFixturesXlsx = apiImportFixturesXlsx;
