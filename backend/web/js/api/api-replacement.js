/**
 * Replacement Logs API Client (v4.x FINAL)
 *
 * 對應後端 replacement_logs v4.x
 *
 * 原則：
 * - ❌ 不讀取 currentCustomerId
 * - ❌ 不傳 customer_id
 * - ❌ 不碰 localStorage
 * - ❌ 不自行 JSON.stringify
 * - ✅ customer context 一律交給 api-config.js
 */

/* ============================================================
 * 查詢更換紀錄（分頁 / 篩選）
 * ============================================================ */

function apiListReplacementLogs(params = {}) {
  return api("/replacement", {
    params: {
      fixture_id: params.fixture_id,
      serial_number: params.serial_number,
      executor: params.executor,
      reason: params.reason,
      date_from: params.date_from,
      date_to: params.date_to,
      skip: params.skip ?? 0,
      limit: params.limit ?? 20,
    },
  });
}

/* ============================================================
 * 新增單筆更換紀錄
 * ============================================================ */
/**
 * data = {
 *   fixture_id,
 *   record_level: "fixture" | "serial",
 *   serial_number?: string | null,
 *   replacement_date,
 *   reason,
 *   executor,
 *   note?
 * }
 */
function apiCreateReplacementLog(data) {
  if (!data || typeof data !== "object") {
    throw new Error("apiCreateReplacementLog: invalid data");
  }

  return api("/replacement", {
    method: "POST",
    body: data,
  });
}

/* ============================================================
 * 批量新增
 * ============================================================ */

function apiBatchReplacementLogs(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("apiBatchReplacementLogs: rows must be an array");
  }

  return api("/replacement/batch", {
    method: "POST",
    body: rows,
  });
}

/* ============================================================
 * 刪除更換紀錄
 * ============================================================ */

function apiDeleteReplacementLog(id) {
  if (!id) {
    throw new Error("apiDeleteReplacementLog: id is required");
  }

  return api(`/replacement/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * 匯入 Excel (.xlsx)
 * - 僅處理資料結構，不決定 customer
 * ============================================================ */

function apiImportReplacementLogsXlsx(file) {
  if (!file) {
    throw new Error("apiImportReplacementLogsXlsx: file is required");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const rows = rawRows.map(r => ({
          fixture_id: String(r.fixture_id || "").trim(),
          record_level: String(r.record_level || "fixture").trim(),
          serial_number: String(r.serial_number || "").trim() || null,
          replacement_date: r.replacement_date
            ? new Date(r.replacement_date).toISOString()
            : null,
          reason: r.reason || null,
          executor: r.executor || null,
          note: r.note || null,
        }));

        const result = await api("/replacement/import", {
          method: "POST",
          body: rows,
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = err => reject(err);
    reader.readAsBinaryString(file);
  });
}

/* ============================================================
 * Export to Global
 * ============================================================ */

window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiBatchReplacementLogs = apiBatchReplacementLogs;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;
window.apiImportReplacementLogsXlsx = apiImportReplacementLogsXlsx;

console.log("✅ api-replacement.js v4.x FINAL loaded");
