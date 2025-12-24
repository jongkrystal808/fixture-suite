/**
 * 後台管理入口控制
 * /backend/web/js/app/app-admin.js
 */

function showAdminPage(page) {
  // 🔒 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return;
  }

  // 隱藏所有 page
  document.querySelectorAll(".admin-page").forEach(el =>
    el.classList.add("hidden")
  );

  // 顯示目標 page
  const target = document.getElementById(`admin-${page}`);
  if (target) target.classList.remove("hidden");

  // 重設選單樣式
  document.querySelectorAll(".admin-menu").forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline");
  });

  // 設定 active 選單（✅ 正確版本）
  const activeBtn = document.querySelector(
    `.admin-menu[data-admin-page="${page}"]`
  );
  if (activeBtn) {
    activeBtn.classList.remove("btn-outline");
    activeBtn.classList.add("btn-primary");
  }
}

// ✅ 初始化後台（預設治具管理）
function initAdminPage() {
  showAdminPage("fixtures");
}
