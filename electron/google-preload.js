// Disable WebAuthn / Passkeys in Google Auth window so Google prompts for password instead of hanging on passkeys
try {
  delete window.PublicKeyCredential;
  Object.defineProperty(window, 'PublicKeyCredential', {
    get: () => undefined,
    set: () => {},
    configurable: false
  });
} catch (e) {}

if (navigator.credentials) {
  navigator.credentials.get = () => Promise.reject(new Error('Passkey not supported in this container'));
}

// Automated helper: If Google ever shows "Try another way", automatically click it to show the password prompt
window.addEventListener('DOMContentLoaded', () => {
  const autoBypassPasskey = () => {
    const bodyText = document.body ? document.body.innerText : '';
    if (bodyText.includes('passkey') || bodyText.includes('Verifying it')) {
      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], span'));
      const tryAnotherWayBtn = candidates.find(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        return t === 'try another way' || t.includes('try another way');
      });
      if (tryAnotherWayBtn) {
        tryAnotherWayBtn.click();
      }

      // If on "Choose how you want to sign in", automatically select "Enter your password"
      const enterPasswordOption = candidates.find(el => {
        const t = (el.innerText || '').trim().toLowerCase();
        return t.includes('enter your password');
      });
      if (enterPasswordOption) {
        enterPasswordOption.click();
      }
    }
  };

  const timer = setInterval(autoBypassPasskey, 350);
  setTimeout(() => clearInterval(timer), 30000);
});
