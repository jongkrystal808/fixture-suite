/**
 * Fixtures API Client (v4.x FINAL)
 *
 * 原則：
 * - ❌ 不讀取 currentCustomerId
 * - ❌ 不碰 localStorage
 * - ❌ 不自行組 customer_id query
 * - ✅ customer context 一律交給 api-config.js
 * - ✅ 單一 endpoint = 單一定義
 */

/* ============================================================
 * Fixtures List / Query
 * ============================================================ */

/**
 * 查詢治具列表（分頁 / 搜尋 / 篩選）
 */
function apiListFixtures(params = {}) {
  return api("/fixtures", {
    params: {
      search: params.search,
      status_filter: params.status,
      owner_id: params.owner_id,
      skip: params.skip,
      limit: params.limit,
    },
  });
}

/**
 * 查詢治具（simple list，下拉用）
 */
function apiGetFixturesSimple(statusFilter = "") {
  return api("/fixtures/simple/list", {
    params: statusFilter ? { status_filter: statusFilter } : {},
  });
}

/* ============================================================
 * Single Fixture
 * ============================================================ */

/**
 * 取得單一治具
 */
function apiGetFixture(fixtureId) {
  if (!fixtureId) {
    throw new Error("apiGetFixture: fixtureId is required");
  }
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`);
}

/**
 * 取得治具詳細資訊（含關聯資料）
 */
function apiGetFixtureDetail(fixtureId) {
  if (!fixtureId) {
    throw new Error("apiGetFixtureDetail: fixtureId is required");
  }
  return api(`/fixtures/${encodeURIComponent(fixtureId)}/detail`);
}

/* ============================================================
 * Create / Update / Delete
 * ============================================================ */

/**
 * 建立治具
 */
function apiCreateFixture(data) {
  if (!data || typeof data !== "object") {
    throw new Error("apiCreateFixture: invalid data");
  }
  return api("/fixtures", {
    method: "POST",
    body: data,
  });
}

/**
 * 更新治具
 */
function apiUpdateFixture(fixtureId, patch) {
  if (!fixtureId) {
    throw new Error("apiUpdateFixture: fixtureId is required");
  }
  if (!patch || typeof patch !== "object") {
    throw new Error("apiUpdateFixture: invalid patch");
  }

  const body = { ...patch };
  delete body.fixture_id; // 主鍵不可修改，保險

  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: "PUT",
    body,
  });
}

/**
 * 刪除治具
 */
function apiDeleteFixture(fixtureId) {
  if (!fixtureId) {
    throw new Error("apiDeleteFixture: fixtureId is required");
  }
  return api(`/fixtures/${encodeURIComponent(fixtureId)}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * Status / Statistics
 * （屬於 fixtures 的 view，不再重複定義 stats API）
 * ============================================================ */

/**
 * 治具狀態檢視（replacement_status / last_replacement_date）
 */
function apiGetFixtureStatusView(params = {}) {
  return api("/fixtures/status/view", {
    params: {
      skip: params.skip,
      limit: params.limit,
      replacement_status: params.replacementStatus,
    },
  });
}

/**
 * 治具統計摘要
 */
function apiGetFixtureStatisticsSummary() {
  return api("/fixtures/statistics/summary");
}

/* ============================================================
 * Import / Export
 * ============================================================ */

/**
 * 匯出治具（XLSX）
 * - 使用 window.open
 * - 讓瀏覽器自行處理下載
 * - customer context 由後端 token / header 決定
 */
function apiExportFixturesXlsx() {
  window.open("/api/v2/fixtures/export", "_blank");
}

/**
 * 下載治具匯入樣本（XLSX）
 */
function apiDownloadFixturesTemplate() {
  window.open("/api/v2/fixtures/template", "_blank");
}

/**
 * 匯入治具（XLSX）
 */
function apiImportFixturesXlsx(file) {
  if (!file) {
    throw new Error("apiImportFixturesXlsx: file is required");
  }

  const fd = new FormData();
  fd.append("file", file);

  return api("/fixtures/import", {
    method: "POST",
    body: fd,
    // FormData 由 api-config.js 正確處理 Content-Type
  });
}


/* ============================================================
 * 搜尋治具（給 Model Detail / Fixture Requirement 用）
 * GET /fixtures/search
 * ============================================================ */
function apiSearchFixtures(params = {}) {
  const { q, limit = 20 } = params;

  if (!q) {
    throw new Error("apiSearchFixtures: q is required");
  }

  return api("/fixtures/search", {
    params: {
      q,
      limit,
    },
  });
}


/* ============================================================
 * Export to Global
 * ============================================================ */

window.apiListFixtures = apiListFixtures;
window.apiGetFixturesSimple = apiGetFixturesSimple;

window.apiGetFixture = apiGetFixture;
window.apiGetFixtureDetail = apiGetFixtureDetail;

window.apiCreateFixture = apiCreateFixture;
window.apiUpdateFixture = apiUpdateFixture;
window.apiDeleteFixture = apiDeleteFixture;

window.apiGetFixtureStatusView = apiGetFixtureStatusView;
window.apiGetFixtureStatisticsSummary = apiGetFixtureStatisticsSummary;

window.apiExportFixturesXlsx = apiExportFixturesXlsx;
window.apiDownloadFixturesTemplate = apiDownloadFixturesTemplate;
window.apiImportFixturesXlsx = apiImportFixturesXlsx;
window.apiSearchFixtures = apiSearchFixtures;

