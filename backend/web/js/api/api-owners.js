/**
 * 負責人 Owners API (v4.0 FINAL)
 * api-owners.js
 *
 * ✔ 完全正規化（只用 *_owner_id）
 * ✔ 不使用 DELETE（改用 is_active）
 * ✔ 支援搜尋 / 分頁
 * ✔ customer_id 由後端依 current customer 決定
 */

/* ============================================================
 * 查詢負責人清單（搜尋 / 分頁）
 * ============================================================ */
/**
 * params:
 * {
 *   page?: number,
 *   pageSize?: number,
 *   search?: string,
 *   is_active?: 0 | 1 | ""
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
  if (is_active !== "") query.set("is_active", String(is_active));

  return api(`/owners?${query.toString()}`);
}

/* ============================================================
 * 取得單筆 Owner
 * ============================================================ */
async function apiGetOwner(ownerId) {
  if (!ownerId) throw new Error("ownerId is required");
  return api(`/owners/${encodeURIComponent(ownerId)}`);
}

/* ============================================================
 * 新增 Owner（正規化版）
 * ============================================================ */
/**
 * payload:
 * {
 *   primary_owner_id: number,        // 必填
 *   secondary_owner_id?: number|null,
 *   email: string,                   // 必填
 *   note?: string|null
 * }
 */
async function apiCreateOwner(payload) {
  if (!payload?.primary_owner_id) {
    throw new Error("primary_owner_id is required");
  }
  if (!payload?.email) {
    throw new Error("email is required");
  }

  return apiJson("/owners", payload, "POST");
}

/* ============================================================
 * 更新 Owner
 * ============================================================ */
/**
 * payload:
 * {
 *   primary_owner_id?: number,
 *   secondary_owner_id?: number|null,
 *   email?: string,
 *   note?: string|null,
 *   is_active?: 0 | 1
 * }
 */
async function apiUpdateOwner(ownerId, payload) {
  if (!ownerId) throw new Error("ownerId is required");
  return apiJson(`/owners/${encodeURIComponent(ownerId)}`, payload, "PUT");
}

/* ============================================================
 * 停用 Owner（取代 DELETE）
 * ============================================================ */
async function apiDisableOwner(ownerId) {
  if (!ownerId) throw new Error("ownerId is required");

  return apiJson(
    `/owners/${encodeURIComponent(ownerId)}`,
    { is_active: 0 },
    "PUT"
  );
}


/* ============================================================
 * Users Simple API（給下拉選單用）
 * ============================================================ */
async function apiListUsersSimple() {
  return api("/users/simple");
}

window.apiListUsersSimple = apiListUsersSimple;

/* ============================================================
 * 全域導出
 * ============================================================ */
window.apiListOwners = apiListOwners;
window.apiGetOwner = apiGetOwner;
window.apiCreateOwner = apiCreateOwner;
window.apiUpdateOwner = apiUpdateOwner;
window.apiDisableOwner = apiDisableOwner;
