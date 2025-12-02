/**
 * 收料 Receipts (Final v3.6)
 * - 完全與 Returns 對齊欄位 / DOM / API 結構
 * - 採用 customer_id 作為客戶欄位
 * - 表格為 8 欄：日期/治具/客戶/單號/序號/操作人員/備註/刪除
 */
function formatSerialsIntoRows(serialsArray, perRow = 5) {
  if (!Array.isArray(serialsArray)) return serialsArray;

  let rows = [];
  for (let i = 0; i < serialsArray.length; i += perRow) {
    rows.push(serialsArray.slice(i, i + perRow).join(", "));
  }
  return rows.join("<br>");
}

/* ============================================================
 * 取得 customer_id
 * ============================================================ */
function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 分頁狀態
 * ============================================================ */
let receiptsPage = 1;
const receiptsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */
async function loadReceipts() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return console.warn("尚未選擇客戶");

  const fixture = document.getElementById("receiptSearchFixture")?.value.trim() || "";
  const order = document.getElementById("receiptSearchOrder")?.value.trim() || "";
  const operator = document.getElementById("receiptSearchOperator")?.value.trim() || "";
  const vendor = document.getElementById("receiptSearchCustomer")?.value.trim() || "";
  const serial = document.getElementById("receiptSearchSerial")?.value.trim() || "";

  const params = {
    customer_id,
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
  if (vendor) params.customer = vendor;
  if (serial) params.serial = serial;

  try {
    const data = await apiListReceipts(params);

    renderReceiptTable(data.receipts || []);
    renderPagination(
      "receiptPagination",
      data.total || 0,
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
function renderPagination(targetId, total, page, pageSize, onClick) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = "";
  if (total <= pageSize) return;

  const totalPages = Math.ceil(total / pageSize);
  const maxButtons = 11;  // 顯示最多 11 個按鈕（含 ...）

  function addBtn(label, p, active = false, disabled = false) {
    const btn = document.createElement("button");
    btn.innerText = label;

    btn.className =
      "btn btn-xs mx-1 " +
      (active ? "btn-primary" : "btn-ghost");

    if (disabled) btn.disabled = true;

    btn.onclick = () => !disabled && onClick(p);
    el.appendChild(btn);
  }

  // 上一頁
  addBtn("‹", page - 1, false, page === 1);

  // 顯示範圍
  let start = Math.max(1, page - 4);
  let end = Math.min(totalPages, page + 4);

  if (page <= 5) {
    end = Math.min(10, totalPages);
  }

  if (page >= totalPages - 4) {
    start = Math.max(1, totalPages - 9);
  }

  // 第一頁
  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null, false, true);
  }

  // 中間頁
  for (let p = start; p <= end; p++) {
    addBtn(p, p, p === page);
  }

  // 最後一頁
  if (end < totalPages) {
    if (end < totalPages - 1) addBtn("...", null, false, true);
    addBtn(totalPages, totalPages);
  }

  // 下一頁
  addBtn("›", page + 1, false, page === totalPages);
}


/* ============================================================
 * 渲染收料表格（8 欄版）
 * ============================================================ */
function renderReceiptTable(rows) {
  const tbody = document.getElementById("receiptTable");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center py-2 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(r => {
    // ★ 統一序號顯示：永遠優先使用 serial_list
    const serialText = r.serial_list ? r.serial_list : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.transaction_date || ""}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.customer_id || "-"}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">
        <div class="serial-cell">${serialText}</div>
      </td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>
      <td class="py-2 pr-4">${r.note || "-"}</td>
        <button class="btn btn-ghost text-xs" onclick="deleteReceipt(${r.id})">刪除</button>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 新增收料（與退料完全同規格）
 * ============================================================ */
async function submitReceipt() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const fixture = document.getElementById("receiptAddFixture").value.trim();
  const order = document.getElementById("receiptAddOrder").value.trim();
  const customer = document.getElementById("receiptAddCustomer").value.trim();
  const type = document.getElementById("receiptAddType").value;
  const note = document.getElementById("receiptAddNote").value.trim();

  const serialStart = document.getElementById("receiptAddStart").value.trim();
  const serialEnd = document.getElementById("receiptAddEnd").value.trim();
  const serials = document.getElementById("receiptAddSerials").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    customer_id,
    fixture_id: fixture,
    order_no: order || null,
    customer: customer || null,
    type,
    note: note || null
  };

  if (type === "batch") {
    if (!serialStart || !serialEnd)
      return toast("批量模式需輸入序號起訖");
    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  } else {
    if (!serials)
      return toast("請輸入序號列表（以逗號分隔）");
    payload.serials = serials;
  }

  try {
    await apiCreateReceipt(payload);
    toast("收料新增成功");
    document.getElementById("receiptAddForm").classList.add("hidden");
    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("收料新增失敗", "error");
  }
}

/* ============================================================
 * 刪除收料（與退料相同）
 * ============================================================ */
async function deleteReceipt(id) {
  if (!confirm("確認刪除此收料記錄？")) return;

  const customer_id = getCurrentCustomerId();

  try {
    await apiDeleteReceipt(id, customer_id);
    toast("刪除成功");
    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel / CSV
 * ============================================================ */
async function handleReceiptImport(input) {
  const file = input.files[0];
  if (!file) return alert("請選擇 Excel 或 CSV 檔案");

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return alert("請先選擇客戶");

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsCsv(file, customer_id);

    alert(`匯入成功，共 ${result.count || 0} 筆記錄`);
    loadReceipts();
  } catch (err) {
    console.error("匯入失敗：", err);
    alert(`匯入失敗：${err.message}`);
  } finally {
    input.value = "";
  }
}

window.handleReceiptImport = handleReceiptImport;

/* ============================================================
 * 新增表單顯示切換
 * ============================================================ */
function toggleReceiptAdd(show) {
  const form = document.getElementById("receiptAddForm");
  if (!form) return;

  if (show) {
    form.classList.remove("hidden");
    const typeSel = document.getElementById("receiptAddType");
    if (typeSel) typeSel.value = "batch";
    handleReceiptTypeChange();
  } else {
    form.classList.add("hidden");
  }
}
window.toggleReceiptAdd = toggleReceiptAdd;

/* ============================================================
 * 類型切換 batch / individual
 * ============================================================ */
function handleReceiptTypeChange() {
  const type = document.getElementById("receiptAddType").value;

  const batchArea = document.getElementById("receiptBatchArea");
  const individualArea = document.getElementById("receiptIndividualArea");

  if (type === "batch") {
    batchArea.classList.remove("hidden");
    individualArea.classList.add("hidden");
  } else {
    batchArea.classList.add("hidden");
    individualArea.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const typeSel = document.getElementById("receiptAddType");
  if (typeSel) typeSel.addEventListener("change", handleReceiptTypeChange);
});

window.handleReceiptTypeChange = handleReceiptTypeChange;

/* ============================================================
 * 匯出範本
 * ============================================================ */
function downloadReceiptTemplate() {
  const template = [
    {
      fixture_id: "C-00010",
      customer_id: "moxa",
      order_no: "PO123456",
      type: "batch",
      serial_start: 1,
      serial_end: 10,
      note: "示例備註"
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");

  XLSX.writeFile(wb, "receipt_template.xlsx");
}

window.downloadReceiptTemplate = downloadReceiptTemplate;
