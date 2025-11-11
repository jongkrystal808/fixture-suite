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
    window.mockReceipts = await apiListReceipts();
    renderReceipts();
  } catch (error) {
    console.error('載入收料記錄失敗:', error);
  }
}

/**
 * 載入退料記錄
 */
async function loadReturns() {
  try {
    window.mockReturns = await apiListReturns();
    renderReturns();
  } catch (error) {
    console.error('載入退料記錄失敗:', error);
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

window.addEventListener("hashchange", handleHashChange);
window.addEventListener("load", handleHashChange);

function handleHashChange() {
    const hash = window.location.hash || "#/dashboard";

    switch (hash) {
        case "#/dashboard":
            loadDashboard();
            break;

        case "#/fixtures":
            loadFixturesPage();
            break;

        case "#/usage":
            loadUsagePage();
            break;

        case "#/replacement":
            loadReplacementPage();
            break;

        case "#/login":
            loadLoginPage();
            break;

        default:
            loadDashboard();
            break;
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
