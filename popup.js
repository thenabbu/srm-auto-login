(function () {
  const SRM_DOMAIN = "@srmist.edu.in";
  const browserApi = globalThis.browser || globalThis.chrome;
  const srmIdInput = document.getElementById("srmIdInput");
  const pwInput = document.getElementById("pwInput");
  const togglePw = document.getElementById("togglePw");
  const loginForm = document.getElementById("loginForm");
  const saveBtn = document.getElementById("saveBtn");
  const clearBtn = document.getElementById("clearBtn");
  const accountsStatus = document.getElementById("accountsStatus");
  const accountList = document.getElementById("accountList");
  const statusMsg = document.getElementById("statusMsg");

  function makeIconSpan(iconName) {
    const span = document.createElement("span");
    span.className = "material-symbols-rounded";
    span.setAttribute("aria-hidden", "true");
    span.textContent = iconName;
    return span;
  }

  if (!browserApi || !srmIdInput || !pwInput || !loginForm) return;

  let accounts = [];
  let editingAccountId = "";

  const storage = {
    get(keys) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.get(keys);
      }
      return new Promise((resolve) =>
        browserApi.storage.local.get(keys, resolve),
      );
    },
    set(values) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.set(values);
      }
      return new Promise((resolve) =>
        browserApi.storage.local.set(values, resolve),
      );
    },
    remove(keys) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.remove(keys);
      }
      return new Promise((resolve) =>
        browserApi.storage.local.remove(keys, resolve),
      );
    },
  };

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

  function createAccount(email, password, existing) {
    const now = new Date().toISOString();
    return {
      id: existing
        ? existing.id
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email,
      password,
      enabled: existing ? existing.enabled !== false : true,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
  }

  async function loadAccounts() {
    const data = await storage.get([
      "srm_accounts",
      "srm_active_account_id",
      "srm_email",
      "srm_password",
    ]);
    accounts = Array.isArray(data.srm_accounts)
      ? data.srm_accounts.map(normalizeAccount).filter(Boolean)
      : [];

    if (!accounts.length && data.srm_email && data.srm_password) {
      accounts = [createAccount(data.srm_email, data.srm_password)];
      await storage.remove([
        "srm_email",
        "srm_password",
        "srm_active_account_id",
      ]);
    }

    await persistAccounts();
    srmIdInput.value = "";
    pwInput.value = "";
    renderAccounts();
  }

  function normalizeAccount(account) {
    if (!account || !account.email || !account.password) return null;
    return {
      ...account,
      email: account.email.trim().toLowerCase(),
      enabled: account.enabled !== false,
    };
  }

  async function persistAccounts() {
    await storage.set({ srm_accounts: accounts });
    await storage.remove("srm_active_account_id");
  }

  function renderAccounts() {
    const enabledCount = accounts.filter((account) => account.enabled).length;
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

      const email = document.createElement("span");
      email.className = "account-email";
      email.title = account.email;
      email.textContent = account.email;

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

      row.append(email, toggleBtn, editBtn, deleteBtn);
      accountList.append(row);
    });
  }

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

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const srmId = normalizeSrmId(srmIdInput.value);
    const password = pwInput.value.trim();
    const editingAccount = accounts.find(
      (account) => account.id === editingAccountId,
    );

    if (!isValidSrmId(srmId)) {
      showError("Use the SRM ID format: ab1234.");
      return;
    }

    if (!password && !editingAccount) {
      showError("Enter a password.");
      return;
    }

    const email = toEmail(srmId);
    const existing = accounts.find(
      (account) => account.email === email && account.id !== editingAccountId,
    );
    const source = editingAccount || existing || null;
    const account = createAccount(email, password || source.password, source);

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
    await storage.remove([
      "srm_email",
      "srm_password",
      "srm_active_account_id",
    ]);
    resetForm();
    hideStatus();
    renderAccounts();
  });

  function resetForm() {
    editingAccountId = "";
    loginForm.reset();
    pwInput.type = "password";
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
