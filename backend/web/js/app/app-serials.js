/**
 * 序號管理工具前端控制 (v4.x PATCHED + v6 Align)
 * app-serials.js
 *
 * ✅ 離線工具：展開區間 / 正規化 / 偵測前綴 / 格式驗證 / 計算範圍總數
 * ✅ 線上功能：序號履歷 Drawer（對齊 transactions.py 的 /history）
 * ✅ 安全性：所有 innerHTML 動態內容都做 escapeHtml 防 XSS
 * ✅ UX：支援 ESC 關閉 Drawer
 *
 * ⚠️ v6 對齊重點：
 * - serial status：existence_status + usage_status（若後端仍回 status 也兼容）
 * - replacements：occurred_at / operator / note（兼容舊欄位）
 */

/* ============================================================
 * 初始化
 * ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // ESC 關閉 Drawer（若目前有 overlay closer）
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && typeof window.__activeOverlayCloser === "function") {
      window.__activeOverlayCloser();
    }
  });

  // 點遮罩關閉
  document.getElementById("serialDetailOverlay")?.addEventListener("click", (e) => {
    if (e.target?.id === "serialDetailOverlay") {
      closeSerialDetailDrawer();
    }
  });
});

/* ============================================================
 * DOM helpers
 * ============================================================ */
function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (s) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[s]));
}

function safeToast(msg, type) {
  if (typeof toast === "function") toast(msg, type);
  else alert(msg);
}

function getSerialListFromTextarea() {
  const raw = $("serialInput")?.value || "";
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function putSerialsToOutput(serials = []) {
  if ($("serialOutput")) $("serialOutput").value = serials.join("\n");
  if ($("serialCount")) $("serialCount").innerText = `總數：${serials.length}`;
}

/* ============================================================
 * Serial parsing / utils
 * ============================================================ */

/**
 * parseSerial("ABC0012") => { prefix:"ABC", num:12, width:4 }
 * parseSerial("12")      => { prefix:"",    num:12, width:2 }
 */
function parseSerial(s) {
  const m = String(s).trim().match(/^(\D*)(\d+)$/);
  if (!m) return null;
  const prefix = m[1] || "";
  const numStr = m[2];
  return { prefix, num: parseInt(numStr, 10), width: numStr.length };
}

function formatSerial(prefix, num, width) {
  return prefix + String(num).padStart(width, "0");
}

/** 回傳最常見 prefix（若完全無法判斷則回傳 ""） */
function detectCommonPrefix(serials) {
  const prefixes = serials
    .map(parseSerial)
    .filter(Boolean)
    .map((x) => x.prefix);

  if (!prefixes.length) return "";

  const freq = new Map();
  prefixes.forEach((p) => freq.set(p, (freq.get(p) || 0) + 1));

  let best = "";
  let bestN = 0;
  for (const [p, n] of freq.entries()) {
    if (n > bestN) {
      best = p;
      bestN = n;
    }
  }
  return best;
}

/**
 * normalizeSerials：
 * - 去空白
 * - 去重複
 * - 可解析(前綴+數字)者按 prefix -> num 排序
 * - 不可解析者放最後按字典序
 */
function normalizeSerials(serials) {
  const uniq = Array.from(new Set(serials.map((s) => String(s).trim()).filter(Boolean)));

  const parsed = [];
  const others = [];

  for (const s of uniq) {
    const p = parseSerial(s);
    if (p) parsed.push({ raw: s, ...p });
    else others.push(s);
  }

  parsed.sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix.localeCompare(b.prefix);
    return a.num - b.num;
  });

  others.sort((a, b) => a.localeCompare(b));

  return [...parsed.map((x) => x.raw), ...others];
}

/**
 * validateSerial：
 * - 允許：純數字 or (非數字前綴 + 數字)
 */
function validateSerial(s) {
  const str = String(s).trim();
  if (!str) return { ok: false, error: "空白序號" };
  if (!/^[\D]*\d+$/.test(str)) {
    return { ok: false, error: `不符合格式：${str}` };
  }
  return { ok: true };
}

/**
 * expandRange：
 * - start/end 必須同 prefix（或都無 prefix）
 * - 會使用 start/end 最大數字寬度補 0
 * - 最大展開數限制避免卡死（預設 50000）
 */
function expandRange(start, end, maxExpand = 50000) {
  const a = parseSerial(start);
  const b = parseSerial(end);
  if (!a || !b) throw new Error("起訖序號格式錯誤（需為 前綴+數字 或 純數字）");
  if (a.prefix !== b.prefix) throw new Error("起訖序號前綴不一致");

  const width = Math.max(a.width, b.width);
  const from = a.num;
  const to = b.num;
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) throw new Error("序號範圍無效");

  const total = to - from + 1;
  if (total > maxExpand) throw new Error(`範圍過大（${total}），請縮小範圍`);

  const out = [];
  for (let i = from; i <= to; i++) out.push(formatSerial(a.prefix, i, width));
  return { serials: out, total };
}

/* ============================================================
 * 1) 序號區間展開 expand
 * ============================================================ */
async function expandSerialRangeUI() {
  const start = $("rangeStart")?.value.trim() || "";
  const end = $("rangeEnd")?.value.trim() || "";

  if (!start || !end) return safeToast("請輸入起始與結束序號", "warning");

  try {
    const { serials } = expandRange(start, end);
    putSerialsToOutput(serials);
    safeToast("展開完成");
  } catch (error) {
    console.error(error);
    safeToast(error.message || "展開序號失敗", "error");
  }
}
window.expandSerialRangeUI = expandSerialRangeUI;

/* ============================================================
 * 2) 序號正規化 normalize（排序 / 去重複）
 * ============================================================ */
async function normalizeSerialListUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return safeToast("請輸入序號", "warning");

  try {
    const out = normalizeSerials(serials);
    putSerialsToOutput(out);
    safeToast("已排序 / 去重複");
  } catch (err) {
    console.error(err);
    safeToast("正規化失敗", "error");
  }
}
window.normalizeSerialListUI = normalizeSerialListUI;

/* ============================================================
 * 3) 偵測前綴 detect-prefix
 * ============================================================ */
async function detectPrefixUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return safeToast("請輸入序號", "warning");

  try {
    const prefix = detectCommonPrefix(serials);
    if ($("serialPrefix")) {
      $("serialPrefix").innerText = prefix ? `偵測到前綴：${prefix}` : "無前綴";
    }
  } catch (err) {
    console.error(err);
    safeToast("偵測前綴失敗", "error");
  }
}
window.detectPrefixUI = detectPrefixUI;

/* ============================================================
 * 4) 序號格式驗證 validate
 * ============================================================ */
async function validateSerialListUI() {
  const serials = getSerialListFromTextarea();
  if (serials.length === 0) return safeToast("請輸入序號", "warning");

  try {
    const bad = [];
    for (const s of serials) {
      const v = validateSerial(s);
      if (!v.ok) bad.push(v.error);
    }

    if (!bad.length) {
      safeToast("序號格式全部正確");
    } else {
      const preview = bad.slice(0, 5).join("；");
      safeToast(`格式錯誤：${preview}${bad.length > 5 ? "..." : ""}`, "error");
    }
  } catch (err) {
    console.error(err);
    safeToast("驗證失敗", "error");
  }
}
window.validateSerialListUI = validateSerialListUI;

/* ============================================================
 * 5) 計算範圍總數 range
 * ============================================================ */
async function calculateRangeUI() {
  const start = $("rangeStart")?.value.trim() || "";
  const end = $("rangeEnd")?.value.trim() || "";

  if (!start || !end) return safeToast("請輸入起始與結束序號", "warning");

  try {
    const { total } = expandRange(start, end, Number.MAX_SAFE_INTEGER);
    if ($("serialRangeCount")) $("serialRangeCount").innerText = `範圍總數：${total}`;
  } catch (err) {
    console.error(err);
    safeToast(err.message || "計算失敗", "error");
  }
}
window.calculateRangeUI = calculateRangeUI;

/* ============================================================
 * 6) 其他操作（清空 / 複製）
 * ============================================================ */
function clearSerialInput() {
  if ($("serialInput")) $("serialInput").value = "";
  if ($("serialOutput")) $("serialOutput").value = "";
  if ($("serialCount")) $("serialCount").innerText = "總數：0";
  if ($("serialPrefix")) $("serialPrefix").innerText = "";
  if ($("serialRangeCount")) $("serialRangeCount").innerText = "";
}
window.clearSerialInput = clearSerialInput;

async function copySerialOutput() {
  const text = $("serialOutput")?.value || "";
  if (!text) return safeToast("沒有可複製的內容", "warning");

  try {
    await navigator.clipboard.writeText(text);
    safeToast("已複製到剪貼簿");
  } catch (err) {
    console.error(err);
    try {
      $("serialOutput")?.select?.();
      document.execCommand("copy");
      safeToast("已複製到剪貼簿");
    } catch {
      safeToast("複製失敗", "error");
    }
  }
}
window.copySerialOutput = copySerialOutput;

/* ============================================================
 * 序號履歷 Drawer（對齊後端 /transactions/.../history）
 * ============================================================ */

async function apiGetSerialHistory(fixtureId, serial) {
  return api(
    `/transactions/fixtures/${encodeURIComponent(fixtureId)}/serials/${encodeURIComponent(serial)}/history`
  );
}

async function openSerialDetail(fixtureId, serial) {
  if (!fixtureId || !serial || serial === "-" || serial === "null") return;

  try {
    const data = await apiGetSerialHistory(fixtureId, serial);
    renderSerialDetailDrawer(data);
    openSerialDetailDrawer();
  } catch (e) {
    console.error(e);
    safeToast("載入序號履歷失敗", "error");
  }
}

function openSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay")?.classList.remove("hidden");
  document.getElementById("serialDetailDrawer")?.classList.remove("translate-x-full");
  window.__activeOverlayCloser = () => closeSerialDetailDrawer();
}

function closeSerialDetailDrawer() {
  document.getElementById("serialDetailOverlay")?.classList.add("hidden");
  document.getElementById("serialDetailDrawer")?.classList.add("translate-x-full");

  if (window.__activeOverlayCloser === closeSerialDetailDrawer) {
    window.__activeOverlayCloser = null;
  }
}

/**
 * v6 狀態顯示（兼容舊欄位 status）
 * - 若後端已有 existence_status / usage_status：以 v6 為主
 * - 否則 fallback 到 status
 */
function getSerialDisplayStatus(s) {
  if (!s) return "-";

  // v6: existence_status + usage_status
  if (s.existence_status || s.usage_status) {
    const ex = s.existence_status || "in_stock";
    const us = s.usage_status || "idle";

    if (ex !== "in_stock") return ex;     // returned / scrapped
    if (us !== "idle") return us;         // deployed / maintenance
    return "in_stock";
  }

  // v4: status
  return s.status || "-";
}

function fmtDateTime(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return escapeHtml(String(v));
    return d.toLocaleString();
  } catch {
    return escapeHtml(String(v));
  }
}

function renderSerialDetailDrawer(data) {
  const s = data?.serial || {};

  // Header
  $("serialDetailTitle").textContent = s.serial_number || "-";
  $("sdFixture").textContent = s.fixture_id || "-";
  $("sdStatus").textContent = getSerialDisplayStatus(s);
  $("sdSource").textContent = s.source_type || "-";
  $("sdTotalUses").textContent = s.total_uses ?? "-";

  // 收 / 退料記錄
  const txBody = $("sdTransactions");
  if (txBody) {
    txBody.innerHTML = "";
    (data?.transactions || []).forEach((r) => {
      const dt = fmtDateTime(r.transaction_date);
      const type = escapeHtml(r.transaction_type || "-");
      const orderNo = escapeHtml(r.order_no || "-");
      const op = escapeHtml(r.operator || "-");
      const note = escapeHtml(r.note || "-");

      txBody.innerHTML += `
        <tr>
          <td class="py-2 pr-4">${dt}</td>
          <td class="py-2 pr-4">${type}</td>
          <td class="py-2 pr-4">${orderNo}</td>
          <td class="py-2 pr-4">${op}</td>
          <td class="py-2 pr-4">${note}</td>
        </tr>
      `;
    });
  }

  // 使用紀錄
  const usageBody = $("sdUsages");
  if (usageBody) {
    usageBody.innerHTML = "";
    (data?.usages || []).forEach((u) => {
      const dt = fmtDateTime(u.used_at);
      const modelId = escapeHtml(u.model_id || "-");
      const stationId = escapeHtml(u.station_id || "-");
      const cnt = escapeHtml(u.use_count ?? "-");
      const op = escapeHtml(u.operator || "-");
      const note = escapeHtml(u.note || "-");

      usageBody.innerHTML += `
        <tr>
          <td class="py-2 pr-4">${dt}</td>
          <td class="py-2 pr-4">${modelId}</td>
          <td class="py-2 pr-4">${stationId}</td>
          <td class="py-2 pr-4">${cnt}</td>
          <td class="py-2 pr-4">${op}</td>
          <td class="py-2 pr-4">${note}</td>
        </tr>
      `;
    });
  }

  // 更換紀錄（v4.x Replacement Logs：occurred_at/operator/note）
  // 兼容舊欄位 created_at/usage_before/usage_after（如果以前有）
  const repBody = $("sdReplacements");
  if (repBody) {
    repBody.innerHTML = "";
    (data?.replacements || []).forEach((r) => {
      const dt = fmtDateTime(r.occurred_at || r.created_at);
      const op = escapeHtml(r.operator || "-");
      const note = escapeHtml(r.note || "-");

      // 舊系統才會有 usage_before/usage_after
      const before = r.usage_before !== undefined ? escapeHtml(r.usage_before) : null;
      const after = r.usage_after !== undefined ? escapeHtml(r.usage_after) : null;

      repBody.innerHTML += `
        <tr>
          <td class="py-2 pr-4">${dt}</td>
          <td class="py-2 pr-4">${op}</td>
          <td class="py-2 pr-4">
            ${
              before !== null || after !== null
                ? `<div class="text-xs text-gray-500">before: ${before ?? "-"} / after: ${after ?? "-"}</div>`
                : ""
            }
            ${note}
          </td>
        </tr>
      `;
    });
  }
}

/* ============================================================
 * Expose
 * ============================================================ */
window.openSerialDetail = openSerialDetail;
window.closeSerialDetailDrawer = closeSerialDetailDrawer;
