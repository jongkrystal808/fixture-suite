    /**
 * app-logs.js
 * 使用記錄 / 更換記錄 的前端控制程式
 *
 * 包含：
 *  - 子分頁切換
 *  - 使用記錄 CRUD + 匯入
 *  - 更換記錄 CRUD + 匯入
 */

/* ============================================================
 * 🔵 子分頁切換（使用記錄 / 更換記錄）
 * ============================================================ */

document.querySelectorAll("[data-logtab]").forEach(btn => {
  btn.addEventListener("click", () => {
    // 移除所有 active
    document.querySelectorAll("[data-logtab]").forEach(b => b.classList.remove("subtab-active"));
    btn.classList.add("subtab-active");

    const tab = btn.dataset.logtab;
    document.querySelectorAll("#logtab-usage, #logtab-replacement").forEach(sec => sec.classList.add("hidden"));
    document.querySelector(`#logtab-${tab}`).classList.remove("hidden");
  });
});

/* ============================================================
 * 🔵 使用記錄功能
 * ============================================================ */

/** 展開 / 收合 新增使用記錄表單 */
function toggleUsageAdd(show) {
  document.getElementById("usageAddForm").classList.toggle("hidden", !show);
}

/** 下載使用記錄 Excel 範本 */
function downloadUsageTemplate() {
  const headers = [
    ["fixture_id", "station_id", "use_count", "abnormal_status", "operator", "note", "used_at"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "usage_template");
  XLSX.writeFile(wb, "usage_template.xlsx");
}

/** 匯入使用記錄 Excel */
async function handleUsageImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportUsageLogsXlsx(input.files[0]);

    toast(result.message);
    console.log("匯入結果：", result);

    loadUsageLogs();
  } catch (e) {
    toast("匯入失敗");
    console.error(e);
  }

  input.value = "";
}

/** 載入使用記錄 */
async function loadUsageLogs() {
  const fixture = document.getElementById("usageSearchFixture").value.trim();
  const station = document.getElementById("usageSearchStation").value.trim();
  const op = document.getElementById("usageSearchOperator").value.trim();
  const from = document.getElementById("usageSearchFrom").value;
  const to = document.getElementById("usageSearchTo").value;

  const params = {};
  if (fixture) params.fixture_id = fixture;
  if (station) params.station_id = Number(station);
  if (op) params.operator = op;
  if (from) params.date_from = from;
  if (to) params.date_to = to;

  const data = await apiListUsageLogs(params);

  const tbody = document.getElementById("usageTable");
  tbody.innerHTML = "";

  data.logs.forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${log.used_at || ""}</td>
      <td class="py-2 pr-4">${log.fixture_id}</td>
      <td class="py-2 pr-4">${log.station_code || log.station_id || ""}</td>
      <td class="py-2 pr-4">${log.use_count}</td>
      <td class="py-2 pr-4">${log.abnormal_status || ""}</td>
      <td class="py-2 pr-4">${log.operator || ""}</td>
      <td class="py-2 pr-4">${log.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteUsageLog(${log.log_id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/** 新增使用記錄（含批量） */
async function submitUsageLog() {
  const fixture = document.getElementById("usageAddFixture").value.trim();
  const station = document.getElementById("usageAddStation").value;
  const count = document.getElementById("usageAddCount").value || 1;
  const abnormal = document.getElementById("usageAddAbnormal").value.trim();
  const op = document.getElementById("usageAddOperator").value.trim();
  const usedAt = document.getElementById("usageAddTime").value;
  const note = document.getElementById("usageAddNote").value.trim();
  const batch = document.getElementById("usageAddBatch").value;

  if (!fixture) return toast("治具不得為空");

  const payload = {
    fixture_id: fixture,
    station_id: station ? Number(station) : null,
    use_count: Number(count),
    abnormal_status: abnormal || null,
    operator: op || null,
    note: note || null,
    used_at: usedAt || null
  };

  try {
    if (batch) {
      payload.record_count = Number(batch);
      await apiBatchUsageLogs(payload);
      toast("批量新增成功");
    } else {
      await apiCreateUsageLog(payload);
      toast("新增成功");
    }

    toggleUsageAdd(false);
    loadUsageLogs();
  } catch (e) {
    console.error(e);
    toast("新增失敗");
  }
}

/** 刪除使用記錄 */
async function deleteUsageLog(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteUsageLog(id);
    toast("刪除成功");
    loadUsageLogs();
  } catch (e) {
    toast("刪除失敗");
  }
}

/* ============================================================
 * 🟠 更換記錄功能
 * ============================================================ */

function toggleReplaceAdd(show) {
  document.getElementById("replaceAddForm").classList.toggle("hidden", !show);
}

/** 下載更換記錄 Excel 範本 */
function downloadReplaceTemplate() {
  const headers = [
    ["fixture_id", "replacement_date", "reason", "executor", "note"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(headers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "replacement_template");
  XLSX.writeFile(wb, "replacement_template.xlsx");
}

/** 匯入更換記錄 Excel */
async function handleReplaceImport(input) {
  if (!input.files.length) return;

  try {
    toast("正在匯入...");
    const result = await apiImportReplacementLogsXlsx(input.files[0]);

    toast(result.message);
    console.log("匯入結果：", result);

    loadReplacementLogs();
  } catch (e) {
    toast("匯入失敗");
    console.error(e);
  }

  input.value = "";
}

/** 載入更換記錄 */
async function loadReplacementLogs() {
  const fixture = document.getElementById("replaceSearchFixture").value.trim();
  const exec = document.getElementById("replaceSearchExec").value.trim();
  const from = document.getElementById("replaceSearchFrom").value;
  const to = document.getElementById("replaceSearchTo").value;

  const params = {};
  if (fixture) params.fixture_id = fixture;
  if (exec) params.executor = exec;
  if (from) params.date_from = from;
  if (to) params.date_to = to;

  const data = await apiListReplacementLogs(params);

  const tbody = document.getElementById("replaceTable");
  tbody.innerHTML = "";

  data.logs.forEach(log => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 pr-4">${log.replacement_date}</td>
      <td class="py-2 pr-4">${log.fixture_id}</td>
      <td class="py-2 pr-4">${log.reason || ""}</td>
      <td class="py-2 pr-4">${log.executor || ""}</td>
      <td class="py-2 pr-4">${log.note || ""}</td>
      <td class="py-2 pr-4">
        <button class="btn btn-ghost text-xs text-red-600"
                onclick="deleteReplacementLog(${log.replacement_id})">刪除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/** 新增更換記錄（含批量） */
async function submitReplacementLog() {
  const fixture = document.getElementById("replaceAddFixture").value.trim();
  const date = document.getElementById("replaceAddDate").value;
  const reason = document.getElementById("replaceAddReason").value.trim();
  const exec = document.getElementById("replaceAddExecutor").value.trim();
  const note = document.getElementById("replaceAddNote").value.trim();
  const batch = document.getElementById("replaceAddBatch").value;

  if (!fixture || !date) return toast("治具與日期不得為空");

  const payload = {
    fixture_id: fixture,
    replacement_date: date,
    reason: reason || null,
    executor: exec || null,
    note: note || null
  };

  try {
    if (batch) {
      payload.record_count = Number(batch);
      await apiBatchReplacementLogs(payload);
      toast("批量新增成功");
    } else {
      await apiCreateReplacementLog(payload);
      toast("新增成功");
    }

    toggleReplaceAdd(false);
    loadReplacementLogs();
  } catch (e) {
    toast("新增失敗");
    console.error(e);
  }
}

/** 刪除更換記錄 */
async function deleteReplacementLog(id) {
  if (!confirm("確認刪除？")) return;

  try {
    await apiDeleteReplacementLog(id);
    toast("刪除成功");
    loadReplacementLogs();
  } catch (e) {
    toast("刪除失敗");
  }
}
