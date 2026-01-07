/**
 * 收料 Receipts (Final v3.8)
 * - v3.8 更新:新增 datecode 類型(日期碼 + 數量)
 * - v3.7 更新:增加 source_type 欄位(自購/客供)
 * - 完全與 Returns 對齊欄位 / DOM / API 結構
 * - 採用 customer_id 作為客戶欄位
 * - 表格為 8 欄:日期/治具/客戶/單號/序號/操作人員/備註/刪除
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
 * 分頁狀態
 * ============================================================ */
let receiptsPage = 1;
const receiptsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */
async function loadReceipts() {
  const fixture = document.getElementById("receiptSearchFixture")?.value.trim() || "";
  const order = document.getElementById("receiptSearchOrder")?.value.trim() || "";
  const operator = document.getElementById("receiptSearchOperator")?.value.trim() || "";
  const serial = document.getElementById("receiptSearchSerial")?.value.trim() || "";
  const sourceType = document.getElementById("receiptSearchSourceType")?.value || "";

  const params = {
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
  if (serial) params.serial = serial;
  if (sourceType) params.source_type = sourceType; // ⭐ 對齊 DB 現況

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
  page = Math.max(1, Math.min(page, totalPages));


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

function formatSerialList(serials) {
  if (!serials) return "-";

  const arr = serials
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  if (arr.length === 0) return "-";

  // 序號很少就原樣顯示
  if (arr.length <= 3) {
    return arr.join(", ");
  }

  // 序號很多：顯示起訖 + 件數，例如：0111 ~ 0130 (20 件)
  const first = arr[0];
  const last = arr[arr.length - 1];
  return `${first} ~ ${last} (${arr.length} 件)`;
}

/* ============================================================
 * 渲染收料表格
 * ============================================================ */
function renderReceiptTable(rows) {
  const tbody = document.getElementById("receiptTable");
  tbody.innerHTML = "";

  if (!rows.length) {
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
    // 序號 / 數量顯示
    let serialText = "-";

    if (r.record_type === "datecode") {
      serialText = `${r.datecode || "-"}（${r.quantity || 0} 件）`;
    } else if (r.record_type === "batch") {
      serialText = `批量（共 ${r.quantity || 0} 件）`;
    } else if (r.record_type === "individual") {
      serialText = `個別（共 ${r.quantity || 0} 件）`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${new Date(r.created_at).toLocaleString()}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">${r.record_type}</td>
      <td class="py-2 pr-4">${r.datecode || "-"}</td>
      <td class="py-2 pr-4">
        <div class="serial-cell">${serialText}</div>
      </td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>
      <td class="py-2 pr-4">${r.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}


async function submitReceipt() {

  const fixture = document.getElementById("receiptAddFixture")?.value.trim();
  const order = document.getElementById("receiptAddOrder")?.value.trim();
  const type = document.getElementById("receiptAddType")?.value;
  const note = document.getElementById("receiptAddNote")?.value.trim();

  if (!fixture) return toast("治具編號不得為空");
  if (!type) return toast("請選擇收料類型");

  const payload = {
    fixture_id: fixture,
    order_no: order || null,
    record_type: type,
    note: note || null
  };

  if (type === "batch") {
    const start = document.getElementById("receiptAddStart")?.value.trim();
    const end = document.getElementById("receiptAddEnd")?.value.trim();
    if (!start || !end) return toast("批量模式需輸入序號起訖");

    payload.serials = [];
    for (let i = Number(start); i <= Number(end); i++) {
      payload.serials.push(String(i));
    }

  } else if (type === "datecode") {
    const datecode = document.getElementById("receiptAddDatecode")?.value.trim();
    const quantity = parseInt(
      document.getElementById("receiptAddQuantity")?.value.trim() || "0"
    );

    if (!datecode) return toast("請輸入日期碼");
    if (!quantity || quantity <= 0) return toast("請輸入有效數量");

    payload.datecode = datecode;
    payload.serials = [String(quantity)];

  } else {
    const raw = document.getElementById("receiptAddSerials")?.value.trim();
    if (!raw) return toast("請輸入序號列表");

    payload.serials = raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  try {
    await apiCreateReceipt(payload);
    toast("收料新增成功");

    document.getElementById("receiptAddForm")?.classList.add("hidden");

    receiptsPage = 1;
    setTimeout(() => loadReceipts(), 0);

  } catch (err) {
    console.error(err);
    toast(
      "收料新增失敗：" + (err?.data?.detail || err.message || ""),
      "error"
    );
  }
}



/* ============================================================
 * 匯入 Excel / CSV
 * ============================================================ */
async function handleReceiptImport(input) {
  const file = input.files[0];
  if (!file) return alert("請選擇 Excel (.xlsx) 檔案");

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsXlsx(file);

    toast(`匯入成功，共 ${result.count || 0} 筆`);
    receiptsPage = 1;
    loadReceipts();

  } catch (err) {
    console.error("匯入失敗:", err);
    toast(`匯入失敗：${err.message}`, "error");
  } finally {
    input.value = "";
  }
}

window.handleReceiptImport = handleReceiptImport;


/* ============================================================
 * 新增表單顯示切換
 * ============================================================ */
/* ============================================================
 * 新增表單顯示切換（v4.x）
 * ============================================================ */
function toggleReceiptAdd(show) {
  const form = document.getElementById("receiptAddForm");
  if (!form) return;

  // 👉 永遠保持展開（不再允許收起）
  if (!show) return;

  form.classList.remove("hidden");

  // 預設收料類型
  const typeSel = document.getElementById("receiptAddType");
  if (typeSel) typeSel.value = "batch";

  // 根據類型顯示對應欄位
  handleReceiptTypeChange();
}

window.toggleReceiptAdd = toggleReceiptAdd;



/* ============================================================
 * 類型切換 batch / individual / datecode
 * ============================================================ */
function handleReceiptTypeChange() {
  const type = document.getElementById("receiptAddType").value;

  const batchArea = document.getElementById("receiptBatchArea");
  const individualArea = document.getElementById("receiptIndividualArea");
  const datecodeArea = document.getElementById("receiptDatecodeArea");  // ★ 新增

  // 全部隱藏
  batchArea.classList.add("hidden");
  individualArea.classList.add("hidden");
  if (datecodeArea) datecodeArea.classList.add("hidden");

  // 根據類型顯示對應區域
  if (type === "batch") {
    batchArea.classList.remove("hidden");
  } else if (type === "datecode") {
    // ★ datecode 模式
    if (datecodeArea) datecodeArea.classList.remove("hidden");
  } else {
    individualArea.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const typeSel = document.getElementById("receiptAddType");
  if (typeSel) typeSel.addEventListener("change", handleReceiptTypeChange);
});

window.handleReceiptTypeChange = handleReceiptTypeChange;


/* ============================================================
 * 匯入範本（v4.x，無 source_type / customer_id）
 * ============================================================ */
function downloadReceiptTemplate() {
  const template = [
    {
      fixture_id: "C-00010",
      order_no: "PO123456",
      record_type: "batch",
      serial_start: 1,
      serial_end: 10,
      note: "批量收料示例"
    },
    {
      fixture_id: "L-00018",
      order_no: "PO123457",
      record_type: "individual",
      serials: "SN001,SN002,SN003",
      note: "個別收料示例"
    },
    {
      fixture_id: "L-00020",
      order_no: "PO123458",
      record_type: "datecode",
      datecode: "2024W12",
      quantity: 50,
      note: "日期碼收料示例"
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");

  XLSX.writeFile(wb, "receipt_template.xlsx");
}

window.downloadReceiptTemplate = downloadReceiptTemplate;
