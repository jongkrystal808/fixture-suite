/**
 * 收料 Receipts (v4.x PATCHED)
 * - customer 由 context/header 決定（不再帶 customer_id）
 * - 對齊 v4.x：需要 customer ready 才載入
 * - 表格欄位（建議 8 欄）：日期/治具/單號/類型/來源/數量/操作人員/備註
 */

/* ============================================================
 * Utils
 * ============================================================ */
function formatSerialsIntoRows(serialsArray, perRow = 5) {
  if (!Array.isArray(serialsArray)) return serialsArray;
  const rows = [];
  for (let i = 0; i < serialsArray.length; i += perRow) {
    rows.push(serialsArray.slice(i, i + perRow).join(", "));
  }
  return rows.join("<br>");
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("zh-TW");
}


function labelRecordType(t) {
  const map = { batch: "批量", individual: "個別", datecode: "datecode" };
  return map[t] || t || "-";
}

function labelSourceType(t) {
  const map = { self_purchased: "自購", customer_supplied: "客供" };
  return map[t] || t || "-";
}

/* ============================================================
 * 分頁狀態
 * ============================================================ */
let receiptsPage = 1;
const receiptsPageSize = 20;

/* ============================================================
 * 🔹 收料區子分頁切換（⭐ 新增在這裡）
 * ============================================================ */
function showReceiptSubTab(id) {
  const subTabs = [
    "rtab-receipts",
    "rtab-returns",
    "viewSerialTab",
    "viewAllTab",
  ];

  subTabs.forEach(tid => {
    document.getElementById(tid)?.classList.add("hidden");
  });

  document.getElementById(id)?.classList.remove("hidden");

  if (id === "rtab-receipts") {
    loadReceipts();
  } else if (id === "rtab-returns") {
    loadReturns();
  } else if (id === "viewSerialTab") {
    loadTransactionViewSerial(1);
  } else if (id === "viewAllTab") {
    loadTransactionViewAll(1);
  }
}

// ⚠️ 一定要掛到 window，HTML onclick 才找得到
window.showReceiptSubTab = showReceiptSubTab;

/* ============================================================
 * v4.x：初始化時序
 * ============================================================ */
onUserReady?.(() => {
  onCustomerReady?.(() => {
    // 預設顯示收料登記
    showReceiptSubTab("rtab-receipts");
  });
});

/* ============================================================
 * 主列表載入（v4.x）
 * ============================================================ */
async function loadReceipts() {
  // v4.x：需要 customer context
  if (!window.currentCustomerId) return;

  const fixture =
    document.getElementById("receiptSearchFixture")?.value.trim() || "";
  const order =
    document.getElementById("receiptSearchOrder")?.value.trim() || "";
  const operator =
    document.getElementById("receiptSearchOperator")?.value.trim() || "";
  const serial =
    document.getElementById("receiptSearchSerial")?.value.trim() || "";

  const params = {
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize,
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
  if (serial) params.serial = serial;

  try {
    const data = await apiListReceipts(params);

    renderReceiptTable(data?.receipts || []);
    console.log("[DEBUG] apiListReceipts result =", data);
    renderPagination?.(
      "receiptPagination",
      data?.total || 0,
      receiptsPage,
      receiptsPageSize,
      (p) => {
        receiptsPage = p;
        loadReceipts();
      }
    );
  } catch (err) {
    console.error("loadReceipts error:", err);
    toast("收料資料載入失敗", "error");
  }
}
window.loadReceipts = loadReceipts;

/* ============================================================
 * 渲染收料表格（v4.x）
 * ============================================================ */
function renderReceiptTable(rows) {
  const tbody = document.getElementById("receiptTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-2 text-gray-400">
          沒有資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    // ⭐ v4.x：後端已經算好
    const quantityText = r.quantity ?? "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${fmtDate(r.transaction_date)}</td>
      <td class="py-2 pr-4">${r.fixture_id || "-"}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">${labelRecordType(r.record_type)}</td>
      <td class="py-2 pr-4">${labelSourceType(r.source_type)}</td>
      <td class="py-2 pr-4">${quantityText}</td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>
      <td class="py-2 pr-4">${r.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
 * 新增收料（v4.x）
 * ============================================================ */
async function submitReceipt() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fixture = document.getElementById("receiptAddFixture")?.value.trim();
  const order = document.getElementById("receiptAddOrder")?.value.trim();
  const type = document.getElementById("receiptAddType")?.value;
  const sourceType = document.getElementById("receiptAddSourceType")?.value;
  const note = document.getElementById("receiptAddNote")?.value.trim();

  if (!fixture) return toast("治具編號不得為空", "warning");
  if (!type) return toast("請選擇收料類型", "warning");
  if (!sourceType) return toast("請選擇來源類型", "warning");

  const payload = {
    fixture_id: fixture,
    order_no: order || null,
    record_type: type,
    source_type: sourceType,
    note: note || null,
  };

  /* ============================================================
   * 工具：解析「前綴 + 數字」序號（batch 用）
   * ============================================================ */
  function parseSerial(serial) {
    const m = serial.match(/^(.*?)(\d+)$/);
    if (!m) return null;
    return {
      prefix: m[1],
      number: parseInt(m[2], 10),
      width: m[2].length,
    };
  }

  /* ============================================================
   * batch：英數序號範圍
   * ============================================================ */
  if (type === "batch") {
    const startRaw = document.getElementById("receiptAddStart")?.value.trim();
    const endRaw = document.getElementById("receiptAddEnd")?.value.trim();

    if (!startRaw || !endRaw) {
      return toast("批量模式需輸入序號起訖", "warning");
    }

    const s1 = parseSerial(startRaw);
    const s2 = parseSerial(endRaw);

    if (!s1 || !s2) {
      return toast("序號格式錯誤（需為 前綴+數字，如 SM001）", "warning");
    }

    if (s1.prefix !== s2.prefix) {
      return toast("序號起訖前綴必須一致", "warning");
    }

    if (s2.number < s1.number) {
      return toast("序號起訖不合法（結束小於起始）", "warning");
    }

    const count = s2.number - s1.number + 1;
    if (count > 5000) {
      return toast("批量序號過多（上限 5000）", "warning");
    }

    payload.serials = [];
    for (let i = s1.number; i <= s2.number; i++) {
      payload.serials.push(
        s1.prefix + String(i).padStart(s1.width, "0")
      );
    }
  }

  /* ============================================================
   * datecode
   * ============================================================ */
  else if (type === "datecode") {
    const datecode = document.getElementById("receiptAddDatecode")?.value.trim();
    const quantity = parseInt(
      document.getElementById("receiptAddQuantity")?.value.trim() || "0",
      10
    );

    if (!datecode) return toast("請輸入 datecode", "warning");
    if (!quantity || quantity <= 0) return toast("請輸入有效數量", "warning");

    payload.datecode = datecode;
    payload.quantity = quantity;
  }

  /* ============================================================
   * individual：自由英數序號（只做最小驗證）
   * ============================================================ */
  else {
    const raw = document.getElementById("receiptAddSerials")?.value.trim();
    if (!raw) return toast("請輸入序號列表", "warning");

    payload.serials = raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (!payload.serials.length) {
      return toast("序號列表不可為空", "warning");
    }
  }

  /* ============================================================
   * 提交
   * ============================================================ */
  try {
    await apiCreateReceipt(payload);
    toast("收料新增成功");

    receiptsPage = 1;
    loadReceipts();
  } catch (err) {
    console.error(err);
    toast(
      "收料新增失敗：" + (err?.data?.detail || err?.message || ""),
      "error"
    );
  }
}

window.submitReceipt = submitReceipt;


/* ============================================================
 * 匯入 Excel（v4.x）
 * ============================================================ */
async function handleReceiptImport(input) {
  const file = input.files?.[0];
  if (!file) return toast("請選擇 Excel (.xlsx) 檔案", "warning");

  if (!window.currentCustomerId) {
    input.value = "";
    return toast("尚未選擇客戶", "warning");
  }

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsXlsx(file);

    const successCount = result?.count || 0;
    const errors = Array.isArray(result?.errors) ? result.errors : [];
    const failedCount = errors.length;

    // 🔴 重點：不再用 toast 顯示結果，改用強制閱讀彈窗
    showImportResultModal({
      success: successCount,
      failed: failedCount,
      errors,
    });

    receiptsPage = 1;
    loadReceipts();

  } catch (err) {
    console.error("匯入失敗:", err);

    // 只有系統級錯誤才會進這裡
    showImportResultModal({
      success: 0,
      failed: 1,
      errors: [err?.message || "系統錯誤，請查看後端 log"],
    });

  } finally {
    input.value = "";
  }
}

window.handleReceiptImport = handleReceiptImport;


/* ============================================================
 * 新增表單顯示切換（v4.x）
 * - v4.x：預設永遠展開（不允許收起）
 * ============================================================ */
function toggleReceiptAdd(show = true) {
  const form = document.getElementById("receiptAddForm");
  if (!form) return;

  if (!show) return; // v4.x：不允許收起
  form.classList.remove("hidden");

  const typeSel = document.getElementById("receiptAddType");
  if (typeSel && !typeSel.value) typeSel.value = "batch";

  handleReceiptTypeChange();
}
window.toggleReceiptAdd = toggleReceiptAdd;

/* ============================================================
 * 類型切換（batch / individual / datecode）
 * ============================================================ */
function handleReceiptTypeChange() {
  const type = document.getElementById("receiptAddType")?.value;

  const batchArea = document.getElementById("receiptBatchArea");
  const individualArea = document.getElementById("receiptIndividualArea");
  const datecodeArea = document.getElementById("receiptDatecodeArea");

  batchArea?.classList.add("hidden");
  individualArea?.classList.add("hidden");
  datecodeArea?.classList.add("hidden");

  if (type === "batch") batchArea?.classList.remove("hidden");
  else if (type === "datecode") datecodeArea?.classList.remove("hidden");
  else individualArea?.classList.remove("hidden");
}
window.handleReceiptTypeChange = handleReceiptTypeChange;

/* ============================================================
 * v4.x：初始化時序
 * - user ready → customer ready → load receipts
 * ============================================================ */
onUserReady?.(() => {
  onCustomerReady?.(() => {
    toggleReceiptAdd(true);
    // 預設載入列表（切回 tab 也會再呼叫）
    loadReceipts();
  });
});

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("receiptAddType")
    ?.addEventListener("change", handleReceiptTypeChange);
});

/* ============================================================
 * 匯入範本（v4.x｜收料）
 * - ❌ 不包含 customer / customer_id
 * - ✅ batch / individual 一律使用 serials
 * - ✅ datecode 使用 datecode + quantity
 * ============================================================ */
function downloadReceiptTemplate() {
  const template = [
    // =========================
    // batch（批量收料）
    // =========================
    {
      fixture_id: "C-00010",
      order_no: "PO123456",
      record_type: "batch",
      source_type: "customer_supplied",
      serials: "SM001,SM002,SM003,SM004,SM005",
      note: "批量收料示例",
    },

    // =========================
    // individual（個別序號）
    // =========================
    {
      fixture_id: "L-00018",
      order_no: "PO123457",
      record_type: "individual",
      source_type: "self_purchased",
      serials: "SN001,SN002,SN003",
      note: "個別收料示例",
    },

    // =========================
    // datecode
    // =========================
    {
      fixture_id: "L-00020",
      order_no: "PO123458",
      record_type: "datecode",
      source_type: "customer_supplied",
      datecode: "2024W12",
      quantity: 50,
      note: "datecode 收料示例",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");
  XLSX.writeFile(wb, "receipt_template.xlsx");
}
window.downloadReceiptTemplate = downloadReceiptTemplate;


function showImportResultModal({ success, failed, errors }) {
  let modal = document.getElementById("importResultModal");

  // -----------------------------
  // 第一次：建立 Modal
  // -----------------------------
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "importResultModal";
    modal.innerHTML = `
      <div class="import-modal-backdrop"></div>
      <div class="import-modal-box">
        <h3>匯入結果</h3>
        <div class="import-modal-summary"></div>
        <pre class="import-modal-errors"></pre>
        <div class="import-modal-actions">
          <button type="button" onclick="closeImportResultModal()">確認</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // -----------------------------
  // ⚠️ 重點：從 modal 內找元素
  // -----------------------------
  const summaryEl = modal.querySelector(".import-modal-summary");
  const errorsEl  = modal.querySelector(".import-modal-errors");

  summaryEl.textContent = `成功 ${success} 筆，失敗 ${failed} 筆`;

  if (errors && errors.length > 0) {
    errorsEl.textContent = errors.join("\n");
    errorsEl.style.display = "block";
  } else {
    errorsEl.style.display = "none";
  }

  modal.style.display = "block";
}

function closeImportResultModal() {
  const modal = document.getElementById("importResultModal");
  if (modal) modal.style.display = "none";
}
