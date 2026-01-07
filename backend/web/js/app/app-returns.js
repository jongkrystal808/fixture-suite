/**
 * 退料 Returns (v4.x PATCHED)
 * - customer 由 context/header 決定（不再帶 customer_id）
 * - 對齊 receipts v4.x：需要 customer ready 才載入
 * - 表格建議 8 欄：日期/治具/單號/類型/來源/數量(或日期碼)/操作人員/備註
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

function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function labelRecordType(t) {
  const map = { batch: "批量", individual: "個別", datecode: "日期碼" };
  return map[t] || t || "-";
}

function labelSourceType(t) {
  const map = { self_purchased: "自購", customer_supplied: "客供" };
  return map[t] || t || "-";
}

/* ============================================================
 * 分頁狀態
 * ============================================================ */
let returnsPage = 1;
const returnsPageSize = 20;

/* ============================================================
 * 主列表載入（Returns v4.x）
 * ============================================================ */
async function loadReturns() {
  if (!window.currentCustomerId) return;

  const fixture =
    document.getElementById("returnSearchFixture")?.value.trim() || "";
  const order =
    document.getElementById("returnSearchOrder")?.value.trim() || "";
  const operator =
    document.getElementById("returnSearchOperator")?.value.trim() || "";
  const serial =
    document.getElementById("returnSearchSerial")?.value.trim() || "";

  const params = {
    skip: (returnsPage - 1) * returnsPageSize,
    limit: returnsPageSize,
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
  if (serial) params.serial = serial;

  try {
    const data = await apiListReturns(params);

    renderReturnTable(data?.returns || []);
    renderPagination?.(
      "returnPagination",
      data?.total || 0,
      returnsPage,
      returnsPageSize,
      (p) => {
        returnsPage = p;
        loadReturns();
      }
    );
  } catch (err) {
    console.error("loadReturns error:", err);
    toast("退料資料載入失敗", "error");
  }
}
window.loadReturns = loadReturns;

/* ============================================================
 * 渲染退料表格（v4.x）
 * ============================================================ */
function renderReturnTable(rows) {
  const tbody = document.getElementById("returnTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-2 text-gray-400">
          沒有資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    // v4.x：退料顯示重點應該是「數量/日期碼」，不是再秀一次 record_type/datecode 欄位
    let qtyText = "-";
    if (r.record_type === "datecode") {
      qtyText = `${r.datecode || "-"}（${r.quantity || 0} 件）`;
    } else {
      qtyText = `共 ${r.quantity || 0} 件`;
    }

    const id = r.id ?? r.return_id ?? null; // 兼容
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 pr-4">${fmtDateTime(r.created_at)}</td>
      <td class="py-2 pr-4">${r.fixture_id || "-"}</td>
      <td class="py-2 pr-4">${r.order_no || "-"}</td>
      <td class="py-2 pr-4">${labelRecordType(r.record_type)}</td>
      <td class="py-2 pr-4">${labelSourceType(r.source_type)}</td>
      <td class="py-2 pr-4"><div class="serial-cell">${qtyText}</div></td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>
      <td class="py-2 pr-4">${r.note || "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}


/* ============================================================
 * 新增退料（v4.x）
 * ============================================================ */
async function submitReturn() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fixture = document.getElementById("returnAddFixture")?.value.trim();
  const order = document.getElementById("returnAddOrder")?.value.trim();
  const type = document.getElementById("returnAddType")?.value;
  const note = document.getElementById("returnAddNote")?.value.trim();
  const sourceType = document.getElementById("returnAddSourceType")?.value;

  if (!fixture) return toast("治具編號不得為空", "warning");
  if (!type) return toast("請選擇退料類型", "warning");
  if (!sourceType) return toast("請選擇來源類型", "warning");

  const payload = {
    fixture_id: fixture,
    order_no: order || null,
    record_type: type,
    source_type: sourceType,
    note: note || null,
  };

  if (type === "batch") {
    const startRaw = document.getElementById("returnAddStart")?.value.trim();
    const endRaw = document.getElementById("returnAddEnd")?.value.trim();

    const start = Number(startRaw);
    const end = Number(endRaw);

    if (!startRaw || !endRaw) return toast("批量模式需輸入序號起訖", "warning");
    if (!Number.isFinite(start) || !Number.isFinite(end))
      return toast("序號起訖必須為數字", "warning");
    if (end < start) return toast("序號起訖不合法（end < start）", "warning");

    const span = end - start + 1;
    if (span > 5000) return toast("批量序號過多（上限 5000）", "warning");

    payload.serials = [];
    for (let i = start; i <= end; i++) payload.serials.push(String(i));
  } else if (type === "datecode") {
    const datecode = document.getElementById("returnAddDatecode")?.value.trim();
    const quantity = parseInt(
      document.getElementById("returnAddQuantity")?.value.trim() || "0",
      10
    );

    if (!datecode) return toast("請輸入日期碼", "warning");
    if (!quantity || quantity <= 0) return toast("請輸入有效數量", "warning");

    payload.datecode = datecode;
    payload.quantity = quantity;
  } else {
    const raw = document.getElementById("returnAddSerials")?.value.trim();
    if (!raw) return toast("請輸入序號列表", "warning");

    payload.serials = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!payload.serials.length) return toast("序號列表不可為空", "warning");
  }

  try {
    await apiCreateReturn(payload);

    toast("退料新增成功");

    // v4.x：不允許收起的話，這行要拿掉
    // document.getElementById("returnAddForm")?.classList.add("hidden");

    returnsPage = 1;
    loadReturns();
  } catch (err) {
    console.error(err);
    toast(
      "退料新增失敗：" + (err?.data?.detail || err?.message || ""),
      "error"
    );
  }
}
window.submitReturn = submitReturn;

/* ============================================================
 * 匯入 Excel（v4.x）
 * ============================================================ */
async function handleReturnImport(input) {
  const file = input.files?.[0];
  if (!file) return toast("請選擇 Excel (.xlsx) 檔案", "warning");

  if (!window.currentCustomerId) {
    input.value = "";
    return toast("尚未選擇客戶", "warning");
  }

  try {
    toast("正在匯入...");
    const result = await apiImportReturnsXlsx(file);

    toast(`匯入成功，共 ${result?.count || 0} 筆`);
    returnsPage = 1;
    loadReturns();
  } catch (err) {
    console.error("匯入失敗:", err);
    toast(`匯入失敗：${err?.message || ""}`, "error");
  } finally {
    input.value = "";
  }
}
window.handleReturnImport = handleReturnImport;

/* ============================================================
 * 新增表單顯示切換（v4.x）
 * ============================================================ */
function toggleReturnAdd(show = true) {
  const form = document.getElementById("returnAddForm");
  if (!form) return;

  // v4.x：不允許收起
  if (!show) return;

  form.classList.remove("hidden");

  const typeSel = document.getElementById("returnAddType");
  if (typeSel && !typeSel.value) typeSel.value = "batch";

  handleReturnTypeChange();
}
window.toggleReturnAdd = toggleReturnAdd;

/* ============================================================
 * 類型切換 batch / individual / datecode
 * ============================================================ */
function handleReturnTypeChange() {
  const type = document.getElementById("returnAddType")?.value;

  const batchArea = document.getElementById("returnBatchArea");
  const individualArea = document.getElementById("returnIndividualArea");
  const datecodeArea = document.getElementById("returnDatecodeArea");

  batchArea?.classList.add("hidden");
  individualArea?.classList.add("hidden");
  datecodeArea?.classList.add("hidden");

  if (type === "batch") batchArea?.classList.remove("hidden");
  else if (type === "datecode") datecodeArea?.classList.remove("hidden");
  else individualArea?.classList.remove("hidden");
}
window.handleReturnTypeChange = handleReturnTypeChange;

window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("returnAddType")
    ?.addEventListener("change", handleReturnTypeChange);
});

/* ============================================================
 * v4.x：初始化時序
 * - user ready → customer ready → load returns
 * ============================================================ */
onUserReady?.(() => {
  onCustomerReady?.(() => {
    toggleReturnAdd(true);
    loadReturns();
  });
});

/* ============================================================
 * 下載退料 Excel 範本（v4.x）
 * - 無 customer_id
 * - ✅ 必須包含 source_type
 * ============================================================ */
function downloadReturnTemplate() {
  const template = [
    {
      fixture_id: "C-00010",
      order_no: "PO123456",
      record_type: "batch",
      source_type: "customer_supplied",
      serial_start: 1,
      serial_end: 10,
      note: "批量退料示例",
    },
    {
      fixture_id: "L-00018",
      order_no: "PO123457",
      record_type: "individual",
      source_type: "self_purchased",
      serials: "SN001,SN002,SN003",
      note: "個別退料示例",
    },
    {
      fixture_id: "L-00020",
      order_no: "PO123458",
      record_type: "datecode",
      source_type: "customer_supplied",
      datecode: "2024W12",
      quantity: 50,
      note: "日期碼退料示例",
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "return_template");
  XLSX.writeFile(wb, "return_template.xlsx");
}
window.downloadReturnTemplate = downloadReturnTemplate;
