/**
 * app-receipts.js
 * 收料登記前端控制邏輯
 *
 * 功能：
 *   - 子分頁切換（收料 / 退料）
 *   - 載入收料記錄
 *   - 新增（批量 / 少量）
 *   - 匯入 Excel(.xlsx)
 *   - 刪除記錄
 */

/* ============================================================
 * 🔵 子分頁切換（收料 / 退料）
 * ============================================================ */

document.querySelectorAll("[data-rtab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-rtab]").forEach(b => b.classList.remove("subtab-active"));
    btn.classList.add("subtab-active");

    const tab = btn.dataset.rtab;

    document.querySelectorAll("#rtab-receipts, #rtab-returns")
      .forEach(sec => sec.classList.add("hidden"));

    document.querySelector(`#rtab-${tab}`).classList.remove("hidden");
  });
});

/* ============================================================
 * 🔵 表單切換（批量 / 個別序號）
 * ============================================================ */

const receiptTypeSelect = document.getElementById("receiptAddType");
if (receiptTypeSelect) {
  receiptTypeSelect.addEventListener("change", () => {
    const type = receiptTypeSelect.value;
    document.getElementById("receiptBatchArea").classList.toggle("hidden", type !== "batch");
    document.getElementById("receiptIndividualArea").classList.toggle("hidden", type !== "individual");
  });
}

/* ============================================================
 * 🔵 收料：新增表單開關
 * ============================================================ */

function toggleReceiptAdd(show) {
  document.getElementById("receiptAddForm").classList.toggle("hidden", !show);
}

/* ============================================================
 * 🔵 收料：下載 Excel 範本
 * ============================================================ */

function downloadReceiptTemplate() {
  const headers = [
    ["type", "vendor", "order_no", "fixture_code",
     "serial_start", "serial_end", "serials", "operator", "note"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "receipt_template");
  XLSX.writeFile(wb, "receipt_template.xlsx");
}

/* ============================================================
 * 🔵 收料：匯入 Excel
 * ============================================================ */

async function handleReceiptImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReceiptsXlsx(input.files[0]);

    toast(result.message);
    console.log("匯入結果：", result);

    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("匯入失敗");
  }

  input.value = "";
}

/* ============================================================
 * 🔵 收料：載入列表
 * ============================================================ */

async function loadReceipts() {
  const fixture = document.getElementById("receiptSearchFixture").value.trim();
  const vendor = document.getElementById("receiptSearchVendor").value.trim();
  const order = document.getElementById("receiptSearchOrder").value.trim();
  const op = document.getElementById("receiptSearchOperator").value.trim();

  const params = {};
  if (fixture) params.fixture_code = fixture;
  if (vendor) params.vendor = vendor;
  if (order) params.order_no = order;
  if (op) params.operator = op;

  const data = await apiListReceipts(params);

  const tbody = document.getElementById("receiptTable");
  tbody.innerHTML = "";

  data.forEach(row => {
    const serialDisplay = row.type === "batch"
      ? `${row.serial_start} ~ ${row.serial_end}`
      : row.serials;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${row.created_at || ""}</td>
      <td class="py-2 pr-4">${row.fixture_code || ""}</td>
      <td class="py-2 pr-4">${row.vendor || ""}</td>
      <td class="py-2 pr-4">${row.order_no || ""}</td>
      <td class="py-2 pr-4">${serialDisplay || ""}</td>
      <td class="py-2 pr-4">${row.operator || ""}</td>
      <td class="py-2 pr-4">${row.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteReceipt(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 🔵 收料：送出新增（含批量 / 個別）
 * ============================================================ */

async function submitReceipt() {
  const vendor = document.getElementById("receiptAddVendor").value.trim();
  const order = document.getElementById("receiptAddOrder").value.trim();
  const fixture = document.getElementById("receiptAddFixture").value.trim();
  const type = document.getElementById("receiptAddType").value;

  const serialStart = document.getElementById("receiptAddStart").value.trim();
  const serialEnd = document.getElementById("receiptAddEnd").value.trim();
  const serials = document.getElementById("receiptAddSerials").value.trim();
  const note = document.getElementById("receiptAddNote").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    type: type,
    vendor: vendor || null,
    order_no: order || null,
    fixture_code: fixture,
    operator: null,
    note: note || null
  };

  // 批量模式
  if (type === "batch") {
    if (!serialStart || !serialEnd) {
      return toast("批量模式需要序號起始與結束");
    }
    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  }

  // 個別模式
  if (type === "individual") {
    if (!serials) return toast("請輸入序號列表（逗號分隔）");
    payload.serials = serials;
  }

  try {
    await apiCreateReceipt(payload);
    toast("新增收料成功");
    toggleReceiptAdd(false);
    loadReceipts();
  } catch (err) {
    console.error(err);
    toast("新增失敗");
  }
}

/* ============================================================
 * 🔵 收料：刪除
 * ============================================================ */

async function deleteReceipt(id) {
  if (!confirm("確認刪除？")) return;
  try {
    await apiDeleteReceipt(id);
    toast("刪除成功");
    loadReceipts();
  } catch (err) {
    toast("刪除失敗");
  }
}
