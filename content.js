const browserApi = globalThis.browser || globalThis.chrome;

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

function setReactValue(input, value) {
  // React ignores plain .value= so we use the native setter.
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function waitFor(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { observer.disconnect(); resolve(el); }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true, subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout: ${selector}`));
    }, timeout);
  });
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

async function getAccounts() {
  const data = await storage.get(['srm_accounts', 'srm_active_account_id', 'srm_email', 'srm_password']);
  let accounts = Array.isArray(data.srm_accounts) ? data.srm_accounts : [];
  let activeAccountId = data.srm_active_account_id || '';

  if (!accounts.length && data.srm_email && data.srm_password) {
    const migrated = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email: data.srm_email,
      password: data.srm_password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    accounts = [migrated];
    activeAccountId = migrated.id;
    await storage.set({ srm_accounts: accounts, srm_active_account_id: activeAccountId });
    await storage.remove(['srm_email', 'srm_password']);
  }

  return { accounts, activeAccountId };
}

async function getPreferredAccount() {
  const { accounts, activeAccountId } = await getAccounts();
  if (!accounts.length) return null;

  const displayedEmail = findDisplayedEmail();
  if (displayedEmail) {
    const matched = accounts.find((account) => normalizeEmail(account.email) === normalizeEmail(displayedEmail));
    if (matched) return matched;
  }

  return accounts.find((account) => account.id === activeAccountId) || accounts[0];
}

function findDisplayedEmail() {
  const dataEmail = document.querySelector('[data-email]');
  if (dataEmail && dataEmail.getAttribute('data-email')) {
    return dataEmail.getAttribute('data-email');
  }

  const candidates = [
    ...document.querySelectorAll('[aria-label], [title], div, span')
  ];

  for (const el of candidates) {
    const values = [
      el.getAttribute('aria-label'),
      el.getAttribute('title'),
      el.textContent
    ];
    const found = values
      .filter(Boolean)
      .map((value) => value.match(/[a-z0-9._%+-]+@srmist\.edu\.in/i))
      .find(Boolean);
    if (found) return found[0];
  }

  return '';
}

async function handleEmailStep() {
  try {
    const account = await getPreferredAccount();
    if (!account || !account.email) {
      console.warn('[SRM AutoLogin] No account saved.');
      return;
    }

    const emailInput = await waitFor('input[type="email"]');

    if (normalizeEmail(emailInput.value) === normalizeEmail(account.email)) {
      await delay(300);
      clickNext('identifier');
      return;
    }

    await delay(400);
    emailInput.focus();
    setReactValue(emailInput, account.email);
    await delay(400);
    clickNext('identifier');
  } catch (e) {
    console.warn('[SRM AutoLogin] Email step:', e.message);
  }
}

async function handlePasswordStep() {
  try {
    const account = await getPreferredAccount();
    if (!account || !account.password) {
      console.warn('[SRM AutoLogin] No matching password saved.');
      return;
    }

    const pwInput = await waitFor('input[type="password"]');
    await delay(400);
    pwInput.focus();
    setReactValue(pwInput, account.password);
    await delay(400);
    clickNext('password');
  } catch (e) {
    console.warn('[SRM AutoLogin] Password step:', e.message);
  }
}

function clickNext(step) {
  const selectors =
    step === 'identifier'
      ? ['#identifierNext', '[data-idom-class="nCP5yc"] button', 'button[jsname="LgbsSe"]']
      : ['#passwordNext', '[data-idom-class="nCP5yc"] button', 'button[jsname="LgbsSe"]'];

  for (const sel of selectors) {
    const btn = document.querySelector(sel);
    if (btn) { btn.click(); return; }
  }

  const nextBtn = [...document.querySelectorAll('button')].find(b =>
    b.innerText && /next|sign in|continue/i.test(b.innerText)
  );
  if (nextBtn) nextBtn.click();
}

async function handleConfirmIdentifier() {
  try {
    await delay(600);
    clickNext('identifier');
  } catch (e) {
    console.warn('[SRM AutoLogin] Confirm step:', e.message);
  }
}

function route(url) {
  if (url.includes('/confirmidentifier')) {
    handleConfirmIdentifier();
    return;
  }

  if (
    url.includes('/identifier') ||
    url.includes('/signin/v2/identifier') ||
    url.includes('/v3/signin/identifier') ||
    url.match(/accounts\.google\.com\/?$/)
  ) {
    handleEmailStep();
    return;
  }

  if (url.includes('/challenge/pwd') || url.includes('/signin/v2/sl/pwd')) {
    handlePasswordStep();
    return;
  }

  if (document.querySelector('input[type="password"]')) {
    handlePasswordStep();
  } else if (document.querySelector('input[type="email"]')) {
    handleEmailStep();
  }
}

if (browserApi && browserApi.storage) {
  route(location.href);
}

let lastUrl = location.href;
new MutationObserver(() => {
  if (!browserApi || !browserApi.storage) return;
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => route(location.href), 300);
  }
}).observe(document, { subtree: true, childList: true });
