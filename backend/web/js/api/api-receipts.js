/**
 * api-receipts.js (Final v3.6)
 * - 與 api-returns.js 完全統一規格
 * - customer_id 一律從 Query 帶
 * - 匯入 / 匯出改用 fetch + blob（避免 JSON parse）
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
 * LIST：查詢收料
 * GET /receipts
 * ============================================================ */
async function apiListReceipts(params = {}) {
  const q = new URLSearchParams();
  const customer_id = params.customer_id || _getCustomerId();

  if (customer_id) q.set("customer_id", customer_id);

  if (params.fixture_id) q.set("fixture_id", params.fixture_id);
  if (params.order_no) q.set("order_no", params.order_no);
  if (params.operator) q.set("operator", params.operator);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  if (params.serial) q.set("serial", params.serial);
  if (params.skip !== undefined) q.set("skip", params.skip);
  if (params.limit !== undefined) q.set("limit", params.limit);

  return api(`/receipts?${q.toString()}`);
}

/* ============================================================
 * GET：取得單筆
 * ============================================================ */
async function apiGetReceipt(id) {
  const customer_id = _getCustomerId();
  return api(`/receipts/${encodeURIComponent(id)}?customer_id=${customer_id}`);
}

/* ============================================================
 * POST：新增收料
 * ============================================================ */
async function apiCreateReceipt(payload) {
  const customer_id = _getCustomerId();

  return api(`/receipts?customer_id=${customer_id}`, {
    method: "POST",
    body: payload   // ❗不可 stringify，交給 api-config 自動處理
  });
}

/* ============================================================
 * POST：新增序號
 * ============================================================ */
async function apiAddReceiptDetails(receiptId, serials) {
  const customer_id = _getCustomerId();

  return api(
    `/receipts/${encodeURIComponent(receiptId)}/details?customer_id=${customer_id}`,
    {
      method: "POST",
      body: { serials }
    }
  );
}

/* ============================================================
 * DELETE：刪除明細
 * ============================================================ */
async function apiDeleteReceiptDetail(detailId) {
  const customer_id = _getCustomerId();

  return api(
    `/receipts/details/${encodeURIComponent(detailId)}?customer_id=${customer_id}`,
    { method: "DELETE" }
  );
}

/* ============================================================
 * DELETE：刪除收料單
 * ============================================================ */
async function apiDeleteReceipt(id, customer_id) {
  const cid = customer_id || _getCustomerId();

  return api(`/receipts/${id}?customer_id=${cid}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 匯入 CSV / XLSX
 * ============================================================ */
async function apiImportReceiptsCsv(file) {
  const form = new FormData();
  form.append("file", file);

  const customer_id = _getCustomerId();
  const token = localStorage.getItem("auth_token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(apiURL("/receipts/import"), window.location.origin);
  url.searchParams.set("customer_id", customer_id);

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
 * 匯出 CSV（不可用 api()）
 * ============================================================ */
async function apiExportReceiptCsv(receiptId) {
  const token = localStorage.getItem("auth_token");
  const customer_id = _getCustomerId();

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(
    apiURL(`/receipts/${encodeURIComponent(receiptId)}/export`),
    window.location.origin
  );
  url.searchParams.set("customer_id", customer_id);

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
window.apiListReceipts = apiListReceipts;
window.apiGetReceipt = apiGetReceipt;
window.apiCreateReceipt = apiCreateReceipt;
window.apiAddReceiptDetails = apiAddReceiptDetails;
window.apiDeleteReceiptDetail = apiDeleteReceiptDetail;
window.apiDeleteReceipt = apiDeleteReceipt;
window.apiImportReceiptsCsv = apiImportReceiptsCsv;
window.apiExportReceiptCsv = apiExportReceiptCsv;
