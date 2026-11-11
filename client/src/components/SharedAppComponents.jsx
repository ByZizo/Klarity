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

// Configure marked with GitHub-flavored markdown and automatic line breaks
marked.setOptions({
  breaks: true,
  gfm: true
});

export const CURRENT_APP_VERSION = '3.12.23';

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

export function formatWhatsNewHighlights(changes) {
  if (!Array.isArray(changes) || changes.length === 0) {
    return [
      "Latest feature enhancements & visual improvements",
      "Bug fixes & performance improvements"
    ];
  }

  const isMinor = (text) => {
    return /(fix|bug|typo|patch|minor|tweak|adjust|chore|test|clean|format|style|spacing|padding|margin|remove.*button|remove.*message|bump|deps|refactor)/i.test(text);
  };

  const isMajor = (text) => {
    return /(dark mode|high contrast|theme|appearance|household|vault|password|retirement|ai advisor|report|statement|upload|overview|budget|bills|redesign|add.*feature|introduce)/i.test(text);
  };

  const majorItems = [];

  for (const raw of changes) {
    if (typeof raw !== 'string') continue;
    const clean = raw.trim();
    if (!clean) continue;

    if (isMajor(clean)) {
      let formatted = clean;
      if (formatted.toLowerCase().startsWith('feat:')) formatted = formatted.slice(5).trim();
      if (formatted.toLowerCase().startsWith('feature:')) formatted = formatted.slice(8).trim();
      formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

      if (!majorItems.some(item => item.toLowerCase() === formatted.toLowerCase())) {
        majorItems.push(formatted);
      }
    }
  }

  if (majorItems.length === 0) {
    for (const raw of changes) {
      if (typeof raw === 'string' && raw.trim() && !isMinor(raw)) {
        majorItems.push(raw.trim());
        if (majorItems.length >= 2) break;
      }
    }
  }

  const finalHighlights = majorItems.slice(0, 3);
  if (finalHighlights.length === 0) {
    finalHighlights.push("Latest feature updates & interface upgrades");
  }

  finalHighlights.push("Bug fixes & performance improvements");
  return finalHighlights;
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
    <div className="relative flex items-center justify-between gap-2 sm:gap-4 min-h-[42px] w-full">
      {/* Left: Back button */}
      <div className="flex items-center justify-start shrink-0 z-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs cursor-pointer transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Back</span>
          </button>
        )}
      </div>

      {/* Center: Title & optional subtitle centered on page */}
      <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1 px-1 sm:px-3">
        <h2 className="font-serif-title text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight truncate max-w-full">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate max-w-full">{subtitle}</p>
        )}
      </div>

      {/* Right: Three-dot dropdown menu */}
      <div className="flex items-center justify-end shrink-0 z-10">
        {actions && actions.length > 0 ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-colors cursor-pointer shadow-2xs ${
                isOpen
                  ? 'bg-slate-100 border-slate-300 text-slate-900'
                  : 'bg-white border-slate-200/90 hover:bg-slate-50 text-slate-600 hover:text-slate-900'
              }`}
              aria-label="Options menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
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
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-left cursor-pointer transition-colors"
                      >
                        {Icon && <Icon className="w-4 h-4 text-[#18457c] shrink-0" />}
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
    <div className="flex items-center gap-2" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer min-w-[175px] ${
            selectedCardIds.length > 0
              ? 'bg-[#e8edf5] border-[#18457c]/30 text-[#1e3a8a] font-semibold shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/80'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <CreditCard className={`w-3.5 h-3.5 shrink-0 ${selectedCardIds.length > 0 ? 'text-[#18457c]' : 'text-slate-500'}`} />
            <span className="truncate">{getButtonLabel()}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-2 animate-in fade-in zoom-in-95">
            <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter by Card / Account</span>
              {selectedCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
              <button
                type="button"
                onClick={clearFilter}
                className="w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                    selectedCardIds.length === 0 ? 'bg-[#18457c] border-[#18457c] text-white' : 'border-slate-300 bg-white'
                  }`}>
                    {selectedCardIds.length === 0 && <Check className="w-3 h-3" />}
                  </div>
                  <span className={selectedCardIds.length === 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}>
                    All cards
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{cards.length} accounts</span>
              </button>

              {cards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => toggleCard(card.id)}
                    className="w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        isSelected ? 'bg-[#18457c] border-[#18457c] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`truncate ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {card.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          •••• {card.mask} · {card.type === 'depository' ? 'Checking / Bank' : 'Credit Card'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">•••• {card.mask}</span>
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
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50/80 transition-colors cursor-pointer whitespace-nowrap"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}

// Gemini-style Markdown Formatter Component
export function FormattedChatMessage({ text, isUser }) {
  if (!text) return null;
  const clean = String(text)
    .replace(/\[(?:NAVIGATE|ACTION):[\s\S]*?\]/gi, '')
    .trim();

  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed text-white">{clean}</div>;
  }
  let html = '';
  try {
    html = sanitizeHtmlAgainstInjection(marked.parse(clean, { breaks: true, gfm: true }));
  } catch (err) {
    return <div className="whitespace-pre-wrap leading-relaxed">{clean}</div>;
  }
  return (
    <div
      className="gemini-markdown text-slate-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ['207624653160', 'vbp60vuujhl2h8jshvnosad9m2ft75jq.apps.googleusercontent.com'].join('-');

// Real Google Identity Services (GIS) OAuth 2.0 Sign-In Component
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
        className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-md active:scale-[0.99] border border-slate-200 cursor-pointer"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

// Plaid Link Launcher declared outside render to maintain hook lifecycle integrity
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
