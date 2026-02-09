/**
 * 資料計算與統計邏輯
 * calculations.js
 */

// ============================================
// 治具相關計算
// ============================================

/**
 * 計算即將更換的治具
 * @param {Array} fixtures - 治具列表
 * @returns {Array} 即將更換的治具（使用次數 >= 週期 * 0.8）
 */
function calcUpcoming(fixtures) {
  return fixtures
    .filter(f => f.status === 'active' && f.used >= f.cycle * 0.8)
    .sort((a, b) => (b.used / b.cycle) - (a.used / a.cycle));
}

/**
 * 取得不耐用治具
 * @param {Array} fixtures - 治具列表
 * @returns {Array} 不耐用治具（報廢時使用次數 < 週期 * 0.6）
 */
function getUndurableFixtures(fixtures = window.mockFixtures) {
  return fixtures
    .filter(f => f.status === 'inactive' && f.used > 0 && f.used < f.cycle * 0.6)
    .map(f => ({
      ...f,
      achievement: Math.round((f.used / f.cycle) * 100),
      warning: f.used < f.cycle * 0.3 ? 'danger' : 'warning'
    }));
}

/**
 * 計算治具達成率
 * @param {number} used - 已使用次數
 * @param {number} cycle - 週期
 * @returns {number} 達成率（百分比）
 */
function calcAchievement(used, cycle) {
  if (!cycle || cycle === 0) return 0;
  return Math.round((used / cycle) * 100);
}

/**
 * 判斷治具狀態
 * @param {Object} fixture - 治具資料
 * @returns {string} 狀態 ('normal', 'warning', 'danger', 'expired')
 */
function getFixtureStatus(fixture) {
  if (fixture.status !== 'active') return 'inactive';
  
  const ratio = fixture.used / fixture.cycle;
  
  if (ratio >= 1) return 'expired';      // 已超過週期
  if (ratio >= 0.8) return 'danger';     // 即將到期
  if (ratio >= 0.6) return 'warning';    // 警告
  return 'normal';                        // 正常
}

// ============================================
// 統計計算
// ============================================

/**
 * 計算統計資料
 * @param {Array} fixtures - 治具列表
 * @returns {Object} 統計資料
 */
function calcStats(fixtures = window.mockFixtures) {
  const total = fixtures.length;
  const active = fixtures.filter(f => f.status === 'active').length;
  const underLife = getUndurableFixtures(fixtures).length;
  const needReplace = calcUpcoming(fixtures).length;
  
  return { total, active, underLife, needReplace };
}

/**
 * 計算今日收料數量
 * @param {Array} receipts - 收料記錄
 * @returns {number} 今日收料數量
 */
function getTodayReceiptCount(receipts = window.mockReceipts) {
  const today = getToday();
  return receipts.filter(r => {
    const receiptDate = fmtDate(r.dt || r.created_at);
    return receiptDate === today;
  }).length;
}

/**
 * 計算今日退料數量
 * @param {Array} returns - 退料記錄
 * @returns {number} 今日退料數量
 */
function getTodayReturnCount(returns = window.mockReturns) {
  const today = getToday();
  return returns.filter(r => {
    const returnDate = fmtDate(r.dt || r.created_at);
    return returnDate === today;
  }).length;
}

/**
 * 計算治具使用率
 * @param {number} used - 已使用數量
 * @param {number} total - 總數量
 * @returns {number} 使用率（百分比）
 */
function calcUsageRate(used, total) {
  if (!total || total === 0) return 0;
  return Math.round((used / total) * 100);
}

// ============================================
// 日期計算
// ============================================

/**
 * 計算距今天數
 * @param {string|Date} date - 日期
 * @returns {number} 天數
 */
function daysSince(date) {
  if (!date) return 0;
  const d1 = new Date(date);
  const d2 = new Date();
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 計算到期日期
 * @param {string|Date} startDate - 開始日期
 * @param {number} cycle - 週期（天數）
 * @returns {string} 到期日期
 */
function calcExpiryDate(startDate, cycle) {
  if (!startDate || !cycle) return '';
  const d = new Date(startDate);
  d.setDate(d.getDate() + cycle);
  return fmtDate(d);
}

/**
 * 判斷是否過期
 * @param {string|Date} expiryDate - 到期日期
 * @returns {boolean} 是否過期
 */
function isExpired(expiryDate) {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

// ============================================
// 篩選與搜尋
// ============================================

/**
 * 搜尋治具
 * @param {Array} fixtures - 治具列表
 * @param {string} query - 搜尋關鍵字
 * @returns {Array} 符合的治具
 */
function searchFixtures(fixtures, query) {
  if (!query) return fixtures;
  
  const q = query.toLowerCase().trim();
  return fixtures.filter(f =>
    (f.id && f.id.toLowerCase().includes(q)) ||
    (f.name && f.name.toLowerCase().includes(q)) ||
    (f.model && f.model.toLowerCase().includes(q)) ||
    (f.owner && f.owner.toLowerCase().includes(q))
  );
}

/**
 * 篩選治具
 * @param {Array} fixtures - 治具列表
 * @param {Object} filters - 篩選條件
 * @returns {Array} 篩選後的治具
 */
function filterFixtures(fixtures, filters = {}) {
  let result = fixtures;
  
  // 狀態篩選
  if (filters.status) {
    result = result.filter(f => f.status === filters.status);
  }
  
  // 負責人篩選
  if (filters.owner) {
    result = result.filter(f => f.owner === filters.owner);
  }
  
  // 機種篩選
  if (filters.model) {
    result = result.filter(f => f.model === filters.model);
  }
  
  // 儲位篩選
  if (filters.location) {
    result = result.filter(f => f.loc && f.loc.includes(filters.location));
  }
  
  return result;
}

// 匯出函數
window.calcUpcoming = calcUpcoming;
window.getUndurableFixtures = getUndurableFixtures;
window.calcAchievement = calcAchievement;
window.getFixtureStatus = getFixtureStatus;
window.calcStats = calcStats;
window.getTodayReceiptCount = getTodayReceiptCount;
window.getTodayReturnCount = getTodayReturnCount;
window.calcUsageRate = calcUsageRate;
window.daysSince = daysSince;
window.calcExpiryDate = calcExpiryDate;
window.isExpired = isExpired;
window.searchFixtures = searchFixtures;
window.filterFixtures = filterFixtures;
