/**
 * api-dashboard.js (v4.x FINAL)
 *
 * Stats / Analytics API Client
 *
 * 語意說明：
 *  Dashboard / 規劃 / 分析用途
 * - 不處理 customer_id（由後端 context 決定）
 */

/* ============================================================
 * Dashboard
 * GET /stats/dashboard
 * ============================================================ */
function apiGetDashboardStats() {
  return api("/stats/dashboard");
}

window.apiGetDashboardStats = apiGetDashboardStats;

/* ============================================================
 * Fixture Lifespan
 * Dashboard / 壽命統計 / 不耐用治具
 * GET /stats/fixture-lifespan
 * ============================================================ */
async function apiGetFixtureLifespan(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/stats/fixture-lifespan${q ? `?${q}` : ""}`);
}

window.apiGetFixtureLifespan = apiGetFixtureLifespan;

/* ============================================================
 * Model Planning
 * 非 Dashboard，但屬於 stats 領域
 * ============================================================ */

/**
 * 取得某機種最大可開站數
 * GET /stats/max-stations
 */
function apiGetMaxStations(modelId) {
  if (!modelId) {
    throw new Error("apiGetMaxStations: modelId is required");
  }

  return api("/stats/max-stations", {
    params: { model_id: modelId },
  });
}

window.apiGetMaxStations = apiGetMaxStations;

/**
 * 取得機種治具需求總表
 * GET /stats/model-requirements
 */
function apiGetModelRequirements(modelId) {
  if (!modelId) {
    throw new Error("apiGetModelRequirements: modelId is required");
  }

  return api("/stats/model-requirements", {
    params: { model_id: modelId },
  });
}

window.apiGetModelRequirements = apiGetModelRequirements;
