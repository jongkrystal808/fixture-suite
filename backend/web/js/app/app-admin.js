/**
 * 後台管理入口控制
 * app-admin.js
 */

function showAdminPage(page) {
  // 🔒 admin only
  if (!window.currentUser || window.currentUser.role !== "admin") {
    toast("無權限", "error");
    return;
  }

  // 隱藏所有 page
  document.querySelectorAll(".admin-page").forEach(el => el.classList.add("hidden"));

  // 顯示目標 page
  const target = document.getElementById(`admin-${page}`);
  if (target) target.classList.remove("hidden");

  // 設定選單 active（靠 onclick 參數反查）
  document.querySelectorAll(".admin-menu").forEach(btn => {
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline");
  });

  const activeBtn = document.querySelector(`.admin-menu[onclick="showAdminPage('${page}')"]`);
  if (activeBtn) {
    activeBtn.classList.remove("btn-outline");
    activeBtn.classList.add("btn-primary");
  }
}
