/* ============================================================
 * app-query.js  (v4.0)
 *
 * ✔ 完全對應 index.html 的查詢頁
 * ✔ 治具查詢 fixtureQueryArea（含分頁）
 * ✔ 機種查詢 modelQueryArea（含分頁）
 * ✔ Fixture Detail Drawer / Model Detail Drawer
 * ✔ 使用 current_customer_id（由 api-config 自動帶 customer_id）
 * ✔ Model Detail 走 /model-detail/{model_id}/detail (v4.0)
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
  const maxButtons = 11; // 顯示最多 11 個按鈕（含 ...）

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

  // 上一頁
  addBtn("‹", page - 1, false, page === 1);

  // 顯示範圍
  let start = Math.max(1, page - 4);
  let end = Math.min(totalPages, page + 4);

  if (page <= 5) {
    end = Math.min(10, totalPages);
  }

  if (page >= totalPages - 4) {
    start = Math.max(1, totalPages - 9);
  }

  // 第一頁
  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null, false, true);
  }

  // 中間頁
  for (let p = start; p <= end; p++) {
    addBtn(String(p), p, p === page);
  }

  // 最後一頁
  if (end < totalPages) {
    if (end < totalPages - 1) addBtn("...", null, false, true);
    addBtn(String(totalPages), totalPages);
  }

  // 下一頁
  addBtn("›", page + 1, false, page === totalPages);
}


/* ============================================================
 * 🔵 治具查詢 Fixtures
 * ============================================================ */

let fixtureQueryPage = 1;
const fixtureQueryPageSize = 50;

/* 🔥 debounce 避免輸入時狂打 API */
let fixturesQueryTimer = null;
function debounceLoadFixtures() {
  clearTimeout(fixturesQueryTimer);
  fixturesQueryTimer = setTimeout(loadFixturesQuery, 250);
}

async function loadFixturesQuery() {
  const searchEl = document.getElementById("fixtureSearch");
  const statusEl = document.getElementById("fixtureStatus");
  const tbody = document.getElementById("fixtureTable");

  if (!searchEl || !statusEl || !tbody) {
    console.warn("Query UI not ready");
    return;
  }

  const keyword = searchEl.value.trim();
  const status = statusEl.value;

  const params = {
    skip: (fixtureQueryPage - 1) * fixtureQueryPageSize,
    limit: fixtureQueryPageSize
  };

  if (keyword) params.search = keyword;
  if (status && status !== "全部") params.status_filter = status;

  try {
    // 後端回傳：{ fixtures: [...], total: 123 }
    const data = await apiListFixtures(params);
    renderFixturesTable(data.fixtures || []);

    renderPagination(
      "fixtureQueryPagination",
      data.total || 0,
      fixtureQueryPage,
      fixtureQueryPageSize,
      (p) => {
        fixtureQueryPage = p;
        loadFixturesQuery();
      }
    );
  } catch (err) {
    console.error("loadFixturesQuery() failed:", err);
  }
}

async function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-gray-400 py-3">
          沒有資料
        </td>
      </tr>`;
    return;
  }

  for (const f of rows) {
    const tr = document.createElement("tr");

    const purchased = f.self_purchased_qty ?? 0;
    const supplied  = f.customer_supplied_qty ?? 0;
    const available = f.available_qty ?? 0;

    tr.innerHTML = `
      <td class="py-2 px-4">
        <span class="text-indigo-600 underline cursor-pointer"
              onclick="openFixtureDetail('${f.fixture_id}')">
          ${f.fixture_id}
        </span>
      </td>

      <td class="py-2 px-4">${f.fixture_name || "-"}</td>
      <td class="py-2 px-4">${f.customer_id || "-"}</td>
      <td class="py-2 px-4">${f.fixture_type || "-"}</td>

      <!-- ⭐ 統一庫存顯示（fixtures） -->
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


/* 讓查詢按鈕 / onload 找得到 */
window.loadFixturesQuery = loadFixturesQuery;
window.debounceLoadFixtures = debounceLoadFixtures;


/* ============================================================
 * 🟦 Fixture Detail Drawer
 * ============================================================ */

function closeFixtureDetail() {
  const drawer = document.getElementById("fixtureDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");
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
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetFixtureDetail(fixtureId); // /fixtures/{id}/detail
    const f = data.fixture;

    box.innerHTML = `
      <section class="space-y-4">

        <!-- 基本資料 -->
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

        <!-- 最近交易 -->
        <div>
          <h3 class="text-lg font-semibold">最近交易</h3>
          <div class="text-sm space-y-1 mt-1">
            <div><b>收料：</b>${formatTrans(data.last_receipt)}</div>
            <div><b>退料：</b>${formatTrans(data.last_return)}</div>
          </div>
        </div>

        <!-- 使用紀錄 -->
        <div>
          <h3 class="text-lg font-semibold">使用紀錄</h3>
          ${renderUsageLogs(data.usage_logs)}
        </div>

        <!-- 更換紀錄 -->
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
 * 🟩 機種查詢 Models
 * ============================================================ */

let modelQueryPage = 1;
const modelQueryPageSize = 50;

async function loadModelsQuery() {
  const customer_id = localStorage.getItem("current_customer_id");
  if (!customer_id) return;

  const keyword =
    document.getElementById("modelSearch")?.value.trim() || "";

  const params = {
    customer_id,
    search: keyword,
    skip: (modelQueryPage - 1) * modelQueryPageSize,
    limit: modelQueryPageSize
  };

  try {
    // 後端建議回傳 {items,total} 或 {models,total}
    const data = await apiListMachineModels(params);
    const list = data.items || data.models || data || [];

    renderModelsQueryTable(list);

    renderPagination(
      "modelQueryPagination",
      data.total || list.length || 0,
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
  tbody.innerHTML = "";

  if (!list || !list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  list.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-4">${m.id}</td>
      <td class="py-2 px-4">${m.model_name || "-"}</td>
      <td class="py-2 px-4">${m.customer_id || "-"}</td>
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
 * queryType 切換
 * ============================================================ */
function switchQueryType() {
  const type = document.getElementById("queryType")?.value;
  if (!type) return;

  const fixtureArea = document.getElementById("fixtureQueryArea");
  const modelArea = document.getElementById("modelQueryArea");

  if (type === "fixture") {
    fixtureArea.classList.remove("hidden");
    modelArea.classList.add("hidden");
    modelQueryPage = 1;
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
      ${logs
        .map(
          (log) => `
        <div class="border rounded-xl p-3 text-sm bg-gray-50">
          <div><b>日期：</b>${log.used_at ?? "-"}</div>
          <div><b>站點：</b>${log.station_id ?? "-"}</div>
          <div><b>操作人員：</b>${log.operator ?? "-"}</div>
          ${log.note ? `<div><b>備註：</b>${log.note}</div>` : ""}
        </div>
      `
        )
        .join("")}
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
      ${logs
        .map(
          (log) => `
        <div class="border rounded-xl p-3 text-sm bg-gray-50">
          <div><b>日期：</b>${log.replacement_date ?? "-"}</div>
          <div><b>原因：</b>${log.reason ?? "-"}</div>
          <div><b>執行人員：</b>${log.executor ?? "-"}</div>
          ${log.note ? `<div><b>備註：</b>${log.note}</div>` : ""}
        </div>
      `
        )
        .join("")}
    </div>
  `;
}
window.renderReplacementLogs = renderReplacementLogs;


/* ============================================================
 * 通用格式化
 * ============================================================ */
function formatTrans(t) {
  if (!t) return "-";
  return `${t.transaction_date ?? ""} / ${t.order_no ?? ""} / ${
    t.operator ?? ""
  }`;
}
window.formatTrans = formatTrans;


/* ============================================================
 * 🟦 Model Detail Drawer（v4.0 + Tabs + 站點分類）
 * ============================================================ */

function closeModelDetail() {
  const drawer = document.getElementById("modelDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");
}
window.closeModelDetail = closeModelDetail;

async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");
  if (!drawer || !box) {
    console.error("❌ modelDetailDrawer DOM 未找到");
    return;
  }

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);

    const m = data.model;
    const stations = data.stations || [];
    const fixtures = data.requirements || [];
    const capacity = data.capacity || [];

    /* ========== ★ 整個 Drawer 內容（含 Tabs） ========== */
    box.innerHTML = `
      <section class="space-y-4">

        <!-- TAB 列 -->
        <div class="flex gap-2 border-b pb-2">
          <button class="md-tab md-tab-active" data-tab="basicTab">基本資料</button>
          <button class="md-tab" data-tab="stationsTab">綁定站點</button>
          <button class="md-tab" data-tab="requirementsTab">治具需求</button>
          <button class="md-tab" data-tab="capacityTab">最大可開站數</button>
        </div>

        <!-- TAB 1：基本資料 -->
        <div id="basicTab" class="md-tab-panel block">
          ${renderBasicSection(m)}
        </div>

        <!-- TAB 2：綁定站點 -->
        <div id="stationsTab" class="md-tab-panel hidden">
          ${renderStationsSection(stations)}
        </div>

        <!-- TAB 3：治具需求（含站點分類） -->
        <div id="requirementsTab" class="md-tab-panel hidden">
          ${renderRequirementsSection(fixtures, stations)}
        </div>

        <!-- TAB 4：最大可開站 -->
        <div id="capacityTab" class="md-tab-panel hidden">
          ${renderCapacitySection(capacity)}
        </div>

      </section>
    `;

    initModelDetailTabs();
    initRequirementFilter(fixtures);

  } catch (err) {
    console.error("openModelDetail() failed:", err);
    box.innerHTML = `<div class="text-red-500 p-4">讀取失敗：${
      err?.data?.detail || err.message || ""
    }</div>`;
  }
}

window.openModelDetail = openModelDetail;

/* ============================================================
 * 🟦 Tabs 控制
 * ============================================================ */
function initModelDetailTabs() {
  document.querySelectorAll(".md-tab").forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.tab;

      document.querySelectorAll(".md-tab").forEach(b =>
        b.classList.remove("md-tab-active")
      );
      btn.classList.add("md-tab-active");

      document
        .querySelectorAll(".md-tab-panel")
        .forEach(panel => panel.classList.add("hidden"));
      document.getElementById(target).classList.remove("hidden");
    };
  });
}

/* ============================================================
 * 🟦 渲染各區域
 * ============================================================ */

function renderBasicSection(m) {
  return `
    <h3 class="text-lg font-semibold">基本資料</h3>
    <div class="grid grid-cols-2 gap-2 text-sm mt-2">
      <div><b>機種代碼：</b>${m.id}</div>
      <div><b>名稱：</b>${m.model_name ?? "-"}</div>
      <div><b>客戶：</b>${m.customer_id ?? "-"}</div>
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
  /* 下拉選單 + 列表容器 */
  return `
    <h3 class="text-lg font-semibold mb-2">每站治具需求</h3>

    <select id="mdStationFilter" class="select select-bordered w-full mb-3">
      <option value="">全部站點</option>
      ${stations.map(s => `<option value="${s.station_id}">${s.station_id}</option>`).join("")}
    </select>

    <div id="mdReqList">
      ${fixtures.map(f => renderRequirementCard(f)).join("")}
    </div>
  `;
}

function renderRequirementCard(f) {
  return `
    <div class="border rounded-xl p-3 bg-gray-50 text-sm space-y-1 mb-2">
      <div><b>站點：</b>${f.station_id}</div>
      <div><b>治具：</b>${f.fixture_id} - ${f.fixture_name || "-"}</div>
      <div><b>需求數量：</b>${f.required_qty}</div>
      <div><b>可用數量：</b>${f.available_qty ?? 0}</div>
    </div>
  `;
}

function renderCapacitySection(capacity) {
  return `
    <h3 class="text-lg font-semibold">最大可開站數</h3>
    ${
      capacity.length
        ? capacity
            .map(
              c => `
      <div class="border rounded-xl p-3 bg-green-50 text-sm space-y-1 mb-2">
        <div><b>站點：</b>${c.station_id} ${
                c.station_name ? `- ${c.station_name}` : ""
              }</div>
        <div><b>最大可開：</b>${c.max_station} 站</div>
        <div class="text-xs text-gray-600">
          (瓶頸治具：${c.bottleneck_fixture_id}，可提供 ${c.bottleneck_qty})
        </div>
      </div>
    `
            )
            .join("")
        : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
    }
  `;
}

/* ============================================================
 * 🟦 站點分類篩選功能
 * ============================================================ */
function initRequirementFilter(fixtures) {
  const sel = document.getElementById("mdStationFilter");
  if (!sel) return;

  sel.onchange = () => {
    const val = sel.value;
    const container = document.getElementById("mdReqList");

    const filtered =
      val === "" ? fixtures : fixtures.filter(f => f.station_id === val);

    container.innerHTML = filtered.map(f => renderRequirementCard(f)).join("");
  };
}



window.openModelDetail = openModelDetail;

