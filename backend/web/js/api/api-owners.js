/**
 * 負責人 Owners API (v3.0)
 * api-owners.js
 *
 * 後端 routers/owner.py：
 *
 * GET    /owners
 * GET    /owners/{id}
 * POST   /owners
 * PUT    /owners/{id}
 * DELETE /owners/{id}
 * GET    /owners/simple
 */

/* ============================================================
 * 查詢負責人清單（支援搜尋 / 分頁）
 * ============================================================ */

/**
 * 查詢負責人列表
 * @param {object} params
 * {
 *   page,
 *   pageSize,
 *   search,
 *   is_active
 * }
 */
async function apiListOwners(params = {}) {
  const {
    page = 1,
    pageSize = 50,
    search = "",
    is_active = ""
  } = params;

  const query = new URLSearchParams();
  query.set("skip", String((page - 1) * pageSize));
  query.set("limit", String(pageSize));
  if (search) query.set("search", search);
  if (is_active !== "") query.set("is_active", is_active);

  return api(`/owners?${query.toString()}`);
}

/* ============================================================
 * 取得單筆 Owner
 * ============================================================ */

async function apiGetOwner(ownerId) {
  return api(`/owners/${encodeURIComponent(ownerId)}`);
}

/* ============================================================
 * 新增 owner
 * ============================================================ */

/**
 * payload:
 * {
 *   primary_owner: "",
 *   secondary_owner: "",
 *   email: "",
 *   note: "",
 *   is_active: true/false
 * }
 */
async function apiCreateOwner(payload) {
  return api("/owners", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 更新 owner
 * ============================================================ */

async function apiUpdateOwner(ownerId, payload) {
  return api(`/owners/${encodeURIComponent(ownerId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

/* ============================================================
 * 刪除 owner
 * ============================================================ */

async function apiDeleteOwner(ownerId) {
  return api(`/owners/${encodeURIComponent(ownerId)}`, {
    method: "DELETE"
  });
}

/* ============================================================
 * 取得簡易版本（下拉用）
 * ============================================================ */

async function apiListOwnersSimple() {
  return api(`/owners/simple`);
}

// api-owners.js

async function apiGetOwnersSimple() {
  return api("/owners/active");   // <-- 後端已經提供 GET /owners/active
}



/* ============================================================
 * 導出全域
 * ============================================================ */

window.apiListOwners = apiListOwners;
window.apiGetOwner = apiGetOwner;
window.apiCreateOwner = apiCreateOwner;
window.apiUpdateOwner = apiUpdateOwner;
window.apiDeleteOwner = apiDeleteOwner;
window.apiListOwnersSimple = apiListOwnersSimple;
window.apiGetOwnersSimple = apiGetOwnersSimple;