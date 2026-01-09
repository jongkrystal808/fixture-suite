/**
 * 負責人管理 UI 控制 (v4.x FINAL - PATCHED)
 * app-owners.js
 *
 * ✔ 完全正規化（只用 *_owner_id）
 * ✔ select + users/simple
 * ✔ 顯示只用 *_owner_name
 * ✔ 停用 instead of delete
 * ✔ v4.x：customer 由 header/context 決定（X-Customer-Id）
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
  loadOwnerUserOptions();
  loadOwners();
  initInlineOwnerForm();
}
window.loadAdminOwners = loadAdminOwners;

/* ============================================================
 * 初始化（v4.x：等 customer ready）
 * ============================================================ */
onCustomerReady(() => {
  if (!ensureAdmin()) return;
  if (!document.getElementById("ownerTable")) return;

  ownerPage = 1;
  loadOwnerUserOptions();
  loadOwners();
  initInlineOwnerForm();
});

/* ============================================================
 * 載入負責人列表（v4.x：skip/limit）
 * ============================================================ */
async function loadOwners() {
  const search = document.getElementById("ownerSearch")?.value.trim() || "";
  const active = document.getElementById("ownerFilterActive")?.value ?? "";

  const params = {
    skip: (ownerPage - 1) * ownerPageSize,
    limit: ownerPageSize,
  };
  if (search) params.search = search;

  // active: ""=全部, "1"=啟用, "0"=停用（依你 UI）
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
        <td colspan="6" class="text-center text-gray-400 py-6">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(o => {
    const customerLabel = o.customer_id
      ? (o.customer_name || o.customer_id)
      : "共用";

    table.insertAdjacentHTML("beforeend", `
      <tr>
        <td class="text-center">${o.id}</td>
        <td>${o.primary_owner_name || "-"}</td>
        <td>${o.secondary_owner_name || ""}</td>
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
  const totalPages = Math.ceil((total || 0) / ownerPageSize);
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
 * 新增負責人（Inline）
 * ============================================================ */
async function submitInlineOwner() {
  if (!ensureAdmin()) return;
  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  const primarySel = document.getElementById("addOwnerPrimary");
  const secondarySel = document.getElementById("addOwnerSecondary");
  const emailEl = document.getElementById("addOwnerEmail");
  const noteEl = document.getElementById("addOwnerNote");

  const primaryIdRaw = primarySel?.value || "";
  const secondaryIdRaw = secondarySel?.value || "";
  let email = (emailEl?.value || "").trim();
  const note = (noteEl?.value || "").trim();

  if (!primaryIdRaw) return toast("請選擇主負責人", "error");

  // ✅ 主/副不可相同
  if (secondaryIdRaw && secondaryIdRaw === primaryIdRaw) {
    return toast("主負責人與副負責人不可相同", "error");
  }

  // ✅ email 若沒填 → 自動用主負責人 option 的 data-email
  if (!email) {
    const opt = primarySel?.selectedOptions?.[0];
    const autoEmail = (opt?.dataset?.email || "").trim();
    if (autoEmail) {
      email = autoEmail;
      if (emailEl) emailEl.value = autoEmail; // 讓 UI 同步顯示
    }
  }

  // ✅ 仍然沒 email 就擋（後端也會再擋一次）
  if (!email) return toast("Email 為必填（或該使用者未設定 Email）", "error");

  const payload = {
    primary_owner_id: Number(primaryIdRaw),
    secondary_owner_id: secondaryIdRaw ? Number(secondaryIdRaw) : null,
    email,
    note: note || null,
  };

  try {
    await apiCreateOwner(payload);
    toast("新增成功");
    clearInlineOwnerForm();
    ownerPage = 1;
    loadOwners();
  } catch (err) {
    console.error(err);

    // ✅ 盡量把後端 detail 顯示出來
    const msg =
      err?.data?.detail ||
      err?.message ||
      "新增失敗";

    toast(msg, "error");
  }
}
window.submitInlineOwner = submitInlineOwner;

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
 * Inline 客戶顯示（v4.x：只有 currentCustomerId）
 * ============================================================ */
function initInlineOwnerForm() {
  const el = document.getElementById("addOwnerCustomer");
  if (!el) return;

  el.value = window.currentCustomerId || "—";
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

    (users || []).forEach(u => {
      const label =
        (u.full_name ? `${u.full_name} (${u.username})` : u.username);

      const opt1 = document.createElement("option");
      opt1.value = u.id;
      opt1.textContent = label;
      opt1.dataset.email = u.email || "";

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
window.loadOwnerUserOptions = loadOwnerUserOptions;

/* ============================================================
 * 編輯負責人
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
window.openOwnerEdit = openOwnerEdit;

function closeOwnerEdit() {
  const modal = document.getElementById("ownerEditModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}
window.closeOwnerEdit = closeOwnerEdit;

async function loadEditOwnerUserOptions(primaryId, secondaryId) {
  const users = await api("/users/simple");

  const primarySel = document.getElementById("editOwnerPrimary");
  const secondarySel = document.getElementById("editOwnerSecondary");
  if (!primarySel || !secondarySel) return;

  const pId = primaryId != null ? Number(primaryId) : null;
  const sId = secondaryId != null ? Number(secondaryId) : null;

  primarySel.innerHTML = "";
  secondarySel.innerHTML = "";

  // 主負責人：不允許空
  (users || []).forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent =
      (u.full_name ? `${u.full_name} (${u.username})` : u.username);
    if (Number(u.id) === pId) opt.selected = true;
    primarySel.appendChild(opt);
  });

  // 副負責人：允許空
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "（無）";
  secondarySel.appendChild(empty);

  (users || []).forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent =
      (u.full_name ? `${u.full_name} (${u.username})` : u.username);
    if (Number(u.id) === sId) opt.selected = true;
    secondarySel.appendChild(opt);
  });
}

/* ============================================================
 * 送出編輯
 * ============================================================ */
async function submitOwnerEdit() {
  if (!ensureAdmin()) return;

  const id = document.getElementById("editOwnerId")?.value;
  const primary = document.getElementById("editOwnerPrimary")?.value;
  const secondary = document.getElementById("editOwnerSecondary")?.value;
  const email = document.getElementById("editOwnerEmail")?.value.trim();
  const note = document.getElementById("editOwnerNote")?.value.trim();

  if (!id) return toast("資料異常：缺少 ID", "error");
  if (!primary || !email) return toast("主負責人與 Email 為必填", "error");

  try {
    await apiUpdateOwner(id, {
      primary_owner_id: Number(primary),
      secondary_owner_id: secondary ? Number(secondary) : null,
      email,
      note: note || null,
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
 * 停用負責人（instead of delete）
 * ============================================================ */
async function disableOwner(id) {
  if (!ensureAdmin()) return;
  if (!id) return;

  if (!confirm("確定要停用這位負責人？")) return;

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
 * UI 綁定（搜尋 / 篩選 / page size）
 * ============================================================ */
(function bindOwnerUI() {
  const searchEl = document.getElementById("ownerSearch");
  const activeEl = document.getElementById("ownerFilterActive");
  const sizeEl = document.getElementById("ownerPageSize");

  searchEl?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      ownerPage = 1;
      loadOwners();
    }
  });

  activeEl?.addEventListener("change", () => {
    ownerPage = 1;
    loadOwners();
  });

  sizeEl?.addEventListener("change", () => {
    const v = Number(sizeEl.value);
    ownerPageSize = Number.isFinite(v) && v > 0 ? v : 20;
    ownerPage = 1;
    loadOwners();
  });
})();
