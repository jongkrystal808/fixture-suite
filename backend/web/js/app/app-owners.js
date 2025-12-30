/**
 * 負責人管理 UI 控制 (v3.1 - FIXED)
 * app-owners.js
 *
 * ✔ 完全對齊 owners 資料表
 * ✔ primary_owner / secondary_owner
 * ✔ customer_id（含跨客戶）
 * ✔ 停用 instead of delete
 */

/* ============================================================
 * 🔐 Admin Only Guard（入口級）
 * ============================================================ */
function ensureAdmin() {
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return false;
  }
  return true;
}

/* ============================================================
 * 分頁狀態
 * ============================================================ */
let ownerPage = 1;
let ownerPageSize = 20;

/* ============================================================
 * Admin Sidebar Entry
 * ============================================================ */
function loadAdminOwners() {
  if (!ensureAdmin()) return;
  ownerPage = 1;
  loadOwners();
}
window.loadAdminOwners = loadAdminOwners;

/* ============================================================
 * 初始化
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  if (!ensureAdmin()) return;
  if (!document.getElementById("ownerTable")) return;
  loadOwners();
});

/* ============================================================
 * 載入負責人列表
 * ============================================================ */
async function loadOwners() {
  const search = document.getElementById("ownerSearch")?.value.trim() || "";
  const active = document.getElementById("ownerFilterActive")?.value || "";

  const params = {
    page: ownerPage,
    pageSize: ownerPageSize
  };

  if (search) params.search = search;
  if (active !== "") params.is_active = active;

  try {
    const result = await apiListOwners(params);
    renderOwnerTable(result.owners);
    renderOwnerPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入負責人失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */
function renderOwnerTable(list) {
  const table = document.getElementById("ownerTable");
  if (!table) return;

  table.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-gray-400 py-6">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(o => {
    const customerLabel = o.customer_id
      ? o.customer_name || o.customer_id
      : "共用";

    table.insertAdjacentHTML("beforeend", `
      <tr>
        <td class="text-center">${o.id}</td>
        <td>${o.primary_owner}</td>
        <td>${o.secondary_owner || ""}</td>
        <td>${customerLabel}</td>
        <td>${o.email || ""}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-outline"
                  onclick="openOwnerEdit(${o.id})">編輯</button>
          <button class="btn btn-xs btn-warning"
                  onclick="disableOwner(${o.id})">停用</button>
        </td>
      </tr>
    `);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */
function renderOwnerPagination(total) {
  const box = document.getElementById("ownerPagination");
  if (!box) return;

  box.innerHTML = "";

  const totalPages = Math.ceil(total / ownerPageSize);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === ownerPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => {
      ownerPage = i;
      loadOwners();
    };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 新增負責人
 * ============================================================ */
function openOwnerAdd() {
  if (!ensureAdmin()) return;

  document.getElementById("ownerForm").reset();
  document.getElementById("ownerFormMode").value = "add";
  document.getElementById("o_id").value = ""; // hidden
  document.getElementById("ownerModalTitle").innerText = "新增負責人";
  openOwnerModal();
}

async function submitOwnerForm() {
  if (!ensureAdmin()) return;

  const mode = document.getElementById("ownerFormMode").value;

  const id = document.getElementById("o_id").value || null;
  const primary_owner = document.getElementById("o_primary").value.trim();
  const secondary_owner = document.getElementById("o_secondary").value.trim();
  const email = document.getElementById("o_email").value.trim();
  const note = document.getElementById("o_note").value || null;
  const isShared = document.getElementById("o_shared")?.checked || false;

  if (!primary_owner) {
    toast("主負責人不可為空", "error");
    return;
  }

  const payload = {
    customer_id: isShared ? null : getCurrentCustomerId(),
    primary_owner,
    secondary_owner: secondary_owner || null,
    email: email || null,
    note,
    is_active: true
  };

  try {
    if (mode === "add") {
      await apiJson("/owners", payload, "POST");
      toast("新增成功");
    } else {
      await apiJson(`/owners/${id}`, payload, "PUT");
      toast("更新成功");
    }

    closeOwnerModal();
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "儲存失敗", "error");
  }
}

/* ============================================================
 * 編輯負責人
 * ============================================================ */
async function openOwnerEdit(id) {
  if (!ensureAdmin()) return;

  try {
    const data = await api(`/owners/${id}`);

    document.getElementById("ownerFormMode").value = "edit";
    document.getElementById("ownerModalTitle").innerText = "編輯負責人";

    document.getElementById("o_id").value = data.id;
    document.getElementById("o_primary").value = data.primary_owner;
    document.getElementById("o_secondary").value = data.secondary_owner || "";
    document.getElementById("o_email").value = data.email || "";
    document.getElementById("o_note").value = data.note || "";

    const sharedCheckbox = document.getElementById("o_shared");
    if (sharedCheckbox) {
      sharedCheckbox.checked = data.customer_id === null;
    }

    openOwnerModal();
  } catch (err) {
    console.error(err);
    toast("載入負責人失敗", "error");
  }
}

/* ============================================================
 * 停用負責人（取代 delete）
 * ============================================================ */
async function disableOwner(id) {
  if (!ensureAdmin()) return;
  if (!confirm("確定要停用此負責人？")) return;

  try {
    await apiJson(`/owners/${id}`, { is_active: false }, "PUT");
    toast("已停用");
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(
      err?.data?.detail || "此負責人已有治具關聯，無法停用",
      "error"
    );
  }
}
