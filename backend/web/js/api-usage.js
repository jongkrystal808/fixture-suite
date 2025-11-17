/**
 * 使用記錄 API
 * api-usage.js
 *
 * 對應後端路由：
 *   /api/v2/logs/usage
 *
 * 功能：
 *   - 查詢使用記錄
 *   - 新增單筆使用記錄
 *   - 批量新增（record_count）
 *   - 匯入 Excel（前端轉 JSON → 後端 /import）
 *   - 刪除
 */

/* ---------------------------------------------------------
 * 基本方法
 * --------------------------------------------------------- */

/**
 * 查詢使用記錄列表
 * @param {object} params - 查詢參數
 */
async function apiListUsageLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/logs/usage?${query}`);
}

/**
 * 新增單筆使用記錄
 */
async function apiCreateUsageLog(data) {
  return api('/logs/usage', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 批量新增使用記錄（record_count 同內容）
 */
async function apiBatchUsageLogs(data) {
  return api('/logs/usage/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 刪除使用記錄
 */
async function apiDeleteUsageLog(logId) {
  return api(`/logs/usage/${logId}`, {
    method: 'DELETE',
  });
}

/* ---------------------------------------------------------
 * Excel 匯入：解析 .xlsx → JSON → 後端傳入
 * --------------------------------------------------------- */

async function apiImportUsageLogsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // 解析成 JSON（第一列為欄位）
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Excel 使用記錄匯入格式（版本 A）：
        // fixture_id | station_id | use_count | abnormal_status | operator | note | used_at

        const rows = rawRows.map((r, index) => ({
          fixture_id: (r.fixture_id || '').trim(),
          station_id: r.station_id !== '' ? Number(r.station_id) : null,
          use_count: r.use_count !== '' ? Number(r.use_count) : 1,
          abnormal_status: r.abnormal_status || null,
          operator: r.operator || null,
          note: r.note || null,
          used_at: r.used_at ? new Date(r.used_at) : null,
        }));

        // call backend
        const result = await api('/logs/usage/import', {
          method: 'POST',
          body: JSON.stringify(rows),
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);

    reader.readAsBinaryString(file);
  });
}

/* ---------------------------------------------------------
 * 導出
 * --------------------------------------------------------- */

window.apiListUsageLogs = apiListUsageLogs;
window.apiCreateUsageLog = apiCreateUsageLog;
window.apiBatchUsageLogs = apiBatchUsageLogs;
window.apiImportUsageLogsXlsx = apiImportUsageLogsXlsx;
window.apiDeleteUsageLog = apiDeleteUsageLog;
