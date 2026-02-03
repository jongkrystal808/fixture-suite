/**
 * app-inventory.js
 * 庫存頁前端控制（INLINE VERSION）
 *
 * ✔ 不處理 auth
 * ✔ 不處理 customer
 * ✔ Inline 明細（不用 drawer）
 * ✔ 上一頁 / 下一頁分頁
 * ✔ 與 inventoryTab HTML 完全對齊
 */

const INV_QUERY_SCHEMA = {
  inv_keyword: "",
  inv_page: 1,
  inv_page_size: 10,
};



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

document.addEventListener("DOMContentLoaded", () => {
  inventoryPager = createPagination({
    getPage: () => invPage,
    setPage: v => { invPage = v; },
    getPageSize: () => invPageSize,
    onPageChange: () => {
      loadInventoryOverview(invPage);
    },
    els: {
      pageNow: document.getElementById("invPageNow"),
      pageMax: document.getElementById("invPageMax"),
    }
  });
});



/* ============================================================
 * Inventory Overview（含查詢 + 分頁）
 * ============================================================ */

async function loadInventoryOverview(page = 1) {
  ensureInventoryPager();
  invPage = page;
  invPageSize = Number(qs("invPageSize")?.value || 10);
  const keyword = qs("invSearchKeyword")?.value.trim() || "";

  writeQueryState({
      inv_keyword: keyword,
      inv_page: invPage,
      inv_page_size: invPageSize,
    });


  const tbody = qs("inventoryTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center text-gray-400 py-4">
        載入中...
      </td>
    </tr>
  `;

  try {
    const res = await api("/inventory", {
       params: {
         keyword,
         skip: (invPage - 1) * invPageSize,
         limit: invPageSize,
       }
     });

    const items = res.fixtures || [];
    invTotal = res.total ?? items.length;

    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-gray-400 py-4">
            查無資料
          </td>
        </tr>
      `;
      inventoryPager?.render(invTotal);
      return;
    }

    //（以下 render table 原樣不動）


    tbody.innerHTML = items.map(row => {
      const fixtureId = row.id || "-";

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-3 py-2 font-mono whitespace-nowrap">
            ${escapeHtml(fixtureId)}
          </td>

          <td class="px-3 py-2 break-all">
            ${escapeHtml(row.fixture_name || "-")}
          </td>

          <td class="px-3 py-2 text-right">
            ${row.in_stock_qty ?? 0}
          </td>

          <td class="px-3 py-2 text-right">
            ${row.self_purchased_qty ?? 0}
          </td>

          <td class="px-3 py-2 text-right">
            ${row.customer_supplied_qty ?? 0}
          </td>

          <td class="px-3 py-2 text-right">
            ${row.returned_qty ?? 0}
          </td>

          <td class="px-3 py-2 text-center whitespace-nowrap">
            <button
              class="btn btn-ghost btn-sm"
              onclick="toggleInventoryInlineDetail('${fixtureId}', this)">
              查看
            </button>
          </td>
        </tr>
      `;
    }).join("");
    inventoryPager?.render(invTotal);
  } catch (err) {
    console.error("[inventory] loadInventoryOverview failed", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-red-500 py-4">
          載入失敗
        </td>
      </tr>
    `;
  }
}


function ensureInventoryPager() {
  if (inventoryPager) return;

  const pageNow = qs("invPageNow");
  const pageMax = qs("invPageMax");
  if (!pageNow || !pageMax) return;

  inventoryPager = createPagination({
    getPage: () => invPage,
    setPage: v => { invPage = v; },
    getPageSize: () => invPageSize,
    onPageChange: () => loadInventoryOverview(invPage),
    els: { pageNow, pageMax }
  });
}

/* ============================================================
 * Inline Inventory Detail（展開 / 收合 + 動畫）
 * ============================================================ */

async function toggleInventoryInlineDetail(fixtureId, btn) {
  const tr = btn.closest("tr");
  const next = tr.nextElementSibling;

  // 已展開 → 收合
  if (next && next.dataset?.invDetail === fixtureId) {
    const wrapper = next.querySelector(".inv-inline-wrapper");
    if (wrapper) {
      wrapper.classList.remove("inv-inline-expanded");
      wrapper.classList.add("inv-inline-collapsed");
      setTimeout(() => next.remove(), 250);
    } else {
      next.remove();
    }
    return;
  }

  // 關閉其他展開
  document.querySelectorAll("[data-inv-detail]").forEach(el => el.remove());

  const detailRow = document.createElement("tr");
  detailRow.dataset.invDetail = fixtureId;

  detailRow.innerHTML = `
    <td colspan="7" class="bg-gray-50 px-0 py-0">
      <div class="inv-inline-wrapper inv-inline-collapsed px-6 py-4 text-sm">
        載入明細中…
      </div>
    </td>
  `;

  tr.after(detailRow);

  requestAnimationFrame(() => {
    const wrapper = detailRow.querySelector(".inv-inline-wrapper");
    wrapper.classList.remove("inv-inline-collapsed");
    wrapper.classList.add("inv-inline-expanded");
  });

  try {
    const [serialRes, dcRes, historyRes] = await Promise.all([
      apiInventorySerial({ fixture_id: fixtureId }),
      apiInventoryDatecode({ fixture_id: fixtureId }),
      apiInventoryHistory({ fixture_id: fixtureId, limit: 5 }),
    ]);

    detailRow.innerHTML = `
      <td colspan="7" class="bg-gray-50 px-6 py-4 text-sm space-y-4">
        ${renderInlineSerial(serialRes.items || [])}
        ${renderInlineDatecode(dcRes.items || [])}
        ${renderInlineHistory(historyRes.items || [])}
      </td>
    `;
  } catch (err) {
    console.error(err);
    detailRow.innerHTML = `
      <td colspan="7" class="text-red-500 px-6 py-4">
        明細載入失敗
      </td>
    `;
  }
}

/* ============================================================
 * Inline render helpers
 * ============================================================ */

    function renderInlineSerial(items) {
      const inUse = items.filter(s => s.status !== "in_stock");
      const idle = items.filter(s => s.status === "in_stock");

      return `
        <div>
          <div class="font-semibold mb-1">序號庫存</div>
          <div class="grid grid-cols-2 gap-4 text-xs">
            <div><span class="text-gray-500">使用中：</span>${inUse.map(s => s.serial_number).join(", ") || "—"}</div>
            <div><span class="text-gray-500">可用：</span>${idle.map(s => s.serial_number).join(", ") || "—"}</div>
          </div>
        </div>
      `;
    }

    function renderInlineDatecode(items) {
      if (!items.length) {
        return `<div class="text-gray-500">Datecode：—</div>`;
      }

      return `
        <div>
          <div class="font-semibold mb-1">Datecode 庫存</div>
          <div class="flex flex-wrap gap-3 text-xs">
            ${items.map(d => `<span>${d.datecode}（${d.in_stock_qty}）</span>`).join("")}
          </div>
        </div>
      `;
    }


    function renderInlineHistory(items) {
      if (!items.length) {
        return `<div class="text-gray-500">近期異動：無</div>`;
      }

      return `
        <div>
          <div class="font-semibold mb-2">收料 / 退料記錄</div>
    
          <div class="flex gap-2 mb-2">
            <button class="btn btn-xs" onclick="filterInvHistory('all')">全部</button>
            <button class="btn btn-xs" onclick="filterInvHistory('receipt')">只看收料</button>
            <button class="btn btn-xs" onclick="filterInvHistory('return')">只看退料</button>
          </div>
    
          <table class="w-full text-xs border-t">
            <thead class="text-gray-500">
              <tr>
                <th class="py-1 text-left">類型</th>
                <th class="py-1 text-left">日期</th>
                <th class="py-1 text-left">數量</th>
                <th class="py-1 text-left">單號</th>
                <th class="py-1 text-left">內容</th>
              </tr>
            </thead>
            <tbody id="invHistoryBody">
              ${items.map(h => `
                <tr class="border-t inv-history-row ${h.transaction_type}">
                  <td class="py-1 ${h.transaction_type === "return" ? "text-red-600" : ""}">
                    ${h.transaction_type === "return" ? "退料" : "收料"}
                  </td>
                  <td class="py-1">
                    ${getHistoryDate(h)}
                  </td>
                  <td class="py-1">
                    ${h.quantity ?? 0}
                  </td>
                  <td class="py-1">
                    ${h.order_no || "-"}
                  </td>
                  <td class="py-1">
                    ${h.note || "-"}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `;
    }




/* ============================================================
 * Init
 * ============================================================ */

function initInventoryPage() {
  const q = readQueryState(INV_QUERY_SCHEMA);

  if (qs("invSearchKeyword")) {
    qs("invSearchKeyword").value = q.inv_keyword;
  }

  if (qs("invPageSize")) {
    qs("invPageSize").value = q.inv_page_size;
  }

  invPage = q.inv_page;
  invPageSize = q.inv_page_size;

  loadInventoryOverview(invPage);
}


function filterInvHistory(type) {
  document.querySelectorAll(".inv-history-row").forEach(tr => {
    if (type === "all") {
      tr.style.display = "";
    } else {
      tr.style.display = tr.classList.contains(type) ? "" : "none";
    }
  });
}


function getHistoryDate(h) {
  return (
    h.transaction_date ||
    h.date ||
    h.created_at ||
    "-"
  );
}



// expose
window.loadInventoryOverview = loadInventoryOverview;
window.initInventoryPage = initInventoryPage;
window.toggleInventoryInlineDetail = toggleInventoryInlineDetail;

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initInventoryPage === "function") {
    initInventoryPage();
  }
});
