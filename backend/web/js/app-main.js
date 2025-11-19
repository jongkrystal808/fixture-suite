/**
 * 主應用程式初始化與事件處理
 * app-main.js
 */
// ============================================
// 後台管理 - 子頁切換系統
// ============================================

document.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-subtab]');
  if (!btn) return;

  // 讀取 subtab 名稱
  const subtab = btn.getAttribute('data-subtab');

  // 所有子頁 tab 按鈕取消 active
  document.querySelectorAll('#tab-admin [data-subtab]').forEach(b => {
    b.classList.remove('subtab-active');
  });

  // 點擊的 tab 標記 active
  btn.classList.add('subtab-active');

  // 隱藏所有子頁內容
  document.querySelectorAll('#tab-admin > div[id^="subtab-"]').forEach(div => {
    div.classList.add('hidden');
  });

  // 顯示對應子頁
  const target = document.getElementById(`subtab-${subtab}`);
  if (target) {
    target.classList.remove('hidden');
  }

  // 📌 額外行為：如果切到治具維護 → 自動載入清單
  if (subtab === 'fixture') {
    if (typeof loadFixtureList === 'function') {
      loadFixtureList();
    }
  }
    if (subtab === 'model') {
    loadModelList();
    }

  // 📌 切到機種維護時如需載入清單，也可在這裡補充
    if (subtab === 'model') {
        if (typeof initModelTab === 'function')
            initModelTab();
  }

});


// ============================================
// 時鐘
// ============================================

/**
 * 啟動時鐘
 */
function startClock() {
  function updateClock() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    
    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = timeStr;
  }
  
  updateClock();
  setInterval(updateClock, 1000);
}

// ============================================
// 分頁切換
// ============================================

/**
 * 初始化分頁系統
 */
function initTabs() {
  const tabs = document.querySelectorAll('button[data-tab]');
  const sections = document.querySelectorAll('[id^="tab-"]');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      // 更新按鈕樣式
      tabs.forEach(t => t.classList.remove('tab-active'));
      tab.classList.add('tab-active');
      
      // 顯示對應內容
      sections.forEach(s => {
        if (s.id === `tab-${target}`) {
          s.style.display = 'block';
        } else {
          s.style.display = 'none';
        }
      });
      
      // 更新標題
      const titleEl = document.getElementById('activeTabTitle');
      if (titleEl) titleEl.textContent = tab.textContent;
      
      // 載入對應資料
      loadTabData(target);
    });
  });
}

/**
 * 載入分頁資料
 * @param {string} tab - 分頁名稱
 */
async function loadTabData(tab) {
  try {
    switch (tab) {
      case 'dashboard':
        await loadDashboard();
        break;
      case 'receive':
        await loadReceipts();
        break;
      case 'return':
        await loadReturns();
        break;
      case 'query':
        await loadFixtures();
        break;
      case 'stats':
        renderStats();
        break;
      case 'logs':
        await loadLogs();
        break;
      case 'admin':
        await adminLoadUsers();
        break;
    }
  } catch (error) {
    console.error(`載入 ${tab} 資料失敗:`, error);
  }
}

// ============================================
// 資料載入
// ============================================

/**
 * 載入儀表板
 */
async function loadDashboard() {
  try {
    const summary = await apiGetSummary();
    
    // 更新統計數字
    if (document.getElementById('todayIn')) {
      document.getElementById('todayIn').textContent = summary.recent_receipts?.length || 0;
    }
    if (document.getElementById('todayOut')) {
      document.getElementById('todayOut').textContent = summary.recent_returns?.length || 0;
    }
    
    // 更新收料清單
    const inList = document.getElementById('todayInList');
    if (inList) {
      inList.innerHTML = (summary.recent_receipts || []).slice(0, 5).map(r =>
        `<div class="text-xs text-gray-600">${r.fixture_code || '未知'}</div>`
      ).join('');
    }
    
    // 更新退料清單
    const outList = document.getElementById('todayOutList');
    if (outList) {
      outList.innerHTML = (summary.recent_returns || []).slice(0, 5).map(r =>
        `<div class="text-xs text-gray-600">${r.fixture_code || '未知'}</div>`
      ).join('');
    }
    
    // 渲染即將更換
    renderUpcoming();
    
  } catch (error) {
    console.error('載入儀表板失敗:', error);
  }
}

/**
 * 載入治具列表
 */
async function loadFixtures() {
  try {
    window.mockFixtures = await apiListFixtures();
    renderQuery(window.mockFixtures);
  } catch (error) {
    console.error('載入治具失敗:', error);
    toast('載入治具失敗', 'error');
  }
}

/**
 * 載入收料記錄
 */
async function loadReceipts() {
  try {
    const res = await apiListReceipts();
    // 如果 API 回傳是物件，取出 data 陣列
    window.mockReceipts = Array.isArray(res) ? res : (res.data || res.results || []);
    renderReceipts();
  } catch (error) {
    console.error('載入收料記錄失敗:', error);
    window.mockReceipts = [];
  }
}


/**
 * 載入退料記錄
 */
async function loadReturns() {
  try {
    const res = await apiListReturns();
    window.mockReturns = Array.isArray(res) ? res : (res.data || res.results || []);
    renderReturns();
  } catch (error) {
    console.error('載入退料記錄失敗:', error);
    window.mockReturns = [];
  }
}


/**
 * 載入使用記錄
 */
async function loadLogs() {
  try {
    window.mockLogs = await apiListLogs();
    renderLogs(window.mockLogs);
  } catch (error) {
    console.error('載入記錄失敗:', error);
  }
}

// ============================================
// 後台管理 - 治具資料維護
// ============================================

let fxPage = 1;
let fxPageSize = 8;
let fxTotal = 0;
let fxTotalPages = 1;
let fxCurrentFixtures = [];
let fixtureModalMode = 'create'; // 'create' or 'edit'
let fixtureEditingId = null;

/**
 * 載入治具列表
 */
async function loadFixtureList() {
  try {
    const search = document.getElementById('fxSearch')?.value?.trim() || '';
    const statusFilter = document.getElementById('fxStatusFilter')?.value || '';
    const ownerFilterRaw = document.getElementById('fxOwnerFilter')?.value?.trim() || '';
    const ownerId = ownerFilterRaw ? Number(ownerFilterRaw) : '';
    const pageSizeSelect = document.getElementById('fxPageSize');
    fxPageSize = pageSizeSelect ? Number(pageSizeSelect.value) : 8;

    const res = await apiListFixtures({
      page: fxPage,
      pageSize: fxPageSize,
      statusFilter,
      ownerId,
      search
    });

    fxTotal = res.total || 0;
    fxCurrentFixtures = res.fixtures || [];
    fxTotalPages = fxTotal === 0 ? 1 : Math.max(1, Math.ceil(fxTotal / fxPageSize));

    renderFixtureTable();
  } catch (err) {
    console.error('loadFixtureList error', err);
    toast('載入治具列表失敗');
  }
}

/**
 * 渲染治具列表表格
 */
function renderFixtureTable() {
  const tbody = document.getElementById('fxTable');
  const countSpan = document.getElementById('fxCount');
  const pageNowSpan = document.getElementById('fxPageNow');
  const pageMaxSpan = document.getElementById('fxPageMax');

  if (!tbody) return;
  tbody.innerHTML = '';

  if (countSpan) countSpan.textContent = String(fxTotal);
  if (pageNowSpan) pageNowSpan.textContent = String(fxPage);
  if (pageMaxSpan) pageMaxSpan.textContent = String(fxTotalPages);

  if (!fxCurrentFixtures.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 10;
    td.className = 'py-3 text-center text-gray-400';
    td.textContent = '目前沒有資料';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  fxCurrentFixtures.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-b-0';

    const totalQty = (row.total_qty != null)
      ? row.total_qty
      : (row.self_purchased_qty || 0) + (row.customer_supplied_qty || 0);

    const cycleText = row.replacement_cycle != null
      ? `${row.replacement_cycle} ${row.cycle_unit || ''}`
      : '';

    const ownerText = row.owner_name || (row.owner_id != null ? `#${row.owner_id}` : '');

    tr.innerHTML = `
      <td class="py-1.5 pr-4 whitespace-nowrap font-mono">${row.fixture_id || ''}</td>
      <td class="py-1.5 pr-4">${row.fixture_name || ''}</td>
      <td class="py-1.5 pr-4">${row.fixture_type || ''}</td>
      <td class="py-1.5 pr-4 whitespace-nowrap">
        ${(row.self_purchased_qty ?? 0)} / ${(row.customer_supplied_qty ?? 0)} / <span class="font-semibold">${totalQty}</span>
      </td>
      <td class="py-1.5 pr-4">${row.storage_location || ''}</td>
      <td class="py-1.5 pr-4">${row.status || ''}</td>
      <td class="py-1.5 pr-4 whitespace-nowrap">${cycleText}</td>
      <td class="py-1.5 pr-4">${ownerText || ''}</td>
      <td class="py-1.5 pr-4 max-w-xs truncate" title="${row.note || ''}">${row.note || ''}</td>
      <td class="py-1.5 pr-4 whitespace-nowrap">
        <button class="btn btn-ghost btn-xs" onclick="openFixtureModal('edit', '${row.fixture_id}')">編輯</button>
        <button class="btn btn-ghost btn-xs text-red-600" onclick="confirmDeleteFixture('${row.fixture_id}')">刪除</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/**
 * 分頁操作
 */
function goFixturePage(action) {
  if (fxTotalPages <= 1) return;

  if (action === 'first') fxPage = 1;
  else if (action === 'prev') fxPage = Math.max(1, fxPage - 1);
  else if (action === 'next') fxPage = Math.min(fxTotalPages, fxPage + 1);
  else if (action === 'last') fxPage = fxTotalPages;

  loadFixtureList();
}

/**
 * 開啟新增/編輯治具 modal
 * @param {'create'|'edit'} mode
 * @param {string} [fixtureId]
 */
async function openFixtureModal(mode, fixtureId) {
  fixtureModalMode = mode;
  fixtureEditingId = mode === 'edit' ? fixtureId : null;

  const modal = document.getElementById('fixtureModal');
  const titleEl = document.getElementById('fixtureModalTitle');
  const idInput = document.getElementById('fmFixtureId');

  // 先清空表單
  document.getElementById('fixtureForm').reset();

  if (mode === 'create') {
    if (titleEl) titleEl.textContent = '新增治具';
    if (idInput) {
      idInput.disabled = false;
      idInput.value = '';
    }
  } else {
    if (titleEl) titleEl.textContent = `編輯治具 - ${fixtureId}`;
    if (idInput) {
      idInput.disabled = true;
      idInput.value = fixtureId || '';
    }

    try {
      const data = await apiGetFixture(fixtureId);
      // 填入欄位
      document.getElementById('fmFixtureName').value = data.fixture_name || '';
      document.getElementById('fmFixtureType').value = data.fixture_type || '';
      document.getElementById('fmSerialNumber').value = data.serial_number || '';
      document.getElementById('fmSelfQty').value = data.self_purchased_qty ?? 0;
      document.getElementById('fmCustomerQty').value = data.customer_supplied_qty ?? 0;
      document.getElementById('fmStorage').value = data.storage_location || '';
      document.getElementById('fmCycle').value = data.replacement_cycle ?? '';
      document.getElementById('fmCycleUnit').value = data.cycle_unit || 'uses';
      document.getElementById('fmStatus').value = data.status || '正常';
      document.getElementById('fmOwnerId').value = data.owner_id ?? '';
      document.getElementById('fmNote').value = data.note || '';
    } catch (err) {
      console.error('openFixtureModal(load) error', err);
      toast('載入治具資料失敗');
      return;
    }
  }

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

/**
 * 關閉 modal
 */
function closeFixtureModal() {
  const modal = document.getElementById('fixtureModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

/**
 * 提交新增/編輯
 */
async function submitFixtureForm(e) {
  e.preventDefault();

  const fixtureId = document.getElementById('fmFixtureId').value.trim();
  const fixtureName = document.getElementById('fmFixtureName').value.trim();
  const fixtureType = document.getElementById('fmFixtureType').value.trim();
  const serialNumber = document.getElementById('fmSerialNumber').value.trim();
  const selfQty = Number(document.getElementById('fmSelfQty').value || '0');
  const custQty = Number(document.getElementById('fmCustomerQty').value || '0');
  const storage = document.getElementById('fmStorage').value.trim();
  const cycleValRaw = document.getElementById('fmCycle').value;
  const cycleVal = cycleValRaw === '' ? null : Number(cycleValRaw);
  const cycleUnit = document.getElementById('fmCycleUnit').value;
  const status = document.getElementById('fmStatus').value;
  const ownerIdRaw = document.getElementById('fmOwnerId').value;
  const ownerId = ownerIdRaw === '' ? null : Number(ownerIdRaw);
  const note = document.getElementById('fmNote').value.trim() || null;

  if (fixtureModalMode === 'create' && !fixtureId) {
    toast('請輸入治具編號');
    return;
  }
  if (!fixtureName) {
    toast('請輸入治具名稱');
    return;
  }

  const payloadBase = {
    fixture_name: fixtureName,
    fixture_type: fixtureType || null,
    serial_number: serialNumber || null,
    self_purchased_qty: selfQty,
    customer_supplied_qty: custQty,
    storage_location: storage || null,
    replacement_cycle: cycleVal,
    cycle_unit: cycleUnit,
    status,
    owner_id: ownerId,
    note
  };

  try {
    if (fixtureModalMode === 'create') {
      const payload = {
        fixture_id: fixtureId,
        ...payloadBase
      };
      await apiCreateFixture(payload);
      toast('已新增治具');
    } else {
      // 更新時不傳 fixture_id（在 URL）
      await apiUpdateFixture(fixtureEditingId, payloadBase);
      toast('已更新治具');
    }

    closeFixtureModal();
    loadFixtureList();
  } catch (err) {
    console.error('submitFixtureForm error', err);
    toast('儲存治具失敗');
  }
}

/**
 * 刪除治具（確認）
 */
function confirmDeleteFixture(fixtureId) {
  if (!confirm(`確定要刪除治具 ${fixtureId} 嗎？此動作會刪除相關部署/需求/紀錄。`)) return;

  apiDeleteFixture(fixtureId)
    .then(() => {
      toast('已刪除治具');
      loadFixtureList();
    })
    .catch(err => {
      console.error('deleteFixture error', err);
      toast('刪除治具失敗');
    });
}

/**
 * 匯出目前查詢結果為 CSV
 * 需要你原本已有的 downloadCSV / toCSV 工具
 */
function exportFixturesCsv() {
  if (!fxCurrentFixtures || !fxCurrentFixtures.length) {
    toast('目前沒有資料可匯出');
    return;
  }

  const rows = fxCurrentFixtures.map(row => ({
    fixture_id: row.fixture_id,
    fixture_name: row.fixture_name,
    fixture_type: row.fixture_type,
    serial_number: row.serial_number,
    self_purchased_qty: row.self_purchased_qty,
    customer_supplied_qty: row.customer_supplied_qty,
    total_qty:
      row.total_qty != null
        ? row.total_qty
        : (row.self_purchased_qty || 0) + (row.customer_supplied_qty || 0),
    storage_location: row.storage_location,
    replacement_cycle: row.replacement_cycle,
    cycle_unit: row.cycle_unit,
    status: row.status,
    owner_id: row.owner_id,
    owner_name: row.owner_name,
    owner_email: row.owner_email,
    note: row.note
  }));

  downloadCSV('fixtures_export.csv', toCSV(rows));
}

/**
 * 初次載入：如果頁面上有 subtab-fixture，就先載入一次
 */
document.addEventListener('DOMContentLoaded', () => {
  const fixtureTab = document.getElementById('subtab-fixture');
  if (fixtureTab) {
    // 可視需要改成在切換子頁時再呼叫
    loadFixtureList();
  }
});


/**
 * 刷新所有資料
 */
async function refreshAll() {
  try {
    await Promise.all([
      loadFixtures(),
      loadReceipts(),
      loadReturns(),
      loadLogs()
    ]);
    
    // 儲存狀態
    saveState();
    
    toast('資料已更新', 'success');
  } catch (error) {
    console.error('刷新資料失敗:', error);
    toast('刷新資料失敗', 'error');
  }
}

// ============================================
// 機種資料維護（三段式）
// Models + Stations + Fixture Requirements
// ============================================

let mmModels = [];
let mmCurrentModelId = null;

let msBoundStations = [];
let msAvailableStations = [];
let msCurrentStationId = null;

let frRequirements = [];
let frFixtureOptionsLoaded = false;

let stMasterList = [];
let stEditingId = null;

let mmTabInitialized = false;

// ---------- 初始化：切到「機種資料維護」時呼叫 ----------
function initModelTab() {
  if (mmTabInitialized) {
    mmLoadModelList();
    return;
  }
  mmTabInitialized = true;
  mmLoadModelList();
  stLoadStationMasterList();
  frInitFixtureOptions();
}

// 你在 subtab 點擊 handler 裡，可以加：
// if (subtab === 'model' && typeof initModelTab === 'function') initModelTab();

window.initModelTab = initModelTab;

// ---------- 機種：列表 / 新增 / 編輯 / 刪除 ----------

async function mmLoadModelList() {
  try {
    const q = (document.getElementById('mmSearch')?.value || '').trim();
    const data = await apiListModels(q);
    mmModels = data || [];
    mmRenderModelTable();
  } catch (err) {
    console.error('mmLoadModelList error', err);
    toast('載入機種清單失敗');
  }
}

function mmRenderModelTable() {
  const tbody = document.getElementById('mmTable');
  const countEl = document.getElementById('mmCount');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (countEl) countEl.textContent = String(mmModels.length);

  if (!mmModels.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '目前沒有機種資料';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  mmModels.forEach(m => {
    const tr = document.createElement('tr');
    const isSelected = m.model_id === mmCurrentModelId;
    tr.className = 'border-b last:border-b-0 cursor-pointer ' + (isSelected ? 'bg-blue-50' : 'hover:bg-gray-50');
    tr.onclick = () => mmSelectModel(m.model_id);

    tr.innerHTML = `
      <td class="py-1.5 px-2 font-mono text-xs whitespace-nowrap">${m.model_id}</td>
      <td class="py-1.5 px-2 text-xs">${m.model_name || ''}</td>
      <td class="py-1.5 px-2 whitespace-nowrap">
        <button class="btn btn-ghost btn-2xs" onclick="event.stopPropagation(); mmOpenModelModal('edit', '${m.model_id}')">編輯</button>
        <button class="btn btn-ghost btn-2xs text-red-600" onclick="event.stopPropagation(); mmDeleteModel('${m.model_id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function mmSelectModel(modelId) {
  mmCurrentModelId = modelId;
  msCurrentStationId = null;
  mmRenderModelTable();
  msUpdateSelectedModelLabel();
  msReloadForCurrentModel();
  frUpdateSelectionLabels();
  frClearContent();
}

async function mmDeleteModel(modelId) {
  if (!confirm(`確定要刪除機種 ${modelId} 嗎？\n(會連帶刪除站點關聯與治具需求)`)) return;
  try {
    await apiDeleteModel(modelId);
    toast('已刪除機種');
    if (mmCurrentModelId === modelId) {
      mmCurrentModelId = null;
      msBoundStations = [];
      msAvailableStations = [];
      msCurrentStationId = null;
    }
    mmLoadModelList();
    msRenderBoundStations();
    msRenderAvailableStations();
    frClearContent();
  } catch (err) {
    console.error('mmDeleteModel error', err);
    toast('刪除機種失敗');
  }
}

function mmOpenModelModal(mode, modelId) {
  const modal = document.getElementById('mmModelModal');
  const titleEl = document.getElementById('mmModelModalTitle');
  const idInput = document.getElementById('mmModelId');
  const nameInput = document.getElementById('mmModelName');
  const noteInput = document.getElementById('mmModelNote');

  if (!modal) return;

  document.getElementById('mmModelForm').reset();

  if (mode === 'create') {
    modal.dataset.mode = 'create';
    modal.dataset.modelId = '';
    if (titleEl) titleEl.textContent = '新增機種';
    if (idInput) {
      idInput.disabled = false;
      idInput.value = '';
    }
    nameInput.value = '';
    noteInput.value = '';
  } else {
    modal.dataset.mode = 'edit';
    modal.dataset.modelId = modelId;
    if (titleEl) titleEl.textContent = `編輯機種 - ${modelId}`;
    if (idInput) {
      idInput.disabled = true;
      idInput.value = modelId;
    }
    const m = mmModels.find(x => x.model_id === modelId);
    nameInput.value = m?.model_name || '';
    noteInput.value = m?.note || '';
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function mmCloseModelModal() {
  const modal = document.getElementById('mmModelModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function mmSubmitModelForm(e) {
  e.preventDefault();
  const modal = document.getElementById('mmModelModal');
  if (!modal) return;

  const mode = modal.dataset.mode || 'create';
  const idInput = document.getElementById('mmModelId');
  const nameInput = document.getElementById('mmModelName');
  const noteInput = document.getElementById('mmModelNote');

  const modelId = idInput.value.trim();
  const modelName = nameInput.value.trim();
  const note = noteInput.value.trim() || null;

  if (!modelId && mode === 'create') {
    toast('請輸入機種代碼');
    return;
  }
  if (!modelName) {
    toast('請輸入機種名稱');
    return;
  }

  try {
    if (mode === 'create') {
      await apiCreateModel({ model_id: modelId, model_name: modelName, note });
      toast('已新增機種');
      mmCurrentModelId = modelId;
    } else {
      const editId = modal.dataset.modelId;
      await apiUpdateModel(editId, { model_name: modelName, note });
      toast('已更新機種');
      mmCurrentModelId = editId;
    }
    mmCloseModelModal();
    await mmLoadModelList();
    msUpdateSelectedModelLabel();
    msReloadForCurrentModel();
  } catch (err) {
    console.error('mmSubmitModelForm error', err);
    toast('儲存機種失敗');
  }
}

function mmExportModelsCsv() {
  if (!mmModels || !mmModels.length) {
    toast('目前沒有機種資料可匯出');
    return;
  }
  const rows = mmModels.map(m => ({
    model_id: m.model_id,
    model_name: m.model_name,
    note: m.note,
    created_at: m.created_at
  }));
  downloadCSV('machine_models_export.csv', toCSV(rows));
}

// ---------- 機種 ↔ 站點 綁定 ----------

function msUpdateSelectedModelLabel() {
  const label = document.getElementById('msSelectedModelLabel');
  const noHint = document.getElementById('msNoModelHint');
  const content = document.getElementById('msContent');
  if (!label || !noHint || !content) return;

  if (!mmCurrentModelId) {
    label.textContent = '';
    noHint.classList.remove('hidden');
    content.classList.add('hidden');
  } else {
    const m = mmModels.find(x => x.model_id === mmCurrentModelId);
    label.textContent = m ? `(${m.model_id} - ${m.model_name || ''})` : `(${mmCurrentModelId})`;
    noHint.classList.add('hidden');
    content.classList.remove('hidden');
  }
}

async function msReloadForCurrentModel() {
  if (!mmCurrentModelId) {
    msBoundStations = [];
    msAvailableStations = [];
    msRenderBoundStations();
    msRenderAvailableStations();
    return;
  }
  try {
    msBoundStations = await apiListModelStations(mmCurrentModelId) || [];
    msAvailableStations = await apiListAvailableStationsForModel(mmCurrentModelId) || [];
    msRenderBoundStations();
    msRenderAvailableStations();
  } catch (err) {
    console.error('msReloadForCurrentModel error', err);
    toast('載入站點綁定資訊失敗');
  }
}

function msRenderBoundStations() {
  const tbody = document.getElementById('msBoundTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!mmCurrentModelId) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '請先選擇機種';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  if (!msBoundStations.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '尚未綁定任何站點';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  msBoundStations.forEach(s => {
    const isSelected = msCurrentStationId === s.station_id;
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-b-0 cursor-pointer ' + (isSelected ? 'bg-blue-50' : 'hover:bg-gray-50');
    tr.onclick = () => msSelectStation(s.station_id);

    tr.innerHTML = `
      <td class="py-1 px-2 font-mono text-xs whitespace-nowrap">${s.station_code}</td>
      <td class="py-1 px-2 text-xs">${s.station_name || ''}</td>
      <td class="py-1 px-2 whitespace-nowrap">
        <button class="btn btn-ghost btn-2xs text-red-600" onclick="event.stopPropagation(); msUnbindStation(${s.station_id})">移除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function msRenderAvailableStations() {
  const tbody = document.getElementById('msAvailableTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!mmCurrentModelId) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '請先選擇機種';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  if (!msAvailableStations.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '所有站點皆已綁定，或暫無站點資料';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  msAvailableStations.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-b-0 hover:bg-gray-50';

    tr.innerHTML = `
      <td class="py-1 px-2 font-mono text-xs whitespace-nowrap">${s.station_code}</td>
      <td class="py-1 px-2 text-xs">${s.station_name || ''}</td>
      <td class="py-1 px-2 whitespace-nowrap">
        <button class="btn btn-ghost btn-2xs" onclick="msBindStation(${s.station_id})">綁定</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function msSelectStation(stationId) {
  msCurrentStationId = stationId;
  msRenderBoundStations();
  frUpdateSelectionLabels();
  frLoadRequirements();
}

async function msBindStation(stationId) {
  if (!mmCurrentModelId) {
    toast('請先選擇機種');
    return;
  }
  try {
    await apiBindStationToModel(mmCurrentModelId, stationId);
    toast('已綁定站點');
    msCurrentStationId = stationId;
    msReloadForCurrentModel();
    frUpdateSelectionLabels();
    frLoadRequirements();
  } catch (err) {
    console.error('msBindStation error', err);
    toast('綁定站點失敗');
  }
}

async function msUnbindStation(stationId) {
  if (!mmCurrentModelId) return;
  if (!confirm('確定要移除此站點綁定嗎？對應治具需求也會失效。')) return;
  try {
    await apiUnbindStationFromModel(mmCurrentModelId, stationId);
    toast('已移除綁定');
    if (msCurrentStationId === stationId) {
      msCurrentStationId = null;
      frClearContent();
      frUpdateSelectionLabels();
    }
    msReloadForCurrentModel();
  } catch (err) {
    console.error('msUnbindStation error', err);
    toast('移除站點綁定失敗');
  }
}

// ---------- 治具需求 ----------

function frUpdateSelectionLabels() {
  const mLabel = document.getElementById('frSelectedModelLabel');
  const sLabel = document.getElementById('frSelectedStationLabel');
  const hint = document.getElementById('frNoModelStationHint');
  const content = document.getElementById('frContent');

  if (!mLabel || !sLabel || !hint || !content) return;

  if (!mmCurrentModelId) {
    mLabel.textContent = '-';
    sLabel.textContent = '-';
    hint.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  const m = mmModels.find(x => x.model_id === mmCurrentModelId);
  mLabel.textContent = m ? `${m.model_id}` : mmCurrentModelId;

  if (!msCurrentStationId) {
    sLabel.textContent = '-';
    hint.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  const s = msBoundStations.find(x => x.station_id === msCurrentStationId);
  sLabel.textContent = s ? `${s.station_code}` : `ID ${msCurrentStationId}`;

  hint.classList.add('hidden');
  content.classList.remove('hidden');
}

function frClearContent() {
  const tbody = document.getElementById('frTable');
  if (tbody) tbody.innerHTML = '';
}

async function frInitFixtureOptions() {
  if (frFixtureOptionsLoaded) return;
  try {
    // 從 fixtures 簡易列表載入正常狀態的治具
    const list = await apiGetFixturesSimple('正常');
    const select = document.getElementById('frFixtureSelect');
    if (!select) return;
    select.innerHTML = '<option value="">選擇治具...</option>';
    (list || []).forEach(fx => {
      const opt = document.createElement('option');
      opt.value = fx.fixture_id;
      opt.textContent = `${fx.fixture_id} - ${fx.fixture_name || ''}`;
      select.appendChild(opt);
    });
    frFixtureOptionsLoaded = true;
  } catch (err) {
    console.error('frInitFixtureOptions error', err);
    // 不 toast，避免一進來就跳錯
  }
}

async function frLoadRequirements() {
  if (!mmCurrentModelId || !msCurrentStationId) {
    frClearContent();
    frUpdateSelectionLabels();
    return;
  }
  try {
    const res = await apiListFixtureRequirements(mmCurrentModelId, msCurrentStationId);
    frRequirements = res || [];
    frUpdateSelectionLabels();
    frRenderRequirements();
  } catch (err) {
    console.error('frLoadRequirements error', err);
    toast('載入治具需求失敗');
  }
}

function frRenderRequirements() {
  const tbody = document.getElementById('frTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!frRequirements.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '尚未設定任何治具需求';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  frRequirements.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-b-0';

    tr.innerHTML = `
      <td class="py-1 px-2 font-mono text-xs whitespace-nowrap">${r.fixture_id}</td>
      <td class="py-1 px-2 text-xs">${r.fixture_name || ''}</td>
      <td class="py-1 px-2 text-xs">${r.required_qty}</td>
      <td class="py-1 px-2 whitespace-nowrap">
        <button class="btn btn-ghost btn-2xs" onclick="frEditRequirement(${r.id}, ${r.required_qty})">修改</button>
        <button class="btn btn-ghost btn-2xs text-red-600" onclick="frDeleteRequirement(${r.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function frAddRequirement() {
  if (!mmCurrentModelId || !msCurrentStationId) {
    toast('請先選擇機種與站點');
    return;
  }
  const select = document.getElementById('frFixtureSelect');
  const qtyInput = document.getElementById('frQtyInput');
  const fixtureId = select.value;
  const qty = Number(qtyInput.value || '0');

  if (!fixtureId) {
    toast('請選擇治具');
    return;
  }
  if (!qty || qty <= 0) {
    toast('請輸入正確的需求數量');
    return;
  }

  try {
    await apiCreateFixtureRequirement(mmCurrentModelId, msCurrentStationId, {
      fixture_id: fixtureId,
      required_qty: qty
    });
    toast('已新增治具需求');
    frLoadRequirements();
  } catch (err) {
    console.error('frAddRequirement error', err);
    toast('新增治具需求失敗');
  }
}

async function frEditRequirement(reqId, oldQty) {
  const newQtyStr = prompt('請輸入新的需求數量：', String(oldQty));
  if (newQtyStr === null) return;
  const newQty = Number(newQtyStr);
  if (!newQty || newQty <= 0) {
    toast('請輸入大於 0 的數字');
    return;
  }
  try {
    await apiUpdateFixtureRequirement(reqId, { required_qty: newQty });
    toast('已更新需求數量');
    frLoadRequirements();
  } catch (err) {
    console.error('frEditRequirement error', err);
    toast('更新需求失敗');
  }
}

async function frDeleteRequirement(reqId) {
  if (!confirm('確定要刪除此治具需求嗎？')) return;
  try {
    await apiDeleteFixtureRequirement(reqId);
    toast('已刪除治具需求');
    frLoadRequirements();
  } catch (err) {
    console.error('frDeleteRequirement error', err);
    toast('刪除治具需求失敗');
  }
}

// ---------- 站點 Master Modal (CRUD) ----------

function stOpenStationMasterModal() {
  const modal = document.getElementById('stStationModal');
  if (!modal) return;
  stResetForm();
  stLoadStationMasterList();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function stCloseStationMasterModal() {
  const modal = document.getElementById('stStationModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function stResetForm() {
  stEditingId = null;
  document.getElementById('stCode').value = '';
  document.getElementById('stName').value = '';
  document.getElementById('stNote').value = '';
  const modeLabel = document.getElementById('stModeLabel');
  if (modeLabel) modeLabel.textContent = '新增';
}

async function stLoadStationMasterList() {
  try {
    const data = await apiListStations('');
    stMasterList = data || [];
    stRenderStationMasterTable();
  } catch (err) {
    console.error('stLoadStationMasterList error', err);
    toast('載入站點列表失敗');
  }
}

function stRenderStationMasterTable() {
  const tbody = document.getElementById('stTable');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!stMasterList.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5;
    td.className = 'py-2 text-center text-gray-400';
    td.textContent = '尚無站點資料';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  stMasterList.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = 'border-b last:border-b-0';

    tr.innerHTML = `
      <td class="py-1 px-2 text-xs">${s.station_id}</td>
      <td class="py-1 px-2 font-mono text-xs">${s.station_code}</td>
      <td class="py-1 px-2 text-xs">${s.station_name || ''}</td>
      <td class="py-1 px-2 text-xs">${s.note || ''}</td>
      <td class="py-1 px-2 whitespace-nowrap">
        <button class="btn btn-ghost btn-2xs" onclick="stEditStation(${s.station_id})">編輯</button>
        <button class="btn btn-ghost btn-2xs text-red-600" onclick="stDeleteStation(${s.station_id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function stEditStation(stationId) {
  const s = stMasterList.find(x => x.station_id === stationId);
  if (!s) return;
  stEditingId = stationId;
  document.getElementById('stCode').value = s.station_code || '';
  document.getElementById('stName').value = s.station_name || '';
  document.getElementById('stNote').value = s.note || '';
  const modeLabel = document.getElementById('stModeLabel');
  if (modeLabel) modeLabel.textContent = `編輯 #${stationId}`;
}

async function stSubmitForm() {
  const code = document.getElementById('stCode').value.trim();
  const name = document.getElementById('stName').value.trim();
  const note = document.getElementById('stNote').value.trim() || null;

  if (!code) {
    toast('請輸入站點代碼');
    return;
  }

  try {
    if (!stEditingId) {
      await apiCreateStation({ station_code: code, station_name: name, note });
      toast('已新增站點');
    } else {
      await apiUpdateStation(stEditingId, { station_code: code, station_name: name, note });
      toast('已更新站點');
    }
    stResetForm();
    stLoadStationMasterList();
    if (mmCurrentModelId) msReloadForCurrentModel();
  } catch (err) {
    console.error('stSubmitForm error', err);
    toast('儲存站點失敗');
  }
}

async function stDeleteStation(stationId) {
  if (!confirm(`確定要刪除站點 #${stationId} 嗎？`)) return;
  try {
    await apiDeleteStation(stationId);
    toast('已刪除站點');
    if (stEditingId === stationId) stResetForm();
    stLoadStationMasterList();
    if (mmCurrentModelId) msReloadForCurrentModel();
  } catch (err) {
    console.error('stDeleteStation error', err);
    toast('刪除站點失敗');
  }
}


// ============================================
// 事件處理
// ============================================

/**
 * 篩選儀表板
 */
function filterDashboard() {
  const query = document.getElementById('searchDash')?.value || '';
  const filtered = searchFixtures(window.mockFixtures, query);
  renderDash(filtered);
}

/**
 * 查看治具詳情
 * @param {string} id - 治具 ID
 */
function viewFixtureDetail(id) {
  toast('查看詳情：' + id, 'info');
  // TODO: 實作詳情頁面
}

/**
 * 編輯負責人
 * @param {string} empId - 員工 ID
 */
function editOwner(empId) {
  toast('編輯負責人：' + empId, 'info');
  // TODO: 實作編輯功能
}

/**
 * 收料類型切換 (批量 / 少量)
 */
function toggleReceiptType() {
  const type = document.getElementById("rcvType")?.value;
  const batchFields = document.getElementById("batchFields");
  const individualFields = document.getElementById("individualFields");

  if (type === "batch") {
    batchFields?.classList.remove("hidden");
    individualFields?.classList.add("hidden");
  } else {
    batchFields?.classList.add("hidden");
    individualFields?.classList.remove("hidden");
  }
}

/**
 * 新增收料記錄
 */
async function addReceipt() {
  const type = document.getElementById("rcvType")?.value || "batch";
  const vendor = document.getElementById("rcvVendor")?.value.trim() || "";
  const order_no = document.getElementById("rcvOrder")?.value.trim() || "";
  const fixture_code = document.getElementById("rcvFixture")?.value.trim() || "";
  const operator = String(window.authUser?.id || window.authUser?.username || "未登入");


  let serial_start = null, serial_end = null, serials = null, note = "";

  if (type === "batch") {
    serial_start = document.getElementById("rcvSerialStart")?.value.trim() || "";
    serial_end = document.getElementById("rcvSerialEnd")?.value.trim() || "";
    note = document.getElementById("rcvNote")?.value.trim() || "";
  } else {
    serials = document.getElementById("rcvSerials")?.value.trim() || "";
    note = document.getElementById("rcvNoteInd")?.value.trim() || "";
  }
  console.log("📦 收料 payload =>", payload);

  const payload = {
    receipt_type: type,
    vendor,
    order_no,
    fixture_code,
    serial_start,
    serial_end,
    serials,
    operator,
    note
  };

  try {
    // 使用共用 API 函式，自動加 token
    await api('/receipts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toast("✅ 收料成功");
    await loadReceipts();
  } catch (e) {
    toast("❌ 收料失敗：" + e.message);
  }
}



/**
 * 刪除收料記錄
 * @param {number} id - 記錄 ID
 */
async function deleteReceipt(id) {
  if (!confirm('確定要刪除這筆收料記錄嗎？')) return;
  
  try {
    await apiDeleteReceipt(id);
    await loadReceipts();
    toast('已刪除', 'success');
  } catch (error) {
    toast('刪除失敗', 'error');
  }
}
/**
 * 退料類型切換 (批量 / 少量)
 */
function toggleReturnType() {
  const type = document.getElementById("retType")?.value;
  const batchFields = document.getElementById("retBatchFields");
  const individualFields = document.getElementById("retIndividualFields");

  if (type === "batch") {
    batchFields?.classList.remove("hidden");
    individualFields?.classList.add("hidden");
  } else {
    batchFields?.classList.add("hidden");
    individualFields?.classList.remove("hidden");
  }
}

/**
 * 新增退料記錄
 */
async function addReturn() {
  const type = document.getElementById("retType")?.value || "batch";
  const vendor = document.getElementById("retVendor")?.value.trim() || "";
  const order_no = document.getElementById("retOrder")?.value.trim() || "";
  const fixture_code = document.getElementById("retFixture")?.value.trim() || "";
  const operator = String(window.authUser?.id || window.authUser?.username || "未登入");

  let serial_start = null, serial_end = null, serials = null, note = "";

  if (type === "batch") {
    serial_start = document.getElementById("retSerialStart")?.value.trim() || "";
    serial_end = document.getElementById("retSerialEnd")?.value.trim() || "";
    note = document.getElementById("retNote")?.value.trim() || "";
  } else {
    serials = document.getElementById("retSerials")?.value.trim() || "";
    note = document.getElementById("retNoteInd")?.value.trim() || "";
  }

  const payload = {
    return_type: type,   // 注意：後端若仍用 ReceiptType，可改成 type
    vendor,
    order_no,
    fixture_code,
    serial_start,
    serial_end,
    serials,
    operator,
    note
  };

  try {
    await api('/returns', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    toast("✅ 退料成功");
    await loadReturns();
  } catch (e) {
    toast("❌ 退料失敗：" + e.message);
  }
}

/**
 * 刪除退料記錄
 * @param {number} id - 記錄 ID
 */
async function deleteReturn(id) {
  if (!confirm('確定要刪除這筆退料記錄嗎？')) return;
  
  try {
    await apiDeleteReturn(id);
    await loadReturns();
    toast('已刪除', 'success');
  } catch (error) {
    toast('刪除失敗', 'error');
  }
}


/** 查詢類型切換 (治具 / 機種) */
function switchQueryType() {
  const type = document.getElementById("queryType").value;
  document.getElementById("fixtureQueryArea").classList.toggle("hidden", type !== "fixture");
  document.getElementById("modelQueryArea").classList.toggle("hidden", type !== "model");

  // 清空下方結果區
  document.getElementById("maxStationArea").classList.add("hidden");
  document.getElementById("stationDetailArea").classList.add("hidden");
}

/** 載入治具查詢 */
async function loadFixturesQuery() {
  const search = document.getElementById("fixtureSearch")?.value || "";
  const status = document.getElementById("fixtureStatus")?.value || "";
  try {
    const res = await api(`/fixtures?search=${encodeURIComponent(search)}${status ? `&status_filter=${encodeURIComponent(status)}` : ""}`);
    const fixtures = res.fixtures || [];
    const tbody = document.getElementById("fixtureTable");
    tbody.innerHTML = fixtures.map(f => `
      <tr>
        <td class="py-2 pr-4">${f.fixture_id}</td>
        <td class="py-2 pr-4">${f.fixture_name}</td>
        <td class="py-2 pr-4">${f.customer || ''}</td> 
        <td class="py-2 pr-4">${f.fixture_type || ''}</td>
        <td class="py-2 pr-4">${f.self_purchased_qty}/${f.customer_supplied_qty}/${f.total_qty}</td>
        <td class="py-2 pr-4">${f.status}</td>
        <td class="py-2 pr-4">${f.storage_location || ''}</td>
        <td class="py-2 pr-4">${f.owner_name || ''}</td>
        <td class="py-2 pr-4">${f.note || ''}</td>
      </tr>
    `).join("");
  } catch (e) {
    toast("治具查詢失敗：" + e.message);
  }
}


/** 載入機種查詢 */
async function loadModelsQuery() {
  const search = document.getElementById("modelSearch").value.trim();
  try {
    // ✅ 修正：改用 /models
    const res = await api(`/models?search=${encodeURIComponent(search)}`);
    const table = document.getElementById("modelTable");
    table.innerHTML = "";

    if (!res || res.length === 0) {
      table.innerHTML = `<tr><td colspan="4" class="text-gray-400 py-3">查無資料</td></tr>`;
      document.getElementById("maxStationArea").classList.add("hidden");
      document.getElementById("stationDetailArea").classList.add("hidden");
      return;
    }

    // 生成機種表
    for (const m of res) {
      table.innerHTML += `
        <tr>
          <td>${m.model_code}</td>
          <td>${f.customer || ''}</td>
          <td>${m.model_name}</td>
          <td>${m.note || ""}</td>
          <td>
            <button class="btn btn-ghost text-xs" 
              onclick="showMaxStation('${m.model_id}', '${m.model_code}', '${f.customer || ''}')">
              查看最大開站
            </button>
          </td>
        </tr>`;
    }

  } catch (err) {
    console.error("❌ 查詢機種錯誤:", err);
    toast("查詢機種失敗：" + err.message);
  }
}


/** 顯示機種最大開站數（使用 modelId 以避免 undefined 錯誤） */
async function showMaxStation(modelId, modelCode) {
  try {
    const res = await api(`/models/${modelId}/max-stations`);
    const list = res.stations || res || [];
    const table = document.getElementById("maxStationTable");
    table.innerHTML = "";

    if (!list.length) {
      table.innerHTML = `<tr><td colspan="5" class="text-gray-400 py-3">無站點資料</td></tr>`;
      return;
    }

    document.getElementById("maxStationArea").classList.remove("hidden");
    document.getElementById("stationDetailArea").classList.add("hidden");

    table.innerHTML = list.map(s => `
      <tr>
        <td>${s.station_code}</td>
        <td>${s.station_name}</td>
        <td>${s.max_open || s.max_stations || "-"}</td>
        <td>${s.bottleneck_fixture || "-"}</td>
        <td>
          ${s.available || 0}/${s.required || 0}
          <button class="btn btn-ghost text-xs ml-2"
            onclick="viewStationRequirements('${modelId}', '${s.station_id}', '${s.station_code}', '${s.station_name}')">
            明細
          </button>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("❌ 載入最大開站數失敗:", err);
    toast("載入最大開站數失敗：" + err.message);
  }
}

/** 查看站點治具需求詳情（由 onclick 傳入 modelId，不從外層取） */
async function viewStationRequirements(modelId, stationId, stationCode, stationName) {
  try {
    const res = await api(`/models/${modelId}/stations/${stationId}/requirements`);
    const list = res.fixture_requirements || [];
    const detailTitle = `${stationCode} - ${stationName}（最大開站數：${res.max_stations || ''}）`;

    document.getElementById("stationDetailArea").classList.remove("hidden");
    document.getElementById("stationDetailTitle").textContent = detailTitle;

    const tbody = document.getElementById("stationDetailTable");
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="py-2 text-center text-gray-400">無治具需求資料</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(f => `
      <tr>
        <td class="py-2 pr-4">${f.fixture_id}</td>
        <td class="py-2 pr-4">${f.fixture_name}</td>
        <td class="py-2 pr-4">${f.required_qty}</td>
        <td class="py-2 pr-4">${f.available_qty}</td>
        <td class="py-2 pr-4">${f.max_stations}</td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("❌ 查詢治具需求失敗:", e);
    toast("查詢治具需求失敗：" + e.message);
  }
}


/** 根據登入者角色顯示或隱藏後台分頁 */
function updateAdminTabVisibility(userRole) {
  const adminTab = document.querySelector('button[data-tab="admin"]');
  if (!adminTab) return;

  if (userRole === "admin") {
    adminTab.classList.remove("hidden");
  } else {
    adminTab.classList.add("hidden");
  }
}

// ============================================
// 應用程式初始化
// ============================================

/**
 * 初始化應用程式
 */
async function initApp() {
  console.log('治具管理系統初始化中...');
  
  // 載入狀態
  loadState();
  
  // 啟動時鐘
  startClock();
  
  // 初始化分頁
  initTabs();
  
  // 初始化後台管理
  if (typeof initAdmin === 'function') {
    initAdmin();
  }
  
  // 檢查登入狀態
  const isLoggedIn = await checkAuthStatus();
  if (isLoggedIn) {
    console.log('使用者已登入:', window.authUser);
  }

    // ✅ 根據角色顯示/隱藏後台按鈕
  updateAdminTabVisibility(window.authUser?.role);

  // 載入初始資料
  await loadDashboard();
  
  console.log('初始化完成！');
}

// ============================================
// DOMContentLoaded 事件
// ============================================
updateAdminTabVisibility(JSON.parse(localStorage.getItem("current_user") || "{}").role);

document.addEventListener('DOMContentLoaded', initApp);

// 頁面卸載前儲存狀態
window.addEventListener('beforeunload', () => {
  saveState();
});

// 匯出函數
window.initApp = initApp;
window.startClock = startClock;
window.initTabs = initTabs;
window.loadTabData = loadTabData;
window.loadDashboard = loadDashboard;
window.loadFixtures = loadFixtures;
window.loadReceipts = loadReceipts;
window.loadReturns = loadReturns;
window.loadLogs = loadLogs;
window.refreshAll = refreshAll;
window.filterDashboard = filterDashboard;
window.viewFixtureDetail = viewFixtureDetail;
window.editOwner = editOwner;
window.deleteReceipt = deleteReceipt;
window.deleteReturn = deleteReturn;
window.addReceipt = addReceipt;
window.toggleReceiptType = toggleReceiptType;
window.addReturn = addReturn;
window.toggleReturnType = toggleReturnType;
window.switchQueryType = switchQueryType;
window.loadFixturesQuery = loadFixturesQuery;
window.loadModelsQuery = loadModelsQuery;
window.viewMaxStations = viewMaxStations;
window.viewStationRequirements = viewStationRequirements;
