/**
 * 站點管理前端控制（v4.x PATCHED）
 * 檔案：/web/js/app/app-stations.js
 *
 * ✅ customer 由 header/context 決定（不再帶 customer_id）
 * ✅ 初始化改用 onCustomerReady（避免 user:ready 時 customer 未就緒）
 * ✅ 修正 table render：不要 tr 裡面再包一層 <tr>
 * ✅ open modal 會 reset（避免殘留 edit 狀態）
 * ✅ stClose / closeStationModal 統一
 * ✅ 刪除 / 讀取 / 新增 / 更新 API 全部走 v4.x（不帶 customer_id）
 */

/* ============================================================
 * 狀態變數（全域）
 * ============================================================ */
let stIsEdit = false;
let stEditingId = null;

/* ============================================================
 * 🧭 Admin Sidebar Entry
 * 後台管理 → 站點管理
 *
 * v4.x：customer gate 由外層處理（app-admin.js / onCustomerReady）
 * ============================================================ */
function loadAdminStations() {
  if (!window.currentCustomerId) {
    toast("請先選擇客戶", "warning");
    return;
  }
  stLoadStationMasterList();
}
window.loadAdminStations = loadAdminStations;

/* ============================================================
 * 初始化（v4.x）
 * ============================================================ */
onCustomerReady?.(() => {
  if (!window.currentUser || window.currentUser.role !== "admin") return;
  if (!document.getElementById("stTable")) return;
  stLoadStationMasterList();
});

/* ============================================================
 * 載入站點列表（v4.x：不帶 customer_id）
 * ============================================================ */
async function stLoadStationMasterList() {
  if (!window.currentCustomerId) return;

  const tbody = document.getElementById("stTable");
  if (!tbody) return;

  try {
    const rows = await apiListStations(); // ✅ v4.x：header/context 會帶 customer
    tbody.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-2 text-gray-400">無資料</td>
        </tr>`;
      return;
    }

    rows.forEach((s) => {
      const id = s.id ?? "";
      const name = s.station_name ?? "-";
      const note = s.note ?? "-";

      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 transition";
      tr.innerHTML = `
        <td class="py-1 pr-3 text-center align-middle">
          <span class="text-600 font-bold">${id}</span>
        </td>
        <td class="py-1 px-3 w-20 text-center align-middle">${name}</td>
        <td class="py-1 px-3 w-20 text-center align-middle">${note}</td>
        <td class="py-1 px-3 whitespace-nowrap w-32 align-middle">
          <div class="flex justify-center gap-2">
            <button class="btn btn-xs btn-outline" onclick="stEdit('${id}')">編輯</button>
            <button class="btn btn-xs btn-error" onclick="stDelete('${id}')">刪除</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "載入站點列表失敗", "error");
  }
}

/* ============================================================
 * Modal 控制
 * ============================================================ */
function stResetForm() {
  stIsEdit = false;
  stEditingId = null;

  const codeEl = document.getElementById("stCode");
  const nameEl = document.getElementById("stName");
  const noteEl = document.getElementById("stNote");
  const titleEl = document.getElementById("stationModalTitle");

  if (codeEl) {
    codeEl.value = "";
    codeEl.disabled = false;
  }
  if (nameEl) nameEl.value = "";
  if (noteEl) noteEl.value = "";
  if (titleEl) titleEl.innerText = "新增站點";
}

function stOpenStationMasterModal() {
  stResetForm(); // ✅ 開啟就清狀態，避免殘留 edit
  const modal = document.getElementById("stationModal");
  modal?.classList.remove("hidden");
}

function stCloseStationMasterModal() {
  const modal = document.getElementById("stationModal");
  modal?.classList.add("hidden");
}
window.stOpenStationMasterModal = stOpenStationMasterModal;
window.stCloseStationMasterModal = stCloseStationMasterModal;

// 兼容舊 onclick 名稱（如果 HTML 有用）
function closeStationModal() {
  stCloseStationMasterModal();
}
window.closeStationModal = closeStationModal;

/* ============================================================
 * 編輯（v4.x：不帶 customer_id）
 * ============================================================ */
async function stEdit(stationId) {
  if (!window.currentCustomerId) return;

  try {
    const data = await apiGetStation(stationId); // ✅ v4.x：不用 params.customer_id

    stIsEdit = true;
    stEditingId = stationId;

    const codeEl = document.getElementById("stCode");
    const nameEl = document.getElementById("stName");
    const noteEl = document.getElementById("stNote");
    const titleEl = document.getElementById("stationModalTitle");

    if (codeEl) {
      codeEl.value = data.id ?? stationId;
      codeEl.disabled = true; // PK 不可改
    }
    if (nameEl) nameEl.value = data.station_name ?? "";
    if (noteEl) noteEl.value = data.note ?? "";
    if (titleEl) titleEl.innerText = "編輯站點";

    const modal = document.getElementById("stationModal");
    modal?.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "讀取站點資料失敗", "error");
  }
}
window.stEdit = stEdit;

/* ============================================================
 * 儲存（新增 / 更新）（v4.x：不帶 customer_id）
 * ============================================================ */
async function stSubmitForm() {
  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  const code = document.getElementById("stCode")?.value.trim() || "";
  const name = document.getElementById("stName")?.value.trim() || "";
  const noteRaw = document.getElementById("stNote")?.value.trim() || "";
  const note = noteRaw || null;

  if (!code) return toast("請輸入站點代碼", "warning");
  if (!name) return toast("請輸入站點名稱", "warning");

  try {
    if (stIsEdit) {
      await apiUpdateStation(stEditingId, {
        station_name: name,
        note,
      });
      toast("更新成功");
    } else {
      await apiCreateStation({
        id: code,
        station_name: name,
        note,
      });
      toast("新增成功");
    }

    stCloseStationMasterModal();
    stLoadStationMasterList();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "儲存失敗", "error");
  }
}
window.stSubmitForm = stSubmitForm;

/* ============================================================
 * 刪除（v4.x：不帶 customer_id）
 * ============================================================ */
async function stDelete(stationId) {
  if (!stationId) return;
  if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

  if (!confirm(`確定要刪除站點 ${stationId}？`)) return;

  try {
    // ✅ 盡量用你已有的 apiDeleteStation；若沒有再 fallback api()
    if (typeof apiDeleteStation === "function") {
      await apiDeleteStation(stationId);
    } else {
      await api(`/stations/${stationId}`, { method: "DELETE" });
    }

    toast("站點已刪除");
    stLoadStationMasterList();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "刪除失敗", "error");
  }
}
window.stDelete = stDelete;

/* ============================================================
 * 全域導出
 * ============================================================ */
window.stLoadStationMasterList = stLoadStationMasterList;
