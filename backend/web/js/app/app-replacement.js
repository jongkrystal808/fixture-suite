/**
 * 更換記錄前端控制 (v6 COMPLETE FINAL)
 * -----------------------------------------------------------
 * 完全對齊 sp_fixture_replacement_master_v3
 *
 * 規則：
 * - serial → 必須 serial_number
 * - fixture → 必須 scrap_qty
 * - lifecycle_mode=fixture → 必須 datecode
 * - replacement = event（不影響 usage）
 */

const repFxInput       = document.getElementById("replaceAddFixture");
const repLevelSelect   = document.getElementById("replaceAddLevel");
const repSerialsInput  = document.getElementById("replaceAddSerials");
const repOperatorInput = document.getElementById("replaceAddExecutor");
const repDateInput     = document.getElementById("replaceAddDate");
const repNoteInput     = document.getElementById("replaceAddNote");
const repTableBody     = document.getElementById("replaceTable");
let currentLifecycleMode = null;
let repPage = 1;
const repPageSize = 20;

/* ============================================================ */

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

/* ============================================================ */
/* 預設登入者 + 今天 */
/* ============================================================ */

function initReplacementDefaults() {
  if (repOperatorInput && !repOperatorInput.value) {
    repOperatorInput.value =
      window.currentUserName ||
      window.currentUsername ||
      window.currentUser?.username ||
      "";
  }

  if (repDateInput && !repDateInput.value) {
    repDateInput.value = new Date().toISOString().slice(0, 10);
  }
}

/* ============================================================ */
/* 顯示控制 */
/* ============================================================ */

function toggleReplacementSerialInputs() {
  const level = repLevelSelect?.value;

  repFxInput?.addEventListener("blur", detectFixtureLifecycle);
  document
    .getElementById("replaceSerialSingleField")
    ?.classList.toggle("hidden", level !== "serial");

  document
    .getElementById("replaceScrapQtyField")
    ?.classList.toggle("hidden", level !== "fixture");

  document
    .getElementById("replaceDatecodeField")
    ?.classList.toggle("hidden", level !== "fixture");
}

repLevelSelect?.addEventListener("change", toggleReplacementSerialInputs);
document
  .getElementById("replaceAddEventType")
  ?.addEventListener("change", toggleReplacementSerialInputs);

toggleReplacementSerialInputs();

/* ============================================================ */
/* 新增更換記錄 */
/* ============================================================ */

async function submitReplacementLog() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fixtureId = repFxInput?.value.trim();
  if (!fixtureId) {
    return toast("請輸入治具 ID", "warning");
  }

  const recordLevel = repLevelSelect?.value || "fixture";
  const eventType   = document.getElementById("replaceAddEventType")?.value;

  if (!["serial", "fixture"].includes(recordLevel)) {
    return toast("record_level 錯誤", "warning");
  }

  if (!["scrap", "maintenance"].includes(eventType)) {
    return toast("event_type 錯誤", "warning");
  }

  const payload = {
    fixture_id: fixtureId,
    record_level: recordLevel,
    event_type: eventType,
    operator:
      (repOperatorInput?.value || "").trim() ||
      window.currentUser?.username ||
      "",
    note: (repNoteInput?.value || "").trim() || null,
  };

  /* -----------------------------
     SERIAL 模式
  ----------------------------- */
  if (recordLevel === "serial") {
    const sn = repSerialsInput?.value.trim();
    if (!sn) {
      return toast("請輸入序號", "warning");
    }
    payload.serial_number = sn;
  }

  /* -----------------------------
     FIXTURE 模式
  ----------------------------- */
  if (recordLevel === "fixture") {

    const qty = parseInt(
      document.getElementById("replaceAddScrapQty")?.value,
      10
    );

    if (!qty || qty <= 0) {
      return toast("請輸入正確數量", "warning");
    }

    payload.scrap_qty = qty;

    const datecode = document
      .getElementById("replaceAddDatecode")
      ?.value.trim();

    if (!datecode) {
      return toast("請輸入 datecode", "warning");
    }

    payload.datecode = datecode;
  }

  try {
    await api("/replacement", {
      method: "POST",
      body: payload,
    });

    toast("更換記錄新增成功");
    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (err) {
    toast(err?.data?.detail || "新增失敗", "error");
  }
}

window.submitReplacementLog = submitReplacementLog;

/* ============================================================ */
/* 查詢列表 + 分頁 */
/* ============================================================ */

async function loadReplacementLogs(page = 1) {
  if (!window.currentCustomerId) return;

  repPage = page;

  const fixture  = document.getElementById("replaceSearchFixture")?.value.trim();
  const serial   = document.getElementById("replaceSearchSerial")?.value.trim();
  const executor = document.getElementById("replaceSearchExecutor")?.value.trim();

  const params = {
    skip: (repPage - 1) * repPageSize,
    limit: repPageSize,
  };

  if (fixture)  params.fixture_id = fixture;
  if (serial)   params.serial_number = serial;
  if (executor) params.operator = executor;

  const dateFrom = document.getElementById("replaceSearchFrom")?.value;
  const dateTo   = document.getElementById("replaceSearchTo")?.value;
  const type     = document.getElementById("replaceSearchEventType")?.value;

  if (type) params.event_type = type;

  if (dateFrom) {
    params.date_from = new Date(dateFrom).toISOString();
  }

  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    params.date_to = end.toISOString();
  }

  try {
    const rows = await api("/replacement", { params });
    const list = Array.isArray(rows) ? rows : [];

    renderReplacementTable(list);

    // ⭐ 分頁（沿用你系統 renderPagination）
    renderPagination(
      "replacementPagination",
      list.length < repPageSize
        ? (repPage - 1) * repPageSize + list.length
        : repPage * repPageSize + 1,
      repPage,
      repPageSize,
      (p) => loadReplacementLogs(p)
    );

  } catch (err) {
    console.error(err);
    toast("查詢更換記錄失敗", "error");
  }
}

window.loadReplacementLogs = loadReplacementLogs;

/* ============================================================ */
/* Badge */
/* ============================================================ */

function renderReplacementLevelBadge(r) {
  if (r.record_level === "fixture") {
    return `<span class="badge badge-info">治具</span>`;
  }
  return `<span class="badge badge-warning">序號</span>`;
}

/* ============================================================ */
/* 表格渲染 */
/* ============================================================ */

function renderReplacementTable(rows) {
  if (!repTableBody) return;

  repTableBody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    repTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-gray-400 py-3">沒有資料</td>
      </tr>
    `;
    return;
  }

  rows.forEach((r) => {
    const tr = document.createElement("tr");

    // v6 相容
    let serialText = "-";
    if (r.serial_number) {
      serialText = r.serial_number;
    } else if (r.serial_start && r.serial_end) {
      serialText = `${r.serial_start} ~ ${r.serial_end}`;
    } else if (Array.isArray(r.serials)) {
      serialText = r.serials.join(", ");
    }

    tr.innerHTML = `
      <td class="py-2 pr-4">${fmtDate(r.occurred_at)}</td>
      <td class="py-2 pr-4">${r.fixture_id ?? "-"}</td>
      <td class="py-2 pr-4">${renderReplacementLevelBadge(r)}</td>
      <td class="py-2 pr-4">${r.scrap_qty ?? "-"}</td>
      <td class="py-2 pr-4">${serialText}</td>
      <td class="py-2 pr-4">${r.note ?? "-"}</td>
      <td class="py-2 pr-4">${r.operator ?? r.executor ?? "-"}</td>
    `;

    repTableBody.appendChild(tr);
  });
}

/* ============================================================ */
/* 快速日期區間（today / yesterday / 7days） */
/* ============================================================ */

function quickReplaceDateRange(type) {
  const fromEl = document.getElementById("replaceSearchFrom");
  const toEl   = document.getElementById("replaceSearchTo");
  if (!fromEl || !toEl) return;

  const today = new Date();
  let from, to;

  switch (type) {
    case "today":
      from = new Date(today);
      to   = new Date(today);
      break;

    case "yesterday":
      from = new Date(today);
      from.setDate(from.getDate() - 1);
      to = new Date(from);
      break;

    case "7days":
      to = new Date(today);
      from = new Date(today);
      from.setDate(from.getDate() - 6);
      break;

    default:
      return;
  }

  fromEl.value = from.toISOString().slice(0, 10);
  toEl.value   = to.toISOString().slice(0, 10);

  loadReplacementLogs();
}

window.quickReplaceDateRange = quickReplaceDateRange;


/* ============================================================ */
/* 初始化（對齊 usage 模組） */
/* ============================================================ */

onUserReady?.(() => {
  onCustomerReady?.(() => {
    initReplacementDefaults();
    loadReplacementLogs();
  });
});

/* ============================================================ */
/* Replacement - Import Excel (xlsx) */
/* ============================================================ */

window.handleReplacementImport = async function (input) {
  try {
    if (!input || !input.files || input.files.length === 0) {
      return;
    }

    if (!window.currentCustomerId) {
      toast("請先選擇客戶", "warning");
      input.value = "";
      return;
    }

    const file = input.files[0];
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast("請選擇 xlsx 檔案", "warning");
      input.value = "";
      return;
    }

    let token = null;
    if (window.TokenManager?.getToken) {
      token = window.TokenManager.getToken();
    } else if (typeof window.getToken === "function") {
      token = window.getToken();
    }

    if (!token) {
      toast("尚未登入（無法取得 Token）", "error");
      input.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/v2/replacement/import", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Customer-Id": window.currentCustomerId,
      },
      body: formData,
    });

    if (!res.ok) {
      let msg = `匯入失敗 (${res.status})`;
      try {
        const data = await res.json();
        if (data?.detail) msg = data.detail;
      } catch (_) {}
      throw new Error(msg);
    }

    const result = await res.json();

    toast(
      `匯入完成：成功 ${result.success_count} 筆，失敗 ${result.error_count} 筆`,
      "success"
    );

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      console.warn("Replacement import errors:", result.errors);
    }

    loadReplacementLogs();

  } catch (err) {
    console.error(err);
    toast(err.message || "匯入更換記錄失敗", "error");
  } finally {
    input.value = "";
  }
};

/* ============================================================ */
/* Replacement - Download Template */
/* ============================================================ */

window.downloadReplaceTemplate = async function () {
  try {
    if (!window.currentCustomerId) {
      toast("請先選擇客戶", "warning");
      return;
    }

    let token = null;
    if (window.TokenManager?.getToken) {
      token = window.TokenManager.getToken();
    } else if (typeof window.getToken === "function") {
      token = window.getToken();
    }

    if (!token) {
      toast("尚未登入（無法取得 Token）", "error");
      return;
    }

    const res = await fetch("/api/v2/replacement/template", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "X-Customer-Id": window.currentCustomerId,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const blob = await res.blob();

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "replacement_import_template.xlsx";
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

  } catch (err) {
    console.error(err);
    toast("下載更換記錄範本失敗", "error");
  }
};

/* ============================================================ */
/* 新增表單顯示 / 隱藏 */
/* ============================================================ */

function toggleReplaceAdd(show) {
  const form = document.getElementById("replaceAddForm");
  if (!form) return;

  if (show) {
    form.classList.remove("hidden");
    initReplacementDefaults();
    toggleReplacementSerialInputs();
  } else {
    form.classList.add("hidden");
  }
}

window.toggleReplaceAdd = toggleReplaceAdd;

async function detectFixtureLifecycle() {
  const fixtureId = repFxInput?.value.trim();
  if (!fixtureId || !window.currentCustomerId) return;

  try {
    const data = await api("/replacement/fixture-info", {
      params: { fixture_id: fixtureId }
    });

    currentLifecycleMode = data.lifecycle_mode;

    applyLifecycleUI();

  } catch (err) {
    currentLifecycleMode = null;
  }
}
function applyLifecycleUI() {
  const level = repLevelSelect?.value;

  const isSerialMode = currentLifecycleMode === "serial";
  const isFixtureMode = currentLifecycleMode === "fixture";

  // Serial lifecycle
  if (isSerialMode) {
    document.getElementById("replaceSerialSingleField")
      ?.classList.remove("hidden");

    document.getElementById("replaceDatecodeField")
      ?.classList.add("hidden");

    document.getElementById("replaceScrapQtyField")
      ?.classList.add("hidden");

    repLevelSelect.value = "serial";
    repLevelSelect.disabled = true;
    return;
  }

  // Fixture lifecycle (datecode)
  if (isFixtureMode) {
    document.getElementById("replaceSerialSingleField")
      ?.classList.add("hidden");

    document.getElementById("replaceDatecodeField")
      ?.classList.remove("hidden");

    document.getElementById("replaceScrapQtyField")
      ?.classList.remove("hidden");

    repLevelSelect.value = "fixture";
    repLevelSelect.disabled = true;
    return;
  }

  // Unknown
  repLevelSelect.disabled = false;
}
