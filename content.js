let currentTheme = "dark";

if (typeof browserApi !== "undefined" && browserApi.storage) {
  browserApi.storage.local.get("srm_theme").then((data) => {
    if (data.srm_theme) currentTheme = data.srm_theme;
  });

  browserApi.storage.onChanged.addListener((changes) => {
    if (changes.srm_theme) {
      currentTheme = changes.srm_theme.newValue;
      document.querySelectorAll(".srm-theme-root").forEach((el) => {
        el.setAttribute("data-theme", currentTheme);
      });
    }
  });
}

function setReactValue(input, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  ).set;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function waitFor(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for: ${selector}`));
    }, timeout);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isHalted() {
  return sessionStorage.getItem("srm_autologin_halted") === "1";
}

function haltSession(reason) {
  sessionStorage.setItem("srm_autologin_halted", "1");
}

function isChallengeScreen() {
  const url = location.href;
  if (
    url.includes("/challenge/pwd") ||
    url.includes("/signin/v2/sl/pwd") ||
    url.includes("/identifier") ||
    /accounts\.google\.com\/?$/.test(url)
  )
    return false;

  const selectors = [
    "#totpPin",
    'input[name="totpPin"]',
    "[data-challengetype]",
    '[aria-label*="verification" i]',
    '[aria-label*="authenticator" i]',
    'iframe[src*="recaptcha"]',
    'iframe[src*="captcha"]',
  ];
  return selectors.some((sel) => document.querySelector(sel));
}

async function withRetry(fn, retryDelay = 3000) {
  try {
    await fn();
  } catch (e) {
    await delay(retryDelay);
    try {
      await fn();
    } catch (e2) {}
  }
}

function injectStyles() {
  if (document.getElementById("srm-injected-styles")) return;
  const style = document.createElement("style");
  style.id = "srm-injected-styles";
  style.textContent = `
    #srm-al-toast.srm-theme-root,
    #srm-account-chooser.srm-theme-root {
      --bg: #080808;
      --surface: #111111;
      --surface-2: #171717;
      --border: #202020;
      --border-mid: #2e2e2e;
      --border-hover: #444444;
      --border-focus: #e0e0e0;
      --border-active: #5a5a5a;
      --text: #ececec;
      --text-2: #b4b4b4;
      --text-3: #747474;
      --radius: 3px;
    }
    
    #srm-al-toast.srm-theme-root[data-theme="light"],
    #srm-account-chooser.srm-theme-root[data-theme="light"] {
      --bg: #f7f7f7;
      --surface: #ffffff;
      --surface-2: #f0f0f0;
      --border: #e2e2e2;
      --border-mid: #d0d0d0;
      --border-hover: #aaaaaa;
      --border-focus: #111111;
      --border-active: #888888;
      --text: #111111;
      --text-2: #555555;
      --text-3: #999999;
    }
    
    #srm-al-toast {
      position: fixed !important;
      bottom: 20px !important;
      left: 20px !important;
      z-index: 2147483647 !important;
      background: var(--surface) !important;
      color: var(--text) !important;
      font-family: "IBM Plex Mono", "Courier New", monospace !important;
      font-size: 11px !important;
      line-height: 1.4 !important;
      letter-spacing: 0.02em !important;
      padding: 8px 12px !important;
      border-radius: var(--radius) !important;
      border: 1px solid var(--border-mid) !important;
      max-width: 240px !important;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.18s ease, transform 0.18s ease, background 0.2s ease, color 0.2s ease, border-color 0.2s ease !important;
      pointer-events: none !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    }

    #srm-account-chooser {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      background: var(--surface) !important;
      border: 1px solid var(--border-mid) !important;
      border-radius: var(--radius) !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      padding: 12px !important;
      font-family: "IBM Plex Mono", "Courier New", monospace !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      min-width: 220px !important;
      animation: srmSlideIn 0.2s ease-out !important;
      color: var(--text) !important;
      transition: background 0.2s ease, border-color 0.2s ease !important;
    }

    #srm-account-chooser .srm-chooser-title {
      font-size: 9px !important;
      font-weight: 500 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.08em !important;
      color: var(--text-3) !important;
      margin: 0 0 2px 0 !important;
      padding: 0 0 8px 0 !important;
      border-bottom: 1px solid var(--border-mid) !important;
      text-align: left !important;
      transition: color 0.2s ease, border-color 0.2s ease !important;
    }

    #srm-account-chooser .srm-account-btn {
      background: var(--bg) !important;
      border: 1px solid var(--border-mid) !important;
      border-radius: var(--radius) !important;
      color: var(--text-2) !important;
      padding: 8px 10px !important;
      margin: 0 !important;
      font-family: inherit !important;
      font-size: 11px !important;
      cursor: pointer !important;
      text-align: left !important;
      transition: all 0.15s ease !important;
      outline: none !important;
    }

    #srm-account-chooser .srm-account-btn:hover {
      background: var(--surface-2) !important;
      border-color: var(--border-hover) !important;
      color: var(--text) !important;
    }
    
    @keyframes srmSlideIn { 
      from { transform: translateY(10px); opacity: 0; } 
      to { transform: translateY(0); opacity: 1; } 
    }
  `;
  document.head.appendChild(style);
}

function showToast(message) {
  injectStyles();
  document.getElementById("srm-al-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "srm-al-toast";
  toast.className = "srm-theme-root";
  toast.setAttribute("data-theme", currentTheme);
  toast.textContent = message;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(6px)";
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

function showAccountChooser(accounts, onSelect) {
  injectStyles();
  document.getElementById("srm-account-chooser")?.remove();

  const container = document.createElement("div");
  container.id = "srm-account-chooser";
  container.className = "srm-theme-root";
  container.setAttribute("data-theme", currentTheme);

  const title = document.createElement("div");
  title.className = "srm-chooser-title";
  title.textContent = "Select Account";
  container.appendChild(title);

  accounts.forEach((acc) => {
    const btn = document.createElement("button");
    btn.className = "srm-account-btn";
    btn.textContent = acc.email;
    btn.onclick = (e) => {
      e.preventDefault();
      container.remove();
      onSelect(acc);
    };
    container.appendChild(btn);
  });

  document.body.appendChild(container);
}

async function appendLog(action, email = "", detail = "") {
  try {
    const data = await browserApi.storage.local.get("srm_login_log");
    const log = Array.isArray(data.srm_login_log) ? data.srm_login_log : [];
    log.unshift({ ts: new Date().toISOString(), email, action, detail });
    if (log.length > 50) log.length = 50;
    await browserApi.storage.local.set({ srm_login_log: log });
  } catch (_) {}
}

async function getAccounts() {
  const data = await browserApi.storage.local.get([
    "srm_accounts",
    "srm_active_account_id",
    "srm_email",
    "srm_password",
  ]);

  let accounts = Array.isArray(data.srm_accounts) ? data.srm_accounts : [];
  const activeAccountId = data.srm_active_account_id || "";

  if (!accounts.length && data.srm_email && data.srm_password) {
    const migrated = normalizeAccount({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      email: data.srm_email,
      password: data.srm_password,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    accounts = migrated ? [migrated] : [];
    await browserApi.storage.local.set({
      srm_accounts: accounts,
      srm_active_account_id: migrated?.id ?? "",
    });
    await browserApi.storage.local.remove(["srm_email", "srm_password"]);
  } else {
    accounts = accounts.map(normalizeAccount).filter(Boolean);
  }

  return { accounts, activeAccountId };
}

async function getPreferredAccount() {
  const { accounts, activeAccountId } = await getAccounts();
  const enabled = accounts.filter(
    (a) => a && a.email && a.password && a.enabled !== false,
  );

  if (!enabled.length) return null;

  const chosenId = sessionStorage.getItem("srm_chosen_id");
  if (chosenId) {
    const picked = enabled.find((a) => a.id === chosenId);
    if (picked) return picked;
  }

  const displayedEmail = findDisplayedEmail();
  if (displayedEmail) {
    const matched = enabled.find(
      (a) => a.email === normalizeEmail(displayedEmail),
    );
    if (matched) return matched;
  }

  return enabled.find((a) => a.id === activeAccountId) || enabled[0];
}

function findDisplayedEmail() {
  const dataEmail = document.querySelector("[data-email]");
  if (dataEmail?.getAttribute("data-email")) {
    return dataEmail.getAttribute("data-email");
  }

  const candidates = [
    ...document.querySelectorAll("[aria-label], [title], div, span"),
  ];

  for (const el of candidates) {
    const values = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.textContent,
    ];
    const found = values
      .filter(Boolean)
      .map((v) => v.match(/[a-z0-9._%+-]+@srmist\.edu\.in/i))
      .find(Boolean);
    if (found) return found[0];
  }

  return "";
}

async function handleEmailStep() {
  if (isHalted()) return;

  const { accounts } = await getAccounts();
  const enabled = accounts.filter(
    (a) => a.enabled !== false && a.email && a.password,
  );

  if (!enabled.length) {
    return;
  }

  if (enabled.length >= 2) {
    showAccountChooser(enabled, async (selectedAccount) => {
      sessionStorage.setItem("srm_chosen_id", selectedAccount.id);

      await withRetry(async () => {
        const emailInput = await waitFor('input[type="email"]');

        emailInput.focus();
        setReactValue(emailInput, selectedAccount.email);
        showToast("Filling email...");
        await appendLog("filled_email", selectedAccount.email);

        await delay(400);
        clickNext("identifier");
      });
    });
    return;
  }

  await withRetry(async () => {
    const account = enabled[0];
    const emailInput = await waitFor('input[type="email"]');

    if (normalizeEmail(emailInput.value) === account.email) {
      await delay(300);
      clickNext("identifier");
      return;
    }

    await delay(400);
    emailInput.focus();
    setReactValue(emailInput, account.email);
    showToast("Filling email...");
    await appendLog("filled_email", account.email);
    await delay(400);
    clickNext("identifier");
  });
}

async function handlePasswordStep() {
  if (isHalted()) return;

  await withRetry(async () => {
    const account = await getPreferredAccount();
    if (!account || !account.password) {
      return;
    }

    const password = _decode(account.password);
    if (!password) {
      return;
    }

    const pwInput = await waitFor('input[type="password"]');
    await delay(400);
    pwInput.focus();
    setReactValue(pwInput, password);
    showToast("Filling password...");
    await appendLog("filled_password", account.email);
    await delay(400);
    clickNext("password");

    await delay(1800);

    const stillOnPasswordPage =
      location.href.includes("/challenge/pwd") ||
      location.href.includes("/signin/v2/sl/pwd");

    if (!stillOnPasswordPage) {
      try {
        browserApi.runtime.sendMessage({
          type: "srm_login_success",
          email: account.email,
        });
      } catch (_) {}
      return;
    }

    const errorEl = document.querySelector(
      '[data-error-code], .Ekjuhf, [jsname="B34EJ"]',
    );
    if (errorEl && errorEl.innerText.trim()) {
      const reason = errorEl.innerText.trim();
      haltSession("Wrong password: " + reason);
      showToast("Wrong password \u2014 auto-login halted");
      await appendLog("error", account.email, reason);
      return;
    }

    try {
      browserApi.runtime.sendMessage({
        type: "srm_login_success",
        email: account.email,
      });
    } catch (_) {}
  });
}

async function handleConfirmIdentifier() {
  try {
    await delay(600);
    clickNext("identifier");
  } catch (e) {}
}

function clickNext(step) {
  const selectors =
    step === "identifier"
      ? [
          "#identifierNext",
          '[data-idom-class="nCP5yc"] button',
          'button[jsname="LgbsSe"]',
        ]
      : [
          "#passwordNext",
          '[data-idom-class="nCP5yc"] button',
          'button[jsname="LgbsSe"]',
        ];

  for (const sel of selectors) {
    const btn = document.querySelector(sel);
    if (btn) {
      btn.click();
      return;
    }
  }

  const nextBtn = [...document.querySelectorAll("button")].find(
    (b) => b.innerText && /next|sign in|continue/i.test(b.innerText),
  );
  if (nextBtn) nextBtn.click();
}

function route(url) {
  if (isHalted()) return;

  if (isChallengeScreen()) {
    showToast("2FA detected \u2014 login paused");
    appendLog("2fa", "");
    return;
  }

  if (url.includes("/confirmidentifier")) {
    handleConfirmIdentifier();
    return;
  }

  if (
    url.includes("/identifier") ||
    url.includes("/signin/v2/identifier") ||
    url.includes("/v3/signin/identifier") ||
    url.match(/accounts\.google\.com\/?$/)
  ) {
    handleEmailStep();
    return;
  }

  if (url.includes("/challenge/pwd") || url.includes("/signin/v2/sl/pwd")) {
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

const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => route(location.href), 600);
  }
});

urlObserver.observe(document.body, { childList: true, subtree: true });
