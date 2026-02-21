/**
 * 更換記錄前端控制 (v4.x PATCHED, aligned with app-usage)
 * -----------------------------------------------------------
 * 對齊原則：
 * - customer 由 header/context 決定
 * - record_level：fixture / individual / batch（UI）→ fixture / serial（DB）
 * - individual / batch 僅影響 serial_number 展開
 * - replacement = event（不計數）
 */

const repFxInput      = document.getElementById("replaceAddFixture");
const repLevelSelect  = document.getElementById("replaceAddLevel");

const repSerialsInput = document.getElementById("replaceAddSerials");
const repBatchStart   = document.getElementById("replaceAddSerialStart");
const repBatchEnd     = document.getElementById("replaceAddSerialEnd");

const repOperatorInput= document.getElementById("replaceAddExecutor");
const repDateInput    = document.getElementById("replaceAddDate");
const repNoteInput    = document.getElementById("replaceAddNote");

const repTableBody    = document.getElementById("replaceTable");

let repPage = 1;
const repPageSize = 20;


function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().slice(0, 10);
}

// 🔵 預設：登入者 + 今天
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


function toggleReplacementSerialInputs() {
  const mode = repLevelSelect?.value;

  document
    .getElementById("replaceSerialSingleField")
    ?.classList.toggle("hidden", mode !== "individual");

  document
    .getElementById("replaceSerialBatchField")
    ?.classList.toggle("hidden", mode !== "batch");
}

repLevelSelect?.addEventListener("change", toggleReplacementSerialInputs);
toggleReplacementSerialInputs();



async function submitReplacementLog() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fixtureId = repFxInput?.value.trim();
  if (!fixtureId) {
    return toast("請輸入治具 ID", "warning");
  }

  const uiLevel = repLevelSelect?.value || "fixture";

  const payload = {
    fixture_id: fixtureId,

    // ⭐ DB 只吃 fixture / serial
    record_level: uiLevel,

    operator:
      (repOperatorInput?.value || "").trim() ||
      window.currentUserName ||
      window.currentUsername ||
      window.currentUser?.username ||
      "",

    // ⭐ 對齊 schema：occurred_at
    occurred_at: repDateInput?.value || new Date().toISOString().slice(0, 10),

    note: (repNoteInput?.value || "").trim() || null,
  };

  // -----------------------------
  // individual
  // -----------------------------
  if (uiLevel === "individual") {
    const serials = parseIndividualSerials(repSerialsInput?.value || "");
    if (!serials.length) {
      return toast("請輸入序號", "warning");
    }

    // 🔥 簡單前端驗證（避免空白或奇怪格式）
    if (serials.some(s => s.length < 2)) {
      return toast("序號格式異常", "warning");
    }

    payload.serial_number = serials.join(",");

  }

  // -----------------------------
  // batch
  // -----------------------------
  if (uiLevel === "batch") {
    const start = repBatchStart?.value || "";
    const end   = repBatchEnd?.value || "";

    try {
      expandBatchSerials(start, end); // 只驗證格式
    } catch (e) {
      return toast(e.message, "error");
    }
    if (start.length < 2 || end.length < 2) {
      return toast("批量序號格式異常", "warning");
    }

    // ⭐ event log：用描述字串即可
        payload.serial_start = start;
        payload.serial_end   = end;
  }

  // ⭐ 將 UI record_level 語意補進 note
  payload.note = withReplacementLevelNote(uiLevel, payload.note);

  try {
    await api("/replacement", {
      method: "POST",
      body: payload,
    });

    toast("更換記錄新增成功");
    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "新增更換記錄失敗", "error");
  }
}

window.submitReplacementLog = submitReplacementLog;



async function loadReplacementLogs(page = 1) {
  if (!window.currentCustomerId) return;

  repPage = page;

  const fixture  = document.getElementById("replaceSearchFixture")?.value.trim();
  const serial   = document.getElementById("replaceSearchSerial")?.value.trim();
  const executor = document.getElementById("replaceSearchExecutor")?.value.trim();
  const reason   = document.getElementById("replaceSearchReason")?.value.trim();

  const params = {
    skip: (repPage - 1) * repPageSize,
    limit: repPageSize,
  };

  if (fixture)  params.fixture_id = fixture;
  if (serial)   params.serial_number = serial;
  if (executor) params.executor = executor;
  if (reason)   params.reason = reason;

  const dateFrom = document.getElementById("replaceSearchFrom")?.value;
  const dateTo   = document.getElementById("replaceSearchTo")?.value;

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

    // ⭐ 分頁
    renderPagination(
      "replacementPagination",
      list.length < repPageSize
          ? (repPage - 1) * repPageSize + list.length
          : repPage * repPageSize + 1,
        repPage,
        repPageSize,
p => loadReplacementLogs(p)
    );

  } catch (err) {
    console.error(err);
    toast("查詢更換記錄失敗", "error");
  }
}

window.loadReplacementLogs = loadReplacementLogs;


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

    // 🔥 v6 相容：individual / batch / future array
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
      <td class="py-2 pr-4">${serialText}</td>
      <td class="py-2 pr-4">${r.note ?? "-"}</td>
      <td class="py-2 pr-4">${r.operator ?? r.executor ?? "-"}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-xs btn-error"
          onclick="deleteReplacement(${JSON.stringify(r.id)})">
          刪除
        </button>
      </td>
    `;

    repTableBody.appendChild(tr);
  });
}

async function deleteReplacement(id) {
  if (!id) return;
  if (!confirm("確定要刪除此更換記錄？")) return;

  try {
    await api(`/replacement/${id}`, { method: "DELETE" });
    toast("已刪除");
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err?.data?.detail || err?.message || "刪除失敗", "error");
  }
}

window.deleteReplacement = deleteReplacement;


onUserReady?.(() => {
  onCustomerReady?.(() => {
    initReplacementDefaults();
    loadReplacementLogs();
  });
});


// ============================================================
// Replacement - 將 record_level 語意補進 note（對齊 usage event 模型）
// ============================================================
function withReplacementLevelNote(recordLevel, note) {
  const base = (note || "").trim();

  if (recordLevel === "individual") {
    return base ? `[individual] ${base}` : "[individual]";
  }

  if (recordLevel === "batch") {
    return base ? `[batch] ${base}` : "[batch]";
  }

  return base || null;
}



// ============================================================
// Replacement - Import Excel (xlsx)
// ============================================================
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

    // 🔑 正確取得 token（與 api() / usage 完全一致）
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

    // ✅ 成功提示（格式完全對齊 usage）
    toast(
      `匯入完成：成功 ${result.success_count} 筆，失敗 ${result.error_count} 筆`,
      "success"
    );

    // ⚠️ 若有錯誤，印到 console 方便 debug
    if (Array.isArray(result.errors) && result.errors.length > 0) {
      console.warn("Replacement import errors:", result.errors);
    }

    // 🔁 重新載入列表
    loadReplacementLogs();
  } catch (err) {
    console.error(err);
    toast(err.message || "匯入更換記錄失敗", "error");
  } finally {
    // 重置 input，避免同檔案無法再次觸發 onchange
    input.value = "";
  }
};



// ============================================================
// Replacement - Download Import Template
// ============================================================
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
    toast("下載更換記錄範本失敗（請確認登入狀態）", "error");
  }
};


/* ============================================================
 * 🔵 更換記錄：新增表單顯示 / 隱藏（對齊 toggleUsageAdd）
 * ============================================================ */
function toggleReplaceAdd(show) {
  const form = document.getElementById("replaceAddForm");
  if (!form) return;

  if (show) {
    form.classList.remove("hidden");

    // 🔧 開啟時初始化預設值
    if (typeof initReplacementDefaults === "function") {
      initReplacementDefaults();
    }

    // 🔧 同步一次層級顯示
    if (typeof toggleReplacementSerialInputs === "function") {
      toggleReplacementSerialInputs();
    }
  } else {
    form.classList.add("hidden");
  }
}

window.toggleReplaceAdd = toggleReplaceAdd;


function renderReplacementLevelBadge(r) {
  if (r.record_level === "fixture") {
    return `<span class="badge badge-info">治具</span>`;
  }

  if (r.serial_start && r.serial_end) {
    return `<span class="badge badge-warning">批量</span>`;
  }

  return `<span class="badge badge-warning">序號</span>`;
}

/* ============================================================
 * Replacement - 快速日期區間（today / yesterday / 7days）
 * ============================================================ */
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
      from.setDate(from.getDate() - 6); // 含今天共 7 天
      break;

    default:
      return;
  }

  fromEl.value = from.toISOString().slice(0, 10);
  toEl.value   = to.toISOString().slice(0, 10);

  // 🔥 直接刷新列表
  loadReplacementLogs();
}

window.quickReplaceDateRange = quickReplaceDateRange;


