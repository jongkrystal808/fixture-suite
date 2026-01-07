/**
 * Dashboard 前端控制
 * 對應 /stats/dashboard
 */

console.log("[dashboard] app-dashboard.js loaded");

async function loadDashboard() {
  console.log("[dashboard] loadDashboard called");

  try {
    const data = await api("/stats/dashboard");
    console.log("[dashboard] raw response:", data);

    // ===============================
    // 1️⃣ 今日收料
    // ===============================
    const todayIn = data?.today_in;

    const todayInTotal =
      typeof todayIn === "object" && !Array.isArray(todayIn)
        ? todayIn.total || 0
        : Array.isArray(todayIn)
          ? todayIn.length
          : 0;

    document.getElementById("todayIn").textContent = todayInTotal;

    const todayInList = document.getElementById("todayInList");
    todayInList.innerHTML = "";

    const todayInItems =
      todayIn?.items ??
      (Array.isArray(todayIn) ? todayIn : []);

    todayInItems.forEach(row => {
      const div = document.createElement("div");
      div.className = "text-sm text-gray-700";
      div.textContent = `${row.fixture_id} +${row.qty}`;
      todayInList.appendChild(div);
    });

    // ===============================
    // 2️⃣ 今日退料
    // ===============================
    const todayOut = data?.today_out;

    const todayOutTotal =
      typeof todayOut === "object" && !Array.isArray(todayOut)
        ? todayOut.total || 0
        : Array.isArray(todayOut)
          ? todayOut.length
          : 0;

    document.getElementById("todayOut").textContent = todayOutTotal;

    const todayOutList = document.getElementById("todayOutList");
    todayOutList.innerHTML = "";

    const todayOutItems =
      todayOut?.items ??
      (Array.isArray(todayOut) ? todayOut : []);

    todayOutItems.forEach(row => {
      const div = document.createElement("div");
      div.className = "text-sm text-gray-700";
      div.textContent = `${row.fixture_id} -${row.qty}`;
      todayOutList.appendChild(div);
    });

    // ===============================
    // 3️⃣ 即將更換治具
    // ===============================
    const upcomingList = document.getElementById("upcomingList");
    upcomingList.innerHTML = "";

    (data?.upcoming_replacements || []).forEach(row => {
      const percent = Math.round((row.usage_ratio || 0) * 100);

      const color =
        percent >= 100 ? "text-red-600" :
        percent >= 90  ? "text-orange-600" :
                         "text-yellow-600";

      const div = document.createElement("div");
      div.className = `text-sm flex justify-between ${color}`;
      div.innerHTML = `
        <span>${row.fixture_id} ${row.fixture_name}</span>
        <span>${percent}%</span>
      `;
      upcomingList.appendChild(div);
    });

    // ===============================
    // 4️⃣ 庫存概覽
    // ===============================
    renderDashboardTable(data?.inventory || []);

  } catch (err) {
    console.error("[dashboard] load failed", err);
    toast("Dashboard 載入失敗", "error");
  }
}

/**
 * 渲染庫存表
 */
let _dashboardInventoryCache = [];

function renderDashboardTable(rows) {
  _dashboardInventoryCache = rows;

  const tbody = document.getElementById("dashTable");
  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 pr-4">${row.fixture_id}</td>
      <td class="py-1 pr-4">${row.fixture_name}</td>
      <td class="py-1 pr-4">${row.model || "-"}</td>
      <td class="py-1 pr-4">${row.storage_location || "-"}</td>
      <td class="py-1 pr-4">${row.status}</td>
      <td class="py-1 pr-4">
        ${row.total_uses || 0}/${row.replacement_cycle || "-"}
      </td>
      <td class="py-1 pr-4">${row.primary_owner || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Dashboard 搜尋（治具 / 機種）
 */
function filterDashboard() {
  const keyword = document
    .getElementById("searchDash")
    .value
    .trim()
    .toLowerCase();

  if (!keyword) {
    renderDashboardTable(_dashboardInventoryCache);
    return;
  }

  const filtered = _dashboardInventoryCache.filter(row =>
    (row.fixture_id || "").toLowerCase().includes(keyword) ||
    (row.fixture_name || "").toLowerCase().includes(keyword) ||
    (row.model || "").toLowerCase().includes(keyword)
  );

  renderDashboardTable(filtered);
}

// ===============================
// 初始化（v4.x 正確時序）
// user ready → customer ready → load dashboard
// ===============================
onUserReady(() => {
  onCustomerReady(() => {
    console.log("[dashboard] user + customer ready, loading dashboard");
    loadDashboard();
  });
});
