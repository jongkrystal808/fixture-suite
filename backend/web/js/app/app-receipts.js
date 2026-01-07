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
 * 主列表載入（v4.x）
 * ============================================================ */
async function loadReceipts() {
  const fixture = document.getElementById("receiptSearchFixture")?.value.trim() || "";
  const order = document.getElementById("receiptSearchOrder")?.value.trim() || "";
  const operator = document.getElementById("receiptSearchOperator")?.value.trim() || "";
  const serial = document.getElementById("receiptSearchSerial")?.value.trim() || "";

  const params = {
    skip: (receiptsPage - 1) * receiptsPageSize,
    limit: receiptsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
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

/* ============================================================
 * 渲染收料表格（v4.x）
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
    let qtyText = "-";

    if (r.record_type === "datecode") {
      qtyText = `${r.datecode || "-"}（${r.quantity || 0} 件）`;
    } else {
      qtyText = `共 ${r.quantity || 0} 件`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${new Date(r.created_at).toLocaleString()}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">${r.record_type}</td>
      <td class="py-2 pr-4">${r.source_type || "-"}</td>
      <td class="py-2 pr-4">${qtyText}</td>
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
  const fixture = document.getElementById("receiptAddFixture")?.value.trim();
  const order = document.getElementById("receiptAddOrder")?.value.trim();
  const type = document.getElementById("receiptAddType")?.value;
  const sourceType = document.getElementById("receiptAddSourceType")?.value;
  const note = document.getElementById("receiptAddNote")?.value.trim();

  if (!fixture) return toast("治具編號不得為空");
  if (!type) return toast("請選擇收料類型");
  if (!sourceType) return toast("請選擇來源類型");

  const payload = {
    fixture_id: fixture,
    order_no: order || null,
    record_type: type,
    source_type: sourceType,
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
    payload.quantity = quantity;

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
 * 匯入 Excel（v4.x）
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
 * 新增表單顯示切換（v4.x）
 * ============================================================ */
function toggleReceiptAdd(show) {
  const form = document.getElementById("receiptAddForm");
  if (!form) return;

  if (!show) return; // v4.x：不允許收起

  form.classList.remove("hidden");

  const typeSel = document.getElementById("receiptAddType");
  if (typeSel) typeSel.value = "batch";

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

  if (type === "batch") {
    batchArea?.classList.remove("hidden");
  } else if (type === "datecode") {
    datecodeArea?.classList.remove("hidden");
  } else {
    individualArea?.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("receiptAddType")
    ?.addEventListener("change", handleReceiptTypeChange);
});

window.handleReceiptTypeChange = handleReceiptTypeChange;


/* ============================================================
 * 匯入範本（v4.x，必含 source_type）
 * ============================================================ */
function downloadReceiptTemplate() {
  const template = [
    {
      fixture_id: "C-00010",
      order_no: "PO123456",
      record_type: "batch",
      source_type: "customer_supplied",
      serial_start: 1,
      serial_end: 10,
      note: "批量收料示例"
    },
    {
      fixture_id: "L-00018",
      order_no: "PO123457",
      record_type: "individual",
      source_type: "self_purchased",
      serials: "SN001,SN002,SN003",
      note: "個別收料示例"
    },
    {
      fixture_id: "L-00020",
      order_no: "PO123458",
      record_type: "datecode",
      source_type: "customer_supplied",
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


