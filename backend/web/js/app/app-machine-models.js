/* ============================================================
 * app-machine.js
 * 站點綁定（新版三段式 UI 專用）
 * 對應 index.html:
 *   msBoundTable
 *   msAvailableTable
 *   msSelectedModelLabel
 * ============================================================ */

function getCurrentCustomerId() {
  return localStorage.getItem("current_customer_id");
}

/* 重新載入綁定站點（依照目前選取的機種） */
async function msReloadForCurrentModel() {
  if (!currentSelectedModel) {
    console.warn("尚未選擇機種");
    return;
  }

  const customer_id = getCurrentCustomerId();
  if (!customer_id) {
    console.warn("無 customer_id");
    return;
  }

  // 取得已綁定
  const bound = await apiListModelStations({
    customer_id,
    model_id: currentSelectedModel
  });

  // 取得可綁定
  const available = await apiListAvailableStationsForModel({
    customer_id,
    model_id: currentSelectedModel
  });

  renderBoundStationsTable(bound);
  renderAvailableStationsTable(available);

  // 顯示內容區
  document.getElementById("msNoModelHint")?.classList.add("hidden");
  document.getElementById("msContent")?.classList.remove("hidden");
}

/* 已綁定站點 */
function renderBoundStationsTable(rows) {
  const tbody = document.getElementById("msBoundTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="3" class="text-center py-1 text-gray-400">無資料</td></tr>`;
    return;
  }

  rows.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.station_id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right">
        <button class="btn btn-ghost btn-xs"
                onclick="msUnbindStation('${s.station_id}')">移除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* 可綁定站點 */
function renderAvailableStationsTable(rows) {
  const tbody = document.getElementById("msAvailableTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="3" class="text-center py-1 text-gray-400">無可綁定站點</td></tr>`;
    return;
  }

  rows.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-1 px-2">${s.id}</td>
      <td class="py-1 px-2">${s.station_name || "-"}</td>
      <td class="py-1 px-2 text-right">
        <button class="btn btn-primary btn-xs"
                onclick="msBindStation('${s.id}')">綁定</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* 綁定站點 */
async function msBindStation(stationId) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  await apiBindStationToModel({
    customer_id,
    model_id: currentSelectedModel,
    station_id: stationId
  });

  msReloadForCurrentModel();
}

/* 解除綁定 */
async function msUnbindStation(stationId) {
  const customer_id = getCurrentCustomerId();
  if (!customer_id) return;

  await apiUnbindStationFromModel({
    customer_id,
    model_id: currentSelectedModel,
    station_id: stationId
  });

  msReloadForCurrentModel();
}

/* 導出全域 */
window.msReloadForCurrentModel = msReloadForCurrentModel;
window.msBindStation = msBindStation;
window.msUnbindStation = msUnbindStation;
/* ============================================================
 * 🟦 Model Detail Drawer（從 app-query.js 移植）
 * ============================================================ */

function closeModelDetail() {
  const drawer = document.getElementById("modelDetailDrawer");
  if (drawer) drawer.classList.add("translate-x-full");
}

async function openModelDetail(modelId) {
  const drawer = document.getElementById("modelDetailDrawer");
  const box = document.getElementById("modelDetailContent");
  if (!drawer || !box) {
    console.error("❌ modelDetailDrawer DOM 未找到");
    return;
  }

  drawer.classList.remove("translate-x-full");
  box.innerHTML = `<div class="p-4 text-gray-500">載入中...</div>`;

  try {
    const data = await apiGetModelDetail(modelId);

    const m = data.model;
    const stations = data.stations || [];
    const fixtures = data.fixtures || [];
    const capacity = data.capacity || [];

    box.innerHTML = `
      <section class="space-y-6">

        <!-- 基本資料 -->
        <div>
          <h3 class="text-lg font-semibold">基本資料</h3>
          <div class="grid grid-cols-2 gap-2 text-sm mt-2">
            <div><b>機種代碼：</b>${m.id}</div>
            <div><b>名稱：</b>${m.model_name ?? "-"}</div>
            <div><b>客戶：</b>${m.customer_id ?? "-"}</div>
            <div class="col-span-2"><b>備註：</b>${m.note ?? "-"}</div>
          </div>
        </div>

        <!-- 綁定站點 -->
        <div>
          <h3 class="text-lg font-semibold">綁定站點</h3>
          ${
            stations.length
              ? `<ul class="list-disc pl-6 text-sm">
                   ${stations.map(s => `<li>${s.station_id} - ${s.station_name}</li>`).join("")}
                 </ul>`
              : `<p class="text-gray-500 text-sm">無綁定站點</p>`
          }
        </div>

        <!-- 治具需求 -->
        <div>
          <h3 class="text-lg font-semibold">每站治具需求</h3>
          ${
            fixtures.length
              ? fixtures.map(f => `
                <div class="border rounded-xl p-3 bg-gray-50 text-sm space-y-1">
                  <div><b>站點：</b>${f.station_id}</div>
                  <div><b>治具：</b>${f.fixture_id} - ${f.fixture_name}</div>
                  <div><b>需求數量：</b>${f.required_qty}</div>
                </div>
              `).join("")
              : `<p class="text-gray-500 text-sm">無治具需求</p>`
          }
        </div>

        <!-- 最大開站量 -->
        <div>
          <h3 class="text-lg font-semibold">最大可開站數</h3>
          ${
            capacity.length
              ? capacity.map(c => `
                <div class="border rounded-xl p-3 bg-green-50 text-sm space-y-1">
                  <div><b>站點：</b>${c.station_id}</div>
                  <div><b>最大可開：</b>${c.max_station} 站</div>
                  <div class="text-xs text-gray-600">
                    (瓶頸治具：${c.bottleneck_fixture_id}，可提供 ${c.bottleneck_qty})
                  </div>
                </div>
              `).join("")
              : `<p class="text-gray-500 text-sm">未計算或無資料</p>`
          }
        </div>

      </section>
    `;
  } catch (err) {
    console.error("openModelDetail() failed:", err);
    box.innerHTML = `<div class="text-red-500 p-4">讀取失敗</div>`;
  }
}

/* 讓 HTML onclick 找得到 */
window.openModelDetail = openModelDetail;
window.closeModelDetail = closeModelDetail;
