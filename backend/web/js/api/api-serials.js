/**
 * Serial Utilities API (v4.x FINAL)
 *
 * 後端 routers/serials.py：
 * - GET  /serials/expand
 * - POST /serials/normalize
 * - POST /serials/validate
 * - POST /serials/detect-prefix
 * - POST /serials/range
 *
 * 原則：
 * - ❌ 不處理 customer_id
 * - ❌ 不自行 stringify
 * - ❌ 不自行處理 token
 * - ✅ 純工具 API
 */

/* ============================================================
 * 展開序號區間
 * GET /serials/expand?start=&end=
 * ============================================================ */
function apiExpandSerialRange(start, end) {
  if (!start || !end) {
    throw new Error("apiExpandSerialRange: start & end are required");
  }

  return api("/serials/expand", {
    params: { start, end },
  });
}

/* ============================================================
 * 正規化序號清單
 * POST /serials/normalize
 * ============================================================ */
function apiNormalizeSerials(serials) {
  if (!Array.isArray(serials)) {
    throw new Error("apiNormalizeSerials: serials must be an array");
  }

  return api("/serials/normalize", {
    method: "POST",
    body: { serials },
  });
}

/* ============================================================
 * 驗證序號格式
 * POST /serials/validate
 * ============================================================ */
function apiValidateSerials(serials) {
  if (!Array.isArray(serials)) {
    throw new Error("apiValidateSerials: serials must be an array");
  }

  return api("/serials/validate", {
    method: "POST",
    body: { serials },
  });
}

/* ============================================================
 * 偵測序號前綴
 * POST /serials/detect-prefix
 * ============================================================ */
function apiDetectSerialPrefix(serials) {
  if (!Array.isArray(serials)) {
    throw new Error("apiDetectSerialPrefix: serials must be an array");
  }

  return api("/serials/detect-prefix", {
    method: "POST",
    body: { serials },
  });
}

/* ============================================================
 * 計算序號區間數量
 * POST /serials/range
 * ============================================================ */
function apiCalculateSerialRange(start, end) {
  if (!start || !end) {
    throw new Error("apiCalculateSerialRange: start & end are required");
  }

  return api("/serials/range", {
    method: "POST",
    body: { start, end },
  });
}

/* ============================================================
 * Export to window
 * ============================================================ */
window.apiExpandSerialRange = apiExpandSerialRange;
window.apiNormalizeSerials = apiNormalizeSerials;
window.apiValidateSerials = apiValidateSerials;
window.apiDetectSerialPrefix = apiDetectSerialPrefix;
window.apiCalculateSerialRange = apiCalculateSerialRange;
