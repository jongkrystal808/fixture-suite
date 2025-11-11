/**
 * 工具函數
 * utils.js
 */

// ============================================
// 日期時間格式化
// ============================================

/**
 * 格式化日期時間
 * @param {string|Date} dt - 日期時間
 * @returns {string} 格式化後的字串
 */
function fmtDT(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化日期
 * @param {string|Date} dt - 日期
 * @returns {string} 格式化後的字串
 */
function fmtDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 取得今日日期字串
 * @returns {string} 今日日期 (YYYY-MM-DD)
 */
function getToday() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ============================================
// 通知提示
// ============================================

/**
 * 顯示通知訊息
 * @param {string} message - 訊息內容
 * @param {string} type - 類型 ('success', 'error', 'warning', 'info')
 * @param {number} duration - 顯示時間（毫秒）
 */
function toast(message, type = 'info', duration = 3000) {
  const toastEl = document.createElement('div');
  const bgColors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-gray-900'
  };
  
  toastEl.className = `fixed bottom-4 right-4 ${bgColors[type] || bgColors.info} text-white px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-300`;
  toastEl.textContent = message;
  toastEl.style.opacity = '0';
  
  document.body.appendChild(toastEl);
  
  // 淡入
  setTimeout(() => {
    toastEl.style.opacity = '1';
  }, 10);
  
  // 淡出並移除
  setTimeout(() => {
    toastEl.style.opacity = '0';
    setTimeout(() => {
      toastEl.remove();
    }, 300);
  }, duration);
}

// ============================================
// CSV 匯出
// ============================================

/**
 * 下載 CSV 檔案
 * @param {string} filename - 檔案名稱
 * @param {string} content - CSV 內容
 */
function downloadCSV(filename, content) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * 陣列轉 CSV
 * @param {Array} data - 資料陣列
 * @param {Array} headers - 表頭
 * @returns {string} CSV 字串
 */
function arrayToCSV(data, headers) {
  const rows = [headers.join(',')];
  
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header] || '';
      // 如果包含逗號或引號，需要用引號包起來
      if (String(value).includes(',') || String(value).includes('"')) {
        return `"${String(value).replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(row.join(','));
  });
  
  return rows.join('\n');
}

// ============================================
// 數字格式化
// ============================================

/**
 * 格式化數字（加千分位）
 * @param {number} num - 數字
 * @returns {string} 格式化後的字串
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('zh-TW');
}

/**
 * 格式化百分比
 * @param {number} value - 數值
 * @param {number} total - 總數
 * @param {number} decimals - 小數位數
 * @returns {string} 百分比字串
 */
function formatPercent(value, total, decimals = 0) {
  if (!total || total === 0) return '0%';
  const percent = (value / total) * 100;
  return `${percent.toFixed(decimals)}%`;
}

// ============================================
// 字串處理
// ============================================

/**
 * 截斷字串
 * @param {string} str - 字串
 * @param {number} maxLength - 最大長度
 * @param {string} suffix - 後綴
 * @returns {string} 截斷後的字串
 */
function truncate(str, maxLength = 50, suffix = '...') {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 移除 HTML 標籤
 * @param {string} html - HTML 字串
 * @returns {string} 純文字
 */
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// ============================================
// 陣列處理
// ============================================

/**
 * 陣列去重
 * @param {Array} arr - 陣列
 * @param {string} key - 唯一鍵（物件陣列用）
 * @returns {Array} 去重後的陣列
 */
function unique(arr, key) {
  if (!key) {
    return [...new Set(arr)];
  }
  const seen = new Set();
  return arr.filter(item => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * 陣列排序（中文友善）
 * @param {Array} arr - 陣列
 * @param {string} key - 排序鍵
 * @param {boolean} desc - 是否降序
 * @returns {Array} 排序後的陣列
 */
function sortBy(arr, key, desc = false) {
  return arr.slice().sort((a, b) => {
    const valA = a[key];
    const valB = b[key];
    
    if (typeof valA === 'string') {
      return desc
        ? valB.localeCompare(valA, 'zh-TW')
        : valA.localeCompare(valB, 'zh-TW');
    }
    
    return desc ? valB - valA : valA - valB;
  });
}

// ============================================
// 防抖與節流
// ============================================

/**
 * 防抖函數
 * @param {Function} func - 要執行的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 防抖後的函數
 */
function debounce(func, wait = 300) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * 節流函數
 * @param {Function} func - 要執行的函數
 * @param {number} wait - 等待時間（毫秒）
 * @returns {Function} 節流後的函數
 */
function throttle(func, wait = 300) {
  let timeout;
  let previous = 0;
  
  return function(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(this, args);
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now();
        timeout = null;
        func.apply(this, args);
      }, remaining);
    }
  };
}

// 匯出函數
window.fmtDT = fmtDT;
window.fmtDate = fmtDate;
window.getToday = getToday;
window.toast = toast;
window.downloadCSV = downloadCSV;
window.arrayToCSV = arrayToCSV;
window.formatNumber = formatNumber;
window.formatPercent = formatPercent;
window.truncate = truncate;
window.stripHtml = stripHtml;
window.unique = unique;
window.sortBy = sortBy;
window.debounce = debounce;
window.throttle = throttle;
