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
      role="dialog"
      aria-label={isUpdate ? 'Update saved password' : 'Save password to Klarity Vault'}
      className="absolute right-3 top-full mt-2 w-80 sm:w-88 rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl z-50 p-4 flex flex-col gap-3 text-[var(--ink)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[10px] bg-[#1B4B91]/15 text-[#1B4B91] flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[var(--ink)] leading-tight">
              {isUpdate ? 'Update password?' : 'Save password to Vault?'}
            </h3>
            <p className="text-[11px] text-[var(--muted)] truncate">
              {promptData.hostname}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setPassword('');
            onDismiss?.();
          }}
          aria-label="Dismiss save password prompt"
          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-2.5 text-[12px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
              Vault Section
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-2 text-[12px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
            >
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
            Username / Email
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="(optional)"
            className="w-full h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-2.5 text-[12px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--muted)] block mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-8 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] pl-2.5 pr-8 text-[12px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
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
        </div>

        {needsUnlock && (
          <div className="p-2.5 rounded-[10px] bg-amber-500/10 border border-amber-500/30 flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Vault is locked — enter PIN to save</span>
            </label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Vault PIN or master password"
              className="w-full h-8 bg-[var(--surface)] border border-[var(--line)] rounded-[7px] px-2.5 text-[12px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
            />
            {pinError && (
              <span className="text-[11px] text-rose-500 font-medium">{pinError}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[var(--line)]">
          {!isUpdate ? (
            <button
              type="button"
              onClick={() => {
                setPassword('');
                onNeverForSite?.(promptData.hostname);
              }}
              className="text-[11px] font-medium text-[var(--muted)] hover:text-rose-500 cursor-pointer"
            >
              Never for this site
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              AES-256-GCM
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isVerifying || !password}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isUpdate ? 'Update' : 'Save'}</span>
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
