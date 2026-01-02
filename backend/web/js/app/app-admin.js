/**
 * 後台管理入口控制（Lazy-load + Cache 最終版）
 * /backend/web/js/app/app-admin.js
 */

// Lazy-load 狀態（只記「頁面是否初始化過 UI」）
window.__adminLoaded = window.__adminLoaded || {};

// Admin data cache（依 customer 分開）
// key: admin:{page}:{customerId}
window.__adminCache = window.__adminCache || {};


/* ============================================================
 * 顯示 Admin 子頁（含 lazy-load + cache）
 * ============================================================ */
function showAdminPage(page) {
  // 🔒 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return;
  }

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

  // ----------------------------------------------------------
  // 5️⃣ Lazy-load + Cache（核心修正）
  // ----------------------------------------------------------
  const customerId = window.currentCustomerId;
  if (!customerId) {
    console.warn("[admin] no customer selected, skip load");
    return;
  }

  const cacheKey = `admin:${page}:${customerId}`;

  // 👉 cache 命中：不打 API
  if (window.__adminCache[cacheKey]) {
    console.log("[admin] cache hit:", cacheKey);
    window.__adminLoaded[page] = true;
    return;
  }

  // 👉 cache 未命中：第一次載入或 cache 被清掉
  console.log("[admin] load & cache:", cacheKey);

  switch (page) {
    case "owners":
      window.loadOwners?.();
      break;

    case "users":
      window.loadUsers?.();
      break;

    case "fixtures":
      window.loadAdminFixtures?.();
      break;

    default:
      console.warn("[admin] no loader defined for:", page);
      return;
  }

  window.__adminLoaded[page] = true;
  window.__adminCache[cacheKey] = true;
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
