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
         hide_zero: true,
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
      const fixtureId = row.id || row.fixture_id || "-";

      const inStock   = row.in_stock_qty ?? 0;
      const supplied  = row.customer_supplied_qty ?? 0;
      const purchased = row.self_purchased_qty ?? 0;
      const returned  = row.returned_qty ?? 0;

      return `
        <tr class="hover:bg-gray-50">
          <td class="px-3 py-2 font-mono whitespace-nowrap">
            ${escapeHtml(fixtureId)}
          </td>
    
          <td class="px-3 py-2 break-all">
            ${escapeHtml(row.fixture_name || "-")}
          </td>
    
          <td class="px-3 py-2 text-right">
            ${inStock}
          </td>
    
          <td class="px-3 py-2 text-right">
            ${supplied}
          </td>
    
          <td class="px-3 py-2 text-right">
            ${purchased}
          </td>
    
          <td class="px-3 py-2 text-right">
            ${returned}
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
    next.remove();
    return;
  }

  // 關閉其他展開
  document.querySelectorAll("[data-inv-detail]").forEach(el => el.remove());

  const detailRow = document.createElement("tr");
  detailRow.dataset.invDetail = fixtureId;

  detailRow.innerHTML = `
    <td colspan="7" class="bg-gray-50 px-6 py-4 text-sm">
      載入明細中…
    </td>
  `;

  tr.after(detailRow);

  try {
    const [serialRes, dcRes, historyRes] = await Promise.all([
      apiInventorySerial({ fixture_id: fixtureId }),
      apiInventoryDatecode({ fixture_id: fixtureId }),
      apiInventoryHistory({ fixture_id: fixtureId, limit: 200 }),
    ]);

    // 🔥 在這裡才判斷！
    const hasSerial =
      serialRes &&
      (serialRes.total ?? 0) > 0;

    detailRow.innerHTML = `
      <td colspan="7" class="bg-gray-50 px-6 py-4 text-sm space-y-4">
        ${
          hasSerial
            ? renderInlineSerial(serialRes)
            : renderInlineDatecodeOnly(
                dcRes.items || [],
                dcRes.total_usage ?? 0
              )
        }
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

function renderInlineSerial(data) {

  if (!data || !data.idle) {
    return `<div class="text-gray-400">序號庫存：—</div>`;
  }

  const idle = data.idle;
  const deployed = data.deployed;
  const maintenance = data.maintenance;

  return `
    <div>
      <div class="font-semibold mb-1">序號庫存</div>

      <div class="grid grid-cols-3 gap-4 text-xs">

        <div>
          <span class="text-gray-500">使用中：</span>
          ${
            deployed.count > 0
              ? deployed.ranges.join(", ")
              : "—"
          }
        </div>

        <div>
          <span class="text-yellow-600">維修中：</span>
          ${
            maintenance.count > 0
              ? maintenance.ranges.join(", ")
              : "—"
          }
        </div>

        <div>
          <span class="text-green-600">可用：</span>
          ${
            idle.count > 0
              ? idle.ranges.join(", ")
              : "—"
          }
        </div>

      </div>

      <div class="mt-2 text-xs text-gray-400">
        Returned：${data.returned ?? 0}　
        Scrapped：${data.scrapped ?? 0}　
        總數：${data.total ?? 0}
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

  const THRESHOLD = 5;
  const hasMore = items.length > THRESHOLD;

  return `
    <div class="inv-history-block" data-expanded="false">
      <div class="font-semibold mb-2">收料 / 退料記錄</div>

      <div class="flex gap-2 mb-2">
        <button class="btn btn-xs" onclick="filterInvHistory('all')">全部</button>
        <button class="btn btn-xs" onclick="filterInvHistory('receipt')">只看收料</button>
        <button class="btn btn-xs" onclick="filterInvHistory('return')">只看退料</button>
      </div>

      <table class="w-full text-xs border-t border-collapse">
        <thead class="text-gray-500">
          <tr>
            <th class="py-1 text-left">日期</th>
            <th class="py-1 text-left">類型</th>
            <th class="py-1 text-left">單號</th>
            <th class="py-1 text-left">數量</th>
            <th class="py-1 text-left">記錄類型</th>
            <th class="py-1 text-left">序號明細</th>
            <th class="py-1 text-left">備註</th>
          </tr>
        </thead>
        <tbody id="invHistoryBody">
          ${items.map((h, i) => `
            <tr class="border-t inv-history-row ${h.transaction_type}"
                data-idx="${i}"
                style="${i >= THRESHOLD ? "display:none" : ""}">
              <td class="py-1">${getHistoryDate(h)}</td>
              <td class="py-1 ${h.transaction_type === "return" ? "text-red-600" : ""}">
                ${h.transaction_type === "return" ? "退料" : "收料"}
              </td>
              <td class="py-1">${h.order_no || "-"}</td>
              <td class="py-1">${h.quantity ?? 0}</td>
                <!-- 收退料方式 -->
              <td class="py-1">${renderRecordType(h)}</td>
              <!-- 序號明細 -->
              <td class="py-1 font-mono text-xs">
                ${renderSerialDetail(h)}
              </td>  
              <td class="py-1">${h.note || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      ${
        hasMore
          ? `<div class="text-center mt-2">
               <button class="btn btn-xs btn-ghost"
                       onclick="toggleInvHistoryExpand(this)">
                 展開其餘 ${items.length - THRESHOLD} 筆
               </button>
             </div>`
          : ""
      }
    </div>
  `;
}


function renderInlineDatecodeOnly(items, totalUsage) {
  if (!items.length) {
    return `<div class="text-gray-500">Datecode：—</div>`;
  }

  const totalStock = items.reduce((sum, d) => {
    return sum + (d.in_stock_qty ?? 0);
  }, 0);

  return `
    <div>
      <div class="font-semibold mb-1">Datecode 庫存</div>

      <div class="flex flex-wrap gap-3 text-xs mb-2">
        ${items.map(d => `
          <span>${escapeHtml(d.datecode)}（${d.in_stock_qty}）</span>
        `).join("")}
      </div>

      <div class="text-xs text-gray-500">
        總庫存：${totalStock}　
        累積使用次數：${totalUsage ?? 0}
      </div>
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


function toggleInvHistoryExpand(btn) {
  const block = btn.closest(".inv-history-block");
  const expanded = block.dataset.expanded === "true";

  block.querySelectorAll("[data-idx]").forEach(tr => {
    const idx = Number(tr.dataset.idx);
    if (idx >= 5) {
      tr.style.display = expanded ? "none" : "";
    }
  });

  block.dataset.expanded = expanded ? "false" : "true";
  btn.innerText = expanded ? "展開其餘紀錄" : "收合";
}


function toggleInvSerialExpand(btn, type) {
  const block = btn.closest(".inv-serial-block");
  if (!block) return;

  const expanded = block.dataset.expanded === "true";
  const listSpan = block.querySelector(".inv-serial-list");
  const fullSpan = block.querySelector(".inv-serial-full");

  if (!listSpan || !fullSpan) return;

  if (expanded) {
    // 收合
    listSpan.classList.remove("hidden");
    fullSpan.classList.add("hidden");
    block.dataset.expanded = "false";
    btn.innerText = btn.innerText.replace("收合", "展開");
  } else {
    // 展開
    listSpan.classList.add("hidden");
    fullSpan.classList.remove("hidden");
    block.dataset.expanded = "true";
    btn.innerText = "收合";
  }
}


function parseSerial(serial) {
  const s = String(serial).trim();

  const m = s.match(/^(.*?)(\d+)$/);
  if (!m) {
    return {
      raw: s,
      prefix: "__RAW__",
      num: null,
      width: null,
      isRaw: true
    };
  }

  return {
    raw: s,
    prefix: m[1],
    num: Number(m[2]),
    width: m[2].length,
    isRaw: false
  };
}


function compressSerialRanges(serials) {
  const parsed = serials.map(parseSerial);

  const raws = parsed.filter(s => s.isRaw);
  const normals = parsed.filter(s => !s.isRaw);

  const groups = {};
  normals.forEach(s => {
    groups[s.prefix] ??= [];
    groups[s.prefix].push(s);
  });

  const ranges = [];

  Object.values(groups).forEach(list => {
    list.sort((a, b) => a.num - b.num);

    let start = list[0];
    let prev = list[0];

    for (let i = 1; i < list.length; i++) {
      const cur = list[i];
      if (cur.num === prev.num + 1) {
        prev = cur;
      } else {
        ranges.push({ start, end: prev });
        start = cur;
        prev = cur;
      }
    }
    ranges.push({ start, end: prev });
  });

  // 把 raw 的補回來（每個當成單筆）
  raws.forEach(s => {
    ranges.push({ start: s, end: s });
  });

  return ranges;
}


function formatSerial(s) {
  return s.prefix + String(s.num).padStart(s.width, "0");
}


function renderSerialRanges(serials) {
  const ranges = compressSerialRanges(serials);

  return ranges
    .map(r => {
      const a = formatSerial(r.start);
      const b = formatSerial(r.end);
      return a === b ? a : `${a}–${b}`;
    })
    .join(", ");
}


function renderRecordType(h) {
  switch (h.record_type) {
    case "individual":
      return "序號";
    case "datecode":
      return "Datecode";
    case "batch":
      return "批量";
    default:
      return "-";
  }
}


function renderSerialDetail(h) {
  if (h.record_type !== 'batch' && h.record_type !== 'individual') {
    return '-';
  }

  return `
    <a class="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs cursor-pointer"
       onclick="goToTransactionSerialSearch({
         fixture_id: '${h.fixture_id}',
         date_from: '${h.transaction_date?.slice(0,10) || ''}',
         date_to: '${h.transaction_date?.slice(0,10) || ''}'
       })">
       <span>查看明細</span>
    </a>
  `;
}


function goToSerialViewFromHistory(h) {
  const fixtureId = h.fixture_id;
  const date = getHistoryDate(h); // 你已經有這個

  // 組 query
  const params = new URLSearchParams({
    tab: "transactions",
    subtab: "view-all",
    mode: "serial",
    fixture_id: fixtureId,
    date: date,
  });

  // 跳轉
  window.location.href = `/index.html?${params.toString()}`;
}


document.addEventListener("DOMContentLoaded", () => {
  if (typeof initInventoryPage === "function") {
    initInventoryPage();
  }
});


// expose
window.loadInventoryOverview = loadInventoryOverview;
window.initInventoryPage = initInventoryPage;
window.toggleInventoryInlineDetail = toggleInventoryInlineDetail;
window.toggleInvHistoryExpand = toggleInvHistoryExpand;
window.toggleInvSerialExpand = toggleInvSerialExpand;