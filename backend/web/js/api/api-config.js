/**
 * API 配置與基礎請求函數 (v4.x FINAL)
 *
 * ✔ 自動注入 Authorization Token
 * ✔ 自動處理 query / body
 * ✔ 統一錯誤結構
 *
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
  return localStorage.getItem("access_token");
}

/* ============================================================
 * API 主函式
 * ============================================================ */
function api(path, options = {}) {
  const token = getToken();
    console.log('[api debug]', {
    path,
    token,
    skipAuth: options.skipAuth,
    willAttachAuth: !options.skipAuth && !!token
  });
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
  // 2️⃣ 決定 HTTP method
  // ----------------------------------------
  const hasBody =
    options.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData);

  const method = options.method || (hasBody ? "POST" : "GET");

    // ----------------------------------------
      // 3️⃣ Headers
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

      // ✅ v4.x：注入 Customer Context（Permission Header）
      if (!options.skipCustomer && window.currentCustomerId) {
        headers["X-Customer-Id"] = window.currentCustomerId;
      }


  // ----------------------------------------
  // 4️⃣ Body 處理
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
    body,
    headers,
  };

  // ----------------------------------------
  // 5️⃣ 發送請求
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
