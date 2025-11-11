/**
 * 使用/更換記錄相關 API 服務
 * api-logs.js
 */

// ============================================
// 使用記錄 API
// ============================================

/**
 * 查詢使用記錄列表
 * @returns {Promise<Array>} 使用記錄列表
 */
async function apiListUsageLogs() {
  return api('/logs/usage');
}

/**
 * 建立使用記錄
 * @param {Object} log - 使用記錄資料
 * @returns {Promise<Object>} 建立的使用記錄
 */
async function apiCreateUsageLog(log) {
  return api('/logs/usage', {
    method: 'POST',
    body: JSON.stringify(log)
  });
}

/**
 * 刪除使用記錄
 * @param {number} id - 使用記錄 ID
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteUsageLog(id) {
  return api(`/logs/usage/${id}`, {
    method: 'DELETE'
  });
}

// ============================================
// 更換記錄 API
// ============================================

/**
 * 查詢更換記錄列表
 * @returns {Promise<Array>} 更換記錄列表
 */
async function apiListReplacementLogs() {
  return api('/logs/replacement');
}

/**
 * 建立更換記錄
 * @param {Object} log - 更換記錄資料
 * @returns {Promise<Object>} 建立的更換記錄
 */
async function apiCreateReplacementLog(log) {
  return api('/logs/replacement', {
    method: 'POST',
    body: JSON.stringify(log)
  });
}

/**
 * 刪除更換記錄
 * @param {number} id - 更換記錄 ID
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteReplacementLog(id) {
  return api(`/logs/replacement/${id}`, {
    method: 'DELETE'
  });
}

/**
 * 通用的記錄 API（相容舊版）
 * @param {Object} log - 記錄資料
 * @returns {Promise<Object>} 建立的記錄
 */
async function apiCreateLog(log) {
  // 根據類型判斷使用哪個 API
  if (log.type === 'replace' || log.type === 'replacement') {
    return apiCreateReplacementLog(log);
  } else {
    return apiCreateUsageLog(log);
  }
}

/**
 * 查詢所有記錄（相容舊版）
 * @returns {Promise<Array>} 所有記錄
 */
async function apiListLogs() {
  const [usageLogs, replacementLogs] = await Promise.all([
    apiListUsageLogs(),
    apiListReplacementLogs()
  ]);
  
  // 合併並排序
  return [...usageLogs, ...replacementLogs].sort((a, b) => {
    const dateA = new Date(a.used_at || a.replacement_date || a.created_at);
    const dateB = new Date(b.used_at || b.replacement_date || b.created_at);
    return dateB - dateA;
  });
}

/**
 * 刪除記錄（相容舊版）
 * @param {number} id - 記錄 ID
 * @param {string} type - 記錄類型
 * @returns {Promise<Object>} 刪除結果
 */
async function apiDeleteLog(id, type) {
  if (type === 'replace' || type === 'replacement') {
    return apiDeleteReplacementLog(id);
  } else {
    return apiDeleteUsageLog(id);
  }
}

// 匯出函數
window.apiListUsageLogs = apiListUsageLogs;
window.apiCreateUsageLog = apiCreateUsageLog;
window.apiDeleteUsageLog = apiDeleteUsageLog;
window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;
window.apiCreateLog = apiCreateLog;
window.apiListLogs = apiListLogs;
window.apiDeleteLog = apiDeleteLog;
