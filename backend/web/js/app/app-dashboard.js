/**
 * app-dashboard.js (v4.x FINAL)
 *
 * Dashboard 唯一入口：
 * - Event-based（今日收 / 退）
 * - State-based（治具總覽）
 * - 壽命分析（expired / warning）
 */

/* ============================================================
 * Entry
 * ============================================================ */
onUserReady(() => {
  if (window.currentCustomerId) {
    loadDashboard();
  }
});

/* ============================================================
 * Dashboard 主流程
 * ============================================================ */
async function loadDashboard() {
  try {
    const data = await apiGetDashboardStats();
     console.log("DASHBOARD DATA:", data);

    /* ===============================
     * 1️⃣ 今日收料
     * =============================== */
    const todayIn = data?.today_in || {};
    const todayInEl = document.getElementById("todayIn");
    if (todayInEl) todayInEl.textContent = todayIn.total || 0;

    const todayInList = document.getElementById("todayInList");
    if (todayInList) {
      todayInList.innerHTML = "";
      (todayIn.items || []).forEach(r => {
        const div = document.createElement("div");
        div.className = "text-sm text-gray-700";
        div.textContent = `${r.fixture_id} +${r.qty}`;
        todayInList.appendChild(div);
      });
    }

    /* ===============================
     * 2️⃣ 今日退料
     * =============================== */
    const todayOut = data?.today_out || {};
    const todayOutEl = document.getElementById("todayOut");
    if (todayOutEl) todayOutEl.textContent = todayOut.total || 0;

    const todayOutList = document.getElementById("todayOutList");
    if (todayOutList) {
      todayOutList.innerHTML = "";
      (todayOut.items || []).forEach(r => {
        const div = document.createElement("div");
        div.className = "text-sm text-gray-700";
        div.textContent = `${r.fixture_id} -${r.qty}`;
        todayOutList.appendChild(div);
      });
    }

    /* ===============================
     * 3️⃣ 即將更換治具
     * =============================== */
    const upcomingList = document.getElementById("upcomingList");
    if (upcomingList) {
      upcomingList.innerHTML = "";
      (data.upcoming_replacements || []).forEach(r => {

          const percent = Math.round((r.actual_value || 0) * 100);

          const color =
            r.lifecycle_status === "expired"
              ? "text-red-600"
              : r.lifecycle_status === "warning"
              ? "text-orange-600"
              : "text-yellow-600";

          const div = document.createElement("div");
          div.className = `text-sm flex justify-between ${color}`;

          div.innerHTML = `
            <span>
              ${r.fixture_id}
              ${r.datecode ? `(${r.datecode})` : ""}
              <span class="text-xs text-gray-500 ml-1">
                ${r.lifecycle_mode}
              </span>
            </span>
            <span>${percent}%</span>
          `;

          upcomingList.appendChild(div);
        });
    }

    /* ===============================
     * 4️⃣ 治具統計卡片（State-based）
     * =============================== */
    applyFixtureSummary(data.fixture_summary);


  } catch (err) {
    console.error("[dashboard] load failed", err);
    toast("Dashboard 載入失敗", "error");
  }
}

/* ============================================================
 * 治具統計卡片（只吃 dashboard.fixture_summary）
 * ============================================================ */
function applyFixtureSummary(summary = {}) {
  const {
    total_fixtures = 0,
    fixtures_in_stock = 0,
    fixtures_scrapped = 0,
    fixtures_maintenance = 0,
  } = summary;

  const elTotal  = document.getElementById("statTotalFixtures");
  const elActive = document.getElementById("statActiveFixtures");
  const elUnder  = document.getElementById("statUnderLifespan");
  const elNeed   = document.getElementById("statNeedReplacement");

  if (elTotal)  elTotal.innerText  = total_fixtures;
  if (elActive) elActive.innerText = fixtures_in_stock;

  // 這兩個仍然來自 lifespan（語意正確）
  if (elUnder)  elUnder.innerText  = "-";
  if (elNeed)   elNeed.innerText   = "-";
}


// ============================================================
// Lifecycle Dashboard (v1)
// ============================================================

async function loadLifecycleDashboard() {
  if (!window.currentCustomerId) return;

  try {
    // 1️⃣ KPI
    const overview = await api("/lifecycle/overview");

    renderLifecycleKPI(overview);

    // 2️⃣ 預警清單（前 10）
    const alerts = await api("/lifecycle/alerts", {
      params: { limit: 10 }
    });

    renderLifecycleAlerts(alerts);

    // 3️⃣ 異常排行榜
    const anomalies = await api("/lifecycle/anomalies");

    renderLifecycleAnomalies(anomalies);

  } catch (err) {
    console.error(err);
    toast("Lifecycle Dashboard 載入失敗", "error");
  }
}


// ============================================================
// KPI 卡片
// ============================================================

function renderLifecycleKPI(data) {
  if (!data) return;

  document.getElementById("kpi-normal").textContent = data.normal ?? 0;
  document.getElementById("kpi-warning").textContent = data.warning ?? 0;
  document.getElementById("kpi-expired").textContent = data.expired ?? 0;
  document.getElementById("kpi-premature").textContent = data.premature_failure ?? 0;
}


// ============================================================
// 預警清單
// ============================================================

function renderLifecycleAlerts(rows) {
  const tbody = document.getElementById("lifecycleAlertTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-gray-400 py-3">
          沒有異常
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    const statusColor = {
      premature_failure: "text-red-600 font-bold",
      expired: "text-orange-600 font-bold",
      warning: "text-yellow-600 font-bold"
    }[r.lifecycle_status] || "";

    tr.innerHTML = `
      <td class="py-2 pr-4">${r.entity_type}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.serial_number ?? "-"}</td>
      <td class="py-2 pr-4 ${statusColor}">${r.lifecycle_status}</td>
      <td class="py-2 pr-4">${r.actual_value ?? "-"}</td>
      <td class="py-2 pr-4">${r.remaining_value ?? "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}


// ============================================================
// 異常排行榜
// ============================================================

function renderLifecycleAnomalies(rows) {
  const container = document.getElementById("lifecycleAnomalyList");
  if (!container) return;

  container.innerHTML = "";

  if (!rows || rows.length === 0) {
    container.innerHTML = `<div class="text-gray-400">沒有異常紀錄</div>`;
    return;
  }

  rows.forEach(r => {
    const div = document.createElement("div");
    div.className = "flex justify-between py-1";

    div.innerHTML = `
      <span>${r.fixture_id}</span>
      <span class="text-red-600 font-semibold">${r.premature_count}</span>
    `;

    container.appendChild(div);
  });
}


// ============================================================
// 初始化
// ============================================================

onUserReady?.(() => {
  onCustomerReady?.(() => {
    loadLifecycleDashboard();
  });
});
