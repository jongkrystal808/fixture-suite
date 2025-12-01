/**
 * 機種 / 站點 / 治具需求 API (v3.5)
 *
 * 後端 Router:
 * - /models
 * - /models/{id}
 * - /models/{id}/detail   <-- ★ 新增 for 機種詳細頁
 * - /stations
 * - /model-stations
 * - /fixture-requirements
 */

/* ============================================================
 * 🔵 機種列表（支援 search / skip / limit） ← 查詢頁需要
 * ============================================================ */
async function apiListMachineModels(params = {}) {
  const q = new URLSearchParams();

  // ❗必須帶 customer_id
  if (params.customer_id) q.set("customer_id", params.customer_id);

  if (params.search) q.set("q", params.search);   // 後端是 q，不是 search
  if (params.skip !== undefined) q.set("skip", params.skip);
  if (params.limit !== undefined) q.set("limit", params.limit);

  return api(`/models?${q.toString()}`);
}


/* ============================================================
 * 🔵 單一機種基本資料
 * ============================================================ */
async function apiGetMachineModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`);
}

/* ============================================================
 * 🔵 機種詳細資料（Model Detail Drawer 用） ← ★需要 customer_id
 * ============================================================ */
async function apiGetModelDetail(modelId) {
  const customerId = localStorage.getItem("current_customer_id");
  if (!customerId) {
    throw new Error("未選擇客戶，無法查詢機種詳情");
  }

  const qs = `customer_id=${encodeURIComponent(customerId)}`;

  return api(`/models/${encodeURIComponent(modelId)}/detail?${qs}`);
}

/* ============================================================
 * 🔵 新增機種
 * ============================================================ */
async function apiCreateMachineModel(payload) {
  return api("/models", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 🔵 修改機種
 * ============================================================ */
async function apiUpdateMachineModel(modelId, payload) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 🔵 刪除機種
 * ============================================================ */
async function apiDeleteMachineModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 🔵 機種 ↔ 站點 綁定 (model_stations)
 * ============================================================ */
async function apiListModelStations(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`);
}

async function apiListAvailableStationsForModel(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/available`);
}

async function apiBindStationToModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`, {
    method: "POST",
    body: JSON.stringify({ station_id: stationId })
  });
}

async function apiUnbindStationFromModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 🔵 治具需求 fixture_requirements
 * ============================================================ */
async function apiListFixtureRequirements(modelId, stationId) {
  return api(`/fixture-requirements/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`);
}

async function apiCreateFixtureRequirement(modelId, stationId, payload) {
  return api(`/fixture-requirements/${encodeURIComponent(modelId)}/${encodeURIComponent(stationId)}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function apiUpdateFixtureRequirement(reqId, payload) {
  return api(`/fixture-requirements/item/${reqId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function apiDeleteFixtureRequirement(reqId) {
  return api(`/fixture-requirements/item/${reqId}`, {
    method: "DELETE"
  });
}
async function apiGetMachineModelDetail(modelId) {
  return api(`/models/${modelId}/detail`);
}

async function apiGetModelDetail(modelId) {
  const customer_id = localStorage.getItem("current_customer_id");
  return api(`/model-stations/${modelId}/detail?customer_id=${customer_id}`);
}


/* ============================================================
 * 🔵 導出到全域
 * ============================================================ */
window.apiListMachineModels = apiListMachineModels;
window.apiGetMachineModel = apiGetMachineModel;
window.apiGetModelDetail = apiGetModelDetail;
window.apiCreateMachineModel = apiCreateMachineModel;
window.apiUpdateMachineModel = apiUpdateMachineModel;
window.apiDeleteMachineModel = apiDeleteMachineModel;

window.apiListModelStations = apiListModelStations;
window.apiListAvailableStationsForModel = apiListAvailableStationsForModel;
window.apiBindStationToModel = apiBindStationToModel;
window.apiUnbindStationFromModel = apiUnbindStationFromModel;

window.apiListFixtureRequirements = apiListFixtureRequirements;
window.apiCreateFixtureRequirement = apiCreateFixtureRequirement;
window.apiUpdateFixtureRequirement = apiUpdateFixtureRequirement;
window.apiDeleteFixtureRequirement = apiDeleteFixtureRequirement;
