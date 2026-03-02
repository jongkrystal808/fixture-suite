/**
 * 使用記錄前端控制 v5.x (Model Driven Batch Mode)
 * -----------------------------------------------------------
 * 保留查詢 / 分頁 / 匯入
 * 改為機種驅動批量寫入
 */

let usagePage = 1;
const usagePageSize = 20;

/* ============================================================
 * DOM 綁定
 * ============================================================ */

const modelInput     = document.getElementById("usageAddModel");
const stationInput   = document.getElementById("usageAddStation");
const countInput     = document.getElementById("usageAddCount");
const operatorInput  = document.getElementById("usageAddOperator");
const usedAtInput    = document.getElementById("usageAddTime");
const noteInput      = document.getElementById("usageAddNote");
const previewBox     = document.getElementById("usagePreviewContainer");
const usageTableBody = document.getElementById("usageTable");

/* ============================================================
 * Utils
 * ============================================================ */

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString().slice(0, 10);
}

if (usedAtInput && !usedAtInput.value) {
  const today = new Date().toISOString().slice(0, 10);
  usedAtInput.value = today;
}

/* ============================================================
 * 機種 → 站點載入
 * ============================================================ */

async function loadStationsByModel(modelId) {
  if (!stationInput) return;

  stationInput.innerHTML = `<option value="">載入中...</option>`;
  stationInput.disabled = true;

  try {
    const rows = await api("/model-detail/lookup/stations-by-model", {
      params: { model_id: modelId },
    });

    stationInput.innerHTML = `<option value="">全部站點</option>`;

    rows.forEach(r => {
      stationInput.appendChild(
        new Option(`${r.station_id} - ${r.station_name ?? ""}`, r.station_id)
      );
    });

    stationInput.disabled = false;
  } catch (err) {
    console.error(err);
    stationInput.innerHTML = `<option value="">讀取站點失敗</option>`;
  }
}

modelInput?.addEventListener("change", () => {
  const modelId = modelInput.value.trim();
  if (modelId) loadStationsByModel(modelId);
});

/* ============================================================
 * 預覽（核心）
 * ============================================================ */

async function previewUsageByModel() {

  const modelId = modelInput?.value.trim();
  const stationIdRaw = stationInput?.value.trim();
  const quantity = Number(countInput?.value) || 0;

  if (!modelId) return toast("請輸入機種", "warning");
  if (quantity <= 0) return toast("數量需大於 0", "warning");

  // 🔥 統一 payload 格式（對齊後端 mode 設計）
  let payload = {
    model_id: modelId,
    output_qty: quantity
  };

  if (!stationIdRaw) {
    // 空 = 全部站
    payload.mode = "all";
  } else {
    payload.mode = "single";
    payload.station_id = stationIdRaw;
    payload.run_count = quantity;
  }

  try {

    const data = await api("/usage/preview-by-model", {
      method: "POST",
      body: payload
    });

    renderPreview(data);

  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "預覽失敗", "error");
  }
}

window.previewUsageByModel = previewUsageByModel;

/* ============================================================
 * 動態產生預覽 UI
 * ============================================================ */
function renderPreview(data) {

  if (!previewBox) return;

  previewBox.innerHTML = `
    <div id="previewGrid"
         class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
    </div>
  `;
  const previewGrid = document.getElementById("previewGrid");

  if (!data?.stations?.length) {
    previewBox.innerHTML = "<div class='text-gray-400'>沒有資料</div>";
    return;
  }

  data.stations.forEach(st => {

    const stationBlock = document.createElement("div");
    stationBlock.className = "bg-white rounded-lg shadow p-4 h-fit";

    const editable = [];
    const readonly = [];

    st.fixtures.forEach(fx => {
      if (fx.readonly) readonly.push(fx);
      else editable.push(fx);
    });

    const readonlyCount = readonly.length;
    const toggleId = `dc-${st.station_id}`;

    // ===== 標題區 =====
    stationBlock.innerHTML = `
      <div class="flex items-center justify-between mb-4 border-b pb-2">
        <div class="font-semibold text-lg">
          站點：${st.station_id}
        </div>

        ${readonlyCount > 0 ? `
          <div 
            class="flex items-center gap-1 text-xs text-gray-400 cursor-pointer select-none"
            onclick="
              const el = document.getElementById('${toggleId}');
              el.classList.toggle('hidden');
              this.querySelector('svg').classList.toggle('rotate-180');
            "
          >
            <span>Datecode (${readonlyCount})</span>
            <svg xmlns="http://www.w3.org/2000/svg"
                 class="w-4 h-4 transform transition-transform duration-200"
                 fill="none"
                 viewBox="0 0 24 24"
                 stroke="currentColor"
                 stroke-width="2">
              <path stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ` : ""}
      </div>
    `;

    // ===== 可填寫治具 =====
    editable.forEach(fx => {

      const row = document.createElement("div");
      row.className = "flex items-center justify-between mb-3";

      row.innerHTML = `
        <div class="font-medium w-24">${fx.fixture_id}</div>
        <div class="w-10 text-center">${fx.use_count}</div>

        <input
          class="input serial-input border rounded px-2 py-1 flex-1 mx-3"
          data-station="${st.station_id}"
          data-fixture="${fx.fixture_id}"
          placeholder="輸入序號（逗號分隔）"
        />

        <div class="text-xs text-gray-400 w-8 text-right">必填</div>
      `;

      stationBlock.appendChild(row);
    });

    // ===== Datecode 區塊（標題控制 / 內容在下方）=====
    if (readonlyCount > 0) {

      const container = document.createElement("div");
      container.id = toggleId;
      container.className = "hidden mt-4 space-y-3 border-t pt-3";

      readonly.forEach(fx => {

        const row = document.createElement("div");
        row.className = "flex items-center justify-between";

        row.innerHTML = `
          <div>
            <div class="font-medium">${fx.fixture_id}</div>
            <div class="text-sm text-gray-500">
              使用數量：${fx.use_count}
            </div>
          </div>

          <input
            class="input bg-gray-200 text-gray-400 cursor-not-allowed w-40"
            placeholder="無需填寫"
            disabled
          />
        `;

        container.appendChild(row);
      });

      stationBlock.appendChild(container);
    }

    previewGrid.appendChild(stationBlock);
  });

  // ===== 確認按鈕 =====
  const btn = document.createElement("button");
  btn.className = "btn btn-primary mt-6";
  btn.textContent = "送出";
  btn.onclick = submitPreviewUsage;

  previewBox.appendChild(btn);

  // ===== Enter 跳下一欄 =====
  const inputs = previewBox.querySelectorAll(".serial-input");

  inputs.forEach((input, index) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const next = inputs[index + 1];
        if (next) next.focus();
        else btn.focus();
      }
    });
  });
}

/* ============================================================
 * 批量寫入
 * ============================================================ */
async function submitPreviewUsage() {

  const modelId = modelInput?.value.trim();
  const quantity = Number(countInput?.value) || 0;

  if (!modelId) return toast("請輸入機種", "warning");
  if (quantity <= 0) return toast("數量需大於 0", "warning");

  const serialInputs = document.querySelectorAll(".serial-input");

  const records = [];
  let hasError = false;

  serialInputs.forEach(input => {

    const fixtureId = input.dataset.fixture;
    const stationId = input.dataset.station;
    const val = input.value.trim();

    // 先清除紅框
    input.classList.remove("border-red-500");

    if (!val) {
      // 標紅框
      input.classList.add("border-red-500");
      hasError = true;
      return;
    }

    const serialList = val
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    if (!serialList.length) {
      input.classList.add("border-red-500");
      hasError = true;
      return;
    }

    records.push({
      station_id: stationId,
      fixture_id: fixtureId,
      use_count: quantity,
      serials: serialList.join(","),
      formula: `run_count(${quantity})`
    });

  });

  if (hasError) {
    return toast("請填寫所有序號欄位", "warning");
  }

  if (!records.length) {
    return toast("沒有可寫入資料", "warning");
  }

  let payload = {
    model_id: modelId,
    mode: "all", // 後端實際不依賴這裡決定站點
    operator: operatorInput?.value || null,
    records
  };

  try {

    await api("/usage/create-by-model", {
      method: "POST",
      body: payload
    });

    toast("使用記錄新增成功");

    toggleUsageAdd(false);
    loadUsageLogs();

  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || "寫入失敗", "error");
  }
}

/* ============================================================
 * 查詢（原功能保留）
 * ============================================================ */

async function loadUsageLogs(page = 1) {

  if (!window.currentCustomerId) return;

  usagePage = page;

  const fixture  = document.getElementById("usageSearchFixture")?.value.trim();
  const serial   = document.getElementById("usageSearchSerial")?.value.trim();
  const station  = document.getElementById("usageSearchStation")?.value.trim();
  const operator = document.getElementById("usageSearchOperator")?.value.trim();
  const model    = document.getElementById("usageSearchModel")?.value.trim();

  const params = {
    skip: (usagePage - 1) * usagePageSize,
    limit: usagePageSize,
  };

  if (fixture)  params.fixture_id = fixture;
  if (serial)   params.serial_number = serial;
  if (station)  params.station_id = station;
  if (operator) params.operator = operator;
  if (model)    params.model_id = model;

  try {
    const rows = await api("/usage", { params });
    const list = Array.isArray(rows) ? rows : [];

    renderUsageTable(list);

    renderPagination(
      "usagePagination",
      list.length < usagePageSize
        ? (usagePage - 1) * usagePageSize + list.length
        : usagePage * usagePageSize + 1,
      usagePage,
      usagePageSize,
      p => loadUsageLogs(p)
    );

  } catch (err) {
    console.error(err);
    toast("查詢使用紀錄失敗", "error");
  }
}

window.loadUsageLogs = loadUsageLogs;

/* ============================================================
 * 表格
 * ============================================================ */

function renderUsageTable(rows) {

  if (!usageTableBody) return;
  usageTableBody.innerHTML = "";

  if (!rows.length) {
    usageTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {

    const tr = document.createElement("tr");

    const serialText =
      r.serial_number ??
      (Array.isArray(r.serials) ? r.serials.join(", ") : null) ??
      "-";

    tr.innerHTML = `
      <td class="py-2 pr-4">${fmtDate(r.used_at)}</td>
      <td class="py-2 pr-4">${r.fixture_id ?? "-"}</td>
      <td class="py-2 pr-4">${serialText}</td>
      <td class="py-2 pr-4">${r.station_name ?? r.station_id ?? "-"}</td>
      <td class="py-2 pr-4">${r.model_name ?? r.model_id ?? "-"}</td>
      <td class="py-2 pr-4">${r.use_count ?? "-"}</td>
      <td class="py-2 pr-4">${r.operator ?? "-"}</td>
      <td class="py-2 pr-4">${r.note ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-error"
          onclick="deleteUsage(${r.id})">
          刪除
        </button>
      </td>
    `;

    usageTableBody.appendChild(tr);
  });
}

/* ============================================================
 * 刪除
 * ============================================================ */

async function deleteUsage(id) {
  if (!confirm("確定要刪除此使用紀錄？")) return;

  try {
    await api(`/usage/${id}`, { method: "DELETE" });
    toast("已刪除");
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast("刪除失敗", "error");
  }
}

window.deleteUsage = deleteUsage;

function toggleUsageAdd(show) {
  const form = document.getElementById("usageAddForm");
  if (!form) return;

  if (show) form.classList.remove("hidden");
  else form.classList.add("hidden");
}

/* ============================================================
 * 初始化
 * ============================================================ */

onUserReady?.(() => {
  onCustomerReady?.(() => {
    loadUsageLogs();
  });
});

window.toggleUsageAdd = toggleUsageAdd;
window.previewUsageByModel = previewUsageByModel;