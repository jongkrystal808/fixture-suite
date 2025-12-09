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
 * 取得 customer_id
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 分頁狀態 + DOM
 * ============================================================ */

let fxPage = 1;

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
    const fxOwnerSelect = document.getElementById("fxOwnerSelect");
    if (!fxOwnerSelect) {
        console.warn("fxOwnerSelect element not found in DOM");
        return;
    }

    let owners = [];
    try {
        owners = await apiGetOwnersSimple();
    } catch (err) {
        console.error("載入 owner 失敗", err);
        return;
    }

    fxOwnerSelect.innerHTML = `<option value="">全部</option>`;

    owners.forEach(o => {
        fxOwnerSelect.innerHTML += `<option value="${o.id}">${o.primary_owner}</option>`;
    });
}



/* ============================================================
 * 載入列表
 * ============================================================ */
async function loadFixtureList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  const search = fxSearchInput.value.trim();
  const owner = fxOwnerSelect.value;
  const status = fxStatusSelect.value;

  const params = {
    customer_id,
    skip: (fxPage - 1) * fxPageSize,
    limit: fxPageSize
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
      <tr><td colspan="10" class="text-center py-3 text-gray-400">沒有資料</td></tr>
    `;
    return;
  }

  rows.forEach(f => {

    // ✔ 正確欄位
    const id = f.fixture_id || "-";
    const name = f.fixture_name || "-";
    const type = f.fixture_type || "-";

    // 🔥 修正庫存顯示邏輯 — 正確三段式（自購 / 客供 / 總）
    const qtyPurchased = f.self_purchased_qty ?? 0;
    const qtySupplied  = f.customer_supplied_qty ?? 0;
    const qtyTotal     = qtyPurchased + qtySupplied;   // ← ★ 正確總數量

    const storage = f.storage_location || "-";
    const status  = f.status || "-";
    const replace = f.replacement_cycle || "-";
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

      <!-- 🔥 修正庫存三段式 -->
      <td class="py-2 pr-4">${qtyPurchased} / ${qtySupplied} / ${qtyTotal}</td>

      <td class="py-2 pr-4">${status}</td>
      <td class="py-2 pr-4">${storage}</td>
      <td class="py-2 pr-4">${owner}</td>
      <td class="py-2 pr-4">${note}</td>

      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-outline" onclick="openFixtureModal('edit','${id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteFixture('${id}')">刪除</button>
      </td>
    `;

    fxTable.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderFixturePagination(total) {
  const pageSize = Number(fxPageSizeSelect.value);
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

  if (mode === "create") {
    title.textContent = "新增治具";
    fixtureModal.classList.remove("hidden");
  } else {
    title.textContent = "編輯治具";
    loadFixtureDetailToForm(id);
  }

  fixtureModal.style.display = "flex";
}

async function loadFixtureDetailToForm(id) {
  try {
    const data = await apiGetFixture(id);

    document.getElementById("fmFixtureId").value = data.id;
    document.getElementById("fmFixtureName").value = data.fixture_name;
    document.getElementById("fmFixtureType").value = data.fixture_type;
    document.getElementById("fmSerialNumber").value = data.serial_number || "";
    document.getElementById("fmSelfQty").value = data.self_purchased_qty;
    document.getElementById("fmCustomerQty").value = data.customer_supplied_qty;
    document.getElementById("fmStorage").value = data.storage_location || "";
    document.getElementById("fmCycle").value = data.replacement_cycle || 0;
    document.getElementById("fmCycleUnit").value = data.cycle_unit || "none";
    document.getElementById("fmStatus").value = data.status || "正常";
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
  e.preventDefault();

  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const mode = fmForm.dataset.mode;
  const id = fmForm.dataset.id;

  const payload = {
    customer_id,
    id: document.getElementById("fmFixtureId").value.trim(),
    fixture_name: document.getElementById("fmFixtureName").value.trim(),
    fixture_type: document.getElementById("fmFixtureType").value.trim(),
    serial_number: document.getElementById("fmSerialNumber").value.trim(),
    self_purchased_qty: Number(document.getElementById("fmSelfQty").value),
    customer_supplied_qty: Number(document.getElementById("fmCustomerQty").value),
    storage_location: document.getElementById("fmStorage").value.trim(),
    replacement_cycle: Number(document.getElementById("fmCycle").value),
    cycle_unit: document.getElementById("fmCycleUnit").value,
    status: document.getElementById("fmStatus").value,
    owner_id: Number(document.getElementById("fmOwnerId").value) || null,
    note: document.getElementById("fmNote").value.trim()
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
 * 刪除治具
 * ============================================================ */

async function deleteFixture(id) {
  if (!confirm(`確定要刪除治具 ${id}？`)) return;

  const customer_id = getCurrentCustomerId();

  try {
    await apiDeleteFixture({ customer_id, fixture_id: id });
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

fxSearchInput?.addEventListener("keydown", e => {
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

function renderPagination(targetId, total, page, pageSize, onClick) {
  const el = document.getElementById(targetId);
  if (!el) return;

  el.innerHTML = "";
  if (total <= pageSize) return;

  const totalPages = Math.ceil(total / pageSize);
  const maxButtons = 11;  // 顯示最多 11 個按鈕（含 ...）

  function addBtn(label, p, active = false, disabled = false) {
    const btn = document.createElement("button");
    btn.innerText = label;

    btn.className =
      "btn btn-xs mx-1 " +
      (active ? "btn-primary" : "btn-ghost");

    if (disabled) btn.disabled = true;

    btn.onclick = () => !disabled && onClick(p);
    el.appendChild(btn);
  }

  // 上一頁
  addBtn("‹", page - 1, false, page === 1);

  // 顯示範圍
  let start = Math.max(1, page - 4);
  let end = Math.min(totalPages, page + 4);

  if (page <= 5) {
    end = Math.min(10, totalPages);
  }

  if (page >= totalPages - 4) {
    start = Math.max(1, totalPages - 9);
  }

  // 第一頁
  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null, false, true);
  }

  // 中間頁
  for (let p = start; p <= end; p++) {
    addBtn(p, p, p === page);
  }

  // 最後一頁
  if (end < totalPages) {
    if (end < totalPages - 1) addBtn("...", null, false, true);
    addBtn(totalPages, totalPages);
  }

  // 下一頁
  addBtn("›", page + 1, false, page === totalPages);
}
