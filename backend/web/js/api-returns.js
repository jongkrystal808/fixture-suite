/**
 * 退料相關 API
 * api-returns.js
 *
 * 後端路由：
 *   GET    /api/v2/returns
 *   POST   /api/v2/returns
 *   DELETE /api/v2/returns/{id}
 *
 * 退料欄位（returns_table）：
 *   id, type('batch'|'individual'), vendor, order_no,
 *   fixture_code, serial_start, serial_end, serials,
 *   operator, note, created_at
 */

/* ---------------------------------------------------------
 * 基本 CRUD
 * --------------------------------------------------------- */

/**
 * 查詢退料記錄列表
 * @param {object} params 查詢條件
 */
async function apiListReturns(params = {}) {
  const query = new URLSearchParams(params).toString();
  const path = query ? `/returns?${query}` : `/returns`;
  return api(path);
}

/**
 * 新增一筆退料記錄
 * @param {object} data
 *   {
 *     type: 'batch' | 'individual',
 *     vendor: string,
 *     order_no: string,
 *     fixture_code: string,
 *     serial_start?: string,
 *     serial_end?: string,
 *     serials?: string,
 *     operator?: string,
 *     note?: string
 *   }
 */
async function apiCreateReturn(data) {
  return api('/returns', {
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
 * 刪除退料記錄
 */
async function apiDeleteReturn(id) {
  return api(`/returns/${id}`, {
    method: 'DELETE'
  });
}

/* ---------------------------------------------------------
 * Excel 匯入：解析 .xlsx → JSON → 後端
 * --------------------------------------------------------- */

/**
 * 匯入退料 Excel
 *
 * Excel 欄位格式（建議與收料一致）：
 *   type | vendor | order_no | fixture_code |
 *   serial_start | serial_end | serials | operator | note
 *
 * 由於後端尚未提供 /returns/import
 * 故此處會「逐筆呼叫 apiCreateReturn」
 */
async function apiImportReturnsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

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

        let successCount = 0;
        const skippedRows = [];

        for (let i = 0; i < rows.length; i++) {
          const excelRowNo = i + 2;
          const row = rows[i];

          if (!row.fixture_code) {
            skippedRows.push({
              row: excelRowNo,
              error: 'fixture_code 必填'
            });
            continue;
          }

          try {
            await apiCreateReturn(row);
            successCount++;
          } catch (err) {
            skippedRows.push({
              row: excelRowNo,
              error: String(err)
            });
          }
        }

        const failCount = skippedRows.length;
        const message =
          failCount === 0
            ? '退料匯入完成，全部成功'
            : '退料匯入完成，有部分資料被略過';

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
 * 導出到全域（給 app-returns.js 使用）
 * --------------------------------------------------------- */

window.apiListReturns = apiListReturns;
window.apiCreateReturn = apiCreateReturn;
window.apiDeleteReturn = apiDeleteReturn;
window.apiImportReturnsXlsx = apiImportReturnsXlsx;
