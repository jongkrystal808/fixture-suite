/**
 * 本地資料存儲與狀態管理
 * storage.js
 */

// LocalStorage 鍵名
const LS_KEY = 'fixtureApp.v6.3';

// 全局狀態變數
window.authUser = null;
window.mockOwners = [];
window.mockFixtures = [];
window.mockLogs = [];
window.mockReceipts = [];
window.mockReturns = [];
window.mockModels = [];

/**
 * 儲存狀態到 localStorage
 */
function saveState() {
  try {
    const state = {
      mockOwners: window.mockOwners,
      mockFixtures: window.mockFixtures,
      mockLogs: window.mockLogs,
      mockReceipts: window.mockReceipts,
      mockReturns: window.mockReturns,
      mockModels: window.mockModels,
      authUser: window.authUser
    };
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('saveState failed', e);
  }
}

/**
 * 從 localStorage 載入狀態
 */
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    
    const state = JSON.parse(raw);
    if (state.mockOwners) window.mockOwners = state.mockOwners;
    if (state.mockFixtures) window.mockFixtures = state.mockFixtures;
    if (state.mockLogs) window.mockLogs = state.mockLogs;
    if (state.mockReceipts) window.mockReceipts = state.mockReceipts;
    if (state.mockReturns) window.mockReturns = state.mockReturns;
    if (state.mockModels) window.mockModels = state.mockModels;
    if (state.authUser) window.authUser = state.authUser;
  } catch (e) {
    console.warn('loadState failed', e);
  }
}

/**
 * 清除所有狀態
 */
function clearState() {
  try {
    localStorage.removeItem(LS_KEY);
    window.mockOwners = [];
    window.mockFixtures = [];
    window.mockLogs = [];
    window.mockReceipts = [];
    window.mockReturns = [];
    window.mockModels = [];
    window.authUser = null;
  } catch (e) {
    console.warn('clearState failed', e);
  }
}

// 安全的 saveState 包裝（容錯）
const originalSaveState = saveState;
window.saveState = function() {
  try {
    return originalSaveState.apply(this, arguments);
  } catch (e) {
    console.warn('saveState wrapper error', e);
  }
};

// 安全的 loadState 包裝（容錯）
const originalLoadState = loadState;
window.loadState = function() {
  try {
    return originalLoadState.apply(this, arguments);
  } catch (e) {
    console.warn('loadState wrapper error', e);
  }
};

// 匯出函數
window.clearState = clearState;
