function setReactValue(input, value) {
  // React ignores plain .value= so we use the native setter
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set;
  nativeSetter.call(input, value);
  input.dispatchEvent(new Event('input',  { bubbles: true }));
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

async function handleEmailStep() {
  try {
    const { srm_email } = await chrome.storage.local.get('srm_email');
    if (!srm_email) {
      console.warn('[SRM AutoLogin] No email saved.');
      return;
    }

    const emailInput = await waitFor('input[type="email"]');

    if (emailInput.value === srm_email) {
      await delay(300);
      clickNext('identifier');
      return;
    }

    await delay(400);
    emailInput.focus();
    setReactValue(emailInput, srm_email);
    await delay(400);
    clickNext('identifier');
  } catch (e) {
    console.warn('[SRM AutoLogin] Email step:', e.message);
  }
}

async function handlePasswordStep() {
  try {
    const { srm_password } = await chrome.storage.local.get('srm_password');
    if (!srm_password) {
      console.warn('[SRM AutoLogin] No password saved.');
      return;
    }

    const pwInput = await waitFor('input[type="password"]');
    await delay(400);
    pwInput.focus();
    setReactValue(pwInput, srm_password);
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
      : ['#passwordNext',   '[data-idom-class="nCP5yc"] button', 'button[jsname="LgbsSe"]'];

  for (const sel of selectors) {
    const btn = document.querySelector(sel);
    if (btn) { btn.click(); return; }
  }

  // Fallback: find any visible Next/Sign in button
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

  // Fallback: infer step from DOM
  if (document.querySelector('input[type="password"]')) {
    handlePasswordStep();
  } else if (document.querySelector('input[type="email"]')) {
    handleEmailStep();
  }
}

route(location.href);

// Watch for SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => route(location.href), 300);
  }
}).observe(document, { subtree: true, childList: true });