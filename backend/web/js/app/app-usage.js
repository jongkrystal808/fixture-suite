    /**
     * 使用記錄前端控制 (v4.x PATCHED)
     * -----------------------------------------------------------
     * 重點修正：
     * 1) v4.x：customer 由 header/context 決定 → 不再帶 customer_id
     * 2) 修正 usageStationSelect 未宣告（改用 stationInput）
     * 3) used_at 送 ISO 字串（避免 Date 物件被序列化成奇怪格式）
     * 4) 全面加上 DOM null guard，避免頁面尚未載入就報錯
     * 5) renderUsageTable：時間格式化、serial 欄位相容（serial_number / serials）
     * -----------------------------------------------------------
     */

    let usagePage = 1;
    const usagePageSize = 20;

    /* ============================================================
     * DOM 綁定
     * ============================================================ */

    const fxInput        = document.getElementById("usageAddFixture");
    const fxDropdown     = document.getElementById("usageFixtureDropdown");
    const modelInput     = document.getElementById("usageAddModel");
    const stationInput   = document.getElementById("usageAddStation");

    const levelSelect    = document.getElementById("usageAddLevel");
    const serialsInput   = document.getElementById("usageAddSerials");
    const batchStart     = document.getElementById("usageAddSerialStart");
    const batchEnd       = document.getElementById("usageAddSerialEnd");

    const countInput     = document.getElementById("usageAddCount");
    const countLabel = document.getElementById("usageAddCountLabel");

    const operatorInput  = document.getElementById("usageAddOperator");
    const usedAtInput    = document.getElementById("usageAddTime");
    const noteInput      = document.getElementById("usageAddNote");

    const usageTableBody = document.getElementById("usageTable");

    let fxOptions = []; // 目前站點下可用治具快取
    let selectedFixtureId = null; // ✅ 只能選的關鍵狀態

    /* ============================================================
     * Utils
     * ============================================================ */
    function fmtDate(v) {
      if (!v) return "-";
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }


    async function updateCycleLabelByFixture(fixtureId) {
      if (!fixtureId || !countLabel) return;

      try {
        const data = await api(`/fixtures/${fixtureId}`);

        if (data.cycle_unit === "uses") {
          countLabel.textContent = "使用次數 *";
        } else if (data.cycle_unit === "days") {
          countLabel.textContent = "使用天數 *";
        } else {
          countLabel.textContent = "使用數值 *";
        }

      } catch (err) {
        console.error(err);
      }
    }


    // 🔵 使用日期預設為今天（YYYY-MM-DD）
    if (usedAtInput && !usedAtInput.value) {
      const today = new Date().toISOString().slice(0, 10);
      usedAtInput.value = today;
    }

    function fmtDateInput(d) {
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    function quickDateRange(type) {
      const fromEl = document.getElementById("usageSearchDateFrom");
      const toEl   = document.getElementById("usageSearchDateTo");
      if (!fromEl || !toEl) return;

      const today = new Date();
      let from, to;

      switch (type) {
        case "today":
          from = new Date(today);
          to   = new Date(today);
          break;

        case "yesterday":
          from = new Date(today);
          from.setDate(from.getDate() - 1);
          to = new Date(from);
          break;

        case "7days":
          to = new Date(today);
          from = new Date(today);
          from.setDate(from.getDate() - 6); // 含今天共 7 天
          break;

        default:
          return;
      }

      fromEl.value = fmtDateInput(from);
      toEl.value   = fmtDateInput(to);

      // 🔥 直接重新查詢
      loadUsageLogs();
    }

    window.quickDateRange = quickDateRange;


    /* ============================================================
     * 🔍 Lookup：依機種載入站點
     * ============================================================ */
    async function loadStationsByModel(modelId) {
      if (!stationInput || !("innerHTML" in stationInput)) return;

      stationInput.innerHTML = `<option value="">載入中...</option>`;
      stationInput.disabled = true;

      try {
        const rows = await api("/model-detail/lookup/stations-by-model", {
          params: { model_id: modelId },
        });

        stationInput.innerHTML = "";

        if (!Array.isArray(rows) || rows.length === 0) {
          stationInput.innerHTML = `<option value="">此機種尚未綁定站點</option>`;
          return;
        }

        stationInput.appendChild(new Option("請選擇站點", ""));
        rows.forEach(r => {
          stationInput.appendChild(
            new Option(`${r.station_id} - ${r.station_name ?? ""}`, r.station_id)
          );
        });

        stationInput.disabled = false;
      } catch (err) {
        console.error(err);
        stationInput.innerHTML = `<option value="">讀取站點失敗</option>`;
      }
    }

    /* ============================================================
     * 🔍 Lookup：依機種 + 站點載入治具（Dropdown）
     * ============================================================ */
    async function loadFixturesByModelStation(modelId, stationId) {
      if (!fxInput || !fxDropdown) return;

      fxDropdown.classList.add("hidden");
      fxDropdown.innerHTML = "";
      fxOptions = [];

      try {
        const rows = await api(
          "/model-detail/lookup/fixtures-by-model-station",
          {
            params: { model_id: modelId, station_id: stationId },
          }
        );

        if (!Array.isArray(rows) || rows.length === 0) return;

        // 🔥 v6 強化：只顯示可用治具
        const filtered = rows.filter(r => {

          // 🟢 fixture 模式：只要在庫就可以用
          if (r.lifecycle_mode === "fixture") {
            return r.existence_status === "in_stock";
          }

          // 🔵 serial 模式：必須在庫 + idle
          return (
            r.existence_status === "in_stock" &&
            r.usage_status === "idle"
          );
        });

        if (filtered.length === 0) {
          toast("目前沒有可使用的治具", "warning");
          return;
        }

        fxOptions = filtered;
        renderFixtureDropdown(filtered);

      } catch (err) {
        console.error(err);
      }
    }
    /* ============================================================
     * 治具 dropdown render + filter
     * ============================================================ */
    function renderFixtureDropdown(options) {
      if (!fxDropdown) return;

      fxDropdown.innerHTML = "";

      if (!Array.isArray(options) || options.length === 0) {
        fxDropdown.classList.add("hidden");
        return;
      }

      options.forEach(r => {
        const item = document.createElement("div");
        item.className = "px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm";
        item.textContent = `${r.fixture_id} ${r.fixture_name ?? ""}`;

        item.onclick = () => {
          fxInput.value = r.fixture_id;
          selectedFixtureId = r.fixture_id;
          fxDropdown.classList.add("hidden");

          // 🔥 新增這行
          updateCycleLabelByFixture(r.fixture_id);
        };


        fxDropdown.appendChild(item);
      });

      fxDropdown.classList.remove("hidden");
    }

    /* ============================================================
     * dropdown 互動控制
     * ============================================================ */
     fxInput?.addEventListener("input", () => {
       // ❌ 只要手動輸入，就視為尚未選擇
       selectedFixtureId = null;

       if (!fxDropdown || fxDropdown.classList.contains("hidden")) return;

       const q = fxInput.value.trim().toLowerCase();
       const filtered = fxOptions.filter(r =>
         `${r.fixture_id} ${r.fixture_name ?? ""}`.toLowerCase().includes(q)
       );
       renderFixtureDropdown(filtered);
     });


    document.addEventListener("click", (e) => {
      if (!fxDropdown || !fxInput) return;
      if (e.target !== fxInput && !fxDropdown.contains(e.target)) {
        fxDropdown.classList.add("hidden");
      }
    });
    // ✅ focus 時自動打開 dropdown（UX 強化）
    fxInput?.addEventListener("focus", () => {
      if (fxOptions.length > 0) {
        renderFixtureDropdown(fxOptions);
      }
    });


    /* ============================================================
     * 欄位串接
     * ============================================================ */
    modelInput?.addEventListener("change", () => {
      const modelId = modelInput.value.trim();

      if (stationInput && "innerHTML" in stationInput) {
        stationInput.innerHTML = `<option value="">請先選擇機種</option>`;
        stationInput.disabled = true;
      }

      fxInput.value = "";
      selectedFixtureId = null;
      fxDropdown?.classList.add("hidden");
      fxOptions = [];

      if (modelId) loadStationsByModel(modelId);
    });

    stationInput?.addEventListener("change", () => {
      const modelId = modelInput?.value.trim();
      const stationId = stationInput.value.trim();
      if (modelId && stationId) {
        fxInput.value = "";
        selectedFixtureId = null;
        loadFixturesByModelStation(modelId, stationId);
      }
    });

    /* ============================================================
     * UI Mode 切換
     * ============================================================ */
    function toggleUsageSerialInputs() {
      const mode = levelSelect?.value;
      document.getElementById("usageSerialSingleField")?.classList.toggle("hidden", mode !== "individual");
      document.getElementById("usageSerialBatchField")?.classList.toggle("hidden", mode !== "batch");
    }
    levelSelect?.addEventListener("change", toggleUsageSerialInputs);
    toggleUsageSerialInputs();

    /* ============================================================
     * 新增使用紀錄
     * ============================================================ */
    async function submitUsageLog() {
      if (!window.currentCustomerId) return toast("尚未選擇客戶", "warning");

      const payload = {
        fixture_id: fxInput?.value.trim(),
        model_id: modelInput?.value.trim(),
        station_id: stationInput?.value.trim(),
        record_level: levelSelect?.value || "fixture",
        use_count: Number(countInput?.value) || 1,
        operator: (operatorInput?.value || "").trim() || window.currentUserName || "",
        used_at: usedAtInput?.value
          ? new Date(usedAtInput.value).toISOString()
          : new Date().toISOString(),
        note: (noteInput?.value || "").trim() || null,
      };

      if (!payload.fixture_id) return toast("請選擇治具", "warning");
      if (!payload.model_id) return toast("請輸入機種 ID", "warning");
      if (!payload.station_id) return toast("請選擇站點", "warning");
      if (payload.use_count <= 0) return toast("使用次數需大於 0", "warning");

      // 🔒 治具只能從清單選
      if (!selectedFixtureId || selectedFixtureId !== payload.fixture_id) {
        return toast("治具必須從清單中選擇", "warning");
        }

      if (payload.record_level === "individual") {
        payload.serials = parseIndividualSerials(serialsInput?.value || "");
        if (!payload.serials.length) return toast("請輸入序號", "warning");
      }

      if (payload.record_level === "batch") {
        try {
          payload.serials = expandBatchSerials(batchStart?.value || "", batchEnd?.value || "");
        } catch (e) {
          return toast(e.message, "error");
        }
      }

      try {
        await api("/usage", { method: "POST", body: payload });
        toast("使用紀錄新增成功");
        loadUsageLogs();
        toggleUsageAdd(false);
      } catch (err) {
        console.error(err);
        toast(err?.data?.detail || err?.message || "新增使用紀錄失敗", "error");
      }
    }
    window.submitUsageLog = submitUsageLog;


    /* ============================================================
     * 查詢使用紀錄
     * ============================================================ */
    async function loadUsageLogs(page = 1) {
      if (!window.currentCustomerId) return;

      usagePage = page;

      const fixture  = document.getElementById("usageSearchFixture")?.value.trim();
      const serial   = document.getElementById("usageSearchSerial")?.value.trim();
      const station  = document.getElementById("usageSearchStation")?.value.trim();
      const operator = document.getElementById("usageSearchOperator")?.value.trim();
      const model    = document.getElementById("usageSearchModel")?.value.trim();

      const params = {
        skip: (usagePage - 1) * usagePageSize,
        limit: usagePageSize,
      };

      if (fixture)  params.fixture_id = fixture;
      if (serial)   params.serial_number = serial;
      if (station)  params.station_id = station;
      if (operator) params.operator = operator;
      if (model)    params.model_id = model;

      const dateFrom = document.getElementById("usageSearchDateFrom")?.value;
      const dateTo   = document.getElementById("usageSearchDateTo")?.value;

      if (dateFrom) {
        params.date_from = new Date(dateFrom).toISOString();
      }

      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.date_to = end.toISOString();
      }

      try {
        const rows = await api("/usage", { params });
        const list = Array.isArray(rows) ? rows : [];

        renderUsageTable(list);

        // ⭐ 關鍵：畫分頁
        renderPagination(
          "usagePagination",
          list.length < usagePageSize
            ? (usagePage - 1) * usagePageSize + list.length
            : usagePage * usagePageSize + 1,
          usagePage,
          usagePageSize,
          p => loadUsageLogs(p)
        );

      } catch (err) {
        console.error(err);
        toast("查詢使用紀錄失敗", "error");
      }
    }

    window.loadUsageLogs = loadUsageLogs;

    /* ============================================================
     * 使用紀錄表格
     * ============================================================ */

    function renderUsageTable(rows) {
      if (!usageTableBody) return;

      usageTableBody.innerHTML = "";

      if (!Array.isArray(rows) || rows.length === 0) {
        usageTableBody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-gray-400 py-3">沒有資料</td>
          </tr>
        `;
        return;
      }

      rows.forEach((r) => {
        const tr = document.createElement("tr");

        // serial 相容：serial_number / serials(array)
        const serialText =
          r.serial_number ??
          (Array.isArray(r.serials) ? r.serials.join(", ") : null) ??
          "-";

        tr.innerHTML = `
          <td class="py-2 pr-4">${fmtDate(r.used_at)}</td>
          <td class="py-2 pr-4">${r.fixture_id ?? "-"}</td>
          <td class="py-2 pr-4">${serialText}</td>
          <td class="py-2 pr-4">${r.station_name ?? r.station_id ?? "-"}</td>
          <td class="py-2 pr-4">${r.model_name ?? r.model_id ?? "-"}</td>
          <td class="py-2 pr-4">${r.use_count ?? "-"}</td>
          <td class="py-2 pr-4">${r.operator ?? "-"}</td>
          <td class="py-2 pr-4">${r.note ?? "-"}</td>
          <td class="py-2 pr-4">
            <button class="btn btn-xs btn-error" onclick="deleteUsage(${JSON.stringify(
              r.id
            )})">
              刪除
            </button>
          </td>
        `;

        usageTableBody.appendChild(tr);
      });
    }

    /* ============================================================
     * 刪除紀錄
     * ============================================================ */

    async function deleteUsage(id) {
      if (!id) return;

      if (!confirm("確定要刪除此使用紀錄？")) return;

      try {
        await api(`/usage/${id}`, {
          method: "DELETE",
          params: { delete_zero_summary: true },
        });

        toast("已刪除");
        loadUsageLogs();
      } catch (err) {
        console.error(err);
        toast(err?.data?.detail || err?.message || "刪除失敗", "error");
      }
    }

    window.deleteUsage = deleteUsage;

    /* ============================================================
     * 🔵 使用記錄 / 更換記錄 TAB 切換控制 (v4.0)
     * ============================================================ */
    document.querySelectorAll(".subtab").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.logtab; // usage / replacement

        document
          .querySelectorAll(".subtab")
          .forEach((b) => b.classList.remove("subtab-active"));
        btn.classList.add("subtab-active");

        document.getElementById("logtab-usage")?.classList.add("hidden");
        document.getElementById("logtab-replacement")?.classList.add("hidden");

        if (target === "usage") {
          document.getElementById("logtab-usage")?.classList.remove("hidden");
        } else if (target === "replacement") {
          document.getElementById("logtab-replacement")?.classList.remove("hidden");
        }
      });
    });

    /* ============================================================
     * 🔵 使用記錄：新增表單顯示 / 隱藏
     * ============================================================ */
    function toggleUsageAdd(show) {
      const form = document.getElementById("usageAddForm");
      if (!form) return;

      if (show) form.classList.remove("hidden");
      else form.classList.add("hidden");
    }

    window.toggleUsageAdd = toggleUsageAdd;

    /* ============================================================
     * v4.x：初始化時序（等 customer ready 再載入）
     * ============================================================ */
    onUserReady?.(() => {
      onCustomerReady?.(() => {
        loadUsageLogs();
      });
    });



    // ============================================================
    // Usage - Download Import Template (final, aligned with TokenManager)
    // ============================================================
    window.downloadUsageTemplate = async function () {
      try {
        if (!window.currentCustomerId) {
          toast("請先選擇客戶", "warning");
          return;
        }

        // 🔑 正確取得 token（與 api() 完全一致）
        let token = null;

        if (window.TokenManager && typeof window.TokenManager.getToken === "function") {
          token = window.TokenManager.getToken();
        } else if (typeof window.getToken === "function") {
          token = window.getToken();
        }

        if (!token) {
          toast("尚未登入（無法取得 Token）", "error");
          return;
        }

        const res = await fetch("/api/v2/usage/template", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-Customer-Id": window.currentCustomerId,
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        // ❗ binary 一定要直接 blob
        const blob = await res.blob();

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "usage_import_template.xlsx";
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error(err);
        toast("下載樣本失敗（請確認登入狀態）", "error");
      }
    };





    // ============================================================
    // Usage - Parse individual serials (comma separated)
    // ============================================================
    function parseIndividualSerials(input) {
      if (!input) return [];

      return input
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }

    // ============================================================
    // Usage - Expand batch serials (frontend helper)
    // e.g. SN001 ~ SN010
    // ============================================================
    function expandBatchSerials(start, end) {
      if (!start || !end) {
        throw new Error("批量序號需同時填寫起始與結束");
      }

      // 抽出前綴 + 數字
      const m1 = start.match(/^(\D*)(\d+)$/);
      const m2 = end.match(/^(\D*)(\d+)$/);

      if (!m1 || !m2) {
        throw new Error("序號格式需為：前綴 + 數字（如 SN001）");
      }

      const prefix1 = m1[1];
      const prefix2 = m2[1];
      if (prefix1 !== prefix2) {
        throw new Error("起始與結束序號前綴不一致");
      }

      const n1 = parseInt(m1[2], 10);
      const n2 = parseInt(m2[2], 10);
      if (n2 < n1) {
        throw new Error("結束序號不可小於起始序號");
      }

      const width = m1[2].length;
      const result = [];

      for (let i = n1; i <= n2; i++) {
        result.push(prefix1 + String(i).padStart(width, "0"));
      }

      return result;
    }

    // ============================================================
    // Usage - Import Excel (xlsx)
    // ============================================================
    window.handleUsageImport = async function (input) {
      try {
        if (!input || !input.files || input.files.length === 0) {
          return;
        }

        if (!window.currentCustomerId) {
          toast("請先選擇客戶", "warning");
          input.value = "";
          return;
        }

        const file = input.files[0];
        if (!file.name.toLowerCase().endsWith(".xlsx")) {
          toast("請選擇 xlsx 檔案", "warning");
          input.value = "";
          return;
        }

        // 🔑 正確取得 token（與 api() 一致）
        let token = null;
        if (window.TokenManager?.getToken) {
          token = window.TokenManager.getToken();
        } else if (typeof window.getToken === "function") {
          token = window.getToken();
        }

        if (!token) {
          toast("尚未登入（無法取得 Token）", "error");
          input.value = "";
          return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/v2/usage/import", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-Customer-Id": window.currentCustomerId,
          },
          body: formData,
        });

        if (!res.ok) {
          let msg = `匯入失敗 (${res.status})`;
          try {
            const data = await res.json();
            if (data?.detail) msg = data.detail;
          } catch (_) {}
          throw new Error(msg);
        }

        const result = await res.json();

        // 成功提示
        toast(
          `匯入完成：成功 ${result.success_count} 筆，失敗 ${result.error_count} 筆`,
          "success"
        );

        // 若有錯誤，印到 console 方便 debug
        if (Array.isArray(result.errors) && result.errors.length > 0) {
          console.warn("Usage import errors:", result.errors);
        }

        // 重新載入列表
        loadUsageLogs();
      } catch (err) {
        console.error(err);
        toast(err.message || "匯入使用記錄失敗", "error");
      } finally {
        // 重置 input，避免同檔案無法再次觸發 onchange
        input.value = "";
      }
    };
