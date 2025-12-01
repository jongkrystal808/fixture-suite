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
  try {
    const owners = await apiGetOwnersSimple();
    fxOwnerFilter.innerHTML = "";
    owners.forEach(o => {
      fxOwnerFilter.innerHTML += `
        <option value="${o.id}">${o.primary_owner}</option>
      `;
    });
  } catch (err) {
    console.error("載入 owner 失敗", err);
  }
}

/* ============================================================
 * 載入列表
 * ============================================================ */

async function loadFixtureList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  const search = fxSearchInput.value.trim();
  const status = fxStatusFilter.value;
  const owner_id = fxOwnerFilter.value;
  const pageSize = Number(fxPageSizeSelect.value);

  const params = {
    customer_id,
    skip: (fxPage - 1) * pageSize,
    limit: pageSize
  };

  if (search) params.search = search;
  if (status) params.status = status;
  if (owner_id) params.owner_id = owner_id;

  try {
    const result = await apiListFixtures(params);  // {fixtures, total}
    renderFixtureTable(result.fixtures || []);
    renderFixturePagination(result.total || 0);
  } catch (err) {
    console.error("loadFixtureList error", err);
    toast("讀取治具失敗", "error");
  }
}

/* ============================================================
 * 渲染表格
 * ============================================================ */

function renderFixtureTable(rows) {
  fxTable.innerHTML = "";

  if (!rows.length) {
    fxTable.innerHTML = `
      <tr><td colspan="10" class="text-center py-3 text-gray-400">沒有資料</td></tr>`;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">
        <span class="text-indigo-600 underline cursor-pointer"
              onclick="openFixtureDetail('${f.id}')">
          ${f.id}
        </span>
      </td>
      <td class="py-2 pr-4">${f.fixture_name || "-"}</td>
      <td class="py-2 pr-4">${f.fixture_type || "-"}</td>

      <td class="py-2 pr-4">
        ${(f.self_purchased_qty ?? 0)} /
        ${(f.customer_supplied_qty ?? 0)} /
        ${(f.total_qty ?? f.available_qty ?? 0)}
      </td>

      <td class="py-2 pr-4">${f.storage_location || "-"}</td>
      <td class="py-2 pr-4">${f.status || "-"}</td>
      <td class="py-2 pr-4">${f.replacement_cycle || "-"}</td>
      <td class="py-2 pr-4">${f.owner_id || "-"}</td>
      <td class="py-2 pr-4">${f.note || "-"}</td>

      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-outline" onclick="openFixtureModal('edit','${f.id}')">編輯</button>
        <button class="btn btn-xs btn-error" onclick="deleteFixture('${f.id}')">刪除</button>
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
