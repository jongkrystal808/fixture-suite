// 簡易 hash router + 頁籤切換
// 全域目前開啟的浮層關閉函式
window.__activeOverlayCloser = null;

(function () {
  const TAB_CONFIG = {
    dashboard: {
      sectionId: "tab-dashboard",
      title: "首頁（總覽）"
    },
    transactions: {
      sectionId: "tab-transactions",
      title: "操作中心"
    },
    query: {
      sectionId: "tab-query",
      title: "治具-機種查詢中心"
    },
    logs: {
      sectionId: "tab-logs",
      title: "庫存與壽命"
    },
    admin: {
      sectionId: "tab-admin",
      title: "資訊管理"
    }
  };

  const tabButtons = Array.from(document.querySelectorAll(".sidebar-main[data-tab]"));
  const subRouteButtons = Array.from(document.querySelectorAll(".sidebar-subtab[data-route]"));
  const defaultRouteByTab = {
    dashboard: "dashboard",
    transactions: "transactions/register",
    logs: "logs/inventory",
    query: "query",
    admin: "admin/fixture_mt"
  };
  const sections = {};
  Object.keys(TAB_CONFIG).forEach(key => {
    sections[key] = document.getElementById(TAB_CONFIG[key].sectionId);
  });

  const bannerTitle = document.getElementById("activeTabTitle");
  let currentTab = null;
  const loadedFlags = {};

  function expandSidebarGroup(tabKey) {
    document.querySelectorAll(".nav-group").forEach(group => {
      const isActive = group.dataset.navGroup === tabKey;
      const submenu = group.querySelector(".sidebar-submenu");
      if (submenu) submenu.classList.toggle("hidden", !isActive);
    });
  }

  function setActiveSubRoute(route) {
    const normalized = (route || "dashboard").replace(/^#/, "");
    let matched = false;
    subRouteButtons.forEach(btn => {
      if (btn.dataset.route === normalized) {
        btn.classList.add("subtab-active");
        matched = true;
      } else {
        btn.classList.remove("subtab-active");
      }
    });

    if (matched) return;

    const main = normalized.split("/")[0];
    const fallback = {
      dashboard: "dashboard",
      transactions: "transactions/register",
      logs: "logs/inventory",
      query: "query",
      admin: "admin/fixture_mt"
    }[main];

    if (!fallback) return;
    const fallbackBtn = subRouteButtons.find(btn => btn.dataset.route === fallback);
    fallbackBtn?.classList.add("subtab-active");
  }

  function normalizeHash(hash) {
    if (!hash) return "dashboard";
    const cleaned = hash.replace(/^#/, "");
    const mainTab = cleaned.split("/")[0];
    return mainTab;
  }

  function getSubTab(hash) {
    if (!hash) return null;
    const cleaned = hash.replace(/^#/, "");
    const parts = cleaned.split("/");
    return parts.length > 1 ? parts[1] : null;
  }

  function setHash(hash) {
    if (location.hash.replace(/^#/, "") !== hash) {
      history.replaceState(null, "", "#" + hash);
    }
  }

  function showTab(tabKey, options = { updateHash: true }) {
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
    expandSidebarGroup(tabKey);

    // 3) 切換標題
    if (bannerTitle) {
      bannerTitle.textContent = TAB_CONFIG[tabKey].title;
    }

    // 4) 更新 hash
    if (options.updateHash) setHash(tabKey);

    // 5) 載資料
    try {
      switch (tabKey) {
        case "dashboard":
          if (typeof window.loadDashboard === "function") {
            window.loadDashboard();
          }
          break;

        case "transactions":
        case "query":
        case "logs":
        case "admin":
          if (!loadedFlags[tabKey]) {
            loadedFlags[tabKey] = true;

            switch (tabKey) {
              case "transactions":
                if (typeof window.loadReceipts === "function") window.loadReceipts();
                break;

              case "query":
                if (typeof window.loadFixturesQuery === "function") window.loadFixturesQuery();
                break;

              case "logs":
                if (typeof window.loadUsageLogs === "function") window.loadUsageLogs();
                if (typeof window.loadReplacementLogs === "function") window.loadReplacementLogs();
                setTimeout(() => {
                  if (typeof window.switchLogTab === "function") {
                    window.switchLogTab("inventory");
                  }
                }, 100);
                break;

              case "admin":
                setTimeout(() => {
                  if (typeof window.switchAdminPage === "function") {
                    window.switchAdminPage("fixtures");
                  }
                }, 100);
                break;
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
      expandSidebarGroup(tabKey);

      if (tabKey === "transactions") {
        setHash("transactions/register");
        showTab(tabKey, { updateHash: false });
        if (typeof window.toggleOperationCenterView === "function") {
          window.toggleOperationCenterView("legacy");
        }
        if (typeof window.hideTransactionsRecordPanel === "function") {
          window.hideTransactionsRecordPanel();
        }
        if (typeof window.showTransactionSubTab === "function") {
          window.showTransactionSubTab("ttab-register");
        }
        setActiveSubRoute("transactions/register");
      } else if (tabKey === "logs") {
        setHash("logs/inventory");
        showTab(tabKey, { updateHash: false });
        setActiveSubRoute("logs/inventory");
      } else if (tabKey === "admin") {
        setHash("admin/fixture_mt");
        showTab(tabKey, { updateHash: false });
        setActiveSubRoute("admin/fixture_mt");
      } else if (tabKey === "query") {
        setHash("query");
        showTab(tabKey, { updateHash: false });
        setActiveSubRoute("query");
        if (typeof window.unifiedQuerySearch === "function") {
          window.unifiedQuerySearch();
        } else if (typeof window.loadFixturesQuery === "function") {
          window.loadFixturesQuery();
        }
      } else {
        const hash = btn.dataset.hash || tabKey;
        showTab(tabKey, { updateHash: true });
        setHash(hash);
        setActiveSubRoute(defaultRouteByTab[tabKey] || hash);
      }
    });
  });

  // 監聽 hash 改變
    window.addEventListener("hashchange", () => {
      const fullRoute = location.hash.replace(/^#/, "") || "dashboard";
      const tabKey = normalizeHash(location.hash);
      const sub = getSubTab(location.hash);

      if (
        tabKey === "query" &&
        ["receipt-records", "usage-records", "replacement-records"].includes(sub || "")
      ) {
        window.navigateSidebarRoute(fullRoute);
        return;
      }

      showTab(tabKey, { updateHash: false });
      if (tabKey === "transactions" && typeof window.toggleOperationCenterView === "function") {
        window.toggleOperationCenterView("legacy");
      }
      if (tabKey === "logs" && typeof window.switchLogTab === "function") {
        window.switchLogTab(sub || "inventory");
      }
      setActiveSubRoute(fullRoute);
    });

  // Global ESC handler
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;

    if (typeof window.__activeOverlayCloser === "function") {
      window.__activeOverlayCloser();
      window.__activeOverlayCloser = null;
      return;
    }

    document.querySelectorAll("dialog[open]").forEach(d => d.close());
  });

  // ============================================================
  // Admin 子頁切換函數
  // ============================================================
  window.switchAdminPage = function(page) {
    // 隱藏所有 admin 子頁
    document.querySelectorAll(".admin-page").forEach(el => {
      el.classList.add("hidden");
    });

    // 顯示指定頁
    const target = document.getElementById(`admin-${page}`);
    if (target) {
      target.classList.remove("hidden");
    }

    // 更新 hash
    const hashMap = {
      "stations": "admin/station_mt",
      "fixtures": "admin/fixture_mt",
      "models": "admin/model_mt",
      "owners": "admin/owner_mt",
      "systems": "admin/settings"
    };
    if (hashMap[page]) {
      setHash(hashMap[page]);
      setActiveSubRoute(hashMap[page]);
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

    // 自動載入資料
    setTimeout(() => {
      switch (page) {
        case "stations":
          if (typeof window.stLoadStationMasterList === "function") {
            window.stLoadStationMasterList();
          }
          break;

        case "fixtures":
          if (typeof window.loadFixtureList === "function") {
            window.fxPage = 1;
            window.loadFixtureList();
          }
          break;

        case "models":
          if (typeof window.mmLoadModelList === "function") {
            window.mmLoadModelList();
          }
          break;

        case "owners":
          if (typeof window.loadOwners === "function") {
            window.loadOwners();
          }
          break;
      }
    }, 100);
  };

  // DOM Ready
  window.addEventListener("DOMContentLoaded", async () => {
    // (0) App Bootstrap Gate
    if (typeof window.loadCurrentUser === "function") {
      await window.loadCurrentUser();
    }

    if (typeof window.onCustomerReady === "function") {
      window.onCustomerReady(() => {
        if (typeof window.appStart === "function") {
          window.appStart();
        }
      });
    }

    // (1) Transactions 子頁籤切換
    window.toggleOperationCenterView = function(mode = "hub") {
      const hub = document.getElementById("operationCenterHub");
      const legacy = document.getElementById("transactionsLegacy");
      if (!legacy) return;

      if (mode === "legacy") {
        if (hub) hub.classList.add("hidden");
        legacy.classList.remove("hidden");
      } else {
        if (hub) {
          hub.classList.remove("hidden");
          legacy.classList.add("hidden");
        } else {
          // 當前版面沒有 hub 時，維持 legacy 可見，避免操作中心空白
          legacy.classList.remove("hidden");
        }
      }
    };

    function hideTransactionsRecordPanel() {
      const host = document.getElementById("transactionsRecordHost");
      if (!host) return;
      host.classList.add("hidden");

      const usage = document.getElementById("logtab-usage");
      const replacement = document.getElementById("logtab-replacement");
      if (usage) usage.classList.add("hidden");
      if (replacement) replacement.classList.add("hidden");
      moveRecordPanelsToLogs();
    }
    window.hideTransactionsRecordPanel = hideTransactionsRecordPanel;

    function moveRecordPanelsToLogs() {
      const logsSection = document.getElementById("tab-logs");
      const usage = document.getElementById("logtab-usage");
      const replacement = document.getElementById("logtab-replacement");
      if (!logsSection || !usage || !replacement) return;

      if (usage.parentElement !== logsSection) logsSection.appendChild(usage);
      if (replacement.parentElement !== logsSection) logsSection.appendChild(replacement);
    }
    window.moveRecordPanelsToLogs = moveRecordPanelsToLogs;

    function showTransactionsRecordPanel(kind) {
      const host = document.getElementById("transactionsRecordHost");
      const legacy = document.getElementById("transactionsLegacy");
      const usage = document.getElementById("logtab-usage");
      const replacement = document.getElementById("logtab-replacement");
      if (!host || !legacy || !usage || !replacement) return;

      moveRecordPanelsToLogs();
      legacy.classList.add("hidden");
      host.classList.remove("hidden");

      if (kind === "usage") {
        host.appendChild(usage);
        usage.classList.remove("hidden");
        replacement.classList.add("hidden");
        document.getElementById("usageOpsBarLog")?.classList.remove("hidden");
        if (typeof window.loadUsageLogs === "function") window.loadUsageLogs();
      } else {
        host.appendChild(replacement);
        replacement.classList.remove("hidden");
        usage.classList.add("hidden");
        document.getElementById("replacementOpsBar")?.classList.remove("hidden");
        if (typeof window.loadReplacementLogs === "function") window.loadReplacementLogs(1);
      }
    }

    window.openOperationAction = function(action) {
      if (action === "receipt" || action === "return") {
        setHash("transactions/register");
        showTab("transactions", { updateHash: false });
        setActiveSubRoute(`transactions/${action}`);
        setTimeout(() => {
          if (typeof window.toggleOperationCenterView === "function") {
            window.toggleOperationCenterView("legacy");
          }
          if (typeof window.showTransactionSubTab === "function") {
            window.showTransactionSubTab("ttab-register");
          }
          const direction = document.getElementById("transactionDirection");
          if (direction) direction.value = action;
          if (typeof window.toggleTransactionAdd === "function") {
            window.toggleTransactionAdd(true);
          }
        }, 80);
        return;
      }

      if (action === "usage") {
        setHash("transactions/usage");
        showTab("transactions", { updateHash: false });
        setActiveSubRoute("transactions/usage");
        setTimeout(() => {
          showTransactionsRecordPanel("usage");
        }, 80);
        return;
      }

      if (action === "replacement") {
        setHash("transactions/replacement");
        showTab("transactions", { updateHash: false });
        setActiveSubRoute("transactions/replacement");
        setTimeout(() => {
          showTransactionsRecordPanel("replacement");
        }, 80);
      }
    };

    window.navigateSidebarRoute = function(route) {
      const target = (route || "").replace(/^#/, "");
      if (!target) return;

      const [main, sub] = target.split("/");

      if (main === "dashboard") {
        showTab("dashboard", { updateHash: false });
        setHash("dashboard");
        setActiveSubRoute("dashboard");
        return;
      }

      if (main === "transactions") {
        if (sub === "receipt" || sub === "return" || sub === "usage" || sub === "replacement") {
          window.openOperationAction(sub);
          return;
        }

        showTab("transactions", { updateHash: false });
        if (typeof window.toggleOperationCenterView === "function") {
          window.toggleOperationCenterView(sub ? "legacy" : "hub");
        }

        if (sub === "register") {
          hideTransactionsRecordPanel();
          window.showTransactionSubTab?.("ttab-register");
          return;
        }
        if (sub === "view-all") {
          hideTransactionsRecordPanel();
          window.showTransactionSubTab?.("ttab-view-all");
          return;
        }
        if (sub === "inventory") {
          hideTransactionsRecordPanel();
          window.showTransactionSubTab?.("inventoryTab");
          return;
        }

        setHash("transactions/register");
        setActiveSubRoute("transactions/register");
        return;
      }

      if (main === "logs") {
        showTab("logs", { updateHash: false });
        window.switchLogTab?.(sub || "inventory");
        return;
      }

      if (main === "query") {
        showTab("query", { updateHash: false });
        setHash("query");
        setActiveSubRoute("query");
        if (typeof window.unifiedQuerySearch === "function") {
          window.unifiedQuerySearch();
        } else if (typeof window.loadFixturesQuery === "function") {
          window.loadFixturesQuery();
        }
        return;
      }

      if (main === "admin") {
        showTab("admin", { updateHash: false });
        const adminMap = {
          station_mt: "stations",
          fixture_mt: "fixtures",
          model_mt: "models",
          owner_mt: "owners",
          settings: "systems"
        };
        window.switchAdminPage?.(adminMap[sub] || "fixtures");
      }
    };

    subRouteButtons.forEach(btn => {
      if (btn.__subrouteBound) return;
      btn.__subrouteBound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.navigateSidebarRoute(btn.dataset.route);
      });
    });

    window.showTransactionSubTab = function(tabId) {
      if (tabId === "inventoryTab") {
        showTab("logs", { updateHash: false });
        if (typeof window.switchLogTab === "function") {
          window.switchLogTab("inventory");
        }
        return;
      }

      const tabs = [
          "ttab-register",
          "ttab-view-all",
          "inventoryTab"
        ];
      const buttons = document.querySelectorAll("[data-ttab]");

      // 隱藏所有分頁
      tabs.forEach(id => {
        const tab = document.getElementById(id);
        if (tab) tab.classList.add("hidden");
      });

      // 顯示指定分頁
      const targetTab = document.getElementById(tabId);
      if (targetTab) targetTab.classList.remove("hidden");

      // 更新按鈕樣式
      buttons.forEach(btn => {
        // 處理 inventoryTab 的特殊情況
        const btnValue = btn.dataset.ttab;
        let isMatch = false;

        if (tabId === "inventoryTab" && btnValue === "inventory") {
          isMatch = true;
        } else if (tabId.startsWith("ttab-") && btnValue === tabId.replace("ttab-", "")) {
          isMatch = true;
        }

        if (isMatch) {
          btn.classList.add("subtab-active");
        } else {
          btn.classList.remove("subtab-active");
        }
      });

      // 更新 hash
      const hashMap = {
        "ttab-register": "transactions/register",
        "ttab-view-all": "transactions/view-all",
        "inventoryTab": "transactions/inventory"
      };
      if (hashMap[tabId]) {
        setHash(hashMap[tabId]);
        setActiveSubRoute(hashMap[tabId]);
      }

      if (typeof window.toggleOperationCenterView === "function") {
        window.toggleOperationCenterView("legacy");
      }
      hideTransactionsRecordPanel();

      // 載入資料
      if (tabId === "ttab-view-all" && typeof window.loadTransactionViewAll === "function") {
        window.loadTransactionViewAll(1);
      }
    };

    // (2) 啟動頁籤
    const initialTab = normalizeHash(location.hash);
    const initialSubTab = getSubTab(location.hash);

    if (initialTab === "transactions" && !initialSubTab) {
      setHash("transactions/register");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "logs" && !initialSubTab) {
      setHash("logs/inventory");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "admin" && !initialSubTab) {
      setHash("admin/fixture_mt");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "query" && !initialSubTab) {
      setHash("query");
      showTab(initialTab, { updateHash: false });
    } else {
      showTab(initialTab, { updateHash: true });
    }

    setActiveSubRoute(location.hash.replace(/^#/, "") || "dashboard");

    if (initialTab === "transactions" && typeof window.toggleOperationCenterView === "function") {
      window.toggleOperationCenterView("legacy");
    }

    // (3) 觸發子頁籤切換
    const shouldTriggerSubTab =
      initialSubTab ||
      (initialTab === "logs") ||
      (initialTab === "admin") ||
      (initialTab === "transactions");

    if (shouldTriggerSubTab) {
      setTimeout(() => {
        if (initialTab === "transactions") {
          const ttabMap = {
            "register": "ttab-register",
            "view-all": "ttab-view-all",
            "inventory": "inventoryTab"
          };
          const targetSubTab = initialSubTab || "register";
          const ttabValue = ttabMap[targetSubTab];

          if (ttabValue && typeof window.showTransactionSubTab === "function") {
            window.showTransactionSubTab(ttabValue);
          }
        }

        if (initialTab === "logs") {
          const logtabMap = {
            "inventory": "inventory",
            "lifecycle": "lifecycle",
            "usage": "usage",
            "replacement": "replacement"
          };
          const targetSubTab = initialSubTab || "inventory";
          const logtabValue = logtabMap[targetSubTab];
          if (logtabValue && typeof window.switchLogTab === "function") {
            window.switchLogTab(logtabValue);
          }
        }

        if (initialTab === "admin") {
          const adminMap = {
            "station_mt": "stations",
            "fixture_mt": "fixtures",
            "model_mt": "models",
            "owner_mt": "owners",
            "settings": "systems"
          };
          const targetSubTab = initialSubTab || "fixture_mt";
          const adminPage = adminMap[targetSubTab];
          if (adminPage && typeof window.switchAdminPage === "function") {
            window.switchAdminPage(adminPage);
          }
        }
      }, 100);
    }

    // (4) Logs 子分頁
    function mountInventoryIntoLogs() {
      const host = document.getElementById("logsInventoryHost");
      const inventoryPanel = document.getElementById("inventoryTab");
      if (!host || !inventoryPanel) return;
      if (inventoryPanel.parentElement !== host) {
        host.appendChild(inventoryPanel);
      }
    }

    async function loadLifecycleAdvancedAnalytics() {
      try {
        const [mtbf, failureRate, distribution, trend] = await Promise.all([
          api("/lifecycle-analysis/mtbf"),
          api("/lifecycle-analysis/failure-rate"),
          api("/lifecycle-analysis/lifespan-distribution"),
          api("/lifecycle-analysis/monthly-trend")
        ]);

        const mtbfEl = document.getElementById("lc-mtbf");
        const failuresEl = document.getElementById("lc-failures");
        const rateEl = document.getElementById("lc-failure-rate");
        const breakdownEl = document.getElementById("lc-failure-breakdown");
        const distEl = document.getElementById("lc-distribution");
        const trendEl = document.getElementById("lc-monthly-trend");

        if (mtbfEl) mtbfEl.textContent = mtbf?.average_lifespan ? Number(mtbf.average_lifespan).toFixed(2) : "-";
        if (failuresEl) failuresEl.textContent = `失效數: ${mtbf?.total_failures ?? 0}`;
        if (rateEl) rateEl.textContent = `${failureRate?.failure_rate_percent ?? 0}%`;
        if (breakdownEl) {
          breakdownEl.textContent = `premature ${failureRate?.premature_count ?? 0} / normal ${failureRate?.normal_expired_count ?? 0}`;
        }

        if (distEl) {
          if (!distribution?.length) {
            distEl.innerHTML = `<div class="text-gray-400">無資料</div>`;
          } else {
            distEl.innerHTML = distribution
              .map(d => `<div class="flex justify-between"><span>${d.lifespan_range}</span><span class="font-semibold">${d.total}</span></div>`)
              .join("");
          }
        }

        if (trendEl) {
          if (!trend?.length) {
            trendEl.innerHTML = `<div class="text-gray-400">無資料</div>`;
          } else {
            trendEl.innerHTML = trend
              .map(t => `<div class="flex justify-between"><span>${t.month}</span><span class="font-semibold text-red-600">${t.premature_count}</span></div>`)
              .join("");
          }
        }
      } catch (e) {
        console.warn("loadLifecycleAdvancedAnalytics failed", e);
      }
    }

    window.switchLogTab = function(target) {
      const inventoryTab = document.getElementById("logtab-inventory");
      const lifecycleTab = document.getElementById("logtab-lifecycle");
      const usageTab = document.getElementById("logtab-usage");
      const replaceTab = document.getElementById("logtab-replacement");
      const tabButtons = document.querySelectorAll("[data-logtab]");

      tabButtons.forEach(btn => {
        if (btn.dataset.logtab === target) {
          btn.classList.add("subtab-active");
        } else {
          btn.classList.remove("subtab-active");
        }
      });

      [inventoryTab, lifecycleTab, usageTab, replaceTab]
        .forEach(el => el && el.classList.add("hidden"));

      const usageOpsBar = document.getElementById("usageOpsBarLog");
      const replacementOpsBar = document.getElementById("replacementOpsBar");

      if (target === "inventory" && inventoryTab) {
        mountInventoryIntoLogs();
        moveRecordPanelsToLogs();
        inventoryTab.classList.remove("hidden");
        const inventoryPanel = document.getElementById("inventoryTab");
        if (inventoryPanel) inventoryPanel.classList.remove("hidden");
        if (typeof window.loadInventoryOverview === "function") {
          window.loadInventoryOverview(1);
        }
      } else if (target === "lifecycle" && lifecycleTab) {
        moveRecordPanelsToLogs();
        lifecycleTab.classList.remove("hidden");
        if (typeof window.loadLifecycleDashboard === "function") {
          window.loadLifecycleDashboard();
        }
        loadLifecycleAdvancedAnalytics();
      } else if (target === "usage" && usageTab) {
        moveRecordPanelsToLogs();
        usageTab.classList.remove("hidden");
        if (usageOpsBar) usageOpsBar.classList.remove("hidden");
      } else if (target === "replacement" && replaceTab) {
        moveRecordPanelsToLogs();
        replaceTab.classList.remove("hidden");
        if (replacementOpsBar) replacementOpsBar.classList.remove("hidden");
      }

      const hashMap = {
        "inventory": "logs/inventory",
        "lifecycle": "logs/lifecycle",
        "usage": "logs/usage",
        "replacement": "logs/replacement"
      };
      if (hashMap[target]) {
        setHash(hashMap[target]);
        setActiveSubRoute(hashMap[target]);
      }
    };

    const logtabBtns = document.querySelectorAll("[data-logtab]");
    logtabBtns.forEach(btn => {
      if (btn.__logtabBound) return;
      btn.__logtabBound = true;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const target = btn.dataset.logtab;
        window.switchLogTab(target);
      });
    });

    // (6) Admin 子選單按鈕
    document.querySelectorAll(".admin-menu").forEach(btn => {
      if (btn.__adminBound) return;
      btn.__adminBound = true;

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const page = btn.dataset.adminPage;
        window.switchAdminPage(page);
      });
    });

    window.goAdminPage = function (page) {
      // 1️⃣ 切主頁籤（不要讓它自己改 hash）
      showTab("admin", { updateHash: false });

      // 2️⃣ 切 admin 子頁（這裡會負責 hash + load）
      setTimeout(() => {
        if (typeof window.switchAdminPage === "function") {
          window.switchAdminPage(page);
        }
      }, 0);
    };

    window.goToTransactionSerialSearch = function ({
      fixture_id,
      date_from,
      date_to
    }) {
      // 1️⃣ 切到「交易」主頁籤（不要讓它自己亂改 hash）
      showTab("transactions", { updateHash: false });

      // 2️⃣ 切到「交易記錄 / 總檢視」
      setTimeout(() => {
        showTransactionSubTab("ttab-view-all");

        // 3️⃣ 切成「序號查詢模式」
        switchViewAllMode("serial");

        // 4️⃣ 塞查詢條件
        if (fixture_id) {
          const el = document.getElementById("vaSerialFixture");
          if (el) el.value = fixture_id;
        }

        if (date_from) {
          const el = document.getElementById("vaSerialDateFrom");
          if (el) el.value = date_from;
        }

        if (date_to) {
          const el = document.getElementById("vaSerialDateTo");
          if (el) el.value = date_to;
        }

        // 5️⃣ 查詢
        loadTransactionViewAll(1);
      }, 0);
    };

    window.goToInventoryByFixture = function (fixture_id) {
      if (!fixture_id) return;

      // 關 Drawer
      if (typeof window.__activeOverlayCloser === "function") {
        window.__activeOverlayCloser();
        window.__activeOverlayCloser = null;
      }

      // 切主 tab
      showTab("logs", { updateHash: false });

      setTimeout(() => {
        if (typeof window.switchLogTab === "function") {
          window.switchLogTab("inventory");
        }

        // 帶查詢條件
        const input = document.getElementById("invSearchKeyword");
        if (input) {
          input.value = fixture_id;
        }

        if (typeof window.loadInventoryOverview === "function") {
          window.loadInventoryOverview(1);
        }
      }, 0);
    };


    // (7) 啟動時鐘
    function updateClock() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const clockEl = document.getElementById("clock");

      if (clockEl) clockEl.textContent = `${hh}:${mm}`;
    }

    updateClock();
    setInterval(updateClock, 1000);
  });
})();
