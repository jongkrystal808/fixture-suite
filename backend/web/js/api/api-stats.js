/**
 * Stats API Client (v4.x FINAL)
 *
 * 對應 backend/app/routers/stats.py
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行拼 query string
 * - ❌ 不自行處理 token
 * - ✅ 一律透過 api-config.js
 */

/* ============================================================
 * Dashboard Summary
 * GET /stats/summary
 * ============================================================ */
function apiGetStatsSummary() {
  return api("/stats/summary");
}

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
 * 取得治具狀態視圖
 * GET /stats/fixture-status
 * ============================================================ */
function apiGetFixtureStatus() {
  return api("/stats/fixture-status");
}

/* ============================================================
 * 取得單一治具使用 / 更換統計
 * GET /stats/fixture-usage
 * ============================================================ */
function apiGetFixtureUsageStats(fixtureId) {
  if (!fixtureId) {
    throw new Error("apiGetFixtureUsageStats: fixtureId is required");
  }

  return api("/stats/fixture-usage", {
    params: { fixture_id: fixtureId },
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

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiGetStatsSummary = apiGetStatsSummary;
window.apiGetMaxStations = apiGetMaxStations;
window.apiGetFixtureStatus = apiGetFixtureStatus;
window.apiGetFixtureUsageStats = apiGetFixtureUsageStats;
window.apiGetModelRequirements = apiGetModelRequirements;

console.log("✅ api-stats.js v4.x FINAL loaded");
