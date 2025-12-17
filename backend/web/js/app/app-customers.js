/**
 * 客戶管理前端控制 (v3.1)
 * app-customers.js
 *
 * ✔ 搜尋 / 分頁
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 使用 div-based modal（不使用 dialog）
 * ✔ 與 api-customers.js 完整對應
 */

/* ============================================================
 * 分頁狀態
 * ============================================================ */

let customerPage = 1;
let customerPageSize = 20;

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔐 僅 admin 可使用
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("Not admin — skip customers module init");
    return;
  }

  // 🔥 若頁面中沒有 customerTable → 不啟動 customers 模組
  if (!document.getElementById("customerTable")) {
    console.warn("Customer table not found — skip customers module init");
    return;
  }

  loadCustomers();
});

/* ============================================================
 * 載入客戶列表
 * ============================================================ */
async function loadCustomers() {

  const search = document.getElementById("customerSearch")?.value.trim() || "";

  const params = {};
  if (search) params.search = search;

  try {
    const list = await apiListCustomers(params);

    // ✅ 關鍵：直接把 array 丟給 render
    renderCustomerTable(list);

    // customers API 沒有分頁，這行先不要用
    renderCustomerPagination(list.length);

  } catch (err) {
    console.error(err);
    toast("載入客戶失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */
function renderCustomerTable(list) {
  const table = document.getElementById("customerTable");
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

  list.forEach(c => {
    table.insertAdjacentHTML("beforeend", `
      <tr class="border-b">
        <td class="py-2 pr-4">${c.id}</td>
        <td class="py-2 pr-4">${c.customer_abbr ?? ""}</td>
        <td class="py-2 pr-4">${c.note ?? ""}</td>
        <td class="py-2 pr-4 text-right">
          <button class="btn btn-xs btn-outline"
                  onclick="openCustomerEdit('${c.id}')">
            編輯
          </button>
          
        <!--   <button class="btn btn-xs btn-error"
          onclick="deleteCustomer('${c.id}')">
            刪除
          </button> -->
        </td>
      </tr>
    `);
  });
}

/* ============================================================
 * 分頁
 * ============================================================ */

function renderCustomerPagination(total) {
  const totalPages = Math.ceil(total / customerPageSize);
  const box = document.getElementById("customerPagination");
  if (!box) return;

  box.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `btn btn-sm ${i === customerPage ? "btn-primary" : "btn-outline"}`;
    btn.innerText = i;
    btn.onclick = () => changeCustomerPage(i);
    box.appendChild(btn);
  }
}

function changeCustomerPage(p) {
  customerPage = p;
  loadCustomers();
}

/* ============================================================
 * Modal 開 / 關（div-based）
 * ============================================================ */

function openCustomerModal() {
  document.getElementById("customerModal")?.classList.remove("hidden");
}

function closeCustomerModal() {
  document.getElementById("customerModal")?.classList.add("hidden");
}

/* ============================================================
 * 新增客戶
 * ============================================================ */

function openCustomerAdd() {
  document.getElementById("customerForm").reset();
  document.getElementById("customerFormMode").value = "add";
  document.getElementById("customerModalTitle").innerText = "新增客戶";
  openCustomerModal();
}
async function submitCustomerForm() {
  const mode = document.getElementById("customerFormMode")?.value || "add";

  const idEl = document.getElementById("c_id");
  const nameEl = document.getElementById("c_name");
  const noteEl = document.getElementById("c_note");

  if (!idEl) {
    alert("客戶表單不存在");
    return;
  }

  const id = idEl.value.trim();
  if (!id) {
    alert("客戶代碼不可為空");
    return;
  }

  const payload = {
    id: id,
    customer_abbr: nameEl?.value || null,
    note: noteEl?.value || null,
    is_active: true
  };

  try {
    if (mode === "add") {
      // ✅ 新增
      await apiJson("/customers", payload, "POST");
      toast("新增成功");
    } else {
      // ✅ 編輯（重點）
      await apiJson(`/customers/${id}`, payload, "PUT");
      toast("更新成功");
    }

    closeCustomerModal();
    loadCustomers();

  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "儲存失敗", "error");
  }
}

/* ============================================================
 * 編輯客戶
 * ============================================================ */
async function openCustomerEdit(customerId) {

  // ✅ 1️⃣ 先取得資料
  const data = await apiGetCustomer(customerId);

  // （除錯用，可留可刪）
  console.log("edit customer data =", data);

  // ✅ 2️⃣ 再使用 data
  document.getElementById("customerFormMode").value = "edit";
  document.getElementById("customerModalTitle").innerText = "編輯客戶";

  document.getElementById("c_id").value = data.id;
  document.getElementById("c_name").value = data.customer_abbr || "";
  document.getElementById("c_note").value = data.note || "";

  openCustomerModal();
}


/* ============================================================
 * 刪除客戶
 * ============================================================ */
async function deleteCustomer(id) {
  if (!id) return;

  const ok = confirm(
    `確定要刪除客戶「${id}」？\n\n⚠ 若此客戶已有治具、站點、機種等資料，將無法刪除。`
  );
  if (!ok) return;

  try {
    await api(`/customers/${id}`, { method: "DELETE" });

    toast("客戶已刪除");
    loadCustomers();

  } catch (err) {
    console.error(err);

    // 後端常見情況：FK RESTRICT
    if (err.status === 400 || err.status === 409) {
      toast(
        err?.data?.detail || "此客戶已有關聯資料，無法刪除",
        "error"
      );
    } else {
      toast("刪除失敗", "error");
    }
  }
}

