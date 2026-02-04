// 簡易 hash router + 頁籤切換
// 全域目前開啟的浮層關閉函式
window.__activeOverlayCloser = null;

(function () {
  const TAB_CONFIG = {
    dashboard: {
      sectionId: "tab-dashboard",
      title: "儀表板"
    },
    transactions: {
      sectionId: "tab-transactions",
      title: "收料 / 退料登記"
    },
    query: {
      sectionId: "tab-query",
      title: "治具 / 機種查詢"
    },
    logs: {
      sectionId: "tab-logs",
      title: "使用 / 更換記錄"
    },
    admin: {
      sectionId: "tab-admin",
      title: "後台管理"
    }
  };

  const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
  const sections = {};
  Object.keys(TAB_CONFIG).forEach(key => {
    sections[key] = document.getElementById(TAB_CONFIG[key].sectionId);
  });

  const bannerTitle = document.getElementById("activeTabTitle");
  let currentTab = null;
  const loadedFlags = {};

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
                    window.switchLogTab("usage");
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

      if (tabKey === "transactions") {
        setHash("transactions/register");
        showTab(tabKey, { updateHash: false });
      } else if (tabKey === "logs") {
        setHash("logs/usage");
        showTab(tabKey, { updateHash: false });
      } else if (tabKey === "admin") {
        setHash("admin/fixture_mt");
        showTab(tabKey, { updateHash: false });
      } else if (tabKey === "query") {
        setHash("query/fixtures");
        showTab(tabKey, { updateHash: false });
      } else {
        const hash = btn.dataset.hash || tabKey;
        showTab(tabKey, { updateHash: true });
        setHash(hash);
      }
    });
  });

  // 監聽 hash 改變
  window.addEventListener("hashchange", () => {
    const tabKey = normalizeHash(location.hash);
    showTab(tabKey, { updateHash: false });
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
    window.showTransactionSubTab = function(tabId) {
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
      }

      // 載入資料
      if (tabId === "ttab-view-all" && typeof window.loadTransactionViewAll === "function") {
        window.loadTransactionViewAll(1);
      }
      if (tabId === "inventoryTab" && typeof window.loadInventory === "function") {
        window.loadInventory();
      }
    };

    // (2) 啟動頁籤
    const initialTab = normalizeHash(location.hash);
    const initialSubTab = getSubTab(location.hash);

    if (initialTab === "transactions" && !initialSubTab) {
      setHash("transactions/register");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "logs" && !initialSubTab) {
      setHash("logs/usage");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "admin" && !initialSubTab) {
      setHash("admin/fixture_mt");
      showTab(initialTab, { updateHash: false });
    } else if (initialTab === "query" && !initialSubTab) {
      setHash("query/fixtures");
      showTab(initialTab, { updateHash: false });
    } else {
      showTab(initialTab, { updateHash: true });
    }

    // (3) 觸發子頁籤切換
    const shouldTriggerSubTab = initialSubTab || (initialTab === "transactions") || (initialTab === "logs") || (initialTab === "admin") || (initialTab === "query");

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

        if (initialTab === "query") {
          const queryMap = {
            "fixtures": "fixture",
            "model": "model"
          };
          const targetSubTab = initialSubTab || "fixtures";
          const queryValue = queryMap[targetSubTab];

          if (queryValue) {
            const select = document.getElementById("queryType");
            if (select) {
              select.value = queryValue;
              if (typeof window.switchQueryType === "function") {
                window.switchQueryType();
              }
            }
          }
        }

        if (initialTab === "logs") {
          const logtabMap = {
            "usage": "usage",
            "replacement": "replacement"
          };
          const targetSubTab = initialSubTab || "usage";
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

    // (4) Query 子分頁
   window.switchQueryType = function(type) {
      const select = document.getElementById("queryType");
      if (!select) return;

      if (!type) type = select.value;
      else select.value = type;

      const hashMap = {
        "fixture": "query/fixtures",
        "model": "query/model"
      };
      if (hashMap[type]) {
        setHash(hashMap[type]);
      }

      const fixtureTab = document.getElementById("fixtureQueryArea");
      const modelTab = document.getElementById("modelQueryArea");

      if (fixtureTab) fixtureTab.classList.toggle("hidden", type !== "fixture");
      if (modelTab) modelTab.classList.toggle("hidden", type !== "model");

      // 資料載入（只在切到時）
      if (type === "fixture" && typeof window.loadFixturesQuery === "function") {
        window.loadFixturesQuery();
      }
      if (type === "model" && typeof window.loadModelsQuery === "function") {
        window.loadModelsQuery();
      }
    };


    // (5) Logs 子分頁
    window.switchLogTab = function(target) {
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

      if (usageTab) usageTab.classList.add("hidden");
      if (replaceTab) replaceTab.classList.add("hidden");

      if (target === "usage" && usageTab) {
        usageTab.classList.remove("hidden");
      } else if (target === "replacement" && replaceTab) {
        replaceTab.classList.remove("hidden");
      }

      const hashMap = {
        "usage": "logs/usage",
        "replacement": "logs/replacement"
      };
      if (hashMap[target]) {
        setHash(hashMap[target]);
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
      showTab("transactions", { updateHash: false });

      setTimeout(() => {
        // 切 inventory 子頁
        showTransactionSubTab("inventoryTab");

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