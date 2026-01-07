/**
 * Machine Models API Client (v4.x FINAL)
 *
 * 原則：
 * - ❌ 不讀取 currentCustomerId
 * - ❌ 不讀取 localStorage
 * - ❌ 不自行組 customer_id query
 * - ✅ customer context 一律交給 api-config.js
 * - ✅ 純描述 models API 行為
 */

/* ============================================================
 * Models List / Query
 * ============================================================ */

/**
 * 查詢機種列表（分頁 / 搜尋）
 */
function apiListMachineModels(params = {}) {
  return api("/models", {
    params: {
      q: params.search,
      skip: params.skip,
      limit: params.limit,
    },
  });
}

/* ============================================================
 * Single Model
 * ============================================================ */

/**
 * 取得單一機種
 */
function apiGetMachineModel(modelId) {
  if (!modelId) {
    throw new Error("apiGetMachineModel: modelId is required");
  }
  return api(`/models/${encodeURIComponent(modelId)}`);
}

/**
 * 取得機種詳細資料（含關聯）
 */
function apiGetModelDetail(modelId) {
  if (!modelId) {
    throw new Error("apiGetModelDetail: modelId is required");
  }
  return api(`/model-detail/${encodeURIComponent(modelId)}/detail`);
}

/* ============================================================
 * Create / Update / Delete
 * ============================================================ */

/**
 * 新增機種
 */
function apiCreateMachineModel(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("apiCreateMachineModel: invalid payload");
  }

  return api("/models", {
    method: "POST",
    body: payload,
  });
}

/**
 * 修改機種
 */
function apiUpdateMachineModel(modelId, payload) {
  if (!modelId) {
    throw new Error("apiUpdateMachineModel: modelId is required");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("apiUpdateMachineModel: invalid payload");
  }

  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "PUT",
    body: payload,
  });
}

/**
 * 刪除機種
 */
function apiDeleteMachineModel(modelId) {
  if (!modelId) {
    throw new Error("apiDeleteMachineModel: modelId is required");
  }

  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * Import / Export
 * ============================================================ */

/**
 * 匯出機種（XLSX）
 * - 使用 window.open
 * - customer scope 由後端 token / header 決定
 */
function apiExportModelsXlsx() {
  window.open("/api/v2/models/export", "_blank");
}

/**
 * 下載機種匯入樣本（XLSX）
 */
function apiDownloadModelsTemplate() {
  window.open("/api/v2/models/template", "_blank");
}

/**
 * 匯入機種（XLSX）
 */
function apiImportModelsXlsx(file) {
  if (!file) {
    throw new Error("apiImportModelsXlsx: file is required");
  }

  const fd = new FormData();
  fd.append("file", file);

  return api("/models/import", {
    method: "POST",
    body: fd,
    // FormData 由 api-config.js 正確處理 Content-Type
  });
}

/* ============================================================
 * Export to Global
 * ============================================================ */

window.apiListMachineModels = apiListMachineModels;
window.apiGetMachineModel = apiGetMachineModel;
window.apiGetModelDetail = apiGetModelDetail;

window.apiCreateMachineModel = apiCreateMachineModel;
window.apiUpdateMachineModel = apiUpdateMachineModel;
window.apiDeleteMachineModel = apiDeleteMachineModel;

window.apiExportModelsXlsx = apiExportModelsXlsx;
window.apiDownloadModelsTemplate = apiDownloadModelsTemplate;
window.apiImportModelsXlsx = apiImportModelsXlsx;

console.log("✅ api-machine-models.js v4.x FINAL loaded");
