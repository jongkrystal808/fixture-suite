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
function getCustomerId() {
  // Token 已由後端在登入時生成，內含 customer_id
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj.customer_id || null;
  } catch (e) {
    console.warn("無法解析 auth_user:", e);
    return null;
  }
}

// ================================
// 治具 CRUD API
// ================================

/**
 * 查詢治具列表（支援分頁 / 搜尋 / 篩選）
 */
async function apiListFixtures(options = {}) {
  const {
    page = 1,
    pageSize = 8,
    statusFilter = "",
    ownerId = "",
    search = ""
  } = options;

  const params = new URLSearchParams();
  params.set("skip", String((page - 1) * pageSize));
  params.set("limit", String(pageSize));

  if (statusFilter) params.set("status_filter", statusFilter);
  if (ownerId) params.set("owner_id", String(ownerId));
  if (search) params.set("search", search);

  // ⚠ 後端會依 token 中的 customer_id 過濾，不需額外傳 customer_id
  return api("/fixtures?" + params.toString());
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
async function apiGetFixture(fixtureId) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`);
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
async function apiCreateFixture(fixture) {
  return api("/fixtures", {
    method: "POST",
    body: JSON.stringify(fixture)
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

async function apiGetFixtureDetail(fixtureId) {
  return api(`/fixtures/${encodeURIComponent(fixtureId)}/detail`);
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