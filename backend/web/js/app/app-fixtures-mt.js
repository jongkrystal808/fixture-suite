/**
 * 治具管理（後台專用 / Multi-Tenant）
 * app-fixtures-mt.js
 *
 * ✔ admin only
 * ✔ customer_id 強制
 * ✔ 治具主檔 CRUD
 * ✔ 不直接修改庫存數量（安全）
 * ✔ 對應 api-fixtures.js
 */

/* ============================================================
 * 狀態
 * ============================================================ */

let fixturePage = 1;
let fixturePageSize = 20;

/**
 * 依賴的全域狀態：
 * window.currentUser
 * window.currentCustomerId
 */

/* ============================================================
 * 初始化
 * ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // 🔐 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    console.warn("Not admin — skip fixtures module init");
    return;
  }

  // 🔥 DOM 不存在就不啟動
  if (!document.getElementById("fixtureTable")) {
    console.warn("Fixture table not found — skip fixtures module init");
    return;
  }

  if (!window.currentCustomerId) {
    toast("請先選擇客戶", "warning");
    return;
  }

  loadFixturesMT();
});

/* ============================================================
 * 載入治具列表（後台）
 * ============================================================ */

async function loadFixturesMT() {
  const search = document.getElementById("fixtureSearch")?.value.trim() || "";

  const params = {
    customer_id: window.currentCustomerId,
    page: fixturePage,
    pageSize: fixturePageSize
  };

  if (search) params.q = search;

  try {
    const result = await apiListFixtures(params);
    renderFixtureTableMT(result.fixtures || result);
    renderFixturePaginationMT(result.total || 0);
  } catch (err) {
    console.error(err);
    toast("載入治具失敗", "error");
  }
}

/* ============================================================
 * 表格渲染
 * ============================================================ */

function renderFixtureTableMT(rows) {
  const tbody = document.getElementById("fixtureTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-gray-400">
          查無治具資料
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="py-2 px-2">${f.fixture_id}</td>
      <td class="py-2 px-2">${f.fixture_name || ""}</td>
      <td class="py-2 px-2">${f.fixture_type || ""}</td>
      <td class="py-2 px-2">${f.owner_name || ""}</td>
      <td class="py-2 px-2 text-sm text-gray-600">
        可用:${f.available_qty ?? "-"} /
        已部署:${f.deployed_qty ?? "-"} /
        總:${f.total_qty ?? "-"}
      </td>
      <td class="py-2 px-2 text-right">
        <button class="btn btn-xs btn-outline"
                onclick="openFixtureEdit('${f.fixture_id}')">
          編輯
        </button>
        <button class="btn btn-xs btn-error"
                onclick="deleteFixtureMT('${f.fixture_id}')">
          刪除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ============================================================
 * 分頁（結構保留）
 * ============================================================ */

function renderFixturePaginationMT(total) {
  const box = document.getElementById("fixturePagination");
  if (!box) return;
  box.innerHTML = "";
  // 若 API 已回傳 total，可在此補齊分頁
}

/* ============================================================
 * 新增治具（主檔）
 * ============================================================ */

function openFixtureAdd() {
  document.getElementById("fixtureForm").reset();
  document.getElementById("fixtureFormMode").value = "add";
  document.getElementById("fixtureModalTitle").innerText = "新增治具";
  document.getElementById("f_id").disabled = false;
  fixtureModal.showModal();
}

async function submitFixtureForm() {
  const mode = document.getElementById("fixtureFormMode").value;

  const payload = {
    fixture_id: document.getElementById("f_id").value.trim(),
    customer_id: window.currentCustomerId,
    fixture_name: document.getElementById("f_name").value.trim(),
    fixture_type: document.getElementById("f_type").value.trim() || null,
    owner_id: document.getElementById("f_owner")?.value || null,
    replacement_cycle: Number(document.getElementById("f_cycle")?.value) || null,
    cycle_unit: document.getElementById("f_cycle_unit")?.value || "none",
    note: document.getElementById("f_note")?.value.trim() || null
  };

  if (!payload.fixture_id) return toast("請輸入治具編號");
  if (!payload.fixture_name) return toast("請輸入治具名稱");

  try {
    if (mode === "add") {
      await apiCreateFixture(payload);
      toast("新增治具成功");
    } else {
      await apiUpdateFixture(payload.fixture_id, payload);
      toast("更新成功");
    }

    fixtureModal.close();
    loadFixturesMT();
  } catch (err) {
    console.error(err);
    toast("操作失敗", "error");
  }
}

/* ============================================================
 * 編輯治具
 * ============================================================ */

async function openFixtureEdit(fixtureId) {
  try {
    const data = await apiGetFixture(fixtureId, window.currentCustomerId);

    document.getElementById("fixtureFormMode").value = "edit";
    document.getElementById("fixtureModalTitle").innerText = "編輯治具";

    document.getElementById("f_id").value = data.fixture_id;
    document.getElementById("f_id").disabled = true;

    document.getElementById("f_name").value = data.fixture_name || "";
    document.getElementById("f_type").value = data.fixture_type || "";
    document.getElementById("f_owner").value = data.owner_id || "";
    document.getElementById("f_cycle").value = data.replacement_cycle || "";
    document.getElementById("f_cycle_unit").value = data.cycle_unit || "none";
    document.getElementById("f_note").value = data.note || "";

    fixtureModal.showModal();
  } catch (err) {
    console.error(err);
    toast("載入治具失敗", "error");
  }
}

/* ============================================================
 * 刪除治具（⚠ 僅主檔）
 * ============================================================ */

async function deleteFixtureMT(fixtureId) {
  if (!confirm(`確定要刪除治具 ${fixtureId}？\n⚠ 將影響相關主檔設定`)) return;

  try {
    await apiDeleteFixture(fixtureId, window.currentCustomerId);
    toast("治具已刪除");
    loadFixturesMT();
  } catch (err) {
    console.error(err);
    toast("刪除失敗，可能已有交易或序號", "error");
  }
}
