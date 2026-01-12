/**
 * app-stats.js (v4.x PATCHED)
 *
 * ✅ 不再手動帶 customer_id（由 api-config 自動注入 X-Customer-Id）
 * ✅ 對齊 index.html 的 Stats DOM id
 *   - statTotalFixtures
 *   - statActiveFixtures
 *   - statUnderLifespan
 *   - statNeedReplacement
 *   - undurableTable
 *
 * 後端已有：GET /fixtures/statistics/summary
 *   -> FixtureStatistics：
 *      total_fixtures, total_quantity, in_stock_qty, deployed_qty,
 *      maintenance_qty, scrapped_qty, returned_qty,
 *      active_fixtures, returned_fixtures, scrapped_fixtures
 *
 * 「壽命未達標」「即將更換」：
 * - 先用 maintenance_qty / 部分推估，之後可改成真實的 cycle/usage 計算
 */

/* ============================================================
 * customer gate（v4.x：只檢查 context 是否存在）
 * ============================================================ */
function hasCustomerContext() {
  return !!(window.currentCustomerId || localStorage.getItem("current_customer_id"));
}

/* ============================================================
 * 入口：給 tab 切換時呼叫
 * ============================================================ */
window.loadStats = function () {
  loadFixtureStatsSummary();
  loadUndurableFixtures();
};

/* ============================================================
 * 1) 統計卡片
 * ============================================================ */
async function loadFixtureStatsSummary() {
  if (!hasCustomerContext()) {
    console.warn("Stats: 尚未選擇客戶");
    return;
  }

  try {
    // ✅ v4.x：wrapper 不要再收 customer_id
    // 建議 api-fixtures.js: apiGetFixtureStatistics() => api("/fixtures/statistics/summary")
    const data = await apiGetFixtureStatistics();

    const elTotal  = document.getElementById("statTotalFixtures");
    const elActive = document.getElementById("statActiveFixtures");
    const elUnder  = document.getElementById("statUnderLifespan");
    const elNeed   = document.getElementById("statNeedReplacement");

    const total  = Number(data?.total_fixtures ?? 0);
    const active = Number(data?.active_fixtures ?? 0);

    if (elTotal)  elTotal.innerText  = total;
    if (elActive) elActive.innerText = active;

    // ✅ v4.x 先用合理的替代邏輯：
    // - 未達壽命：暫以「非 active」視為風險（但不含 scrapped/returned 可視需求調整）
    const scrapped = Number(data?.scrapped_fixtures ?? data?.scrapped_qty ?? 0);
    const returned = Number(data?.returned_fixtures ?? data?.returned_qty ?? 0);
    const maintenance = Number(data?.maintenance_qty ?? 0);

    // under：先用「total - active - scrapped - returned」下限 0
    const under = Math.max(0, total - active - scrapped - returned);

    // need：先用 maintenance_qty（更貼近「需要處理/即將更換」）
    const need = Math.max(0, maintenance);

    if (elUnder) elUnder.innerText = under;
    if (elNeed)  elNeed.innerText  = need;

  } catch (err) {
    console.error("loadFixtureStatsSummary() failed:", err);
    toast("載入治具統計摘要失敗", "error");
  }
}

/* ============================================================
 * 2) 不耐用治具清單
 * - 建議後端用 view_fixture_status 或專用 API 回傳
 * ============================================================ */
let _undurableFixturesCache = [];

function getUndurableFixtures() {
  return _undurableFixturesCache || [];
}
window.getUndurableFixtures = getUndurableFixtures;

async function loadUndurableFixtures() {
  if (!hasCustomerContext()) return;

  try {
    // ✅ v4.x：wrapper 不帶 customer_id
    // 建議 api-fixtures.js: apiGetFixtureStatus() => api("/fixtures/status/view")
    const rows = await apiGetFixtureStatus();

    // 這裡示範 filter：replacement_status === "需更換"
    const undurable = (rows || []).filter(
      (r) => r?.replacement_status === "需更換"
    );

    _undurableFixturesCache = undurable;
    renderUndurableTable(undurable);
  } catch (err) {
    console.error("loadUndurableFixtures() failed:", err);
    _undurableFixturesCache = [];
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
    const fixtureId = r.fixture_id ?? r.id ?? "-";

    const expectLife =
      r.cycle_unit === "uses"
        ? `${r.replacement_cycle ?? "-"} 次`
        : r.cycle_unit === "days"
        ? `${r.replacement_cycle ?? "-"} 天`
        : "未設定";

    const actualUses = Number(r.total_uses ?? r.used_count ?? 0);
    const cycle = Number(r.replacement_cycle ?? 0);

    const rate = cycle > 0 ? Math.round((actualUses / cycle) * 100) : 0;

    let level = "正常";
    if (cycle > 0) {
      if (rate < 50) level = "嚴重不足";
      else if (rate < 80) level = "偏低";
    }

    const owner =
      r.primary_owner_name ??
      r.primary_owner ??
      r.owner_name ??
      "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${fixtureId}</td>
      <td class="py-2 pr-4">${r.fixture_name ?? "-"}</td>
      <td class="py-2 pr-4">${expectLife}</td>
      <td class="py-2 pr-4">${actualUses}</td>
      <td class="py-2 pr-4">${cycle > 0 ? `${rate}%` : "-"}</td>
      <td class="py-2 pr-4">${level}</td>
      <td class="py-2 pr-4">${owner}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost btn-xs" onclick="openFixtureDetail('${fixtureId}')">
          查看詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.loadFixtureStatsSummary = loadFixtureStatsSummary;
window.loadUndurableFixtures = loadUndurableFixtures;
window.renderUndurableTable = renderUndurableTable;
