import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  ChevronDown,
  ArrowLeft,
  Check,
  MoreVertical
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { jwtDecode } from 'jwt-decode';
import { marked } from 'marked';
import { sanitizeHtmlAgainstInjection } from '../utils/securityCrypto';

marked.setOptions({
  breaks: true,
  gfm: true
});

export const CURRENT_APP_VERSION = '3.12.44';

export function isSemverNewer(remoteVer, currentVer = CURRENT_APP_VERSION) {
  if (!remoteVer || !currentVer) return false;
  const rParts = String(remoteVer).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  const cParts = String(currentVer).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export function formatVersionString(version) {
  if (!version || version === '1.8.10' || version === 'v1.8.10') return `v${CURRENT_APP_VERSION}`;
  const str = String(version).trim();
  if (/^[0-9a-f]{6,40}$/i.test(str) || str.toLowerCase().includes('commit')) {
    return `v${CURRENT_APP_VERSION}`;
  }
  return str.startsWith('v') ? str : `v${str}`;
}

export function formatUserFacingReleaseNote(rawText) {
  if (!rawText || typeof rawText !== 'string') return 'Performance improvements and bug fixes';
  let text = rawText.trim();
  text = text.replace(/^(?:feat|fix|perf|refactor|chore|style|test|build|ci|docs)(?:\([^)]+\))?:\s*/i, '');
  text = text
    .replace(/\b(?:as requested|what i asked|as shown in (?:the )?(?:image|screenshot|photo)|per feedback|per user request)\b/gi, '')
    .replace(/\b(?:so i dont have to|so i don't have to)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const verbReplacements = [
    [/^bring\s+back\b/i, 'Brought back'],
    [/^bring\s+abck\b/i, 'Brought back'],
    [/^brting\s+back\b/i, 'Brought back'],
    [/^restore\b/i, 'Restored'],
    [/^fix\b/i, 'Fixed'],
    [/^resolve\b/i, 'Resolved'],
    [/^make\b/i, 'Updated'],
    [/^add\b/i, 'Added'],
    [/^update\b/i, 'Updated'],
    [/^improve\b/i, 'Improved'],
    [/^enhance\b/i, 'Enhanced'],
    [/^remove\b/i, 'Removed'],
    [/^delete\b/i, 'Removed'],
    [/^enable\b/i, 'Enabled'],
    [/^support\b/i, 'Added support for'],
    [/^introduce\b/i, 'Introduced'],
    [/^polish\b/i, 'Polished'],
    [/^clean\s+up\b/i, 'Cleaned up'],
    [/^cleanup\b/i, 'Cleaned up'],
    [/^restyle\b/i, 'Restyled'],
    [/^reorganize\b/i, 'Reorganized'],
    [/^allow\b/i, 'Added ability to'],
    [/^show\b/i, 'Added view for'],
    [/^hide\b/i, 'Removed display of'],
    [/^change\b/i, 'Updated']
  ];

  for (const [pattern, replacement] of verbReplacements) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      break;
    }
  }

  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  text = text.replace(/[.;,]+$/, '');
  return text;
}

export function formatCleanUpdateMessage(_rawMsg, rawVer) {
  const verStr = formatVersionString(rawVer || CURRENT_APP_VERSION);
  return `New update available (${verStr})`;
}

export function isMovementOrMinorTweak(str) {
  const s = String(str || '').toLowerCase();
  return /\b(move|moving|moved|reposition|repositioned|repositioning|reorder|reordered|reordering|swap|swapped|swapping|switch|switched|switching|places|left side|right side|layout|align|alignment|spacing|tweak|tweaks|minor|fix|fixes|fixed|glitch|bug|bugfix|polish|clean up|cleanup)\b/i.test(s);
}

export function formatWhatsNewHighlights(changes) {
  let list = [];
  if (Array.isArray(changes)) {
    list = changes;
  } else if (changes && typeof changes === 'object') {
    if (Array.isArray(changes.changes)) {
      list = changes.changes;
    } else if (typeof changes.message === 'string' && changes.message.trim()) {
      list = [changes.message];
    } else if (typeof changes.commitTitle === 'string' && changes.commitTitle.trim()) {
      list = [changes.commitTitle];
    }
  }

  const items = [];
  let hasMinorOrMovement = false;

  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean) continue;

    if (isMovementOrMinorTweak(clean)) {
      hasMinorOrMovement = true;
    } else {
      const formatted = formatUserFacingReleaseNote(clean);
      if (formatted && !items.some(existing => existing.toLowerCase() === formatted.toLowerCase())) {
        items.push(formatted);
      }
    }
  }

  if (hasMinorOrMovement && !items.some(i => i.toLowerCase() === 'bug fixes')) {
    items.push('Bug fixes');
  }

  if (items.length > 0) {
    return items.slice(0, 4);
  }

  return ["Bug fixes"];
}

// Universal Subpage Header: Centered title, leveled Back to Overview, and 3-dot dropdown actions menu
export function SubpageHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to Overview',
  actions = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative flex flex-wrap items-center justify-between gap-2 sm:gap-4 min-h-[42px] w-full">
      <div className="flex items-center justify-start shrink-0 z-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[var(--surface)] border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] text-[13px] font-medium cursor-pointer transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[var(--muted)] shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Back</span>
          </button>
        )}
      </div>

      <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1 px-1 sm:px-3">
        <h1 className="font-serif-title text-xl sm:text-2xl font-semibold text-[var(--ink)] tracking-tight leading-tight truncate max-w-full">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5 truncate max-w-full">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center justify-end shrink-0 z-10">
        {actions && actions.length > 0 ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-[8px] border transition-colors cursor-pointer ${
                isOpen
                  ? 'bg-[var(--surface-subtle)] border-[var(--line)] text-[var(--ink)]'
                  : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
              aria-label="Page actions"
            >
              <MoreVertical className="w-4 h-4" aria-hidden="true" />
            </button>

            {isOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[var(--surface)] border border-[var(--line)] rounded-[12px] shadow-lg py-1.5 z-50">
                <div className="py-1">
                  {actions.map((act, idx) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          act.onClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] text-left cursor-pointer transition-colors"
                      >
                        {Icon && <Icon className="w-4 h-4 text-[var(--brand)] shrink-0" aria-hidden="true" />}
                        <span>{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-9" />
        )}
      </div>
    </div>
  );
}

// Multi-select Card & Account Filter Dropdown shared across Transactions, Bills, Subscriptions, and Budgets
export function MultiCardFilterDropdown({ cards, selectedCardIds, onChangeSelectedCards }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCard = (cardId) => {
    if (selectedCardIds.includes(cardId)) {
      onChangeSelectedCards(selectedCardIds.filter(id => id !== cardId));
    } else {
      onChangeSelectedCards([...selectedCardIds, cardId]);
    }
  };

  const clearFilter = () => {
    onChangeSelectedCards([]);
    setIsOpen(false);
  };

  const getButtonLabel = () => {
    if (!selectedCardIds || selectedCardIds.length === 0) return 'All cards';
    if (selectedCardIds.length === 1) {
      const found = cards.find(c => c.id === selectedCardIds[0]);
      return found ? `${found.name} (•••• ${found.mask})` : '1 card selected';
    }
    return `${selectedCardIds.length} cards selected`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label="Filter by card or account"
          className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-[8px] border text-[13px] font-medium transition-colors cursor-pointer ${
            selectedCardIds.length > 0
              ? 'bg-[var(--brand-soft)] border-[var(--brand)] text-[var(--brand)] font-semibold'
              : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <CreditCard className={`w-4 h-4 shrink-0 ${selectedCardIds.length > 0 ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`} aria-hidden="true" />
            <span className="truncate">{getButtonLabel()}</span>
          </div>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-72 max-w-[calc(100vw-2rem)] bg-[var(--surface)] border border-[var(--line)] rounded-[12px] shadow-lg z-40 py-2">
            <div className="px-3.5 py-1.5 border-b border-[var(--line)] flex items-center justify-between">
              <span className="text-[13px] font-medium text-[var(--muted)]">Filter by card or account</span>
              {selectedCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-[13px] font-medium text-[var(--brand)] hover:underline cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto py-1 divide-y divide-[var(--line)]">
              <button
                type="button"
                onClick={clearFilter}
                className="w-full px-3.5 py-2 text-left text-[13px] flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border ${
                    selectedCardIds.length === 0 ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-[var(--line)] bg-[var(--surface)]'
                  }`}>
                    {selectedCardIds.length === 0 && <Check className="w-3 h-3" aria-hidden="true" />}
                  </div>
                  <span className={selectedCardIds.length === 0 ? 'font-semibold text-[var(--ink)]' : 'font-medium text-[var(--ink)]'}>
                    All cards
                  </span>
                </div>
                <span className="text-[13px] text-[var(--muted)]">{cards.length} accounts</span>
              </button>

              {cards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggleCard(card.id)}
                    className="w-full px-3.5 py-2.5 text-left text-[13px] flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border shrink-0 ${
                        isSelected ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-[var(--line)] bg-[var(--surface)]'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate ${isSelected ? 'font-semibold text-[var(--ink)]' : 'font-medium text-[var(--ink)]'}`}>
                          {card.name}
                        </p>
                        <p className="text-[13px] text-[var(--muted)]">
                          •••• {card.mask} · {card.type === 'depository' ? 'Checking / Bank' : 'Credit Card'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[13px] text-[var(--muted)] shrink-0">•••• {card.mask}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedCardIds.length > 0 && (
        <button
          type="button"
          onClick={clearFilter}
          className="px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors cursor-pointer"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}

// Markdown Formatter Component
export function FormattedChatMessage({ text, isUser }) {
  if (!text) return null;
  const clean = String(text)
    .replace(/\[(?:NAVIGATE|ACTION):[\s\S]*?\]/gi, '')
    .trim();

  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed text-white text-[15px]">{clean}</div>;
  }
  let html = '';
  try {
    html = sanitizeHtmlAgainstInjection(marked.parse(clean, { breaks: true, gfm: true }));
  } catch (err) {
    return <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{clean}</div>;
  }
  return (
    <div
      className="gemini-markdown text-[var(--ink)]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ['207624653160', 'vbp60vuujhl2h8jshvnosad9m2ft75jq.apps.googleusercontent.com'].join('-');

export function GoogleSignInButton({ onAuthSuccess, onError, setIsAuthenticating, isAuthenticating }) {
  useEffect(() => {
    let interval = null;

    const checkAndInit = () => {
      if (window.google?.accounts?.oauth2 && window.google?.accounts?.id) {
        if (interval) clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
              if (!response.credential) return;
              setIsAuthenticating(true);
              try {
                const decoded = jwtDecode(response.credential);
                await onAuthSuccess({ ...decoded, idToken: response.credential });
              } catch (e) {
                onError('Failed to verify Google credential.');
              } finally {
                setIsAuthenticating(false);
              }
            }
          });
        } catch (e) {}
        return true;
      }
      return false;
    };

    if (!checkAndInit()) {
      let script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', checkAndInit);
      interval = setInterval(checkAndInit, 150);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const launchOAuthPopup = () => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid profile email',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            setIsAuthenticating(false);
            if (tokenResponse.error !== 'popup_closed_by_user') {
              onError(`Google sign-in error: ${tokenResponse.error}`);
            }
            return;
          }

          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!userInfoRes.ok) {
              throw new Error('Google token verification failed');
            }
            const profile = await userInfoRes.json();
            await onAuthSuccess({ ...profile, accessToken: tokenResponse.access_token });
          } catch (err) {
            onError('Could not verify Google account with Google servers.');
          } finally {
            setIsAuthenticating(false);
          }
        },
        error_callback: (error) => {
          setIsAuthenticating(false);
          if (error?.type === 'popup_failed_to_open') {
            onError('Google Sign-In popup was blocked. Please allow popups.');
          }
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setIsAuthenticating(false);
      onError('Error launching Google sign-in: ' + (err.message || 'Please try again.'));
    }
  };

  const handleClick = async () => {
    setIsAuthenticating(true);

    if (typeof window !== 'undefined' && window.klarityDesktop?.signInWithGoogle) {
      try {
        const res = await window.klarityDesktop.signInWithGoogle();
        if (res?.ok && res?.user) {
          await onAuthSuccess(res.user, res.session);
        } else if (res?.error) {
          onError(res.error);
        }
      } catch (err) {
        onError('Google sign-in error: ' + (err.message || 'Please try again.'));
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      let count = 0;
      const waiter = setInterval(() => {
        count++;
        if (window.google?.accounts?.oauth2) {
          clearInterval(waiter);
          launchOAuthPopup();
        } else if (count > 25) {
          clearInterval(waiter);
          setIsAuthenticating(false);
          onError('Google Sign-In service is still loading. Please try again in a moment.');
        }
      }, 100);
      return;
    }
    launchOAuthPopup();
  };

  return (
    <div className="flex flex-col gap-2 items-center w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isAuthenticating}
        className="w-full py-2.5 px-4 rounded-[8px] bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] font-medium text-[15px] flex items-center justify-center gap-3 transition-colors border border-[var(--line)] cursor-pointer"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.34 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
        <span>{isAuthenticating ? 'Verifying with Google...' : 'Continue with Google'}</span>
      </button>
    </div>
  );
}

export function PlaidLauncher({ token, onSuccess, onExit }) {
  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
    onExit
  });

  useEffect(() => {
    if (ready) open();
  }, [ready, open]);

  return null;
}
