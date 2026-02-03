/**
 * Returns API Client (v4.x FINAL)
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行處理 token
 * - ❌ 不直接 fetch
 * - ✅ 一律透過 api-config.js
 * - ✅ 與 api-receipts.js 完全同構
 */

/* ============================================================
 * LIST：查詢退料
 * GET /returns
 * ============================================================ */
function apiListReturns(params = {}) {
  return api("/returns", {
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
 * GET：取得單筆退料
 * GET /returns/{id}
 * ============================================================ */
function apiGetReturn(id) {
  if (!id) {
    throw new Error("apiGetReturn: id is required");
  }
  return api(`/returns/${encodeURIComponent(id)}`);
}

/* ============================================================
 * POST：新增退料
 * POST /returns
 * ============================================================ */
function apiCreateReturn(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("apiCreateReturn: invalid payload");
  }

  return api("/returns", {
    method: "POST",
    body: payload,
  });
}

/* ============================================================
 * IMPORT：Excel 匯入（XLSX）
 * POST /returns/import
 * ============================================================ */
function apiImportReturnsXlsx(file) {
  if (!file) {
    throw new Error("apiImportReturnsXlsx: file is required");
  }

  const form = new FormData();
  form.append("file", file);

  return api("/returns/import", {
    method: "POST",
    body: form,
  });
}

/* ============================================================
 * EXPORT：匯出單筆退料（XLSX）
 * GET /returns/{id}/export
 * ============================================================ */
function apiExportReturnXlsx(returnId) {
  if (!returnId) {
    throw new Error("apiExportReturnXlsx: returnId is required");
  }

  // 下載類 API：直接交給瀏覽器
  window.open(
    apiURL(`/returns/${encodeURIComponent(returnId)}/export`),
    "_blank"
  );
}

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiListReturns = apiListReturns;
window.apiGetReturn = apiGetReturn;
window.apiCreateReturn = apiCreateReturn;
window.apiImportReturnsXlsx = apiImportReturnsXlsx;
window.apiExportReturnXlsx = apiExportReturnXlsx;

