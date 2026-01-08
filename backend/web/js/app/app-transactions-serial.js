/* ======================================================
 * ★ 序號檢視 (View Transaction Serials)  v4.x PATCHED
 * API: GET /transactions/serials
 *
 * ✅ v4.x：不再手動帶 customer_id（由 api-config 自動注入 X-Customer-Id）
 * ✅ date_from / date_to 統一轉成 ISO（避免後端解析不一致）
 * ✅ wrapper 改用 api("/transactions/serials", { params })（避免手刻 query 漏 encode）
 * ✅ 表格不顯示 customer_id（避免跨客戶/欄位空值）
 * ✅ serial 可點擊打開履歷 Drawer
 * ✅ filterByOrderNo：保留只設單號，其它清空，並自動帶入 type=all
 * ✅ Drawer：加入 ESC 登記、點遮罩可關閉（可選）
 * ====================================================== */

let viewSerialPage = 1;
const viewSerialPageSize = 20;

/* ------------------------------------------------------
 * 工具：把 input[type=date|datetime-local] 統一轉 ISO
 * ------------------------------------------------------ */
function toISODateTime(value, endOfDay = false) {
  if (!value) return null;

  // datetime-local：直接 new Date(value)
  if (value.includes("T")) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  // date：補上時間（起日 00:00:00 / 迄日 23:59:59）
  const d = new Date(value + (endOfDay ? "T23:59:59" : "T00:00:00"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/* ------------------------------------------------------
 * 主查詢函式
 * ------------------------------------------------------ */
async function loadTransactionViewSerial(page = 1) {
  try {
    if (!window.currentCustomerId && !getCurrentCustomerId?.()) return;

    viewSerialPage = page;

    const skip = (page - 1) * viewSerialPageSize;

    // 組查詢參數（只送有值的）
    const params = {
      skip,
      limit: viewSerialPageSize,
    };

    const dateFromRaw = document.getElementById("vsDateFrom")?.value;
    const dateToRaw   = document.getElementById("vsDateTo")?.value;

    const fixture  = document.getElementById("vsFixture")?.value?.trim();
    const serial   = document.getElementById("vsSerial")?.value?.trim();
    const orderNo  = document.getElementById("vsOrderNo")?.value?.trim();
    const operator = document.getElementById("vsOperator")?.value?.trim();
    const type     = document.getElementById("vsType")?.value;

    const dateFrom = toISODateTime(dateFromRaw, false);
    const dateTo   = toISODateTime(dateToRaw, true);

    if (dateFrom) params.date_from = dateFrom;
    if (dateTo)   params.date_to = dateTo;
    if (fixture)  params.fixture_id = fixture;
    if (serial)   params.serial = serial;
    if (orderNo)  params.order_no = orderNo;
    if (operator) params.operator = operator;

    // type: 空值或 "all"/"全部" 就不送
    if (type && type !== "all" && type !== "全部") params.type = type;

    // API 呼叫
    const res = await apiViewTransactionSerials(params);

    console.log("[view-serial] api response =", res);

    // 防呆：支援 rows / data / items
    const rows = res?.rows || res?.data || res?.items || [];
    const total = Number(res?.total ?? rows.length ?? 0);

    renderViewSerialTable(rows);

    renderPagination(
      "viewSerialPagination",
      total,
      page,
      viewSerialPageSize,
      (p) => loadTransactionViewSerial(p)
    );
  } catch (err) {
    console.error("[view-serial] load failed:", err);
    toast("序號檢視查詢失敗", "error");
  }
}

/* ------------------------------------------------------
 * API Wrapper（v4.x）
 * ------------------------------------------------------ */
async function apiViewTransactionSerials(params = {}) {
  // ✅ 交給 api-config 自動帶 Authorization + X-Customer-Id
  return api("/transactions/serials", { params });
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

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-gray-500">
          無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const txDate =
      r.transaction_date
        ? new Date(r.transaction_date).toLocaleDateString("zh-TW")
        : "-";


    const txType = r.transaction_type || r.type || "-";
    const fixtureId = r.fixture_id || "-";
    const orderNo = r.order_no || "-";
    const serialNo = r.serial_number || r.serial || "-";
    const operator = r.operator || "-";
    const note = r.note || "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${txDate}</td>
      <td>${txType}</td>
      <td>${fixtureId}</td>
      <td>${orderNo}</td>

      <td class="font-mono text-blue-600 font-semibold">
        <a class="cursor-pointer hover:underline"
           onclick="openSerialDetail('${serialNo}')">
          ${serialNo}
        </a>
      </td>

      <td>${operator}</td>
      <td title="${String(note).replaceAll('"', "&quot;")}">${note}</td>
    `;
    tbody.appendChild(tr);
  });
}

/* ------------------------------------------------------
 * 快捷：用單號篩選
 * ------------------------------------------------------ */
function filterByOrderNo(orderNo) {
  if (!orderNo) return;

  // 切到序號檢視
  showTab("viewSerialTab");

  // 清空其他條件
  const vsFixture = document.getElementById("vsFixture");
  const vsSerial  = document.getElementById("vsSerial");
  const vsOperator= document.getElementById("vsOperator");
  const vsType    = document.getElementById("vsType");
  const vsOrderNo = document.getElementById("vsOrderNo");

  if (vsFixture) vsFixture.value = "";
  if (vsSerial)  vsSerial.value = "";
  if (vsOperator)vsOperator.value = "";
  if (vsType)    vsType.value = "all";

  if (vsOrderNo) vsOrderNo.value = orderNo;

  loadTransactionViewSerial(1);
}

/* ======================================================
 * 序號履歷 Drawer（v4.x）
 * ====================================================== */

async function apiGetSerialHistory(serial) {
  // ✅ v4.x：不帶 customer_id，走 header/context
  return api(`/transactions/serials/${encodeURIComponent(serial)}/history`);
}

async function openSerialDetail(serial) {
  if (!serial || serial === "-" || serial === "null") return;

  try {
    const data = await apiGetSerialHistory(serial);
    renderSerialDetailDrawer(data);
    openSerialDetailDrawer();
  } catch (e) {
    console.error(e);
    toast("載入序號履歷失敗", "error");
  }
}

function openSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay")?.classList.remove("hidden");
  document.getElementById("serialDetailDrawer")?.classList.remove("translate-x-full");

  // ⭐ 登記 ESC 關閉
  window.__activeOverlayCloser = () => closeSerialDetailDrawer();
}

function closeSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay")?.classList.add("hidden");
  document.getElementById("serialDetailDrawer")?.classList.add("translate-x-full");

  if (window.__activeOverlayCloser === closeSerialDetailDrawer) {
    window.__activeOverlayCloser = null;
  }
}

// （可選）點遮罩關閉
document.getElementById("serialDetailOverlay")?.addEventListener("click", (e) => {
  if (e.target?.id === "serialDetailOverlay") closeSerialDetailDrawer();
});

function renderSerialDetailDrawer(data) {
  const s = data?.serial || {};

  document.getElementById("serialDetailTitle").textContent = s.serial_number || "-";
  document.getElementById("sdFixture").textContent = s.fixture_id || "-";
  document.getElementById("sdStatus").textContent = s.status || "-";
  document.getElementById("sdSource").textContent = s.source_type || "-";
  document.getElementById("sdTotalUses").textContent = s.total_uses ?? "-";

  // 收 / 退料
  const txBody = document.getElementById("sdTransactions");
  if (txBody) {
    txBody.innerHTML = "";
    (data?.transactions || []).forEach((r) => {
      const orderNo = r.order_no || "-";
      txBody.innerHTML += `
        <tr>
          <td>${r.transaction_date ? new Date(r.transaction_date).toLocaleString() : "-"}</td>
          <td>${r.transaction_type || "-"}</td>
          <td>
            <a class="text-blue-600 hover:underline cursor-pointer"
               onclick="filterByOrderNo('${orderNo}')">
              ${orderNo}
            </a>
          </td>
          <td>${r.operator || "-"}</td>
        </tr>
      `;
    });
  }

  // 使用紀錄
  const usageBody = document.getElementById("sdUsages");
  if (usageBody) {
    usageBody.innerHTML = "";
    (data?.usages || []).forEach((u) => {
      usageBody.innerHTML += `
        <tr>
          <td>${u.used_at ? new Date(u.used_at).toLocaleString() : "-"}</td>
          <td>${u.model_id || "-"}</td>
          <td>${u.station_id || "-"}</td>
          <td>${u.use_count ?? "-"}</td>
        </tr>
      `;
    });
  }

  // 更換紀錄
  const repBody = document.getElementById("sdReplacements");
  if (repBody) {
    repBody.innerHTML = "";
    (data?.replacements || []).forEach((r) => {
      repBody.innerHTML += `
        <tr>
          <td>${r.created_at ? new Date(r.created_at).toLocaleString() : "-"}</td>
          <td>${r.usage_before ?? "-"}</td>
          <td>${r.usage_after ?? "-"}</td>
        </tr>
      `;
    });
  }
}

/* ------------------------------------------------------
 * export
 * ------------------------------------------------------ */
window.loadTransactionViewSerial = loadTransactionViewSerial;
window.apiViewTransactionSerials = apiViewTransactionSerials;
window.renderViewSerialTable = renderViewSerialTable;
window.filterByOrderNo = filterByOrderNo;
window.openSerialDetail = openSerialDetail;
window.closeSerialDetailDrawer = closeSerialDetailDrawer;
