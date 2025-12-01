/**
 * 治具更換紀錄前端控制 (v3.5)
 * 完整修正版
 *
 * ✔ skip / limit 正確
 * ✔ fixture_id / replace_reason 正名
 * ✔ 全 API 帶 customer_id
 * ✔ 匯入帶 customer_id
 * ✔ DOM 全對應 index.html
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let repPage = 1;
const repPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadReplacementLogs();
});

/* 取得 customer_id */
function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 載入更換紀錄列表
 * ============================================================ */

async function loadReplacementLogs() {
  const fixtureId = document.getElementById("replaceSearchFixture")?.value.trim() || "";
  const operator = document.getElementById("replaceSearchOperator")?.value.trim() || "";
  const reason = document.getElementById("replaceSearchReason")?.value.trim() || "";
  const from = document.getElementById("replaceSearchFrom")?.value;
  const to = document.getElementById("replaceSearchTo")?.value;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("尚未選擇客戶");
    return;
  }

  const params = {
    customer_id,
    skip: (repPage - 1) * repPageSize,
    limit: repPageSize
  };

  if (fixtureId) params.fixture_id = fixtureId;
  if (operator) params.operator = operator;
  if (reason) params.replace_reason = reason;

  if (from) params.date_from = new Date(from).toISOString();
  if (to) params.date_to = new Date(to).toISOString();

  try {
    const result = await apiListReplacementLogs(params); // {replacement_logs, total}
    renderReplacementTable(result.replacement_logs || []);
    renderReplacementPagination(result.total || 0);
  } catch (err) {
    console.error(err);
    toast("載入更換紀錄失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderReplacementTable(rows) {
  const tbody = document.getElementById("replaceTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-3 text-gray-400">沒有資料</td>
      </tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${r.replacement_date || ""}</td>
      <td class="py-2 pr-4">${r.fixture_id}</td>
      <td class="py-2 pr-4">${r.replace_reason || "-"}</td>
      <td class="py-2 pr-4">${r.operator || "-"}</td>
      <td class="py-2 pr-4">${r.note || "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteReplacementLog(${r.id})">
          刪除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderReplacementPagination(total) {
  const box = document.getElementById("replacePagination");
  if (!box) return;

  const pages = Math.ceil(total / repPageSize);
  box.innerHTML = "";

  if (pages <= 1) return;

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === repPage ? "btn-primary" : "btn-outline"}`;
    btn.textContent = i;
    btn.onclick = () => { repPage = i; loadReplacementLogs(); };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 新增更換紀錄
 * ============================================================ */

async function submitReplacementLog() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const fixtureId = document.getElementById("replaceAddFixture").value.trim();
  const replacedAt = document.getElementById("replaceAddTime").value;
  const reason = document.getElementById("replaceAddReason").value.trim();
  const operator = document.getElementById("replaceAddOperator").value.trim();
  const note = document.getElementById("replaceAddNote").value.trim();

  if (!fixtureId) return toast("治具 ID 不得為空");
  if (!replacedAt) return toast("請輸入更換日期");

  const payload = {
    customer_id,
    fixture_id: fixtureId,
    replacement_date: new Date(replacedAt).toISOString(),
    replace_reason: reason || null,
    operator: operator || null,
    note: note || null
  };

  try {
    await apiCreateReplacementLog(payload);
    toast("新增更換紀錄成功");
    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("新增失敗", "error");
  }
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteReplacementLog(id) {
  if (!confirm("確認刪除？")) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    await apiDeleteReplacementLog({ customer_id, id });
    toast("刪除成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 匯入 Excel (.xlsx)
 * ============================================================ */

async function handleReplacementImport(input) {
  if (!input.files.length) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  try {
    toast("正在匯入...");
    const result = await apiImportReplacementLogsXlsx(input.files[0], customer_id);
    toast(result.message || "匯入成功");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  }

  input.value = "";
}

/* ============================================================
 * 顯示 / 隱藏新增表單
 * ============================================================ */

function toggleReplaceAdd(show) {
  document.getElementById("replaceAddForm")?.classList.toggle("hidden", !show);
}
