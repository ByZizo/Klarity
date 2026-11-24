const { ipcRenderer } = require('electron');

// ============================================================================
// KLARITY ISOLATED GUEST PRELOAD — LOGIN DETECTION BRIDGE
// Runs in an isolated context inside <webview> with zero Node access exposed
// to guest webpages. Detects user-initiated login submissions on HTTPS origins
// (or localhost) and sends a one-way event to Klarity's host BrowserPage.
// ============================================================================

(function initKlarityLoginDetector() {
  try {
    const proto = window.location?.protocol || '';
    const host = (window.location?.hostname || '').toLowerCase();
    const isSecure =
      proto === 'https:' ||
      (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1'));

    if (!isSecure) return;

    // Short-lived in-memory step-1 username cache for multi-step sign-in flows
    let cachedUsername = '';
    let cachedUsernameAt = 0;
    let lastSentHash = '';
    let lastSentAt = 0;

    function isVisibleElement(el) {
      if (!el || el.disabled || el.type === 'hidden') return false;
      const rect = el.getBoundingClientRect?.();
      if (rect && rect.width === 0 && rect.height === 0) return false;
      return true;
    }

    function looksLikeUsernameInput(el) {
      if (!el || el.tagName !== 'INPUT') return false;
      const type = (el.type || 'text').toLowerCase();
      if (!['text', 'email', 'tel'].includes(type)) return false;
      const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
      if (ac.includes('one-time-code') || ac.includes('cc-') || ac.includes('search')) return false;
      if (ac.includes('username') || ac.includes('email')) return true;

      const hint = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
      if (/search|query|promo|coupon|zip|postal|otp|code|captcha|phone_verify/.test(hint)) return false;
      return type === 'email' || /user|email|login|account|member|identifier|sign.?in/.test(hint);
    }

    function findCredentialsNear(passwordInput) {
      if (!passwordInput || !passwordInput.value) return null;
      const password = passwordInput.value;
      if (password.length < 2 || password.length > 256) return null;

      const scopeRoot = passwordInput.closest('form') || document;
      const allInputs = Array.from(scopeRoot.querySelectorAll('input'));

      // Avoid prompting on obvious 3-field password-change forms where user isn't logging in,
      // or pick the new password if it's a 2-field sign-up form.
      const pwInputs = allInputs.filter(
        (inp) => (inp.type || '').toLowerCase() === 'password' && inp.value
      );

      let chosenPassword = password;
      if (pwInputs.length >= 2) {
        const newPw = pwInputs.find((inp) =>
          /new-password/i.test(inp.getAttribute('autocomplete') || '')
        );
        if (newPw && newPw.value) chosenPassword = newPw.value;
      }

      // Search backward from the password input in DOM order for the username/email field
      const allDocInputs = Array.from(document.querySelectorAll('input'));
      const pwIdx = allDocInputs.indexOf(passwordInput);
      let username = '';

      for (let i = (pwIdx >= 0 ? pwIdx - 1 : allDocInputs.length - 1); i >= 0; i--) {
        const candidate = allDocInputs[i];
        if (!candidate.value || !candidate.value.trim()) continue;
        if (looksLikeUsernameInput(candidate) || (isVisibleElement(candidate) && ['text', 'email'].includes((candidate.type || 'text').toLowerCase()))) {
          const val = candidate.value.trim();
          if (val.length >= 2 && val.length <= 180) {
            username = val;
            break;
          }
        }
      }

      // Fallback to multi-step cached username (within 2 minutes on same origin)
      if (!username && cachedUsername && Date.now() - cachedUsernameAt < 120000) {
        username = cachedUsername;
      }

      return {
        origin: window.location.origin,
        url: window.location.href,
        hostname: window.location.hostname,
        pageTitle: document.title || window.location.hostname,
        username,
        password: chosenPassword
      };
    }

    function emitLoginCandidate(candidate) {
      if (!candidate || !candidate.password) return;
      const now = Date.now();
      const fingerprint = `${candidate.hostname}::${candidate.username}::${candidate.password.length}`;
      if (fingerprint === lastSentHash && now - lastSentAt < 1800) {
        return;
      }
      lastSentHash = fingerprint;
      lastSentAt = now;

      try {
        ipcRenderer.sendToHost('klarity:login-detected', candidate);
      } catch {}
    }

    // Track username typing for multi-step login flows (e.g., Google / Microsoft)
    document.addEventListener(
      'change',
      (e) => {
        const t = e.target;
        if (looksLikeUsernameInput(t) && t.value && t.value.trim().length >= 2) {
          cachedUsername = t.value.trim();
          cachedUsernameAt = Date.now();
        }
      },
      true
    );

    // 1. Native <form> submit listener
    document.addEventListener(
      'submit',
      (e) => {
        const form = e.target;
        if (!form || typeof form.querySelectorAll !== 'function') return;
        const pwInput = Array.from(form.querySelectorAll('input[type="password"]')).find(
          (inp) => inp.value && inp.value.length > 0
        );
        if (pwInput) {
          emitLoginCandidate(findCredentialsNear(pwInput));
        } else {
          const userInp = Array.from(form.querySelectorAll('input')).find(
            (inp) => looksLikeUsernameInput(inp) && inp.value && inp.value.trim()
          );
          if (userInp) {
            cachedUsername = userInp.value.trim();
            cachedUsernameAt = Date.now();
          }
        }
      },
      true
    );

    // 2. Enter key inside password or username field (SPA forms without <form> submit)
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter') return;
        const t = e.target;
        if (!t || t.tagName !== 'INPUT') return;
        if ((t.type || '').toLowerCase() === 'password' && t.value) {
          emitLoginCandidate(findCredentialsNear(t));
        } else if (looksLikeUsernameInput(t) && t.value && t.value.trim()) {
          cachedUsername = t.value.trim();
          cachedUsernameAt = Date.now();
        }
      },
      true
    );

    // 3. Click on submit / Sign In button in SPA forms
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target?.closest?.('button, input[type="submit"], [role="button"]');
        if (!btn) return;
        const label = `${btn.textContent || ''} ${btn.value || ''} ${btn.getAttribute('aria-label') || ''}`.toLowerCase();
        const isSubmitLike =
          (btn.type || '').toLowerCase() === 'submit' ||
          /sign\s*in|log\s*in|continue|submit|next|verify|enter|unlock|join|register|create/i.test(label);
        if (!isSubmitLike) return;

        const pwInput = Array.from(document.querySelectorAll('input[type="password"]')).find(
          (inp) => inp.value && inp.value.length > 0 && isVisibleElement(inp)
        );
        if (pwInput) {
          emitLoginCandidate(findCredentialsNear(pwInput));
        } else {
          const userInp = Array.from(document.querySelectorAll('input')).find(
            (inp) => looksLikeUsernameInput(inp) && inp.value && inp.value.trim() && isVisibleElement(inp)
          );
          if (userInp) {
            cachedUsername = userInp.value.trim();
            cachedUsernameAt = Date.now();
          }
        }
      },
      true
    );
  } catch {
    // Fail silently inside guest frame
  }
})();
