/**
 * 使用記錄前端控制 (v4.x PATCHED)
 * -----------------------------------------------------------
 * 重點修正：
 * 1) v4.x：customer 由 header/context 決定 → 不再帶 customer_id
 * 2) 修正 usageStationSelect 未宣告（改用 stationInput）
 * 3) used_at 送 ISO 字串（避免 Date 物件被序列化成奇怪格式）
 * 4) 全面加上 DOM null guard，避免頁面尚未載入就報錯
 * 5) renderUsageTable：時間格式化、serial 欄位相容（serial_number / serials）
 * -----------------------------------------------------------
 */

/* ============================================================
 * DOM 綁定
 * ============================================================ */

const fxInput        = document.getElementById("usageAddFixture");
const modelInput     = document.getElementById("usageAddModel");

// ✅ 這個是「站點下拉/輸入」本體（你原本用 stationInput）
const stationInput   = document.getElementById("usageAddStation");

const levelSelect    = document.getElementById("usageAddLevel");
const serialsInput   = document.getElementById("usageAddSerials");
const batchStart     = document.getElementById("usageAddSerialStart");
const batchEnd       = document.getElementById("usageAddSerialEnd");

const countInput     = document.getElementById("usageAddCount");
const operatorInput  = document.getElementById("usageAddOperator");
const usedAtInput    = document.getElementById("usageAddTime");
const noteInput      = document.getElementById("usageAddNote");

const usageTableBody = document.getElementById("usageTable");

/* ============================================================
 * Utils
 * ============================================================ */
function fmtDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

/* ============================================================
 * UI Mode 切換
 * ============================================================ */

function toggleUsageSerialInputs() {
  const mode = levelSelect?.value;

  document.getElementById("usageSerialSingleField")?.classList.toggle(
    "hidden",
    mode !== "individual"
  );

  document.getElementById("usageSerialBatchField")?.classList.toggle(
    "hidden",
    mode !== "batch"
  );
}

levelSelect?.addEventListener("change", toggleUsageSerialInputs);
toggleUsageSerialInputs();

/* ============================================================
 * 綁定站點帶入（依治具）
 * - v4.x：不帶 customer_id（由 header/context）
 * - 直接更新 stationInput 的 options（select）
 * ============================================================ */
async function loadStationsForFixture(fixtureId) {
  if (!stationInput) return;

  // stationInput 如果是 <select> 才會有 innerHTML；不是 select 的話就跳過
  if (!("innerHTML" in stationInput)) return;

  stationInput.innerHTML = `<option value="">載入中...</option>`;

  try {
    const url = `/model-details/stations-by-fixture/${encodeURIComponent(
      fixtureId
    )}`;
    const rows = await api(url);

    stationInput.innerHTML = "";

    if (!Array.isArray(rows) || rows.length === 0) {
      stationInput.innerHTML = `<option value="">無綁定站點</option>`;
      return;
    }

    rows.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = r.station_id;
      opt.textContent = `${r.station_id} - ${r.station_name ?? ""}`;
      stationInput.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    stationInput.innerHTML = `<option value="">讀取失敗</option>`;
  }
}

fxInput?.addEventListener("change", () => {
  const fx = fxInput.value.trim();
  if (fx) loadStationsForFixture(fx);
});

/* ============================================================
 * 序號解析工具
 * ============================================================ */

function parseIndividualSerials(text) {
  if (!text) return [];
  return text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function expandBatchSerials(start, end) {
  const s = (start || "").trim();
  const e = (end || "").trim();
  if (!s || !e) return [];

  const prefixS = s.match(/^\D+/)?.[0] || "";
  const prefixE = e.match(/^\D+/)?.[0] || "";
  if (prefixS !== prefixE) throw new Error("批量序號前綴不一致");

  const numS = parseInt(s.replace(prefixS, ""), 10);
  const numE = parseInt(e.replace(prefixE, ""), 10);

  if (!Number.isFinite(numS) || !Number.isFinite(numE) || numE < numS) {
    throw new Error("序號範圍無效");
  }

  const width = Math.max(s.length - prefixS.length, e.length - prefixE.length);

  const out = [];
  for (let i = numS; i <= numE; i++) {
    out.push(prefixS + String(i).padStart(width, "0"));
  }
  return out;
}

/* ============================================================
 * 新增使用紀錄 (POST)
 * ============================================================ */

async function submitUsageLog() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fixture_id = fxInput?.value.trim() || "";
  const model_id   = modelInput?.value.trim() || "";
  const station_id = stationInput?.value.trim() || "";
  const level      = levelSelect?.value || "fixture";

  if (!fixture_id) return toast("請輸入治具編號", "warning");
  if (!model_id)   return toast("請輸入機種 ID", "warning");
  if (!station_id) return toast("請選擇站點", "warning");

  const use_count = Number(countInput?.value) || 1;
  if (use_count <= 0) return toast("使用次數需大於 0", "warning");

  const operator = (operatorInput?.value || "").trim() || window.currentUserName || "";
  const used_at = usedAtInput?.value
    ? new Date(usedAtInput.value).toISOString()
    : new Date().toISOString();

  const note = (noteInput?.value || "").trim() || null;

  let serials = null;

  if (level === "individual") {
    serials = parseIndividualSerials(serialsInput?.value || "");
    if (!serials.length) return toast("請輸入序號", "warning");
  }

  if (level === "batch") {
    try {
      serials = expandBatchSerials(batchStart?.value || "", batchEnd?.value || "");
    } catch (err) {
      console.error(err);
      return toast(err.message, "error");
    }
    if (!serials.length) return toast("批量序號解析失敗", "error");
  }

  const payload = {
    record_level: level,
    fixture_id,
    model_id,
    station_id,
    use_count,
    operator,
    used_at,
    note,
    serials, // fixture 層級會是 null
  };

  try {
    await api("/usage", {
      method: "POST",
      body: payload,
    });

    toast("使用紀錄新增成功");
    loadUsageLogs();

    // 你現在是允許收起（不像 receipts/returns v4.x 禁止收起）
    toggleUsageAdd(false);
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "新增使用紀錄失敗", "error");
  }
}

window.submitUsageLog = submitUsageLog;

/* ============================================================
 * 查詢使用紀錄
 * ============================================================ */

async function loadUsageLogs() {
  if (!window.currentCustomerId) return;

  const fixture = document.getElementById("usageSearchFixture")?.value.trim();
  const serial  = document.getElementById("usageSearchSerial")?.value.trim();
  const station = document.getElementById("usageSearchStation")?.value.trim();
  const operator = document.getElementById("usageSearchOperator")?.value.trim();
  const model = document.getElementById("usageSearchModel")?.value.trim();

  const params = {};
  if (fixture) params.fixture_id = fixture;
  if (serial)  params.serial_number = serial;
  if (station) params.station_id = station;
  if (operator) params.operator = operator;
  if (model)   params.model_id = model;

  try {
    const rows = await api("/usage", { params });
    renderUsageTable(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error(err);
    toast("查詢使用紀錄失敗", "error");
  }
}

window.loadUsageLogs = loadUsageLogs;

/* ============================================================
 * 使用紀錄表格
 * ============================================================ */

function renderUsageTable(rows) {
  if (!usageTableBody) return;

  usageTableBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    usageTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const tr = document.createElement("tr");

    // serial 相容：serial_number / serials(array)
    const serialText =
      r.serial_number ??
      (Array.isArray(r.serials) ? r.serials.join(", ") : null) ??
      "-";

    tr.innerHTML = `
      <td class="py-2 pr-4">${fmtDateTime(r.used_at)}</td>
      <td class="py-2 pr-4">${r.fixture_id ?? "-"}</td>
      <td class="py-2 pr-4">${serialText}</td>
      <td class="py-2 pr-4">${r.station_name ?? r.station_id ?? "-"}</td>
      <td class="py-2 pr-4">${r.model_name ?? r.model_id ?? "-"}</td>
      <td class="py-2 pr-4">${r.use_count ?? "-"}</td>
      <td class="py-2 pr-4">${r.operator ?? "-"}</td>
      <td class="py-2 pr-4">${r.note ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-error" onclick="deleteUsage(${JSON.stringify(
          r.id
        )})">
          刪除
        </button>
      </td>
    `;

    usageTableBody.appendChild(tr);
  });
}

/* ============================================================
 * 刪除紀錄
 * ============================================================ */

async function deleteUsage(id) {
  if (!id) return;

  if (!confirm("確定要刪除此使用紀錄？")) return;

  try {
    await api(`/usage/${id}`, {
      method: "DELETE",
      params: { delete_zero_summary: true },
    });

    toast("已刪除");
    loadUsageLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "刪除失敗", "error");
  }
}

window.deleteUsage = deleteUsage;

/* ============================================================
 * 🔵 使用記錄 / 更換記錄 TAB 切換控制 (v4.0)
 * ============================================================ */
document.querySelectorAll(".subtab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.logtab; // usage / replacement

    document
      .querySelectorAll(".subtab")
      .forEach((b) => b.classList.remove("subtab-active"));
    btn.classList.add("subtab-active");

    document.getElementById("logtab-usage")?.classList.add("hidden");
    document.getElementById("logtab-replacement")?.classList.add("hidden");

    if (target === "usage") {
      document.getElementById("logtab-usage")?.classList.remove("hidden");
    } else if (target === "replacement") {
      document.getElementById("logtab-replacement")?.classList.remove("hidden");
    }
  });
});

/* ============================================================
 * 🔵 使用記錄：新增表單顯示 / 隱藏
 * ============================================================ */
function toggleUsageAdd(show) {
  const form = document.getElementById("usageAddForm");
  if (!form) return;

  if (show) form.classList.remove("hidden");
  else form.classList.add("hidden");
}

window.toggleUsageAdd = toggleUsageAdd;

/* ============================================================
 * v4.x：初始化時序（等 customer ready 再載入）
 * ============================================================ */
onUserReady?.(() => {
  onCustomerReady?.(() => {
    loadUsageLogs();
  });
});
