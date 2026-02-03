/* ============================================================
 * app-query.js (v4.x PATCHED)
 *
 * ✔ 對應 index.html 查詢頁
 * ✔ fixtures / models 查詢 + 分頁
 * ✔ Detail Drawer
 * ✔ customer 由 api-config.js 注入 X-Customer-Id
 * ============================================================ */
let fixtureQueryPage = 1;
const fixtureQueryPageSize = 8;
let fixtureQueryPager = null;

/* ============================================================
 * 工具：通用分頁元件
 * ============================================================ */
function renderPagination(targetId, total, page, pageSize, onClick) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = "";
  if (!total || total <= pageSize) return;

  const totalPages = Math.ceil(total / pageSize);

  function addBtn(label, p, active = false, disabled = false) {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.className =
      "btn btn-xs mx-1 " +
      (active ? "btn-primary" : "btn-ghost");

    if (disabled || p == null) {
      btn.disabled = true;
      el.appendChild(btn);
      return;
    }

    btn.onclick = () => onClick(p);
    el.appendChild(btn);
  }

  addBtn("‹", page - 1, false, page === 1);

  // 顯示範圍
  let start = Math.max(1, page - 4);
  let end = Math.min(totalPages, page + 4);

  if (page <= 5) end = Math.min(10, totalPages);
  if (page >= totalPages - 4) start = Math.max(1, totalPages - 9);

  // 第一頁
  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null, false, true);
  }

  for (let p = start; p <= end; p++) {
    addBtn(String(p), p, p === page);
  }

  // 最後一頁
  if (end < totalPages) {
    if (end < totalPages - 1) addBtn("...", null, false, true);
    addBtn(String(totalPages), totalPages);
  }

  addBtn("›", page + 1, false, page === totalPages);
}

/* ============================================================
 * 🔵 治具查詢 Fixtures
 * ============================================================ */

let fixturesQueryTimer = null;
function debounceLoadFixtures() {
  clearTimeout(fixturesQueryTimer);
  fixturesQueryTimer = setTimeout(loadFixturesQuery, 250);
}

async function loadFixturesQuery() {
  // v4.x：一定要有 customer context
  if (!window.currentCustomerId) return;

  const searchEl = document.getElementById("fixtureSearch");
  const tbody = document.getElementById("fixtureTable");

  if (!searchEl || !tbody) {
    console.warn("[query] fixture query UI not ready");
    return;
  }

  const keyword = searchEl.value.trim();

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize,
  };

  if (keyword) params.search = keyword;

  try {
    const data = await apiListFixtures(params);
    renderFixturesTable(data?.fixtures || []);

    if (fixtureQueryPager) {
      fixtureQueryPager.render(data?.total || 0);
    }

  } catch (err) {
    console.error("[query] loadFixturesQuery failed:", err);
    renderFixturesTable([]);
  }
}


function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-gray-400 py-3">
          沒有資料
        </td>
      </tr>`;
    return;
  }

  for (const f of rows) {
    const purchased = f.self_purchased_qty ?? 0;
    const supplied  = f.customer_supplied_qty ?? 0;
    const available = f.in_stock_qty ?? 0;

    const fid = f.fixture_id ?? f.id ?? "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">
        <span class="text-indigo-600 underline cursor-pointer"
              onclick="openFixtureDetail('${fid}')">
          ${fid}
        </span>
      </td>

      <td class="py-2 px-4">${f.fixture_name || "-"}</td>
      <td class="py-2 px-4">${f.fixture_type || "-"}</td>

      <!-- ⭐ 統一庫存顯示 -->
      <td class="py-2 px-4">
        ${purchased} / ${supplied} / ${available}
      </td>

      <td class="py-2 px-4">${f.storage_location || "-"}</td>
      <td class="py-2 px-4">${f.owner_name || "-"}</td>
      <td class="py-2 px-4">${f.note || "-"}</td>
    `;

    tbody.appendChild(tr);
  }
}

window.loadFixturesQuery = loadFixturesQuery;
window.debounceLoadFixtures = debounceLoadFixtures;

/* ============================================================
 * 🟦 Fixture Detail Drawer
 * ============================================================ */

function closeFixtureDetail() {
  const drawer = document.getElementById("fixtureDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");

  if (window.__activeOverlayCloser === closeFixtureDetail) {
    window.__activeOverlayCloser = null;
  }
}
window.closeFixtureDetail = closeFixtureDetail;

async function openFixtureDetail(fixtureId) {

  const drawer = document.getElementById("fixtureDetailDrawer");
  const box = document.getElementById("fixtureDetailContent");

  if (!drawer || !box) {
    console.error("❌ Drawer DOM not found");
    return;
  }

  drawer.classList.remove("translate-x-full");
  window.__activeOverlayCloser = () => closeFixtureDetail();

  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    // =====================================================
    // 1️⃣ 治具壽命 / 狀態（核心）
    // =====================================================
    const lifespanResp = await apiGetFixtureLifespan({
      fixture_id: fixtureId,
      limit: 1,
    });

    // ⭐ 關鍵：先 normalize
    const lifespanRows = lifespanResp?.items || lifespanResp || [];

    const f = lifespanRows[0];
    if (!f) {
      throw new Error("No fixture lifespan data");
    }

    // =====================================================
    // 2️⃣ 使用 / 更換紀錄（event-based）
    // =====================================================
    let usageLogs = [];
    let replacementLogs = [];

    try {
      const usageResp = await apiListUsageLogs({
        fixtureId: fixtureId,   // ⭐ 一定要是 fixtureId
        page: 1,
        pageSize: 5,
      });
      usageLogs = Array.isArray(usageResp) ? usageResp : [];
    } catch (e) {
      usageLogs = [];
    }

    try {
      const replResp = await apiListReplacementLogs({
        fixture_id: fixtureId,
        skip: 0,
        limit: 5,
      });
      replacementLogs = Array.isArray(replResp) ? replResp : [];
    } catch (e) {
      replacementLogs = [];
    }

    // =====================================================
    // 2. 庫存（Inventory - 同一層完整顯示）
    // =====================================================
    let serials = [];
    let datecodes = [];
    let invHistory = [];

    try {
      const serialResp = await apiInventorySerial({ fixture_id: fixtureId });
      serials = serialResp?.items || serialResp || [];

    } catch (e) {
      serials = [];
    }

    try {
      const dcResp = await apiInventoryDatecode({ fixture_id: fixtureId });
        datecodes = dcResp?.items || dcResp || [];

    } catch (e) {
      datecodes = [];
    }

    try {
      const histResp = await apiInventoryHistory({ fixture_id: fixtureId });
    invHistory = histResp?.items || histResp || [];
    } catch (e) {
      invHistory = [];
    }

    const inUseSerials = serials.filter(s =>
      ["deployed", "in_use"].includes(s.status)
    );

    const freeSerials = serials.filter(s =>
      s.status === "in_stock"
    );


    const datecodeAvailable = datecodes.filter(d => d.in_stock_qty > 0);

    const totalDatecodeQty = datecodeAvailable.reduce(
      (sum, d) => sum + (d.in_stock_qty || 0),
      0
    );

    // =====================================================
    // Inventory Summary（語意修正）
    // =====================================================
    const serialCount = serials.length;

    // ✅ 真正的「所有治具數」
    const totalFixtureCount = serialCount + totalDatecodeQty;




    // =====================================================
    // 3️⃣ Render
    // =====================================================
    box.innerHTML = `
      <!-- Tabs -->
      <div class="flex gap-2 border-b mb-4">
        <button class="fd-tab fd-tab-active" data-tab="inventory"
                onclick="switchFixtureDetailTab('inventory')">庫存檢視</button>
        <button class="fd-tab" data-tab="usage"
                onclick="switchFixtureDetailTab('usage')">使用記錄</button>
        <button class="fd-tab" data-tab="replacement"
                onclick="switchFixtureDetailTab('replacement')">更換記錄</button>
        <button class="fd-tab" data-tab="basic"
                onclick="switchFixtureDetailTab('basic')">基本資料</button>
      </div>
    
      
      <!-- 庫存檢視 -->
        <section id="fd-tab-inventory" class="space-y-6 text-sm">
        
          <!-- ===== Summary ===== -->
          <div class="border rounded-xl p-4 bg-gray-50 space-y-1">
            <div>共有治具：<b>${totalFixtureCount}</b> 個</div>
            <div>
              現用序號：
              <b>
                  ${inUseSerials.length
                    ? inUseSerials.map(s => s.serial_number).join(", ")
                    : "-"
                  }
                </b>

            </div>
            <div>
              可用序號：
              <b>
              ${freeSerials.length
                ? freeSerials.map(s => s.serial_number).join(", ")
                : "-"
              }
            </b>

            </div>
            <div>
              Datecode 可用：
              <b>${datecodeAvailable.length}</b> 種
              （共 ${totalDatecodeQty} 件）
            </div>
          </div>
        
          <!-- ===== Serial Inventory ===== -->
          <div>
            <h4 class="font-semibold mb-2">序號庫存</h4>
        
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="text-gray-500 mb-1">現用序號</div>
                <div class="text-xs break-all">
                  ${renderSerialList(inUseSerials.map(s => s.serial_number), 10) || "-"}
                </div>
              </div>
        
              <div>
                <div class="text-gray-500 mb-1">可用序號</div>
                <div class="text-xs break-all">
                  ${renderSerialList(freeSerials.map(s => s.serial_number), 10) || "-"}
                </div>
              </div>
            </div>
          </div>
        
          <!-- ===== Datecode Inventory ===== -->
          <div>
            <h4 class="font-semibold mb-2">Datecode 庫存</h4>
        
            <table class="min-w-full text-xs">
              <thead class="text-gray-500">
                <tr>
                  <th class="py-1 pr-3 text-left">Datecode</th>
                  <th class="py-1 pr-3 text-right">可用數量</th>
                </tr>
              </thead>
              <tbody>
                ${datecodeAvailable.map(d => `
                  <tr>
                    <td class="py-1">${d.datecode}</td>
                    <td class="py-1 text-right">${d.in_stock_qty}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        
          <!-- ===== Receipt / Return History ===== -->
          <div>
            <h4 class="font-semibold mb-2">收料 / 退料記錄</h4>
            <div class="flex gap-2 mb-2">
              <button class="btn btn-xs" onclick="filterInventoryHistory('all')">全部</button>
              <button class="btn btn-xs" onclick="filterInventoryHistory('receipt')">只看收料</button>
              <button class="btn btn-xs" onclick="filterInventoryHistory('return')">只看退料</button>
            </div>

            <table id="fd-inv-history" class="min-w-full text-xs">
              <thead class="text-gray-500">
                <tr>
                  <th class="py-1 pr-3 text-left">類型</th>
                  <th class="py-1 pr-3 text-left">日期</th>
                  <th class="py-1 pr-3 text-left">數量</th>
                  <th class="py-1 pr-3 text-left">單號</th>
                  <th class="py-1 pr-3 text-left">內容</th>
                </tr>
              </thead>
              <tbody>
              ${invHistory.map(r => `
                <tr class="border-t" data-type="${r.transaction_type}">
                  <td class="py-1 pr-3">${r.transaction_type === "receipt" ? "收料" : "退料"}</td>
                  <td class="py-1 pr-3">${r.transaction_date}</td>
                  <td class="py-1 pr-3 text-left tabular-nums">
                    ${Number.isFinite(Number(r.quantity))
                      ? Math.abs(Number(r.quantity))
                      : "-"
                    }
                  </td>
                  <td class="py-1 pr-3">${r.order_no || "-"}</td>
                  <td class="py-1 pr-3">${r.content || r.note || "-"}</td>
                </tr>
              `).join("")}
            </tbody>
            </table>
          </div>
        
        </section>

    
      <!-- 使用記錄 -->
      <section id="fd-tab-usage" class="hidden space-y-3">
        ${renderUsageLogs(usageLogs, f)}
      </section>
    
      <!-- 更換記錄 -->
      <section id="fd-tab-replacement" class="hidden space-y-3">
        ${renderReplacementLogs(replacementLogs)}
      </section>
    
      <!-- 基本資料（最後） -->
      <section id="fd-tab-basic" class="hidden space-y-3">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div><b>治具編號：</b>${f.fixture_id}</div>
          <div><b>名稱：</b>${f.fixture_name ?? "-"}</div>
          <div><b>壽命狀態：</b>${f.lifespan_status}</div>
          <div><b>預期壽命：</b>${f.replacement_cycle ?? "-"} ${f.cycle_unit === "uses" ? "次" : "天"}</div>
          <div><b>已使用：</b>${f.total_uses ?? 0}</div>
        </div>
      </section>
    `;

  } catch (err) {
    console.error("openFixtureDetail failed:", err);
    box.innerHTML = `<div class="p-4 text-red-500">讀取資料失敗</div>`;
  }
}

window.openFixtureDetail = openFixtureDetail;


/* ============================================================
 * 🟩 機種查詢 Models（v4.x：不帶 customer_id）
 * ============================================================ */

let modelQueryPage = 1;
const modelQueryPageSize = 50;

async function loadModelsQuery() {
  if (!window.currentCustomerId) return;

  const keyword =
    document.getElementById("modelSearch")?.value.trim() || "";

  const params = {
    search: keyword,
    skip: (modelQueryPage - 1) * modelQueryPageSize,
    limit: modelQueryPageSize,
  };

  try {
    const data = await apiListMachineModels(params);

    // 相容：後端可能回 items/models/array
    const list = data?.items || data?.models || data || [];

    renderModelsQueryTable(list);

    renderPagination(
      "modelQueryPagination",
      data?.total || (Array.isArray(list) ? list.length : 0) || 0,
      modelQueryPage,
      modelQueryPageSize,
      (p) => {
        modelQueryPage = p;
        loadModelsQuery();
      }
    );
  } catch (err) {
    console.error("loadModelsQuery() failed:", err);
    renderModelsQueryTable([]);
  }
}
window.loadModelsQuery = loadModelsQuery;

function renderModelsQueryTable(list) {
  const tbody = document.getElementById("modelTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || !list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  list.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">${m.id}</td>
      <td class="py-2 px-4">${m.model_name || "-"}</td>
      <td class="py-2 px-4">${m.note || "-"}</td>
      <td class="py-2 px-4">
        <button class="text-indigo-600 underline"
                onclick="openModelDetail('${m.id}')">
          詳情
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
 * v4.x：Query 模組初始化（等 customer ready）
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  fixtureQueryPager = createPagination({
    getPage: () => fixtureQueryPage,
    setPage: v => fixtureQueryPage = v,
    getPageSize: () => fixtureQueryPageSize,
    onPageChange: () => {
      loadFixturesQuery();
    },
    els: {
      pageNow: document.getElementById("fixturePageNow"),
      pageMax: document.getElementById("fixturePageMax"),
    }
  });
});



onCustomerReady(() => {
  // 如果 Query tab 首次進來才 load，你也可以只綁事件，不在這裡硬載
  // 這裡先不主動 load，避免與 app-main.js 的 lazy-load 重複
});



/* ============================================================
 * queryType 切換（v4.x PATCHED）
 * - 等 customer ready
 * - 切換時重置分頁
 * ============================================================ */
function switchQueryType() {
  const type = document.getElementById("queryType")?.value;
  if (!type) return;

  const fixtureArea = document.getElementById("fixtureQueryArea");
  const modelArea = document.getElementById("modelQueryArea");
  if (!fixtureArea || !modelArea) return;

  // v4.x：沒有 customer context 就不要載
  if (!window.currentCustomerId) return;

  if (type === "fixture") {
    fixtureArea.classList.remove("hidden");
    modelArea.classList.add("hidden");

    fixtureQueryPage = 1;
    loadFixturesQuery();
  } else {
    modelArea.classList.remove("hidden");
    fixtureArea.classList.add("hidden");

    modelQueryPage = 1;
    loadModelsQuery();
  }
}
window.switchQueryType = switchQueryType;


/* ============================================================
 * Drawer：使用紀錄 / 更換紀錄（供 Fixture Drawer 使用）
 * ============================================================ */
function renderUsageLogs(logs, fixtureInfo) {
  if (!logs || !logs.length) {
    return "<p class='text-gray-500'>無使用紀錄</p>";
  }

  const cycle = fixtureInfo?.replacement_cycle || 0;

  return `
    <div class="space-y-3">
      ${logs.map(log => {
        const usedDate = log.used_at
          ? new Date(log.used_at).toLocaleDateString("zh-TW")
          : "-";

        const useCount = log.use_count ?? 0;

        // 壽命消耗比例（單筆）
        const ratio =
          cycle > 0
            ? `${Math.round((useCount / cycle) * 100)}%`
            : "-";

        return `
          <div class="border rounded-xl p-3 text-sm bg-gray-50 space-y-1">
            <div><b>日期：</b>${usedDate}</div>
            <div><b>站點：</b>${log.station_id ?? "-"}</div>
            <div><b>操作人員：</b>${log.operator ?? "-"}</div>
            <div><b>使用次數：</b>${useCount}</div>
            <div><b>壽命消耗：</b>${ratio}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

window.renderUsageLogs = renderUsageLogs;

function renderReplacementLogs(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return "<p class='text-gray-500'>無更換紀錄</p>";
  }

  return `
    <div class="space-y-3">
      ${logs.map(log => `
        <div class="border rounded-xl p-3 text-sm bg-gray-50">
          <div><b>日期：</b>${log.replacement_date ?? "-"}</div>
          <div><b>原因：</b>${log.reason ?? "-"}</div>
          <div><b>執行人員：</b>${log.executor ?? "-"}</div>
          ${log.note ? `<div><b>備註：</b>${log.note}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}
window.renderReplacementLogs = renderReplacementLogs;


/* ============================================================
 * 通用格式化
 * ============================================================ */
function formatTrans(t) {
  if (!t) return "-";
  return `${t.transaction_date ?? ""} / ${t.order_no ?? ""} / ${t.operator ?? ""}`;
}
window.formatTrans = formatTrans;


/* ============================================================
 * 🟦 Model Detail Drawer（v4.x PATCHED）
 * - 不再顯示 customer_id（因為 customer 已是 context）
 * - tabs 綁定限制在 drawer 內，避免多次開啟重複綁事件
 * - initRequirementFilter 改傳 stations（重建 options，避免 stale）
 * ============================================================ */

function closeModelDetail() {
  const drawer = document.getElementById("modelDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");

  if (window.__activeOverlayCloser === closeModelDetail) {
    window.__activeOverlayCloser = null;
  }
}
window.closeModelDetail = closeModelDetail;

async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");
  if (!drawer || !box) {
    console.error("❌ modelDetailDrawer DOM 未找到");
    return;
  }

  // v4.x：沒有 customer context 就不開
  if (!window.currentCustomerId) return;

  drawer.classList.remove("translate-x-full");
  window.__activeOverlayCloser = () => closeModelDetail();

  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);

    const m = data?.model || {};
    const stations = Array.isArray(data?.stations) ? data.stations : [];
    const fixtures = Array.isArray(data?.requirements) ? data.requirements : [];
    const capacity = Array.isArray(data?.capacity) ? data.capacity : [];

    box.innerHTML = `
      <section class="space-y-4">

        <!-- TAB 列 -->
        <div class="flex gap-2 border-b pb-2">
          <button class="md-tab md-tab-active" data-tab="basicTab">基本資料</button>
          <button class="md-tab" data-tab="capacityTab">最大可開站數</button>
        </div>

        <div id="basicTab" class="md-tab-panel block">
          ${renderBasicSection(m, capacity)}
        </div>


        <div id="capacityTab" class="md-tab-panel hidden">
          ${renderCapacitySection(capacity, fixtures)}
        </div>

      </section>
    `;

    initModelDetailTabs();                 // 綁 tab

  } catch (err) {
    console.error("openModelDetail() failed:", err);
    box.innerHTML = `<div class="text-red-500 p-4">讀取失敗：${
      err?.data?.detail || err?.message || ""
    }</div>`;
  }
}
window.openModelDetail = openModelDetail;


/* ============================================================
 * 🟦 Tabs 控制（v4.x：限制在 drawer 內容內）
 * ============================================================ */
function initModelDetailTabs() {
  const box = document.getElementById("modelDetailContent");
  if (!box) return;

  box.querySelectorAll(".md-tab").forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.tab;
      if (!target) return;

      box.querySelectorAll(".md-tab").forEach(b => b.classList.remove("md-tab-active"));
      btn.classList.add("md-tab-active");

      box.querySelectorAll(".md-tab-panel").forEach(panel => panel.classList.add("hidden"));
      box.querySelector(`#${target}`)?.classList.remove("hidden");
    };
  });
}


/* ============================================================
 * 🟦 渲染各區域（v4.x PATCHED）
 * ============================================================ */
function renderBasicSection(m, capacity = []) {
  const rows = [...capacity].sort((a, b) =>
    String(a.station_id).localeCompare(String(b.station_id))
  );

  return `
    <h3 class="text-lg font-semibold">基本資料</h3>

    <div class="grid grid-cols-2 gap-2 text-sm mt-2 mb-4">
      <div><b>機種代碼：</b>${m.id ?? "-"}</div>
      <div><b>名稱：</b>${m.model_name ?? "-"}</div>
      <div class="col-span-2"><b>備註：</b>${m.note ?? "-"}</div>
    </div>

    <h4 class="font-semibold text-sm mb-2">目前可開站數總覽</h4>

    ${
      rows.length
        ? `
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            ${rows.map(r => {
              const v = Number(r.max_station) || 0;
              const color =
                v > 0
                  ? "bg-green-50 text-green-700 border-green-300"
                  : "bg-red-50 text-red-700 border-red-300";

              return `
                <div class="border rounded-lg px-3 py-2 text-center ${color}">
                  <div class="text-xs font-semibold truncate">
                    ${r.station_id}
                  </div>
                  <div class="text-xl font-bold tabular-nums">
                    ${v}
                  </div>
                  <div class="text-[10px] text-gray-500">
                    最大可開站數
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `
        : `<p class="text-gray-500 text-sm">尚無站點資料</p>`
    }
  `;
}





function renderCapacitySection(capacity, requirements) {
  // station_id -> max_station
  const capMap = {};
  (capacity || []).forEach(c => {
    capMap[c.station_id] = Number.isFinite(Number(c.max_station))
      ? Number(c.max_station)
      : 0;
  });

  // fixture_id -> in_stock_qty
  // requirements 裡通常已經會帶 in_stock_qty（若你後端有 join fixtures）
  const stockMap = {};
  (requirements || []).forEach(r => {
    if (r.fixture_id && r.in_stock_qty != null) {
      stockMap[r.fixture_id] = r.in_stock_qty;
    }
  });

  // group requirements by station
  const group = {};
  (requirements || []).forEach(r => {
    const sid = r.station_id || "-";
    if (!group[sid]) group[sid] = [];
    group[sid].push(r);
  });

  const stationIds = Object.keys(group);

  return `
    <h3 class="text-lg font-semibold mb-3">最大可開站數</h3>

    ${
      stationIds.length
        ? `
          <table class="min-w-full text-sm border">
            <thead class="bg-gray-100 text-gray-600">
              <tr>
                <th class="px-3 py-2 text-left border w-40">站點</th>
                <th class="px-3 py-2 text-left border">治具需求</th>
                <th class="px-3 py-2 text-right border w-20">數量</th>
                <th class="px-3 py-2 text-right border w-24">庫存數量</th>
                <th class="px-3 py-2 text-right border w-32">最大可開站數</th>
              </tr>
            </thead>
            <tbody>
              ${
                stationIds.map(stationId => {
                  const rows = group[stationId];
                  const rowspan = rows.length;
                  const maxStation = capMap[stationId] ?? 0;

                  return rows.map((r, idx) => {
                    const fixtureId = r.fixture_id ?? "-";
                    const reqQty = r.required_qty ?? 0;
                    const stockQty =
                      r.in_stock_qty != null
                        ? r.in_stock_qty
                        : (stockMap[fixtureId] ?? 0);
                    const possibleByThisFixture =
                      reqQty > 0 ? Math.floor(stockQty / reqQty) : 0;
                    
                    const shortage = possibleByThisFixture <= 0;


                    const stationCell = idx === 0
                      ? `<td class="px-3 py-2 border align-top font-semibold" rowspan="${rowspan}">
                           ${stationId}
                         </td>`
                      : "";

                    const maxCell = idx === 0
                      ? `<td class="px-3 py-2 border align-top text-right font-semibold" rowspan="${rowspan}">
                           ${maxStation}
                         </td>`
                      : "";

                    return `
                      <tr class="border-t">
                        ${stationCell}
                        <td class="px-3 py-2 border">${fixtureId}</td>
                        <td class="px-3 py-2 border text-right tabular-nums">${reqQty}</td>
                        <td class="px-3 py-2 border text-right tabular-nums">
                          <span class="${shortage ? 'text-red-600 font-semibold' : ''}">
                            ${stockQty}
                          </span>
                          <div class="text-xs text-gray-500">
                            ${reqQty > 0
                              ? `⌊${stockQty} / ${reqQty}⌋ = ${possibleByThisFixture}`
                              : '-'}
                          </div>
                        </td>

                        ${maxCell}
                      </tr>
                    `;
                  }).join("");
                }).join("")
              }
            </tbody>
          </table>
        `
        : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
    }
  `;
}





// ============================================================
// Inventory helpers (Drawer only)
// ============================================================

function renderSerialList(serials, limit = 10) {
  if (serials.length <= limit) {
    return serials.join(", ");
  }

  const head = serials.slice(0, limit).join(", ");
  const rest = serials.slice(limit).join(", ");

  const id = "serial-expand-" + Math.random().toString(36).slice(2);

  return `
    <span>${head}</span>
    <span id="${id}" class="hidden">, ${rest}</span>
    <button class="ml-1 text-blue-600 text-xs"
            onclick="
              const el=document.getElementById('${id}');
              el.classList.toggle('hidden');
              this.innerText = el.classList.contains('hidden') ? '展開' : '收合';
            ">
      展開
    </button>
  `;
}

function filterInventoryHistory(type) {
  document.querySelectorAll("#fd-inv-history tbody tr").forEach(tr => {
    if (type === "all") {
      tr.classList.remove("hidden");
      return;
    }
    tr.classList.toggle("hidden", tr.dataset.type !== type);
  });
}

/* ============================================================
 * Fixture Detail Drawer - Tab Switch
 * ============================================================ */

function switchFixtureDetailTab(tab) {
  // 切換 tab 樣式
  document.querySelectorAll(".fd-tab").forEach(btn => {
    btn.classList.toggle("fd-tab-active", btn.dataset.tab === tab);
  });

  // 切換內容區
  ["inventory", "usage", "replacement", "basic"].forEach(name => {
    const el = document.getElementById(`fd-tab-${name}`);
    if (!el) return;
    el.classList.toggle("hidden", name !== tab);
  });
}

// 掛到 window，確保 inline onclick 找得到
window.switchFixtureDetailTab = switchFixtureDetailTab;
