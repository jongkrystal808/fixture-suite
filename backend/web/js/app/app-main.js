// 簡易 hash router + 頁籤切換
// 全域目前開啟的浮層關閉函式
window.__activeOverlayCloser = null;

(function () {
  const TAB_CONFIG = {
    dashboard: { sectionId: "tab-dashboard", title: "儀表板" },
    receipts: { sectionId: "tab-receipts", title: "收料 / 退料登記" },
    query: { sectionId: "tab-query", title: "治具 / 機種查詢" },
    logs: { sectionId: "tab-logs", title: "使用 / 更換記錄" },
    stats: { sectionId: "tab-stats", title: "治具情況統計" },
    admin: { sectionId: "tab-admin", title: "後台管理" }
  };

  // admin 子頁切換
  document.querySelectorAll(".admin-menu").forEach(btn => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.adminPage;
      switchAdminPage(page);
    });
  });

  function switchAdminPage(page) {
    // 隱藏所有 admin 子頁
    document.querySelectorAll(".admin-page").forEach(el => {
      el.classList.add("hidden");
    });

    // 顯示指定頁
    const target = document.getElementById(`admin-${page}`);
    if (target) {
      target.classList.remove("hidden");
    }

    // 更新按鈕樣式
    document.querySelectorAll(".admin-menu").forEach(btn => {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-outline");
    });

    const activeBtn = document.querySelector(
      `.admin-menu[data-admin-page="${page}"]`
    );
    if (activeBtn) {
      activeBtn.classList.add("btn-primary");
      activeBtn.classList.remove("btn-outline");
    }
  }

  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const sections = {};
  Object.keys(TAB_CONFIG).forEach(key => {
    sections[key] = document.getElementById(TAB_CONFIG[key].sectionId);
  });

  const bannerTitle = document.getElementById("activeTabTitle");
  let currentTab = null;
  const loadedFlags = {}; // 每個頁面只載入一次資料

  function normalizeHash(hash) {
    if (!hash) return "dashboard";
    return hash.replace(/^#/, "");
  }

  function setHash(hash) {
    if (location.hash.replace(/^#/, "") !== hash) {
      history.replaceState(null, "", "#" + hash);
    }
  }

  function showTab(tabKey, options = { updateHash: true }) {

  // =====================================================
  // 🚫 v4.x 防呆：showTab 只處理「主分頁」
  // 收料/退料/查詢子分頁一律不在這裡處理
  // =====================================================
  if (
    tabKey.startsWith("rtab-") ||
    tabKey === "viewSerialTab" ||
    tabKey === "viewAllTab"
  ) {
    console.warn("[showTab] ignore subtab:", tabKey);
    return;
  }

  // ⬇️ 原本的 showTab 程式碼完全不動

    if (!TAB_CONFIG[tabKey]) tabKey = "dashboard";
    if (currentTab === tabKey) return;

    currentTab = tabKey;

    // 1) 切 main section
    Object.keys(TAB_CONFIG).forEach(key => {
      const sec = sections[key];
      if (!sec) return;
      if (key === tabKey) {
        sec.classList.remove("hidden");
      } else {
        sec.classList.add("hidden");
      }
    });

    // 2) 切 tab 樣式
    tabButtons.forEach(btn => {
      const key = btn.dataset.tab;
      if (key === tabKey) {
        btn.classList.add("tab-active");
      } else {
        btn.classList.remove("tab-active");
      }
    });

    // 3) 切換標題
    if (bannerTitle) {
      bannerTitle.textContent = TAB_CONFIG[tabKey].title;
    }

    // 4) 更新 hash
    if (options.updateHash) setHash(tabKey);

    // 5) 載資料（✅ v4.x：一律等 customer ready）
    try {
      switch (tabKey) {
        // ★ Dashboard：每次切換都重新載入
        case "dashboard":
          if (typeof window.loadDashboard === "function") {
            if (typeof window.onCustomerReady === "function") {
              onCustomerReady(() => window.loadDashboard());
            } else if (typeof window.onUserReady === "function") {
              // fallback：避免你尚未完成 customer gate 時完全不能動
              onUserReady(() => window.loadDashboard());
            } else {
              window.loadDashboard();
            }
          }
          break;

        // 其他頁面：只載一次
        case "receipts":
        case "query":
        case "logs":
        case "stats":
        case "admin":
          if (!loadedFlags[tabKey]) {
            loadedFlags[tabKey] = true;

            const runInit = () => {
              switch (tabKey) {
                case "receipts":
                  if (typeof window.loadReceipts === "function") {
                    window.loadReceipts();
                  }
                  break;

                case "query":
                  if (typeof window.loadFixturesQuery === "function") {
                    window.loadFixturesQuery();
                  }
                  break;

                case "logs":
                  if (typeof window.loadUsageLogs === "function") {
                    window.loadUsageLogs();
                  }
                  if (typeof window.loadReplacementLogs === "function") {
                    window.loadReplacementLogs();
                  }
                  break;

                case "stats":
                  if (typeof window.loadStats === "function") {
                    window.loadStats();
                  }
                  break;

                case "admin":
                  // ✅ 預設顯示「治具管理」
                  switchAdminPage("fixtures");

                  // ✅ v4.x：不再呼叫 loadCustomers（customer 是 permission context）
                  // if (typeof window.loadCustomers === "function") {
                  //   window.loadCustomers();
                  // }
                  break;
              }
            };

            // ✅ v4.x：等 customer ready
            if (typeof window.onCustomerReady === "function") {
              onCustomerReady(runInit);
            } else if (typeof window.onUserReady === "function") {
              // fallback
              onUserReady(runInit);
            } else {
              runInit();
            }
          }
          break;
      }
    } catch (e) {
      console.warn("init tab error:", tabKey, e);
    }
  }

  // 監聽 tab 按鈕
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tabKey = btn.dataset.tab;
      const hash = btn.dataset.hash || tabKey;
      showTab(tabKey, { updateHash: true });
      setHash(hash);
    });
  });

  // 監聽 hash 改變
  window.addEventListener("hashchange", () => {
    const tabKey = normalizeHash(location.hash);
    showTab(tabKey, { updateHash: false });
  });

  // =====================================================
  // ⎋ Global ESC handler (REAL version for current project)
  // =====================================================
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    // 有登記的浮層，直接關
    if (typeof window.__activeOverlayCloser === "function") {
      window.__activeOverlayCloser();
      window.__activeOverlayCloser = null;
      return;
    }

    // fallback：dialog
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
  });

  // DOM Ready
  window.addEventListener("DOMContentLoaded", async () => {
    // (1) 先載入登入資訊
    if (typeof window.loadCurrentUser === "function") {
      await window.loadCurrentUser();
    }

    // (2) 啟動頁籤（✅ v4.x：等 customer ready 再 showTab）
    const boot = () => {
      const initialTab = normalizeHash(location.hash);
      showTab(initialTab, { updateHash: true });
    };

    if (typeof window.onCustomerReady === "function") {
      onCustomerReady(boot);
    } else {
      // fallback：避免尚未接上 customer context 時卡死
      boot();
    }

    // (3) 收料 / 退料 / 總檢視 / 序號檢視 子分頁（最終穩定版）
    const rtabButtons = document.querySelectorAll("[data-rtab]");
    const rtabSections = [
      "#rtab-receipts",
      "#rtab-returns",
      "#viewAllTab",
      "#viewSerialTab"
    ];

    rtabButtons.forEach(btn => {
      if (btn.__rtabBound) return;     // ★ 防重複綁定
      btn.__rtabBound = true;

      btn.addEventListener("click", () => {
        // active 樣式
        rtabButtons.forEach(b => b.classList.remove("subtab-active"));
        btn.classList.add("subtab-active");

        const tab = btn.dataset.rtab;

        // 隱藏所有子頁
        document
          .querySelectorAll(rtabSections.join(","))
          .forEach(sec => sec.classList.add("hidden"));

        // ==========================
        // 顯示對應子頁 + 載資料
        // ==========================
        if (tab === "receipts" || tab === "returns") {
          const target = document.getElementById(`rtab-${tab}`);
          if (target) target.classList.remove("hidden");
          return;
        }

        if (tab === "viewall") {
          const viewAll = document.getElementById("viewAllTab");
          if (viewAll) viewAll.classList.remove("hidden");

          if (typeof window.loadTransactionViewAll === "function") {
            // ✅ v4.x：需要 customer header 的 API，保險起見等 customer ready
            if (typeof window.onCustomerReady === "function") {
              onCustomerReady(() => window.loadTransactionViewAll(1));
            } else {
              window.loadTransactionViewAll(1);
            }
          }
          return;
        }

        if (tab === "serial") {
          const serialTab = document.getElementById("viewSerialTab");
          if (serialTab) serialTab.classList.remove("hidden");

          // 預設查最近 7 天（保險寫法）
          const today = new Date();
          const from = new Date(Date.now() - 7 * 86400000);

          const df = document.getElementById("vsDateFrom");
          const dt = document.getElementById("vsDateTo");

          if (df && dt) {
            df.value = from.toISOString().slice(0, 10);
            dt.value = today.toISOString().slice(0, 10);
          }

          // ✅ v4.x：同樣等 customer ready
          if (typeof window.onCustomerReady === "function") {
            onCustomerReady(() => loadTransactionViewSerial(1));
          } else {
            loadTransactionViewSerial(1);
          }
        }
      });
    });

    // (4) Query 子分頁
    const qtabBtns = document.querySelectorAll("[data-qtab]");
    qtabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.dataset.qtab;

        qtabBtns.forEach(b => b.classList.remove("subtab-active"));
        btn.classList.add("subtab-active");

        document.getElementById("qtab-fixtures").classList.toggle("hidden", tab !== "fixtures");
        document.getElementById("qtab-models").classList.toggle("hidden", tab !== "models");
      });
    });

    /* =====================================================
     * (5) ★★★ 啟動時鐘（修復版） ★★★
     * ===================================================== */
    function updateClock() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const clockEl = document.getElementById("clock");

      if (clockEl) clockEl.textContent = `${hh}:${mm}`;
    }

    // 初始與更新
    updateClock();
    setInterval(updateClock, 1000);
  });
})();
