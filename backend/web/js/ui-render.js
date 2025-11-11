/**
 * UI 渲染邏輯
 * ui-render.js
 */

// ============================================
// 統計頁面渲染
// ============================================

/**
 * 渲染統計資料
 */
function renderStats() {
  const stats = calcStats();
  
  // 更新統計卡片
  const el1 = document.getElementById('statTotalFixtures');
  if (el1) el1.textContent = stats.total;
  
  const el2 = document.getElementById('statActiveFixtures');
  if (el2) el2.textContent = stats.active;
  
  const el3 = document.getElementById('statUnderLifespan');
  if (el3) el3.textContent = stats.underLife;
  
  const el4 = document.getElementById('statNeedReplacement');
  if (el4) el4.textContent = stats.needReplace;
  
  // 渲染不耐用治具表格
  renderUndurableTable();
  
  // 填充報廢登記的治具選項
  populateScrapSelect();
}

/**
 * 渲染不耐用治具表格
 */
function renderUndurableTable() {
  const tbody = document.getElementById('undurableTable');
  if (!tbody) return;
  
  const undurable = getUndurableFixtures();
  
  if (undurable.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="py-4 text-center text-gray-500">目前無不耐用治具</td></tr>';
    return;
  }
  
  tbody.innerHTML = undurable.map(f => `
    <tr class="border-t">
      <td class="py-2 pr-4 font-mono">${f.id}</td>
      <td class="py-2 pr-4">${f.name}</td>
      <td class="py-2 pr-4">${f.cycle}</td>
      <td class="py-2 pr-4">${f.used}</td>
      <td class="py-2 pr-4">${f.achievement}%</td>
      <td class="py-2 pr-4">
        <span class="pill ${f.warning === 'danger' ? 'danger-tag' : 'warning-tag'}">
          ${f.warning === 'danger' ? '嚴重' : '警告'}
        </span>
      </td>
      <td class="py-2 pr-4">${f.owner}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs" onclick="viewFixtureDetail('${f.id}')">檢視</button>
      </td>
    </tr>
  `).join('');
}

/**
 * 填充報廢登記的治具選項
 */
function populateScrapSelect() {
  const sel = document.getElementById('scrapFixture');
  if (!sel) return;
  
  sel.innerHTML = '<option value="">請選擇</option>' +
    window.mockFixtures.map(f =>
      `<option value="${f.id}">${f.id} - ${f.name}</option>`
    ).join('');
}

// ============================================
// 儀表板渲染
// ============================================

/**
 * 渲染即將更換治具
 */
function renderUpcoming() {
  const upcoming = calcUpcoming(window.mockFixtures);
  const box = document.getElementById('upcomingList');
  if (!box) return;
  
  if (upcoming.length === 0) {
    box.innerHTML = '<div class="text-sm text-gray-500">目前無即將更換治具</div>';
    return;
  }
  
  box.innerHTML = upcoming.map(f => `
    <div class='flex items-center justify-between border rounded-xl px-3 py-2'>
      <div class='min-w-0'>
        <div class='font-medium truncate'>${f.id} · ${f.name}</div>
        <div class='text-xs text-gray-500 truncate'>使用 ${f.used}/${f.cycle} · 負責人 ${f.owner}</div>
      </div>
      <span class='pill ${f.used >= f.cycle ? 'border-red-300 text-red-700 bg-red-50' : 'border-amber-300 text-amber-700 bg-amber-50'}'>
        ${Math.round(100 * f.used / f.cycle)}%
      </span>
    </div>
  `).join('');
}

/**
 * 渲染儀表板表格
 * @param {Array} rows - 資料列
 */
function renderDash(rows) {
  const tbody = document.getElementById('dashTable');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr class="border-t">
      <td class="py-2 pr-4 font-mono">${r.id}</td>
      <td class="py-2 pr-4">${r.name}</td>
      <td class="py-2 pr-4">${r.model}</td>
      <td class="py-2 pr-4">${r.loc}</td>
      <td class="py-2 pr-4">
        ${r.status === 'active'
          ? '<span class="pill border-green-300 text-green-700 bg-green-50">Active</span>'
          : '<span class="pill border-gray-300 text-gray-600 bg-gray-50">Inactive</span>'}
      </td>
      <td class="py-2 pr-4">${r.used}/${r.cycle}</td>
      <td class="py-2 pr-4">${r.owner}</td>
    </tr>
  `).join('');
}

// ============================================
// 查詢頁面渲染
// ============================================

/**
 * 渲染查詢表格
 * @param {Array} rows - 資料列
 */
function renderQuery(rows) {
  const tbody = document.getElementById('queryTable');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr class="border-t">
      <td class="py-2 pr-4">
        <div class="h-12 w-20 bg-gray-100 border rounded-lg grid place-items-center text-xs text-gray-500">
          IMG
        </div>
      </td>
      <td class="py-2 pr-4">
        <div class="font-mono">${r.id}</div>
        <div class="text-xs text-gray-500 truncate">${r.name}</div>
      </td>
      <td class="py-2 pr-4">${r.model}</td>
      <td class="py-2 pr-4">${r.loc}</td>
      <td class="py-2 pr-4">${r.maxOpen || ''}</td>
      <td class="py-2 pr-4">${r.status}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs" onclick="viewFixtureDetail('${r.id}')">詳細</button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// 記錄頁面渲染
// ============================================

/**
 * 渲染記錄表格
 * @param {Array} rows - 資料列
 */
function renderLogs(rows) {
  const tbody = document.getElementById('logTable');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(r => `
    <tr class="border-t">
      <td class="py-2 pr-4">${fmtDate(r.date || r.used_at || r.replacement_date)}</td>
      <td class="py-2 pr-4 font-mono">${r.fixture || r.fixture_id}</td>
      <td class="py-2 pr-4">${r.loc || r.station_id || ''}</td>
      <td class="py-2 pr-4">${r.qty || r.use_count || ''}</td>
      <td class="py-2 pr-4">${r.type || 'use'}</td>
      <td class="py-2 pr-4">${r.note || ''}</td>
    </tr>
  `).join('');
}

// ============================================
// 收退料頁面渲染
// ============================================

/**
 * 渲染收料表格
 */
function renderReceipts() {
  const tbody = document.getElementById('rcvTable');
  if (!tbody) return;
  
  const query = (document.getElementById('rcvSearch')?.value || '').toLowerCase();
  
  const rows = window.mockReceipts
    .slice()
    .sort((a, b) => new Date(b.dt || b.created_at) - new Date(a.dt || a.created_at))
    .filter(r => !query || [r.fixture, r.fixture_code, r.lot].join(' ').toLowerCase().includes(query))
    .slice(0, 10);
  
  const cnt = document.getElementById('rcvCount');
  if (cnt) cnt.textContent = window.mockReceipts.length;
  
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-500">無收料記錄</td></tr>';
    return;
  }
  
  tbody.innerHTML = rows.map(r => `
    <tr class="border-t">
      <td class="py-2 pr-4">${fmtDT(r.dt || r.created_at)}</td>
      <td class="py-2 pr-4 font-mono">${r.fixture || r.fixture_code}</td>
      <td class="py-2 pr-4">${r.lot || r.order_no}</td>
      <td class="py-2 pr-4">${r.qty || ''}</td>
      <td class="py-2 pr-4">
        ${r.id !== undefined
          ? `<button class="btn btn-ghost text-xs" onclick="deleteReceipt(${r.id})">刪除</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

/**
 * 渲染退料表格
 */
function renderReturns() {
  const tbody = document.getElementById('retTable');
  if (!tbody) return;
  
  const query = (document.getElementById('retSearch')?.value || '').toLowerCase();
  
  const rows = window.mockReturns
    .slice()
    .sort((a, b) => new Date(b.dt || b.created_at) - new Date(a.dt || a.created_at))
    .filter(r => !query || [r.fixture, r.fixture_code, r.lot].join(' ').toLowerCase().includes(query))
    .slice(0, 10);
  
  const cnt = document.getElementById('retCount');
  if (cnt) cnt.textContent = window.mockReturns.length;
  
  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="py-4 text-center text-gray-500">無退料記錄</td></tr>';
    return;
  }
  
  tbody.innerHTML = rows.map(r => `
    <tr class="border-t">
      <td class="py-2 pr-4">${fmtDT(r.dt || r.created_at)}</td>
      <td class="py-2 pr-4 font-mono">${r.fixture || r.fixture_code}</td>
      <td class="py-2 pr-4">${r.lot || r.order_no}</td>
      <td class="py-2 pr-4">${r.qty || ''}</td>
      <td class="py-2 pr-4">
        ${r.id !== undefined
          ? `<button class="btn btn-ghost text-xs" onclick="deleteReturn(${r.id})">刪除</button>`
          : ''}
      </td>
    </tr>
  `).join('');
}

// ============================================
// 負責人頁面渲染
// ============================================

/**
 * 渲染負責人表格
 * @param {Array} rows - 資料列
 */
function renderOwners(rows) {
  const tbody = document.getElementById('ownerTable');
  if (!tbody) return;
  
  tbody.innerHTML = rows.map(o => `
    <tr class="border-t">
      <td class="py-2 pr-4 font-mono">${o.emp_id}</td>
      <td class="py-2 pr-4">${o.name}</td>
      <td class="py-2 pr-4">${o.email}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs" onclick="editOwner('${o.emp_id}')">設定</button>
      </td>
    </tr>
  `).join('');
}

// 匯出函數
window.renderStats = renderStats;
window.renderUndurableTable = renderUndurableTable;
window.populateScrapSelect = populateScrapSelect;
window.renderUpcoming = renderUpcoming;
window.renderDash = renderDash;
window.renderQuery = renderQuery;
window.renderLogs = renderLogs;
window.renderReceipts = renderReceipts;
window.renderReturns = renderReturns;
window.renderOwners = renderOwners;
