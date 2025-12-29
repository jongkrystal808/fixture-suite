/**
 * api-returns.js (v3.5 final)
 * 退料 API（與收料 receipts 同規格）
 *
 * ✔ customer_id 必帶
 * ✔ skip / limit
 * ✔ 匯入 XLSX
 * ✔ 退料新增 / 刪除
 * ✔ 匯出 CSV blob
 * ✔ 完全與 app-returns.js 對齊
 */

/* ============================================================
 * Helper: 取 customer_id
 * ============================================================ */
function _getCustomerId() {
  return (
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id")
  );
}

/* ============================================================
 * 查詢退料列表
 * GET /returns
 * ============================================================ */

async function apiListReturns(params = {}) {
  const q = new URLSearchParams();

  const customer_id = params.customer_id || _getCustomerId();
  if (customer_id) q.set("customer_id", customer_id);

  if (params.fixture_id) q.set("fixture_id", params.fixture_id);
  if (params.order_no) q.set("order_no", params.order_no);
  if (params.operator) q.set("operator", params.operator);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.serial) q.set("serial", params.serial);

    if (Number.isInteger(params.skip) && params.skip >= 0) {
      q.set("skip", params.skip);
    }

    if (Number.isInteger(params.limit) && params.limit > 0) {
      q.set("limit", params.limit);
    }


  return api(`/returns?${q.toString()}`);
}

/* ============================================================
 * 取得單筆退料
 * GET /returns/{id}
 * ============================================================ */

async function apiGetReturn(id) {
  const customer_id = _getCustomerId();
  return api(`/returns/${encodeURIComponent(id)}?customer_id=${customer_id}`);
}

/* ============================================================
 * 新增退料
 * POST /returns
 * ============================================================ */

async function apiCreateReturn(payload) {
  const customer_id = _getCustomerId();

  return api("/returns", {
    method: "POST",
    body: {
      ...payload,
      customer_id
    }
  });
}

/* ============================================================
 * 刪除退料
 * DELETE /returns
 * Body: {customer_id, id}
 * ============================================================ */

async function apiDeleteReturn(id, customer_id) {
  return api(`/returns/${id}?customer_id=${customer_id}`, {
    method: "DELETE"
  });
}
async function apiDeleteReturnDetail(detailId) {
  const customer_id = _getCustomerId();
  return api(`/returns/details/${encodeURIComponent(detailId)}?customer_id=${customer_id}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 匯入 XLSX（v3.5）
 * POST /returns/import
 * ============================================================ */

async function apiImportReturnsXlsx(file, customer_id) {
  const form = new FormData();
  form.append("file", file);

  const cid = customer_id || _getCustomerId();
  const token = localStorage.getItem("auth_token");

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(apiURL("/returns/import"), window.location.origin);
  if (cid) url.searchParams.set("customer_id", cid);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: form
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`匯入失敗: ${res.status} ${txt}`);
  }

  return res.json();
}

/* ============================================================
 * 匯出 CSV
 * GET /returns/{id}/export
 * 回傳 blob
 * ============================================================ */

async function apiExportReturnCsv(returnId) {
  const token = localStorage.getItem("auth_token");
  const customer_id = _getCustomerId();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(
    apiURL(`/returns/${encodeURIComponent(returnId)}/export`),
    window.location.origin
  );
  if (customer_id) url.searchParams.set("customer_id", customer_id);

  const res = await fetch(url.toString(), { method: "GET", headers });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Export failed: ${res.status} ${txt}`);
  }

  return await res.blob();
}

/* ============================================================
 * Export to window
 * ============================================================ */

window.apiListReturns = apiListReturns;
window.apiGetReturn = apiGetReturn;
window.apiCreateReturn = apiCreateReturn;
window.apiDeleteReturn = apiDeleteReturn;
window.apiImportReturnsXlsx = apiImportReturnsXlsx;
window.apiExportReturnCsv = apiExportReturnCsv;
window.apiDeleteReturnDetail = apiDeleteReturnDetail;