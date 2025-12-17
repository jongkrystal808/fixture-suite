/**
 * 站點管理前端控制（Clean v3.1）
 * 檔案：/web/js/app/app-stations.js
 *
 * ✔ 僅支援 stStationModal（div-based）
 * ✔ station 主鍵統一使用 id
 * ✔ 無任何舊版 API / 舊命名相容層
 * ✔ HTML 入口只需 stOpenStationMasterModal()
 */

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  if (!window.currentUser || window.currentUser.role !== "admin") return;

  if (!window.currentCustomerId) {
    toast("請先選擇客戶", "warning");
    return;
  }

  if (document.getElementById("stTable")) {
    stLoadStationMasterList();
  }
});

/* ============================================================
 * 工具
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 載入站點列表
 * ============================================================ */

async function stLoadStationMasterList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    const rows = await apiListStations({ customer_id });
    const tbody = document.getElementById("stTable");
    tbody.innerHTML = "";

    if (!rows || !rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-2 text-gray-400">無資料</td>
        </tr>`;
      return;
    }

    rows.forEach(s => {
      const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="py-1 px-2">${s.id}</td>
          <td class="py-1 px-2">${s.id}</td>
          <td class="py-1 px-2">${s.station_name || "-"}</td>
          <td class="py-1 px-2">${s.note || "-"}</td>
          <td class="py-1 px-2 text-right">
            <button class="btn btn-xs btn-outline" onclick="stEdit('${s.id}')">編輯</button>
            <button class="btn btn-xs btn-error" onclick="stDelete('${s.id}')">刪除</button>
          </td>
        `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    toast("載入站點列表失敗", "error");
  }
}

/* ============================================================
 * Modal 控制
 * ============================================================ */

function stResetForm() {
  stIsEdit = false;
  stEditingId = null;

  document.getElementById("stCode").value = "";
  document.getElementById("stCode").disabled = false;

  document.getElementById("stName").value = "";
  document.getElementById("stNote").value = "";

  document.getElementById("stationModalTitle").innerText = "新增站點";
}



function stOpenStationMasterModal() {
  const modal = document.getElementById("stationModal");
  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

function stCloseStationMasterModal() {
  const modal = document.getElementById("stationModal");
  modal.classList.add("hidden");
}


/* ============================================================
 * 編輯
 * ============================================================ */
async function stEdit(stationId) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  try {
    const data = await apiGetStation({
      customer_id,
      station_id: stationId
    });

    stIsEdit = true;
    stEditingId = stationId;

    document.getElementById("stCode").value = data.id;
    document.getElementById("stCode").disabled = true; // ⭐ PK 不可改
    document.getElementById("stName").value = data.station_name;
    document.getElementById("stNote").value = data.note || "";

    document.getElementById("stationModalTitle").innerText = "編輯站點";

    stOpenStationMasterModal();
  } catch (err) {
    console.error(err);
    toast("讀取站點資料失敗", "error");
  }
}


/* ============================================================
 * 儲存（新增 / 更新）
 * ============================================================ */
async function stSubmitForm() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const code = document.getElementById("stCode").value.trim();
  const name = document.getElementById("stName").value.trim();
  const note = document.getElementById("stNote").value.trim() || null;

  if (!code) return toast("請輸入站點代碼");
  if (!name) return toast("請輸入站點名稱");

  try {
    if (stIsEdit) {
      await apiUpdateStation({
        customer_id,
        station_id: stEditingId,
        station_name: name,
        note
      });
      toast("更新成功");
    } else {
      await apiCreateStation({
        customer_id,
        station_id: code,
        station_name: name,
        note
      });
      toast("新增成功");
    }

    stCloseStationMasterModal();
    stLoadStationMasterList();

  } catch (err) {
    console.error(err);
    toast("儲存失敗", "error");
  }
}

/* ============================================================
 * 刪除（唯一入口）
 * ============================================================ */

async function stDelete(stationId) {
  if (!stationId) return;

  if (!confirm(`確定要刪除站點 ${stationId}？`)) return;

  try {
    await api(`/stations/${stationId}`, {
      method: "DELETE",
      params: { customer_id: getCurrentCustomerId() }
    });

    toast("站點已刪除");
    stLoadStationMasterList();

  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

function closeStationModal() {
  stCloseStationMasterModal();
}

window.closeStationModal = closeStationModal;

/* ============================================================
 * 全域導出（HTML 只允許呼叫這些）
 * ============================================================ */

window.stOpenStationMasterModal = stOpenStationMasterModal;
window.stCloseStationMasterModal = stCloseStationMasterModal;
window.stLoadStationMasterList = stLoadStationMasterList;
window.stSubmitForm = stSubmitForm;
window.stEdit = stEdit;
window.stDelete = stDelete;
