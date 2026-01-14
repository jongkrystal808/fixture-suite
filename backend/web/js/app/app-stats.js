/**
 * app-stats.js (v4.x FINAL)
 *
 * Stats Tab 唯一資料來源：
 * - GET /stats/fixture-lifespan
 *
 * 原則：
 * - 不處理 customer_id
 * - 不使用 summary / fixture-status
 * - 不在前端推估壽命
 */

/* ============================================================
 * Entry：tab 切換時呼叫
 * ============================================================ */
window.loadStats = function () {
  loadFixtureStatsSummary();
  loadUndurableFixtures();
};

/* ============================================================
 * 1) 統計卡片（fixture-lifespan）
 * ============================================================ */
async function loadFixtureStatsSummary() {
  try {
    const rows = await apiGetFixtureLifespan();

    const elTotal  = document.getElementById("statTotalFixtures");
    const elActive = document.getElementById("statActiveFixtures");
    const elUnder  = document.getElementById("statUnderLifespan");
    const elNeed   = document.getElementById("statNeedReplacement");

    const total = rows.length;

    const normal  = rows.filter(r => r.lifespan_status === "normal").length;
    const warning = rows.filter(r => r.lifespan_status === "warning").length;
    const expired = rows.filter(r => r.lifespan_status === "expired").length;

    if (elTotal)  elTotal.innerText  = total;
    if (elActive) elActive.innerText = normal;
    if (elUnder)  elUnder.innerText  = expired;
    if (elNeed)   elNeed.innerText   = warning;

  } catch (err) {
    console.error("loadFixtureStatsSummary() failed:", err);
    toast("載入治具壽命統計失敗", "error");
  }
}

/* ============================================================
 * 2) 不耐用治具清單（expired）
 * ============================================================ */
async function loadUndurableFixtures() {
  try {
    const rows = await apiGetFixtureLifespan({ status: "expired" });
    renderUndurableTable(rows || []);
  } catch (err) {
    console.error("loadUndurableFixtures() failed:", err);
    renderUndurableTable([]);
  }
}

/* ============================================================
 * 3) 表格渲染
 * ============================================================ */
function renderUndurableTable(rows) {
  const tbody = document.getElementById("undurableTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-3 text-gray-400">
          目前沒有不耐用治具資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const fixtureId = r.fixture_id ?? "-";

    const expectLife =
      r.cycle_unit === "uses"
        ? `${r.replacement_cycle ?? "-"} 次`
        : r.cycle_unit === "days"
        ? `${r.replacement_cycle ?? "-"} 天`
        : "未設定";

    const actualUses = Number(r.total_uses ?? 0);
    const rate =
      r.usage_ratio != null ? `${Math.round(r.usage_ratio * 100)}%` : "-";

    const levelMap = {
      normal: "正常",
      warning: "即將更換",
      expired: "已超壽命",
      no_cycle: "未設定",
    };

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${fixtureId}</td>
      <td class="py-2 pr-4">${r.fixture_name ?? "-"}</td>
      <td class="py-2 pr-4">${expectLife}</td>
      <td class="py-2 pr-4">${actualUses}</td>
      <td class="py-2 pr-4">${rate}</td>
      <td class="py-2 pr-4">${levelMap[r.lifespan_status] ?? "-"}</td>
      <td class="py-2 pr-4">${r.owner_name ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost btn-xs"
                onclick="openFixtureDetail('${fixtureId}')">
          查看詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
