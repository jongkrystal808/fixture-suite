// app-transaction-view.js - 交易檢視功能整合（升級版）
// ============================================================


// ============================================================
// 全域變數
// ============================================================
const VIEW_ALL_QUERY_SCHEMA = {
  va_page: 1,
  va_mode: 'all',      // all / serial / datecode
};


let viewAllPage = 1;
const viewPageSize = 20;
let viewAllPager = null;


// 總檢視的查詢模式：all / serial / datecode
let viewAllMode = 'all';
let isViewAllInitializing = false;


document.addEventListener("DOMContentLoaded", () => {
  viewAllPager = createPagination({
    getPage: () => viewAllPage,
    setPage: v => viewAllPage = v,
    getPageSize: () => viewPageSize,
    onPageChange: () => loadTransactionViewAll(viewAllPage),
    els: {
      pageNow: document.getElementById("viewAllPageNow"),
      pageMax: document.getElementById("viewAllPageMax"),
    }
  });

  initTransactionViewAll();
});



// ============================================================
// View All 查詢欄位定義（單一事實來源）
// ============================================================
const VIEW_ALL_FIELD_MAP = {
  serial: {
    txTypeRadio: 'vaSerialTxType',
    fields: {
      date_from: 'vaSerialDateFrom',
      date_to: 'vaSerialDateTo',
      fixture_id: 'vaSerialFixture',
      order_no: 'vaSerialOrderNo',
      serial: 'vaSerialSerial',
      operator: 'vaSerialOperator'
    }
  },

  datecode: {
    txTypeRadio: 'vaDatecodeTxType',
    fields: {
      date_from: 'vaDatecodeDateFrom',
      date_to: 'vaDatecodeDateTo',
      fixture_id: 'vaDatecodeFixture',
      order_no: 'vaDatecodeOrderNo',
      datecode: 'vaDatecodeDatecode',
      operator: 'vaDatecodeOperator'
    }
  },

  all: {
    txTypeRadio: 'vaAllTxType',
    fields: {
      date_from: 'vaAllDateFrom',
      date_to: 'vaAllDateTo',
      fixture_id: 'vaAllFixture',
      order_no: 'vaAllOrderNo',
      datecode: 'vaAllDatecode',
      serial: 'vaAllSerial',
      operator: 'vaAllOperator'
    }
  }
};

// ============================================================
// View All 表格結構定義
// ============================================================
const VIEW_ALL_TABLE_SCHEMA = {
  all: {
    columns: [
      { key: 'transaction_date', label: '日期', render: r => formatDate(r.transaction_date) },
      { key: 'transaction_type', label: '類型', render: renderTxType },
      { key: 'fixture_id', label: '治具' },
      { key: 'order_no', label: '單號' },
      { key: 'record_type', label: '記錄類型', render: renderRecordType },
      { key: 'quantity', label: '數量', render: renderQuantity },
      { key: 'operator', label: '操作人員' }
    ]
  },

  datecode: {
    columns: [
      { key: 'transaction_date', label: '日期', render: r => formatDate(r.transaction_date) },
      { key: 'transaction_type', label: '類型', render: renderTxType },
      { key: 'fixture_id', label: '治具' },
      { key: 'order_no', label: '單號', render: r => formatOrderNo(r.order_no)},
      { key: 'record_type', label: '記錄類型', render: renderRecordType },
      { key: 'quantity', label: '數量', render: renderQuantity },
      { key: 'operator', label: '操作人員' }
    ]
  }
};



// ============================================================
// 工具函數 - 日期轉換
// ============================================================
function toISODateTime(value, endOfDay = false) {
  if (!value) return null;

  // datetime-local：直接 new Date(value)
  if (value.includes("T")) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // date：補上時間（起日 00:00:00 / 迄日 23:59:59）
  const d = new Date(value + (endOfDay ? "T23:59:59" : "T00:00:00"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function formatDatecodeQuantity(r) {
  if (r.record_type !== 'datecode') return null;

  const dc = r.datecode || '-';
  const qty = r.quantity ?? r.display_quantity ?? '-';

  return `${dc} (${qty})`;
}

function formatOrderNo(value) {
  if (value === null || value === undefined) return '-';

  // 已經是字串，直接回傳
  if (typeof value === 'string') {
    return value;
  }

  // 數字：轉成不含小數的字串
  if (typeof value === 'number') {
    return String(Math.trunc(value));
  }

  return String(value);
}


// ============================================================
// 總檢視 - 切換查詢模式
// ============================================================
function switchViewAllMode(mode) {
  viewAllMode = mode;

  // 更新按鈕樣式
  ['all', 'serial', 'datecode'].forEach(m => {
    const btn = document.getElementById(`vaMode-${m}`);
    if (btn) {
      if (m === mode) {
        btn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-blue-600 text-white';
      } else {
        btn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gray-100 text-gray-600 hover:bg-gray-200';
      }
    }
  });

  // 顯示/隱藏對應的篩選區域
  const serialFilters = document.getElementById('vaSerialFilters');
  const datecodeFilters = document.getElementById('vaDatecodeFilters');
  const allFilters = document.getElementById('vaAllFilters');

  if (serialFilters) serialFilters.classList.add('hidden');
  if (datecodeFilters) datecodeFilters.classList.add('hidden');
  if (allFilters) allFilters.classList.add('hidden');

  if (mode === 'serial' && serialFilters) {
    serialFilters.classList.remove('hidden');
  } else if (mode === 'datecode' && datecodeFilters) {
    datecodeFilters.classList.remove('hidden');
  } else if (mode === 'all' && allFilters) {
    allFilters.classList.remove('hidden');
  }

  // 控制匯出按鈕的顯示/隱藏 - 只在全部查詢模式顯示
  const btnExportSummary = document.getElementById('btnExportSummary');
  const btnExportDetailed = document.getElementById('btnExportDetailed');

  if (btnExportSummary && btnExportDetailed) {
    if (mode === 'all') {
      btnExportSummary.classList.remove('hidden');
      btnExportDetailed.classList.remove('hidden');
    } else {
      btnExportSummary.classList.add('hidden');
      btnExportDetailed.classList.add('hidden');
    }
  }


  // 重置分頁：僅在「使用者切換模式」時才做；初始化還原狀態時不要動
    if (!isViewAllInitializing) {
      viewAllPage = 1;
    }

    const tbody = document.getElementById('viewAllTableBody');
    if (tbody) tbody.innerHTML = '';

}

window.switchViewAllMode = switchViewAllMode;

// ============================================================
// 總檢視 - 查詢（修正版）
// ============================================================
async function loadTransactionViewAll(page = 1) {
  try {
    if (!window.currentCustomerId && !getCurrentCustomerId?.()) {
      console.warn('[View All] 尚未選擇客戶');
      return;
    }

    viewAllPage = page;

    if (typeof writeQueryState === 'function') {
      writeQueryState({
        va_page: viewAllPage,
        va_mode: viewAllMode,
      });
    }

    // ✅ 一定要最先宣告 params
    const params = {
      skip: (page - 1) * viewPageSize,
      limit: viewPageSize,
      query_mode: viewAllMode,
    };

    // ========================================================
    // 修法 B：all mode 的 serial / datecode（集中處理）
    // ========================================================
    if (viewAllMode === 'all') {
      const serial = document.getElementById('vaAllSerial')?.value?.trim();
      const datecode = document.getElementById('vaAllDatecode')?.value?.trim();

      if (serial && datecode) {
        toast('序號與 Datecode 請擇一查詢', 'warning');
        return;
      }

      if (serial) {
        params.serial = serial;
        params.record_type_hint = 'serial';
      } else if (datecode) {
        params.datecode = datecode;
        params.record_type_hint = 'datecode';
      }
    }

    // ========================================================
    // 其他欄位（依模式）
    // ========================================================
    const config = VIEW_ALL_FIELD_MAP[viewAllMode];

    if (config) {
      // 收退料類型
      if (config.txTypeRadio) {
        const txType = document.querySelector(
          `input[name="${config.txTypeRadio}"]:checked`
        )?.value;
        if (txType) {
          params.transaction_type = txType;
        }
      }

      // 一般欄位
      Object.entries(config.fields).forEach(([paramKey, elementId]) => {
        const el = document.getElementById(elementId);
        if (!el) return;

        const value = el.value?.trim();
        if (!value) return;

        // ⚠️ all mode 時，serial / datecode 已處理，避免覆蓋
        if (
          viewAllMode === 'all' &&
          (paramKey === 'serial' || paramKey === 'datecode')
        ) {
          return;
        }

        params[paramKey] = value;
      });
    }

    // ========================================================
    // API 呼叫
    // ========================================================
    const res =
      viewAllMode === 'serial'
        ? await apiViewTransactionSerials(params)
        : await apiViewAllTransactions(params);

    const rows = res?.rows || res?.data || res?.items || [];
    const total = Number(res?.total ?? rows.length ?? 0);

    if (viewAllMode === 'serial') {
      renderSerialModeTable(rows);
    } else {
      renderViewAllTable(rows);
    }

    viewAllPager?.render(total);

  } catch (err) {
    console.error('[View All] 查詢失敗:', err);
    toast('查詢失敗', 'error');
  }
}

window.loadTransactionViewAll = loadTransactionViewAll;


// ============================================================
// API - 序號查詢
// ============================================================
async function apiViewTransactionSerials(params = {}) {
  return api("/transactions/serials", { params });
}

window.apiViewTransactionSerials = apiViewTransactionSerials;

// ============================================================
// API - 總檢視查詢
// ============================================================
async function apiViewAllTransactions(params = {}) {
  return api("/transactions/view-all", { params });
}

window.apiViewAllTransactions = apiViewAllTransactions;

// ============================================================
// 渲染序號模式表格
// ============================================================
function renderSerialModeTable(rows) {
  const thead = document.getElementById("viewAllTableHead");
  const tbody = document.getElementById("viewAllTableBody");

  if (!thead || !tbody) {
    console.error("[Serial Mode] table 未找到");
    return;
  }

  // 設置表頭
  thead.innerHTML = `
    <tr>
      <th class="py-2 pr-4">日期</th>
      <th class="py-2 pr-4">類型</th>
      <th class="py-2 pr-4">治具</th>
      <th class="py-2 pr-4">單號</th>
      <th class="py-2 pr-4">序號</th>
      <th class="py-2 pr-4">操作人員</th>
    </tr>
  `;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-gray-500">無資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const txDate = r.transaction_date
      ? new Date(r.transaction_date).toLocaleDateString("zh-TW")
      : "-";

    // 類型（加顏色）
    let txTypeHtml = "-";
    const txType = r.transaction_type || r.type;

    if (txType === "receipt") {
      txTypeHtml = `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">收料</span>`;
    } else if (txType === "return") {
      txTypeHtml = `<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">退料</span>`;
    }

    const fixtureId = r.fixture_id || "-";
    const orderNo = formatOrderNo(r.order_no);
    const serialNo = r.serial_number || r.serial || "-";
    const operator = r.operator || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${txDate}</td>
      <td class="py-2 pr-4">${txTypeHtml}</td>
      <td class="py-2 pr-4">${fixtureId}</td>
      <td class="py-2 pr-4">${orderNo}</td>
      <td class="py-2 pr-4 font-mono">
        <a class="text-blue-600 hover:underline cursor-pointer"
           onclick="openSerialDetail('${fixtureId}', '${serialNo}')">
          ${serialNo}
        </a>
      </td>
      <td class="py-2 pr-4">${operator}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.renderSerialModeTable = renderSerialModeTable;

function renderTxType(r) {
  if (r.transaction_type === 'receipt') {
    return `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">收料</span>`;
  }
  if (r.transaction_type === 'return') {
    return `<span class="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">退料</span>`;
  }
  return '-';
}

function renderRecordType(r) {
  return {
    batch: '批量',
    individual: '個別',
    datecode: 'Datecode'
  }[r.record_type] || r.record_type || '-';
}

function renderQuantity(r) {
  if (r.record_type === 'datecode') {
    const dc = r.datecode || '-';
    const qty = r.display_quantity_text || r.display_quantity || r.quantity || '-';
    return `${dc} (${qty})`;
  }

  return r.display_quantity_text || r.display_quantity || r.quantity || '-';
}



// ============================================================
// 渲染總檢視表格
// ============================================================
function renderViewAllTable(rows) {
  const thead = document.getElementById("viewAllTableHead");
  const tbody = document.getElementById("viewAllTableBody");

  if (!thead || !tbody) {
    console.error("[View All] table 未找到");
    return;
  }

  const schema = VIEW_ALL_TABLE_SCHEMA[viewAllMode] || VIEW_ALL_TABLE_SCHEMA.all;
  const columns = schema.columns;

  // 表頭
  thead.innerHTML = `
    <tr>
      ${columns.map(col => `<th class="py-2 pr-4">${col.label}</th>`).join('')}
    </tr>
  `;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${columns.length}" class="text-center py-4 text-gray-500">
          無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = columns.map(col => {
      let value = '-';

      if (typeof col.render === 'function') {
        value = col.render(r);
      } else if (r[col.key] !== undefined && r[col.key] !== null) {
        value = r[col.key];
      }

      return `<td class="py-2 pr-4">${value}</td>`;
    }).join('');

    tbody.appendChild(tr);
  });
}

window.renderViewAllTable = renderViewAllTable;

// ============================================================
// 分頁渲染
// ============================================================
function renderPagination(containerId, total, currentPage, pageSize, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(total / pageSize);
  container.innerHTML = "";

  if (totalPages <= 1) return;

  const createBtn = (label, page, active = false) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = `btn btn-sm ${active ? 'bg-blue-600 text-white' : 'bg-gray-100'}`;
    btn.onclick = () => onPageChange(page);
    return btn;
  };

  // 上一頁
  if (currentPage > 1) {
    container.appendChild(createBtn('上一頁', currentPage - 1));
  }

  // 頁碼
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    container.appendChild(
      createBtn(i, i, i === currentPage)
    );
  }

  // 下一頁
  if (currentPage < totalPages) {
    container.appendChild(createBtn('下一頁', currentPage + 1));
  }
}

window.renderPagination = renderPagination;


// ============================================================
// 匯出功能 - 支援日期範圍
// ============================================================
async function exportViewAllXlsx(type) {
  const token = localStorage.getItem("access_token");
  const customerId = window.currentCustomerId || getCurrentCustomerId?.();

  if (!token || !customerId) {
    return toast("請先登入並選擇客戶", "warning");
  }

  // 只在全部查詢模式下允許匯出
  if (viewAllMode !== 'all') {
    return toast("匯出功能僅在全部查詢模式下可用", "warning");
  }

  // 收集查詢參數（包含日期範圍）
  const params = new URLSearchParams();

  // 收退料類型
  const txType = document.querySelector('input[name="vaAllTxType"]:checked')?.value;
  if (txType) params.append('transaction_type', txType);

  // 日期範圍
  const dateFrom = document.getElementById("vaAllDateFrom")?.value;
  const dateTo = document.getElementById("vaAllDateTo")?.value;
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);

  // 其他篩選條件
  const fixture = document.getElementById("vaAllFixture")?.value?.trim();
  const orderNo = document.getElementById("vaAllOrderNo")?.value?.trim();
  const datecode = document.getElementById("vaAllDatecode")?.value?.trim();
  const operator = document.getElementById("vaAllOperator")?.value?.trim();

  if (fixture) params.append('fixture_id', fixture);
  if (operator) params.append('operator', operator);
  if (datecode) params.append('datecode', datecode);

  params.append('type', type);

  const url = `${API_PREFIX}/transactions/summary/export?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Customer-Id": customerId,
      },
    });

    if (!res.ok) {
      let msg = `匯出失敗 (${res.status})`;
      try {
        const err = await res.json();
        if (err?.detail) msg = err.detail;
      } catch {}
      toast(msg, "error");
      return;
    }

    // 下載 XLSX
    const blob = await res.blob();
    const a = document.createElement("a");
    const urlObj = URL.createObjectURL(blob);

    // 生成文件名，包含日期範圍
    let filename = type === "detailed"
      ? "transactions_detailed"
      : "transactions_summary";

    if (dateFrom && dateTo) {
      filename += `_${dateFrom}_to_${dateTo}`;
    } else if (dateFrom) {
      filename += `_from_${dateFrom}`;
    } else if (dateTo) {
      filename += `_to_${dateTo}`;
    }

    filename += '.xlsx';

    a.href = urlObj;
    a.download = filename;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(urlObj);

    toast("匯出成功", "success");

  } catch (err) {
    console.error(err);
    toast("匯出過程發生錯誤", "error");
  }
}

function exportViewAllSummary() {
  exportViewAllXlsx("summary");
}

function exportViewAllDetailed() {
  exportViewAllXlsx("detailed");
}

window.exportViewAllSummary = exportViewAllSummary;
window.exportViewAllDetailed = exportViewAllDetailed;



// ============================================================
// 客戶切換時重新載入
// ============================================================
if (window.registerCustomerRefreshHandler) {
  window.registerCustomerRefreshHandler("tab-transactions", () => {

    // 如果在總檢視分頁，重新載入
    const currentTab = document.querySelector('.subtab.subtab-active')?.dataset.ttab;
    if (currentTab === 'view-all') {
      loadTransactionViewAll(1);
    }
  });
}


// ============================================================
// 集中式 Enter 查詢（僅限總檢視區）
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;

  const viewAllTab = document.getElementById('ttab-view-all');
  if (!viewAllTab || viewAllTab.classList.contains('hidden')) return;

  const tag = e.target?.tagName;
  if (tag === 'TEXTAREA' || tag === 'BUTTON') return;

  loadTransactionViewAll(1);
});



function clearViewAllFilters() {

  if (viewAllMode === 'serial') {
    // radio：收退料類型
    document.querySelectorAll('input[name="vaSerialTxType"]').forEach(r => {
      r.checked = (r.value === '');
    });

    // inputs
    [
      'vaSerialDateFrom',
      'vaSerialDateTo',
      'vaSerialFixture',
      'vaSerialOrderNo',
      'vaSerialSerial',
      'vaSerialOperator'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  } else if (viewAllMode === 'datecode') {
    document.querySelectorAll('input[name="vaDatecodeTxType"]').forEach(r => {
      r.checked = (r.value === '');
    });

    [
      'vaDatecodeDateFrom',
      'vaDatecodeDateTo',
      'vaDatecodeFixture',
      'vaDatecodeOrderNo',
      'vaDatecodeDatecode',
      'vaDatecodeOperator'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

  } else {
    // all 模式
    document.querySelectorAll('input[name="vaAllTxType"]').forEach(r => {
      r.checked = (r.value === '');
    });

    [
      'vaAllDateFrom',
      'vaAllDateTo',
      'vaAllFixture',
      'vaAllOrderNo',
      'vaAllDatecode',
      'vaAllSerial',
      'vaAllOperator'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  // 分頁回到第一頁
  viewAllPage = 1;
  viewAllPager?.render(0); // optional，避免殘留頁碼

  // 不自動查詢（避免誤觸）
}
window.clearViewAllFilters = clearViewAllFilters;

function initTransactionViewAll() {
  if (typeof readQueryState !== 'function') return;

  isViewAllInitializing = true;

  const q = readQueryState(VIEW_ALL_QUERY_SCHEMA);

  viewAllPage = Math.max(1, q.va_page || 1);
  viewAllMode = q.va_mode || 'all';

  // 套用 mode（會處理 UI 顯示），但不應該把 page 改回 1
  switchViewAllMode(viewAllMode);

  isViewAllInitializing = false;

  loadTransactionViewAll(viewAllPage);
}


window.initTransactionViewAll = initTransactionViewAll;



// ============================================================
// Debug
// ============================================================
globalThis.__transactionViewDebug = {
  loadTransactionViewAll,
  switchViewAllMode,
  viewAllPage,
  viewAllMode,
  exportViewAllSummary,
  exportViewAllDetailed
};
