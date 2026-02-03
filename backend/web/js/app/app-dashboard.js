/**
 * Dashboard 前端控制
 * 對應 /stats/dashboard
 */

onUserReady(() => {
  if (window.currentCustomerId) {
    loadDashboard();
  }
});

async function loadDashboard() {

  try {
    const data = await api("/stats/dashboard");

    // ===============================
    // 1️⃣ 今日收料
    // ===============================
    const todayIn = data?.today_in;
    const todayInTotal =
      typeof todayIn === "object" && !Array.isArray(todayIn)
        ? todayIn.total || 0
        : 0;

    document.getElementById("todayIn").textContent = todayInTotal;

    const todayInList = document.getElementById("todayInList");
    todayInList.innerHTML = "";

    (todayIn?.items || []).forEach(row => {
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
        : 0;

    document.getElementById("todayOut").textContent = todayOutTotal;

    const todayOutList = document.getElementById("todayOutList");
    todayOutList.innerHTML = "";

    (todayOut?.items || []).forEach(row => {
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
    // 4️⃣ 庫存概覽（State-based）
    // ===============================
    loadDashboardInventory();

  } catch (err) {
    console.error("[dashboard] load failed", err);
    toast("Dashboard 載入失敗", "error");
  }
}


function renderDashboardTable(rows) {
  const tbody = document.getElementById("dashTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 pr-4">${r.fixture_id}</td>
      <td class="py-1 pr-4">${r.fixture_name}</td>
      <td class="py-1 pr-4">${r.model_id || "-"}</td>
      <td class="py-1 pr-4">${r.storage_location || "-"}</td>
      <td class="py-1 pr-4">${r.lifespan_status}</td>
      <td class="py-1 pr-4">
        ${r.total_uses || 0}/${r.replacement_cycle || "-"}
      </td>
      <td class="py-1 pr-4">${r.primary_owner_name || "-"}</td>
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

async function loadDashboardInventory() {
  try {
    const data = await apiGetFixtureLifespan({ limit: 200 });

    // ⭐ 關鍵修正：相容新舊回傳格式
    const rows = data?.items || data || [];

    renderDashboardTable(rows);
  } catch (err) {
    console.error("[dashboard] inventory load failed", err);
  }
}
