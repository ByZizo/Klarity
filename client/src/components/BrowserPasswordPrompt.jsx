import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  Check,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui';
import { hasMasterPinSet, verifyMasterPin } from '../utils/securityCrypto';

function isVaultCurrentlyLocked() {
  try {
    if (!hasMasterPinSet()) return false;
    const lockType = localStorage.getItem('klarity_vault_lock_type') || 'pin';
    if (lockType === 'none') return false;
    const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
    if (timeoutMode === 'always') return true;
    const until = Number(sessionStorage.getItem('klarity_vault_unlocked_until') || 0);
    return Date.now() >= until;
  } catch {
    return false;
  }
}

function markVaultUnlockedSession() {
  try {
    const timeoutMode = localStorage.getItem('klarity_vault_pin_timeout') || '15m';
    if (timeoutMode === 'always') return;
    const mins = parseInt(timeoutMode, 10) || 15;
    sessionStorage.setItem('klarity_vault_unlocked_until', String(Date.now() + mins * 60 * 1000));
  } catch {}
}

function loadVaultSectionsList() {
  try {
    const raw = localStorage.getItem('klarity_vault_sections');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(Boolean);
      }
    }
  } catch {}
  return ['Favorites', 'General', 'Utilities', 'Finance', 'Personal'];
}

export default function BrowserPasswordPrompt({
  promptData, // { mode: 'save' | 'update', existingItemId?, service, hostname, website, username, password }
  onSave,
  onNeverForSite,
  onDismiss
}) {
  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('General');
  const [showPassword, setShowPassword] = useState(false);

  // Vault PIN gate if locked
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const sections = loadVaultSectionsList();

  useEffect(() => {
    if (!promptData) return;
    setService(promptData.service || promptData.hostname || 'Website');
    setUsername(promptData.username || '');
    setPassword(promptData.password || '');
    setCategory(promptData.category || (sections.includes('General') ? 'General' : sections[0] || 'General'));
    setShowPassword(false);
    setNeedsUnlock(isVaultCurrentlyLocked());
    setPinInput('');
    setPinError('');

    // Auto-expire unconfirmed credentials from memory after 60s
    const timer = setTimeout(() => {
      setPassword('');
      onDismiss?.();
    }, 60000);
    return () => {
      clearTimeout(timer);
      setPassword('');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptData]);

  useEffect(() => {
    if (!promptData) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPassword('');
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [promptData, onDismiss]);

  if (!promptData) return null;

  const isUpdate = promptData.mode === 'update';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    if (needsUnlock) {
      if (!pinInput.trim()) {
        setPinError('Enter your Vault PIN / master password to save.');
        return;
      }
      setIsVerifying(true);
      setPinError('');
      try {
        const res = await verifyMasterPin(pinInput.trim());
        if (!res.valid) {
          setPinError(res.error || 'Incorrect Vault PIN.');
          setIsVerifying(false);
          return;
        }
        markVaultUnlockedSession();
        setNeedsUnlock(false);
      } catch {
        setPinError('Could not verify Vault PIN.');
        setIsVerifying(false);
        return;
      }
      setIsVerifying(false);
    }

    onSave?.({
      mode: promptData.mode,
      existingItemId: promptData.existingItemId || null,
      service: service.trim() || promptData.hostname || 'Website',
      username: username.trim(),
      password,
      website: promptData.website || '',
      hostname: promptData.hostname || '',
      category
    });

    // Zero local memory immediately
    setPassword('');
    setPinInput('');
  };

  return (
    <div
      role="region"
      aria-label={isUpdate ? 'Update saved password' : 'Save password to Klarity Vault'}
      className="shrink-0 w-full bg-[var(--surface)] border-b border-[var(--line)] px-3 sm:px-4 py-2.5 text-[var(--ink)] z-40 shadow-2xs"
    >
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
            <KeyRound className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--ink)] leading-tight">
              {isUpdate ? 'Update saved password in Vault?' : 'Save login to Klarity Vault?'}
            </div>
            <div className="text-[11px] text-[var(--muted)] truncate">
              {promptData.hostname}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            aria-label="Account Name"
            placeholder="Site name"
            className="w-28 sm:w-32 h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-lg px-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
          />

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username or Email"
            placeholder="Username / email"
            className="w-36 sm:w-44 h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-lg px-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
          />

          <div className="relative w-32 sm:w-36">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
              required
              className="w-full h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-lg pl-2.5 pr-7 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Vault Section"
            className="h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-lg px-2 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)] cursor-pointer"
          >
            {sections.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {needsUnlock && (
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Vault PIN"
                aria-label="Vault PIN"
                className="w-28 h-8 bg-amber-500/10 border border-amber-500/40 rounded-lg px-2.5 text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isVerifying || !password}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isUpdate ? 'Update' : 'Save'}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setPassword('');
                onDismiss?.();
              }}
            >
              Not now
            </Button>
            {!isUpdate && (
              <button
                type="button"
                onClick={() => {
                  setPassword('');
                  onNeverForSite?.(promptData.hostname);
                }}
                className="px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-rose-500 cursor-pointer whitespace-nowrap"
              >
                Never
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPassword('');
                onDismiss?.();
              }}
              aria-label="Dismiss save password prompt"
              className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
      {pinError && (
        <div className="mt-1.5 text-[11px] text-rose-500 font-medium flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{pinError}</span>
        </div>
      )}
    </div>
  );
}
