/**
 * API 配置與基礎請求函數
 * api-config.js
 */

// API 基礎 URL
window.API_BASE = window.API_BASE || '';
const API_PREFIX = '/api/v2';

function getToken() {
  return localStorage.getItem('jwt_token');
}


/**
 * 生成完整的 API URL
 * @param {string} path - API 路徑
 * @returns {string} 完整的 URL
 */
function apiURL(path) {
  return String(window.API_BASE || '') + API_PREFIX + path;
}

/**
 * 基礎 API 請求函數
 * @param {string} path - API 路徑
 * @param {object} opts - fetch 選項
 * @returns {Promise} API 回應
 */
async function api(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };

  const res = await fetch(apiURL(path), {
    ...opts,
    headers
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${txt}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}


/**
 * JSON API 請求（自動附帶 JWT Token）
 * @param {string} path - API 路徑
 * @param {object} opts - fetch 選項
 * @returns {Promise} API 回應
 */
async function apiJson(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  };

  const res = await fetch(apiURL(path), {
    ...opts,
    headers
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`API ${path} failed: ${res.status} ${txt}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : res.text();
}


// 匯出函數
window.apiURL = apiURL;
window.api = api;
window.apiJson = apiJson;
