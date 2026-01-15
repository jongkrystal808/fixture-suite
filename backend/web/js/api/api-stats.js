/**
 * Stats API Client (v4.x FINAL)
 *
 * 對應 backend/app/routers/stats.py
 *
 */

/* ============================================================
 * 取得儀表板統計數據
 * GET /stats/dashboard
 * ============================================================ */
function apiGetDashboardStats() {
  return api("/stats/dashboard");
}

window.apiGetDashboardStats = apiGetDashboardStats;

/* ============================================================
 * 取得某機種最大可開站數
 * GET /stats/max-stations
 * ============================================================ */
function apiGetMaxStations(modelId) {
  if (!modelId) {
    throw new Error("apiGetMaxStations: modelId is required");
  }

  return api("/stats/max-stations", {
    params: { model_id: modelId },
  });
}


/* ============================================================
 * 取得機種治具需求總表
 * GET /stats/model-requirements
 * ============================================================ */
function apiGetModelRequirements(modelId) {
  if (!modelId) {
    throw new Error("apiGetModelRequirements: modelId is required");
  }

  return api("/stats/model-requirements", {
    params: { model_id: modelId },
  });
}

// ============================================================
// Stats - Fixture Lifespan
// ============================================================

async function apiGetFixtureLifespan(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/stats/fixture-lifespan${q ? `?${q}` : ""}`);
}

window.apiGetFixtureLifespan = apiGetFixtureLifespan;


/* ============================================================
 * Export to window
 * ============================================================ */
window.apiGetMaxStations = apiGetMaxStations;
window.apiGetModelRequirements = apiGetModelRequirements;

console.log("✅ api-stats.js v4.x FINAL loaded");


