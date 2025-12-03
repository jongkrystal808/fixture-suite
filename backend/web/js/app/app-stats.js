/**
 * app-stats.js (v3.6)
 *
 * ✔ 使用 current_customer_id
 * ✔ 對齊 index.html 的 Stats 區塊 DOM id
 *   - statTotalFixtures
 *   - statActiveFixtures
 *   - statUnderLifespan
 *   - statNeedReplacement
 *   - undurableTable
 *
 * 目前後端我們已經有 /fixtures/statistics/summary
 *   -> 回傳 FixtureStatistics：
 *      total_fixtures, total_quantity, available_qty, deployed_qty,
 *      maintenance_qty, scrapped_qty, returned_qty,
 *      active_fixtures, returned_fixtures, scrapped_fixtures
 *
 * 「壽命未達標」、「即將更換」這兩個數字暫以簡單推估，你之後可以再調整計算方式。
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
 * 初始化：載入統計卡片 & 不耐用清單
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadFixtureStatsSummary();
  loadUndurableFixtures();     // 目前用簡單算法，你之後可以改成後端 API
});

/* ============================================================
 * 1. 統計卡片（上面四張卡）
 * ============================================================ */

async function loadFixtureStatsSummary() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("Stats: 尚未選擇客戶");
    return;
  }

  try {
    // 假設你在 api-fixtures.js 新增了這個 wrapper：
    //   apiGetFixtureStatistics(customer_id)
    // 對應後端: GET /fixtures/statistics/summary?customer_id=...
    const data = await apiGetFixtureStatistics(customer_id);

    // 對應你的 HTML id
    const elTotal = document.getElementById("statTotalFixtures");
    const elActive = document.getElementById("statActiveFixtures");
    const elUnder = document.getElementById("statUnderLifespan");
    const elNeed = document.getElementById("statNeedReplacement");

    if (elTotal) elTotal.innerText = data.total_fixtures ?? 0;
    if (elActive) elActive.innerText = data.active_fixtures ?? 0;

    // 下兩個先用簡單推估，避免是 0 好看一點：
    // 你之後可以照實際定義改成：
    //   - 未達壽命 = ???（例如 total_fixtures - scrapped_fixtures - returned_fixtures ...）
    //   - 即將更換 = ???（例如 maintenance_qty 或 cycle 逼近門檻的數量）
    const under =
      (data.total_fixtures ?? 0) -
      (data.active_fixtures ?? 0) -
      (data.scrapped_fixtures ?? 0);
    const need = data.scrapped_fixtures ?? 0;

    if (elUnder) elUnder.innerText = under < 0 ? 0 : under;
    if (elNeed) elNeed.innerText = need;
  } catch (err) {
    console.error("loadFixtureStatsSummary() failed:", err);
    toast("載入治具統計摘要失敗", "error");
  }
}

/* ============================================================
 * 2. 不耐用治具清單 (壽命未達預設值)
 *
 * 目前 demo 作法：
 *   - 從 view_fixture_status / 或 fixtures/statistics 拿資料會比較理想
 *   - 這裡先寫成「前端可以接一個陣列 rows」的 renderer
 *   - 你可以之後改成呼叫後端 API 再丟進 renderUndurableTable(rows)
 * ============================================================ */

let _undurableFixturesCache = [];

// 給「匯出」按鈕用：downloadCSV(... toCSV(getUndurableFixtures()))
function getUndurableFixtures() {
  return _undurableFixturesCache || [];
}
window.getUndurableFixtures = getUndurableFixtures;

// 目前簡單：先抓全部 fixture status，再挑出「需要更換」或「壽命偏低」之類的
// 你如果還沒實作後端，可以暫時改成 renderUndurableTable([]) 也沒關係
async function loadUndurableFixtures() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    // 假設你有 API：GET /fixtures/status/view?customer_id=...
    // 對應 api-fixtures.js 的 apiGetFixtureStatus(customer_id)
    const rows = await apiGetFixtureStatus(customer_id);

    // 這裡示範簡單 filter：
    //   假設 view_fixture_status 裡有 replacement_status 欄位 = '需更換' / '正常'
    const undurable = (rows || []).filter(
      (r) => r.replacement_status === "需更換"
    );

    _undurableFixturesCache = undurable;
    renderUndurableTable(undurable);
  } catch (err) {
    console.error("loadUndurableFixtures() failed:", err);
    renderUndurableTable([]);
  }
}

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
    // 這裡欄位名稱依 view_fixture_status 調整：
    // fixture_id, fixture_name, replacement_cycle, total_uses, owner_name ...
    const expectLife =
      r.cycle_unit === "uses"
        ? `${r.replacement_cycle ?? "-"} 次`
        : r.cycle_unit === "days"
        ? `${r.replacement_cycle ?? "-"} 天`
        : "未設定";

    const actualUses = r.total_uses ?? r.used_count ?? 0;
    const rate =
      r.replacement_cycle && r.replacement_cycle > 0
        ? Math.round((actualUses / r.replacement_cycle) * 100)
        : 0;

    let level = "正常";
    if (rate < 50) level = "嚴重不足";
    else if (rate < 80) level = "偏低";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.fixture_name ?? "-"}</td>
      <td class="py-2 pr-4">${expectLife}</td>
      <td class="py-2 pr-4">${actualUses}</td>
      <td class="py-2 pr-4">${rate}%</td>
      <td class="py-2 pr-4">${level}</td>
      <td class="py-2 pr-4">${r.primary_owner ?? r.owner_name ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost btn-xs" onclick="openFixtureDetail('${r.fixture_id}')">
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
