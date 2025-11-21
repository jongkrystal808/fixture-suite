/**
 * app-returns.js
 * 退料登記前端控制邏輯
 *
 * 功能：
 *   - 子分頁切換（由 app-receipts.js 控制，不需重複）
 *   - 載入退料記錄
 *   - 新增（批量 / 少量）
 *   - 匯入 Excel(.xlsx)
 *   - 刪除退料記錄
 */

/* ============================================================
 * 🔵 表單切換（批量 / 個別序號）
 * ============================================================ */

const returnTypeSelect = document.getElementById("returnAddType");
if (returnTypeSelect) {
  returnTypeSelect.addEventListener("change", () => {
    const type = returnTypeSelect.value;
    document.getElementById("returnBatchArea").classList.toggle("hidden", type !== "batch");
    document.getElementById("returnIndividualArea").classList.toggle("hidden", type !== "individual");
  });
}

/* ============================================================
 * 🔵 新增表單顯示 / 隱藏
 * ============================================================ */

function toggleReturnAdd(show) {
  document.getElementById("returnAddForm").classList.toggle("hidden", !show);
}

/* ============================================================
 * 🔵 下載 Excel 範本
 * ============================================================ */

function downloadReturnTemplate() {
  const headers = [
    ["type", "vendor", "order_no", "fixture_code",
     "serial_start", "serial_end", "serials", "operator", "note"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "return_template");
  XLSX.writeFile(wb, "return_template.xlsx");
}

/* ============================================================
 * 🔵 匯入退料 Excel
 * ============================================================ */

async function handleReturnImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReturnsXlsx(input.files[0]);

    toast(result.message);
    console.log("退料匯入結果：", result);

    loadReturns();
  } catch (err) {
    console.error(err);
    toast("匯入失敗");
  }

  input.value = "";
}

/* ============================================================
 * 🔵 載入退料記錄
 * ============================================================ */

async function loadReturns() {
  const fixture = document.getElementById("returnSearchFixture").value.trim();
  const vendor = document.getElementById("returnSearchVendor").value.trim();
  const order = document.getElementById("returnSearchOrder").value.trim();
  const op = document.getElementById("returnSearchOperator").value.trim();

  const params = {};
  if (fixture) params.fixture_code = fixture;
  if (vendor) params.vendor = vendor;
  if (order) params.order_no = order;
  if (op) params.operator = op;

  const data = await apiListReturns(params);

  const tbody = document.getElementById("returnTable");
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
                onclick="deleteReturn(${row.id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 🔵 新增退料（批量 / 個別）
 * ============================================================ */

async function submitReturn() {
  const vendor = document.getElementById("returnAddVendor").value.trim();
  const order = document.getElementById("returnAddOrder").value.trim();
  const fixture = document.getElementById("returnAddFixture").value.trim();
  const type = document.getElementById("returnAddType").value;

  const serialStart = document.getElementById("returnAddStart").value.trim();
  const serialEnd = document.getElementById("returnAddEnd").value.trim();
  const serials = document.getElementById("returnAddSerials").value.trim();
  const note = document.getElementById("returnAddNote").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    type,
    vendor: vendor || null,
    order_no: order || null,
    fixture_code: fixture,
    operator: null,
    note: note || null
  };

  if (type === "batch") {
    if (!serialStart || !serialEnd) {
      return toast("批量模式需要序號起始與結束");
    }
    payload.serial_start = serialStart;
    payload.serial_end = serialEnd;
  }

  if (type === "individual") {
    if (!serials) return toast("請輸入序號列表（逗號分隔）");
    payload.serials = serials;
  }

  try {
    await apiCreateReturn(payload);
    toast("新增退料成功");
    toggleReturnAdd(false);
    loadReturns();
  } catch (err) {
    console.error(err);
    toast("新增失敗");
  }
}

/* ============================================================
 * 🔵 刪除退料記錄
 * ============================================================ */

async function deleteReturn(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteReturn(id);
    toast("刪除成功");
    loadReturns();
  } catch (err) {
    toast("刪除失敗");
  }
}
