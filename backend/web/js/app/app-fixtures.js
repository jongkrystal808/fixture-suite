/**
 * 治具資料維護前端控制 (v4.x)
 * 完全對應 index.html 的三段式後台 UI
 *
 * ✔ 查詢 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 對應 fixtureModal（index.html）
 * ✔ skip / limit（customer 由 context/header 決定）
 * ✔ owner 篩選
 */


/* ============================================================
 * Owners 簡易 API
 * ============================================================ */

async function apiGetOwnersSimple() {
  return api("/owners/simple");
}
window.apiGetOwnersSimple = apiGetOwnersSimple;


/* ============================================================
 * 分頁狀態 + DOM
 * ============================================================ */

let fxPage = 1;
let fxPager = null;

document.addEventListener("DOMContentLoaded", () => {
  fxPager = createPagination({
    getPage: () => fxPage,
    setPage: v => fxPage = v,
    getPageSize: () => Number(fxPageSizeSelect?.value || 10),
    onPageChange: () => loadFixtureList(),
    els: {
      count: fxCount,
      pageNow: fxPageNow,
      pageMax: fxPageMax,
    }
  });
});


/* ============================================================
 * 🧭 Admin Sidebar Entry
 * 後台管理 → 治具管理
 *
 * ⚠️ v4.x：
 * - customer gate 由 app-admin.js 處理
 * - 這裡不再自行檢查 customer
 * ============================================================ */
function loadAdminFixtures() {
  fxPage = 1;
  loadFixtureList();
}
window.loadAdminFixtures = loadAdminFixtures;


/* ============================================================
 * DOM references
 * ============================================================ */

const fxTable = document.getElementById("fxTable");
const fxCount = document.getElementById("fxCount");
const fxPageNow = document.getElementById("fxPageNow");
const fxPageMax = document.getElementById("fxPageMax");

/* 查詢欄位 */
const fxSearchInput = document.getElementById("fxSearch");
const fxOwnerFilter = document.getElementById("fxOwnerFilter");
const fxPageSizeSelect = document.getElementById("fxPageSize");

/* Modal */
const fixtureModal = document.getElementById("fixtureModal");
const fmForm = document.getElementById("fixtureForm");


/* ============================================================
 * 初始化（v4.x）
 * - 一律等 customer ready
 * ============================================================ */

onCustomerReady(() => {
  loadOwnerDropdown();
  loadFixtureList();
});


/* ============================================================
 * Owner 下拉
 * ============================================================ */

async function loadOwnerDropdown() {
  if (!fxOwnerFilter) {
    console.warn("fxOwnerFilter element not found in DOM");
    return;
  }

  let owners = [];
  try {
    owners = await apiGetOwnersSimple();
  } catch (err) {
    console.error("載入 owner 失敗", err);
    return;
  }

  fxOwnerFilter.innerHTML = `<option value="">全部</option>`;

  owners.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name;
    fxOwnerFilter.appendChild(opt);
  });
}


/* ============================================================
 * 載入列表（v4.x）
 * - 不再自行帶 customer_id
 * - customer 由 api-config.js → X-Customer-Id
 * ============================================================ */

async function loadFixtureList() {
  // v4.x：customer 已由 context 保證
  if (!window.currentCustomerId) return;

  const search = fxSearchInput?.value.trim() ?? "";
  const owner = fxOwnerFilter?.value || "";
  const pageSize = Number(fxPageSizeSelect?.value || 10);

  const params = {
    skip: (fxPage - 1) * pageSize,
    limit: pageSize,
  };

  if (search) params.search = search;
  if (owner) params.owner_id = owner;

  const data = await apiListFixtures(params);

  renderFixtureTable(data.fixtures);
  if (fxPager) {
      fxPager.render(data.total);
    }


}


/* ============================================================
 * 渲染治具維護表格（fixtures）
 * ============================================================ */
function renderFixtureTable(rows) {
  fxTable.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    fxTable.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-3 text-gray-400">
          沒有資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(f => {
    const id   = f.fixture_id ?? f.id ?? "-";
    const name = f.fixture_name ?? "-";
    const type = f.fixture_type ?? "-";

    const qtyPurchased = f.self_purchased_qty ?? 0;
    const qtySupplied  = f.customer_supplied_qty ?? 0;
    const totalQty     = qtyPurchased + qtySupplied;

    const storage = f.storage_location ?? "-";
    const owner   = f.owner_name ?? "-";
    const note    = f.note ?? "-";

    let cycleText = "-";
    if (f.replacement_cycle !== null && f.replacement_cycle !== undefined) {
      switch (f.cycle_unit) {
        case "days":
          cycleText = `${f.replacement_cycle} 天`;
          break;
        case "uses":
          cycleText = `${f.replacement_cycle} 次`;
          break;
      }
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-2 pr-4 text-center">
          <span class="text-indigo-600 font-bold hover:underline cursor-pointer"
                onclick="openFixtureDetail('${id}')">
            ${id}
          </span>
        </td>

        <td class="py-2 pr-4 max-w-[200px] truncate text-center" title="${name}">
          ${name}
        </td>

        <td class="py-2 pr-4 text-center">${type}</td>

        <td class="py-2 pr-4 text-center">
          ${qtyPurchased} / ${qtySupplied} / ${totalQty}
        </td>

        <td class="py-2 pr-4 text-center">${storage}</td>

        <td class="py-2 pr-4 text-center">${cycleText}</td>
        <td class="py-2 pr-4 text-center">${owner}</td>

        <td class="py-2 pr-4 max-w-[200px] truncate text-center" title="${note}">
          ${note}
        </td>

        <td class="py-2 pr-4 whitespace-nowrap text-right w-28">
          <div class="flex justify-end gap-2">
            <button class="btn btn-xs btn-outline"
                    onclick="openFixtureModal('edit','${id}')">
              編輯
            </button>
            <button class="btn btn-xs btn-error"
                    onclick="scrapFixture('${id}')">
              報廢
            </button>
          </div>
        </td>
      </tr>
    `;

    fxTable.appendChild(tr);
  });
}


/* ============================================================
 * Modal：新增 / 編輯
 * ============================================================ */

function openFixtureModal(mode, id = null) {
  fmForm.reset();
  fmForm.dataset.mode = mode;
  fmForm.dataset.id = id || "";

  const title = document.getElementById("fixtureModalTitle");
  const idInput = document.getElementById("fmFixtureId");

  if (mode === "create") {
    title.textContent = "新增治具";
    idInput.disabled = false;
  } else {
    title.textContent = "編輯治具";
    idInput.disabled = true;
    loadFixtureDetailToForm(id);
  }

  fixtureModal.style.display = "flex";
}

async function loadFixtureDetailToForm(id) {
  try {
    const data = await apiGetFixture(id);

    document.getElementById("fmFixtureId").value = data.fixture_id || data.id;
    document.getElementById("fmFixtureName").value = data.fixture_name || "";
    document.getElementById("fmFixtureType").value = data.fixture_type || "";
    document.getElementById("fmSerialNumber").value = data.serial_number || "";
    document.getElementById("fmStorage").value = data.storage_location || "";
    document.getElementById("fmCycle").value = data.replacement_cycle ?? 0;
    document.getElementById("fmCycleUnit").value = data.cycle_unit || "none";
    document.getElementById("fmOwnerId").value = data.owner_id || "";
    document.getElementById("fmNote").value = data.note || "";
  } catch (err) {
    console.error(err);
    toast("讀取治具資料失敗", "error");
  }
}

function closeFixtureModal() {
  fixtureModal.style.display = "none";
  fixtureModal.classList.add("hidden");
}
window.closeFixtureModal = closeFixtureModal;


/* ============================================================
 * Modal 送出（v4.x）
 * - 不再自行取得 customer_id
 * - 不再傳 customer_id 給 API
 * ============================================================ */

async function submitFixtureForm(e) {
  e?.preventDefault();

  // v4.x：customer context 已由外層保證
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const mode = fmForm.dataset.mode;
  const id = fmForm.dataset.id;
  const fixture_id = document.getElementById("fmFixtureId").value.trim();

  if (!fixture_id && mode === "create") {
    return toast("治具編號為必填", "warning");
  }


  const payload = {
      id: fixture_id, // 只有 create 時會用
      fixture_name: document.getElementById("fmFixtureName").value.trim(),
      fixture_type: document.getElementById("fmFixtureType").value.trim(),
      storage_location: document.getElementById("fmStorage").value.trim(),
      replacement_cycle: Number(document.getElementById("fmCycle").value),
      cycle_unit: document.getElementById("fmCycleUnit").value,
      owner_id: Number(document.getElementById("fmOwnerId").value) || null,
      note: document.getElementById("fmNote").value.trim(),
    };


  if (mode === "create") {
    payload.id = fixture_id;
    }

  try {
    if (mode === "create") {
      await apiCreateFixture(payload);
      toast("新增成功");
    } else {
      await apiUpdateFixture(id, payload);
      toast("更新成功");
    }

    closeFixtureModal();
    loadFixtureList();
  } catch (err) {
    console.error(err);
    toast("治具操作失敗", "error");
  }
}

window.submitFixtureForm = submitFixtureForm;


/* ============================================================
 * 報廢治具（v4.x）
 * ============================================================ */

async function scrapFixture(id) {
  if (!id || typeof id !== "string") {
    toast("治具資料異常，請重新整理", "error");
    return;
  }

  if (!window.currentCustomerId) {
    toast("尚未選擇客戶", "warning");
    return;
  }

  try {
    // 1️⃣ 先取得報廢提示資訊
    const info = await api(`/fixtures/${id}/scrap-info`);

    const qty = info.in_stock_qty ?? 0;
    const hasTx = info.has_transactions;

    const message = `
確定要【報廢】治具 ${id} 嗎？

${qty > 0 ? `• 目前庫存數量：${qty}\n` : ""}
${hasTx ? "• 已存在收/退料或使用紀錄\n" : ""}
• 報廢後不會出現在正常清單
• 歷史資料會完整保留
• 可隨時還原
    `.trim();

    if (!confirm(message)) return;

    // 2️⃣ 確認後執行報廢
    await api(`/fixtures/${id}/scrap`, {
      method: "POST",
    });

    toast("治具已報廢");
    loadFixtureList();

  } catch (err) {
    console.error(err);
    toast(err?.detail || "報廢治具失敗", "error");
  }
}

window.scrapFixture = scrapFixture;

//還原治具
async function restoreFixture(id) {
  if (!id) return;

  if (!confirm(`確定要還原治具 ${id}？`)) return;

  try {
    await api(`/fixtures/${id}/restore`, {
      method: "POST",
    });

    toast("治具已還原");
    loadFixtureList();
  } catch (err) {
    console.error(err);
    toast(err?.detail || "還原治具失敗", "error");
  }
}

window.restoreFixture = restoreFixture;



/* ============================================================
 * 綁定查詢 UI（v4.x）
 * ============================================================ */

fxSearchInput?.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    fxPage = 1;
    loadFixtureList();
  }
});

fxOwnerFilter?.addEventListener("change", () => {
  fxPage = 1;
  loadFixtureList();
});

fxPageSizeSelect?.addEventListener("change", () => {
  fxPage = 1;
  loadFixtureList();
});

// 保留既有全域（與本檔案無關）
window.mmOpenModelModal = mmOpenModelModal;


/* ============================================================
 * 匯出（舊版 function，保留但不再手動處理 customer）
 * ============================================================ */

async function exportFixtures() {
  const params = {
    search: document.getElementById("fixtureSearch")?.value,
    owner_id: document.getElementById("fixtureOwner")?.value,
  };

  // v4.x：不自行 fetch、不塞 header
  window.location.href =
    apiURL("/fixtures/export") + "?" + new URLSearchParams(params).toString();
}


/* ============================================================
 * 匯入（舊版 function，v4.x 正確寫法）
 * ============================================================ */

async function importFixtures(input) {
  const file = input.files[0];
  if (!file) return;

  const fd = new FormData();
  fd.append("file", file);

  try {
    await api("/fixtures/import", {
      method: "POST",
      body: fd,
      rawBody: true,
    });

    toast("匯入完成");
    loadFixtureList();
  } catch (err) {
    console.error(err);
    toast("匯入失敗", "error");
  } finally {
    input.value = "";
  }
}


/* ============================================================
 * 下載匯入範本
 * ============================================================ */

function downloadFixtureTemplate() {
  window.location.href = apiURL("/fixtures/import/template");
}


/* ============================================================
 * v4.x 標準：匯出 Excel
 * ============================================================ */

async function fxExportFixturesXlsx() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    // ⭐ 不自行處理 Authorization / customer
    const res = await fetch(apiURL("/fixtures/export"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "X-Customer-Id": window.currentCustomerId,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "匯出失敗");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `fixtures_${window.currentCustomerId}.xlsx`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    toast("治具匯出失敗", "error");
  }
}

window.fxExportFixturesXlsx = fxExportFixturesXlsx;


/* ============================================================
 * 下載 Excel 匯入範本（v4.x）
 * ============================================================ */

async function fxDownloadFixturesTemplate() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    const res = await fetch(apiURL("/fixtures/template"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "X-Customer-Id": window.currentCustomerId,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "下載失敗");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fixtures_import_template.xlsx";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    toast("下載治具範本失敗", "error");
  }
}

window.fxDownloadFixturesTemplate = fxDownloadFixturesTemplate;


/* ============================================================
 * v4.x 標準：匯入 Excel
 * ============================================================ */

/* ============================================================
 * v4.x 標準：匯入 Excel（Fixtures）
 * - 使用 Import Result Modal 顯示結果
 * - 成功 / 失敗格式統一
 * - customer 由 context/header 決定
 * ============================================================ */

/* ============================================================
 * v4.x 標準：匯入 Excel（Fixtures）
 * - 成功：顯示「N 行成功」
 * - 失敗：逐行顯示錯誤原因
 * ============================================================ */

async function fxImportFixtures(file) {
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    toast("僅支援 .xlsx Excel 檔案", "warning");
    return;
  }

  if (!window.currentCustomerId) {
    toast("尚未選擇客戶", "warning");
    return;
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(apiURL("/fixtures/import"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        "X-Customer-Id": window.currentCustomerId,
      },
      body: fd,
    });

    const data = await res.json();

    // ❌ 真正失敗（HTTP != 200）
    if (!res.ok) {
      throw { detail: data };
    }


    // ===== v4.x fixtures import 正確結構 =====
    const fixtures = data.fixtures || {};
    const imported = fixtures.imported || 0;
    const skipped = fixtures.skipped || 0;
    const successRows = fixtures.success_rows || [];
    const skippedRows = fixtures.skipped_rows || [];
    const errors = Array.isArray(res.errors) ? res.errors : [];

    // ===== 狀態 1：成功 =====
    if (imported > 0) {
      openImportResultModal({
        title: "✅ 治具匯入完成",
        summary: `
          <div class="space-y-1">
            <div>成功：${imported} 行成功匯入</div>
            ${
              skipped > 0
                ? `<div>略過：${skipped} 行（第 ${skippedRows.join("、")} 行）</div>`
                : ""
            }
            ${
              successRows.length
                ? `<div class="text-gray-500">成功行號：第 ${successRows.join("、")} 行</div>`
                : ""
            }
          </div>
        `,
        errors: ""
      });

      loadFixtureList();
      return;
    }

    // ===== 狀態 2：無有效資料（warning）=====
    openImportResultModal({
      title: "⚠️ 沒有匯入任何治具資料",
      summary: `
        <div class="space-y-1">
          <div>未匯入任何有效治具資料</div>
          ${
            skipped > 0
              ? `<div>略過：${skipped} 行（第 ${skippedRows.join("、")} 行）</div>`
              : ""
          }
          ${
            res.warning
              ? `<div class="text-gray-500">${res.warning}</div>`
              : ""
          }
        </div>
      `,
      errors: ""
    });

  } catch (err) {
    console.error(err);

    const detail = err?.detail || {};
    const errors = Array.isArray(detail.errors) ? detail.errors : [];

    openImportResultModal({
      title: "❌ 治具匯入失敗",
      summary: `
        <div>失敗：共 ${errors.length} 行錯誤，資料已全部回復</div>
      `,
      errors: errors.join("\n")
    });
  }
}



function fxImportFixturesXlsx(file) {
  if (!file) return;
  fxImportFixtures(file);
}
window.fxImportFixturesXlsx = fxImportFixturesXlsx;


/* ============================================================
 * Import Result Modal（共用）
 * ============================================================ */

function openImportResultModal({ title, summary, errors }) {
  document.getElementById("importModalTitle").innerText = title || "匯入結果";
  document.getElementById("importModalSummary").innerHTML = summary || "";
  document.getElementById("importModalErrors").innerText = errors || "";

  document.getElementById("importResultModal").classList.remove("hidden");
}

function closeImportResultModal() {
  document.getElementById("importResultModal").classList.add("hidden");
}

window.closeImportResultModal = closeImportResultModal;
