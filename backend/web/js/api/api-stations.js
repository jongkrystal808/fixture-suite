/**
 * Stations API Client (v4.x FINAL)
 *
 * 對應後端 routers/stations.py
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行 stringify
 * - ❌ 不自行處理 token
 * - ✅ 一律透過 api-config.js
 */

/* ============================================================
 * 查詢站點（搜尋 / 啟用狀態 / 分頁）
 * GET /stations
 * ============================================================ */
function apiListStations(params = {}) {
  const {
    page = 1,
    pageSize = 50,
    search = "",
    is_active = ""
  } = params;

  return api("/stations", {
    params: {
      skip: (page - 1) * pageSize,
      limit: pageSize,
      search: search || undefined,
      is_active: is_active !== "" ? is_active : undefined,
    },
  });
}

/* ============================================================
 * 查詢單一站點
 * GET /stations/{station_id}
 * ============================================================ */
function apiGetStation(stationId) {
  if (!stationId) {
    throw new Error("apiGetStation: stationId is required");
  }

  return api(`/stations/${encodeURIComponent(stationId)}`);
}

/* ============================================================
 * 新增站點
 * POST /stations
 * ============================================================ */
/**
 * payload:
 * {
 *   station_id,
 *   station_name,
 *   note?,
 *   is_active?
 * }
 */
function apiCreateStation(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("apiCreateStation: invalid payload");
  }
  if (!payload.station_id) {
    throw new Error("apiCreateStation: station_id is required");
  }

  return api("/stations", {
    method: "POST",
    body: payload,
  });
}

/* ============================================================
 * 更新站點
 * PUT /stations/{station_id}
 * ============================================================ */
function apiUpdateStation(stationId, payload) {
  if (!stationId) {
    throw new Error("apiUpdateStation: stationId is required");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("apiUpdateStation: invalid payload");
  }

  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: "PUT",
    body: payload,
  });
}

/* ============================================================
 * 刪除站點
 * DELETE /stations/{station_id}
 * ============================================================ */
function apiDeleteStation(stationId) {
  if (!stationId) {
    throw new Error("apiDeleteStation: stationId is required");
  }

  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * 簡易列表（下拉用）
 * GET /stations/simple
 * ============================================================ */
function apiListStationsSimple() {
  return api("/stations/simple");
}

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiListStations = apiListStations;
window.apiGetStation = apiGetStation;
window.apiCreateStation = apiCreateStation;
window.apiUpdateStation = apiUpdateStation;
window.apiDeleteStation = apiDeleteStation;
window.apiListStationsSimple = apiListStationsSimple;

console.log("✅ api-stations.js v4.x FINAL loaded");
