/* ============================================================
 * app-query.js (v4.x PATCHED)
 *
 * ✔ 對應 index.html 查詢頁
 * ✔ fixtures / models 查詢 + 分頁
 * ✔ Detail Drawer
 * ✔ customer 由 api-config.js 注入 X-Customer-Id
 * ============================================================ */

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
  const maxButtons = 11;
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

let fixtureQueryPage = 1;
const fixtureQueryPageSize = 50;

let fixturesQueryTimer = null;
function debounceLoadFixtures() {
  clearTimeout(fixturesQueryTimer);
  fixturesQueryTimer = setTimeout(loadFixturesQuery, 250);
}

async function loadFixturesQuery() {
  // v4.x：一定要有 customer context
  if (!window.currentCustomerId) return;

  const searchEl = document.getElementById("fixtureSearch");
  const statusEl = document.getElementById("fixtureStatus");
  const tbody = document.getElementById("fixtureTable");

  if (!searchEl || !statusEl || !tbody) {
    console.warn("[query] fixture query UI not ready");
    return;
  }

  const keyword = searchEl.value.trim();
  const status = statusEl.value;

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize,
  };

  if (keyword) params.search = keyword;

  // v4.x：避免依賴「全部」字串（UI 可能改成空字串）
  if (status && status !== "全部" && status !== "all") {
    params.status_filter = status;
  }

  try {
    const data = await apiListFixtures(params);
    renderFixturesTable(data?.fixtures || []);

    renderPagination(
      "fixtureQueryPagination",
      data?.total || 0,
      fixtureQueryPage,
      fixtureQueryPageSize,
      (p) => {
        fixtureQueryPage = p;
        loadFixturesQuery();
      }
    );
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
    const available = f.available_qty ?? 0;

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

      <td class="py-2 px-4">${f.status || "-"}</td>
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
    const data = await apiGetFixtureDetail(fixtureId);
    const f = data.fixture;

    box.innerHTML = `
      <section class="space-y-4">

        <div>
          <h3 class="text-lg font-semibold">基本資料</h3>
          <div class="grid grid-cols-2 gap-2 text-sm mt-2">
            <div><b>治具編號：</b>${f.fixture_id}</div>
            <div><b>名稱：</b>${f.fixture_name ?? "-"}</div>
            <div><b>狀態：</b>${f.status ?? "-"}</div>
            <div><b>負責人：</b>${f.owner_name ?? "-"}</div>
            <div><b>儲位：</b>${f.storage_location ?? "-"}</div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold">最近交易</h3>
          <div class="text-sm space-y-1 mt-1">
            <div><b>收料：</b>${formatTrans(data.last_receipt)}</div>
            <div><b>退料：</b>${formatTrans(data.last_return)}</div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold">使用紀錄</h3>
          ${renderUsageLogs(data.usage_logs)}
        </div>

        <div>
          <h3 class="text-lg font-semibold">更換紀錄</h3>
          ${renderReplacementLogs(data.replacement_logs)}
        </div>

      </section>
    `;
  } catch (err) {
    console.error(err);
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
function renderUsageLogs(logs) {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return "<p class='text-gray-500'>無使用紀錄</p>";
  }

  return `
    <div class="space-y-3">
      ${logs.map(log => `
        <div class="border rounded-xl p-3 text-sm bg-gray-50">
          <div><b>日期：</b>${log.used_at ?? "-"}</div>
          <div><b>站點：</b>${log.station_id ?? "-"}</div>
          <div><b>操作人員：</b>${log.operator ?? "-"}</div>
          ${log.note ? `<div><b>備註：</b>${log.note}</div>` : ""}
        </div>
      `).join("")}
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
          <button class="md-tab" data-tab="stationsTab">綁定站點</button>
          <button class="md-tab" data-tab="requirementsTab">治具需求</button>
          <button class="md-tab" data-tab="capacityTab">最大可開站數</button>
        </div>

        <div id="basicTab" class="md-tab-panel block">
          ${renderBasicSection(m)}
        </div>

        <div id="stationsTab" class="md-tab-panel hidden">
          ${renderStationsSection(stations)}
        </div>

        <div id="requirementsTab" class="md-tab-panel hidden">
          ${renderRequirementsSection(fixtures, stations)}
        </div>

        <div id="capacityTab" class="md-tab-panel hidden">
          ${renderCapacitySection(capacity)}
        </div>

      </section>
    `;

    initModelDetailTabs();                 // 綁 tab
    initRequirementFilter(fixtures, stations); // 綁篩選（含 options）

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
function renderBasicSection(m) {
  return `
    <h3 class="text-lg font-semibold">基本資料</h3>
    <div class="grid grid-cols-2 gap-2 text-sm mt-2">
      <div><b>機種代碼：</b>${m.id ?? "-"}</div>
      <div><b>名稱：</b>${m.model_name ?? "-"}</div>
      <div class="col-span-2"><b>備註：</b>${m.note ?? "-"}</div>
    </div>
  `;
}

function renderStationsSection(stations) {
  return `
    <h3 class="text-lg font-semibold">綁定站點</h3>
    ${
      stations.length
        ? `<ul class="list-disc pl-6 text-sm">
             ${stations
               .map(s => `<li>${s.station_id} - ${s.station_name || ""}</li>`)
               .join("")}
           </ul>`
        : `<p class="text-gray-500 text-sm">無綁定站點</p>`
    }
  `;
}

function renderRequirementsSection(fixtures, stations) {
  return `
    <h3 class="text-lg font-semibold mb-2">每站治具需求</h3>

    <select id="mdStationFilter" class="select select-bordered w-full mb-3">
      <option value="">全部站點</option>
      ${(stations || []).map(s => `
        <option value="${s.station_id}">${s.station_id}</option>
      `).join("")}
    </select>

    <div id="mdReqList">
      ${(fixtures || []).map(f => renderRequirementCard(f)).join("")}
    </div>
  `;
}

function renderRequirementCard(f) {
  return `
    <div class="border rounded-xl p-3 bg-gray-50 text-sm space-y-1 mb-2">
      <div><b>站點：</b>${f.station_id ?? "-"}</div>
      <div><b>治具：</b>${f.fixture_id ?? "-"} - ${f.fixture_name || "-"}</div>
      <div><b>需求數量：</b>${f.required_qty ?? 0}</div>
      <div><b>可用數量：</b>${f.available_qty ?? 0}</div>
    </div>
  `;
}

function renderCapacitySection(capacity) {
  return `
    <h3 class="text-lg font-semibold">最大可開站數</h3>
    ${
      capacity.length
        ? capacity.map(c => `
          <div class="border rounded-xl p-3 bg-green-50 text-sm space-y-1 mb-2">
            <div><b>站點：</b>${c.station_id ?? "-"}${c.station_name ? ` - ${c.station_name}` : ""}</div>
            <div><b>最大可開：</b>${c.max_station ?? 0} 站</div>
            <div class="text-xs text-gray-600">
              (瓶頸治具：${c.bottleneck_fixture_id ?? "-"}，可提供 ${c.bottleneck_qty ?? 0})
            </div>
          </div>
        `).join("")
        : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
    }
  `;
}


/* ============================================================
 * 🟦 站點分類篩選功能（v4.x PATCHED）
 * - 重新綁定 onchange
 * - 避免 container / select 不存在造成報錯
 * ============================================================ */
function initRequirementFilter(fixtures, stations) {
  const sel = document.getElementById("mdStationFilter");
  const container = document.getElementById("mdReqList");
  if (!sel || !container) return;

  // 若 stations 後面可能動態更新（保險）
  if (stations && Array.isArray(stations)) {
    const current = sel.value || "";
    sel.innerHTML = `
      <option value="">全部站點</option>
      ${stations.map(s => `<option value="${s.station_id}">${s.station_id}</option>`).join("")}
    `;
    sel.value = current; // 盡量保留
  }

  sel.onchange = () => {
    const val = sel.value;
    const filtered =
      !val ? fixtures : fixtures.filter(f => f.station_id === val);

    container.innerHTML = filtered.map(f => renderRequirementCard(f)).join("");
  };
}
