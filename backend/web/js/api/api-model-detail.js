/**
 * api-model-detail.js (v4.0)
 * 專門對應後端 model-detail.py (v4.0)
 *
 * 提供功能：
 * - 站點綁定：查詢 / 新增 / 刪除
 * - 治具需求：查詢 / 新增 / 更新 / 刪除
 * - Model Detail 三段式資料載入
 */

//////////////////////////////
//  1️⃣ 已綁定站點
//////////////////////////////

function apiListBoundStations(params) {
  return api("/model-detail/stations", { params });
}

//////////////////////////////
//  2️⃣ 可綁定站點
//////////////////////////////

function apiListAvailableStations(params) {
  return api("/model-detail/stations/available", { params });
}

//////////////////////////////
//  3️⃣ 綁定站點
//////////////////////////////

function apiBindStation({ customer_id, model_id, station_id }) {
  return api("/model-detail/stations", {
    method: "POST",
    params: { customer_id, model_id },
    body: JSON.stringify({ station_id }),
  });
}


//////////////////////////////
//  4️⃣ 取消綁定
//////////////////////////////

function apiUnbindStation({ customer_id, model_id, station_id }) {
  return api("/model-detail/stations", {
    method: "DELETE",
    params: { customer_id, model_id, station_id },
  });
}


//////////////////////////////
//  5️⃣ 查詢某站點的治具需求
//////////////////////////////

function apiListRequirements(params) {
  return api("/model-detail/requirements", { params });
}

//////////////////////////////
//  6️⃣ 新增治具需求
//////////////////////////////
function apiAddRequirement(data) {
  return api("/model-detail/requirements", {
    method: "POST",
    body: JSON.stringify(data),
  });
}


//////////////////////////////
//  7️⃣ 更新治具需求
//////////////////////////////
function apiUpdateRequirement(req_id, data) {
  return api(`/model-detail/requirements/${req_id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}


//////////////////////////////
//  8️⃣ 刪除治具需求
//////////////////////////////

function apiDeleteRequirement(req_id) {
  return api(`/model-detail/requirements/${req_id}`, {
    method: "DELETE",
  });
}

//////////////////////////////
//  9️⃣ Model Detail（站點 + 治具需求 + 最大可開站數）
//////////////////////////////

function apiGetModelDetail(model_id, customer_id) {
  return api(`/model-detail/${model_id}/detail`, {
    params: { customer_id },
  });
}

//////////////////////////////
//  導出全域
//////////////////////////////

window.apiListBoundStations = apiListBoundStations;
window.apiListAvailableStations = apiListAvailableStations;
window.apiBindStation = apiBindStation;
window.apiUnbindStation = apiUnbindStation;
window.apiListRequirements = apiListRequirements;
window.apiAddRequirement = apiAddRequirement;
window.apiUpdateRequirement = apiUpdateRequirement;
window.apiDeleteRequirement = apiDeleteRequirement;
window.apiGetModelDetail = apiGetModelDetail;
