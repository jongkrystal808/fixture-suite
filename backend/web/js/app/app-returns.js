/**
 * 退料 Returns (Final v3.8)
 * - v3.8 更新:新增 datecode 類型(日期碼 + 數量)
 * - v3.7 更新:增加 source_type 顯示(系統自動識別)
 * - 移除 vendor 欄位
 * - 完全採用 customer_id(與 receipts 一致)
 * - 表格為 9 欄:日期/治具/客戶/單號/來源/序號/操作人員/備註/刪除
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
let returnsPage = 1;
const returnsPageSize = 20;


/* ============================================================
 * 主列表載入（Returns v4.x）
 * ============================================================ */
async function loadReturns() {
  const fixture = document.getElementById("returnSearchFixture")?.value.trim() || "";
  const order = document.getElementById("returnSearchOrder")?.value.trim() || "";
  const operator = document.getElementById("returnSearchOperator")?.value.trim() || "";
  const serial = document.getElementById("returnSearchSerial")?.value.trim() || "";

  const params = {
    skip: (returnsPage - 1) * returnsPageSize,
    limit: returnsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (operator) params.operator = operator;
  if (serial) params.serial = serial;

  try {
    const data = await apiListReturns(params);

    renderReturnTable(data.returns || []);
    renderPagination(
      "returnPagination",
      data.total || 0,
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


/* ============================================================
 * 渲染退料表格（v4.x）
 * ============================================================ */
function renderReturnTable(rows) {
  const tbody = document.getElementById("returnTable");
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
      <td class="py-2 pr-4"><div class="serial-cell">${serialText}</div></td>
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
  const fixture = document.getElementById("returnAddFixture")?.value.trim();
  const order = document.getElementById("returnAddOrder")?.value.trim();
  const type = document.getElementById("returnAddType")?.value;
  const note = document.getElementById("returnAddNote")?.value.trim();
  const sourceType = document.getElementById("returnAddSourceType")?.value;

  if (!fixture) return toast("治具編號不得為空");
  if (!type) return toast("請選擇退料類型");
  if (!sourceType) return toast("請選擇來源類型");

  const payload = {
    fixture_id: fixture,
    order_no: order || null,
    record_type: type,
    source_type: sourceType,
    note: note || null
  };

  if (type === "batch") {
    const start = document.getElementById("returnAddStart")?.value.trim();
    const end = document.getElementById("returnAddEnd")?.value.trim();
    if (!start || !end) return toast("批量模式需輸入序號起訖");

    payload.serials = [];
    for (let i = Number(start); i <= Number(end); i++) {
      payload.serials.push(String(i));
    }

  } else if (type === "datecode") {
    const datecode = document.getElementById("returnAddDatecode")?.value.trim();
    const quantity = parseInt(
      document.getElementById("returnAddQuantity")?.value.trim() || "0",
      10
    );

    if (!datecode) return toast("請輸入日期碼");
    if (!quantity || quantity <= 0) return toast("請輸入有效數量");

    payload.datecode = datecode;
    payload.quantity = quantity;

  } else {
    const raw = document.getElementById("returnAddSerials")?.value.trim();
    if (!raw) return toast("請輸入序號列表");

    payload.serials = raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
  }

  try {
    await apiCreateReturn(payload);

    toast("退料新增成功");

    document.getElementById("returnAddForm")?.classList.add("hidden");

    returnsPage = 1;
    loadReturns();

  } catch (err) {
    console.error(err);
    toast(
      "退料新增失敗：" + (err?.data?.detail || err.message || ""),
      "error"
    );
  }
}


/* ============================================================
 * 匯入 Excel（v4.x）
 * ============================================================ */
async function handleReturnImport(input) {
  const file = input.files[0];
  if (!file) return alert("請選擇 Excel (.xlsx) 檔案");

  try {
    toast("正在匯入...");
    const result = await apiImportReturnsXlsx(file);

    toast(`匯入成功，共 ${result.count || 0} 筆`);
    returnsPage = 1;
    loadReturns();

  } catch (err) {
    console.error("匯入失敗:", err);
    toast(`匯入失敗：${err.message}`, "error");
  } finally {
    input.value = "";
  }
}

window.handleReturnImport = handleReturnImport;

/* ============================================================
 * 新增表單顯示切換（v4.x）
 * ============================================================ */
function toggleReturnAdd(show) {
  const form = document.getElementById("returnAddForm");
  if (!form) return;

  // 👉 v4.x：不允許收起
  if (!show) return;

  form.classList.remove("hidden");

  const typeSel = document.getElementById("returnAddType");
  if (typeSel) typeSel.value = "batch";

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
    .getElementById("returnAddType")
    ?.addEventListener("change", handleReturnTypeChange);
});

window.handleReturnTypeChange = handleReturnTypeChange;


/* ============================================================
 * 下載退料 Excel 範本（v4.x）
 * - 無 customer_id
 * - ✅ 必須包含 source_type
 * - 對齊 /returns/import
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
      note: "批量退料示例"
    },
    {
      fixture_id: "L-00018",
      order_no: "PO123457",
      record_type: "individual",
      source_type: "self_purchased",
      serials: "SN001,SN002,SN003",
      note: "個別退料示例"
    },
    {
      fixture_id: "L-00020",
      order_no: "PO123458",
      record_type: "datecode",
      source_type: "customer_supplied",
      datecode: "2024W12",
      quantity: 50,
      note: "日期碼退料示例"
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(template);
  XLSX.utils.book_append_sheet(wb, ws, "return_template");

  XLSX.writeFile(wb, "return_template.xlsx");
}

window.downloadReturnTemplate = downloadReturnTemplate;


/* ============================================================
 * Pagination（共用）
 * ============================================================ */
function renderPagination(targetId, total, page, pageSize, onClick) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = "";
  if (total <= pageSize) return;

  const totalPages = Math.ceil(total / pageSize);

  function addBtn(label, p, active = false, disabled = false) {
    const btn = document.createElement("button");
    btn.innerText = label;
    btn.className =
      "btn btn-xs mx-1 " + (active ? "btn-primary" : "btn-ghost");

    if (disabled) btn.disabled = true;
    btn.onclick = () => !disabled && onClick(p);
    el.appendChild(btn);
  }

  addBtn("‹", page - 1, false, page === 1);

  let start = Math.max(1, page - 4);
  let end = Math.min(totalPages, page + 4);

  if (page <= 5) end = Math.min(10, totalPages);
  if (page >= totalPages - 4) start = Math.max(1, totalPages - 9);

  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null, false, true);
  }

  for (let p = start; p <= end; p++) {
    addBtn(p, p, p === page);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) addBtn("...", null, false, true);
    addBtn(totalPages, totalPages);
  }

  addBtn("›", page + 1, false, page === totalPages);
}


