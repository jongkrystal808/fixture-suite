/**
 * 退料 Returns (Final v3.6)
 * - 移除 vendor 欄位
 * - 完全採用 customer_id（與 receipts 一致）
 * - 修正所有 DOM id，完全對齊 index.html
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
let returnsPage = 1;
const returnsPageSize = 20;

/* ============================================================
 * 主列表載入
 * ============================================================ */
async function loadReturns() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return console.warn("尚未選擇客戶");

  const fixture = document.getElementById("returnSearchFixture")?.value.trim() || "";
  const order = document.getElementById("returnSearchOrder")?.value.trim() || "";
  const vendor = document.getElementById("returnSearchVendor")?.value.trim() || "";
  const operator = document.getElementById("returnSearchOperator")?.value.trim() || "";
  const serial = document.getElementById("returnSearchSerial")?.value?.trim() || "";

  const params = {
    customer_id,
    skip: (returnsPage - 1) * returnsPageSize,
    limit: returnsPageSize
  };

  if (fixture) params.fixture_id = fixture;
  if (order) params.order_no = order;
  if (vendor) params.customer_id = vendor;
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
 * 渲染退料表格
 * ============================================================ */
function renderReturnTable(rows) {
  const tbody = document.getElementById("returnTable");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="8" class="text-center py-2 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

    rows.forEach(r => {
        // ★ 統一序號顯示
        const serialText =
          r.serial_list ||                                    // v3.6 新欄位
          r.serial_text ||
          (r.serials ? r.serials : null) ||
          (r.serial_start && r.serial_end
            ? `${r.serial_start}~${r.serial_end}`
            : "-");

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
    
          <!-- 🔥 刪除獨立欄位 -->
          <td class="py-2 pr-4 text-red-600">
            <button class="btn btn-ghost text-xs"
                    onclick="deleteReturn(${r.id})">
              刪除
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }



/* ============================================================
 * 新增退料
 * ============================================================ */
async function submitReturn() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const fixture = document.getElementById("returnAddFixture").value.trim();
  const order = document.getElementById("returnAddOrder").value.trim();
  const type = document.getElementById("returnAddType").value;
  const note = document.getElementById("returnAddNote").value.trim();
  const vendor = document.getElementById("returnAddVendor").value.trim();
  const serialStart = document.getElementById("returnAddStart").value.trim();
  const serialEnd = document.getElementById("returnAddEnd").value.trim();
  const serials = document.getElementById("returnAddSerials").value.trim();

  if (!fixture) return toast("治具編號不得為空");

  const payload = {
    customer_id: vendor || customer_id,
    fixture_id: fixture,
    order_no: order || null,
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
    await apiCreateReturn(payload);
    toast("退料新增成功");
    document.getElementById("returnAddForm").classList.add("hidden");
    loadReturns();
  } catch (err) {
    console.error(err);
    toast("退料新增失敗", "error");
  }
}

/* ============================================================
 * 刪除退料
 * ============================================================ */
async function deleteReturn(id) {
  if (!confirm("確認刪除退料記錄？")) return;

  const customer_id = getCurrentCustomerId();

  try {
    await apiDeleteReturn(id, customer_id);
    toast("刪除成功");
    loadReturns();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel/CSV
 * ============================================================ */
async function handleReturnImport(input) {
  const file = input.files[0];
  if (!file) return alert("請選擇 Excel 或 CSV 檔案");

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return alert("請先選擇客戶");

  try {
    toast("正在匯入...");
    const result = await apiImportReturnsXlsx(file, customer_id);

    alert(`匯入成功，共 ${result.count || 0} 筆記錄`);
    loadReturns();
  } catch (err) {
    console.error("匯入失敗：", err);
    alert(`匯入失敗：${err.message}`);
  } finally {
    input.value = "";
  }
}

window.handleReturnImport = handleReturnImport;

/* ============================================================
 * 新增表單顯示切換
 * ============================================================ */
function toggleReturnAdd(show) {
  const form = document.getElementById("returnAddForm");
  if (!form) return;

  if (show) {
    form.classList.remove("hidden");
    const typeSel = document.getElementById("returnAddType");
    if (typeSel) typeSel.value = "batch";
    handleReturnTypeChange();
  } else {
    form.classList.add("hidden");
  }
}
window.toggleReturnAdd = toggleReturnAdd;

/* ============================================================
 * 類型切換 batch / individual
 * ============================================================ */
function handleReturnTypeChange() {
  const type = document.getElementById("returnAddType").value;

  const batchArea = document.getElementById("returnBatchArea");
  const individualArea = document.getElementById("returnIndividualArea");

  if (type === "batch") {
    batchArea.classList.remove("hidden");
    individualArea.classList.add("hidden");
  } else {
    batchArea.classList.add("hidden");
    individualArea.classList.remove("hidden");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const typeSel = document.getElementById("returnAddType");
  if (typeSel) typeSel.addEventListener("change", handleReturnTypeChange);
});

window.handleReturnTypeChange = handleReturnTypeChange;

/* ============================================================
 * 下載退料 Excel 範本
 * ============================================================ */
function downloadReturnTemplate() {
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
  XLSX.utils.book_append_sheet(wb, ws, "return_template");

  XLSX.writeFile(wb, "return_template.xlsx");
}

window.downloadReturnTemplate = downloadReturnTemplate;
