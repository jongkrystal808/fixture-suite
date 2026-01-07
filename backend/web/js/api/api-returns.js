/**
 * api-returns.js (v4.x FINAL)
 * - 與 api-receipts.js v4.x 完全同構
 * - Event-based（不可刪）
 * - customer_id 一律 Query
 * - 匯入 / 匯出使用 fetch + blob
 */


/* ============================================================
 * LIST：查詢退料（v4.x）
 * GET /returns
 * ============================================================ */
async function apiListReturns(params = {}) {
  const q = new URLSearchParams();

  if (params.fixture_id) q.set("fixture_id", params.fixture_id);
  if (params.order_no) q.set("order_no", params.order_no);
  if (params.operator) q.set("operator", params.operator);
  if (params.record_type) q.set("record_type", params.record_type);
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
 * GET：取得單筆退料（v4.x）
 * ============================================================ */
async function apiGetReturn(id) {
  const customer_id = _getCustomerId();
  return api(`/returns/${encodeURIComponent(id)}`);
}

/* ============================================================
 * POST：新增退料（v4.x）
 * ============================================================ */
async function apiCreateReturn(payload) {
  const customer_id = _getCustomerId();

  return api(`/returns`, {
    method: "POST",
    body: payload
  });
}

/* ============================================================
 * IMPORT：Excel 匯入（XLSX）
 * POST /returns/import
 * ============================================================ */
async function apiImportReturnsXlsx(file) {
  const form = new FormData();
  form.append("file", file);

  const customer_id = _getCustomerId();
  const token = localStorage.getItem("auth_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(apiURL("/returns/import"), window.location.origin);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: form
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Import failed: ${res.status} ${txt}`);
  }

  return res.json();
}

/* ============================================================
 * EXPORT：匯出單筆退料（XLSX）
 * GET /returns/{id}/export
 * ============================================================ */
async function apiExportReturnXlsx(returnId) {
  const token = localStorage.getItem("auth_token");
  const customer_id = _getCustomerId();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(
    apiURL(`/returns/${encodeURIComponent(returnId)}/export`),
    window.location.origin
  );

  const res = await fetch(url.toString(), {
    method: "GET",
    headers
  });

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
window.apiImportReturnsXlsx = apiImportReturnsXlsx;
window.apiExportReturnXlsx = apiExportReturnXlsx;
