/**
 * 收退料相關 API 服務 (修正版)
 * api-receipts.js
 */

// ============================================
// 收料 API
// ============================================

/**
 * 查詢收料記錄列表
 */
async function apiListReceipts() {
  return api('/receipts');
}

/**
 * 建立收料記錄
 * @param {Object} receipt - 收料資料
 */
async function apiCreateReceipt(receipt) {
  return api('/receipts', {
    method: 'POST',
    body: JSON.stringify(receipt)
  });
}

/**
 * 刪除收料記錄
 * @param {number} id - 收料記錄 ID
 */
async function apiDeleteReceipt(id) {
  return api(`/receipts/${id}`, {
    method: 'DELETE'
  });
}

/**
 * 查詢收料統計摘要
 */
async function apiReceiptStats() {
  return api('/receipts/statistics/summary');
}

/**
 * 查詢最近收料記錄
 */
async function apiRecentReceipts(limit = 10) {
  return api(`/receipts/recent/list?limit=${limit}`);
}

// ============================================
// 退料 API
// ============================================

/**
 * 查詢退料記錄列表
 */
async function apiListReturns() {
  return api('/returns');
}

/**
 * 建立退料記錄
 * @param {Object} returnData - 退料資料
 */
async function apiCreateReturn(returnData) {
  return api('/returns', {
    method: 'POST',
    body: JSON.stringify(returnData)
  });
}

/**
 * 刪除退料記錄
 * @param {number} id - 退料記錄 ID
 */
async function apiDeleteReturn(id) {
  return api(`/returns/${id}`, {
    method: 'DELETE'
  });
}

// 匯出函數
window.apiListReceipts = apiListReceipts;
window.apiCreateReceipt = apiCreateReceipt;
window.apiDeleteReceipt = apiDeleteReceipt;
window.apiReceiptStats = apiReceiptStats;
window.apiRecentReceipts = apiRecentReceipts;
window.apiListReturns = apiListReturns;
window.apiCreateReturn = apiCreateReturn;
window.apiDeleteReturn = apiDeleteReturn;
