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

let replacementPage = 1;
const replacementPageSize = 20;


/* ============================================================
 * 查詢使用紀錄列表
 * GET /usage
 * ============================================================ */
function apiListUsageLogs(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    fixtureId,
    stationId,
    modelId,
    serialNumber,
    operator,
  } = params;

  return api("/usage", {
    params: {
      skip: (page - 1) * pageSize,
      limit: pageSize,
      fixture_id: fixtureId || undefined,
      station_id: stationId || undefined,
      model_id: modelId || undefined,
      serial_number: serialNumber || undefined,
      operator: operator || undefined,
    },
  });
}

/* ============================================================
 * 新增使用紀錄
 * POST /usage
 * ============================================================ */
function apiCreateUsageLog(data) {
  if (!data || typeof data !== "object") {
    throw new Error("apiCreateUsageLog: invalid data");
  }
  if (!data.fixture_id || !data.station_id || !data.model_id) {
    throw new Error("apiCreateUsageLog: fixture_id, model_id, station_id are required");
  }

  return api("/usage", {
    method: "POST",
    body: data,
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
 * 🔍 Lookup：依機種取得站點
 * GET /model-detail/lookup/stations-by-model
 * ============================================================ */
function apiLookupStationsByModel(modelId) {
  if (!modelId) {
    throw new Error("apiLookupStationsByModel: modelId is required");
  }

  return api("/model-detail/lookup/stations-by-model", {
    params: { model_id: modelId },
  });
}

/* ============================================================
 * 🔍 Lookup：依機種 + 站點取得治具
 * GET /model-detail/lookup/fixtures-by-model-station
 * ============================================================ */
function apiLookupFixturesByModelStation(modelId, stationId) {
  if (!modelId || !stationId) {
    throw new Error("apiLookupFixturesByModelStation: modelId & stationId are required");
  }

  return api("/model-detail/lookup/fixtures-by-model-station", {
    params: {
      model_id: modelId,
      station_id: stationId,
    },
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
window.apiDeleteUsageLog = apiDeleteUsageLog;

window.apiLookupStationsByModel = apiLookupStationsByModel;
window.apiLookupFixturesByModelStation = apiLookupFixturesByModelStation;


