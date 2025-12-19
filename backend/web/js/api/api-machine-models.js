/**
 * api-machine-models.js
 * 僅負責「機種」CRUD
 */

/* ================= 機種列表 ================= */
async function apiListMachineModels(params = {}) {
  const q = new URLSearchParams();

  if (params.customer_id) q.set("customer_id", params.customer_id);
  if (params.search) q.set("q", params.search);
  if (params.skip !== undefined) q.set("skip", params.skip);
  if (params.limit !== undefined) q.set("limit", params.limit);

  return api(`/models?${q.toString()}`);
}

/* ================= 單一機種 ================= */
async function apiGetMachineModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`);
}

/* ================= 新增 ================= */
async function apiCreateMachineModel(payload) {
  return api("/models", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* ================= 修改 ================= */
async function apiUpdateMachineModel(modelId, payload) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

/* ================= 刪除 ================= */
async function apiDeleteMachineModel(modelId) {
  return api(`/models/${encodeURIComponent(modelId)}`, {
    method: "DELETE",
  });
}

/* ================= Model Detail ================= */
async function apiGetModelDetail(modelId) {
  const customer_id = localStorage.getItem("current_customer_id");
  return api(`/model-detail/${modelId}/detail`, {
    params: { customer_id },
  });
}

function apiExportModelsXlsx(customer_id) {
  // 直接下載：不要用 fetch，避免 blob 處理麻煩
  window.open(`/api/v2/models/export?customer_id=${encodeURIComponent(customer_id)}`, "_blank");
}

function apiDownloadModelsTemplate() {
  window.open(`/api/v2/models/template`, "_blank");
}

async function apiImportModelsXlsx(customer_id, file) {
  const fd = new FormData();
  fd.append("file", file);

  return api(`/models/import`, {
    method: "POST",
    params: { customer_id },
    body: fd,
    // ⚠️ 你的 api() 若會預設 JSON header，需讓它偵測 FormData 時不要強塞 Content-Type
  });
}

window.apiExportModelsXlsx = apiExportModelsXlsx;
window.apiDownloadModelsTemplate = apiDownloadModelsTemplate;
window.apiImportModelsXlsx = apiImportModelsXlsx;


/* ================= 導出 ================= */
window.apiListMachineModels = apiListMachineModels;
window.apiGetMachineModel = apiGetMachineModel;
window.apiCreateMachineModel = apiCreateMachineModel;
window.apiUpdateMachineModel = apiUpdateMachineModel;
window.apiDeleteMachineModel = apiDeleteMachineModel;
window.apiGetModelDetail = apiGetModelDetail;
