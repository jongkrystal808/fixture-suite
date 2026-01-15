/**
 * 後台管理入口控制（v4.x 簡化版）
 * /js/app/app-admin.js
 */

/* ============================================================
 * 顯示 Admin 子頁
 * ============================================================ */
function showAdminPage(page) {
  // 🔒 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return;
  }

  // 一律等 customer ready（v4.x 核心規則）
  if (typeof window.onCustomerReady === "function") {
    onCustomerReady(() => _showAdminPageInternal(page));
  } else {
    // fallback（理論上不該發生）
    _showAdminPageInternal(page);
  }
}

function _showAdminPageInternal(page) {
  // 1️⃣ 隱藏所有 admin page
  document.querySelectorAll(".admin-page").forEach(el => {
    el.classList.add("hidden");
  });

  // 2️⃣ 顯示目標 page
  const targetId = `admin-${page}`;
  const target = document.getElementById(targetId);
  if (!target) {
    console.warn("[admin] page not found:", targetId);
    return;
  }
  target.classList.remove("hidden");

  // 3️⃣ 重設選單樣式
  document.querySelectorAll(".admin-menu").forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline");
  });

  // 4️⃣ 設定 active 選單
  const activeBtn = document.querySelector(
    `.admin-menu[data-admin-page="${page}"]`
  );
  if (activeBtn) {
    activeBtn.classList.remove("btn-outline");
    activeBtn.classList.add("btn-primary");
  }

  // 5️⃣ 載入資料
  const customerId = window.currentCustomerId;
  if (!customerId) {
    console.warn("[admin] customer not ready, skip load:", page);
    return;
  }

  // 根據不同頁面載入對應資料
  switch (page) {
    case "stations":
      if (typeof window.loadStations === "function") {
        window.loadStations();
      }
      break;

    case "fixtures":
      if (typeof window.loadAdminFixtures === "function") {
        window.loadAdminFixtures();
      }
      break;

    case "models":
      if (typeof window.loadModels === "function") {
        window.loadModels();
      }
      break;

    case "owners":
      if (typeof window.loadOwners === "function") {
        window.loadOwners();
      }
      break;

    case "users":
      if (typeof window.loadUsers === "function") {
        window.loadUsers();
      }
      break;

    case "systems":
      // 系統設定頁面可能不需要載入資料
      break;

    default:
      console.warn("[admin] no loader defined for:", page);
  }
}


/* ============================================================
 * 初始化後台（預設頁）
 * ============================================================ */
function initAdminPage() {
  showAdminPage("fixtures");
}


/* ============================================================
 * 導出全域
 * ============================================================ */
window.showAdminPage = showAdminPage;
window.initAdminPage = initAdminPage;