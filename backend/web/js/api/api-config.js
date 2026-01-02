/**
 * API 配置與基礎請求函數 (v4.1 FINAL)
 * - 自動 Token 注入
 * - customer_id：GET 用 query，寫入類用 Header
 * - 自動處理 params / body
 * - 統一錯誤結構
 */

window.API_BASE = window.API_BASE || "";
const API_PREFIX = "/api/v2";

/* ============================================================
 * 工具：組出基礎 URL
 * ============================================================ */
function apiURL(path) {
  return String(window.API_BASE || "") + API_PREFIX + path;
}

function getToken() {
  return localStorage.getItem("auth_token");
}

function getCustomerId() {
  const raw =
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id");

  if (!raw) {
    console.warn("⚠ current_customer_id 尚未設定");
    return null;
  }

  // 防止 moxa:1 這種污染值
  if (typeof raw === "string" && raw.includes(":")) {
    return raw.split(":")[0];
  }

  return raw;
}

/* ============================================================
 * API 主函式
 * ============================================================ */
function api(path, options = {}) {
  const token = getToken();
  const customerId = getCustomerId();

  // ----------------------------------------
  // 1️⃣ URL + Query Params
  // ----------------------------------------
  const fullUrl = apiURL(path);
  const url = new URL(fullUrl, window.location.origin);

  const params = options.params || options.query;
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // ----------------------------------------
  // 2️⃣ 決定是否跳過 customer_id
  // ----------------------------------------
  const ignoreCidAlways = [
    "/auth/",
    "/customers",
  ];

  const shouldSkipCid =
    options.skipCustomerId ||
    ignoreCidAlways.some(prefix => path.startsWith(prefix));

  // ----------------------------------------
  // 3️⃣ 決定 HTTP method
  // ----------------------------------------
  const hasBody =
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData);

  const method = options.method || (hasBody ? "POST" : "GET");

  // ----------------------------------------
  // 4️⃣ GET 才在 query 帶 customer_id
  // ----------------------------------------
  if (
    method === "GET" &&
    !shouldSkipCid &&
    customerId &&
    !url.searchParams.has("customer_id")
  ) {
    url.searchParams.set("customer_id", customerId);
  }

  // ----------------------------------------
  // 5️⃣ Headers
  // ----------------------------------------
  const headers = {
    ...(options.headers || {}),
  };

  // Content-Type
  if (!(options.body instanceof FormData) && !options.rawBody) {
    headers["Content-Type"] = "application/json";
  }

  // Authorization
  if (!options.skipAuth && token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ⭐ 寫入類 API：customer_id 只走 Header
  if (!shouldSkipCid && customerId && !headers["X-Customer-Id"]) {
    headers["X-Customer-Id"] = customerId;
  }

  // ----------------------------------------
  // 6️⃣ Body 處理
  // ----------------------------------------
  let body = options.body;
  if (
    body &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !options.rawBody
  ) {
    body = JSON.stringify(body);
  }

  const fetchOptions = {
    ...options,
    method,
    headers,
    body,
  };

  // ----------------------------------------
  // 7️⃣ 發送請求
  // ----------------------------------------
  return fetch(url.toString(), fetchOptions).then(async res => {
    const text = await res.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      console.error(`❌ API ERROR: ${path}`, res.status, data);
      console.error("❌ API ERROR DATA:", JSON.stringify(data, null, 2));

      const err = new Error(
        `API ${path} failed: ${res.status} ${data?.detail || res.statusText || ""}`
      );
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  });
}

/* ============================================================
 * JSON 便利函式
 * ============================================================ */
function apiJson(path, data = {}, method = "POST", extra = {}) {
  return api(path, {
    ...extra,
    method,
    body: data,
  });
}

/* ============================================================
 * 導出
 * ============================================================ */
window.api = api;
window.apiJson = apiJson;
window.apiURL = apiURL;
