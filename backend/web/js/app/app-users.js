/**
 * 使用者管理前端控制 (v3.0)
 * app-users.js
 *
 * ✔ 搜尋 / 篩選 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 重設密碼
 * ✔ 與 api-users.js 完全對應
 */

/* ============================================================
 * 狀態
 * ============================================================ */

let userPage = 1;
let userPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔐 僅 admin 可使用
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("Not admin — skip user module init");
    return;
  }

  // 🔥 若本頁根本沒有 userTable，停止執行
  if (!document.getElementById("userTable")) {
    console.warn("User table not found — skip user module init");
    return;
  }

  loadUsers();
});

/* ============================================================
 * 載入使用者列表
 * ============================================================ */

async function loadUsers() {
  const search = document.getElementById("userSearch")?.value.trim() || "";
  const role = document.getElementById("userFilterRole")?.value || "";
  const active = document.getElementById("userFilterActive")?.value || "";

  const params = {
    page: userPage,
    pageSize: userPageSize
  };

  if (search) params.search = search;
  if (role) params.role = role;
  if (active !== "") params.is_active = active;

  try {
    const result = await apiListUsers(params);
    renderUserTable(result.users);
    renderUserPagination(result.total);
  } catch (err) {
    console.error(err);
    toast("載入使用者失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderUserTable(rows) {
  const tbody = document.getElementById("userTable");
  if (!tbody) return;   // 安全防呆

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-gray-400">
          查無資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(u => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="py-2 px-2">${u.username}</td>
      <td class="py-2 px-2">${u.full_name || ""}</td>
      <td class="py-2 px-2">${u.email || ""}</td>
      <td class="py-2 px-2">${u.role}</td>
      <td class="py-2 px-2">
        ${u.is_active ? "<span class='text-green-600'>啟用</span>" : "<span class='text-red-600'>停用</span>"}
      </td>
      <td class="py-2 px-2">${u.customer_id}</td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline" onclick="openUserEdit('${u.id}')">編輯</button>
        <button class="btn btn-xs btn-ghost text-blue-600" onclick="openResetPassword('${u.id}')">重設密碼</button>
        <button class="btn btn-xs btn-error" onclick="deleteUser('${u.id}')">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderUserPagination(total) {
  const totalPages = Math.ceil(total / userPageSize);
  const box = document.getElementById("userPagination");

  box.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === userPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeUserPage(i);
    box.appendChild(btn);
  }
}

function changeUserPage(p) {
  userPage = p;
  loadUsers();
}

/* ============================================================
 * 新增使用者
 * ============================================================ */

function openUserAdd() {
  document.getElementById("userForm").reset();
  document.getElementById("userFormMode").value = "add";
  document.getElementById("userModalTitle").innerText = "新增使用者";
  userModal.showModal();
}

async function submitUserForm() {
  const mode = document.getElementById("userFormMode").value;

  const payload = {
    username: document.getElementById("u_username").value.trim(),
    full_name: document.getElementById("u_full_name").value.trim(),
    email: document.getElementById("u_email").value.trim(),
    role: document.getElementById("u_role").value,
    is_active: document.getElementById("u_active").checked,
    password: document.getElementById("u_password").value.trim()
  };

  try {
    if (mode === "add") {
      if (!payload.password) return toast("新增使用者需要密碼", "error");
      await apiCreateUser(payload);
      toast("新增使用者成功");
    } else {
      const userId = document.getElementById("userFormId").value;
      delete payload.password;
      await apiUpdateUser(userId, payload);
      toast("更新成功");
    }

    userModal.close();
    loadUsers();
  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯使用者
 * ============================================================ */

async function openUserEdit(id) {
  const data = await apiGetUser(id);

  document.getElementById("userFormMode").value = "edit";
  document.getElementById("userFormId").value = id;

  document.getElementById("u_username").value = data.username;
  document.getElementById("u_full_name").value = data.full_name || "";
  document.getElementById("u_email").value = data.email || "";
  document.getElementById("u_role").value = data.role;
  document.getElementById("u_active").checked = data.is_active;

  // 編輯模式不顯示密碼欄
  document.getElementById("passwordWrapper").classList.add("hidden");

  document.getElementById("userModalTitle").innerText = "編輯使用者";
  userModal.showModal();
}

/* ============================================================
 * 刪除使用者
 * ============================================================ */

async function deleteUser(id) {
  if (!confirm("確定要刪除該使用者？")) return;

  try {
    await apiDeleteUser(id);
    toast("刪除成功");
    loadUsers();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 重設密碼
 * ============================================================ */

let currentResetUserId = null;

function openResetPassword(id) {
  currentResetUserId = id;
  document.getElementById("resetPasswordForm").reset();
  resetPasswordModal.showModal();
}

async function submitResetPassword() {
  const newPassword = document.getElementById("reset_password").value.trim();

  if (!newPassword) return toast("請輸入新密碼");

  try {
    await apiResetPassword(currentResetUserId, newPassword);
    toast("密碼已重設");
    resetPasswordModal.close();
  } catch (err) {
    console.error(err);
    toast("重設失敗", "error");
  }
}
