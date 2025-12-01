/**
 * 治具更換紀錄 API (v3.0)
 * api-replacement.js
 *
 * ✔ 新路由 /replacement
 * ✔ replacement_date
 * ✔ replace_reason（取代 reason）
 * ✔ operator（取代 executor）
 * ✔ 匯入 / 匯出 / 分頁全部更新
 */

/* ============================================================
 * 查詢更換紀錄（分頁 + 搜尋）
 * ============================================================ */

/**
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   fixtureId,
 *   operator,
 *   replaceReason
 * }
 */
async function apiListReplacementLogs(params = {}) {
  const {
    page = 1,
    pageSize = 20,
    fixtureId = "",
    operator = "",
    replaceReason = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));

  if (fixtureId) query.set("fixture_id", fixtureId);
  if (operator) query.set("operator", operator);
  if (replaceReason) query.set("replace_reason", replaceReason);

  return api(`/replacement?${query.toString()}`);
}

/* ============================================================
 * 新增一筆更換紀錄
 * ============================================================ */

/**
 * @param {object} data
 * {
 *   fixture_id,
 *   replacement_date,
 *   replace_reason,
 *   operator,
 *   note
 * }
 */
async function apiCreateReplacementLog(data) {
  return api("/replacement", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ============================================================
 * 批量新增（多筆相同內容）
 * ============================================================ */

async function apiBatchReplacementLogs(data) {
  return api("/replacement/batch", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ============================================================
 * 刪除更換紀錄
 * ============================================================ */

async function apiDeleteReplacementLog(id) {
  return api(`/replacement/${id}`, {
    method: "DELETE",
  });
}

/* ============================================================
 * 匯入 Excel：.xlsx → JSON → 後端
 * ============================================================ */

/**
 * v3.0 Excel 欄位必須是：
 * fixture_id | replacement_date | replace_reason | operator | note
 */
async function apiImportReplacementLogsXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const rows = rawRows.map((r) => ({
          fixture_id: (r.fixture_id || "").trim(),
          replacement_date: r.replacement_date ? new Date(r.replacement_date).toISOString() : null,
          replace_reason: r.replace_reason || null,
          operator: r.operator || null,
          note: r.note || null
        }));

        const result = await api("/replacement/import", {
          method: "POST",
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

/* ============================================================
 * 導出全域
 * ============================================================ */

window.apiListReplacementLogs = apiListReplacementLogs;
window.apiCreateReplacementLog = apiCreateReplacementLog;
window.apiBatchReplacementLogs = apiBatchReplacementLogs;
window.apiImportReplacementLogsXlsx = apiImportReplacementLogsXlsx;
window.apiDeleteReplacementLog = apiDeleteReplacementLog;
