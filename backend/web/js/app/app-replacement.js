/**
 * 治具更換紀錄前端控制 (v4.x PATCHED)
 * ---------------------------------------------
 * v4.x 重點修正：
 * ✅ customer 由 header/context 決定 → 不再帶 customer_id（query/body）
 * ✅ 初始化改用 onCustomerReady（避免 DOMContentLoaded 時 customer 未就緒）
 * ✅ date_from / date_to 送 ISO（toISOString），並確保 date_to 含當日結束
 * ✅ render 表格欄位 colspan 修正（你其實有 9 欄）
 * ✅ delete / import API 呼叫不再傳 customer_id
 */

let repPage = 1;
const repPageSize = 20;

/* ============================================================
 * v4.x：初始化（等 customer ready）
 * ============================================================ */
onCustomerReady?.(() => {
  loadReplacementLogs();
});

/* ============================================================
 * 查詢更換記錄
 * ============================================================ */
async function loadReplacementLogs() {
  if (!window.currentCustomerId) return;

  const fixtureId = document.getElementById("replaceSearchFixture")?.value.trim() || "";
  const serial    = document.getElementById("replaceSearchSerial")?.value.trim() || "";
  const executor  = document.getElementById("replaceSearchExecutor")?.value.trim() || "";
  const reason    = document.getElementById("replaceSearchReason")?.value.trim() || "";
  const dateFrom  = document.getElementById("replaceSearchFrom")?.value || "";
  const dateTo    = document.getElementById("replaceSearchTo")?.value || "";

  const params = {
    skip: (repPage - 1) * repPageSize,
    limit: repPageSize,
  };

  if (fixtureId) params.fixture_id = fixtureId;
  if (serial)    params.serial_number = serial;
  if (executor)  params.executor = executor;
  if (reason)    params.reason = reason;

  // ✅ date range：from 取當日 00:00；to 取當日 23:59:59.999
  if (dateFrom) {
    const d1 = new Date(dateFrom);
    d1.setHours(0, 0, 0, 0);
    params.date_from = d1.toISOString();
  }
  if (dateTo) {
    const d2 = new Date(dateTo);
    d2.setHours(23, 59, 59, 999);
    params.date_to = d2.toISOString();
  }

  try {
    const result = await apiListReplacementLogs(params);
    renderReplacementTable(result?.replacement_logs || []);
    renderReplacementPagination(result?.total || 0);
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "讀取更換紀錄失敗", "error");
  }
}

/* ============================================================
 * 渲染表格
 * ============================================================ */
function renderReplacementTable(rows) {
  const tbody = document.getElementById("replaceTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-3 text-gray-400">沒有資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const dateText =
      r.replacement_date
        ? String(r.replacement_date).slice(0, 10)
        : "";

    const serialText = r.serial_number ?? "-";

    const safeId = JSON.stringify(r.id);

    tbody.insertAdjacentHTML(
      "beforeend",
      `
      <tr>
        <td class="py-2 pr-4">${dateText}</td>
        <td class="py-2 pr-4">${r.fixture_id ?? "-"}</td>
        <td class="py-2 pr-4">${serialText}</td>
        <td class="py-2 pr-4">${r.reason ?? "-"}</td>
        <td class="py-2 pr-4">${r.executor ?? "-"}</td>
        <td class="py-2 pr-4">${r.note ?? "-"}</td>
        <td class="py-2 pr-4">
          <button class="btn btn-xs btn-error" onclick="deleteReplacementLog(${safeId})">
            刪除
          </button>
        </td>
      </tr>
      `
    );
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */
function renderReplacementPagination(total) {
  const box = document.getElementById("replacePagination");
  if (!box) return;

  const pages = Math.ceil((total || 0) / repPageSize) || 1;
  box.innerHTML = "";

  if (pages <= 1) return;

  for (let p = 1; p <= pages; p++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${p === repPage ? "btn-primary" : "btn-outline"}`;
    btn.textContent = p;
    btn.onclick = () => {
      repPage = p;
      loadReplacementLogs();
    };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 新增更換記錄
 * ============================================================ */
async function submitReplacementLog() {
  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  const fixtureId = document.getElementById("replaceAddFixture")?.value.trim() || "";
  const serial    = document.getElementById("replaceAddSerials")?.value.trim() || "";
  const level     = document.getElementById("replaceAddLevel")?.value || "fixture";
  const date = document.getElementById("replaceAddDate")?.value || "";
  const reason    = document.getElementById("replaceAddReason")?.value.trim() || "";
  const executor  = document.getElementById("replaceAddExecutor")?.value.trim() || "";
  const note      = document.getElementById("replaceAddNote")?.value.trim() || "";

  if (!fixtureId) return toast("請輸入治具 ID", "warning");
  if (!date) return toast("請輸入更換日期", "warning");

  if (level === "serial" && !serial) {
    return toast("請輸入序號（record_level = serial）", "warning");
  }

  const payload = {
    fixture_id: fixtureId,
    record_level: level,                // fixture / serial
    serial_number: serial || null,
    replacement_date: new Date(date).toISOString(),
    reason: reason || null,
    executor: executor || null,
    note: note || null,
  };

  try {
    await apiCreateReplacementLog(payload);
    toast("新增成功");
    toggleReplaceAdd(false);
    repPage = 1;
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "新增更換紀錄失敗", "error");
  }
}

window.submitReplacementLog = submitReplacementLog;

/* ============================================================
 * 刪除
 * ============================================================ */
async function deleteReplacementLog(id) {
  if (!id) return;
  if (!confirm("確定要刪除這筆更換紀錄？")) return;
  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  try {
    // v4.x：不帶 customer_id（header/context）
    await apiDeleteReplacementLog(id);
    toast("刪除成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "刪除失敗", "error");
  }
}

window.deleteReplacementLog = deleteReplacementLog;

/* ============================================================
 * 匯入 Excel
 * ============================================================ */
async function handleReplacementImport(input) {
  const file = input?.files?.[0];
  if (!file) return;

  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  try {
    const res = await apiImportReplacementLogsXlsx(file); // v4.x：不帶 customer_id
    toast(res?.message || "匯入成功");
    repPage = 1;
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "匯入失敗", "error");
  } finally {
    input.value = "";
  }
}

window.handleReplacementImport = handleReplacementImport;

/* ============================================================
 * 顯示 / 隱藏新增表單
 * ============================================================ */
function toggleReplaceAdd(show) {
  document.getElementById("replaceAddForm")?.classList.toggle("hidden", !show);
}

window.toggleReplaceAdd = toggleReplaceAdd;
