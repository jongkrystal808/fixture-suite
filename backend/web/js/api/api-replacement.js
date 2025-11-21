/**
 * 更換記錄 API
 * api-replacement.js
 *
 * 對應後端路由：
 *   /api/v2/logs/replacement
 *
 * 功能：
 *   - 查詢更換記錄
 *   - 新增單筆更換記錄
 *   - 批量新增（record_count）
 *   - 匯入 Excel（前端轉 JSON → 後端 /import）
 *   - 刪除
 */

/* ---------------------------------------------------------
 * 基本方法
 * --------------------------------------------------------- */

/**
 * 查詢更換記錄列表
 * @param {object} params - 查詢參數
 *   例如：{ skip:0, limit:30, fixture_id:'L-0001', executor:'100182', date_from:'2025-11-01', date_to:'2025-11-30' }
 */
async function apiListReplacementLogs(params = {}) {
  const query = new URLSearchParams(params).toString();
  return api(`/logs/replacement?${query}`);
}

/**
 * 新增單筆更換記錄
 * @param {object} data - 更換記錄資料
 *   {
 *     fixture_id: 'L-0001',
 *     replacement_date: '2025-11-14',
 *     reason: '週期到期',
 *     executor: '100182',
 *     note: '第 3 次更換'
 *   }
 */
async function apiCreateReplacementLog(data) {
  return api('/logs/replacement', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 批量新增更換記錄（相同內容，重複 record_count 筆）
 * @param {object} data
 *   {
 *     fixture_id: 'L-0001',
 *     replacement_date: '2025-11-14',
 *     reason: '週期到期',
 *     executor: '100182',
 *     note: '批量更換',
 *     record_count: 10
 *   }
 */
async function apiBatchReplacementLogs(data) {
  return api('/logs/replacement/batch', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 刪除更換記錄
 * @param {number} replacementId - 更換記錄 ID
 */
async function apiDeleteReplacementLog(replacementId) {
  return api(`/logs/replacement/${replacementId}`, {
    method: 'DELETE',
  });
}

/* ---------------------------------------------------------
 * Excel 匯入：解析 .xlsx → JSON → 後端傳入
 * --------------------------------------------------------- */

/**
 * 匯入更換記錄 .xlsx
 *
 * Excel 格式（版本 C）：
 *   fixture_id | replacement_date | reason | executor | note
 *
 * @param {File} file - 使用者上傳的 .xlsx 檔
 * @returns {Promise<object>} 後端回傳結果：
 *   {
 *     message: "...",
 *     success_count: 10,
 *     fail_count: 2,
 *     skipped_rows: [
 *       { row: 3, fixture_id: 'L-9999', error: '治具編號不存在' },
 *       ...
 *     ]
 *   }
 */
async function apiImportReplacementLogsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // 將工作表轉為 JSON 陣列，第一列視為表頭欄位
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // 依照你指定的欄位（版本 C）轉換成後端期待格式
        const rows = rawRows.map((r) => ({
          fixture_id: (r.fixture_id || '').trim(),
          replacement_date: r.replacement_date || null, // 讓後端 Pydantic 解析日期字串
          reason: r.reason || null,
          executor: r.executor || null,
          note: r.note || null,
        }));

        const result = await api('/logs/replacement/import', {
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
 * 導出至全域
 * --------------------------------------------------------- */

window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiBatchReplacementLogs = apiBatchReplacementLogs;
window.apiImportReplacementLogsXlsx = apiImportReplacementLogsXlsx;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;
