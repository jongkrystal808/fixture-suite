/**
 * 治具資料維護前端控制 (v3.5)
 * 完全對應 index.html 的三段式後台 UI
 *
 * ✔ 查詢 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 對應 fixtureModal（index.html）
 * ✔ skip / limit / customer_id
 * ✔ owner / status 篩選
 */


/* ============================================================
 * 🔐 Admin Only Guard（後台模組宣告）
 * ============================================================ */
(function () {
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("[app-fixtures] not admin, module disabled");
    return;
  }
})();


/* ============================================================
 * 取得 customer_id
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * Owners 簡易 API（補上缺少的 apiGetOwnersSimple）
 * 對應後端 GET /owners/active
 * ============================================================ */

async function apiGetOwnersSimple() {
  // 後端 owners.py 裡已經有 /owners/active
  return api("/owners/active");
}
window.apiGetOwnersSimple = apiGetOwnersSimple;

/* ============================================================
 * 分頁狀態 + DOM
 * ============================================================ */

let fxPage = 1;

/* ============================================================
 * 🧭 Admin Sidebar Entry
 * 後台管理 → 治具管理
 * ============================================================ */
function loadAdminFixtures() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    alert("請先選擇客戶");
    return;
  }

  fxPage = 1;
  loadFixtureList();
}

window.loadAdminFixtures = loadAdminFixtures;


const fxTable = document.getElementById("fxTable");
const fxCount = document.getElementById("fxCount");
const fxPageNow = document.getElementById("fxPageNow");
const fxPageMax = document.getElementById("fxPageMax");

/* 查詢欄位 */
const fxSearchInput = document.getElementById("fxSearch");
const fxStatusFilter = document.getElementById("fxStatusFilter");
const fxOwnerFilter = document.getElementById("fxOwnerFilter");
const fxPageSizeSelect = document.getElementById("fxPageSize");

/* Modal */
const fixtureModal = document.getElementById("fixtureModal");
const fmForm = document.getElementById("fixtureForm");

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  loadOwnerDropdown();
  loadFixtureList();
});

/* ============================================================
 * Owner 下拉
 * ============================================================ */

async function loadOwnerDropdown() {
  // ✅ 使用已經宣告好的 fxOwnerFilter，而不是不存在的 fxOwnerSelect
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

  owners.forEach((o) => {
    fxOwnerFilter.innerHTML += `<option value="${o.id}">${o.primary_owner}</option>`;
  });
}

/* ============================================================
 * 載入列表
 * ============================================================ */

async function loadFixtureList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  const search = fxSearchInput?.value.trim() ?? "";
  const owner = fxOwnerFilter?.value || "";
  const status = fxStatusFilter?.value || "";
  const pageSize = Number(fxPageSizeSelect?.value || 10);

  const params = {
    customer_id,
    skip: (fxPage - 1) * pageSize,
    limit: pageSize,
  };

  if (search) params.search = search;
  if (owner) params.owner_id = owner;
  if (status) params.status_filter = status;

  const data = await apiListFixtures(params);

  renderFixtureTable(data.fixtures);
  renderFixturePagination(data.total);
}

/* ============================================================
 * 渲染表格
 * ============================================================ */
function renderFixtureTable(rows) {
  fxTable.innerHTML = "";

  if (!rows || rows.length === 0) {
    fxTable.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-3 text-gray-400">
          沒有資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach((f) => {
    const id = f.fixture_id || "-";
    const name = f.fixture_name || "-";
    const type = f.fixture_type || "-";

    // ⭐ fixtures 現在就是唯一真相來源
    const qtyPurchased = f.self_purchased_qty ?? 0;
    const qtySupplied  = f.customer_supplied_qty ?? 0;
    const qtyAvailable = f.available_qty ?? 0;

    const storage = f.storage_location || "-";
    const status  = f.status || "-";
    const owner   = f.owner_name || "-";
    const note    = f.note || "-";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 pr-4">
        <span class="text-indigo-600 underline cursor-pointer"
              onclick="openFixtureDetail('${id}')">
          ${id}
        </span>
      </td>

      <td class="py-2 pr-4">${name}</td>
      <td class="py-2 pr-4">${type}</td>

      <!-- ✅ 最終庫存顯示（fixtures） -->
      <td class="py-2 pr-4">
        ${qtyPurchased} / ${qtySupplied} / ${qtyAvailable}
      </td>

      <td class="py-2 pr-4">${status}</td>
      <td class="py-2 pr-4">${storage}</td>
      <td class="py-2 pr-4">${owner}</td>
      <td class="py-2 pr-4">${note}</td>

      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-outline"
                onclick="openFixtureModal('edit','${id}')">
          編輯
        </button>
        <button class="btn btn-xs btn-error"
                onclick="deleteFixture('${id}')">
          刪除
        </button>
      </td>
    `;

    fxTable.appendChild(tr);
  });
}


/* ============================================================
 * 分頁
 * ============================================================ */

function renderFixturePagination(total) {
  const pageSize = Number(fxPageSizeSelect?.value || 10);
  const max = Math.ceil(total / pageSize) || 1;

  fxCount.textContent = total;
  fxPageMax.textContent = max;
  fxPageNow.textContent = fxPage;

  if (fxPage > max) {
    fxPage = max;
  }
}

function goFixturePage(action) {
  const max = Number(fxPageMax.textContent);

  if (action === "first") fxPage = 1;
  if (action === "prev" && fxPage > 1) fxPage--;
  if (action === "next" && fxPage < max) fxPage++;
  if (action === "last") fxPage = max;

  loadFixtureList();
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
    idInput.disabled = false;   // ✅ 可輸入
  } else {
    title.textContent = "編輯治具";
    idInput.disabled = true;    // 🔒 編輯不可改主鍵
    loadFixtureDetailToForm(id);
  }

  fixtureModal.style.display = "flex";
}


async function loadFixtureDetailToForm(id) {
  try {
    const data = await apiGetFixture(id);

    document.getElementById("fmFixtureId").value = data.fixture_id || data.id;
    document.getElementById("fmFixtureName").value = data.fixture_name;
    document.getElementById("fmFixtureType").value = data.fixture_type;
    document.getElementById("fmSerialNumber").value = data.serial_number || "";
    document.getElementById("fmStorage").value = data.storage_location || "";
    document.getElementById("fmCycle").value = data.replacement_cycle || 0;
    document.getElementById("fmCycleUnit").value = data.cycle_unit || "none";
    document.getElementById("fmStatus").value = data.status || "normal";
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
 * Modal 送出
 * ============================================================ */

async function submitFixtureForm(e) {
  e?.preventDefault();

  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    return toast("請先選擇客戶", "warning");
  }

   // ✅ 改用 dataset
  const mode = fmForm.dataset.mode;
  const id = fmForm.dataset.id;
  const fixture_id = document.getElementById("fmFixtureId").value.trim();

  if (!fixture_id && mode === "create") {
    return toast("治具編號為必填", "warning");
  }

  // ✅ Get status from form and map to backend enum value
  const rawStatus = document.getElementById("fmStatus").value;
  const mappedStatus = mapStatusToBackend(rawStatus);

  const payload = {
      fixture_name: document.getElementById("fmFixtureName").value.trim(),
      fixture_type: document.getElementById("fmFixtureType").value.trim(),
      serial_number: document.getElementById("fmSerialNumber").value.trim(),
      storage_location: document.getElementById("fmStorage").value.trim(),
      replacement_cycle: Number(document.getElementById("fmCycle").value),
      cycle_unit: document.getElementById("fmCycleUnit").value,
      status: mappedStatus,
      owner_id: Number(document.getElementById("fmOwnerId").value) || null,
      note: document.getElementById("fmNote").value.trim(),
    };


  // ✅ fixture_id 只在 create 時送
  if (mode === "create") {
    payload.fixture_id = fixture_id;
  }

  try {
    if (mode === "create") {
      await apiCreateFixture(payload, customer_id); // customer_id 只走 query
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
 * 刪除治具
 * ============================================================ */
async function deleteFixture(id) {
  if (
    !id ||
    typeof id !== "string" ||
    id === "-" ||
    id === "undefined" ||
    id === "[object Object]"
  ) {
    toast("治具資料異常，請重新整理", "error");
    return;
  }

  if (!confirm(`確定要刪除治具 ${id}？`)) return;

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("尚未選擇客戶", "warning");

  try {
    await apiDeleteFixture(id, customer_id);
    toast("刪除成功");
    loadFixtureList();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}


/* ============================================================
 * 綁定查詢 UI
 * ============================================================ */

fxSearchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    fxPage = 1;
    loadFixtureList();
  }
});

fxStatusFilter?.addEventListener("change", () => {
  fxPage = 1;
  loadFixtureList();
});

fxOwnerFilter?.addEventListener("change", () => {
  fxPage = 1;
  loadFixtureList();
});

fxPageSizeSelect?.addEventListener("change", () => {
  fxPage = 1;
  loadFixtureList();
});

window.mmOpenModelModal = mmOpenModelModal;

//export fixtures
async function exportFixtures() {
  const params = {
    search: document.getElementById("fixtureSearch")?.value,
    status: document.getElementById("fixtureStatus")?.value,
    owner_id: document.getElementById("fixtureOwner")?.value,
  };

  const res = await api("/fixtures/export", {
    params,
  });

  // 後端直接回傳檔案
  window.location.href = apiURL("/fixtures/export") + "?" +
    new URLSearchParams(params).toString();
}


//import fixtures
async function importFixtures(input) {
  const file = input.files[0];
  if (!file) return;

  const fd = new FormData();
  fd.append("file", file);

  try {
    await api("/fixtures/import", {
      method: "POST",
      body: fd,
    });

    alert("匯入完成");
    loadFixtureList(); // 重新整理
  } catch (err) {
    alert("匯入失敗：" + err.message);
  } finally {
    input.value = "";
  }
}

//download import template
function downloadFixtureTemplate() {
  window.location.href = apiURL("/fixtures/import/template");
}

function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function fxExportFixturesXlsx() {
  const token = localStorage.getItem("auth_token");
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  const url =
    `/api/v2/fixtures/export?customer_id=${encodeURIComponent(customer_id)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "匯出失敗");
    }

    // ✅ 一定要 blob
    const blob = await res.blob();

    // ✅ 瀏覽器下載
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `fixtures_${customer_id}.xlsx`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

  } catch (err) {
    console.error(err);
    toast("治具匯出失敗", "error");
  }
}

window.fxExportFixturesXlsx = fxExportFixturesXlsx;


async function fxDownloadFixturesTemplate() {
  const token = localStorage.getItem("auth_token");
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    const res = await fetch(
      `/api/v2/fixtures/template?customer_id=${encodeURIComponent(customer_id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("下載失敗");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fixtures_import_template.xlsx";
    a.click();

    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    toast("下載治具範本失敗", "error");
  }
}

window.fxDownloadFixturesTemplate = fxDownloadFixturesTemplate;


async function fxImportFixtures(file) {
  console.log("📦 file =", file);
  console.log("📄 file.name =", file?.name);
  console.log("📄 file.type =", file?.type);

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return toast("僅支援 .xlsx Excel 檔案", "warning");
  }

  const token = localStorage.getItem("auth_token");
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(
      `/api/v2/fixtures/import?customer_id=${encodeURIComponent(customer_id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // ⚠️ 不要手動加 Content-Type
        },
        body: fd,
      }
    );

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.detail || "匯入失敗");
    }

    // ✅ 對齊後端回傳結構
    toast(
      `匯入完成：新增 ${data.imported} 筆、更新 ${data.updated} 筆、跳過 ${data.skipped} 筆`
    );

    await loadFixtureList();
 // 🔁 重新載入治具列表

  } catch (err) {
    console.error(err);
    toast(err.message || "匯入治具失敗", "error");
  }
}

window.fxImportFixtures = fxImportFixtures;

function fxImportFixturesXlsx(file) {
  if (!file) return;
  fxImportFixtures(file);
}

window.fxImportFixturesXlsx = fxImportFixturesXlsx;

/* ============================================================
 * Status mapping（前端 → 後端 enum）
 * ============================================================ */
function mapStatusToBackend(status) {
  const map = {
    normal: "normal",
    repair: "repair",
    scrap: "scrap",
    inactive: "inactive",
  };

  return map[status] || "normal";
}
