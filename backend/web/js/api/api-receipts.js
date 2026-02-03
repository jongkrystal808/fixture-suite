/**
 * Receipts API Client (v4.x FINAL)
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行處理 token
 * - ❌ 不直接 fetch
 * - ✅ 一律透過 api-config.js
 */

/* ============================================================
 * LIST：查詢收料
 * GET /receipts
 * ============================================================ */
function apiListReceipts(params = {}) {
  return api("/receipts", {
    params: {
      fixture_id: params.fixture_id,
      order_no: params.order_no,
      operator: params.operator,
      record_type: params.record_type,
      date_from: params.date_from,
      date_to: params.date_to,
      serial: params.serial,
      skip: Number.isInteger(params.skip) ? params.skip : undefined,
      limit: Number.isInteger(params.limit) ? params.limit : undefined,
    },
  });
}

/* ============================================================
 * GET：取得單筆收料
 * GET /receipts/{id}
 * ============================================================ */
function apiGetReceipt(id) {
  if (!id) {
    throw new Error("apiGetReceipt: id is required");
  }
  return api(`/receipts/${encodeURIComponent(id)}`);
}

/* ============================================================
 * POST：新增收料
 * POST /receipts
 * ============================================================ */
function apiCreateReceipt(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("apiCreateReceipt: invalid payload");
  }

  return api("/receipts", {
    method: "POST",
    body: payload,
  });
}

/* ============================================================
 * IMPORT：Excel 匯入（XLSX）
 * POST /receipts/import
 * ============================================================ */
function apiImportReceiptsXlsx(file) {
  if (!file) {
    throw new Error("apiImportReceiptsXlsx: file is required");
  }

  const form = new FormData();
  form.append("file", file);

  return api("/receipts/import", {
    method: "POST",
    body: form,
  });
}

/* ============================================================
 * EXPORT：匯出單筆收料（XLSX）
 * GET /receipts/{id}/export
 * ============================================================ */
function apiExportReceiptXlsx(receiptId) {
  if (!receiptId) {
    throw new Error("apiExportReceiptXlsx: receiptId is required");
  }

  // 下載類 API：直接開新視窗最乾淨
  window.open(
    apiURL(`/receipts/${encodeURIComponent(receiptId)}/export`),
    "_blank"
  );
}

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiListReceipts = apiListReceipts;
window.apiGetReceipt = apiGetReceipt;
window.apiCreateReceipt = apiCreateReceipt;
window.apiImportReceiptsXlsx = apiImportReceiptsXlsx;
window.apiExportReceiptXlsx = apiExportReceiptXlsx;

