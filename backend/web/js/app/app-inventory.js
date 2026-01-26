/**
 * app-inventory.js
 * 庫存頁前端控制（FINAL）
 *
 * 架構：
 * L1：治具卡片（summary）
 * L2：庫存明細 drawer（序號 + datecode + 歷史）
 *
 * ✔ 不處理 auth
 * ✔ 不處理 customer
 * ✔ 純 UI + 資料整合
 */

/* ============================================================
 * DOM helpers
 * ============================================================ */

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));
}

/* ============================================================
 * L1：Inventory Summary（卡片層）
 * ============================================================ */

/**
 * 載入庫存總覽（每個治具一張卡片）
 *
 * ⚠️ 現階段做法：
 * - 使用 apiInventorySerial 當來源
 * - 後續可換成專用 summary API
 */
async function loadInventorySummary() {
  const grid = qs("inventoryCardGrid");
  if (grid) {
    grid.innerHTML = `<div class="text-gray-400">載入中...</div>`;
  }

  try {
    const serialRes = await apiInventorySerial();
    const serialItems = serialRes.items || [];

    const summaryMap = {};
    serialItems.forEach(row => {
      const fid = row.fixture_id;
      if (!summaryMap[fid]) {
        summaryMap[fid] = {
          fixture_id: fid,
          serial_in_use: 0,
          serial_idle: 0
        };
      }

      if (row.status === "deployed" || row.status === "in_use") {
        summaryMap[fid].serial_in_use += 1;
      } else if (row.status === "in_stock") {
        summaryMap[fid].serial_idle += 1;
      }
    });

    const list = Object.values(summaryMap);
    renderInventoryCards(list);

  } catch (err) {
    console.error("[inventory] loadInventorySummary failed", err);
    if (grid) {
      grid.innerHTML =
        `<div class="text-red-500">庫存載入失敗</div>`;
    }
  }
}

/**
 * Render：L1 治具卡片
 */
function renderInventoryCards(list) {
  const grid = qs("inventoryCardGrid");
  if (!grid) return;

  if (!list || list.length === 0) {
    grid.innerHTML =
      `<div class="text-gray-400">目前沒有庫存</div>`;
    return;
  }

  grid.innerHTML = list.map(item => `
    <div class="card border p-4 shadow-sm">
      <div class="text-lg font-semibold mb-1">
        ${escapeHtml(item.fixture_id)}
      </div>

      <div class="text-sm text-gray-600 leading-relaxed">
        序號 使用中：${item.serial_in_use}<br>
        序號 未使用：${item.serial_idle}
      </div>

      <div class="mt-4">
        <button
          class="btn btn-sm btn-primary"
          onclick="openInventoryDetail('${escapeHtml(item.fixture_id)}')">
          明細
        </button>
      </div>
    </div>
  `).join("");
}

/* ============================================================
 * L2：Inventory Detail（明細 drawer）
 * ============================================================ */

/**
 * 打開庫存明細（序號 + Datecode + 歷史）
 */
async function openInventoryDetail(fixtureId) {
  // Header
  qs("inventoryDrawerTitle").textContent =
  `${fixtureId}｜庫存明細`;

  // Reset UI
  qs("serialInUseList").innerHTML = "-";
  qs("serialIdleList").innerHTML = "-";
  qs("datecodeInUse").innerHTML = "-";
  qs("datecodeIdle").innerHTML = "-";
  qs("inventoryHistoryBody").innerHTML =
    `<tr><td colspan="7" class="text-center text-gray-400">載入中...</td></tr>`;

  openInventoryDrawer();


  try {
    /* ---------- 序號現況 ---------- */
    const serialRes = await apiInventorySerial({ fixture_id: fixtureId });
    const serialItems = serialRes.items || [];

    const inUseSerials = [];
    const idleSerials = [];

    serialItems.forEach(s => {
      if (s.status === "deployed" || s.status === "in_use") {
        inUseSerials.push(s.serial_number);
      } else if (s.status === "in_stock") {
        idleSerials.push(s.serial_number);
      }
    });

    qs("serialInUseList").innerHTML = `
      <div class="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
        <div class="text-gray-500">使用中</div>
        <div class="whitespace-nowrap">
          ${inUseSerials.length ? escapeHtml(inUseSerials.join(", ")) : "—"}
        </div>

        <div class="text-gray-500">未使用</div>
        <div class="break-all">
          ${idleSerials.length ? escapeHtml(idleSerials.join(", ")) : "—"}
        </div>
      </div>
    `;

    /* ---------- Datecode 現況 ---------- */
    const dcRes = await apiInventoryDatecode({ fixture_id: fixtureId });
    const dcItems = dcRes.items || [];

    const dcInUse = [];
    const dcIdle = [];

    dcItems.forEach(d => {
      if (d.in_use_qty > 0) {
        dcInUse.push(`${d.datecode}（${d.in_use_qty} 件）`);
      }
      if (d.in_stock_qty > 0) {
        dcIdle.push(`${d.datecode}（${d.in_stock_qty} 件）`);
      }
    });

    qs("datecodeInUse").innerHTML = `
      <div class="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
        <div class="text-gray-500">使用中</div>
        <div class="break-all">
          ${dcInUse.length ? escapeHtml(dcInUse.join(", ")) : "—"}
        </div>

        <div class="text-gray-500">未使用</div>
        <div class="break-all">
          ${dcIdle.length ? escapeHtml(dcIdle.join(", ")) : "—"}
        </div>
      </div>
    `;

    /* ---------- 歷史紀錄 ---------- */
    const historyRes = await apiInventoryHistory({ fixture_id: fixtureId });
    const history = historyRes.items || [];

    if (!history.length) {
      qs("inventoryHistoryBody").innerHTML =
        `<tr><td colspan="7" class="text-center text-gray-400">無紀錄</td></tr>`;
      return;
    }

    qs("inventoryHistoryBody").innerHTML = history.map(row => `
      <tr class="${row.action === "return" ? "text-red-600" : ""}">
        <td class="whitespace-nowrap">
          ${escapeHtml(row.date || "-")}
        </td>

        <td class="break-all text-xs">
          ${escapeHtml(row.order_no || "-")}
        </td>

        <td class="whitespace-nowrap">
          ${renderHistoryType(row)}
        </td>

        <td class="break-all text-xs">
          ${escapeHtml(row.source_type || "-")}
        </td>

        <td class="break-all">
          ${escapeHtml(renderHistoryQty(row))}
        </td>

        <td class="whitespace-nowrap">
          ${escapeHtml(row.operator || "-")}
        </td>

        <td class="break-all text-xs text-gray-600">
          ${escapeHtml(row.note || "-")}
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("[inventory] openInventoryDetail failed", err);
    qs("inventoryHistoryBody").innerHTML =
      `<tr><td colspan="7" class="text-center text-red-500">載入失敗</td></tr>`;
  }
}

/* ============================================================
 * History render helpers
 * ============================================================ */

function renderHistoryType(row) {
  if (row.record_type === "datecode") return "日期碼";
  if (row.record_type === "batch") return "批量";
  if (row.record_type === "serial") return "個別";
  return row.record_type || "-";
}

function renderHistoryQty(row) {
  if (row.record_type === "datecode") {
    return `${row.datecode}（${row.quantity} 件）`;
  }
  if (row.record_type === "batch") {
    return row.serial_range || "-";
  }
  if (row.record_type === "serial") {
    return Array.isArray(row.serials)
      ? row.serials.join(", ")
      : "-";
  }
  return "-";
}

/* ============================================================
 * Init（給 tab router 用）
 * ============================================================ */

function initInventoryPage() {
  loadInventorySummary();
}



function openInventoryDrawer() {
  qs("inventoryDetailDrawer").classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}

function closeInventoryDrawer() {
  qs("inventoryDetailDrawer").classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}


function highlightSearchResult(result) {
  // -----------------------------
  // serial 命中
  // -----------------------------
  if (result.type === "serial") {
    qs("serialInUseList").insertAdjacentHTML(
      "afterbegin",
      `<div class="text-xs text-red-600 mb-1">
        🔍 命中序號：${result.data.serial_number}
      </div>`
    );
  }

  // -----------------------------
  // datecode 命中
  // -----------------------------
  if (result.type === "datecode") {
    qs("datecodeInUse").insertAdjacentHTML(
      "afterbegin",
      `<div class="text-xs text-red-600 mb-1">
        🔍 命中 Datecode：${result.data.datecode}
      </div>`
    );
  }

  // -----------------------------
  // fixture-only 命中
  // -----------------------------
  if (result.type === "fixture") {
    qs("inventoryDrawerTitle").insertAdjacentHTML(
      "beforeend",
      `<span class="ml-2 text-xs text-blue-600">
        （整體治具搜尋）
      </span>`
    );
  }

  // -----------------------------
  // 歷史紀錄（覆蓋）
  // -----------------------------
  if (Array.isArray(result.history)) {
    qs("inventoryHistoryBody").innerHTML = result.history.length
      ? result.history.map(row => `
          <tr class="bg-yellow-50">
            <td>${row.date || "-"}</td>
            <td>${row.order_no || "-"}</td>
            <td>${row.record_type || "-"}</td>
            <td>${row.source_type || "-"}</td>
            <td>${row.quantity || "-"}</td>
            <td>${row.operator || "-"}</td>
            <td>${row.note || "-"}</td>
          </tr>
        `).join("")
      : `<tr>
           <td colspan="7" class="text-center text-gray-400">
             無相關歷史紀錄
           </td>
         </tr>`;
  }
}



function highlightSearchResult(result) {
  if (result.type === "serial") {
    qs("serialInUseList").insertAdjacentHTML(
      "afterbegin",
      `<div class="text-xs text-red-600 mb-1">
        🔍 命中序號：${result.data.serial_number}
      </div>`
    );
  }

  if (result.type === "datecode") {
    qs("datecodeInUse").insertAdjacentHTML(
      "afterbegin",
      `<div class="text-xs text-red-600 mb-1">
        🔍 命中 Datecode：${result.data.datecode}
      </div>`
    );
  }

  // 歷史紀錄直接覆蓋成搜尋結果（v1 做法）
  if (Array.isArray(result.history)) {
    qs("inventoryHistoryBody").innerHTML = result.history.length
      ? result.history.map(row => `
          <tr class="bg-yellow-50">
            <td>${row.date || "-"}</td>
            <td>${row.order_no || "-"}</td>
            <td>${row.record_type}</td>
            <td>${row.source_type || "-"}</td>
            <td>${row.quantity || "-"}</td>
            <td>${row.operator || "-"}</td>
            <td>${row.note || "-"}</td>
          </tr>
        `).join("")
      : `<tr>
           <td colspan="7" class="text-center text-gray-400">
             無相關歷史紀錄
           </td>
         </tr>`;
  }
}

// ============================================================
// Expose to window (for inline onclick)
// ============================================================

window.initInventoryPage = initInventoryPage;
window.openInventoryDetail = openInventoryDetail;
window.openInventoryDrawer = openInventoryDrawer;
window.closeInventoryDrawer = closeInventoryDrawer;
window.searchInventory = searchInventory;
