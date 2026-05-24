(function () {
  const emailInput = document.getElementById('emailInput');
  const pwInput    = document.getElementById('pwInput');
  const togglePw   = document.getElementById('togglePw');
  const loginForm  = document.getElementById('loginForm');
  const clearBtn   = document.getElementById('clearBtn');
  const savedBar   = document.getElementById('savedBar');
  const statusMsg  = document.getElementById('statusMsg');
  const statusPip  = document.getElementById('statusPip');

  if (!emailInput || !pwInput || !loginForm) return;

  function setSaved(on) {
    if (savedBar)   savedBar.classList.toggle('visible', on);
    if (statusPip)  statusPip.classList.toggle('on', on);
  }

  chrome.storage.local.get(['srm_email', 'srm_password'], ({ srm_email, srm_password }) => {
    if (srm_email)    emailInput.value = srm_email;
    if (srm_password) pwInput.value    = srm_password;
    setSaved(!!(srm_email && srm_password));
  });

  togglePw.addEventListener('click', () => {
    const showing        = pwInput.type === 'text';
    pwInput.type         = showing ? 'password' : 'text';
    togglePw.textContent = showing ? 'Show' : 'Hide';
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const pw    = pwInput.value.trim();
    if (!email || !pw) { showStatus('Fill both fields.', 'error'); return; }
    chrome.storage.local.set({ srm_email: email, srm_password: pw }, () => {
      setSaved(true);
      showStatus('Saved.', 'success');
    });
  });

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['srm_email', 'srm_password'], () => {
      emailInput.value = '';
      pwInput.value    = '';
      setSaved(false);
      showStatus('Cleared.', 'error');
    });
  });

  function showStatus(msg, type) {
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    statusMsg.className   = `status ${type}`;
    clearTimeout(statusMsg._t);
    statusMsg._t = setTimeout(() => { statusMsg.className = 'status'; }, 2500);
  }
})();