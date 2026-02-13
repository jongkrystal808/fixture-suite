/**
 * 治具資料維護前端控制 (v4.x)
 * 完全對應 index.html 的三段式後台 UI
 */

/* ============================================================
 * 全域狀態變數
 * ============================================================ */
let fxPage = 1;
let fxPager = null;

/* ============================================================
 * Owners 簡易 API
 * ============================================================ */
async function apiGetOwnersSimple() {
  return api("/owners/simple");
}
window.apiGetOwnersSimple = apiGetOwnersSimple;

async function apiListFixtures(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return api(`/fixtures?${qs}`);
}
window.apiListFixtures = apiListFixtures;

async function apiGetFixture(id) {
  return api(`/fixtures/${id}`);
}
window.apiGetFixture = apiGetFixture;

async function apiCreateFixture(data) {
  return api("/fixtures", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

async function apiUpdateFixture(id, data) {
  return api(`/fixtures/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/* ============================================================
 * DOM Ready 初始化
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // 初始化分頁控制器
  fxPager = createPagination({
    getPage: () => {
      return fxPage;
    },
    setPage: (v) => {
      fxPage = v;
    },
    getPageSize: () => {
      const select = document.getElementById("fxPageSize");
      const val = select ? Number(select.value) : 8;
      return val || 8;
    },
    onPageChange: (page) => {
      loadFixtureList();
    },
    els: {
      count: document.getElementById("fxCount"),
      pageNow: document.getElementById("fxPageNow"),
      pageMax: document.getElementById("fxPageMax"),
    }
  });

  // 綁定事件
  const searchInput = document.getElementById("fxSearch");
  const ownerFilter = document.getElementById("fxOwnerFilter");
  const pageSizeSelect = document.getElementById("fxPageSize");

  searchInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      fxPage = 1;
      loadFixtureList();
    }
  });

  ownerFilter?.addEventListener("change", () => {
    fxPage = 1;
    loadFixtureList();
  });

  pageSizeSelect?.addEventListener("change", () => {
    fxPage = 1;
    loadFixtureList();
  });
});

/* ============================================================
 * Admin Sidebar Entry
 * ============================================================ */
function loadAdminFixtures() {
  fxPage = 1;
  loadFixtureList();
}
window.loadAdminFixtures = loadAdminFixtures;

/* ============================================================
 * Customer Ready Hook
 * ============================================================ */
onCustomerReady(() => {
  loadOwnerDropdown();
  loadFixtureList();
});

/* ============================================================
 * Owner 下拉
 * ============================================================ */
async function loadOwnerDropdown() {
  const ownerSelect = document.getElementById("fxOwnerFilter");
  if (!ownerSelect) {
    return;
  }

  let owners = [];
  try {
    owners = await apiGetOwnersSimple();
  } catch (err) {
    console.error("載入 owner 失敗", err);
    return;
  }

  ownerSelect.innerHTML = `<option value="">全部</option>`;

  owners.forEach(o => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name;
    ownerSelect.appendChild(opt);
  });
}

/* ============================================================
 * 載入列表
 * ============================================================ */
async function loadFixtureList() {

  if (!window.currentCustomerId) {
    console.warn("currentCustomerId not set");
    return;
  }

  // 確保 fxPage 是數字
  if (typeof fxPage !== "number" || isNaN(fxPage) || fxPage < 1) {
    fxPage = 1;
  }

  const searchInput = document.getElementById("fxSearch");
  const ownerSelect = document.getElementById("fxOwnerFilter");
  const pageSizeSelect = document.getElementById("fxPageSize");

  const search = searchInput?.value.trim() ?? "";
  const owner = ownerSelect?.value || "";
  let pageSize = pageSizeSelect ? Number(pageSizeSelect.value) : 8;

  if (isNaN(pageSize) || pageSize < 1) {
    pageSize = 8;
  }

  const skip = (fxPage - 1) * pageSize;

  const params = {
    skip: skip,
    limit: pageSize,
  };

  if (search) params.search = search;
  if (owner) params.owner_id = owner;

  try {
    const data = await apiListFixtures(params);

    const maxPage = Math.max(1, Math.ceil(data.total / pageSize));

    if (fxPage > maxPage) {
      fxPage = maxPage;
    }

    renderFixtureTable(data.fixtures);

    if (fxPager) {
      fxPager.render(data.total);
    }
  } catch (err) {
    console.error("載入治具列表失敗", err);
  }
}

/* ============================================================
 * 渲染表格
 * ============================================================ */
function renderFixtureTable(rows) {
  const table = document.getElementById("fxTable");
  if (!table) return;

  table.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    table.innerHTML = `
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
    tr.className = "hover:bg-gray-50 transition";
    tr.innerHTML = `
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
    `;

    table.appendChild(tr);
  });
}

/* ============================================================
 * Modal：新增 / 編輯
 * ============================================================ */
function openFixtureModal(mode, id = null) {
  const modal = document.getElementById("fixtureModal");
  const form = document.getElementById("fixtureForm");

  if (!modal || !form) return;

  form.reset();
  form.dataset.mode = mode;
  form.dataset.id = id || "";

  const title = document.getElementById("fixtureModalTitle");
  const idInput = document.getElementById("fmFixtureId");

  if (mode === "create") {
    if (title) title.textContent = "新增治具";
    if (idInput) idInput.disabled = false;
  } else {
    if (title) title.textContent = "編輯治具";
    if (idInput) idInput.disabled = true;
    loadFixtureDetailToForm(id);
  }

  modal.style.display = "flex";
}
window.openFixtureModal = openFixtureModal;

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
  const modal = document.getElementById("fixtureModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.add("hidden");
  }
}
window.closeFixtureModal = closeFixtureModal;

/* ============================================================
 * Modal 送出
 * ============================================================ */
async function submitFixtureForm(e) {
  e?.preventDefault();

  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const form = document.getElementById("fixtureForm");
  if (!form) return;

  const mode = form.dataset.mode;
  const id = form.dataset.id;
  const fixture_id = document.getElementById("fmFixtureId").value.trim();

  if (!fixture_id && mode === "create") {
    return toast("治具編號為必填", "warning");
  }

  const payload = {
    id: fixture_id,
    fixture_name: document.getElementById("fmFixtureName").value.trim(),
    fixture_type: document.getElementById("fmFixtureType").value.trim(),
    storage_location: document.getElementById("fmStorage").value.trim(),
    replacement_cycle: Number(document.getElementById("fmCycle").value),
    cycle_unit: document.getElementById("fmCycleUnit").value,
    owner_id: Number(document.getElementById("fmOwnerId").value) || null,
    note: document.getElementById("fmNote").value.trim(),
  };

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
 * 報廢治具
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

    await api(`/fixtures/${id}/scrap`, {
      method: "POST",
    });

    toast("治具已報廢");
    loadFixtureList();

  } catch (err) {
    console.error(err);
    const msg = err?.message || err?.detail || "報廢治具失敗";
    toast(msg, "error");
  }
}
window.scrapFixture = scrapFixture;

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
 * Excel 匯出/匯入
 * ============================================================ */
async function fxExportFixturesXlsx() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
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

    if (!res.ok) {
      throw { detail: data };
    }

    const fixtures = data.fixtures || {};
    const imported = fixtures.imported || 0;
    const skipped = fixtures.skipped || 0;
    const successRows = fixtures.success_rows || [];
    const skippedRows = fixtures.skipped_rows || [];
    const errors = Array.isArray(data.errors) ? data.errors : [];

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

function openImportResultModal({ title, summary, errors }) {
  const modal = document.getElementById("importResultModal");
  const titleEl = document.getElementById("importModalTitle");
  const summaryEl = document.getElementById("importModalSummary");
  const errorsEl = document.getElementById("importModalErrors");

  if (titleEl) titleEl.innerText = title || "匯入結果";
  if (summaryEl) summaryEl.innerHTML = summary || "";
  if (errorsEl) errorsEl.innerText = errors || "";

  if (modal) modal.classList.remove("hidden");
}

function closeImportResultModal() {
  const modal = document.getElementById("importResultModal");
  if (modal) modal.classList.add("hidden");
}
window.closeImportResultModal = closeImportResultModal;