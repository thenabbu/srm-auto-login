(function () {
  const browserApi = globalThis.browser || globalThis.chrome;
  const emailInput = document.getElementById('emailInput');
  const pwInput = document.getElementById('pwInput');
  const togglePw = document.getElementById('togglePw');
  const loginForm = document.getElementById('loginForm');
  const clearBtn = document.getElementById('clearBtn');
  const savedBar = document.getElementById('savedBar');
  const savedText = document.getElementById('savedText');
  const accountList = document.getElementById('accountList');
  const statusMsg = document.getElementById('statusMsg');
  const statusPip = document.getElementById('statusPip');

  if (!browserApi || !emailInput || !pwInput || !loginForm) return;

  let accounts = [];
  let activeAccountId = '';

  const storage = {
    get(keys) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.get(keys);
      }
      return new Promise((resolve) => browserApi.storage.local.get(keys, resolve));
    },
    set(values) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.set(values);
      }
      return new Promise((resolve) => browserApi.storage.local.set(values, resolve));
    },
    remove(keys) {
      if (globalThis.browser && browserApi === globalThis.browser) {
        return browserApi.storage.local.remove(keys);
      }
      return new Promise((resolve) => browserApi.storage.local.remove(keys, resolve));
    }
  };

  function normalizeEmail(email) {
    return email.trim().toLowerCase();
  }

  function createAccount(email, password, existing) {
    const now = new Date().toISOString();
    return {
      id: existing ? existing.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email,
      password,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
  }

  async function loadAccounts() {
    const data = await storage.get(['srm_accounts', 'srm_active_account_id', 'srm_email', 'srm_password']);
    accounts = Array.isArray(data.srm_accounts) ? data.srm_accounts : [];
    activeAccountId = data.srm_active_account_id || '';

    if (!accounts.length && data.srm_email && data.srm_password) {
      const migrated = createAccount(data.srm_email, data.srm_password);
      accounts = [migrated];
      activeAccountId = migrated.id;
      await persistAccounts();
      await storage.remove(['srm_email', 'srm_password']);
    }

    if (!activeAccountId && accounts.length) {
      activeAccountId = accounts[0].id;
      await storage.set({ srm_active_account_id: activeAccountId });
    }

    const active = accounts.find((account) => account.id === activeAccountId);
    if (active) emailInput.value = active.email;
    renderAccounts();
  }

  async function persistAccounts() {
    await storage.set({
      srm_accounts: accounts,
      srm_active_account_id: activeAccountId
    });
  }

  function setSaved(on) {
    if (savedBar) savedBar.classList.toggle('visible', on);
    if (statusPip) statusPip.classList.toggle('on', on);
    if (savedText) {
      savedText.textContent = `${accounts.length} saved ${accounts.length === 1 ? 'account' : 'accounts'} · auto-login active`;
    }
  }

  function renderAccounts() {
    const hasAccounts = accounts.length > 0;
    setSaved(hasAccounts);
    if (!accountList) return;

    accountList.classList.toggle('visible', hasAccounts);
    accountList.textContent = '';

    accounts.forEach((account) => {
      const row = document.createElement('div');
      row.className = `account-row${account.id === activeAccountId ? ' active' : ''}`;

      const email = document.createElement('span');
      email.className = 'account-email';
      email.title = account.email;
      email.textContent = account.email;

      const useBtn = document.createElement('button');
      useBtn.className = 'account-action';
      useBtn.type = 'button';
      useBtn.textContent = account.id === activeAccountId ? 'On' : 'Use';
      useBtn.disabled = account.id === activeAccountId;
      useBtn.addEventListener('click', async () => {
        activeAccountId = account.id;
        emailInput.value = account.email;
        pwInput.value = '';
        await persistAccounts();
        renderAccounts();
        showStatus('Selected.', 'success');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'account-action';
      deleteBtn.type = 'button';
      deleteBtn.textContent = 'Del';
      deleteBtn.addEventListener('click', async () => {
        accounts = accounts.filter((saved) => saved.id !== account.id);
        if (activeAccountId === account.id) activeAccountId = accounts[0] ? accounts[0].id : '';
        await persistAccounts();
        if (emailInput.value.trim().toLowerCase() === account.email.toLowerCase()) {
          const active = accounts.find((saved) => saved.id === activeAccountId);
          emailInput.value = active ? active.email : '';
          pwInput.value = '';
        }
        renderAccounts();
        showStatus('Deleted.', 'error');
      });

      row.append(email, useBtn, deleteBtn);
      accountList.append(row);
    });
  }

  togglePw.addEventListener('click', () => {
    const showing = pwInput.type === 'text';
    pwInput.type = showing ? 'password' : 'text';
    togglePw.textContent = showing ? 'Show' : 'Hide';
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = normalizeEmail(emailInput.value);
    const password = pwInput.value.trim();
    if (!email || !password) {
      showStatus('Fill both fields.', 'error');
      return;
    }

    const existingIndex = accounts.findIndex((account) => normalizeEmail(account.email) === email);
    const existing = existingIndex >= 0 ? accounts[existingIndex] : null;
    const account = createAccount(email, password, existing);

    if (existingIndex >= 0) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }

    activeAccountId = account.id;
    await persistAccounts();
    pwInput.value = '';
    pwInput.type = 'password';
    togglePw.textContent = 'Show';
    renderAccounts();
    showStatus(existing ? 'Password replaced.' : 'Saved.', 'success');
  });

  clearBtn.addEventListener('click', async () => {
    accounts = [];
    activeAccountId = '';
    await persistAccounts();
    await storage.remove(['srm_email', 'srm_password']);
    emailInput.value = '';
    pwInput.value = '';
    renderAccounts();
    showStatus('Cleared.', 'error');
  });

  if (emailInput) {
    emailInput.addEventListener('input', () => {
      const match = accounts.find((account) => normalizeEmail(account.email) === normalizeEmail(emailInput.value));
      if (match) pwInput.placeholder = 'replacement password';
      else pwInput.placeholder = 'new password';
    });
  }

  function showStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.className = `status ${type}`;
    clearTimeout(statusMsg._t);
    statusMsg._t = setTimeout(() => { statusMsg.className = 'status'; }, 2500);
  }

  loadAccounts();
})();
