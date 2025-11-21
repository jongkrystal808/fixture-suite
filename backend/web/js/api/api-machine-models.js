``/**
 * 機種 / 站點 / 機種-站點 / 治具需求 API
 * api-machine-models.js
 *
 * 依後端 Router:
 * - /models
 * - /stations
 * - /model-stations
 * - /fixture-req
 */

// ===================== 機種 (machine_models) =====================

async function apiListModels(q = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  return api('/models' + (params.toString() ? `?${params.toString()}` : ''));
}

async function apiGetModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`);
}

async function apiCreateModel(payload) {
  return api('/models', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateModel(modelId, payload) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE'
  });
}

// ===================== 站點 (stations) =====================

async function apiListStations(q = '') {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  return api('/stations' + (params.toString() ? `?${params.toString()}` : ''));
}

async function apiGetStation(stationId) {
  return api(`/stations/${stationId}`);
}

async function apiCreateStation(payload) {
  return api('/stations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateStation(stationId, payload) {
  return api(`/stations/${stationId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteStation(stationId) {
  return api(`/stations/${stationId}`, {
    method: 'DELETE'
  });
}

// ===================== 機種 ↔ 站點 綁定 (model_stations) =====================

async function apiListModelStations(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`);
}

async function apiListAvailableStationsForModel(modelId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/available`);
}

async function apiBindStationToModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}`, {
    method: 'POST',
    body: JSON.stringify({ station_id: stationId })
  });
}

async function apiUnbindStationFromModel(modelId, stationId) {
  return api(`/model-stations/${encodeURIComponent(modelId)}/${stationId}`, {
    method: 'DELETE'
  });
}

// ===================== 治具需求 (fixture_requirements) =====================

async function apiListFixtureRequirements(modelId, stationId) {
  return api(`/fixture-req/${encodeURIComponent(modelId)}/${stationId}`);
}

async function apiCreateFixtureRequirement(modelId, stationId, payload) {
  return api(`/fixture-req/${encodeURIComponent(modelId)}/${stationId}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function apiUpdateFixtureRequirement(reqId, payload) {
  return api(`/fixture-req/item/${reqId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

async function apiDeleteFixtureRequirement(reqId) {
  return api(`/fixture-req/item/${reqId}`, {
    method: 'DELETE'
  });
}

// 暴露到 window（方便在 app-main.js 使用）
window.apiListModels = apiListModels;
window.apiGetModel = apiGetModel;
window.apiCreateModel = apiCreateModel;
window.apiUpdateModel = apiUpdateModel;
window.apiDeleteModel = apiDeleteModel;

window.apiListStations = apiListStations;
window.apiCreateStation = apiCreateStation;
window.apiUpdateStation = apiUpdateStation;
window.apiDeleteStation = apiDeleteStation;

window.apiListModelStations = apiListModelStations;
window.apiListAvailableStationsForModel = apiListAvailableStationsForModel;
window.apiBindStationToModel = apiBindStationToModel;
window.apiUnbindStationFromModel = apiUnbindStationFromModel;

window.apiListFixtureRequirements = apiListFixtureRequirements;
window.apiCreateFixtureRequirement = apiCreateFixtureRequirement;
window.apiUpdateFixtureRequirement = apiUpdateFixtureRequirement;
window.apiDeleteFixtureRequirement = apiDeleteFixtureRequirement;
