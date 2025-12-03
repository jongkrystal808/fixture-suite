/* ============================================================
 * app-machine-models.js  (v4.5 - 語法修正版)
 * 新版三段式 UI：
 * 1) 綁定站點
 * 2) 每站治具需求 CRUD
 * 3) 最大可開站數
 *
 * 對應後端 router：/model-detail/*
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

let currentSelectedModel = null;
let currentSelectedStation = null;

/* ============================================================
 * 重新載入綁定站點 + 可綁定站點
 * ============================================================ */
async function msReloadForCurrentModel() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id || !currentSelectedModel) return;

  // 綁定站點
  const bound = await apiListModelStations(currentSelectedModel);

  // 可綁定站點
  const available = await apiListAvailableStationsForModel(currentSelectedModel);

  renderBoundStationsTable(bound);
  renderAvailableStationsTable(available);

  document.getElementById("msNoModelHint")?.classList.add("hidden");
  document.getElementById("msContent")?.classList.remove("hidden");
}

/* --------------------- 綁定站點列表 ----------------------- */
function renderBoundStationsTable(rows) {
  const tbody = document.getElementById("msBoundTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-gray-400 py-1 text-center">無資料</td></tr>`;
    return;
  }

  rows.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.station_id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right flex gap-2 justify-end">
        <button class="btn btn-xs btn-outline"
            onclick="openStationRequirements('${s.station_id}', '${s.station_name}')">
          治具需求
        </button>
        <button class="btn btn-xs btn-ghost"
            onclick="msUnbindStation('${s.station_id}')">
          移除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* --------------------- 可綁定站點 ----------------------- */
function renderAvailableStationsTable(rows) {
  const tbody = document.getElementById("msAvailableTable");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-gray-400 py-1 text-center">無可綁定站點</td></tr>`;
    return;
  }

  rows.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.station_id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right">
        <button class="btn btn-primary btn-xs"
                onclick="msBindStation('${s.station_id}')">綁定</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* --------------------- 綁定站點 ----------------------- */
async function msBindStation(stationId) {
  await apiBindStationToModel(currentSelectedModel, stationId);
  msReloadForCurrentModel();
}

/* --------------------- 解除綁定 ----------------------- */
async function msUnbindStation(stationId) {
  await apiUnbindStationFromModel(currentSelectedModel, stationId);
  msReloadForCurrentModel();
}

/* ============================================================
 * 🔥 打開「治具需求編輯」 (某站點)
 * ============================================================ */
async function openStationRequirements(stationId, stationName) {
  currentSelectedStation = stationId;

  const model_id = currentSelectedModel;

  document.getElementById("stationDetailArea").classList.remove("hidden");
  document.getElementById("stationDetailTitle").textContent = `${stationId} - ${stationName}`;

  loadStationRequirements(model_id, stationId);
}

/* ------------------------------------------------------------
 * 讀取該站點所有治具需求
 * ------------------------------------------------------------ */
async function loadStationRequirements(model_id, station_id) {
  const list = await apiListFixtureRequirements(model_id, station_id);
  renderStationRequirements(list);
}

/* ------------------------------------------------------------
 * 渲染列表
 * ------------------------------------------------------------ */
function renderStationRequirements(list) {
  const tbody = document.getElementById("stationDetailTable");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-3 text-gray-400 text-center">
        尚未設定治具需求
    </td></tr>`;
    return;
  }

  list.forEach((r) => {
    const max_station = r.required_qty > 0
      ? Math.floor((r.available_qty || 0) / r.required_qty)
      : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.fixture_id}</td>
      <td>${r.fixture_name}</td>
      <td>${r.required_qty}</td>
      <td>${r.available_qty}</td>
      <td>${max_station}</td>
      <td class="py-1 flex gap-2 justify-center">
        <button class="btn btn-xs btn-outline"
            onclick="openEditRequirementModal(${r.id}, ${r.required_qty}, '${r.note || ""}')">
          編輯
        </button>
        <button class="btn btn-xs btn-error text-white"
            onclick="deleteRequirement(${r.id})">
          刪除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 🟦 Modal：新增治具需求
 * ============================================================ */
function openAddRequirementModal() {
  document.getElementById("reqModalTitle").textContent = "新增治具需求";
  document.getElementById("reqModalRequiredQty").value = "";
  document.getElementById("reqModalFixtureId").value = "";
  document.getElementById("reqModalNote").value = "";
  document.getElementById("reqModalMode").value = "create";
  document.getElementById("requirementModal").style.display = "flex";
}

function closeRequirementModal() {
  document.getElementById("requirementModal").style.display = "none";
}

/* ============================================================
 * 🟧 Modal：編輯治具需求
 * ============================================================ */
function openEditRequirementModal(id, qty, note) {
  document.getElementById("reqModalTitle").textContent = "編輯治具需求";
  document.getElementById("reqModalMode").value = "edit";
  document.getElementById("reqModalReqId").value = id;
  document.getElementById("reqModalRequiredQty").value = qty;
  document.getElementById("reqModalNote").value = note || "";
  document.getElementById("requirementModal").style.display = "flex";
}

/* ============================================================
 * 新增 or 編輯治具需求的提交按鈕
 * ============================================================ */
async function submitRequirementModal() {
  const mode = document.getElementById("reqModalMode").value;
  const model_id = currentSelectedModel;
  const station_id = currentSelectedStation;

  const required_qty = parseInt(document.getElementById("reqModalRequiredQty").value);
  const note = document.getElementById("reqModalNote").value;

  if (mode === "create") {
    const fixture_id = document.getElementById("reqModalFixtureId").value;
    if (!fixture_id) return alert("請輸入治具編號");

    await apiCreateFixtureRequirement(model_id, station_id, {
      fixture_id,
      required_qty,
      note,
    });

  } else {
    const req_id = document.getElementById("reqModalReqId").value;

    await apiUpdateFixtureRequirement(req_id, {
      required_qty,
      note,
    });
  }

  closeRequirementModal();
  loadStationRequirements(model_id, station_id);
}

/* ============================================================
 * 刪除治具需求
 * ============================================================ */
async function deleteRequirement(req_id) {
  if (!confirm("確定要刪除這筆治具需求嗎？")) return;

  await apiDeleteFixtureRequirement(req_id);
  loadStationRequirements(currentSelectedModel, currentSelectedStation);
}


/* ============================================================
 * 🟦 Model Detail Drawer（v4.5 語法修正版）
 * ============================================================ */
async function openModelDetail(modelId) {
  currentSelectedModel = modelId;

  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);
    const m = data.model;
    const stations = data.stations;
    const requirements = data.requirements;
    const capacity = data.capacity;

    box.innerHTML = `
<section class="space-y-6">

  <!-- Tabs: 分頁選項 -->
  <div class="border-b border-gray-200">
    <ul class="flex space-x-4">
      <li>
        <button id="tab-basic" 
                class="tab-button px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent transition-colors" 
                onclick="showTab('basic')">
          基本資料
        </button>
      </li>
      <li>
        <button id="tab-stations" 
                class="tab-button px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent transition-colors" 
                onclick="showTab('stations')">
          綁定站點
        </button>
      </li>
      <li>
        <button id="tab-requirements" 
                class="tab-button px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent transition-colors" 
                onclick="showTab('requirements')">
          治具需求
        </button>
      </li>
      <li>
        <button id="tab-capacity" 
                class="tab-button px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 border-b-2 border-transparent transition-colors" 
                onclick="showTab('capacity')">
          最大開站數
        </button>
      </li>
    </ul>
  </div>

  <!-- 基本資料 -->
  <div id="basic" class="tab-content p-4">
    <div class="border p-4 rounded-xl bg-white shadow-md">
      <h3 class="text-lg font-semibold mb-3">基本資料</h3>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div><span class="font-medium text-gray-700">機種代碼：</span>${m.id}</div>
        <div><span class="font-medium text-gray-700">名稱：</span>${m.model_name}</div>
        <div><span class="font-medium text-gray-700">客戶：</span>${m.customer_id}</div>
        <div class="col-span-2"><span class="font-medium text-gray-700">備註：</span>${m.note || "-"}</div>
      </div>
    </div>
  </div>

  <!-- 綁定站點 -->
  <div id="stations" class="tab-content p-4 hidden">
    <div class="border p-4 rounded-xl bg-white shadow-md">
      <h3 class="text-lg font-semibold mb-3">綁定站點</h3>
      ${stations.length
        ? `<ul class="list-disc pl-6 text-sm space-y-1">${stations.map(
            (s) => `<li>${s.station_id} - ${s.station_name}</li>`
          ).join("")}</ul>`
        : `<p class="text-gray-500 text-sm">無綁定站點</p>`
      }
    </div>
  </div>

  <!-- 治具需求 -->
  <div id="requirements" class="tab-content p-4 hidden">
    <div class="border p-4 rounded-xl bg-white shadow-md">
      <h3 class="text-lg font-semibold mb-3">每站治具需求</h3>
      <div class="space-y-3">
      ${requirements.length
        ? requirements
            .map(
              (r) => `
          <div class="border rounded-lg p-3 bg-gray-50 text-sm space-y-1">
            <div><span class="font-medium text-gray-700">站點：</span>${r.station_id}</div>
            <div><span class="font-medium text-gray-700">治具：</span>${r.fixture_id} - ${r.fixture_name}</div>
            <div><span class="font-medium text-gray-700">需求數量：</span>${r.required_qty}</div>
            <div><span class="font-medium text-gray-700">可用數量：</span>${r.available_qty}</div>
          </div>`
            )
            .join("")
        : `<p class="text-gray-500 text-sm">無治具需求</p>`
      }
      </div>
    </div>
  </div>

  <!-- 最大開站數 -->
  <div id="capacity" class="tab-content p-4 hidden">
    <div class="border p-4 rounded-xl bg-white shadow-md">
      <h3 class="text-lg font-semibold mb-3">最大可開站數</h3>
      <div class="space-y-3">
      ${capacity.length
        ? capacity
            .map(
              (c) => `
          <div class="border rounded-lg p-3 bg-green-50 text-sm space-y-1">
            <div><span class="font-medium text-gray-700">站點：</span>${c.station_id}</div>
            <div><span class="font-medium text-green-700">最大可開：</span>${c.max_station} 站</div>
            <div class="text-xs text-gray-600 mt-1">
              (瓶頸治具：${c.bottleneck_fixture_id}，可提供 ${c.bottleneck_qty})
            </div>
          </div>`
            )
            .join("")
        : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
      }
      </div>
    </div>
  </div>

</section>
    `;

    showTab('basic');

  } catch (error) {
    console.error('載入機種詳情失敗:', error);
    box.innerHTML = `<div class="p-4 text-red-500">載入失敗：${error.message}</div>`;
  }
}

/* ============================================================
 * Tab 切換函數
 * ============================================================ */
function showTab(tabName) {
  const tabContent = document.getElementById(tabName);
  const tabButton = document.getElementById(`tab-${tabName}`);

  if (!tabContent || !tabButton) {
    console.error(`Tab or tab button with ID "${tabName}" not found.`);
    return;
  }

  // 隱藏所有 tab 內容
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.add('hidden'));

  // 移除所有按鈕的 active 樣式
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(button => {
    button.classList.remove('text-blue-600', 'border-blue-600');
    button.classList.add('text-gray-600', 'border-transparent');
  });

  // 顯示被選中的 tab 內容並高亮按鈕
  tabContent.classList.remove('hidden');
  tabButton.classList.remove('text-gray-600', 'border-transparent');
  tabButton.classList.add('text-blue-600', 'border-blue-600');
}


/* ============================================================
 * 關閉 Drawer
 * ============================================================ */
function closeModelDetail() {
  document.getElementById("modelDetailDrawer").classList.add("translate-x-full");
}

/* ============================================================
 * Export Functions
 * ============================================================ */
window.msReloadForCurrentModel = msReloadForCurrentModel;
window.msBindStation = msBindStation;
window.msUnbindStation = msUnbindStation;
window.openStationRequirements = openStationRequirements;
window.openAddRequirementModal = openAddRequirementModal;
window.openEditRequirementModal = openEditRequirementModal;
window.submitRequirementModal = submitRequirementModal;
window.deleteRequirement = deleteRequirement;
window.openModelDetail = openModelDetail;
window.closeModelDetail = closeModelDetail;
window.showTab = showTab;