/**
 * api-inventory.js
 * Inventory related APIs (FINAL)
 *
 * ✔ Serial inventory
 * ✔ Datecode inventory
 * ✔ Inventory history (receipt / return / batch / datecode)
 *
 * ❌ 不處理 auth
 * ❌ 不處理 customer
 * ❌ 不存在 L3 / audit
 */

/* ============================================================
 * Serial Inventory
 * ============================================================ */

/**
 * 取得序號庫存
 *
 * - 不帶參數：全庫存（L1 summary 暫用）
 * - 帶 fixture_id：指定治具（L2 明細）
 */
function apiInventorySerial(params = {}) {
  return api("/inventory/serial", {
    params
  });
}

/* ============================================================
 * Datecode Inventory
 * ============================================================ */

/**
 * 取得 Datecode 庫存（L2）
 * - fixture_id 必填
 */
function apiInventoryDatecode(params = {}) {
  return api("/inventory/datecode", {
    params
  });
}

/* ============================================================
 * Inventory History
 * ============================================================ */

/**
 * 取得庫存異動歷史（整合）
 * - serial / batch / datecode
 * - receipt / return
 */
function apiInventoryHistory(params = {}) {
  return api("/inventory/history", {
    params
  });
}

async function apiInventorySearch({ fixture_id, keyword }) {
  return api("/inventory/search", {
    params: {
      fixture_id,
      keyword
    }
  });
}


/* ============================================================
 * Exports (Global)
 * ============================================================ */

window.apiInventorySerial = apiInventorySerial;
window.apiInventoryDatecode = apiInventoryDatecode;
window.apiInventoryHistory = apiInventoryHistory;
window.apiInventorySearch = apiInventorySearch;