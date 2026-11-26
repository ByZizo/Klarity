const { ipcRenderer } = require('electron');

// ============================================================================
// KLARITY ISOLATED GUEST PRELOAD — LOGIN & AUTH BLOCK DETECTION BRIDGE
// Runs in an isolated context inside <webview> and auth popup windows with
// zero Node/window globals exposed to guest webpages.
// ============================================================================

(function initKlarityGuestBridge() {
  try {
    function isCurrentOriginSecure() {
      try {
        const proto = window.location?.protocol || '';
        const host = (window.location?.hostname || '').toLowerCase();
        return (
          proto === 'https:' ||
          (proto === 'http:' && (host === 'localhost' || host === '127.0.0.1'))
        );
      } catch {
        return false;
      }
    }

    // Short-lived in-memory buffers (never logged, wiped automatically)
    let cachedUsername = '';
    let cachedUsernameAt = 0;
    let recentPasswordValue = '';
    let recentPasswordInputAt = 0;
    let lastSentHash = '';
    let lastSentAt = 0;
    let clearBufferTimer = null;

    function clearSensitiveBuffers() {
      recentPasswordValue = '';
      recentPasswordInputAt = 0;
      if (clearBufferTimer) {
        clearTimeout(clearBufferTimer);
        clearBufferTimer = null;
      }
    }

    function scheduleBufferCleanup() {
      if (clearBufferTimer) clearTimeout(clearBufferTimer);
      clearBufferTimer = setTimeout(clearSensitiveBuffers, 60000);
    }

    function isVisibleElement(el) {
      try {
        if (!el || el.disabled || el.type === 'hidden') return false;
        const rect = el.getBoundingClientRect?.();
        if (rect && rect.width === 0 && rect.height === 0) return false;
        return true;
      } catch {
        return false;
      }
    }

    function looksLikeUsernameInput(el) {
      try {
        if (!el || el.tagName !== 'INPUT') return false;
        const type = (el.type || 'text').toLowerCase();
        if (!['text', 'email', 'tel'].includes(type)) return false;
        const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
        if (ac.includes('one-time-code') || ac.includes('cc-') || ac.includes('search')) return false;
        if (ac.includes('username') || ac.includes('email')) return true;

        const hint = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        if (/search|query|promo|coupon|zip|postal|otp|code|captcha|phone_verify/.test(hint)) return false;
        return type === 'email' || /user|email|login|account|member|identifier|sign.?in|handle/.test(hint);
      } catch {
        return false;
      }
    }

    function findBestUsername(referenceEl) {
      try {
        const allDocInputs = Array.from(document.querySelectorAll('input'));
        const refIdx = referenceEl ? allDocInputs.indexOf(referenceEl) : -1;
        const startIdx = refIdx >= 0 ? refIdx - 1 : allDocInputs.length - 1;

        for (let i = startIdx; i >= 0; i--) {
          const candidate = allDocInputs[i];
          if (!candidate || !candidate.value || !candidate.value.trim()) continue;
          const type = (candidate.type || 'text').toLowerCase();
          if (type === 'password' || type === 'hidden') continue;
          if (looksLikeUsernameInput(candidate) || (isVisibleElement(candidate) && ['text', 'email', 'tel'].includes(type))) {
            const val = candidate.value.trim();
            if (val.length >= 2 && val.length <= 180) {
              return val;
            }
          }
        }
      } catch {}

      if (cachedUsername && Date.now() - cachedUsernameAt < 180000) {
        return cachedUsername;
      }
      return '';
    }

    function buildCandidateFromPasswordInput(passwordInput, fallbackPw = '') {
      if (!isCurrentOriginSecure()) return null;
      const password = (passwordInput && passwordInput.value) || fallbackPw || '';
      if (!password || password.length < 2 || password.length > 256) return null;

      let chosenPassword = password;
      try {
        const scopeRoot = passwordInput?.closest?.('form') || document;
        const pwInputs = Array.from(scopeRoot.querySelectorAll('input[type="password"]')).filter(
          (inp) => inp.value && inp.value.length > 0
        );
        if (pwInputs.length >= 2) {
          const newPw = pwInputs.find((inp) =>
            /new-password/i.test(inp.getAttribute('autocomplete') || '')
          );
          if (newPw && newPw.value) chosenPassword = newPw.value;
        }
      } catch {}

      const username = findBestUsername(passwordInput);

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
      if (!candidate || !candidate.password || !isCurrentOriginSecure()) return;
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
      try {
        ipcRenderer.send('klarity:guest-login-detected', candidate);
      } catch {}

      clearSensitiveBuffers();
    }

    // Track username & password typing in short-lived memory for multi-step & SPA login flows
    const handleFieldInput = (e) => {
      try {
        if (!isCurrentOriginSecure()) return;
        const t = e.target;
        if (!t || t.tagName !== 'INPUT') return;
        const type = (t.type || 'text').toLowerCase();
        if (type === 'password') {
          if (t.value && t.value.length >= 2) {
            recentPasswordValue = t.value;
            recentPasswordInputAt = Date.now();
            const nearUser = findBestUsername(t);
            if (nearUser) {
              cachedUsername = nearUser;
              cachedUsernameAt = Date.now();
            }
            scheduleBufferCleanup();
          }
        } else if (looksLikeUsernameInput(t) && t.value && t.value.trim().length >= 2) {
          cachedUsername = t.value.trim();
          cachedUsernameAt = Date.now();
        }
      } catch {}
    };

    document.addEventListener('input', handleFieldInput, true);
    document.addEventListener('change', handleFieldInput, true);

    // 1. Native <form> submit listener
    document.addEventListener(
      'submit',
      (e) => {
        try {
          if (!isCurrentOriginSecure()) return;
          const form = e.target;
          if (!form || typeof form.querySelectorAll !== 'function') return;
          const pwInput = Array.from(form.querySelectorAll('input[type="password"]')).find(
            (inp) => inp.value && inp.value.length > 0
          );
          if (pwInput) {
            emitLoginCandidate(buildCandidateFromPasswordInput(pwInput));
          } else {
            const userInp = Array.from(form.querySelectorAll('input')).find(
              (inp) => looksLikeUsernameInput(inp) && inp.value && inp.value.trim()
            );
            if (userInp) {
              cachedUsername = userInp.value.trim();
              cachedUsernameAt = Date.now();
            }
          }
        } catch {}
      },
      true
    );

    // 2. Enter key inside password or username field
    document.addEventListener(
      'keydown',
      (e) => {
        try {
          if (e.key !== 'Enter' || !isCurrentOriginSecure()) return;
          const t = e.target;
          if (!t || t.tagName !== 'INPUT') return;
          if ((t.type || '').toLowerCase() === 'password' && t.value) {
            emitLoginCandidate(buildCandidateFromPasswordInput(t));
          } else if (looksLikeUsernameInput(t) && t.value && t.value.trim()) {
            cachedUsername = t.value.trim();
            cachedUsernameAt = Date.now();
          }
        } catch {}
      },
      true
    );

    // 3. Pointerdown / Click on submit or action buttons in SPA forms (captures before React clears state)
    const handleButtonInteraction = (e) => {
      try {
        if (!isCurrentOriginSecure()) return;
        const btn = e.target?.closest?.('button, input[type="submit"], input[type="button"], [role="button"], a[href="#"]');
        if (!btn) return;
        const textHint = `${btn.textContent || ''} ${btn.value || ''} ${btn.getAttribute('aria-label') || ''} ${btn.id || ''} ${btn.name || ''}`.toLowerCase();
        if (/cancel|back|forgot|reset|show|hide|reveal|eye|clear|close|dismiss/i.test(textHint)) {
          return;
        }
        const isSubmitLike =
          (btn.type || '').toLowerCase() === 'submit' ||
          /sign\s*in|log\s*in|log\s*on|continue|submit|next|verify|enter|unlock|join|register|create|auth|confirm|go\b/i.test(textHint) ||
          Boolean(btn.closest('form'));
        if (!isSubmitLike) return;

        const pwInput = Array.from(document.querySelectorAll('input[type="password"]')).find(
          (inp) => inp.value && inp.value.length > 0 && isVisibleElement(inp)
        );
        if (pwInput) {
          emitLoginCandidate(buildCandidateFromPasswordInput(pwInput));
        } else {
          const userInp = Array.from(document.querySelectorAll('input')).find(
            (inp) => looksLikeUsernameInput(inp) && inp.value && inp.value.trim() && isVisibleElement(inp)
          );
          if (userInp) {
            cachedUsername = userInp.value.trim();
            cachedUsernameAt = Date.now();
          }
        }
      } catch {}
    };

    document.addEventListener('pointerdown', handleButtonInteraction, true);
    document.addEventListener('click', handleButtonInteraction, true);

    // 4. Navigation / unload fallback right after typing password in SPA
    window.addEventListener(
      'beforeunload',
      () => {
        try {
          if (recentPasswordValue && Date.now() - recentPasswordInputAt < 12000 && isCurrentOriginSecure()) {
            const pwInput = Array.from(document.querySelectorAll('input[type="password"]')).find(
              (inp) => inp.value && inp.value.length > 0
            );
            emitLoginCandidate(buildCandidateFromPasswordInput(pwInput, recentPasswordValue));
          }
        } catch {}
      },
      true
    );

    // 5. Detect strict embedded-webview OAuth blocks (e.g. Google "This browser or app may not be secure")
    let lastReportedBlockUrl = '';
    function checkEmbeddedAuthBlock() {
      try {
        const host = (window.location?.hostname || '').toLowerCase();
        if (!host.includes('google.com')) return;
        const bodyText = (document.body?.innerText || '').slice(0, 2500);
        if (
          /this browser or app may not be secure|couldn['’]t sign you in/i.test(bodyText) &&
          window.location.href !== lastReportedBlockUrl
        ) {
          lastReportedBlockUrl = window.location.href;
          ipcRenderer.sendToHost('klarity:embedded-auth-blocked', {
            url: window.location.href,
            hostname: host,
            provider: 'Google'
          });
        }
      } catch {}
    }

    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(checkEmbeddedAuthBlock, 350);
      setTimeout(checkEmbeddedAuthBlock, 1400);
      try {
        const host = (window.location?.hostname || '').toLowerCase();
        if (host.includes('google.com') && typeof MutationObserver === 'function' && document.body) {
          let blockCheckTimer = null;
          const observer = new MutationObserver(() => {
            if (blockCheckTimer) clearTimeout(blockCheckTimer);
            blockCheckTimer = setTimeout(checkEmbeddedAuthBlock, 300);
          });
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
      } catch {}
    });
    window.addEventListener('load', () => {
      setTimeout(checkEmbeddedAuthBlock, 400);
    });
  } catch {
    // Fail silently inside guest frame
  }
})();
