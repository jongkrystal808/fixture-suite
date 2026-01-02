

// API 呼叫
async function apiViewAllTransactions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/transactions/view-all?${q}`);
}


// 渲染表格（總檢視）
function renderViewAllTable(rows) {
  const tbody = document.getElementById("viewAllTableBody");
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-gray-500">無資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    // -----------------------------
    // 類型文字
    // -----------------------------
    const typeText = r.transaction_type === "receipt" ? "收料" : "退料";

    // -----------------------------
    // 來源文字
    // -----------------------------
    const sourceText =
      r.source_type === "self_purchased"
        ? "自購"
        : (r.source_type === "customer_supplied" ? "客供" : "-");

        // -----------------------------
        // 數量顯示（★重點修正）
        // -----------------------------
        let qtyText = "-";

        if (r.record_type === "datecode") {
          // datecode：顯示 datecode + 件數
          qtyText = `${r.datecode || "-"}（${r.quantity || 0} 件）`;
        } else {
          // batch / individual：只顯示「有幾個序號」
          qtyText = `${r.quantity || 0} 個`;
        }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.transaction_date || "-"}</td>
      <td>${typeText}</td>
      <td>${r.fixture_id || "-"}</td>
      <td>${r.customer_id || "-"}</td>
      <td>${sourceText}</td>
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
// 收料 / 退料 / 序號檢視 / 總檢視 TAB 切換控制（修正版）
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




async function exportSummary() {
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
    type: "summary",
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
  a.download = "transactions_summary.xlsx";
  a.click();
}


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

  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "transactions_summary_detailed.xlsx";
  a.click();
}



function loadTransactionViewAll(page = 1) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  const params = {
    customer_id,
    skip: (page - 1) * 20,
    limit: 20,
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
  // 日期區間（★ 關鍵修正）
  // -------------------------
  const dateFrom = document.getElementById("vaDateFrom")?.value;
  const dateTo   = document.getElementById("vaDateTo")?.value;

  if (dateFrom && dateFrom.trim() !== "") {
    params.date_from = dateFrom;
  }

  if (dateTo && dateTo.trim() !== "") {
    params.date_to = dateTo;
  }

  // -------------------------
  // API 呼叫
  // -------------------------
  api("/transactions/view-all", {
      params
    })
    .then(res => {
      renderViewAllTable(res.rows || []);
    })
    .catch(err => {
      console.error(err);
      alert("查詢失敗");
    });

}
