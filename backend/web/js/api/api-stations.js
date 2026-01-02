/**
 * 站點管理 API (v3.0)
 * api-stations.js
 *
 * 後端 routers/stations.py：
 *
 * GET    /stations
 * GET    /stations/{station_id}
 * POST   /stations
 * PUT    /stations/{station_id}
 * DELETE /stations/{station_id}
 * GET    /stations/simple
 */

/* ============================================================
 * 查詢站點（支援搜尋 / 啟用狀態 / 分頁）
 * ============================================================ */

/**
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   search,
 *   is_active
 * }
 */
async function apiListStations(params = {}) {
  const {
    page = 1,
    pageSize = 50,
    search = "",
    is_active = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));

  if (search) query.set("search", search);
  if (is_active !== "") query.set("is_active", is_active);

  return api(`/stations?${query.toString()}`);
}

/* ============================================================
 * 查詢單一站點
 * ============================================================ */

async function apiGetStation(stationId) {
  return api(`/stations/${encodeURIComponent(stationId)}`);
}

/* ============================================================
 * 新增站點
 * ============================================================ */

/**
 * payload:
 * {
 *   station_id,
 *   station_name,
 *   note,
 *   is_active
 * }
 */
async function apiCreateStation(payload) {
  return api("/stations", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 更新站點
 * ============================================================ */

async function apiUpdateStation(stationId, payload) {
  if (typeof stationId !== "string" && typeof stationId !== "number") {
    throw new Error("apiUpdateStation: stationId must be string or number");
  }
  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}


/* ============================================================
 * 刪除站點
 * ============================================================ */

async function apiDeleteStation(stationId) {
  return api(`/stations/${encodeURIComponent(stationId)}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 簡易列表（下拉用）
 * ============================================================ */

async function apiListStationsSimple() {
  return api("/stations/simple");
}

/* ============================================================
 * 導出到全域
 * ============================================================ */

window.apiListStations = apiListStations;
window.apiGetStation = apiGetStation;
window.apiCreateStation = apiCreateStation;
window.apiUpdateStation = apiUpdateStation;
window.apiDeleteStation = apiDeleteStation;
window.apiListStationsSimple = apiListStationsSimple;
