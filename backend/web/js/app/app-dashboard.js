/**
 * Dashboard 前端控制
 * 對應 /stats/dashboard
 */

console.log("[dashboard] app-dashboard.js loaded");

async function loadDashboard() {
    console.log("[dashboard] loadDashboard called");
  const customerId = localStorage.getItem("current_customer_id");
  if (!customerId) {
    console.warn("[dashboard] no customer_id");
    return;
  }

  let data;
  try {
    data = await api("/stats/dashboard", {
      method: "GET",
      query: { customer_id: customerId }
    });

  } catch (err) {
    console.error("[dashboard] load failed", err);
    return;
  }

  // ===============================
  // 1️⃣ 今日收料
  // ===============================
  document.getElementById("todayIn").textContent = data.today_in.total || 0;

  const todayInList = document.getElementById("todayInList");
  todayInList.innerHTML = "";

  (data.today_in.items || []).forEach(row => {
    const div = document.createElement("div");
    div.className = "text-sm text-gray-700";
    div.textContent = `${row.fixture_id} +${row.qty}`;
    todayInList.appendChild(div);
  });

  // ===============================
  // 2️⃣ 今日退料
  // ===============================
  document.getElementById("todayOut").textContent = data.today_out.total || 0;

  const todayOutList = document.getElementById("todayOutList");
  todayOutList.innerHTML = "";

  (data.today_out.items || []).forEach(row => {
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

  (data.upcoming_replacements || []).forEach(row => {
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
  renderDashboardTable(data.inventory || []);
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
  const keyword = document.getElementById("searchDash").value.trim().toLowerCase();

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
// 初始化：切到儀表板時載入
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadDashboard();
});
