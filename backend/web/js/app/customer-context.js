/* ============================================================
 * Customer Context（全域客戶狀態管理）
 * ============================================================ */

window.currentCustomerId =
  localStorage.getItem("current_customer_id") || null;

function setCurrentCustomer(customerId) {
  window.currentCustomerId = customerId;
  localStorage.setItem("current_customer_id", customerId);

  const el = document.getElementById("currentCustomerDisplay");
  if (el) {
    el.textContent = `客戶：${customerId}`;
    el.classList.remove("hidden");
  }
}
function openCustomerSwitch() {
  const modal = document.getElementById("customerSelectModal");
  if (!modal) return;

  modal.showModal();
}
function confirmCustomerSelection() {
  const select = document.getElementById("customerSelect");
  const customerId = select?.value;

  if (!customerId) {
    alert("請先選擇客戶");
    return;
  }

  setCurrentCustomer(customerId);

  const modal = document.getElementById("customerSelectModal");
  modal?.close();

  // ⚠ 最簡單、最穩定的做法
  reloadAllModules();
}
function reloadAllModules() {
  // 目前先全頁 reload，確保所有模組吃到新 customer_id
  location.reload();
}
