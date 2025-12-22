/**
 * app-dashboard.js (v3.7)
 *
 * 連接儀表板界面與後端 API
 * 對應 HTML section#tab-dashboard
 *
 * 主要功能：
 * 1. 今日收料/退料統計（即時更新）
 * 2. 即將更換治具列表
 * 3. 庫存概覽表格
 */

/* ============================================================
 * 取得 customer_id（統一版本）
 * ============================================================ */
function getCurrentCustomerId() {
  return (
    window.currentCustomerId ||
    localStorage.getItem("current_customer_id")
  );
}

/* ============================================================
 * 初始化：載入儀表板所有數據
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();

  // 每30秒自動刷新一次（即時數據）
  setInterval(() => {
    loadDashboard();
  }, 30000);
});

/* ============================================================
 * 主載入函數：載入所有儀表板數據
 * ============================================================ */
async function loadDashboard() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("Dashboard: 尚未選擇客戶");
    return;
  }

  try {
    // 並行載入所有數據以提升效能
    await Promise.all([
      loadTodayTransactions(),
      loadUpcomingReplacements(),
      loadInventoryOverview()
    ]);
  } catch (err) {
    console.error("載入儀表板失敗:", err);
    toast("載入儀表板數據失敗", "error");
  }
}

/* ============================================================
 * 1. 今日收料/退料統計
 * ============================================================ */
async function loadTodayTransactions() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    // 使用 /stats/summary API 獲取統計數據
    const data = await apiGetStatsSummary();

    // 今日收料
    const todayReceipts = data.recent_receipts || [];
    const totalIn = todayReceipts.reduce((sum, item) => sum + (item.count || 0), 0);

    const elTodayIn = document.getElementById("todayIn");
    const elTodayInList = document.getElementById("todayInList");

    if (elTodayIn) elTodayIn.innerText = totalIn;
    if (elTodayInList) {
      renderTransactionList(elTodayInList, todayReceipts, "收料");
    }

    // 今日退料
    const todayReturns = data.recent_returns || [];
    const totalOut = todayReturns.reduce((sum, item) => sum + (item.count || 0), 0);

    const elTodayOut = document.getElementById("todayOut");
    const elTodayOutList = document.getElementById("todayOutList");

    if (elTodayOut) elTodayOut.innerText = totalOut;
    if (elTodayOutList) {
      renderTransactionList(elTodayOutList, todayReturns, "退料");
    }
  } catch (err) {
    console.error("載入今日交易數據失敗:", err);
  }
}

/**
 * 渲染交易列表（收料或退料）
 */
function renderTransactionList(container, items, type) {
  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="text-sm text-gray-400">
        今日暫無${type}記錄
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "flex justify-between text-sm";
    div.innerHTML = `
      <span class="text-gray-600">${item.fixture_id || "-"}</span>
      <span class="font-semibold">${item.count || 0}</span>
    `;
    container.appendChild(div);
  });
}

/* ============================================================
 * 2. 即將更換治具列表
 * ============================================================ */
async function loadUpcomingReplacements() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    // 使用 fixture status view 獲取需要更換的治具
    const rows = await apiGetFixtureStatus();

    // 篩選出即將更換的治具（使用率 > 80%）
    const upcoming = (rows || []).filter((r) => {
      if (!r.replacement_cycle || r.replacement_cycle === 0) return false;
      const totalUses = r.total_uses ?? r.used_count ?? 0;
      const rate = (totalUses / r.replacement_cycle) * 100;
      return rate >= 80 && rate < 100;
    });

    // 按使用率排序（高到低）
    upcoming.sort((a, b) => {
      const rateA = ((a.total_uses ?? 0) / (a.replacement_cycle || 1)) * 100;
      const rateB = ((b.total_uses ?? 0) / (b.replacement_cycle || 1)) * 100;
      return rateB - rateA;
    });

    renderUpcomingList(upcoming);
  } catch (err) {
    console.error("載入即將更換治具失敗:", err);
    renderUpcomingList([]);
  }
}

function renderUpcomingList(items) {
  const container = document.getElementById("upcomingList");
  if (!container) return;

  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="text-sm text-gray-400">
        目前沒有需要更換的治具
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const totalUses = item.total_uses ?? item.used_count ?? 0;
    const rate = item.replacement_cycle > 0
      ? Math.round((totalUses / item.replacement_cycle) * 100)
      : 0;

    const div = document.createElement("div");
    div.className = "flex justify-between items-center text-sm";
    div.innerHTML = `
      <div>
        <div class="font-medium">${item.fixture_id}</div>
        <div class="text-xs text-gray-500">${item.fixture_name || "-"}</div>
      </div>
      <div class="text-right">
        <div class="font-semibold text-orange-600">${rate}%</div>
        <div class="text-xs text-gray-500">${totalUses}/${item.replacement_cycle}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

/* ============================================================
 * 3. 庫存概覽表格
 * ============================================================ */
async function loadInventoryOverview() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    // 使用 fixture status view 獲取完整庫存數據
    const rows = await apiGetFixtureStatus();

    // 保存原始數據供篩選使用
    window._inventoryData = rows || [];

    renderDashboardTable(window._inventoryData);
  } catch (err) {
    console.error("載入庫存概覽失敗:", err);
    renderDashboardTable([]);
  }
}

function renderDashboardTable(rows) {
  const tbody = document.getElementById("dashTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-gray-400">
          暫無庫存數據
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const totalUses = r.total_uses ?? r.used_count ?? 0;
    const cycle = r.replacement_cycle || "-";
    const usageDisplay = cycle !== "-" ? `${totalUses}/${cycle}` : totalUses;

    // 狀態顯示
    let statusBadge = "";
    if (r.status === "active") {
      statusBadge = '<span class="pill border-green-300 text-green-700 bg-green-50">使用中</span>';
    } else if (r.status === "maintenance") {
      statusBadge = '<span class="pill border-yellow-300 text-yellow-700 bg-yellow-50">維護中</span>';
    } else if (r.status === "scrapped") {
      statusBadge = '<span class="pill border-red-300 text-red-700 bg-red-50">已報廢</span>';
    } else if (r.status === "available") {
      statusBadge = '<span class="pill border-blue-300 text-blue-700 bg-blue-50">可用</span>';
    } else {
      statusBadge = '<span class="pill border-gray-300 text-gray-700 bg-gray-50">未知</span>';
    }

    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50";
    tr.innerHTML = `
      <td class="py-2 pr-4">
        <button class="text-blue-600 hover:underline" onclick="openFixtureDetail('${r.fixture_id}')">
          ${r.fixture_id}
        </button>
      </td>
      <td class="py-2 pr-4">${r.fixture_name || "-"}</td>
      <td class="py-2 pr-4">${r.model_id || r.model_name || "-"}</td>
      <td class="py-2 pr-4">${r.location || r.storage_location || "-"}</td>
      <td class="py-2 pr-4">${statusBadge}</td>
      <td class="py-2 pr-4">${usageDisplay}</td>
      <td class="py-2 pr-4">${r.primary_owner || r.owner_name || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 篩選功能
 * ============================================================ */
function filterDashboard() {
  const searchInput = document.getElementById("searchDash");
  if (!searchInput) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!window._inventoryData) {
    console.warn("沒有可篩選的數據");
    return;
  }

  if (!searchTerm) {
    // 如果搜尋框為空，顯示全部數據
    renderDashboardTable(window._inventoryData);
    return;
  }

  // 篩選數據
  const filtered = window._inventoryData.filter((item) => {
    const fixtureId = (item.fixture_id || "").toLowerCase();
    const fixtureName = (item.fixture_name || "").toLowerCase();
    const modelId = (item.model_id || "").toLowerCase();
    const modelName = (item.model_name || "").toLowerCase();

    return (
      fixtureId.includes(searchTerm) ||
      fixtureName.includes(searchTerm) ||
      modelId.includes(searchTerm) ||
      modelName.includes(searchTerm)
    );
  });

  renderDashboardTable(filtered);
}

/* ============================================================
 * 匯出功能：即將更換治具 CSV
 * ============================================================ */
function mockUpcomingCSV() {
  // 從當前的即將更換列表生成 CSV
  const container = document.getElementById("upcomingList");
  if (!container) return "治具編號,治具名稱,使用率,使用次數,更換週期\n";

  const rows = [];
  rows.push("治具編號,治具名稱,使用率,使用次數,更換週期");

  // 這裡應該從實際數據源生成，暫時返回表頭
  // 實際應用中，可以保存 upcoming 數據到全局變量
  if (window._upcomingReplacements && window._upcomingReplacements.length > 0) {
    window._upcomingReplacements.forEach((item) => {
      const totalUses = item.total_uses ?? item.used_count ?? 0;
      const rate = item.replacement_cycle > 0
        ? Math.round((totalUses / item.replacement_cycle) * 100)
        : 0;

      rows.push(
        `${item.fixture_id},${item.fixture_name || "-"},${rate}%,${totalUses},${item.replacement_cycle || "-"}`
      );
    });
  }

  return rows.join("\n");
}

// 改進：在 loadUpcomingReplacements 中保存數據
async function loadUpcomingReplacementsEnhanced() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    const rows = await apiGetFixtureStatus();

    const upcoming = (rows || []).filter((r) => {
      if (!r.replacement_cycle || r.replacement_cycle === 0) return false;
      const totalUses = r.total_uses ?? r.used_count ?? 0;
      const rate = (totalUses / r.replacement_cycle) * 100;
      return rate >= 80 && rate < 100;
    });

    upcoming.sort((a, b) => {
      const rateA = ((a.total_uses ?? 0) / (a.replacement_cycle || 1)) * 100;
      const rateB = ((b.total_uses ?? 0) / (b.replacement_cycle || 1)) * 100;
      return rateB - rateA;
    });

    // 保存到全局變量供匯出使用
    window._upcomingReplacements = upcoming;

    renderUpcomingList(upcoming);
  } catch (err) {
    console.error("載入即將更換治具失敗:", err);
    renderUpcomingList([]);
  }
}

/* ============================================================
 * 導出到全域
 * ============================================================ */
window.loadDashboard = loadDashboard;
window.loadTodayTransactions = loadTodayTransactions;
window.loadUpcomingReplacements = loadUpcomingReplacements;
window.loadInventoryOverview = loadInventoryOverview;
window.filterDashboard = filterDashboard;
window.mockUpcomingCSV = mockUpcomingCSV;

// 新增：開啟治具詳情（如果還沒定義的話）
if (typeof window.openFixtureDetail === "undefined") {
  window.openFixtureDetail = function(fixtureId) {
    console.log("開啟治具詳情:", fixtureId);
    // 這裡應該切換到治具詳情頁面或開啟模態框
    // 範例：切換到治具管理頁籤並顯示該治具
    toast(`查看治具詳情: ${fixtureId}`, "info");
  };
}