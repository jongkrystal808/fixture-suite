/* ============================================================
 * STAGE MODE (後台三段式 UI 專用)
 * Stage① 機種清單
 * Stage② 機種 ↔ 站點
 * Stage③ 治具需求
 * ============================================================ */

// ===== Modal 狀態 =====
let meCurrentModelId = null;
let meCurrentStationId = null;

// ===== Drawer 專用狀態（與 Stage 完全隔離）=====
let drawerSelectedModel = null;

let stage3FixtureSearchTimer = null;

/* ============================================================
 * 機種清單
 * ============================================================ */

async function mmLoadModelList() {
  if (!window.currentCustomerId) return;

  const search = document.getElementById("mmSearch")?.value.trim() || "";

  const params = {};
  if (search) params.search = search;

  try {
    const list = await apiListMachineModels(params);
    renderMachineModelTable(list);
  } catch (err) {
    console.error(err);
    toast("載入機種清單失敗", "error");
  }
}

function renderMachineModelTable(list) {
  const tbody = document.getElementById("mmTable");
  const count = document.getElementById("mmCount");
  if (!tbody) return;

  tbody.innerHTML = "";
  count && (count.textContent = list?.length || 0);

  if (!list?.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="py-4 text-center text-gray-400">
          無資料
        </td>
      </tr>`;
    return;
  }

  list.forEach(m => {
    tbody.insertAdjacentHTML("beforeend", `
      <tr class="hover:bg-gray-50 transition">
        <td class="py-2 pr-4 text-center text-600 font-bold">${m.id}</td>
        <td class="py-2 pr-4 max-w-[200px] truncate text-center">${m.model_name || "-"}</td>
        <td class="py-2 pr-4 max-w-[200px] truncate text-center">${m.note || "-"}</td>
        <td class="py-1 px-3 whitespace-nowrap w-32 align-middle">
          <div class="flex justify-center gap-2">
            <button class="btn btn-xs btn-outline" onclick="openModelEditModal('${m.id}')">
              編輯
            </button>
            <button class="btn btn-error btn-xs" onclick="stageDeleteModel('${m.id}')">
              刪除
            </button>
          </div>
        </td>
      </tr>
    `);
  });
}

async function stageDeleteModel(modelId) {
  if (!modelId) return;

  const ok = confirm(
    `⚠️ 確定要刪除機種「${modelId}」？\n\n` +
    `此操作會：\n` +
    `• 刪除該機種\n` +
    `• 解除所有站點綁定\n` +
    `• 刪除所有治具需求\n\n` +
    `⚠️ 此操作無法復原`
  );

  if (!ok) return;

  try {
    await apiDeleteMachineModel(modelId);

    toast(`機種 ${modelId} 已刪除`);

    // 🔄 只需要刷新機種清單
    await mmLoadModelList();

  } catch (err) {
    console.error(err);
    toast(err.message || "刪除失敗", "error");
  }
}

/* ============================================================
 * 機種編輯 Modal
 * ============================================================ */

async function openModelEditModal(modelId) {
  meCurrentModelId = modelId;
  meCurrentStationId = null;

  const modal = document.getElementById("modelEditModal");
  modal?.classList.remove("hidden");

  document.getElementById("meModelId").textContent = `（${modelId}）`;
  document.getElementById("meSelectedStationLabel").textContent = "";

  await meReloadStations();
}

function closeModelEditModal() {
  meCurrentModelId = null;
  meCurrentStationId = null;

  document.getElementById("modelEditModal")
    ?.classList.add("hidden");
}

/* ============================================================
 * Modal：站點綁定
 * ============================================================ */

async function meReloadStations() {
  if (!meCurrentModelId) return;
  if (!window.currentCustomerId) return;

  const detail = await apiGetModelDetail(meCurrentModelId);
  const bound = detail.stations || [];

  const allStations = await apiListStations();
  const boundIds = new Set(bound.map(s => s.station_id));
  const available = allStations.filter(s => !boundIds.has(s.id));

  renderMeStations(bound, available);
}

function renderMeStations(bound, available) {
  const box = document.getElementById("meStationPanel");
  if (!box) return;

  const boundHtml = (bound || []).length
    ? (bound || []).map(s => `
        <div class="flex items-center justify-between px-2 py-1 border rounded-lg text-sm">
          <span class="font-mono">${s.station_id}</span>

          <div class="flex gap-1">
            <button class="btn btn-xs btn-outline"
                    onclick="meSelectStation('${s.station_id}', '${s.station_name || ""}')">
              治具
            </button>
            <button class="btn btn-xs btn-error"
                    onclick="meUnbindStation('${s.station_id}')">
              解綁
            </button>
          </div>
        </div>
      `).join("")
    : `<div class="text-xs text-gray-400">尚未綁定</div>`;

  const availHtml = (available || []).length
    ? (available || []).map(s => `
        <div class="flex items-center justify-between px-2 py-1 border rounded-lg text-sm">
          <span class="font-mono">${s.id}</span>

          <button class="btn btn-xs btn-primary"
                  onclick="meBindStation('${s.id}')">
            綁定
          </button>
        </div>
      `).join("")
    : `<div class="text-xs text-gray-400">無可綁定</div>`;

  box.innerHTML = `
    <div class="grid grid-cols-2 gap-6">

      <!-- 已綁定站點 -->
      <div>
        <div class="text-sm font-semibold mb-2">已綁定站點</div>
        <div class="space-y-1">
          ${boundHtml}
        </div>
      </div>

      <!-- 可綁定站點 -->
      <div>
        <div class="text-sm font-semibold mb-2">可綁定站點</div>
        <div class="space-y-1">
          ${availHtml}
        </div>
      </div>

    </div>
  `;
}

/* ============================================================
 * Station 綁定 / 解綁（v4.x）
 * ============================================================ */

async function meBindStation(stationId) {
  if (!window.currentCustomerId) return;

  await apiBindStation({
    model_id: meCurrentModelId,
    station_id: stationId,
  });

  toast("站點已綁定");

  const detail = await apiGetModelDetail(meCurrentModelId);
  const bound = detail.stations || [];

  const allStations = await apiListStations();
  const boundIds = new Set(bound.map(s => s.station_id));
  const available = allStations.filter(s => !boundIds.has(s.id));

  renderMeStations(bound, available);

  meSelectStation(stationId, "");
}

async function meUnbindStation(stationId) {
  const detail = await apiGetModelDetail(meCurrentModelId);
  const count = (detail.requirements || [])
    .filter(r => r.station_id === stationId).length;

  if (!confirm(`此站點目前有 ${count} 筆治具需求，確定要解綁並刪除？`)) {
    return;
  }

  await apiUnbindStation({
    model_id: meCurrentModelId,
    station_id: stationId,
  });

  toast("站點已解綁");

  if (meCurrentStationId === stationId) {
    meCurrentStationId = null;
    const panel = document.getElementById("meFixturePanel");
    if (panel) panel.innerHTML = `<div class="text-xs text-gray-400">請選擇站點</div>`;
  }

  await meReloadStations();
}

/* ============================================================
 * Modal：選擇站點 → 治具需求
 * ============================================================ */

async function meSelectStation(stationId, stationName) {
  meCurrentStationId = stationId;

  document.getElementById("meSelectedStationLabel").textContent =
    `${stationId} ${stationName || ""}`;

  await meReloadFixtures();
}

async function meReloadFixtures() {
  const panel = document.getElementById("meFixturePanel");
  if (!panel) return;

  if (!meCurrentModelId || !meCurrentStationId) {
    panel.innerHTML = `<div class="text-xs text-gray-400">請選擇站點</div>`;
    return;
  }

  const detail = await apiGetModelDetail(meCurrentModelId);

  const requirements = (detail.requirements || [])
    .filter(r => r.station_id === meCurrentStationId);

  renderMeFixturePanel(requirements);
}

/* ============================================================
 * 治具需求 Panel
 * ============================================================ */

function renderMeFixturePanel(requirements) {
  const panel = document.getElementById("meFixturePanel");
  if (!panel) return;

  panel.innerHTML = `
    <!-- 新增治具需求 -->
    <div class="mb-3 relative">
      <label class="label-xs">新增治具（輸入治具編號）</label>
      <input
        id="meFixtureInput"
        class="input"
        placeholder="例如 C-0008"
        autocomplete="off"
        oninput="meSearchFixture(this.value)"
      />
      <div
        id="meFixtureSuggest"
        class="absolute left-0 right-0 top-full z-50
               bg-white border rounded-xl shadow
               mt-1 hidden max-h-60 overflow-auto text-sm">
      </div>
    </div>

    <div class="flex gap-2 mb-4">
      <input id="meFixtureQty" type="number" min="1"
             class="input w-24" value="1" />
      <button class="btn btn-primary"
              onclick="meAddRequirement()">
        新增
      </button>
    </div>

    <!-- 已綁治具 -->
    <div class="overflow-auto border rounded-xl max-h-[70vh]">
      <table class="min-w-full text-xs">
        <thead class="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th class="py-1 px-2 text-center">治具</th>
            <th class="py-1 px-2 text-center">需求</th>
            <th class="py-1 px-2 text-center">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          ${
            (requirements || []).length
              ? (requirements || []).map(r => `
                  <tr>
                    <td class="py-1 px-3 text-center">${r.fixture_id}</td>
                    <td class="py-1 px-3 text-center">${r.required_qty}</td>
                    <td class="py-1 px-3 text-center">
                      <div class="flex justify-center gap-2">
                        <button class="btn btn-xs btn-outline"
                          onclick="meEditRequirement(${r.id}, ${r.required_qty})">
                          編輯
                        </button>
                        <button class="btn btn-xs btn-error"
                          onclick="meDeleteRequirement(${r.id})">
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")
              : `<tr>
                   <td colspan="3"
                       class="text-center text-gray-400 py-4">
                     尚未設定治具需求
                   </td>
                 </tr>`
          }
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
 * 治具搜尋（v4.x）
 * ============================================================ */

let meSelectedFixtureId = null;
let meFixtureSearchTimer = null;

async function meSearchFixture(keyword) {
  const box = document.getElementById("meFixtureSuggest");
  meSelectedFixtureId = null;

  clearTimeout(meFixtureSearchTimer);

  if (!keyword || keyword.length < 2) {
    box?.classList.add("hidden");
    return;
  }

  meFixtureSearchTimer = setTimeout(async () => {
    try {
      if (!window.currentCustomerId) return;

      const resp = await apiSearchFixtures({
        q: keyword,
        limit: 20,
      });

      const results = Array.isArray(resp) ? resp : [];

      const detail = await apiGetModelDetail(meCurrentModelId);
      const boundIds = new Set(
        (detail.requirements || [])
          .filter(r => r.station_id === meCurrentStationId)
          .map(r => r.fixture_id)
      );

      const filtered = results.filter(f => {
        const fid = f.fixture_id ?? f.id;
        return fid && !boundIds.has(fid);
      });

      box.innerHTML = filtered.length
        ? filtered.map(f => {
            const fid = f.fixture_id ?? f.id;
            return `
              <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                   onclick="meSelectFixture('${fid}')">
                ${fid}
              </div>
            `;
          }).join("")
        : `<div class="px-3 py-2 text-gray-400">無符合治具</div>`;

      box.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      box?.classList.add("hidden");
    }
  }, 300);
}

function meSelectFixture(fixtureId) {
  meSelectedFixtureId = fixtureId;
  document.getElementById("meFixtureInput").value = fixtureId;
  document.getElementById("meFixtureSuggest").classList.add("hidden");
}

async function meAddRequirement() {
  if (!window.currentCustomerId) return;

  const qty = Number(document.getElementById("meFixtureQty").value);

  if (!meSelectedFixtureId || qty <= 0) {
    return toast("請選擇治具並輸入數量", "warning");
  }

  await apiAddRequirement({
    model_id: meCurrentModelId,
    station_id: meCurrentStationId,
    fixture_id: meSelectedFixtureId,
    required_qty: qty,
  });

  toast("新增成功");
  meSelectedFixtureId = null;
  document.getElementById("meFixtureInput").value = "";

  await meReloadFixtures();
}

async function meEditRequirement(reqId, qty) {
  const newQty = Number(prompt("輸入新需求數量", qty));
  if (!newQty || newQty <= 0) return;

  await apiUpdateRequirement(reqId, { required_qty: newQty });
  toast("已更新");
  await meReloadFixtures();
}

async function meDeleteRequirement(reqId) {
  if (!confirm("確定刪除這筆治具需求？")) return;

  await apiDeleteRequirement(reqId);
  toast("已刪除");
  await meReloadFixtures();
}

/* ============================================================
 * 機種新增 / 編輯 Modal（最小可用版）
 * ============================================================ */

function mmOpenModelModal(mode, modelId = null) {
  const modal = document.getElementById("mmModelModal");
  const title = document.getElementById("mmModelModalTitle");
  const form = document.getElementById("mmModelForm");

  if (!modal || !form) {
    console.error("mmModelModal or mmModelForm not found");
    return;
  }

  form.reset();
  form.dataset.mode = mode;
  form.dataset.id = modelId || "";

  if (mode === "create") {
    title.textContent = "新增機種";
    document.getElementById("mmModelId").disabled = false;
  } else {
    title.textContent = "編輯機種";
    document.getElementById("mmModelId").disabled = true;
  }

  modal.classList.remove("hidden");
}
window.mmOpenModelModal = mmOpenModelModal;

function mmCloseModelModal() {
  const modal = document.getElementById("mmModelModal");
  if (!modal) return;

  modal.classList.add("hidden");

  const form = document.getElementById("mmModelForm");
  form?.reset();

  if (form) {
    delete form.dataset.mode;
    delete form.dataset.id;
  }
}
window.mmCloseModelModal = mmCloseModelModal;

async function submitModelForm() {
  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const form = document.getElementById("mmModelForm");
  if (!form) return;

  const mode = form.dataset.mode;
  const modelId = document.getElementById("mmModelId").value.trim();
  const modelName = document.getElementById("mmModelName").value.trim();
  const note = document.getElementById("mmModelNote")?.value || "";

  if (!modelId || !modelName) {
    return toast("請填寫機種代碼與名稱", "warning");
  }

  const payload = {
    id: modelId,
    model_name: modelName,
    note,
  };

  try {
    if (mode === "create") {
      await apiCreateMachineModel(payload);
      toast("機種新增成功");
    } else {
      await apiUpdateMachineModel(modelId, payload);
      toast("機種更新成功");
    }

    document.getElementById("mmModelModal")?.classList.add("hidden");
    await mmLoadModelList();

  } catch (err) {
    console.error(err);
    toast(err.message || "儲存失敗", "error");
  }
}
window.submitModelForm = submitModelForm;

let stage3SelectedFixtureId = null;

async function stage3SearchFixture(keyword) {
  const box = document.getElementById("frFixtureSuggest");
  stage3SelectedFixtureId = null;

  if (!keyword || keyword.length < 2) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  clearTimeout(stage3FixtureSearchTimer);
  stage3FixtureSearchTimer = setTimeout(async () => {
    try {
      if (!window.currentCustomerId) return;

      const res = await apiListFixtures({
        search: keyword,
        limit: 20,
      });

      const list = res?.fixtures || [];

      if (!list.length) {
        box.innerHTML = `
          <div class="px-3 py-2 text-xs text-gray-400">
            查無符合治具
          </div>`;
        box.classList.remove("hidden");
        return;
      }

      box.innerHTML = list.map(f => {
        const fid = f.fixture_id ?? f.id ?? "";
        const fname = f.fixture_name ?? "";
        return `
          <div
            class="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100"
            onclick="stage3SelectFixture('${fid}', '${fname}')"
          >
            <span class="font-mono">${fid}</span>
            <span class="text-gray-500"> - ${fname || "-"}</span>
          </div>
        `;
      }).join("");

      box.classList.remove("hidden");
    } catch (err) {
      console.error(err);
      box.classList.add("hidden");
    }
  }, 300);
}

function stage3SelectFixture(fixtureId, fixtureName) {
  stage3SelectedFixtureId = fixtureId;

  document.getElementById("frFixtureInput").value =
    `${fixtureId} - ${fixtureName}`;

  const box = document.getElementById("frFixtureSuggest");
  box.innerHTML = "";
  box.classList.add("hidden");
}

/* 保留一份即可 */
function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ============================================================
 * Models 匯出 / 範本下載 / 匯入（v4.x）
 * ============================================================ */

async function mmExportModelsXlsx() {
  const token = localStorage.getItem("auth_token");

  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    const res = await fetch(apiURL("/models/export"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Customer-Id": window.currentCustomerId,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "匯出失敗");
    }

    const blob = await res.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `models_${window.currentCustomerId}.xlsx`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    toast("機種匯出失敗", "error");
  }
}
window.mmExportModelsXlsx = mmExportModelsXlsx;

async function mmDownloadModelsTemplate() {
  const token = localStorage.getItem("auth_token");

  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    const res = await fetch(apiURL("/models/template"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Customer-Id": window.currentCustomerId,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "下載失敗");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "models_import_template.xlsx";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error(err);
    toast("下載範本失敗", "error");
  }
}
window.mmDownloadModelsTemplate = mmDownloadModelsTemplate;

async function mmImportModels(file) {
  console.log("📦 file =", file);
  console.log("📄 file.name =", file?.name);
  console.log("📄 file.type =", file?.type);

  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return toast("僅支援 .xlsx Excel 檔案", "warning");
  }

  const token = localStorage.getItem("auth_token");

  if (!window.currentCustomerId) {
    return toast("尚未選擇客戶", "warning");
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(apiURL("/models/import"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Customer-Id": window.currentCustomerId,
      },
      body: fd,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.detail || "匯入失敗");
    }

    toast(
      `匯入完成：新增 ${data?.imported ?? 0} 筆、更新 ${data?.updated ?? 0} 筆、跳過 ${data?.skipped ?? 0} 筆`
    );

    await mmLoadModelList();

  } catch (err) {
    console.error(err);
    toast(err.message || "匯入失敗", "error");
  }
}
window.mmImportModels = mmImportModels;

function mmImportModelsXlsx(file) {
  if (!file) return;
  mmImportModels(file);
}
window.mmImportModelsXlsx = mmImportModelsXlsx;

/* ============================================================
 * DRAWER MODE (機種詳情 Drawer 專用)
 * ============================================================ */

async function openModelDetailDrawer(modelId) {
  drawerSelectedModel = modelId;

  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");

  if (!drawer || !box) return;

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);
    renderModelDetailDrawer(data);
  } catch (err) {
    console.error(err);
    box.innerHTML = `<div class="p-4 text-red-500">載入失敗</div>`;
  }
}

function renderModelDetailDrawer(data) {
  const { model, stations, requirements, capacity } = data;
  const box = document.getElementById("modelDetailContent");

  box.innerHTML = `
    <section class="space-y-6">
      <div>
        <h3 class="font-semibold">${model.id}</h3>
        <p>${model.model_name}</p>
      </div>

      <div>
        <h4>綁定站點</h4>
        <ul>
          ${(stations || []).map(s => `<li>${s.station_id} - ${s.station_name}</li>`).join("")}
        </ul>
      </div>

      <div>
        <h4>最大可開站數</h4>
        ${(capacity || []).map(c => `
          <div>${c.station_id}：${c.max_station}</div>
        `).join("")}
      </div>
    </section>
  `;
}

function closeModelDetailDrawer() {
  drawerSelectedModel = null;
  document.getElementById("modelDetailDrawer")
    ?.classList.add("translate-x-full");
}

function drawerShowTab(tabName) {
  document.querySelectorAll("#modelDetailContent .tab-content")
    .forEach(el => el.classList.add("hidden"));
  document.getElementById(tabName)?.classList.remove("hidden");
}
