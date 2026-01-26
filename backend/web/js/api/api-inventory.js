/* ============================================================
 * Serial Inventory
 * ============================================================ */
function apiInventorySerial(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/inventory/serial?${qs}`);
}

/* ============================================================
 * Datecode Inventory
 * ============================================================ */
function apiInventoryDatecode(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/inventory/datecode?${qs}`);
}

/* ============================================================
 * Inventory History
 * ============================================================ */
function apiInventoryHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/inventory/history?${qs}`);
}

function apiInventorySearch({ fixture_id, keyword }) {
  const qs = new URLSearchParams({ fixture_id, keyword }).toString();
  return api(`/inventory/search?${qs}`);
}

window.apiInventorySerial = apiInventorySerial;
window.apiInventoryDatecode = apiInventoryDatecode;
window.apiInventoryHistory = apiInventoryHistory;
window.apiInventorySearch = apiInventorySearch;
