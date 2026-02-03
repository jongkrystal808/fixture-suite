/**
 * Model Detail API Client (v4.x FINAL)
 *
 * 對應後端 model-detail.py (v4.x)
 *
 * 原則：
 * - ❌ 不讀取 currentCustomerId
 * - ❌ 不讀取 localStorage
 * - ❌ 不自行組 customer_id query
 * - ✅ customer context 一律交給 api-config.js
 * - ✅ 純描述 model-detail API 行為
 */

/* ============================================================
 * 1️⃣ 已綁定站點
 * ============================================================ */

/**
 * 查詢已綁定站點
 */
function apiListBoundStations(params = {}) {
  return api("/model-detail/stations", { params });
}

/* ============================================================
 * 2️⃣ 可綁定站點
 * ============================================================ */

/**
 * 查詢可綁定站點
 */
function apiListAvailableStations(params = {}) {
  return api("/model-detail/stations/available", { params });
}

/* ============================================================
 * 3️⃣ 綁定站點
 * ============================================================ */

/**
 * 綁定站點到機種
 */
function apiBindStation({ model_id, station_id }) {
  if (!model_id || !station_id) {
    throw new Error("apiBindStation: model_id and station_id are required");
  }

  return api("/model-detail/stations", {
    method: "POST",
    params: { model_id },
    body: { station_id },
  });
}

/* ============================================================
 * 4️⃣ 取消綁定站點
 * ============================================================ */

/**
 * 取消站點綁定
 */
function apiUnbindStation({ model_id, station_id }) {
  if (!model_id || !station_id) {
    throw new Error("apiUnbindStation: model_id and station_id are required");
  }

  return api("/model-detail/stations", {
    method: "DELETE",
    params: { model_id, station_id },
  });
}

/* ============================================================
 * 5️⃣ 查詢治具需求
 * ============================================================ */

/**
 * 查詢某站點的治具需求
 */
function apiListRequirements(params = {}) {
  return api("/model-detail/requirements", { params });
}

/* ============================================================
 * 6️⃣ 新增治具需求
 * ============================================================ */

/**
 * 新增治具需求
 */
function apiAddRequirement(data) {
  if (!data || typeof data !== "object") {
    throw new Error("apiAddRequirement: invalid data");
  }

  return api("/model-detail/requirements", {
    method: "POST",
    body: data,
  });
}

/* ============================================================
 * 7️⃣ 更新治具需求
 * ============================================================ */

/**
 * 更新治具需求
 */
function apiUpdateRequirement(req_id, data) {
  if (!req_id) {
    throw new Error("apiUpdateRequirement: req_id is required");
  }

  if (!data || typeof data !== "object") {
    throw new Error("apiUpdateRequirement: invalid data");
  }

  return api(`/model-detail/requirements/${req_id}`, {
    method: "PUT",
    body: data,
  });
}

/* ============================================================
 * 8️⃣ 刪除治具需求
 * ============================================================ */

/**
 * 刪除治具需求
 */
function apiDeleteRequirement(req_id) {
  if (!req_id) {
    throw new Error("apiDeleteRequirement: req_id is required");
  }

  return api(`/model-detail/requirements/${req_id}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * 9️⃣ Model Detail（站點 + 治具需求 + 最大可開站數）
 * ============================================================ */

/**
 * 取得完整 Model Detail
 */
function apiGetModelDetail(model_id) {
  if (!model_id) {
    throw new Error("apiGetModelDetail: model_id is required");
  }

  return api(`/model-detail/${encodeURIComponent(model_id)}/detail`);
}

/* ============================================================
 * Export to Global
 * ============================================================ */

window.apiListBoundStations = apiListBoundStations;
window.apiListAvailableStations = apiListAvailableStations;

window.apiBindStation = apiBindStation;
window.apiUnbindStation = apiUnbindStation;

window.apiListRequirements = apiListRequirements;
window.apiAddRequirement = apiAddRequirement;
window.apiUpdateRequirement = apiUpdateRequirement;
window.apiDeleteRequirement = apiDeleteRequirement;

window.apiGetModelDetail = apiGetModelDetail;
