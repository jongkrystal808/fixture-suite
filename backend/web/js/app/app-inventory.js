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

let invPage = 1;
let invPageSize = 10;
let invTotal = 0;

let inventoryPager = null;


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
 * URL Query Helpers（Bookmark / Share）
 * ============================================================ */

function getInvQueryFromURL() {
  const params = new URLSearchParams(window.location.search);

  return {
    keyword: params.get("inv_keyword") || "",
    page: Number(params.get("inv_page") || 1),
    pageSize: Number(params.get("inv_page_size") || 10),
  };
}

function syncInvQueryToURL() {
  const params = new URLSearchParams();

  if (qs("invSearchKeyword")?.value) {
    params.set("inv_keyword", qs("invSearchKeyword").value.trim());
  }

  if (invPage > 1) {
    params.set("inv_page", invPage);
  }

  if (invPageSize !== 10) {
    params.set("inv_page_size", invPageSize);
  }

  const newURL =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : "");

  // 不 reload、可回上一頁
  window.history.replaceState({}, "", newURL);
}

/* ============================================================
 * Inventory Overview（含查詢 + 分頁）
 * ============================================================ */

async function loadInventoryOverview(page = 1) {
  ensureInventoryPager();
  invPage = page;
  invPageSize = Number(qs("invPageSize")?.value || 10);
  const keyword = qs("invSearchKeyword")?.value.trim() || "";

  // 🔗 同步到 URL（bookmark 用）
  syncInvQueryToURL();

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


/* ============================================================
 * Init
 * ============================================================ */

function initInventoryPage() {
  const q = getInvQueryFromURL();

  // 還原查詢條件
  if (qs("invSearchKeyword")) {
    qs("invSearchKeyword").value = q.keyword;
  }

  if (qs("invPageSize")) {
    qs("invPageSize").value = q.pageSize;
  }

  invPage = q.page;
  invPageSize = q.pageSize;

  loadInventoryOverview(invPage);
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
