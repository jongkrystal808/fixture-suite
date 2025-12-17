/**
 * 機種管理（後台專用 / Multi-Tenant）
 * app-machine-models-mt.js
 *
 * ✔ admin only
 * ✔ 依 customer_id 管理
 * ✔ 新增 / 編輯 / 刪除
 * ✔ 分頁（預留）
 * ✔ 對應 api-machine-models.js
 */

/* ============================================================
 * 狀態
 * ============================================================ */

let modelPage = 1;
let modelPageSize = 20;

/**
 * ⚠ 必須存在的全域狀態
 * window.currentUser
 * window.currentCustomerId
 */

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔐 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("Not admin — skip machine models module init");
    return;
  }

  // 🔥 DOM 不存在就不啟動
  if (!document.getElementById("modelTable")) {
    console.warn("Model table not found — skip machine models module init");
    return;
  }

  if (!window.currentCustomerId) {
    toast("請先選擇客戶", "warning");
    return;
  }

  loadMachineModels();
});

/* ============================================================
 * 載入機種列表
 * ============================================================ */

async function loadMachineModels() {
  const search = document.getElementById("modelSearch")?.value.trim() || "";

  const params = {
    customer_id: window.currentCustomerId,
    page: modelPage,
    pageSize: modelPageSize
  };

  if (search) params.q = search;

  try {
    const rows = await apiListMachineModels(params);
    renderMachineModelTable(rows);
    renderMachineModelPagination(rows.length);
  } catch (err) {
    console.error(err);
    toast("載入機種失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderMachineModelTable(rows) {
  const tbody = document.getElementById("modelTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-gray-400">
          查無機種資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-2">${m.id}</td>
      <td class="py-2 px-2">${m.model_name}</td>
      <td class="py-2 px-2">${m.note || ""}</td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline"
                onclick="openMachineModelEdit('${m.id}')">
          編輯
        </button>
        <button class="btn btn-xs btn-error"
                onclick="deleteMachineModel('${m.id}')">
          刪除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁（目前 API 為簡單列表，保留結構）
 * ============================================================ */

function renderMachineModelPagination(total) {
  const box = document.getElementById("modelPagination");
  if (!box) return;
  box.innerHTML = "";
  // 若未來 API 回傳 total，可補完整分頁
}

/* ============================================================
 * 新增機種
 * ============================================================ */

function openMachineModelAdd() {
  document.getElementById("modelForm").reset();
  document.getElementById("modelFormMode").value = "add";
  document.getElementById("modelModalTitle").innerText = "新增機種";
  document.getElementById("m_id").disabled = false;
  modelModal.showModal();
}

async function submitMachineModelForm() {
  const mode = document.getElementById("modelFormMode").value;

  const payload = {
    id: document.getElementById("m_id").value.trim(),
    customer_id: window.currentCustomerId,
    model_name: document.getElementById("m_name").value.trim(),
    note: document.getElementById("m_note").value.trim() || null
  };

  if (!payload.id) return toast("請輸入機種代碼");
  if (!payload.model_name) return toast("請輸入機種名稱");

  try {
    if (mode === "add") {
      await apiCreateMachineModel(payload);
      toast("新增機種成功");
    } else {
      await apiUpdateMachineModel(payload.id, window.currentCustomerId, {
        model_name: payload.model_name,
        note: payload.note
      });
      toast("更新成功");
    }

    modelModal.close();
    loadMachineModels();
  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯機種
 * ============================================================ */

async function openMachineModelEdit(modelId) {
  try {
    const data = await apiGetMachineModel(modelId, window.currentCustomerId);

    document.getElementById("modelFormMode").value = "edit";
    document.getElementById("modelModalTitle").innerText = "編輯機種";

    document.getElementById("m_id").value = data.id;
    document.getElementById("m_id").disabled = true; // 主鍵不可改
    document.getElementById("m_name").value = data.model_name;
    document.getElementById("m_note").value = data.note || "";

    modelModal.showModal();
  } catch (err) {
    console.error(err);
    toast("載入機種失敗", "error");
  }
}

/* ============================================================
 * 刪除機種
 * ============================================================ */

async function deleteMachineModel(modelId) {
  if (!confirm(`確定要刪除機種 ${modelId}？`)) return;

  try {
    await apiDeleteMachineModel(modelId, window.currentCustomerId);
    toast("機種已刪除");
    loadMachineModels();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}
