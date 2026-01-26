/**
 * export-tools.js
 * 通用 CSV 匯出模組
 */

async function exportCsv(urlPath, filename) {
  const token = localStorage.getItem("access_token");
  const customerId = window.currentCustomerId || localStorage.getItem("current_customer_id");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const url = new URL(apiURL(urlPath), window.location.origin);
  if (customerId) url.searchParams.set("customer_id", customerId);

  const res = await fetch(url.toString(), { method: "GET", headers });

  if (!res.ok) {
    throw new Error(`Export failed ${res.status}: ${await res.text()}`);
  }

  const blob = await res.blob();

  // 建立下載
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

window.exportCsv = exportCsv;
