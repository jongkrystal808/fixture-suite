/**
 * 收料相關 API
 * api-receipts.js
 *
 * 對應後端路由：
 *   GET    /api/v2/receipts
 *   POST   /api/v2/receipts
 *   DELETE /api/v2/receipts/{id}
 *
 * 資料庫欄位 (receipts)：
 *   id, type('batch'|'individual'), vendor, order_no,
 *   fixture_code, serial_start, serial_end, serials,
 *   operator, note, created_at
 */

/* ---------------------------------------------------------
 * 基本 CRUD
 * --------------------------------------------------------- */

/**
 * 查詢收料記錄列表
 * @param {object} params 查詢條件
 *  例如：
 *    { fixture_code: 'L-0001', vendor: 'XXX', order_no: 'PO123' }
 */
async function apiListReceipts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const path = query ? `/receipts?${query}` : '/receipts';
  return api(path);
}

/**
 * 新增一筆收料記錄
 * @param {object} data
 *  {
 *    type: 'batch' | 'individual',
 *    vendor: string,
 *    order_no: string,
 *    fixture_code: string,
 *    serial_start?: string,   // type = 'batch' 時使用
 *    serial_end?: string,     // type = 'batch' 時使用
 *    serials?: string,        // type = 'individual' 時使用，逗號分隔
 *    operator?: string,
 *    note?: string
 *  }
 */
async function apiCreateReceipt(data) {
  return api('/receipts', {
    method: 'POST',
    body: JSON.stringify({
      type: data.type || 'batch',
      vendor: data.vendor || null,
      order_no: data.order_no || null,
      fixture_code: data.fixture_code || null,
      serial_start: data.type === 'batch' ? (data.serial_start || null) : null,
      serial_end: data.type === 'batch' ? (data.serial_end || null) : null,
      serials: data.type === 'individual' ? (data.serials || null) : null,
      operator: data.operator || null,
      note: data.note || null
    })
  });
}

/**
 * 刪除收料記錄
 * @param {number} id 收料記錄 ID
 */
async function apiDeleteReceipt(id) {
  return api(`/receipts/${id}`, {
    method: 'DELETE'
  });
}

/* ---------------------------------------------------------
 * Excel 匯入：解析 .xlsx → JSON → 後端
 * --------------------------------------------------------- */

/**
 * 匯入收料 Excel
 *
 * Excel 欄位建議格式：
 *   type | vendor | order_no | fixture_code |
 *   serial_start | serial_end | serials | operator | note
 *
 * 說明：
 *   - type = 'batch' → 使用 serial_start + serial_end
 *   - type = 'individual' → 使用 serials (逗號分隔)
 */
async function apiImportReceiptsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        // 轉換為 JSON，每列對應一筆資料，第一列是欄名
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // 轉換成後端預期結構
        const rows = rawRows.map((r) => {
          const type = (r.type || 'batch').toLowerCase();
          return {
            type: type === 'individual' ? 'individual' : 'batch',
            vendor: (r.vendor || '').trim() || null,
            order_no: (r.order_no || '').trim() || null,
            fixture_code: (r.fixture_code || '').trim() || null,
            serial_start: type === 'batch' ? ((r.serial_start || '').trim() || null) : null,
            serial_end: type === 'batch' ? ((r.serial_end || '').trim() || null) : null,
            serials: type === 'individual' ? ((r.serials || '').trim() || null) : null,
            operator: (r.operator || '').trim() || null,
            note: (r.note || '').trim() || null
          };
        });

        // 這裡有兩種設計方式：
        // 1) 後端提供 /receipts/import 批次 API
        // 2) 前端逐筆呼叫 apiCreateReceipt（簡單但較多請求）
        //
        // 目前我們先採用「逐筆呼叫」，若你之後新增 /receipts/import 再改也很容易。

        let successCount = 0;
        const skippedRows = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const excelRowNo = i + 2; // Excel 實際列號（第 1 列是表頭）

          // 基本欄位檢查
          if (!row.fixture_code) {
            skippedRows.push({
              row: excelRowNo,
              error: 'fixture_code 必填'
            });
            continue;
          }

          try {
            await apiCreateReceipt(row);
            successCount++;
          } catch (err) {
            skippedRows.push({
              row: excelRowNo,
              error: String(err)
            });
          }
        }

        const failCount = skippedRows.length;
        const message = failCount === 0
          ? '收料匯入完成，全部成功'
          : '收料匯入完成，有部分資料被略過';

        resolve({
          message,
          success_count: successCount,
          fail_count: failCount,
          skipped_rows: skippedRows
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);

    reader.readAsBinaryString(file);
  });
}

/* ---------------------------------------------------------
 * 導出到全域（給 app-receipts.js 使用）
 * --------------------------------------------------------- */

window.apiListReceipts = apiListReceipts;
window.apiCreateReceipt = apiCreateReceipt;
window.apiDeleteReceipt = apiDeleteReceipt;
window.apiImportReceiptsXlsx = apiImportReceiptsXlsx;
