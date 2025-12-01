/* ============================================================
 * app-query.js  (v3.5)
 *
 * ✔ 完全對應 index.html 的查詢頁
 * ✔ 治具查詢 fixtureQueryArea
 * ✔ 機種查詢 modelQueryArea
 * ✔ Drawer 詳細資訊
 * ✔ 無舊版 UI / qtab / stationList / fixturePagination 等不存在 DOM
 * ✔ 使用 current_customer_id
 * ============================================================ */


/* ============================================================
 * 工具：簡易分頁（目前 UI 沒有分頁欄位，所以不顯示）
 * ============================================================ */
function renderPagination() {
  /* 保留空函式避免錯誤（index.html 無對應 DOM，因此不做任何事） */
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
  if (status && status !== "全部") params.status = status;

  try {
    const data = await apiListFixtures(params);   // 回傳格式：{fixtures, total}
    renderFixturesTable(data.fixtures || []);
  } catch (err) {
    console.error("loadFixturesQuery() failed:", err);
  }
}

function renderFixturesTable(rows) {
  const tbody = document.getElementById("fixtureTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
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

      <td class="py-2 px-4">
        ${(f.self_purchased_qty ?? 0)}
        /
        ${(f.customer_supplied_qty ?? 0)}
        /
        ${(f.total_qty ?? f.available_qty ?? 0)}
      </td>

      <td class="py-2 px-4">${f.status || "-"}</td>
      <td class="py-2 px-4">${f.storage_location || "-"}</td>
      <td class="py-2 px-4">${f.owner_name || "-"}</td>
      <td class="py-2 px-4">${f.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 🟦 Fixture Detail Drawer (v3.6)
 * ============================================================ */

function closeFixtureDetail() {
  const drawer = document.getElementById("fixtureDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");
}

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
    const data = await apiGetFixtureDetail(fixtureId);
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




/* ============================================================
 * 🟩 機種查詢 Models
 * ============================================================ */

let modelQueryPage = 1;
const modelQueryPageSize = 20;

async function loadModelsQuery() {
  const customer_id = localStorage.getItem("current_customer_id");  // ← 修正
  if (!customer_id) return;

  const keyword = document.getElementById("modelSearch")?.value.trim() || "";

  try {
    const list = await apiListMachineModels({
      customer_id,
      search: keyword,
      skip: 0,
      limit: 200
    });

    renderModelsQueryTable(list || []);
  } catch (err) {
    console.error("loadModelsQuery() failed:", err);
    renderModelsQueryTable([]);
  }
}
window.loadModelsQuery = loadModelsQuery;


function renderModelsQueryTable(list) {
  const tbody = document.getElementById("modelTable");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  list.forEach(m => {
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
 * queryType 切換（只支援新版）
 * ============================================================ */
function switchQueryType() {
  const type = document.getElementById("queryType")?.value;
  if (!type) return;

  const fixtureArea = document.getElementById("fixtureQueryArea");
  const modelArea = document.getElementById("modelQueryArea");

  if (type === "fixture") {
    fixtureArea.classList.remove("hidden");
    modelArea.classList.add("hidden");
    loadFixturesQuery();
  } else {
    modelArea.classList.remove("hidden");
    fixtureArea.classList.add("hidden");
    loadModelsQuery();
  }
}
window.switchQueryType = switchQueryType;

// ==============================================================
// 🟦 Drawer：使用紀錄渲染（供 openFixtureDetail() 呼叫）
// ==============================================================
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
          ${
            log.note
              ? `<div><b>備註：</b>${log.note}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

// 讓其他 JS 也能呼叫（保險）
window.renderUsageLogs = renderUsageLogs;
// ==============================================================
// 🟧 Drawer：更換紀錄渲染（供 openFixtureDetail() 呼叫）
// ==============================================================
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
          ${
            log.note
              ? `<div><b>備註：</b>${log.note}</div>`
              : ""
          }
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/* ============================================================
 * 🟦 通用格式化
 * ============================================================ */
function formatTrans(t) {
  if (!t) return "-";
  return `${t.transaction_date ?? ""} / ${t.order_no ?? ""} / ${t.operator ?? ""}`;
}
window.formatTrans = formatTrans;

window.renderReplacementLogs = renderReplacementLogs;
window.openFixtureDetail = openFixtureDetail;
/* ============================================================
 * 🟩 Model Detail Drawer (機種查詢 詳情)
 * ============================================================ */

function closeModelDetail() {
  const drawer = document.getElementById("modelDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");
}


async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");
  if (!drawer || !box) return;

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);
    const m = data.model;
    const stations = data.stations || [];
    const fixtures = data.fixtures || [];
    const capacity = data.capacity || [];   // ★ 後端計算後回傳

    box.innerHTML = `
      <section class="space-y-6">

        <!-- 基本資料 -->
        <div>
          <h3 class="text-lg font-semibold">基本資料</h3>
          <div class="grid grid-cols-2 gap-2 text-sm mt-2">
            <div><b>機種代碼：</b>${m.id}</div>
            <div><b>名稱：</b>${m.model_name ?? "-"}</div>
            <div><b>客戶：</b>${m.customer_id ?? "-"}</div>
            <div class="col-span-2"><b>備註：</b>${m.note ?? "-"}</div>
          </div>
        </div>

        <!-- 綁定站點 -->
        <div>
          <h3 class="text-lg font-semibold">綁定站點</h3>
          ${
            stations.length
              ? `<ul class="list-disc pl-6 text-sm">
                   ${stations.map(s => `<li>${s.station_id} - ${s.station_name}</li>`).join("")}
                 </ul>`
              : `<p class="text-gray-500 text-sm">無綁定站點</p>`
          }
        </div>

        <!-- 治具需求 -->
        <div>
          <h3 class="text-lg font-semibold">每站治具需求</h3>
          ${
            fixtures.length
              ? fixtures.map(f => `
                <div class="border rounded-xl p-3 bg-gray-50 text-sm space-y-1">
                  <div><b>站點：</b>${f.station_id}</div>
                  <div><b>治具：</b>${f.fixture_id} - ${f.fixture_name}</div>
                  <div><b>需求數量：</b>${f.required_qty}</div>
                </div>
              `).join("")
              : `<p class="text-gray-500 text-sm">無治具需求</p>`
          }
        </div>

        <!-- 最大開站量 -->
        <div>
          <h3 class="text-lg font-semibold">最大可開站數</h3>
          ${
            capacity.length
              ? capacity.map(c => `
                <div class="border rounded-xl p-3 bg-green-50 text-sm space-y-1">
                  <div><b>站點：</b>${c.station_id}</div>
                  <div><b>最大可開：</b>${c.max_station} 站</div>
                  <div class="text-xs text-gray-600">
                    (瓶頸治具：${c.bottleneck_fixture_id}，可提供 ${c.bottleneck_qty})
                  </div>
                </div>
              `).join("")
              : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
          }
        </div>

      </section>
    `;
  } catch (err) {
    console.error("openModelDetail() failed:", err);
    box.innerHTML = `<div class="text-red-500 p-4">讀取失敗</div>`;
  }
}


window.openModelDetail = openModelDetail;
window.closeModelDetail = closeModelDetail;

