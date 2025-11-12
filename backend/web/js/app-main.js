/**
 * 主應用程式初始化與事件處理
 * app-main.js
 */

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
          <td>${m.model_name}</td>
          <td>${m.note || ""}</td>
          <td>
            <button class="btn btn-ghost text-xs" 
              onclick="showMaxStation('${m.model_id}', '${m.model_code}')">
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
  
  // 載入初始資料
  await loadDashboard();
  
  console.log('初始化完成！');
}

// ============================================
// DOMContentLoaded 事件
// ============================================

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
