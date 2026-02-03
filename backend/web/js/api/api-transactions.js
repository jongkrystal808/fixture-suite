/**
 * Transactions API Client (v4.x FINAL - MERGED)
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不處理 token
 * - ❌ 不直接 fetch
 * - ✅ 一律透過 api-config.js
 * - ✅ receipt / return 由 transaction_type 決定
 */

/* ============================================================
 * VIEW ALL：交易總檢視（查詢用）
 * GET /transactions/view-all
 * ============================================================ */
function apiListTransactions(params = {}) {
  return api("/transactions/view-all", {
    params: {
      transaction_type: params.transaction_type, // receipt | return
      fixture_id: params.fixture_id,
      order_no: params.order_no,
      operator: params.operator,
      record_type: params.record_type,
      serial: params.serial,
      datecode: params.datecode,
      date_from: params.date_from,
      date_to: params.date_to,
      skip: Number.isInteger(params.skip) ? params.skip : undefined,
      limit: Number.isInteger(params.limit) ? params.limit : undefined,
    },
  });
}

/* ============================================================
 * GET：取得單筆交易（明細）
 * GET /transactions/{id}
 * ============================================================ */
function apiGetTransaction(id) {
  if (!id) {
    throw new Error("apiGetTransaction: id is required");
  }
  return api(`/transactions/${encodeURIComponent(id)}`);
}

/* ============================================================
 * POST：新增交易（收料 / 退料）
 * POST /transactions
 * ============================================================ */
function apiCreateTransaction(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("apiCreateTransaction: invalid payload");
  }

  if (!payload.transaction_type) {
    throw new Error("apiCreateTransaction: transaction_type is required");
  }

  return api("/transactions", {
    method: "POST",
    body: payload,
  });
}

/* ============================================================
 * IMPORT：交易 Excel 匯入（合併版）
 * POST /transactions/import
 * ============================================================ */
function apiImportTransactionsXlsx(file) {
  if (!file) {
    throw new Error("apiImportTransactionsXlsx: file is required");
  }

  const form = new FormData();
  form.append("file", file);

  return api("/transactions/import", {
    method: "POST",
    body: form,
  });
}

/* ============================================================
 * EXPORT：單筆交易匯出（XLSX）
 * GET /transactions/{id}/export
 * ============================================================ */
function apiExportTransactionXlsx(transactionId) {
  if (!transactionId) {
    throw new Error("apiExportTransactionXlsx: transactionId is required");
  }

  window.open(
    apiURL(`/transactions/${encodeURIComponent(transactionId)}/export`),
    "_blank"
  );
}

/* ============================================================
 * Export to window（給 app-transactions.js 用）
 * ============================================================ */
window.apiListTransactions = apiListTransactions;
window.apiGetTransaction = apiGetTransaction;
window.apiCreateTransaction = apiCreateTransaction;
window.apiImportTransactionsXlsx = apiImportTransactionsXlsx;
window.apiExportTransactionXlsx = apiExportTransactionXlsx;
