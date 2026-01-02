/**
 * 負責人管理 UI 控制 (v4.0 FINAL)
 * app-owners.js
 *
 * ✔ 完全正規化（只用 *_owner_id）
 * ✔ select + users/simple
 * ✔ 顯示只用 *_owner_name
 * ✔ 停用 instead of delete
 */

/* ============================================================
 * 🔐 Admin Only Guard
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
  initInlineOwnerForm();
}
window.loadAdminOwners = loadAdminOwners;

/* ============================================================
 * 初始化
 * ============================================================ */
onUserReady(() => {
  if (!ensureAdmin()) return;
  if (!document.getElementById("ownerTable")) return;

  loadOwnerUserOptions();
  loadOwners();
  initInlineOwnerForm();
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
 * 表格渲染（最終版）
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
        <td>${o.primary_owner_name || "-"}</td>
        <td>${o.secondary_owner_name || ""}</td>
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
 * 新增負責人（最終版）
 * ============================================================ */
async function submitInlineOwner() {
  if (!ensureAdmin()) return;

  const primaryId = document.getElementById("addOwnerPrimary")?.value;
  const secondaryId = document.getElementById("addOwnerSecondary")?.value;
  const email = document.getElementById("addOwnerEmail")?.value.trim();
  const note = document.getElementById("addOwnerNote")?.value.trim();

  if (!primaryId) {
    toast("請選擇主負責人", "error");
    return;
  }
  if (!email) {
    toast("Email 為必填", "error");
    return;
  }

  const payload = {
    primary_owner_id: Number(primaryId),
    secondary_owner_id: secondaryId ? Number(secondaryId) : null,
    email,
    note: note || null
  };

  try {
    await apiCreateOwner(payload);
    toast("新增成功");
    clearInlineOwnerForm();
    ownerPage = 1;
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "新增失敗", "error");
  }
}

/* ============================================================
 * 清空表單
 * ============================================================ */
function clearInlineOwnerForm() {
  ["addOwnerPrimary", "addOwnerSecondary", "addOwnerEmail", "addOwnerNote"]
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
}

/* ============================================================
 * Inline 客戶顯示
 * ============================================================ */
function initInlineOwnerForm() {
  const el = document.getElementById("addOwnerCustomer");
  if (!el) return;

  el.value =
    window.currentCustomerName ||
    window.currentCustomerId ||
    "—";
}

/* ============================================================
 * 載入使用者清單（select）
 * ============================================================ */
async function loadOwnerUserOptions() {
  try {
    const users = await api("/users/simple");

    const primarySel = document.getElementById("addOwnerPrimary");
    const secondarySel = document.getElementById("addOwnerSecondary");
    if (!primarySel || !secondarySel) return;

    primarySel.innerHTML = `<option value="">請選擇使用者</option>`;
    secondarySel.innerHTML = `<option value="">（無）</option>`;

    users.forEach(u => {
      const label = u.username;

      const opt1 = document.createElement("option");
      opt1.value = u.id;
      opt1.textContent = label;
      primarySel.appendChild(opt1);

      const opt2 = document.createElement("option");
      opt2.value = u.id;
      opt2.textContent = label;
      secondarySel.appendChild(opt2);
    });
  } catch (err) {
    console.error(err);
    toast("載入使用者清單失敗", "error");
  }
}

/* ============================================================
 * 編輯負責人（安全版）
 * ============================================================ */
async function openOwnerEdit(id) {
  if (!ensureAdmin()) return;

  const modal = document.getElementById("ownerEditModal");
  const idInput = document.getElementById("editOwnerId");
  const emailInput = document.getElementById("editOwnerEmail");
  const noteInput = document.getElementById("editOwnerNote");

  if (!modal || !idInput || !emailInput || !noteInput) {
    console.error("❌ ownerEditModal DOM not found");
    toast("編輯視窗尚未初始化", "error");
    return;
  }

  try {
    const data = await apiGetOwner(id);

    idInput.value = data.id;
    emailInput.value = data.email || "";
    noteInput.value = data.note || "";

    await loadEditOwnerUserOptions(
      data.primary_owner_id,
      data.secondary_owner_id
    );

    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } catch (err) {
    console.error(err);
    toast("載入負責人資料失敗", "error");
  }
}


function closeOwnerEdit() {
  const modal = document.getElementById("ownerEditModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}



async function loadEditOwnerUserOptions(primaryId, secondaryId) {
  const users = await api("/users/simple");

  const primarySel = document.getElementById("editOwnerPrimary");
  const secondarySel = document.getElementById("editOwnerSecondary");

  primarySel.innerHTML = "";
  secondarySel.innerHTML = "";

  users.forEach(u => {
    const opt1 = document.createElement("option");
    opt1.value = u.id;
    opt1.textContent = u.username;
    if (u.id === primaryId) opt1.selected = true;
    primarySel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = u.id;
    opt2.textContent = u.username;
    if (u.id === secondaryId) opt2.selected = true;
    secondarySel.appendChild(opt2);
  });

  // 副負責人允許空
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "（無）";
  secondarySel.insertBefore(empty, secondarySel.firstChild);
}

/* ============================================================
 * 送出編輯
 * ============================================================ */
async function submitOwnerEdit() {
  const id = document.getElementById("editOwnerId").value;
  const primary = document.getElementById("editOwnerPrimary").value;
  const secondary = document.getElementById("editOwnerSecondary").value;
  const email = document.getElementById("editOwnerEmail").value.trim();
  const note = document.getElementById("editOwnerNote").value.trim();

  if (!primary || !email) {
    toast("主負責人與 Email 為必填", "error");
    return;
  }

  try {
    await apiUpdateOwner(id, {
      primary_owner_id: primary,
      secondary_owner_id: secondary || null,
      email,
      note: note || null
    });

    toast("更新成功");
    closeOwnerEdit();
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "更新失敗", "error");
  }
}
