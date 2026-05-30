(function () {
  const SRM_DOMAIN = "@srmist.edu.in";

  const srmIdInput = document.getElementById("srmIdInput");
  const pwInput = document.getElementById("pwInput");
  const togglePw = document.getElementById("togglePw");
  const loginForm = document.getElementById("loginForm");
  const saveBtn = document.getElementById("saveBtn");
  const clearBtn = document.getElementById("clearBtn");
  const accountsStatus = document.getElementById("accountsStatus");
  const accountList = document.getElementById("accountList");
  const statusMsg = document.getElementById("statusMsg");
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const htmlEl = document.documentElement;

  const savedTheme = localStorage.getItem("srm_theme") || "dark";
  htmlEl.setAttribute("data-theme", savedTheme);
  themeIcon.textContent = savedTheme === "dark" ? "light_mode" : "dark_mode";

  if (typeof browserApi !== "undefined" && browserApi.storage) {
    browserApi.storage.local.set({ srm_theme: savedTheme });
  }

  themeToggle.addEventListener("click", () => {
    const currentTheme = htmlEl.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    htmlEl.setAttribute("data-theme", newTheme);
    themeIcon.textContent = newTheme === "dark" ? "light_mode" : "dark_mode";

    localStorage.setItem("srm_theme", newTheme);

    if (typeof browserApi !== "undefined" && browserApi.storage) {
      browserApi.storage.local.set({ srm_theme: newTheme });
    }
  });

  if (!browserApi || !srmIdInput || !pwInput || !loginForm) return;

  function makeIconSpan(iconName) {
    const span = document.createElement("span");
    span.className = "material-symbols-rounded";
    span.setAttribute("aria-hidden", "true");
    span.textContent = iconName;
    return span;
  }

  function normalizeSrmId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/@srmist\.edu\.in$/i, "");
  }

  function isValidSrmId(value) {
    return /^[a-z]{2}[0-9]{4}$/.test(normalizeSrmId(value));
  }

  function toEmail(value) {
    return `${normalizeSrmId(value)}${SRM_DOMAIN}`;
  }

  function createAccount(email, encodedPassword, existing) {
    const now = new Date().toISOString();
    return {
      id: existing
        ? existing.id
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email,
      password: encodedPassword,
      enabled: existing ? existing.enabled !== false : true,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
  }

  function relativeTime(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  let accounts = [];
  let editingAccountId = "";

  async function persistAccounts() {
    await browserApi.storage.local.set({ srm_accounts: accounts });
    await browserApi.storage.local.remove("srm_active_account_id");
  }

  async function loadAccounts() {
    const data = await browserApi.storage.local.get([
      "srm_accounts",
      "srm_active_account_id",
      "srm_email",
      "srm_password",
    ]);

    accounts = Array.isArray(data.srm_accounts)
      ? data.srm_accounts.map(normalizeAccount).filter(Boolean)
      : [];

    if (!accounts.length && data.srm_email && data.srm_password) {
      const migrated = normalizeAccount({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        email: data.srm_email,
        password: data.srm_password,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (migrated) accounts = [migrated];
      await browserApi.storage.local.remove([
        "srm_email",
        "srm_password",
        "srm_active_account_id",
      ]);
    }

    await persistAccounts();

    srmIdInput.value = "";
    pwInput.value = "";
    renderAccounts();
    await renderLog();
  }

  function renderAccounts() {
    const enabledCount = accounts.filter((a) => a.enabled).length;
    const hasAccounts = accounts.length > 0;

    if (accountsStatus) {
      accountsStatus.style.display = hasAccounts ? "inline" : "none";
      accountsStatus.textContent = `${enabledCount}/${accounts.length} enabled`;
    }

    if (!accountList) return;
    accountList.classList.toggle("visible", hasAccounts);
    accountList.textContent = "";

    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = `account-row ${account.enabled ? "enabled" : "disabled"}`;

      const emailEl = document.createElement("span");
      emailEl.className = "account-email";
      emailEl.title = account.email;
      emailEl.textContent = account.email;

      const lastUsedEl = document.createElement("span");
      lastUsedEl.className = "account-last-used";
      lastUsedEl.textContent = relativeTime(account.lastUsed);

      const toggleBtn = document.createElement("button");
      toggleBtn.className = "account-action account-toggle";
      toggleBtn.type = "button";
      toggleBtn.setAttribute(
        "aria-label",
        `${account.enabled ? "Disable" : "Enable"} auto-login for ${account.email}`,
      );
      toggleBtn.setAttribute("aria-pressed", String(account.enabled));
      toggleBtn.replaceChildren(
        makeIconSpan(account.enabled ? "toggle_on" : "toggle_off"),
      );
      toggleBtn.addEventListener("click", async () => {
        account.enabled = !account.enabled;
        account.updatedAt = new Date().toISOString();
        await persistAccounts();
        renderAccounts();
      });

      const editBtn = document.createElement("button");
      editBtn.className = "account-action";
      editBtn.type = "button";
      editBtn.setAttribute("aria-label", `Edit ${account.email}`);
      editBtn.replaceChildren(makeIconSpan("edit"));
      editBtn.addEventListener("click", () => {
        editingAccountId = account.id;
        srmIdInput.value = normalizeSrmId(account.email);
        pwInput.value = "";

        pwInput.placeholder = "(unchanged \u2014 type to update)";
        pwInput.type = "password";
        togglePw.setAttribute("aria-label", "Show password");
        togglePw.replaceChildren(makeIconSpan("visibility"));
        if (saveBtn) saveBtn.textContent = "Update account";
        hideStatus();
        pwInput.focus();
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "account-action";
      deleteBtn.type = "button";
      deleteBtn.setAttribute("aria-label", `Delete ${account.email}`);
      deleteBtn.replaceChildren(makeIconSpan("delete"));
      deleteBtn.addEventListener("click", async () => {
        accounts = accounts.filter((saved) => saved.id !== account.id);
        if (editingAccountId === account.id) resetForm();
        await persistAccounts();
        renderAccounts();
      });

      row.append(emailEl, lastUsedEl, toggleBtn, editBtn, deleteBtn);
      accountList.append(row);
    });
  }

  async function renderLog() {
    const logSection = document.getElementById("logSection");
    const logBody = document.getElementById("logBody");
    if (!logSection || !logBody) return;

    const data = await browserApi.storage.local.get("srm_login_log");
    let logs = Array.isArray(data.srm_login_log)
      ? data.srm_login_log.slice()
      : [];
    logs.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (!logs.length) {
      logSection.style.display = "none";
      return;
    }
    logSection.style.display = "block";

    logBody.textContent = "";
    logs.forEach((entry) => {
      const row = document.createElement("div");
      row.className = `log-entry ${entry.action}`;

      const timeEl = document.createElement("span");
      timeEl.className = "log-entry-time";
      const d = new Date(entry.ts);
      timeEl.textContent = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

      const actionEl = document.createElement("span");
      actionEl.className = "log-entry-action";
      actionEl.textContent = entry.action.replace(/_/g, " ");

      const emailEl = document.createElement("span");
      emailEl.className = "log-entry-email";
      emailEl.textContent = entry.email
        ? entry.email.replace("@srmist.edu.in", "")
        : "\u2014";

      row.append(timeEl, actionEl, emailEl);
      logBody.append(row);
    });
  }

  const currentVersion = browserApi.runtime.getManifest().version;
  const versionDisplay = document.getElementById("versionDisplay");
  if (versionDisplay) versionDisplay.textContent = `v${currentVersion}`;

  async function checkForUpdates() {
    try {
      const res = await fetch(
        "https://api.github.com/repos/thenabbu/srm-auto-login/releases/latest",
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json();
      const latest = (data.tag_name || "").replace(/^v/i, "");
      if (!latest || latest === currentVersion) return;

      const banner = document.getElementById("updateBanner");
      if (!banner) return;

      const text = document.createTextNode(`v${latest} available \u2014 `);
      const link = document.createElement("a");
      link.href = data.html_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "download ZIP";
      banner.append(text, link);
      banner.style.display = "flex";
    } catch (_) {}
  }
  checkForUpdates();

  browserApi.runtime.onMessage.addListener(async (msg) => {
    if (msg && msg.type === "srm_login_success") {
      const target = accounts.find((a) => a.email === msg.email);
      if (target) {
        target.lastUsed = new Date().toISOString();
        target.updatedAt = new Date().toISOString();
        await persistAccounts();
        renderAccounts();
      }
    }
  });

  togglePw.addEventListener("click", () => {
    const showing = pwInput.type === "text";
    pwInput.type = showing ? "password" : "text";
    togglePw.setAttribute(
      "aria-label",
      showing ? "Show password" : "Hide password",
    );
    togglePw.replaceChildren(
      makeIconSpan(showing ? "visibility" : "visibility_off"),
    );
  });

  srmIdInput.addEventListener("input", () => {
    const cleaned = normalizeSrmId(srmIdInput.value)
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 6);
    if (srmIdInput.value !== cleaned) srmIdInput.value = cleaned;
    hideStatus();
  });

  const logToggle = document.getElementById("logToggle");
  if (logToggle) {
    logToggle.addEventListener("click", () => {
      const logBody = document.getElementById("logBody");
      const chevron = document.getElementById("logChevron");
      if (!logBody) return;
      const opening = logBody.style.display === "none";
      logBody.style.display = opening ? "flex" : "none";
      if (chevron) chevron.classList.toggle("open", opening);
    });
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const srmId = normalizeSrmId(srmIdInput.value);
    const typedPassword = pwInput.value.trim();
    const editingAccount = accounts.find((a) => a.id === editingAccountId);

    if (!isValidSrmId(srmId)) {
      showError("Use the SRM ID format: ab1234.");
      return;
    }

    let encodedPassword;
    if (typedPassword) {
      encodedPassword = _encode(typedPassword);
    } else if (editingAccount) {
      encodedPassword = editingAccount.password;
    } else {
      showError("Enter a password.");
      return;
    }

    const email = toEmail(srmId);
    const existing = accounts.find(
      (a) => a.email === email && a.id !== editingAccountId,
    );
    const source = editingAccount || existing || null;
    const account = createAccount(email, encodedPassword, source);

    accounts = accounts.filter(
      (saved) => saved.id !== editingAccountId && saved.email !== email,
    );
    accounts.push(account);

    await persistAccounts();
    resetForm();
    hideStatus();
    renderAccounts();
  });

  clearBtn.addEventListener("click", async () => {
    accounts = [];
    await persistAccounts();
    await browserApi.storage.local.remove([
      "srm_email",
      "srm_password",
      "srm_active_account_id",
      "srm_login_log",
    ]);
    resetForm();
    hideStatus();
    renderAccounts();
    await renderLog();
  });

  function resetForm() {
    editingAccountId = "";
    loginForm.reset();
    pwInput.type = "password";
    pwInput.placeholder = "";
    togglePw.setAttribute("aria-label", "Show password");
    togglePw.replaceChildren(makeIconSpan("visibility"));
    if (saveBtn) saveBtn.textContent = "Save account";
  }

  function showError(msg) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.className = "status error";
  }

  function hideStatus() {
    if (!statusMsg) return;
    statusMsg.textContent = "";
    statusMsg.className = "status";
  }

  loadAccounts();
})();
