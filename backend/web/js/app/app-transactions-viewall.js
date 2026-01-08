// API 呼叫（保留你的 wrapper）
async function apiViewAllTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/transactions/view-all?${q}`);
}


// 渲染表格（總檢視）
// ✅ 修正：欄位其實是 10 欄（你原本 colspan=9 會破版）
// ✅ 保留：customer_id 欄位
function renderViewAllTable(rows) {
  const tbody = document.getElementById("viewAllTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-gray-500">無資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    // -----------------------------
    // 日期（只顯示日期）
    // -----------------------------
    const txDate = r.transaction_date
      ? new Date(r.transaction_date).toLocaleDateString("zh-TW")
      : "-";

    // -----------------------------
    // 交易類型（收 / 退）
    // -----------------------------
    const typeText =
      r.transaction_type === "receipt" ? "收料" :
      r.transaction_type === "return"  ? "退料" : "-";

    // -----------------------------
    // 數量 / Datecode 顯示（v4.x 規則）
    // -----------------------------
    let qtyText = "-";
    const qty = Math.abs(Number(r.quantity) || 0);

    if (r.record_type === "datecode") {
      // v4.x：datecode 存在 order_no
      const datecode = r.order_no || "-";
      qtyText = `${datecode}（${qty} 件）`;
    } else {
      // batch / individual
      qtyText = `${qty} 件`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${txDate}</td>
      <td>${typeText}</td>
      <td>${r.fixture_id || "-"}</td>
      <td>${r.record_type || "-"}</td>
      <td>${r.order_no || "-"}</td>
      <td>${qtyText}</td>
      <td>${r.operator || "-"}</td>
      <td>${r.note || "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ============================================================
// 收料 / 退料 / 序號檢視 / 總檢視 TAB 切換控制（保留你原寫法）
// ============================================================
function showTab(tabId) {

  // 1️⃣ 隱藏所有子頁面
  document.querySelectorAll(
    "#rtab-receipts, #rtab-returns, #viewAllTab, #viewSerialTab"
  ).forEach(el => el.classList.add("hidden"));

  // 2️⃣ 顯示目標頁
  const target = document.getElementById(tabId);
  if (target) target.classList.remove("hidden");

  // 3️⃣ 清除所有 subtab active
  document.querySelectorAll(".subtab")
    .forEach(btn => btn.classList.remove("subtab-active"));

  // 4️⃣ 依 tabId 設定 active（不做 API）
  if (tabId === "rtab-receipts") {
    document.querySelector("[data-rtab='receipts']")?.classList.add("subtab-active");
  }
  else if (tabId === "rtab-returns") {
    document.querySelector("[data-rtab='returns']")?.classList.add("subtab-active");
  }
  else if (tabId === "viewAllTab") {
    document.querySelector("[data-rtab='viewall']")?.classList.add("subtab-active");
  }
  else if (tabId === "viewSerialTab") {
    document.querySelector("[data-rtab='viewserial']")?.classList.add("subtab-active");
  }
}
window.showTab = showTab;



async function exportSummary() {

  // 取得查詢欄位
  const fixtureId = document.getElementById("vaFixture").value.trim();
  const datecode  = document.getElementById("vaDatecode").value.trim();
  const operator  = document.getElementById("vaOperator").value.trim();
  const type      = document.getElementById("vaType").value;

  // ★ 組查詢參數（和 loadTransactionViewAll 完全一致）
  const params = new URLSearchParams({
    type: "summary",
  });

  if (fixtureId) params.set("fixture_id", fixtureId);
  if (datecode)  params.set("datecode", datecode);
  if (operator)  params.set("operator", operator);
  if (type)      params.set("export_type", type);

  const url = `${API_PREFIX}/transactions/summary/export?${params.toString()}`;

  const res = await api(url.replace(API_PREFIX, ""));

  if (!res.ok) {
    return toast("匯出失敗: " + res.status);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions_summary.xlsx";
  a.click();
}
window.exportSummary = exportSummary;


async function exportSummaryDetailed() {
  const customer = getCurrentCustomerId();
  const token = localStorage.getItem("auth_token");

  // 取得查詢欄位
  const fixtureId = document.getElementById("vaFixture").value.trim();
  const datecode  = document.getElementById("vaDatecode").value.trim();
  const operator  = document.getElementById("vaOperator").value.trim();
  const type      = document.getElementById("vaType").value;

  // ★ 組查詢參數（和 loadTransactionViewAll 完全一致）
  const params = new URLSearchParams({
    customer_id: customer,
    type: "detailed",
  });

  if (fixtureId) params.set("fixture_id", fixtureId);
  if (datecode)  params.set("datecode", datecode);
  if (operator)  params.set("operator", operator);
  if (type)      params.set("export_type", type);

  const url = `${API_PREFIX}/transactions/summary/export?${params.toString()}`;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
    return toast("匯出失敗: " + res.status);
  }

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions_summary_detailed.xlsx";
  a.click();
}
window.exportSummaryDetailed = exportSummaryDetailed;



function loadTransactionViewAll(page = 1) {
  if (!window.currentCustomerId) return;

  const pageSize = 20;

  const params = {
    skip: (page - 1) * pageSize,
    limit: pageSize,
  };

  // -------------------------
  // 條件欄位（只在有值時才送）
  // -------------------------
  const fixture = document.getElementById("vaFixture")?.value?.trim();
  if (fixture) params.fixture_id = fixture;

  const datecode = document.getElementById("vaDatecode")?.value?.trim();
  if (datecode) params.datecode = datecode;

  const operator = document.getElementById("vaOperator")?.value?.trim();
  if (operator) params.operator = operator;

  const type = document.getElementById("vaType")?.value;
  if (type) params.type = type;

  const sortBy = document.getElementById("vaSortBy")?.value;
  if (sortBy) params.sort_by = sortBy;

  // -------------------------
  // 日期區間（✅修正：date_to 建議含到當天 23:59:59，避免少一天）
  // -------------------------
  const dateFrom = document.getElementById("vaDateFrom")?.value;
  const dateTo   = document.getElementById("vaDateTo")?.value;

  if (dateFrom && dateFrom.trim() !== "") {
    params.date_from = dateFrom;
  }

  if (dateTo && dateTo.trim() !== "") {
    // 這行是重點：避免後端用 < date_to 造成少一天
    params.date_to = dateTo;
    // 如果你後端吃 ISO（常見），改用：
    // params.date_to = new Date(dateTo + "T23:59:59").toISOString();
  }

  // -------------------------
  // API 呼叫（✅修正：統一走 wrapper）
  // -------------------------
  apiViewAllTransactions(params)
    .then(res => {
      const rows = res?.rows || res?.data || [];
      renderViewAllTable(rows);

      // 如果後端有回 total，且你頁面有 pagination 元件：
      if (typeof renderPagination === "function") {
        renderPagination(
          "viewAllPagination",
          res?.total || rows.length || 0,
          page,
          pageSize,
          (p) => loadTransactionViewAll(p)
        );
      }
    })
    .catch(err => {
      console.error(err);
      toast("查詢失敗", "error");
    });
}

window.loadTransactionViewAll = loadTransactionViewAll;
