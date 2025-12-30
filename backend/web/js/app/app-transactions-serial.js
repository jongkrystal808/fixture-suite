/* ======================================================
 * ★ 序號檢視 (View Transaction Serials)
 * API: GET /transactions/serials
 * ====================================================== */

/* ------------------------------------------------------
 * 主查詢函式
 * ------------------------------------------------------ */
// ======================================================
// ★ 序號檢視 (View Transaction Serials)
// ======================================================
async function loadTransactionViewSerial(page = 1) {
  try {
    const customerId = getCurrentCustomerId();
    if (!customerId) return;

    const pageSize = 20;
    const skip = (page - 1) * pageSize;

    /* -------------------------
     * 組查詢參數（只送有值的）
     * ------------------------- */
    const params = {
      customer_id: customerId,
      skip,
      limit: pageSize,
    };

    const dateFrom = document.getElementById("vsDateFrom")?.value;
    const dateTo   = document.getElementById("vsDateTo")?.value;
    const fixture  = document.getElementById("vsFixture")?.value?.trim();
    const serial   = document.getElementById("vsSerial")?.value?.trim();
    const orderNo  = document.getElementById("vsOrderNo")?.value?.trim();
    const operator = document.getElementById("vsOperator")?.value?.trim();
    const type     = document.getElementById("vsType")?.value;

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to = dateTo;
    if (fixture)  params.fixture_id = fixture;
    if (serial)   params.serial = serial;
    if (orderNo)  params.order_no = orderNo;
    if (operator) params.operator = operator;
    if (type)     params.type = type;

    /* -------------------------
     * API 呼叫
     * ------------------------- */
    const res = await apiViewTransactionSerials(params);

    // 🔍 Debug（現在位置是正確的）
    console.log("[view-serial] api response =", res);

    // ✅ 防呆：支援 rows / data
    const rows = res?.rows || res?.data || [];

    renderViewSerialTable(rows);

    renderPagination(
      "viewSerialPagination",
      res?.total || rows.length || 0,
      page,
      pageSize,
      (p) => loadTransactionViewSerial(p)
    );

  } catch (err) {
    console.error("[view-serial] load failed:", err);
    alert("序號檢視查詢失敗");
  }
}

/* ------------------------------------------------------
 * API Wrapper
 * ------------------------------------------------------ */
async function apiViewTransactionSerials(params = {}) {
  const q = new URLSearchParams(params).toString();
  return api(`/transactions/serials?${q}`);
}


/* ------------------------------------------------------
 * Table Render
 * ------------------------------------------------------ */
function renderViewSerialTable(rows) {
  const tbody = document.getElementById("viewSerialTableBody");

  if (!tbody) {
    console.error("[view-serial] ❌ tbody not found");
    return;
  }

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4 text-gray-500">
          無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.transaction_date || "-"}</td>
      <td>${r.transaction_type || "-"}</td>
      <td>${r.fixture_id || "-"}</td>
      <td>${r.customer_id || "-"}</td>
      <td>${r.source_type || "-"}</td>
      <td>${r.order_no || "-"}</td>
      <td class="font-mono text-blue-600 font-semibold">
        ${r.serial_number || "-"}
      </td>
      <td>${r.operator || "-"}</td>
      <td>${r.note || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}


function filterByOrderNo(orderNo) {
  if (!orderNo) return;

  // 切到序號檢視
  showTab("viewSerialTab");

  // 清空其他條件
  document.getElementById("vsFixture").value = "";
  document.getElementById("vsSerial").value = "";
  document.getElementById("vsOperator").value = "";
  document.getElementById("vsType").value = "";

  // 設定單號
  document.getElementById("vsOrderNo").value = orderNo;

  loadTransactionViewSerial(1);
}


async function apiGetSerialHistory(serial) {
  const customerId = getCurrentCustomerId();
  return api(`/serials/${encodeURIComponent(serial)}/history?customer_id=${customerId}`);
}

async function openSerialDetail(serial) {
  if (!serial) return;

  try {
    const data = await apiGetSerialHistory(serial);
    renderSerialDetailDrawer(data);
    openSerialDetailDrawer();
  } catch (e) {
    console.error(e);
    alert("載入序號履歷失敗");
  }
}

function openSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay").classList.remove("hidden");
  document.getElementById("serialDetailDrawer").classList.remove("translate-x-full");
}

function closeSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay").classList.add("hidden");
  document.getElementById("serialDetailDrawer").classList.add("translate-x-full");
}


function renderSerialDetailDrawer(data) {
  const s = data.serial;

  document.getElementById("serialDetailTitle").textContent = s.serial_number;
  document.getElementById("sdFixture").textContent = s.fixture_id || "-";
  document.getElementById("sdStatus").textContent = s.status || "-";
  document.getElementById("sdSource").textContent = s.source_type || "-";
  document.getElementById("sdTotalUses").textContent = s.total_uses ?? "-";

  // 收 / 退料
  const txBody = document.getElementById("sdTransactions");
  txBody.innerHTML = "";
  data.transactions.forEach(r => {
    txBody.innerHTML += `
      <tr>
        <td>${r.transaction_date || "-"}</td>
        <td>${r.transaction_type}</td>
        <td>
          <a class="text-blue-600 hover:underline"
             onclick="filterByOrderNo('${r.order_no}')">
            ${r.order_no || "-"}
          </a>
        </td>
        <td>${r.operator || "-"}</td>
      </tr>
    `;
  });

  // 使用紀錄
  const usageBody = document.getElementById("sdUsages");
  usageBody.innerHTML = "";
  data.usages.forEach(u => {
    usageBody.innerHTML += `
      <tr>
        <td>${u.used_at || "-"}</td>
        <td>${u.model_id || "-"}</td>
        <td>${u.station_id || "-"}</td>
        <td>${u.use_count || "-"}</td>
      </tr>
    `;
  });

  // 更換紀錄
  const repBody = document.getElementById("sdReplacements");
  repBody.innerHTML = "";
  data.replacements.forEach(r => {
    repBody.innerHTML += `
      <tr>
        <td>${r.created_at || "-"}</td>
        <td>${r.usage_before ?? "-"}</td>
        <td>${r.usage_after ?? "-"}</td>
      </tr>
    `;
  });
}

