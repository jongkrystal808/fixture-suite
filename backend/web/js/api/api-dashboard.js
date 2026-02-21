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
