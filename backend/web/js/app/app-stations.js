/**
 * 站點管理前端控制 (v3.0)
 * 對應 index.html 站點主檔維護 Modal
 *
 * ✔ 新版 UI：stStationModal
 * ✔ 正確 DOM：stCode, stName, stNote, stTable
 * ✔ 使用 customer_id（每個 API 必須帶）
 * ✔ 無舊版 stationTable / stationSearch 內容
 */

/* ============================================================
 * 工具
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 載入站點主檔清單
 * ============================================================ */

async function stLoadStationMasterList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("未選擇客戶，無法載入站點");
    return;
  }

  try {
    const rows = await apiListStations({ customer_id });

    const tbody = document.getElementById("stTable");
    tbody.innerHTML = "";

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-2 text-gray-400">無資料</td>
        </tr>`;
      return;
    }

    rows.forEach(s => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="py-1 px-2">${s.id}</td>
        <td class="py-1 px-2">${s.station_id}</td>
        <td class="py-1 px-2">${s.station_name || "-"}</td>
        <td class="py-1 px-2">${s.note || "-"}</td>
        <td class="py-1 px-2 text-right">
          <button class="btn btn-xs btn-outline" onclick="stEdit('${s.station_id}')">編輯</button>
          <button class="btn btn-xs btn-error" onclick="stDelete('${s.station_id}')">刪除</button>
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
 * 新增 / 編輯 Modal 控制
 * ============================================================ */

function stResetForm() {
  document.getElementById("stCode").value = "";
  document.getElementById("stName").value = "";
  document.getElementById("stNote").value = "";
  document.getElementById("stModeLabel").innerText = "新增";
}

function stOpenStationMasterModal() {
  stResetForm();
  document.getElementById("stStationModal").classList.remove("hidden");
  document.getElementById("stStationModal").style.display = "flex";
}

function stCloseStationMasterModal() {
  document.getElementById("stStationModal").style.display = "none";
  document.getElementById("stStationModal").classList.add("hidden");
}

/* ============================================================
 * 編輯
 * ============================================================ */

async function stEdit(stationId) {
  const customer_id = getCurrentCustomerId();

  try {
    const data = await apiGetStation({ customer_id, station_id: stationId });

    document.getElementById("stCode").value = data.station_id;
    document.getElementById("stName").value = data.station_name;
    document.getElementById("stNote").value = data.note || "";

    document.getElementById("stModeLabel").innerText = "編輯";

    stOpenStationMasterModal();
  } catch (err) {
    console.error(err);
    toast("讀取站點資料失敗", "error");
  }
}

/* ============================================================
 * 儲存（新增 / 修改）
 * ============================================================ */

async function stSubmitForm() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return toast("請先選擇客戶");

  const code = document.getElementById("stCode").value.trim();
  const name = document.getElementById("stName").value.trim();
  const note = document.getElementById("stNote").value.trim() || null;

  if (!code) return toast("請輸入站點代碼");
  if (!name) return toast("請輸入站點名稱");

  const payload = {
    customer_id,
    station_id: code,
    station_name: name,
    note
  };

  const isEdit = document.getElementById("stModeLabel").innerText === "編輯";

  try {
    if (isEdit) {
      await apiUpdateStation(payload);
      toast("更新成功");
    } else {
      await apiCreateStation(payload);
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
 * 刪除
 * ============================================================ */

async function stDelete(stationId) {
  if (!confirm("確定刪除此站點？")) return;

  const customer_id = getCurrentCustomerId();

  try {
    await apiDeleteStation({ customer_id, station_id: stationId });
    toast("已刪除");
    stLoadStationMasterList();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

/* ============================================================
 * 🟩 重新計算最大可開站數（依model_id）
 * ============================================================ */
async function recalculateMaxStations() {
  if (!currentSelectedModel) {
    toast("請先選擇機種");
    return;
  }

  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    toast("無 customer_id");
    return;
  }

  try {
    // 呼叫後端重新計算（你後端 detail 已包含 max_stations）
    const detail = await apiGetModelDetail(currentSelectedModel);

    // 更新 Drawer：若正在開啟，也重新渲染
    if (typeof openModelDetail === "function") {
      openModelDetail(currentSelectedModel);
    }

    toast("最大可開站數已重新計算");
  } catch (err) {
    console.error("recalculateMaxStations() failed:", err);
    toast("重新計算失敗", "error");
  }
}

// 全域
window.recalculateMaxStations = recalculateMaxStations;

/* ============================================================
 * 導出全域
 * ============================================================ */

window.stOpenStationMasterModal = stOpenStationMasterModal;
window.stCloseStationMasterModal = stCloseStationMasterModal;
window.stLoadStationMasterList = stLoadStationMasterList;
window.stSubmitForm = stSubmitForm;
window.stResetForm = stResetForm;
window.stEdit = stEdit;
window.stDelete = stDelete;
