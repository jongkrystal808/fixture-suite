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


function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* ============================================================
 * 機種清單
 * ============================================================ */

async function mmLoadModelList() {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return alert("請先選擇客戶");

  const search = document.getElementById("mmSearch")?.value.trim() || "";

  const params = { customer_id };
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
      <tr>
        <td class="px-3 py-2">${m.id}</td>
        <td class="px-3 py-2">${m.model_name}</td>
        <td class="px-3 py-2">
          <button class="btn btn-xs btn-outline"
                  onclick="openModelEditModal('${m.id}')">
            修改
          </button>
           <button class="btn btn-error btn-xs"
                onclick="stageDeleteModel('${m.id}')">
          刪除
        </button>
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
  modal.classList.remove("hidden");

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

  const customer_id = getCurrentCustomerId();

  const detail = await apiGetModelDetail(meCurrentModelId);
  const bound = detail.stations || [];

  const allStations = await apiListStations({ customer_id });
  const boundIds = new Set(bound.map(s => s.station_id));
  const available = allStations.filter(s => !boundIds.has(s.id));

  renderMeStations(bound, available);
}

function renderMeStations(bound, available) {
  const box = document.getElementById("meStationPanel");
  if (!box) return;

  box.innerHTML = `
    <div class="grid grid-cols-2 gap-6">

      <!-- 已綁定站點 -->
      <div>
        <div class="text-sm font-semibold mb-2">已綁定站點</div>

        <div class="space-y-1">
          ${
            bound.length
              ? bound.map(s => `
                  <div class="flex items-center justify-between
                              px-2 py-1 border rounded-lg text-sm">
                    <span class="font-mono">${s.station_id}</span>

                    <div class="flex gap-1">
                      <button class="btn btn-xs btn-outline"
                              onclick="meSelectStation('${s.station_id}', '')">
                        治具
                      </button>
                      <button class="btn btn-xs btn-error"
                              onclick="meUnbindStation('${s.station_id}')">
                        解綁
                      </button>
                    </div>
                  </div>
                `).join("")
              : `<div class="text-xs text-gray-400">尚未綁定</div>`
          }
        </div>
      </div>

      <!-- 可綁定站點 -->
      <div>
        <div class="text-sm font-semibold mb-2">可綁定站點</div>

        <div class="space-y-1">
          ${
            available.length
              ? available.map(s => `
                  <div class="flex items-center justify-between
                              px-2 py-1 border rounded-lg text-sm">
                    <span class="font-mono">${s.id}</span>

                    <button class="btn btn-xs btn-primary"
                            onclick="meBindStation('${s.id}')">
                      綁定
                    </button>
                  </div>
                `).join("")
              : `<div class="text-xs text-gray-400">無可綁定</div>`
          }
    </div>
  `;
}

async function meBindStation(stationId) {
  await apiBindStation({
    customer_id: getCurrentCustomerId(),
    model_id: meCurrentModelId,
    station_id: stationId,
  });

  toast("站點已綁定");

  // ⭐ 立即移動 DOM（UX 即時）
  const detail = await apiGetModelDetail(meCurrentModelId);
  const bound = detail.stations || [];
  const allStations = await apiListStations({ customer_id: getCurrentCustomerId() });

  const boundIds = new Set(bound.map(s => s.station_id));
  const available = allStations.filter(s => !boundIds.has(s.id));

  renderMeStations(bound, available);

  // ⭐ 直接選中該站點
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
    customer_id: getCurrentCustomerId(),
    model_id: meCurrentModelId,
    station_id: stationId,
  });

  toast("站點已解綁");

  if (meCurrentStationId === stationId) {
    meCurrentStationId = null;
    document.getElementById("meFixturePanel").innerHTML =
      `<div class="text-xs text-gray-400">請選擇站點</div>`;
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


function renderMeFixturePanel(requirements) {
  const panel = document.getElementById("meFixturePanel");

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
    <div class="border rounded-xl overflow-auto max-h-64">
      <table class="min-w-full text-xs">
        <thead class="bg-gray-50 text-gray-500">
          <tr>
            <th class="py-1 px-2 text-left">治具</th>
            <th class="py-1 px-2 text-left">需求</th>
            <th class="py-1 px-2 text-left">操作</th>
          </tr>
        </thead>
        <tbody>
          ${
            requirements.length
              ? requirements.map(r => `
                  <tr>
                    <td class="px-2 py-1">
                      ${r.fixture_id}
                    </td>
                    <td class="px-2 py-1">
                      ${r.required_qty}
                    </td>
                    <td class="px-2 py-1">
                      <button class="btn btn-xs btn-outline"
                        onclick="meEditRequirement(${r.id}, ${r.required_qty})">
                        修改
                      </button>
                      <button class="btn btn-xs btn-error"
                        onclick="meDeleteRequirement(${r.id})">
                        刪除
                      </button>
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


let meSelectedFixtureId = null;
let meFixtureSearchTimer = null;

async function meSearchFixture(keyword) {
  const box = document.getElementById("meFixtureSuggest");
  meSelectedFixtureId = null;

  clearTimeout(meFixtureSearchTimer);

  if (!keyword || keyword.length < 2) {
    box.classList.add("hidden");
    return;
  }

  meFixtureSearchTimer = setTimeout(async () => {
    const customer_id = getCurrentCustomerId();

    const resp = await apiSearchFixtures({
      customer_id: getCurrentCustomerId(),
      q: keyword,
      limit: 20,
    });

const results = Array.isArray(resp) ? resp : [];


    // 排除已綁
    const detail = await apiGetModelDetail(meCurrentModelId);
    const boundIds = new Set(
      (detail.requirements || [])
        .filter(r => r.station_id === meCurrentStationId)
        .map(r => r.fixture_id)
    );

    const filtered = results.filter(f => !boundIds.has(f.fixture_id));

    box.innerHTML = filtered.length
      ? filtered.map(f => `
          <div class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
               onclick="meSelectFixture('${f.fixture_id}')">
            ${f.fixture_id}
          </div>
        `).join("")
      : `<div class="px-3 py-2 text-gray-400">無符合治具</div>`;

    box.classList.remove("hidden");
  }, 300);
}

function meSelectFixture(fixtureId) {
  meSelectedFixtureId = fixtureId;
  document.getElementById("meFixtureInput").value = fixtureId;
  document.getElementById("meFixtureSuggest").classList.add("hidden");
}


async function meAddRequirement() {
  const qty = Number(document.getElementById("meFixtureQty").value);

  if (!meSelectedFixtureId || qty <= 0) {
    return toast("請選擇治具並輸入數量", "warning");
  }

  await apiAddRequirement({
    customer_id: getCurrentCustomerId(),
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

// 一定要掛到 window，HTML onclick 才找得到
window.mmOpenModelModal = mmOpenModelModal;

function mmCloseModelModal() {
  const modal = document.getElementById("mmModelModal");
  if (!modal) return;

  modal.classList.add("hidden");

  // （可選）清掉表單與狀態
  const form = document.getElementById("mmModelForm");
  form?.reset();

  // 清除 dataset，避免殘留狀態
  if (form) {
    delete form.dataset.mode;
    delete form.dataset.id;
  }
}

// ⚠️ 一定要掛到 window，HTML onclick 才找得到
window.mmCloseModelModal = mmCloseModelModal;


async function submitModelForm() {
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
    customer_id: getCurrentCustomerId(),
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

    // 關閉機種基本資料 Modal
    document.getElementById("mmModelModal")?.classList.add("hidden");

    // 重新載入機種清單
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

  // debounce，避免每打一次字就打 API
  clearTimeout(stage3FixtureSearchTimer);
  stage3FixtureSearchTimer = setTimeout(async () => {
    try {
      const customer_id = getCurrentCustomerId();

      // 🔥 使用 fixtures API（你已經有）
      const res = await apiListFixtures({
        customer_id,
        search: keyword,
        limit: 20,
      });

      const list = res.fixtures || [];

      if (!list.length) {
        box.innerHTML = `
          <div class="px-3 py-2 text-xs text-gray-400">
            查無符合治具
          </div>`;
        box.classList.remove("hidden");
        return;
      }

      box.innerHTML = list.map(f => `
        <div
          class="px-3 py-2 text-xs cursor-pointer hover:bg-gray-100"
          onclick="stage3SelectFixture('${f.id}', '${f.fixture_name}')"
        >
          <span class="font-mono">${f.id}</span>
          <span class="text-gray-500"> - ${f.fixture_name}</span>
        </div>
      `).join("");

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


function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function mmExportModelsXlsx() {
  const token = localStorage.getItem("auth_token");
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  const url = `/api/v2/models/export?customer_id=${encodeURIComponent(customer_id)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "匯出失敗");
    }

    // ✅ 關鍵：一定要 blob
    const blob = await res.blob();

    // ✅ 瀏覽器下載
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `models_${customer_id}.xlsx`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

  } catch (err) {
    console.error(err);
    toast("機種匯出失敗", "error");
  }
}

window.mmExportModelsXlsx = mmExportModelsXlsx;


async function mmDownloadModelsTemplate() {
  const token = localStorage.getItem("auth_token");
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  try {
    const res = await fetch(
      `/api/v2/models/template?customer_id=${customer_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("下載失敗");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "models_import_template.xlsx";
    a.click();

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
  const customer_id = getCurrentCustomerId();

  if (!customer_id) {
    return toast("尚未選擇客戶", "warning");
  }

  const fd = new FormData();
  fd.append("file", file);

  try {
    const res = await fetch(
      `/api/v2/models/import?customer_id=${encodeURIComponent(customer_id)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // ⚠️ 不要加 Content-Type，瀏覽器會自己處理 multipart
        },
        body: fd,
      }
    );

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.detail || "匯入失敗");
    }

    // ✅ 對齊後端欄位
    toast(
      `匯入完成：新增 ${data.imported} 筆、更新 ${data.updated} 筆、跳過 ${data.skipped} 筆`
    );

    await mmLoadModelList();

  } catch (err) {
    console.error(err);
    toast(err.message || "匯入失敗", "error");
  }
}

window.mmImportModels = mmImportModels;

/* 🔧 給 HTML onchange 用的轉接函式（如果你有用） */
function mmImportModelsXlsx(file) {
  if (!file) return;
  mmImportModels(file);
}
window.mmImportModelsXlsx = mmImportModelsXlsx;


/* ============================================================
 * DRAWER MODE (機種詳情 Drawer 專用)
 * ============================================================ */
async function openModelDetailDrawer(modelId) {
  drawerSelectedModel = modelId;   // ✅ Drawer 自己用

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
      <!-- 基本資料 -->
      <div>
        <h3 class="font-semibold">${model.id}</h3>
        <p>${model.model_name}</p>
      </div>

      <!-- 綁定站點 -->
      <div>
        <h4>綁定站點</h4>
        <ul>
          ${stations.map(s => `<li>${s.station_id} - ${s.station_name}</li>`).join("")}
        </ul>
      </div>

      <!-- 最大開站數 -->
      <div>
        <h4>最大可開站數</h4>
        ${capacity.map(c => `
          <div>${c.station_id}：${c.max_station}</div>
        `).join("")}
      </div>
    </section>
  `;
}

function closeModelDetailDrawer() {
    drawerSelectedModel = null;  // 清乾淨，避免誤用
    document.getElementById("modelDetailDrawer")
    ?.classList.add("translate-x-full");
}

/* Drawer Tab 專用 */
function drawerShowTab(tabName) {
  document.querySelectorAll("#modelDetailContent .tab-content")
    .forEach(el => el.classList.add("hidden"));
  document.getElementById(tabName)?.classList.remove("hidden");
}
