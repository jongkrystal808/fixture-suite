/**
 * 負責人管理 UI 控制 (v4.2 - user assignment aligned)
 *
 * - Owner = user assignment
 * - No email / no customer_name
 * - customer from header context (X-Customer-Id)
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
 * 取得目前 customer context（來自 header select）
 * ============================================================ */
function getCurrentCustomerId() {
  const sel = document.getElementById("currentCustomerSelect");
  return sel?.value || "";
}

/* ============================================================
 * Admin Sidebar Entry
 * ============================================================ */
function loadAdminOwners() {
  if (!ensureAdmin()) return;

  // 只要切到 Owner 頁，就嘗試同步一次 customer 顯示 + 刷新列表
  // 真正的「第一次初始化」仍由 onCustomerReady 保障
  refreshOwnerCustomerContext();

  ownerPage = 1;
  loadOwners();
}
window.loadAdminOwners = loadAdminOwners;

/* ============================================================
 * 初始化（等 customer ready）
 * ============================================================ */
onCustomerReady(() => {
  if (!ensureAdmin()) return;

  // 沒有 owner table 就不初始化（避免切到其他頁也跑）
  if (!document.getElementById("ownerTable")) return;

  // 1) 顯示目前 customer
  refreshOwnerCustomerContext();

  // 2) 預先載入 users option（避免第一次打開 modal 是空的）
  loadOwnerUserOptions();

  // 3) 載入列表
  ownerPage = 1;
  loadOwners();
});

/* ============================================================
 * 載入負責人列表
 * ============================================================ */
async function loadOwners() {
  const table = document.getElementById("ownerTable");
  if (!table) return;

  const customerId = getCurrentCustomerId();
  if (!customerId) {
    // customer 未 ready 時不打 API，避免出現「要重整才正常」
    renderOwnerTable([]);
    return;
  }

  const search = document.getElementById("ownerSearch")?.value.trim() || "";
  const active = document.getElementById("ownerFilterActive")?.value ?? "";

  const params = {
    page: ownerPage,
    pageSize: ownerPageSize,
  };
  if (search) params.search = search;
  if (active !== "") params.is_active = active;

  try {
    const result = await apiListOwners(params);
    renderOwnerTable(result?.owners || []);
    renderOwnerPagination(result?.total ?? 0);
  } catch (err) {
    console.error(err);
    toast("載入負責人失敗", "error");
  }
}
window.loadOwners = loadOwners;

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
        <td colspan="4" class="text-center text-gray-400 py-6">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(o => {
    table.insertAdjacentHTML("beforeend", `
      <tr>
        <td class="text-center">${o.id}</td>
        <td>${o.primary_user_name}</td>
        <td>${o.secondary_user_name || "—"}</td>
        <td class="text-right space-x-2">
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
  const totalPages = Math.ceil((total || 0) / ownerPageSize);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === ownerPage ? "btn-primary" : "btn-outline"}`;
    btn.textContent = i;
    btn.onclick = () => {
      ownerPage = i;
      loadOwners();
    };
    box.appendChild(btn);
  }
}

/* ============================================================
 * 共同：填入 select option（新增 / 編輯共用）
 * ============================================================ */
function fillUserSelectOptions(primarySel, secondarySel, users) {
  if (primarySel) primarySel.innerHTML = `<option value="">請選擇使用者</option>`;
  if (secondarySel) secondarySel.innerHTML = `<option value="">（無）</option>`;

  (users || []).forEach(u => {
    const label = u.full_name ? `${u.full_name} (${u.username})` : u.username;

    if (primarySel) primarySel.appendChild(new Option(label, String(u.id)));
    if (secondarySel) secondarySel.appendChild(new Option(label, String(u.id)));
  });
}

/* ============================================================
 * 載入使用者清單（一次填入：新增 + 編輯）
 * ============================================================ */
async function loadOwnerUserOptions() {
  try {
    const users = await apiListUsersSimple();

    // 新增用
    const addPrimary = document.getElementById("addOwnerPrimary");
    const addSecondary = document.getElementById("addOwnerSecondary");

    // 編輯用
    const editPrimary = document.getElementById("editOwnerPrimary");
    const editSecondary = document.getElementById("editOwnerSecondary");

    // 若頁面尚未 render 出 select，就跳過，不報錯
    if (!addPrimary && !addSecondary && !editPrimary && !editSecondary) return;

    fillUserSelectOptions(addPrimary, addSecondary, users);
    fillUserSelectOptions(editPrimary, editSecondary, users);
  } catch (err) {
    console.error(err);
    toast("載入使用者清單失敗", "error");
  }
}
window.loadOwnerUserOptions = loadOwnerUserOptions;

/* ============================================================
 * 編輯負責人時：載入 + 預選
 * ============================================================ */
async function loadEditOwnerUserOptions(primaryUserId, secondaryUserId) {
  // 先確保 option 已存在（同時會填 edit 的兩個 select）
  await loadOwnerUserOptions();

  const primarySel = document.getElementById("editOwnerPrimary");
  const secondarySel = document.getElementById("editOwnerSecondary");

  // 解除所有 selected（避免 placeholder 卡住）
  if (primarySel) Array.from(primarySel.options).forEach(opt => (opt.selected = false));
  if (secondarySel) Array.from(secondarySel.options).forEach(opt => (opt.selected = false));

  if (primarySel && primaryUserId) {
    primarySel.value = String(primaryUserId);
    primarySel.dispatchEvent(new Event("change"));
  }

  if (secondarySel) {
    secondarySel.value = secondaryUserId ? String(secondaryUserId) : "";
    secondarySel.dispatchEvent(new Event("change"));
  }
}

/* ============================================================
 * Inline 新增
 * ============================================================ */
async function submitInlineOwner() {
  if (!ensureAdmin()) return;

  const customerId = getCurrentCustomerId();
  if (!customerId) return toast("尚未選擇客戶", "error");

  const primarySel = document.getElementById("addOwnerPrimary");
  const secondarySel = document.getElementById("addOwnerSecondary");
  const noteEl = document.getElementById("addOwnerNote");

  const primaryId = Number(primarySel?.value);
  const secondaryId = secondarySel?.value ? Number(secondarySel.value) : null;
  const note = noteEl?.value.trim() || null;

  if (!primaryId) return toast("請選擇主負責人", "error");
  if (secondaryId && secondaryId === primaryId) {
    return toast("主 / 副負責人不可相同", "error");
  }

  try {
    await apiCreateOwner({
      primary_user_id: primaryId,
      secondary_user_id: secondaryId,
      note,
    });

    toast("新增成功");
    clearInlineOwnerForm();
    ownerPage = 1;
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "新增失敗", "error");
  }
}
window.submitInlineOwner = submitInlineOwner;

function clearInlineOwnerForm() {
  ["addOwnerPrimary", "addOwnerSecondary", "addOwnerNote"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

/* ============================================================
 * 編輯
 * ============================================================ */
async function openOwnerEdit(id) {
  if (!ensureAdmin()) return;

  try {
    // 顯示目前 customer（僅顯示，不參與 submit）
    const customerId = getCurrentCustomerId();
    const customerDisplay = document.getElementById("editOwnerCustomerDisplay");
    if (customerDisplay) customerDisplay.value = customerId || "";

    const data = await apiGetOwner(id);

    document.getElementById("editOwnerId").value = data.id;
    document.getElementById("editOwnerNote").value = data.note || "";

    await loadEditOwnerUserOptions(
      data.primary_user_id,
      data.secondary_user_id
    );

    const modal = document.getElementById("ownerEditModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  } catch (err) {
    console.error(err);
    toast("載入負責人資料失敗", "error");
  }
}
window.openOwnerEdit = openOwnerEdit;

function closeOwnerEdit() {
  const modal = document.getElementById("ownerEditModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
window.closeOwnerEdit = closeOwnerEdit;

async function submitOwnerEdit() {
  if (!ensureAdmin()) return;

  const customerId = getCurrentCustomerId();
  if (!customerId) return toast("尚未選擇客戶", "error");

  const id = document.getElementById("editOwnerId").value;
  const primary = Number(document.getElementById("editOwnerPrimary").value);
  const secondaryRaw = document.getElementById("editOwnerSecondary").value;
  const secondary = secondaryRaw ? Number(secondaryRaw) : null;
  const note = document.getElementById("editOwnerNote").value.trim() || null;

  if (!id || !primary) return toast("資料不完整", "error");
  if (secondary && secondary === primary) return toast("主 / 副負責人不可相同", "error");

  try {
    await apiUpdateOwner(id, {
      primary_user_id: primary,
      secondary_user_id: secondary,
      note,
    });

    toast("更新成功");
    closeOwnerEdit();
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "更新失敗", "error");
  }
}
window.submitOwnerEdit = submitOwnerEdit;

/* ============================================================
 * 停用
 * ============================================================ */
async function disableOwner(id) {
  if (!ensureAdmin()) return;
  if (!confirm("確定要停用？")) return;

  try {
    await apiUpdateOwner(id, { is_active: 0 });
    toast("已停用");
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "停用失敗", "error");
  }
}
window.disableOwner = disableOwner;

/* ============================================================
 * UI 綁定
 * ============================================================ */
(function bindOwnerUI() {
  document.getElementById("ownerSearch")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      ownerPage = 1;
      loadOwners();
    }
  });

  document.getElementById("ownerFilterActive")?.addEventListener("change", () => {
    ownerPage = 1;
    loadOwners();
  });

  document.getElementById("ownerPageSize")?.addEventListener("change", e => {
    ownerPageSize = Number(e.target.value) || 20;
    ownerPage = 1;
    loadOwners();
  });
})();

/* ============================================================
 * customer 狀態刷新（顯示用 + 順便更新 users option）
 * ============================================================ */
function refreshOwnerCustomerContext() {
  const customerId = getCurrentCustomerId();

  // 新增區顯示
  const displayEl = document.getElementById("ownerCustomerDisplay");
  if (displayEl) {
    if (!customerId) {
      displayEl.value = "";
      displayEl.placeholder = "尚未選擇客戶";
    } else {
      displayEl.value = customerId;
    }
  }

  // 編輯 modal 顯示（若存在）
  const editDisplay = document.getElementById("editOwnerCustomerDisplay");
  if (editDisplay) {
    editDisplay.value = customerId || "";
  }

  // 只要 customer ready，就順便更新使用者選項（避免切客戶後下拉還是舊的）
  if (customerId) {
    loadOwnerUserOptions?.();
  }
}
window.refreshOwnerCustomerContext = refreshOwnerCustomerContext;
