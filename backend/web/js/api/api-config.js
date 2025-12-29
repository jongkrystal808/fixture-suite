/**
 * API 配置與基礎請求函數 (v4.0)
 * - 自動 Token / customer_id 注入
 * - 自動處理 params / body
 * - 錯誤結構統一
 * - 支援 model-detail v4.0
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
  const cid =
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id");

  if (!cid) {
    console.warn("⚠ current_customer_id 尚未設定，將無法呼叫需客戶資料的 API");
  }
  return cid;
}

/* ============================================================
 * API 主函式
 * ============================================================ */

function api(path, options = {}) {
  const token = getToken();
  const customerId = getCustomerId();

  // ----------------------------------------
  // 1️⃣ URL + Query Params 構建
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
  // 2️⃣ 決定哪些 API 不帶 customer_id
  // ----------------------------------------
  const ignoreCidAlways = [
    "/auth/",
    "/customers",
  ];

  const shouldSkipCid =
    options.skipCustomerId ||
    ignoreCidAlways.some((prefix) => path.startsWith(prefix));

  // ✅ JSON / Query API 仍維持原本行為
  if (!shouldSkipCid && customerId && !url.searchParams.has("customer_id")) {
    url.searchParams.set("customer_id", customerId);
  }

  // ----------------------------------------
  // 3️⃣ Headers 設定
  // ----------------------------------------
  const headers = {
    ...(options.headers || {}),
  };

  // 自動 Content-Type（FormData 不設定）
  if (!(options.body instanceof FormData) && !options.rawBody) {
    headers["Content-Type"] = "application/json";
  }

  // 自動加入 Token
  if (!options.skipAuth && token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ----------------------------------------
  // ⭐ FIX：FormData 自動補 customer_id（匯入專用）
  // ----------------------------------------
  if (
    options.body instanceof FormData &&
    !shouldSkipCid &&
    customerId &&
    !options.body.has("customer_id")
  ) {
    options.body.append("customer_id", customerId);
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

  const method = options.method || (body ? "POST" : "GET");

  const fetchOptions = {
    ...options,
    method,
    headers,
    body,
  };

  // ----------------------------------------
  // 5️⃣ 發送請求
  // ----------------------------------------
  return fetch(url.toString(), fetchOptions).then(async (res) => {
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
 * 導出到全域
 * ============================================================ */

window.api = api;
window.apiJson = apiJson;
window.apiURL = apiURL;
