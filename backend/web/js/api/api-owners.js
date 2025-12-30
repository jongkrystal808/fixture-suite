/**
 * 負責人 Owners API (v3.1 - FIXED)
 * api-owners.js
 *
 * ✔ 對齊 owners 資料表
 * ✔ 不使用 DELETE（改用 is_active）
 * ✔ 支援搜尋 / 分頁
 * ✔ customer_id 由後端依 current customer 處理
 */

/* ============================================================
 * 查詢負責人清單（搜尋 / 分頁）
 * ============================================================ */
/**
 * params:
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

  // ⚠️ customer_id 規則：
  // - 後端會自動套用：
  //   customer_id = current_customer
  //   OR customer_id IS NULL
  return api(`/owners?${query.toString()}`);
}

/* ============================================================
 * 取得單筆 Owner
 * ============================================================ */
async function apiGetOwner(ownerId) {
  return api(`/owners/${encodeURIComponent(ownerId)}`);
}

/* ============================================================
 * 新增 Owner
 * ============================================================ */
/**
 * payload:
 * {
 *   customer_id: string | null,
 *   primary_owner: string,
 *   secondary_owner?: string,
 *   email?: string,
 *   note?: string,
 *   is_active: boolean
 * }
 */
async function apiCreateOwner(payload) {
  return apiJson("/owners", payload, "POST");
}

/* ============================================================
 * 更新 Owner
 * ============================================================ */
async function apiUpdateOwner(ownerId, payload) {
  return apiJson(`/owners/${encodeURIComponent(ownerId)}`, payload, "PUT");
}

/* ============================================================
 * 停用 Owner（取代 DELETE）
 * ============================================================ */
async function apiDisableOwner(ownerId) {
  return apiJson(`/owners/${encodeURIComponent(ownerId)}`, {
    is_active: false
  }, "PUT");
}

/* ============================================================
 * 簡易清單（下拉選單用）
 * ============================================================ */
/**
 * 回傳：
 * - is_active = 1
 * - customer_id = current OR NULL
 */
async function apiListOwnersSimple() {
  return api("/owners/simple");
}

/* ============================================================
 * 全域導出
 * ============================================================ */
window.apiListOwners = apiListOwners;
window.apiGetOwner = apiGetOwner;
window.apiCreateOwner = apiCreateOwner;
window.apiUpdateOwner = apiUpdateOwner;
window.apiDisableOwner = apiDisableOwner;
window.apiListOwnersSimple = apiListOwnersSimple;
