/**
 * Usage Logs API Client (v4.x FINAL)
 *
 * 對應後端 /api/v2/usage
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行 stringify
 * - ❌ 不自行處理 token
 * - ✅ 一律透過 api-config.js
 */

/* ============================================================
 * 查詢使用紀錄列表
 * GET /usage
 * ============================================================ */
/**
 * params:
 * {
 *   page?: number,
 *   pageSize?: number,
 *   fixtureId?: string,
 *   stationId?: string,
 *   operator?: string
 * }
 */
function apiListUsageLogs(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    fixtureId,
    stationId,
    operator,
  } = params;

  return api("/usage", {
    params: {
      skip: (page - 1) * pageSize,
      limit: pageSize,
      fixture_id: fixtureId || undefined,
      station_id: stationId || undefined,
      operator: operator || undefined,
    },
  });
}

/* ============================================================
 * 新增單筆使用紀錄
 * POST /usage
 * ============================================================ */
/**
 * data:
 * {
 *   fixture_id,
 *   station_id,
 *   use_count,
 *   abnormal_status?,
 *   operator?,
 *   note?,
 *   used_at?
 * }
 */
function apiCreateUsageLog(data) {
  if (!data || typeof data !== "object") {
    throw new Error("apiCreateUsageLog: invalid data");
  }
  if (!data.fixture_id || !data.station_id) {
    throw new Error("apiCreateUsageLog: fixture_id & station_id are required");
  }

  return api("/usage", {
    method: "POST",
    body: data,
  });
}

/* ============================================================
 * 批量新增
 * POST /usage/batch
 * ============================================================ */
function apiBatchUsageLogs(rows) {
  if (!Array.isArray(rows)) {
    throw new Error("apiBatchUsageLogs: rows must be an array");
  }

  return api("/usage/batch", {
    method: "POST",
    body: rows,
  });
}

/* ============================================================
 * 刪除使用紀錄
 * DELETE /usage/{id}
 * ============================================================ */
function apiDeleteUsageLog(id) {
  if (!id) {
    throw new Error("apiDeleteUsageLog: id is required");
  }

  return api(`/usage/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * Excel 匯入
 * POST /usage/import
 * ============================================================ */
/**
 * Excel 欄位：
 * fixture_id | station_id | use_count | abnormal_status | operator | note | used_at
 */
function apiImportUsageLogsXlsx(file) {
  if (!file) {
    throw new Error("apiImportUsageLogsXlsx: file is required");
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
          station_id: String(r.station_id || "").trim(),
          use_count:
            r.use_count !== "" && !isNaN(r.use_count)
              ? Number(r.use_count)
              : 1,
          abnormal_status: r.abnormal_status || null,
          operator: r.operator || null,
          note: r.note || null,
          used_at: r.used_at
            ? new Date(r.used_at).toISOString()
            : null,
        }));

        const result = await api("/usage/import", {
          method: "POST",
          body: rows,
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiListUsageLogs = apiListUsageLogs;
window.apiCreateUsageLog = apiCreateUsageLog;
window.apiBatchUsageLogs = apiBatchUsageLogs;
window.apiImportUsageLogsXlsx = apiImportUsageLogsXlsx;
window.apiDeleteUsageLog = apiDeleteUsageLog;

console.log("✅ api-usage.js v4.x FINAL loaded");
