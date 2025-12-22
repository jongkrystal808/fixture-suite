/**
 * api-dashboard-integration.js (v3.7)
 *
 * 確保儀表板所需的所有 API 函數都可用
 * 這個檔案應該在 api-stats.js 和 api-fixtures.js 之後載入
 */

/* ============================================================
 * 檢查並提供必要的 API 包裝函數
 * ============================================================ */

// 如果 apiGetStatsSummary 不存在，創建它
if (typeof window.apiGetStatsSummary === "undefined") {
  window.apiGetStatsSummary = async function() {
    const customer_id = window.currentCustomerId || localStorage.getItem("current_customer_id");
    const q = new URLSearchParams();
    q.set("customer_id", customer_id);
    return api(`/stats/summary?${q.toString()}`);
  };
}

// 如果 apiGetFixtureStatus 不存在，創建它
if (typeof window.apiGetFixtureStatus === "undefined") {
  window.apiGetFixtureStatus = async function(customerId) {
    const customer_id = customerId || window.currentCustomerId || localStorage.getItem("current_customer_id");
    const q = new URLSearchParams();
    q.set("customer_id", customer_id);
    return api(`/stats/fixture-status?${q.toString()}`);
  };
}

// 如果 apiGetFixtureStatistics 不存在，創建它
if (typeof window.apiGetFixtureStatistics === "undefined") {
  window.apiGetFixtureStatistics = async function(customerId) {
    const customer_id = customerId || window.currentCustomerId || localStorage.getItem("current_customer_id");
    const q = new URLSearchParams();
    q.set("customer_id", customer_id);
    return api(`/fixtures/statistics/summary?${q.toString()}`);
  };
}

// 如果 apiGetFixtureUsageStats 不存在，使用現有的
if (typeof window.apiGetFixtureUsageStats === "undefined") {
  window.apiGetFixtureUsageStats = async function(fixtureId) {
    const customer_id = window.currentCustomerId || localStorage.getItem("current_customer_id");
    const q = new URLSearchParams();
    q.set("fixture_id", fixtureId);
    q.set("customer_id", customer_id);
    return api(`/stats/fixture-usage?${q.toString()}`);
  };
}

/* ============================================================
 * 工具函數
 * ============================================================ */

/**
 * CSV 下載功能
 */
if (typeof window.downloadCSV === "undefined") {
  window.downloadCSV = function(filename, csvContent) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast(`已下載 ${filename}`, "success");
    } else {
      toast("您的瀏覽器不支援下載功能", "error");
    }
  };
}

/**
 * Toast 通知功能（如果不存在）
 */
if (typeof window.toast === "undefined") {
  window.toast = function(message, type = "info") {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // 如果有第三方 toast 庫（如 toastr），使用它
    if (typeof toastr !== "undefined") {
      toastr[type](message);
      return;
    }

    // 否則使用簡單的 alert（生產環境應該換成更好的 UI）
    if (type === "error") {
      alert(`❌ ${message}`);
    } else if (type === "success") {
      alert(`✅ ${message}`);
    } else {
      console.info(message);
    }
  };
}

/**
 * API 基礎函數（如果不存在）
 */
if (typeof window.api === "undefined") {
  window.api = async function(endpoint, options = {}) {
    const baseUrl = window.API_BASE_URL || "http://localhost:8000";
    const url = baseUrl + endpoint;

    const defaultOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // 包含 cookies
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // 如果有 token，加入 Authorization header
    const token = localStorage.getItem("auth_token");
    if (token) {
      mergedOptions.headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, mergedOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 請求失敗 (${endpoint}):`, error);
      throw error;
    }
  };
}

/* ============================================================
 * 今日交易數據計算輔助函數
 * ============================================================ */

/**
 * 從 material_transactions 中篩選今日數據
 * 這個函數可以在前端進一步處理 API 返回的數據
 */
window.filterTodayTransactions = function(transactions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (transactions || []).filter((t) => {
    if (!t.transaction_date && !t.created_at) return false;
    const date = new Date(t.transaction_date || t.created_at);
    return date >= today;
  });
};

/**
 * 計算交易統計
 */
window.calculateTransactionStats = function(transactions, type) {
  const filtered = transactions.filter((t) => t.transaction_type === type);
  const grouped = {};

  filtered.forEach((t) => {
    const fixtureId = t.fixture_id;
    if (!grouped[fixtureId]) {
      grouped[fixtureId] = {
        fixture_id: fixtureId,
        count: 0,
        fixture_name: t.fixture_name || fixtureId,
      };
    }
    grouped[fixtureId].count += t.quantity || 0;
  });

  return Object.values(grouped).sort((a, b) => b.count - a.count);
};

/* ============================================================
 * 日期格式化工具
 * ============================================================ */

window.formatDate = function(dateString, format = "YYYY-MM-DD") {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  switch (format) {
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "YYYY-MM-DD HH:mm":
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    case "YYYY-MM-DD HH:mm:ss":
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case "MM/DD":
      return `${month}/${day}`;
    default:
      return `${year}-${month}-${day}`;
  }
};

/* ============================================================
 * 數據轉換工具
 * ============================================================ */

/**
 * 將表格數據轉換為 CSV
 */
window.toCSV = function(data, headers) {
  if (!data || data.length === 0) {
    return headers ? headers.join(",") + "\n" : "";
  }

  const keys = headers || Object.keys(data[0]);
  const csv = [keys.join(",")];

  data.forEach((row) => {
    const values = keys.map((key) => {
      const value = row[key];
      if (value === null || value === undefined) return "";
      // 如果值包含逗號或引號，用引號包裹
      const stringValue = String(value);
      if (stringValue.includes(",") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csv.push(values.join(","));
  });

  return csv.join("\n");
};

console.log("✅ Dashboard API Integration Loaded");