/**
 * 後台管理功能
 * admin.js
 */

// ============================================
// 使用者管理
// ============================================

/**
 * 載入使用者清單
 */
async function adminLoadUsers() {
  const host = document.getElementById('subtab-acct');
  if (!host) return;
  
  // 檢查權限
  if (!requireAdmin('需要管理員權限才能查看使用者清單')) {
    return;
  }
  
  // 拉取使用者清單
  let users = [];
  try {
    users = await apiListUsers();
  } catch (e) {
    console.warn('users list failed', e);
    toast('載入使用者清單失敗', 'error');
    return;
  }
  
  // 建立 UI 容器
  let box = document.getElementById('userListBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'userListBox';
    box.className = 'border-t pt-4';
    host.appendChild(box);
  }
  
  // 渲染表格
  box.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-semibold">帳號清單</h4>
      <small class="text-gray-500">共 ${users.length} 筆</small>
    </div>
    <div class="overflow-auto">
      <table class="min-w-full text-sm">
        <thead class="text-left text-gray-500">
          <tr>
            <th class="py-2 pr-4">帳號</th>
            <th class="py-2 pr-4">Email</th>
            <th class="py-2 pr-4">角色</th>
            <th class="py-2 pr-4">操作</th>
          </tr>
        </thead>
        <tbody id="userTableBody"></tbody>
      </table>
    </div>
  `;
  
  const tbody = box.querySelector('#userTableBody');
  tbody.innerHTML = users.map(u => `
    <tr class="border-t">
      <td class="py-2 pr-4 font-mono">${u.id || u.username}</td>
      <td class="py-2 pr-4">${u.email || ''}</td>
      <td class="py-2 pr-4">
        <span class="pill">${u.role || 'user'}</span>
      </td>
      <td class="py-2 pr-4 space-x-1">
        <button class="btn btn-ghost text-xs" onclick="uiOpenRole('${u.id || u.username}','${u.role || 'user'}')">
          變更角色/信箱
        </button>
        <button class="btn btn-ghost text-xs" onclick="uiOpenReset('${u.id || u.username}')">
          重設密碼
        </button>
        <button class="btn btn-ghost text-xs" onclick="uiDelUser('${u.id || u.username}')">
          刪除
        </button>
      </td>
    </tr>
  `).join('');
}

/**
 * 建立使用者
 */
async function uiCreateUser() {
  const id = document.getElementById('accAddId')?.value.trim();
  const pwd = document.getElementById('accAddPwd')?.value;
  const email = document.getElementById('accAddMail')?.value.trim();
  const role = document.getElementById('accAddRole')?.value || 'user';
  
  if (!id || !pwd) {
    toast('請輸入帳號與密碼', 'warning');
    return;
  }
  
  try {
    await apiCreateUser({
      id: id,
      username: id,
      password: pwd,
      email: email,
      role: role
    });
    
    toast('帳戶新增成功', 'success');
    
    // 清空表單
    if (document.getElementById('accAddId')) document.getElementById('accAddId').value = '';
    if (document.getElementById('accAddPwd')) document.getElementById('accAddPwd').value = '';
    if (document.getElementById('accAddMail')) document.getElementById('accAddMail').value = '';
    if (document.getElementById('accAddRole')) document.getElementById('accAddRole').value = 'user';
    
    // 重新載入清單
    await adminLoadUsers();
  } catch (e) {
    toast('新增失敗：' + e.message, 'error');
  }
}

/**
 * 刪除使用者
 * @param {string} id - 使用者 ID
 */
async function uiDelUser(id) {
  if (!confirm(`確定刪除帳號 ${id}？`)) return;
  
  const pwd = prompt('請輸入該帳號的密碼以刪除：') || '';
  if (!pwd) return;
  
  try {
    await apiDeleteUser(id, pwd);
    toast('已刪除', 'success');
    await adminLoadUsers();
  } catch (e) {
    toast('刪除失敗：' + e.message, 'error');
  }
}

/**
 * 重設密碼
 * @param {string} id - 使用者 ID
 */
function uiOpenReset(id) {
  const pwd = prompt(`輸入「${id}」的新密碼：`) || '';
  if (!pwd) return;
  
  apiUpdateUser(id, {
    old_password: pwd,
    new_password: pwd,
    email: ''
  })
  .then(() => {
    toast('密碼已重設', 'success');
  })
  .catch(e => {
    toast('重設失敗：' + e.message, 'error');
  });
}

/**
 * 變更角色/信箱
 * @param {string} id - 使用者 ID
 * @param {string} currentRole - 當前角色
 */
function uiOpenRole(id, currentRole) {
  const role = prompt(`輸入角色（user/admin）目前：${currentRole}`, currentRole || 'user') || currentRole;
  const email = prompt('更新 Email（留空不變）：', '') || '';
  
  apiUpdateUser(id, {
    old_password: '(nochange)',
    new_password: '(nochange)',
    email: email,
    role: role
  })
  .then(() => {
    toast('角色/Email 已更新', 'success');
    adminLoadUsers();
  })
  .catch(e => {
    toast('更新失敗：' + e.message, 'error');
  });
}

// ============================================
// 初始化
// ============================================

/**
 * 初始化後台管理
 */
function initAdmin() {
  // 綁定新增按鈕
  const addBtn = document.querySelector('#subtab-acct button.btn.btn-primary');
  if (addBtn) addBtn.onclick = uiCreateUser;
  
  // 監聽分頁切換
  const tabs = document.querySelectorAll('button[data-tab]');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'admin') {
        adminLoadUsers();
      }
    });
  });
  
  // 如果預設就在 Admin 分頁，載入一次
  const adminTab = document.getElementById('tab-admin');
  if (adminTab && !adminTab.classList.contains('hidden')) {
    adminLoadUsers();
  }
}

// 匯出函數
window.adminLoadUsers = adminLoadUsers;
window.uiCreateUser = uiCreateUser;
window.uiDelUser = uiDelUser;
window.uiOpenReset = uiOpenReset;
window.uiOpenRole = uiOpenRole;
window.initAdmin = initAdmin;
