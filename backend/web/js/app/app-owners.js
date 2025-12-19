/**
 * 負責人管理 UI 控制 (v3.0)
 * app-owners.js
 *
 * ✔ 搜尋 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 與 api-owners.js 完全整合
 */

/* ============================================================
 * 🔐 Admin Only Guard（後台模組語意宣告）
 * ============================================================ */
(function () {
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("[app-owners] not admin, module disabled");
    return;
  }
})();


/* ============================================================
 * 分頁狀態
 * ============================================================ */

let ownerPage = 1;
let ownerPageSize = 20;

/* ============================================================
 * 🧭 Admin Sidebar Entry
 * 後台管理 → 負責人管理
 * ============================================================ */
function loadAdminOwners() {
  // admin 檢查（保險，不重複執行 init）
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return;
  }

  ownerPage = 1;
  loadOwners();
}

window.loadAdminOwners = loadAdminOwners;


/* ============================================================
 * 初始化
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {

  // 🔐 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("Not admin — skip owners module init");
    return;
  }

  // 🔥 若頁面中沒有 ownerTable，直接跳過 owners 模組
  if (!document.getElementById("ownerTable")) {
    console.warn("Owner table not found — skip owners module init");
    return;
  }

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
      <tr><td colspan="5" class="text-center text-gray-400 py-6">查無資料</td></tr>
    `;
    return;
  }

  list.forEach(o => {
    table.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${o.id}</td>
        <td>${o.owner_name}</td>
        <td>${o.email || ""}</td>
        <td>${o.note || ""}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-outline"
                  onclick="openOwnerEdit('${o.id}')">編輯</button>
          <button class="btn btn-xs btn-error"
                  onclick="deleteOwner('${o.id}')">刪除</button>
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
  if (!box) return;  // 防呆

  box.innerHTML = "";

  const totalPages = Math.ceil(total / ownerPageSize);
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === ownerPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeOwnerPage(i);
    box.appendChild(btn);
  }
}


/* ============================================================
 * 新增負責人
 * ============================================================ */

function openOwnerAdd() {
  document.getElementById("ownerForm").reset();
  document.getElementById("ownerFormMode").value = "add";
  document.getElementById("ownerModalTitle").innerText = "新增負責人";
  openOwnerModal();
}


async function submitOwnerForm() {
  const mode = document.getElementById("ownerFormMode").value;

  const id = document.getElementById("o_id").value.trim();
  const name = document.getElementById("o_name").value.trim();
  const email = document.getElementById("o_email").value.trim();
  const note = document.getElementById("o_note").value || null;

  if (!id || !name) {
    alert("代碼與姓名不可為空");
    return;
  }

  const payload = {
    id,
    owner_name: name,
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
  const data = await api(`/owners/${id}`);

  document.getElementById("ownerFormMode").value = "edit";
  document.getElementById("ownerModalTitle").innerText = "編輯負責人";

  document.getElementById("o_id").value = data.id;
  document.getElementById("o_name").value = data.owner_name;
  document.getElementById("o_email").value = data.email || "";
  document.getElementById("o_note").value = data.note || "";

  openOwnerModal();
}


/* ============================================================
 * 刪除負責人
 * ============================================================ */
async function deleteOwner(id) {
  if (!confirm(`確定刪除負責人 ${id}？`)) return;

  try {
    await api(`/owners/${id}`, { method: "DELETE" });
    toast("已刪除");
    loadOwners();
  } catch (err) {
    console.error(err);
    toast(
      err?.data?.detail || "此負責人已有治具或站點關聯，無法刪除",
      "error"
    );
  }
}

