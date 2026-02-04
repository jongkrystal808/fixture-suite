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
        const percent = Math.round((r.usage_ratio || 0) * 100);
        const color =
          percent >= 100 ? "text-red-600" :
          percent >= 90  ? "text-orange-600" :
                           "text-yellow-600";

        const div = document.createElement("div");
        div.className = `text-sm flex justify-between ${color}`;
        div.innerHTML = `
          <span>${r.fixture_id} ${r.fixture_name}</span>
          <span>${percent}%</span>
        `;
        upcomingList.appendChild(div);
      });
    }

    /* ===============================
     * 4️⃣ 治具統計卡片（State-based）
     * =============================== */
    applyFixtureSummary(data.fixture_summary);

    /* ===============================
     * 5️⃣ 不耐用治具清單
     * =============================== */
    await loadUndurableFixtures();

    /* ===============================
     * 6️⃣ 常用治具
     * =============================== */
    loadCommonFixtures();

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

/* ============================================================
 * 常用治具（lifespan，取前幾筆）
 * ============================================================ */
async function loadCommonFixtures() {
  try {
    const data = await apiGetFixtureLifespan({ limit: 8 });
    const rows = data?.items || [];
    renderCommonFixturesTable(rows);
  } catch (err) {
    console.error("[dashboard] common fixtures load failed", err);
  }
}

function renderCommonFixturesTable(rows) {
  const tbody = document.getElementById("commonFixturesTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 pr-4">${r.fixture_id}</td>
      <td class="py-1 pr-4">${r.fixture_name}</td>
      <td class="py-1 pr-4">${r.lifespan_status}</td>
      <td class="py-1 pr-4">
        ${r.total_uses || 0}/${r.replacement_cycle || "-"}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 不耐用治具（expired）
 * ============================================================ */
let lifespanPage = 1;
const lifespanPageSize = 20;

async function loadUndurableFixtures() {
  try {
    const data = await apiGetFixtureLifespan({
      status: "expired",
      skip: (lifespanPage - 1) * lifespanPageSize,
      limit: lifespanPageSize,
    });

    const rows = data?.items || [];
    const total = data?.total ?? rows.length;

    renderDashboardUndurableTable(rows);

    renderPagination(
      "undurablePagination",
      total,
      lifespanPage,
      lifespanPageSize,
      p => {
        lifespanPage = p;
        loadUndurableFixtures();
      }
    );
  } catch (err) {
    console.error("[dashboard] loadUndurableFixtures failed:", err);
    renderDashboardUndurableTable([]);
  }
}

function renderDashboardUndurableTable(rows) {
  const tbody = document.getElementById("undurableTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-3 text-gray-400">
          目前沒有不耐用治具資料
        </td>
      </tr>
    `;
    return;
  }

  const levelMap = {
    normal: "正常",
    warning: "即將更換",
    expired: "已超壽命",
    no_cycle: "未設定",
  };

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.fixture_name}</td>
      <td class="py-2 pr-4">${r.replacement_cycle ?? "-"}</td>
      <td class="py-2 pr-4">${r.total_uses ?? 0}</td>
      <td class="py-2 pr-4">${Math.round((r.usage_ratio || 0) * 100)}%</td>
      <td class="py-2 pr-4">${levelMap[r.lifespan_status]}</td>
      <td class="py-2 pr-4">${r.owner_name ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost btn-xs"
                onclick="openFixtureDetail('${r.fixture_id}')">
          查看詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
