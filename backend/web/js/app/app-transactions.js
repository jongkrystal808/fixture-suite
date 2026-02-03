// app-transactions.js - 交易登記功能
// ============================================================


// ============================================================
// 分頁切換函數
// ============================================================
function showTransactionSubTab(tabId) {
  // 隱藏所有子分頁
  document.getElementById('ttab-register')?.classList.add('hidden');
  document.getElementById('ttab-view-all')?.classList.add('hidden');

  // 顯示選中的分頁
  document.getElementById(tabId)?.classList.remove('hidden');

  // 更新按鈕狀態
  document.querySelectorAll('.subtab').forEach(btn => {
    const btnTab = 'ttab-' + btn.dataset.ttab;
    if (btnTab === tabId) {
      btn.classList.add('subtab-active');
    } else {
      btn.classList.remove('subtab-active');
    }
  });


  // 載入對應分頁的資料
  if (tabId === 'ttab-register' && window.currentCustomerId) {
    loadRecentTransactions();
  } else if (tabId === 'ttab-view-all' && window.currentCustomerId) {
    if (typeof loadTransactionViewAll === 'function') {
      loadTransactionViewAll(1);
    }
  }
}

window.showTransactionSubTab = showTransactionSubTab;

// ============================================================
// 交易登記 - 表單顯示/隱藏
// ============================================================
function toggleTransactionAdd(show) {
  const form = document.getElementById('transactionAddForm');
  if (!form) {
    console.warn('[toggleTransactionAdd] 找不到表單');
    return;
  }

  if (show) {
    form.classList.remove('hidden');
    // 重置表單
    resetTransactionForm();
  } else {
    form.classList.add('hidden');
  }

}

window.toggleTransactionAdd = toggleTransactionAdd;

// ============================================================
// 重置交易表單
// ============================================================
function resetTransactionForm() {
  document.getElementById('transactionDirection').value = 'receipt';
  document.getElementById('transactionAddOrder').value = '';
  document.getElementById('transactionAddFixture').value = '';
  document.getElementById('transactionAddType').value = 'batch';
  document.getElementById('transactionAddStart').value = '';
  document.getElementById('transactionAddEnd').value = '';
  document.getElementById('transactionAddSerials').value = '';
  document.getElementById('transactionAddDatecode').value = '';
  document.getElementById('transactionAddQuantity').value = '';
  document.getElementById('transactionAddSourceType').value = 'customer_supplied';
  document.getElementById('transactionAddNote').value = '';

  // 顯示批量區域，隱藏其他
  toggleTransactionTypeFields();
}

// ============================================================
// 記錄類型欄位切換
// ============================================================
function toggleTransactionTypeFields() {
  const type = document.getElementById('transactionAddType')?.value;

  const batchArea = document.getElementById('transactionBatchArea');
  const individualArea = document.getElementById('transactionIndividualArea');
  const datecodeArea = document.getElementById('transactionDatecodeArea');
  const sourceArea = document.getElementById('transactionSourceArea');

  // 先隱藏「記錄類型相關」區域
  batchArea?.classList.add('hidden');
  individualArea?.classList.add('hidden');
  datecodeArea?.classList.add('hidden');

  // ⭐ 來源類型永遠顯示（重點）
  sourceArea?.classList.remove('hidden');

  // 根據記錄類型顯示對應欄位
  if (type === 'batch') {
    batchArea?.classList.remove('hidden');
  } else if (type === 'individual') {
    individualArea?.classList.remove('hidden');
  } else if (type === 'datecode') {
    datecodeArea?.classList.remove('hidden');
  }

}

window.toggleTransactionTypeFields = toggleTransactionTypeFields;

// ============================================================
// 提交交易記錄
// ============================================================
async function submitTransaction() {
  const transactionType = document.getElementById('transactionDirection')?.value;
  const fixtureId = document.getElementById('transactionAddFixture')?.value?.trim();
  const orderNo = document.getElementById('transactionAddOrder')?.value?.trim();
  const recordType = document.getElementById('transactionAddType')?.value;
  const note = document.getElementById('transactionAddNote')?.value?.trim();
  const sourceType = document.getElementById('transactionAddSourceType')?.value;

  if (!fixtureId) return toast('請輸入治具 ID', 'warning');
  if (!sourceType) return toast('請選擇來源類型（客供 / 自購）', 'warning');

  const payload = {
    transaction_type: transactionType,
    fixture_id: fixtureId,
    order_no: orderNo || null,
    record_type: recordType,
    source_type: sourceType,   // ⭐ 永遠必填
    note: note || null,
  };

  // ------------------------------
  // batch
  // ------------------------------
  if (recordType === 'batch') {
    const start = document.getElementById('transactionAddStart')?.value?.trim();
    const end = document.getElementById('transactionAddEnd')?.value?.trim();

    if (!start || !end) {
      return toast('請輸入序號起始與結尾', 'warning');
    }

    // v6：後端只接受 serials
    try {
      payload.serials = expandSerialRange(start, end);
    } catch (e) {
      return toast(e.message, 'warning');
}

  }

  // ------------------------------
  // individual
  // ------------------------------
  if (recordType === 'individual') {
    const raw = document.getElementById('transactionAddSerials')?.value?.trim();
    if (!raw) return toast('請輸入序號列表', 'warning');

    const serials = raw
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean);

    if (serials.length === 0) {
      return toast('序號列表不可為空', 'warning');
    }

    payload.serials = serials;
  }

  // ------------------------------
  // datecode
  // ------------------------------
  if (recordType === 'datecode') {
    const datecode = document.getElementById('transactionAddDatecode')?.value?.trim();
    const quantity = parseInt(
      document.getElementById('transactionAddQuantity')?.value || '0',
      10
    );

    if (!datecode) return toast('請輸入 Datecode', 'warning');
    if (!quantity || quantity <= 0) return toast('請輸入有效數量', 'warning');

    payload.datecode = datecode;
    payload.quantity = quantity;
  }

  try {
    await apiCreateTransaction(payload);
    toast(`${transactionType === 'receipt' ? '收料' : '退料'}成功`, 'success');
    toggleTransactionAdd(false);
    await loadRecentTransactions();
  } catch (err) {
    console.error('交易提交失敗:', err);
    toast(err?.message || '提交失敗', 'error');
  }
}

window.submitTransaction = submitTransaction;

// ============================================================
// API - 創建交易
// ============================================================
async function apiCreateTransaction(payload) {
  return api('/transactions', {
    method: 'POST',
    body: payload   // ✅ fetch wrapper 只吃 body
  });
}


window.apiCreateTransaction = apiCreateTransaction;

// ============================================================
// 載入最近交易記錄
// ============================================================
async function loadRecentTransactions() {
  try {
    const data = await apiGetTransactions({ skip: 0, limit: 10 });
    const tbody = document.getElementById('recentTransactionsTable');

    if (!tbody) return;

    // 支援多種回傳格式
    const transactions = data?.rows || data?.transactions || data?.data || [];

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="py-4 text-center text-gray-400">暫無記錄</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.map(t => {
      const typeLabel = t.transaction_type === 'receipt' ? '收料' : '退料';
      const recordTypeLabel = {
        batch: '批量',
        individual: '個別',
        datecode: 'Datecode'
      }[t.record_type] || t.record_type;

      // 日期格式化
      const dateStr = t.created_at || t.transaction_date || '';

      return `
        <tr>
          <td class="py-2 pr-4">${formatDate(dateStr)}</td>
          <td class="py-2 pr-4">${typeLabel}</td>
          <td class="py-2 pr-4">${t.fixture_id || '-'}</td>
          <td class="py-2 pr-4">${t.order_no || '-'}</td>
          <td class="py-2 pr-4">${recordTypeLabel}</td>
          <td class="py-2 pr-4">
              ${
                t.record_type === 'datecode'
                  ? `${t.datecode || '-'} (${t.quantity || t.display_quantity_text || '-'})`
                  : (t.quantity || t.display_quantity_text || '-')
              }
            </td>
          <td class="py-2 pr-4">${t.operator || '-'}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('載入最近交易失敗:', err);
    // 不顯示錯誤訊息給用戶，避免干擾
  }
}

window.loadRecentTransactions = loadRecentTransactions;

// ============================================================
// API - 獲取交易列表（用於最近記錄）
// ============================================================
async function apiGetTransactions(params = {}) {
  // 使用 view-all endpoint，因為單純的 /transactions 可能不存在
  const q = new URLSearchParams(params).toString();
  return api(`/transactions/view-all?${q}`);
}

window.apiGetTransactions = apiGetTransactions;

// ============================================================
// 匯入交易記錄
// ============================================================
async function handleTransactionImport(input) {
  const file = input.files?.[0];
  if (!file) {
    return toast('請選擇 Excel 檔案', 'warning');
  }

  if (!window.currentCustomerId) {
    input.value = '';
    return toast('尚未選擇客戶', 'warning');
  }

  try {
    toast('正在匯入交易記錄...', 'info');

    const result = await apiImportTransactionsXlsx(file);

    // 顯示 Modal（不管成功或部分失敗）
    showImportResultModal(result);

    // 若完全成功才自動刷新
    if (result.failed === 0) {
      await loadRecentTransactions();
    }


  } catch (err) {
    console.error('匯入失敗:', err);
    toast(err?.message || '匯入失敗，請稍後再試', 'error');
  } finally {
    input.value = '';
  }
}

window.handleTransactionImport = handleTransactionImport;

// ============================================================
// API - 匯入交易
// ============================================================
async function apiImportTransactionsXlsx(file) {
  const token = localStorage.getItem("access_token");
  const customerId = window.currentCustomerId || getCurrentCustomerId?.();

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_PREFIX}/transactions/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Customer-Id": customerId,
      // ❌ 不要加 Content-Type
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw err;
  }

  return await res.json();
}


window.apiImportTransactionsXlsx = apiImportTransactionsXlsx;

// ============================================================
// 下載匯入範本
// ============================================================
function downloadTransactionTemplate() {
  const template = [
    {
      transaction_type: 'receipt',
      fixture_id: 'C-00001',
      order_no: '25123456',
      record_type: 'batch',
      source_type: 'customer_supplied',
      serial_start: 'SN001',
      serial_end: 'SN100',
      serials: '',
      datecode: '',
      quantity: '',
      note: '批量收料範例'
    },
    {
      transaction_type: 'return',
      fixture_id: 'L-00018',
      order_no: '25123457',
      record_type: 'individual',
      source_type: 'self_purchased',
      serial_start: '',
      serial_end: '',
      serials: 'SN010,SN011,SN012',
      datecode: '',
      quantity: '',
      note: '個別退料範例'
    },
    {
      transaction_type: 'receipt',
      fixture_id: 'L-00020',
      order_no: '25123458',
      record_type: 'datecode',
      source_type: 'customer_supplied',
      serial_start: '',
      serial_end: '',
      serials: '',
      datecode: '2024W12',
      quantity: 50,
      note: 'Datecode 收料範例'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, 'transaction_template.xlsx');

}

window.downloadTransactionTemplate = downloadTransactionTemplate;

function showImportResultModal(result) {
  const modal = document.getElementById("importResultModal");
  const title = document.getElementById("importModalTitle");
  const summary = document.getElementById("importModalSummary");
  const errorsBox = document.getElementById("importModalErrors");

  if (!modal) return;

  const count = result.count || 0;
  const failed = result.failed || 0;
  const errors = result.errors || [];

  // 標題
  title.textContent =
    failed === 0
      ? "✅ 匯入成功"
      : "⚠️ 匯入完成（部分失敗）";

  // Summary
  summary.innerHTML = `
    <div>成功匯入：<b>${count}</b> 筆</div>
    <div>失敗筆數：<b>${failed}</b> 筆</div>
  `;

  // Errors
  if (errors.length > 0) {
    errorsBox.textContent = errors.join("\n");
    errorsBox.classList.remove("hidden");
  } else {
    errorsBox.textContent = "";
    errorsBox.classList.add("hidden");
  }

  modal.classList.remove("hidden");
}

function closeImportResultModal() {
  const modal = document.getElementById("importResultModal");
  modal?.classList.add("hidden");
}

window.showImportResultModal = showImportResultModal;
window.closeImportResultModal = closeImportResultModal;


// ============================================================
// 工具函數
// ============================================================
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('zh-TW');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDatecodeQuantity(r) {
  if (r.record_type !== 'datecode') return null;

  const dc = r.datecode || '-';
  const qty = r.quantity ?? r.display_quantity ?? '-';

  return `${dc} (${qty})`;
}

/**
 * 將序號區間展開成完整序號陣列
 * 例：
 *   SN001 ~ SN005 → ["SN001","SN002","SN003","SN004","SN005"]
 */
function expandSerialRange(start, end) {
  const matchStart = start.match(/^([A-Za-z]*)(\d+)$/);
  const matchEnd = end.match(/^([A-Za-z]*)(\d+)$/);

  if (!matchStart || !matchEnd) {
    throw new Error('序號格式錯誤');
  }

  const prefix1 = matchStart[1];
  const prefix2 = matchEnd[1];

  if (prefix1 !== prefix2) {
    throw new Error('起始與結尾序號前綴必須相同');
  }

  const numStart = parseInt(matchStart[2], 10);
  const numEnd = parseInt(matchEnd[2], 10);

  if (numEnd < numStart) {
    throw new Error('結尾序號不可小於起始序號');
  }

  const width = matchStart[2].length;
  const result = [];

  for (let i = numStart; i <= numEnd; i++) {
    result.push(prefix1 + String(i).padStart(width, '0'));
  }

  return result;
}


window.expandSerialRange = expandSerialRange;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatDatecodeQuantity = formatDatecodeQuantity;
// ============================================================
// 客戶切換時重新載入
// ============================================================
if (window.registerCustomerRefreshHandler) {
  window.registerCustomerRefreshHandler("tab-transactions-register", () => {
    console.log("[Transactions Register] 客戶已切換");
    // 如果在交易登記分頁，重新載入最近記錄
    const currentTab = document.getElementById('ttab-register');
    if (currentTab && !currentTab.classList.contains('hidden')) {
      loadRecentTransactions();
    }
  });
}

// ============================================================
// 初始化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // 如果有客戶ID，載入最近交易記錄
  if (window.currentCustomerId) {
    loadRecentTransactions();
  }
});

// ============================================================
// Debug
// ============================================================
globalThis.__transactionDebug = {
  toggleTransactionAdd,
  submitTransaction,
  loadRecentTransactions,
  resetTransactionForm
};
