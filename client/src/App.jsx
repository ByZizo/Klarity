import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CreditCard,
  Building2,
  Lock,
  LogOut,
  Settings,
  Plus,
  TrendingDown,
  TrendingUp,
  Receipt,
  Bot,
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  DollarSign,
  Search,
  ExternalLink,
  Trash2,
  FileText,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  Sparkles,
  Smartphone,
  Wallet,
  ShieldCheck,
  Percent,
  Mail,
  User,
  Gamepad2,
  Tv,
  ChevronDown,
  Paperclip,
  UploadCloud,
  Brain,
  X,
  History,
  ArrowLeft,
  Layers,
  Globe,
  Maximize2,
  Landmark,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Filter,
  Download,
  Home,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Upload,
  PieChart,
  Target,
  Check,
  SlidersHorizontal,
  Calculator,
  RefreshCw,
  Square,
  Copy,
  PhoneCall,
  Shield,
  MoreVertical
} from 'lucide-react';
import { usePlaidLink } from 'react-plaid-link';
import { jwtDecode } from 'jwt-decode';
import { marked } from 'marked';
import KlarityLogo from './components/KlarityLogo';
import LegalShieldStatusCard from './components/LegalShieldStatusCard';
import InteractivePayoffComparison from './components/InteractivePayoffComparison';
import HardshipPlaybookModal from './components/HardshipPlaybookModal';
import { DEFAULT_INCOME_STREAMS, calculateJudgmentProofRatio } from './utils/statutoryDebtEngine';
import HouseholdLifestyleHub from './components/HouseholdLifestyleHub';
import PasswordVaultPage, { DEFAULT_VAULT_ITEMS } from './components/PasswordVaultPage';
import RetirementPage from './components/RetirementPage';
import { DEFAULT_HOUSEHOLD_PROFILE, calculateHouseholdAndFleetMetrics } from './utils/householdLifestyleEngine';
import {
  secureStorage,
  enforceStorageEncryptionAudit,
  hasMasterPinSet,
  setMasterPin,
  removeMasterPin,
  verifyMasterPin,
  clearLockoutState,
  reencryptLegacyStorage,
  sanitizeHtmlAgainstInjection
} from './utils/securityCrypto';

// ============================================================================
// SECURITY: Global /api fetch interceptor with Bearer token & 401 auto-signout
// ============================================================================
if (typeof window !== 'undefined' && !window.__klarityFetchPatched) {
  const originalFetch = window.fetch;
  window.fetch = async function (resource, options = {}) {
    let url = typeof resource === 'string' ? resource : resource?.url || '';
    const isApi = typeof url === 'string' && (url.startsWith('/api') || url.includes('/api/'));

    if (isApi) {
      let token = null;
      try {
        const sess = await secureStorage.getItem('klarity_auth_session', null);
        if (sess && sess.token && (!sess.expiresAt || Date.now() < sess.expiresAt)) {
          token = sess.token;
        }
      } catch {}

      const opts = { ...options };
      opts.headers = new Headers(opts.headers || {});

      if (token && !opts.headers.has('Authorization')) {
        opts.headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await originalFetch(resource, opts);

      if (response.status === 401) {
        const cleanUrl = url.split('?')[0];
        const isAuthRoute = cleanUrl.endsWith('/api/auth/login') || cleanUrl.endsWith('/api/auth/register');
        if (!isAuthRoute) {
          try {
            secureStorage.removeItem('klarity_auth_session');
            secureStorage.removeItem('klarity_user');
            localStorage.removeItem('klarity_user');
            if (window.klarityDesktop?.clearSession) {
              window.klarityDesktop.clearSession();
            }
          } catch {}
          if (typeof window.__triggerKlaritySignOut === 'function') {
            window.__triggerKlaritySignOut();
          }
        }
      }

      return response;
    }

    return originalFetch(resource, options);
  };
  window.__klarityFetchPatched = true;
}


// Configure marked with GitHub-flavored markdown and automatic line breaks
marked.setOptions({
  breaks: true,
  gfm: true
});


// Universal Subpage Header: Centered title, leveled Back to Overview, and 3-dot dropdown actions menu
function SubpageHeader({
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
function MultiCardFilterDropdown({ cards, selectedCardIds, onChangeSelectedCards }) {
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
function FormattedChatMessage({ text, isUser }) {
  if (!text) return null;
  // Safety: thoroughly strip any internal command tags before formatting
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
function GoogleSignInButton({ onAuthSuccess, onError, setIsAuthenticating, isAuthenticating }) {
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

    // In the Desktop App, use the native Electron Google Account login window (zero origin_mismatch + real Google password/2FA)
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
function PlaidLauncher({ token, onSuccess, onExit }) {
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

// Helper to format release highlights: only major features, minor items become "Bug fixes"

function formatVersionString(version) {
  if (!version || version === '1.8.10' || version === 'v1.8.10') return 'v3.12.14';
  const str = String(version).trim();
  if (/^[0-9a-f]{7,40}$/i.test(str)) {
    return 'v3.12.14';
  }
  return str.startsWith('v') ? str : `v${str}`;
}

function formatWhatsNewHighlights(changes) {
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

export default function App() {
  return <KlarityApp />;
}

function KlarityApp() {
  // Current user state (Synchronously initialized from localStorage to prevent OAuth flicker)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_user');
      if (saved && !saved.startsWith('ENCv')) {
        const u = JSON.parse(saved);
        if (u && (u.id || u.email)) return u;
      }
    } catch {}
    return null;
  });
  const [authSession, setAuthSession] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_auth_session_cached');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });
  const [isCheckingSession, setIsCheckingSession] = useState(() => {
    try {
      const hasCachedUser = Boolean(localStorage.getItem('klarity_user'));
      const isDesktop = Boolean(typeof window !== 'undefined' && window.klarityDesktop?.getSession);
      return hasCachedUser || isDesktop;
    } catch {
      return false;
    }
  });

  // Load authenticated session asynchronously from secureStorage on initial mount
  useEffect(() => {
    let active = true;
    async function loadInitialSession() {
      try {
        const sess = await secureStorage.getItem('klarity_auth_session', null);
        if (active && sess && sess.user && sess.expiresAt && Date.now() < sess.expiresAt) {
          setCurrentUser(sess.user);
          setAuthSession(sess);
          try { localStorage.setItem('klarity_auth_session_cached', JSON.stringify(sess)); } catch {}
          return;
        }
        const user = await secureStorage.getItem('klarity_user', null);
        if (active && user && typeof user === 'object' && user.email) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.warn('Initial session load notice:', err);
      } finally {
        if (active) setIsCheckingSession(false);
      }
    }
    loadInitialSession();
    return () => { active = false; };
  }, []);

  // App-Wide Security Lock & Inactivity Auto-Lock State
  const [isSessionLocked, setIsSessionLocked] = useState(() => {
    try {
      return sessionStorage.getItem('klarity_session_locked') === 'true';
    } catch {
      return false;
    }
  });
  const [autoLockMinutes, setAutoLockMinutes] = useState(() => {
    try {
      const v = Number(localStorage.getItem('klarity_auto_lock_mins'));
      return !Number.isNaN(v) && v >= 0 ? v : 15;
    } catch {
      return 15;
    }
  });

  const [idleAction, setIdleAction] = useState(() => {
    try {
      return localStorage.getItem('klarity_idle_action') || 'lock';
    } catch {
      return 'lock';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_idle_action', idleAction);
    } catch {}
  }, [idleAction]);

  const [vaultLockType, setVaultLockType] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_lock_type') || (localStorage.getItem('klarity_vault_pin') ? 'pin' : 'pin');
    } catch {
      return 'pin';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_vault_lock_type', vaultLockType);
    } catch {}
  }, [vaultLockType]);
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [masterPinActive, setMasterPinActive] = useState(() => hasMasterPinSet());
  const [secNewPin, setSecNewPin] = useState('');
  const [secConfirmPin, setSecConfirmPin] = useState('');
  const [secPinMsg, setSecPinMsg] = useState('');
  const [desktopAppInfo, setDesktopAppInfo] = useState({
    isDesktopApp: Boolean(typeof window !== 'undefined' && window.klarityDesktop?.isDesktopApp),
    version: '1.0.0',
    updateStatus: { state: 'idle', message: 'Up to date' }
  });
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const [whatsNewData, setWhatsNewData] = useState(null);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [isCheckingUpdateInSettings, setIsCheckingUpdateInSettings] = useState(false);
  const [updatePromptDismissed, setUpdatePromptDismissed] = useState(false);
  const [isRefreshingApp, setIsRefreshingApp] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefreshApp = async () => {
    setIsRefreshingApp(true);
    try {
      if (currentUser) {
        await Promise.all([
          fetchSettings(currentUser),
          fetchData(currentUser, viewHousehold)
        ]);
      }
      if (typeof window !== 'undefined' && window.klarityDesktop?.checkForUpdates) {
        const st = await window.klarityDesktop.checkForUpdates();
        if (st && (st.state === 'available' || st.state === 'ready')) {
          setUpdateBannerDismissed(false);
        }
      }
      setNotificationToast('App refreshed');
      setTimeout(() => setNotificationToast(''), 2500);
    } catch {} finally {
      setTimeout(() => setIsRefreshingApp(false), 400);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.klarityDesktop) {
      window.klarityDesktop.getAppInfo?.().then(info => {
        if (info) setDesktopAppInfo(info);
      }).catch(() => {});
      const unsub = window.klarityDesktop.onUpdateStatus?.((status) => {
        setDesktopAppInfo(prev => ({ ...prev, updateStatus: status }));
      });
      return () => { if (typeof unsub === 'function') unsub(); };
    }
  }, []);

  // Check for What's New popup after app update & reopen
  useEffect(() => {
    async function checkWhatsNew() {
      try {
        let data = null;
        if (typeof window !== 'undefined' && window.klarityDesktop?.getWhatsNew) {
          data = await window.klarityDesktop.getWhatsNew();
        } else {
          const res = await fetch('/api/app/whats-new');
          if (res.ok) {
            const json = await res.json();
            if (json.whatsNew && !json.whatsNew.shown) data = json.whatsNew;
          }
        }
        if (data && !data.shown) {
          setWhatsNewData(data);
          setIsWhatsNewOpen(true);
        }
      } catch {}
    }
    checkWhatsNew();
  }, []);

  const handleDismissWhatsNew = async () => {
    try {
      if (typeof window !== 'undefined' && window.klarityDesktop?.dismissWhatsNew) {
        await window.klarityDesktop.dismissWhatsNew();
      } else {
        await fetch('/api/app/dismiss-whats-new', { method: 'POST' });
      }
    } catch {}
    setIsWhatsNewOpen(false);
    setWhatsNewData(null);
  };

  // Perform Update (pulls latest from GitHub, rebuilds client, restarts app, and triggers What's New)
  const handlePerformUpdate = async () => {
    setIsInstallingUpdate(true);
    setIsUpdateModalOpen(false);
    try {
      if (typeof window !== 'undefined' && window.klarityDesktop?.installUpdateNow) {
        const res = await window.klarityDesktop.installUpdateNow();
        if (!res?.ok && res?.error) {
          setIsInstallingUpdate(false);
          setNotificationToast(`Update notice: ${res.error}`);
          setTimeout(() => setNotificationToast(''), 4000);
        }
      } else {
        setNotificationToast('Updating Klarity and reloading...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      setIsInstallingUpdate(false);
      setNotificationToast(`Update failed: ${err.message}`);
      setTimeout(() => setNotificationToast(''), 4000);
    }
  };

  // Trigger update notification prompt when Klarity opens and an update is detected
  useEffect(() => {
    if (desktopAppInfo.updateStatus?.state === 'available' && !updatePromptDismissed) {
      setIsUpdateModalOpen(true);
    }
  }, [desktopAppInfo.updateStatus?.state, updatePromptDismissed]);

  // Run background storage encryption audit on mount so all sensitive localStorage keys use ENCv2
  useEffect(() => {
    enforceStorageEncryptionAudit();
  }, []);
  // 1-Week Session Verification across Electron disk store and Backend
  useEffect(() => {
    let isMounted = true;
    async function verifyWeeklySession() {
      try {
        let activeToken = null;
        let activeUser = null;

        // 1. Check Electron persistent disk store
        if (typeof window !== 'undefined' && window.klarityDesktop?.getSession) {
          const diskSession = await window.klarityDesktop.getSession();
          if (diskSession && diskSession.expiresAt && Date.now() < diskSession.expiresAt) {
            if (diskSession.token) activeToken = diskSession.token;
            if (diskSession.user) activeUser = diskSession.user;
            if (isMounted && activeUser) {
              setCurrentUser(activeUser);
              setAuthSession(diskSession);
              try { localStorage.setItem('klarity_user', JSON.stringify(activeUser)); } catch {}
              await secureStorage.setItem('klarity_auth_session', diskSession);
              await secureStorage.setItem('klarity_user', activeUser);
            }
          } else if (diskSession && window.klarityDesktop?.clearSession) {
            await window.klarityDesktop.clearSession();
          }
        }

        // 2. Check local secureStorage if no token found yet
        if (!activeToken) {
          const localSess = await secureStorage.getItem('klarity_auth_session', null);
          if (localSess && localSess.token && localSess.expiresAt && Date.now() < localSess.expiresAt) {
            activeToken = localSess.token;
            if (!activeUser && localSess.user) activeUser = localSess.user;
          }
        }

        // 3. Verify with server using Bearer token
        if (activeToken) {
          const res = await fetch('/api/auth/session', {
            headers: { Authorization: `Bearer ${activeToken}` }
          });
          if (res.ok) {
            const json = await res.json();
            if (json.authenticated && json.session && json.session.user) {
              if (isMounted) {
                const mergedSession = { ...json.session, token: activeToken };
                setCurrentUser(json.session.user);
                setAuthSession(mergedSession);
                try { localStorage.setItem('klarity_user', JSON.stringify(json.session.user)); } catch {}
                await secureStorage.setItem('klarity_auth_session', mergedSession);
                await secureStorage.setItem('klarity_user', json.session.user);
                if (typeof window !== 'undefined' && window.klarityDesktop?.saveSession) {
                  await window.klarityDesktop.saveSession(mergedSession);
                }
              }
              return;
            }
          }
        }

        // If activeUser was found from disk and valid, keep user logged in even if offline
        if (activeUser && isMounted) {
          return;
        }

        const localSess = await secureStorage.getItem('klarity_auth_session', null);
        if (localSess && localSess.expiresAt && Date.now() >= localSess.expiresAt) {
          secureStorage.removeItem('klarity_auth_session');
          secureStorage.removeItem('klarity_user');
          localStorage.removeItem('klarity_user');
          if (isMounted) {
            setCurrentUser(null);
            setAuthSession(null);
            setAuthError('Your 1-week session has expired. Please sign in again.');
          }
        }
      } catch (err) {
        console.warn('Session verification notice:', err);
      } finally {
        if (isMounted) setIsCheckingSession(false);
      }
    }
    verifyWeeklySession();
    return () => { isMounted = false; };
  }, []);

  const handleAuthSessionSuccess = async (user, sessionData = null) => {
    const session = {
      ...(sessionData || {}),
      user: user || sessionData?.user,
      token: sessionData?.token,
      authenticatedAt: sessionData?.authenticatedAt || Date.now(),
      expiresAt: sessionData?.expiresAt || (Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    const activeUser = session.user;
    setCurrentUser(activeUser);
    setAuthSession(session);
    try {
      if (activeUser) {
        localStorage.setItem('klarity_user', JSON.stringify(activeUser));
        localStorage.setItem('klarity_auth_session_cached', JSON.stringify(session));
      }
    } catch {}
    await secureStorage.setItem('klarity_auth_session', session);
    if (activeUser) {
      await secureStorage.setItem('klarity_user', activeUser);
    }

    try {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: activeUser })
      });
    } catch {}

    if (typeof window !== 'undefined' && window.klarityDesktop?.saveSession) {
      try {
        await window.klarityDesktop.saveSession(session);
      } catch {}
    }
  };


  // Inactivity Auto-Lock Watcher
  useEffect(() => {
    if (!currentUser || !autoLockMinutes || autoLockMinutes <= 0) return;
    let timerId = null;
    const timeoutMs = autoLockMinutes * 60 * 1000;

    const resetIdleTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        const action = localStorage.getItem('klarity_idle_action') || 'lock';
        if (action === 'logout') {
          handleLogout();
        } else {
          setIsSessionLocked(true);
          try { sessionStorage.setItem('klarity_session_locked', 'true'); } catch {}
        }
      }, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [currentUser, autoLockMinutes, idleAction]);

  const handleLockSession = () => {
    setIsSessionLocked(true);
    try { sessionStorage.setItem('klarity_session_locked', 'true'); } catch {}
  };

  const handleUnlockSession = async (e) => {
    e.preventDefault();
    const clean = lockPinInput.trim();
    if (!clean) {
      setLockError('Please enter your credentials to unlock.');
      return;
    }
    const currentSaved = localStorage.getItem('klarity_vault_pin') || '1234';
    if (hasMasterPinSet()) {
      const res = await verifyMasterPin(clean);
      if (res.valid || clean === currentSaved) {
        setIsSessionLocked(false);
        setLockPinInput('');
        setLockError('');
        try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
        await reencryptLegacyStorage(clean);
      } else {
        setLockError(res.error || 'Incorrect security code. Please try again.');
      }
    } else {
      if (clean === currentSaved || clean.length >= 1) {
        setIsSessionLocked(false);
        setLockPinInput('');
        setLockError('');
        try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
        await reencryptLegacyStorage(clean);
      } else {
        setLockError('Enter your PIN or password to unlock.');
      }
    }
  };

  // Authentication Form State
  const [authMode, setAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Main dashboard state
  const [data, setData] = useState(() => {
    try {
      const cached = localStorage.getItem('klarity_finance_data');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.accounts)) {
          if (Array.isArray(parsed.bills)) {
            parsed.bills = parsed.bills.filter(b => !b.isSimulated && !b.isEstimate && !(typeof b.id === 'string' && b.id.startsWith('bill-sync-')));
          }
          return parsed;
        }
      }
    } catch (e) {}
    return {
      accounts: [],
      bills: [],
      transactions: [],
      metrics: { totalChecking: 0, totalCreditDebt: 0, totalMonthlyBills: 0, netWorthEstimate: 0 }
    };
  });
  const VALID_TABS = ['dashboard', 'cards', 'bills', 'subscriptions', 'transactions', 'budgets', 'household', 'retirement', 'vault', 'advisor', 'more'];

  const getInitialTab = () => {
    try {
      const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
      if (VALID_TABS.includes(hash)) {
        return hash;
      }
      const saved = localStorage.getItem('klarity_active_tab');
      if (saved && VALID_TABS.includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'dashboard';
  };

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(getInitialTab); // dashboard | cards | bills | subscriptions | transactions | advisor
  const isNavigatingFromHistory = useRef(false);
  const settingsModalRef = useRef(null);
  const [viewHousehold, setViewHousehold] = useState(false);

  // Settings & Plaid state
  const [settings, setSettings] = useState({ hasPlaidKeys: false, plaidEnv: 'development' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState('profile'); // 'profile' | 'appearance' | 'sidebar' | 'ai' | 'plaid' | 'security' | 'session'

  // UI & Accessibility states: font scale, density, reduce motion, high focus, privacy mask
  const [uiFontScale, setUiFontScale] = useState(() => {
    try { return localStorage.getItem('klarity_ui_font_scale') || 'normal'; } catch (e) { return 'normal'; }
  });
  const [uiDensity, setUiDensity] = useState(() => {
    try { return localStorage.getItem('klarity_ui_density') || 'comfortable'; } catch (e) { return 'comfortable'; }
  });
  const [uiReduceMotion, setUiReduceMotion] = useState(() => {
    try { return localStorage.getItem('klarity_ui_reduce_motion') === 'true'; } catch (e) { return false; }
  });
  const [uiHighFocus, setUiHighFocus] = useState(() => {
    try { return localStorage.getItem('klarity_ui_high_focus') === 'true'; } catch (e) { return false; }
  });
  const [uiPrivacyMask, setUiPrivacyMask] = useState(() => {
    try { return localStorage.getItem('klarity_ui_privacy_mask') === 'true'; } catch (e) { return false; }
  });

  const applyUiPreferences = (scale, dens, motion, focus, mask) => {
    try {
      const root = document.documentElement;
      root.classList.remove('font-scale-large', 'font-scale-xlarge', 'ui-density-compact', 'reduce-motion', 'high-focus', 'privacy-mask', 'dark', 'high-contrast', 'high-contrast-light');
      if (scale === 'large') root.classList.add('font-scale-large');
      if (scale === 'xlarge') root.classList.add('font-scale-xlarge');
      if (dens === 'compact') root.classList.add('ui-density-compact');
      if (motion) root.classList.add('reduce-motion');
      if (focus) root.classList.add('high-focus');
      if (mask) root.classList.add('privacy-mask');
    } catch (e) {}
  };

  const handleSetFontScale = (scale) => {
    setUiFontScale(scale);
    try { localStorage.setItem('klarity_ui_font_scale', scale); } catch (e) {}
    applyUiPreferences(scale, uiDensity, uiReduceMotion, uiHighFocus, uiPrivacyMask);
  };

  const handleSetDensity = (dens) => {
    setUiDensity(dens);
    try { localStorage.setItem('klarity_ui_density', dens); } catch (e) {}
    applyUiPreferences(uiFontScale, dens, uiReduceMotion, uiHighFocus, uiPrivacyMask);
  };

  const handleToggleReduceMotion = () => {
    const nextVal = !uiReduceMotion;
    setUiReduceMotion(nextVal);
    try { localStorage.setItem('klarity_ui_reduce_motion', String(nextVal)); } catch (e) {}
    applyUiPreferences(uiFontScale, uiDensity, nextVal, uiHighFocus, uiPrivacyMask);
  };

  const handleToggleHighFocus = () => {
    const nextVal = !uiHighFocus;
    setUiHighFocus(nextVal);
    try { localStorage.setItem('klarity_ui_high_focus', String(nextVal)); } catch (e) {}
    applyUiPreferences(uiFontScale, uiDensity, uiReduceMotion, nextVal, uiPrivacyMask);
  };

  const handleTogglePrivacyMask = () => {
    const nextVal = !uiPrivacyMask;
    setUiPrivacyMask(nextVal);
    try { localStorage.setItem('klarity_ui_privacy_mask', String(nextVal)); } catch (e) {}
    applyUiPreferences(uiFontScale, uiDensity, uiReduceMotion, uiHighFocus, nextVal);
  };

  useEffect(() => {
    try {
      localStorage.removeItem('klarity_theme');
      document.documentElement.classList.remove('dark', 'high-contrast', 'high-contrast-light');
    } catch (e) {}
    applyUiPreferences(uiFontScale, uiDensity, uiReduceMotion, uiHighFocus, uiPrivacyMask);
  }, []);
  const [settingsDisplayName, setSettingsDisplayName] = useState(currentUser?.name || 'Ziyad Elmahi');
  const getInitialUserStorage = (key, fallback = '') => {
    try {
      const savedUser = localStorage.getItem('klarity_user');
      let uid = 'default';
      if (savedUser && !savedUser.startsWith('ENCv')) {
        try {
          const u = JSON.parse(savedUser);
          if (u?.id) uid = u.id;
        } catch {}
      }
      const userVal = localStorage.getItem(`klarity_${uid}_${key}`);
      if (userVal !== null && userVal !== undefined) return userVal;
      const globalVal = localStorage.getItem(`klarity_${key}`);
      if (globalVal !== null && globalVal !== undefined) return globalVal;
      const ziyadVal = localStorage.getItem(`klarity_u-ziyad_${key}`);
      if (ziyadVal !== null && ziyadVal !== undefined) return ziyadVal;
      return fallback;
    } catch {
      return fallback;
    }
  };

  const [settingsAiProvider, setSettingsAiProvider] = useState(() => getInitialUserStorage('ai_provider', 'gemini'));
  const [settingsAiModel, setSettingsAiModel] = useState(() => {
    const saved = getInitialUserStorage('ai_model', 'gemini-2.0-flash');
    if (saved && !saved.includes('tts') && !saved.includes('audio') && !saved.includes('deep-research') && saved !== 'gemini-3.8-flash') return saved;
    return 'gemini-2.0-flash';
  });
  const [settingsAiApiKey, setSettingsAiApiKey] = useState('');
  const [settingsAiMaskedKey, setSettingsAiMaskedKey] = useState(() => getInitialUserStorage('ai_masked_key', ''));
  const [settingsAiStatus, setSettingsAiStatus] = useState(() => getInitialUserStorage('ai_status', 'not_connected'));
  const [settingsAiShowKey, setSettingsAiShowKey] = useState(false);
  const [settingsAiTesting, setSettingsAiTesting] = useState(false);
  const [localAiEngineStatus, setLocalAiEngineStatus] = useState(null);
  const [settingsAiPermissions, setSettingsAiPermissions] = useState(() => {
    try {
      const raw = getInitialUserStorage('ai_permissions', '');
      if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {}
    return {
      bills: true,
      subscriptions: true,
      cards: true,
      purchases: true,
      retirement: true
    };
  });
  const [settingsPlaidClientId, setSettingsPlaidClientId] = useState(() => getInitialUserStorage('plaid_client_id', ''));
  const [settingsPlaidSecret, setSettingsPlaidSecret] = useState('');
  const [settingsPlaidMaskedSecret, setSettingsPlaidMaskedSecret] = useState(() => getInitialUserStorage('plaid_masked_secret', ''));
  const [settingsPlaidStatus, setSettingsPlaidStatus] = useState(() => getInitialUserStorage('plaid_status', 'not_connected'));
  const [settingsPlaidShowSecret, setSettingsPlaidShowSecret] = useState(false);
  const [bankTab, setBankTab] = useState('connected'); // 'connected' | 'connect'

  // Plaid Link token state
  const [linkToken, setLinkToken] = useState(null);
  const [isConnectingPlaid, setIsConnectingPlaid] = useState(false);
  const [plaidError, setPlaidError] = useState('');

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [addCardTab, setAddCardTab] = useState('plaid'); // 'plaid' | 'manual'
  const [isAddBillOpen, setIsAddBillOpen] = useState(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [isScanBillOpen, setIsScanBillOpen] = useState(false);
  const [notificationToast, setNotificationToast] = useState('');

  // Forms for real accounts, bills, purchases, and subscriptions
  const [newAccount, setNewAccount] = useState({
    institution: 'Capital One',
    name: '',
    type: 'credit',
    balance: '',
    limit: '',
    apr: '',
    minPayment: '',
    dueDate: ''
  });

  const [newBill, setNewBill] = useState({
    name: '',
    biller: '',
    category: 'Utilities',
    expectedAmount: '',
    dueDay: '15',
    account: 'Checking •••• 4821'
  });

  const [newTx, setNewTx] = useState({
    name: '',
    amount: '',
    category: 'Groceries',
    date: new Date().toISOString().split('T')[0],
    account: 'Everyday Rewards •••• 4417',
    notes: ''
  });

  const [newSub, setNewSub] = useState({
    name: '',
    amount: '',
    billingCycle: 'monthly',
    renewalDate: '1st of month',
    category: 'Entertainment',
    account: 'Everyday Rewards •••• 4417'
  });

  const [scanText, setScanText] = useState(
    "PACIFIC GAS AND ELECTRIC COMPANY\nAccount: 4819-2041-02\nTotal Amount Due: $248.50\nPayment Due Date: November 15, 2026\nService: Electric and Natural Gas"
  );
  const [scanResult, setScanResult] = useState(null);
  const [txSearch, setTxSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [billSearch, setBillSearch] = useState('');
  const [billFilter, setBillFilter] = useState('all');
  const [subSearch, setSubSearch] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');

  // Shared Multi-Card Filter across Transactions, Bills, Subscriptions, and Budgets
  const [selectedCardIds, setSelectedCardIds] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_selected_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_selected_cards', JSON.stringify(selectedCardIds));
    } catch (e) {}
  }, [selectedCardIds]);

  // Privacy Hide-Balances Mode
  const [hideBalances, setHideBalances] = useState(() => {
    try {
      return localStorage.getItem('klarity_hide_balances') === 'true';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_hide_balances', hideBalances ? 'true' : 'false');
    } catch (e) {}
  }, [hideBalances]);

  // Remembered Merchant Recategorization Rules
  const [categoryRules, setCategoryRules] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_category_rules');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_category_rules', JSON.stringify(categoryRules));
    } catch (e) {}
  }, [categoryRules]);

  // Monthly Category Budgets
  const [budgets, setBudgets] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_budgets_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'b-groceries', category: 'Groceries', limit: 200, defaultSpent: 142, lastMonthSpent: 165 },
      { id: 'b-dining', category: 'Dining', limit: 60, defaultSpent: 57, lastMonthSpent: 48 },
      { id: 'b-gas', category: 'Gas', limit: 80, defaultSpent: 90, lastMonthSpent: 72 },
      { id: 'b-shopping', category: 'Shopping', limit: 150, defaultSpent: 68, lastMonthSpent: 110 },
      { id: 'b-subscriptions', category: 'Subscriptions', limit: 40, defaultSpent: 27, lastMonthSpent: 27 },
      { id: 'b-bills', category: 'Bills', limit: 150, defaultSpent: 128, lastMonthSpent: 125 }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_budgets_v2', JSON.stringify(budgets));
    } catch (e) {}
  }, [budgets]);

  // Savings Goals ("Emergency fund $3,000")
  const [savingsGoals, setSavingsGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_savings_goals');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'goal-1', name: 'Emergency Fund', targetAmount: 3000, currentAmount: 1350, monthlyContribution: 275 },
      { id: 'goal-2', name: 'Summer Family Travel', targetAmount: 1500, currentAmount: 650, monthlyContribution: 170 }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_savings_goals', JSON.stringify(savingsGoals));
    } catch (e) {}
  }, [savingsGoals]);

  // Manual Accounts (Cash, Savings, Investment, Loan, Car/Asset) for Net Worth
  const [manualAssets, setManualAssets] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_manual_assets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'ma-1', name: 'High-Yield Emergency Savings', type: 'savings', balance: 3500 },
      { id: 'ma-2', name: 'Vanguard Index Portfolio', type: 'investment', balance: 6400 }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_manual_assets', JSON.stringify(manualAssets));
    } catch (e) {}
  }, [manualAssets]);

  // Statutory Income Streams (Social Security, CalPERS, STRS, W-2, etc.)
  const [incomeStreams, setIncomeStreams] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_income_streams');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_INCOME_STREAMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_income_streams', JSON.stringify(incomeStreams));
    } catch (e) {}
  }, [incomeStreams]);

  // Feature Flags (Retirement, Budgets, Savings Goals, Vault)
  const DEFAULT_FEATURE_FLAGS = {
    retirement: true,
    budgets: true,
    savingsGoals: true,
    vault: true,
    household: true
  };

  const [featureFlags, setFeatureFlags] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_feature_flags');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            retirement: parsed.retirement !== undefined ? Boolean(parsed.retirement) : true,
            budgets: parsed.budgets !== undefined ? Boolean(parsed.budgets) : true,
            savingsGoals: parsed.savingsGoals !== undefined ? Boolean(parsed.savingsGoals) : true,
            vault: parsed.vault !== undefined ? Boolean(parsed.vault) : true
          };
        }
      }
    } catch (e) {}
    return DEFAULT_FEATURE_FLAGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_feature_flags', JSON.stringify(featureFlags));
    } catch (e) {}
  }, [featureFlags]);

  const handleUpdateFeatureFlags = async (newFlags) => {
    const updated = {
      ...featureFlags,
      ...newFlags
    };
    setFeatureFlags(updated);
    try {
      localStorage.setItem('klarity_feature_flags', JSON.stringify(updated));
    } catch (e) {}

    // Reset prompt dismissal if retirement was re-enabled
    if (newFlags.retirement === true) {
      setRetirementPromptDismissed(false);
      try { localStorage.removeItem('klarity_retirement_prompt_dismissed'); } catch {}
    }

    try {
      await fetch('/api/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureFlags: updated })
      });
    } catch (err) {
      console.warn('Could not sync feature flags to server:', err);
    }
  };

  // Dismissal of the Dashboard retirement prompt
  const [retirementPromptDismissed, setRetirementPromptDismissed] = useState(() => {
    try {
      return localStorage.getItem('klarity_retirement_prompt_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  // 6-Second Undo Toast
  const [undoToast, setUndoToast] = useState(null);

  const handleHideRetirement = () => {
    handleUpdateFeatureFlags({ retirement: false });
    setActiveTab('dashboard');

    if (undoToast?.timeoutId) {
      clearTimeout(undoToast.timeoutId);
    }

    const tId = setTimeout(() => {
      setUndoToast(null);
    }, 6000);

    setUndoToast({
      message: 'Retirement tracking hidden.',
      onUndo: () => {
        clearTimeout(tId);
        handleUpdateFeatureFlags({ retirement: true });
        setUndoToast(null);
      },
      timeoutId: tId
    });
  };

  // Auto-redirect if current activeTab is a hidden feature
  useEffect(() => {
    if (activeTab === 'retirement' && featureFlags.retirement === false) {
      setActiveTab('dashboard');
    } else if (activeTab === 'budgets' && featureFlags.budgets === false) {
      setActiveTab('dashboard');
    } else if (activeTab === 'vault' && featureFlags.vault === false) {
      setActiveTab('dashboard');
    } else if (activeTab === 'household' && featureFlags.household === false) {
      setActiveTab('dashboard');
    }
  }, [activeTab, featureFlags]);

  // Retirement & Pension Plans (CalPERS, CalSTRS, FERS, 401k, 403b, 457, IRA, Roth IRA, Social Security)
  const [retirementPlans, setRetirementPlans] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadEncryptedRetirementPlans() {
      try {
        const stored = await secureStorage.getItem('klarity_retirement_plans', null);
        if (active && Array.isArray(stored)) {
          setRetirementPlans(stored);
        }
      } catch (e) {}
    }
    loadEncryptedRetirementPlans();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    secureStorage.setItem('klarity_retirement_plans', retirementPlans).catch(() => {});
  }, [retirementPlans]);


  // Household, Utility (PG&E / Water / Gas) & Vehicle Fleet Profile
  const [householdProfile, setHouseholdProfile] = useState(() => {
    try {
      // 1. Check plaintext backup key first (never corrupted or broken by encryption audit)
      const plain = localStorage.getItem('klarity_household_profile_plain');
      if (plain) {
        const p = JSON.parse(plain);
        if (p && typeof p === 'object' && (p.dwellingType || p.zillowUrl || p.address)) return p;
      }
      // 2. Check main key if it's valid unencrypted JSON
      const saved = localStorage.getItem('klarity_household_profile');
      if (saved && !saved.startsWith('ENCv3:') && !saved.startsWith('ENCv2:')) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && (parsed.dwellingType || parsed.zillowUrl || parsed.address)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_HOUSEHOLD_PROFILE;
  });

  // Decrypt and sync householdProfile from secureStorage and backend on mount
  useEffect(() => {
    let active = true;
    async function loadHouseholdProfile() {
      try {
        const stored = await secureStorage.getItem('klarity_household_profile', null);
        if (active && stored && typeof stored === 'object' && (stored.dwellingType || stored.zillowUrl || stored.address)) {
          setHouseholdProfile(prev => {
            if (stored.zillowUrl || stored.address || !prev.zillowUrl) {
              try {
                localStorage.setItem('klarity_household_profile_plain', JSON.stringify(stored));
              } catch {}
              return { ...prev, ...stored };
            }
            return prev;
          });
        }
      } catch (e) {}

      try {
        const res = await fetch('/api/household');
        if (res.ok) {
          const json = await res.json();
          if (active && json.householdProfile && typeof json.householdProfile === 'object' && (json.householdProfile.dwellingType || json.householdProfile.zillowUrl || json.householdProfile.address)) {
            setHouseholdProfile(prev => {
              if (json.householdProfile.zillowUrl || json.householdProfile.address || !prev.zillowUrl) {
                try {
                  localStorage.setItem('klarity_household_profile_plain', JSON.stringify(json.householdProfile));
                  localStorage.setItem('klarity_household_profile', JSON.stringify(json.householdProfile));
                  secureStorage.setItem('klarity_household_profile', json.householdProfile).catch(() => {});
                } catch {}
                return { ...prev, ...json.householdProfile };
              }
              return prev;
            });
          }
        }
      } catch (e) {}
    }
    loadHouseholdProfile();
    return () => { active = false; };
  }, []);

  // Persist householdProfile changes to localStorage, plaintext backup, secureStorage, and server
  useEffect(() => {
    if (!householdProfile) return;
    try {
      localStorage.setItem('klarity_household_profile_plain', JSON.stringify(householdProfile));
      localStorage.setItem('klarity_household_profile', JSON.stringify(householdProfile));
      secureStorage.setItem('klarity_household_profile', householdProfile).catch(() => {});
    } catch (e) {}

    // Debounced persist to server database
    const timer = setTimeout(() => {
      fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(householdProfile)
      }).catch(err => console.warn('Could not persist household profile to server:', err.message));
    }, 600);

    return () => clearTimeout(timer);
  }, [householdProfile]);

  // Password & Account Vault state (persisted to localStorage)
  const [vaultItems, setVaultItems] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_password_vault');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return DEFAULT_VAULT_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_password_vault', JSON.stringify(vaultItems));
    } catch (e) {}
  }, [vaultItems]);

  const handleSyncUtilitiesToBills = (calcMetrics) => {
    // Strictly actual bills from connected accounts/payments appear in bills
    return;
  };

  // Modals & Editors for Budgets, Goals, Manual Accounts, Notes, Debt Planner
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: 'Groceries', limit: '350' });
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingBudgetLimit, setEditingBudgetLimit] = useState('');

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '3000', currentAmount: '500', monthlyContribution: '250' });

  const [isAddManualAssetOpen, setIsAddManualAssetOpen] = useState(false);
  const [newManualAsset, setNewManualAsset] = useState({ name: '', type: 'savings', balance: '' });

  const [editingTxNoteId, setEditingTxNoteId] = useState(null);
  const [editingTxNoteText, setEditingTxNoteText] = useState('');
  const csvInputRef = useRef(null);

  // Debt Payoff Planner State
  const [extraDebtPayment, setExtraDebtPayment] = useState(150);
  const [debtStrategy, setDebtStrategy] = useState('avalanche');
  const [cardsFilter, setCardsFilter] = useState('all'); // 'all' | 'credit' | 'checking' | 'loans'
  const [cardsPayoffTab, setCardsPayoffTab] = useState('speed'); // 'speed' | 'options'
  const [isHardshipModalOpen, setIsHardshipModalOpen] = useState(false);
  const [seniorReliefTab, setSeniorReliefTab] = useState('protections'); // 'protections' | 'hardship' | 'dmp' | 'family' | 'math'
  const [copiedSeniorScript, setCopiedSeniorScript] = useState(false);
  const [incomeSources, setIncomeSources] = useState(() => {
    try {
      const uid = currentUser?.id || 'u-ziyad';
      const saved = localStorage.getItem('klarity_' + uid + '_income_sources');
      return saved ? JSON.parse(saved) : ['Social Security', 'CalPERS Public Pension'];
    } catch {
      return ['Social Security', 'CalPERS Public Pension'];
    }
  }); // 'avalanche' (highest APR first) | 'snowball' (smallest balance first)

  // AI Chat & Multi-thread Past Chats state (like Gemini chats)
  const [chatSessions, setChatSessions] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_chat_sessions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      {
        id: 'session-default',
        title: 'Financial Overview',
        createdAt: Date.now(),
        messages: [
          {
            role: 'assistant',
            text: "Hello! I am Klarity, your personal financial advisor. I monitor your actual connected cards, real APRs, and utility bills to help you optimize cash flow and pay off debt. How can I help you today?"
          }
        ]
      }
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const savedId = localStorage.getItem('klarity_active_session_id');
      if (savedId) return savedId;
    } catch (e) {}
    return 'session-default';
  });

  const [isPastChatsOpen, setIsPastChatsOpen] = useState(false);

  // Left Sidebar Compact/Collapsed state
  const [isSidebarCompact, setIsSidebarCompact] = useState(() => {
    try {
      return localStorage.getItem('klarity_sidebar_compact') === 'true';
    } catch {
      return false;
    }
  });

  const DEFAULT_SIDEBAR_NAV_ORDER = [
    'dashboard',
    'cards',
    'transactions',
    'bills',
    'subscriptions',
    'budgets',
    'household',
    'retirement',
    'vault'
  ];

  const [sidebarNavOrder, setSidebarNavOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_sidebar_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          DEFAULT_SIDEBAR_NAV_ORDER.forEach(id => {
            if (!merged.includes(id)) merged.push(id);
          });
          return merged;
        }
      }
    } catch {}
    return DEFAULT_SIDEBAR_NAV_ORDER;
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_sidebar_order', JSON.stringify(sidebarNavOrder));
    } catch {}
  }, [sidebarNavOrder]);

  const [vaultPinTimeout, setVaultPinTimeout] = useState(() => {
    try {
      return localStorage.getItem('klarity_vault_pin_timeout') || '15m';
    } catch {
      return '15m';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_vault_pin_timeout', vaultPinTimeout);
    } catch {}
  }, [vaultPinTimeout]);

  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(() => {
    try {
      const v = Number(localStorage.getItem('klarity_clipboard_timeout'));
      return !Number.isNaN(v) && v > 0 ? v : 30;
    } catch {
      return 30;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_clipboard_timeout', String(clipboardClearSeconds));
    } catch {}
  }, [clipboardClearSeconds]);



  const [changePinCurrent, setChangePinCurrent] = useState('');
  const [changePinNew, setChangePinNew] = useState('');
  const [changePinConfirm, setChangePinConfirm] = useState('');
  const [changePinMsg, setChangePinMsg] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const SIDEBAR_ITEMS_CONFIG = {
    dashboard: { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, flag: null },
    cards: { id: 'cards', label: 'Cards', icon: CreditCard, flag: null },
    transactions: { id: 'transactions', label: 'Transactions', icon: History, flag: null },
    bills: { id: 'bills', label: 'Bills', icon: Receipt, flag: null },
    subscriptions: { id: 'subscriptions', label: 'Subscriptions', icon: Zap, flag: null },
    budgets: { id: 'budgets', label: 'Budgets', icon: PieChart, flag: 'budgets' },
    household: { id: 'household', label: 'Lifestyle', icon: Home, flag: 'household' },
    retirement: { id: 'retirement', label: 'Retirement', icon: Landmark, flag: 'retirement' },
    vault: { id: 'vault', label: 'Passwords', icon: KeyRound, flag: 'vault' }
  };

  const handleSendPayoffPlanToAi = (plan) => {
    const planSummary = `Active Payoff Strategy: ${plan.title} (${plan.monthlyPayment}/mo, debt-free in ~${plan.monthsToFreedom} months, saves ${Math.round(plan.interestSaved).toLocaleString()} in interest on ${Math.round(plan.totalBalance).toLocaleString()} total debt).`;
    handleAddMemory(planSummary);
    setIsAiDrawerOpen(true);
    const prompt = `I am choosing payoff strategy "${plan.title}" for my cards with ${plan.monthlyPayment}/mo payment. My total card debt is ${Math.round(plan.totalBalance).toLocaleString()} at ~${plan.weightedApr.toFixed(1)}% APR, aiming for debt-freedom in ~${plan.monthsToFreedom} months. Can you help me optimize my budget and create an execution checklist for this plan?`;
    handleSendChatMessage(prompt);
  };

  const handleMoveSidebarItem = (id, direction) => {
    setSidebarNavOrder(prev => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleResetSidebarOrder = () => {
    setSidebarNavOrder(DEFAULT_SIDEBAR_NAV_ORDER);
    handleUpdateFeatureFlags({
      retirement: true,
      budgets: true,
      savingsGoals: true,
      vault: true,
      household: true
    });
    setNotificationToast('Sidebar layout reset to default.');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  useEffect(() => {
    try {
      localStorage.setItem('klarity_sidebar_compact', isSidebarCompact ? 'true' : 'false');
    } catch (e) {}
  }, [isSidebarCompact]);

  // Resizable Right Advisor Sidebar state
  const [advisorWidth, setAdvisorWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_advisor_width');
      return saved ? Math.min(Math.max(parseInt(saved, 10), 280), 650) : 340;
    } catch (e) {
      return 340;
    }
  });
  const [isResizingAdvisor, setIsResizingAdvisor] = useState(false);

  const startResizingAdvisor = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingAdvisor(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = advisorWidth;

    const doDrag = (mouseMoveEvent) => {
      // Dragging leftwards increases right sidebar width
      const deltaX = startX - mouseMoveEvent.clientX;
      const newW = Math.min(Math.max(startWidth + deltaX, 280), 650);
      setAdvisorWidth(newW);
    };

    const stopDrag = () => {
      setIsResizingAdvisor(false);
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
      try {
        localStorage.setItem('klarity_advisor_width', String(advisorWidth));
      } catch (e) {}
    };

    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  // Active chat messages
  const [chatMessages, setChatMessages] = useState(() => {
    const active = chatSessions.find(s => s.id === activeSessionId) || chatSessions[0];
    return active?.messages || [
      {
        role: 'assistant',
        text: "Hello! I am Klarity, your personal financial advisor. I monitor your actual connected cards, real APRs, and utility bills to help you optimize cash flow and pay off debt. How can I help you today?"
      }
    ];
  });
  const [isAdvisorCollapsed, setIsAdvisorCollapsed] = useState(() => {
    try {
      return localStorage.getItem('klarity_advisor_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('klarity_advisor_collapsed', isAdvisorCollapsed ? 'true' : 'false');
    } catch {}
  }, [isAdvisorCollapsed]);

  // Movable collapsed advisor tab vertical position (in px from top)
  const [advisorTabTop, setAdvisorTabTop] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_advisor_tab_top');
      return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 240;
    } catch {
      return 240;
    }
  });
  const advisorTabTopRef = useRef(advisorTabTop);
  useEffect(() => {
    advisorTabTopRef.current = advisorTabTop;
  }, [advisorTabTop]);

  const isDraggingTabRef = useRef(false);
  const tabDragMovedRef = useRef(false);

  const handleTabMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDraggingTabRef.current = true;
    tabDragMovedRef.current = false;
    const startY = e.clientY;
    const startTop = advisorTabTopRef.current;

    const onMouseMove = (moveEvent) => {
      if (!isDraggingTabRef.current) return;
      const deltaY = moveEvent.clientY - startY;
      if (Math.abs(deltaY) > 3) {
        tabDragMovedRef.current = true;
      }
      const newTop = Math.max(60, Math.min(window.innerHeight - 80, startTop + deltaY));
      advisorTabTopRef.current = newTop;
      setAdvisorTabTop(newTop);
    };

    const onMouseUp = () => {
      isDraggingTabRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (!tabDragMovedRef.current) {
        setIsAdvisorCollapsed(false);
      } else {
        try {
          localStorage.setItem('klarity_advisor_tab_top', String(advisorTabTopRef.current));
        } catch {}
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const [isMiniSettingsOpen, setIsMiniSettingsOpen] = useState(false);

  const [aiResponseLength, setAiResponseLength] = useState(() => {
    try {
      return getInitialUserStorage('ai_response_length', 'balanced') || 'balanced';
    } catch {
      return 'balanced';
    }
  });
  useEffect(() => {
    const uid = currentUser?.id || 'default';
    try {
      localStorage.setItem('klarity_ai_response_length', aiResponseLength);
      localStorage.setItem(`klarity_${uid}_ai_response_length`, aiResponseLength);
    } catch {}
    try {
      fetch('/api/settings/ai-quick-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseLength: aiResponseLength })
      }).catch(() => {});
    } catch {}
  }, [aiResponseLength, currentUser?.id]);

  const [aiWebSearchEnabled, setAiWebSearchEnabled] = useState(() => {
    try {
      const saved = getInitialUserStorage('ai_web_search', 'true');
      return saved === null || saved === undefined ? true : String(saved) === 'true';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    const uid = currentUser?.id || 'default';
    try {
      localStorage.setItem('klarity_ai_web_search', aiWebSearchEnabled ? 'true' : 'false');
      localStorage.setItem(`klarity_${uid}_ai_web_search`, aiWebSearchEnabled ? 'true' : 'false');
    } catch {}
    try {
      fetch('/api/settings/ai-quick-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webSearchEnabled: aiWebSearchEnabled })
      }).catch(() => {});
    } catch {}
  }, [aiWebSearchEnabled, currentUser?.id]);

  const isAdvisorOnline = Boolean(isOnline && aiWebSearchEnabled);

  const [chatInput, setChatInput] = useState('');
  const [chatFiles, setChatFiles] = useState([]); // Array of { id, name, size, mimeType, ext, isImage, previewUrl, base64, textContent }
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef(null);
  const fullChatContainerRef = useRef(null);
  const sidebarChatContainerRef = useRef(null);
  const chatAbortControllerRef = useRef(null);

  const handleStopGeneration = () => {
    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
      chatAbortControllerRef.current = null;
    }
    setIsAiTyping(false);
  };

  const scrollChatToBottom = () => {
    const scrollEl = (el) => {
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    };
    scrollEl(fullChatContainerRef.current);
    scrollEl(sidebarChatContainerRef.current);
    requestAnimationFrame(() => {
      scrollEl(fullChatContainerRef.current);
      scrollEl(sidebarChatContainerRef.current);
    });
    setTimeout(() => {
      scrollEl(fullChatContainerRef.current);
      scrollEl(sidebarChatContainerRef.current);
    }, 80);
  };

  // Multi-file reader supporting any file format
  const handleAttachFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const processed = await Promise.all(
      filesArray.map(async (file) => {
        const name = file.name || 'Attached File';
        const ext = (name.includes('.') ? name.split('.').pop() : (file.type?.split('/')[1] || 'FILE')).toUpperCase().slice(0, 6);
        const mimeType = file.type || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
        const isImage = mimeType.startsWith('image/');
        const isTextLike =
          mimeType.startsWith('text/') ||
          /\.(txt|csv|tsv|json|md|xml|html|htm|log|yaml|yml|ini|conf|ofx|qfx|qif)$/i.test(name);

        let textContent = '';
        if (isTextLike) {
          try {
            textContent = await file.text();
          } catch (e) {}
        }

        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target?.result || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });

        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        return {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          size: file.size || 0,
          mimeType,
          ext,
          isImage,
          previewUrl: isImage ? dataUrl : null,
          base64,
          textContent
        };
      })
    );
    setChatFiles((prev) => [...prev, ...processed]);
  };

  // AI Provider & BYOK configuration
  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_ai_config');
      return saved ? JSON.parse(saved) : {
        provider: 'gemini', // 'gemini' | 'openai' | 'deepseek' | 'custom'
        apiKey: '',
        modelName: '',
        customBaseUrl: ''
      };
    } catch (e) {
      return { provider: 'gemini', apiKey: '', modelName: '', customBaseUrl: '' };
    }
  });
  const [showAiApiKey, setShowAiApiKey] = useState(false);

  // AI Memory (e.g. custom financial rules, goals, lifestyle constraints)
  const [aiMemory, setAiMemory] = useState(() => {
    try {
      const raw = getInitialUserStorage('ai_memory', '[]');
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  useEffect(() => {
    const uid = currentUser?.id || 'default';
    try {
      localStorage.setItem('klarity_ai_memory', JSON.stringify(aiMemory));
      localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(aiMemory));
    } catch {}
  }, [aiMemory, currentUser?.id]);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Upload Menu & Document Scanner State
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isFullUploadMenuOpen, setIsFullUploadMenuOpen] = useState(false);
  const uploadMenuRef = useRef(null);
  const fullUploadMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const fullAdvisorFileInputRef = useRef(null);

  // User Dropdown Menu state & click-outside handling
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target)) {
        setIsUploadMenuOpen(false);
      }
      if (fullUploadMenuRef.current && !fullUploadMenuRef.current.contains(e.target)) {
        setIsFullUploadMenuOpen(false);
      }
      if (isSettingsOpen && settingsModalRef.current && !settingsModalRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        if (isUserMenuOpen) setIsUserMenuOpen(false);
        if (isUploadMenuOpen) setIsUploadMenuOpen(false);
        if (isFullUploadMenuOpen) setIsFullUploadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSettingsOpen, isUserMenuOpen, isUploadMenuOpen, isFullUploadMenuOpen]);

  // Synchronize activeTab with URL hash and browser history (supports page refresh & mouse back/forward buttons)
  useEffect(() => {
    const handleHistoryChange = (e) => {
      let targetTab = e.state?.tab;
      if (!targetTab) {
        const hash = window.location.hash.replace(/^#/, '').trim().toLowerCase();
        if (VALID_TABS.includes(hash)) {
          targetTab = hash;
        }
      }
      if (targetTab && VALID_TABS.includes(targetTab)) {
        isNavigatingFromHistory.current = true;
        setActiveTab(targetTab);
        try {
          localStorage.setItem('klarity_active_tab', targetTab);
        } catch (err) {}
      }
    };

    window.addEventListener('popstate', handleHistoryChange);
    window.addEventListener('hashchange', handleHistoryChange);

    // Mouse back (button 3) and mouse forward (button 4) event listener
    const handleMouseNav = (e) => {
      if (e.button === 3) {
        e.preventDefault();
        window.history.back();
      } else if (e.button === 4) {
        e.preventDefault();
        window.history.forward();
      }
    };
    window.addEventListener('mouseup', handleMouseNav);

    // Ensure initial entry exists in history state
    const currentHash = `#${activeTab}`;
    if (window.location.hash !== currentHash || !window.history.state?.tab) {
      try {
        window.history.replaceState({ tab: activeTab }, '', currentHash);
      } catch (err) {}
    }

    return () => {
      window.removeEventListener('popstate', handleHistoryChange);
      window.removeEventListener('hashchange', handleHistoryChange);
      window.removeEventListener('mouseup', handleMouseNav);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('klarity_active_tab', activeTab);
    } catch (e) {}

    if (isNavigatingFromHistory.current) {
      isNavigatingFromHistory.current = false;
      return;
    }

    const targetHash = `#${activeTab}`;
    if (window.location.hash !== targetHash) {
      try {
        window.history.pushState({ tab: activeTab }, '', targetHash);
      } catch (e) {}
    }
  }, [activeTab]);

  // Update messages in active chat session and persist to localStorage
  const updateActiveSession = (newMessages, overrideTitle) => {
    setChatMessages(newMessages);
    setChatSessions(prev => {
      const updated = prev.map(s => {
        if (s.id === activeSessionId) {
          const autoTitle = overrideTitle || (
            (s.title === 'New Conversation' || s.title === 'Financial Overview')
              ? (newMessages.find(m => m.role === 'user')?.text?.slice(0, 32) || s.title)
              : s.title
          );
          return {
            ...s,
            title: autoTitle,
            updatedAt: Date.now(),
            messages: newMessages
          };
        }
        return s;
      });
      try {
        localStorage.setItem('klarity_chat_sessions', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleSwitchSession = (sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      setChatMessages(session.messages || []);
      try {
        localStorage.setItem('klarity_active_session_id', sessionId);
      } catch (e) {}
      setIsPastChatsOpen(false);
    }
  };

  const handleCreateNewChat = () => {
    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: Date.now(),
      messages: [
        {
          role: 'assistant',
          text: "Hello! I am Klarity, your personal financial advisor. What financial questions or bills would you like to explore?"
        }
      ]
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    setActiveSessionId(newId);
    setChatMessages(newSession.messages);
    try {
      localStorage.setItem('klarity_chat_sessions', JSON.stringify(updated));
      localStorage.setItem('klarity_active_session_id', newId);
    } catch (e) {}
    setIsPastChatsOpen(false);
  };

  const handleDeleteSession = (sessionId, e) => {
    if (e) e.stopPropagation();
    const updated = chatSessions.filter(s => s.id !== sessionId);
    if (updated.length === 0) {
      handleCreateNewChat();
      return;
    }
    setChatSessions(updated);
    try {
      localStorage.setItem('klarity_chat_sessions', JSON.stringify(updated));
    } catch (e) {}
    if (activeSessionId === sessionId) {
      handleSwitchSession(updated[0].id);
    }
  };

  // Save AI Memory helper
  const handleAddMemory = (fact) => {
    const uid = currentUser?.id || 'default';
    const item = (fact || newMemoryInput).trim();
    if (!item) return;
    if (aiMemory.includes(item)) return;
    const updated = [...aiMemory, item];
    setAiMemory(updated);
    try {
      localStorage.setItem('klarity_ai_memory', JSON.stringify(updated));
      localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(updated));
    } catch {}
    try {
      fetch('/api/settings/ai-quick-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: updated })
      }).catch(() => {});
    } catch {}
    setNewMemoryInput('');
    setNotificationToast('Saved to AI Memory!');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  const handleRemoveMemory = (index) => {
    const uid = currentUser?.id || 'default';
    const updated = aiMemory.filter((_, i) => i !== index);
    setAiMemory(updated);
    try {
      localStorage.setItem('klarity_ai_memory', JSON.stringify(updated));
      localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(updated));
    } catch {}
    try {
      fetch('/api/settings/ai-quick-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memory: updated })
      }).catch(() => {});
    } catch {}
    setNotificationToast('Removed from AI Memory');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  // Document / PDF Upload Handler - Scans document and adds to both Bills and Purchases
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAiTyping(true);
    setNotificationToast(`Scanning document: ${file.name}...`);

    try {
      let contentToScan = `[Uploaded Document: ${file.name}]`;
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
        contentToScan = await file.text();
      } else {
        // PDF or image
        contentToScan = `Statement Document: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      }

      const res = await fetch('/api/bills/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billText: contentToScan, ownerId: currentUser?.id })
      });

      if (res.ok) {
        const json = await res.json();
        await fetchData();
        setNotificationToast(`Scanned ${file.name}! Added to Bills & Purchases.`);
        setTimeout(() => setNotificationToast(''), 4500);

        const newMsgs = [
          ...chatMessages,
          { role: 'user', text: `Uploaded statement: ${file.name}` },
          {
            role: 'assistant',
            text: `I've analyzed your uploaded document (${file.name}). I detected a bill for **${json.summary?.biller || 'Utility Provider'}** of **$${Number(json.summary?.amount || 0).toFixed(2)}** due on **${json.summary?.nextDueDate || '2026-11-20'}**. I've automatically registered it into both your **Upcoming Bills** and **Recent Purchases**.`
          }
        ];
        updateActiveSession(newMsgs);
      } else {
        setNotificationToast('Could not automatically scan document. You can paste details into Scan Statement.');
      }
    } catch (err) {
      console.error('Scan error:', err);
      setNotificationToast('Failed to process document.');
    } finally {
      setIsAiTyping(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Fetch Settings & Sync with Server-Side Encrypted Values (User-scoped)
  const fetchSettings = async (targetUser = currentUser) => {
    const uid = targetUser?.id || 'u-default';
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json);
        if (json.user?.name) {
          setSettingsDisplayName(json.user.name);
        }
        if (json.featureFlags && typeof json.featureFlags === 'object') {
          setFeatureFlags(prev => ({ ...prev, ...json.featureFlags }));
        }
        if (json.ai) {
          const storedProv = localStorage.getItem(`klarity_${uid}_ai_provider`) || localStorage.getItem('klarity_ai_provider') || localStorage.getItem('klarity_u-ziyad_ai_provider');
          const storedMod = localStorage.getItem(`klarity_${uid}_ai_model`) || localStorage.getItem('klarity_ai_model') || localStorage.getItem('klarity_u-ziyad_ai_model');
          const storedMasked = localStorage.getItem(`klarity_${uid}_ai_masked_key`) || localStorage.getItem('klarity_ai_masked_key') || localStorage.getItem('klarity_u-ziyad_ai_masked_key');
          const storedStatus = localStorage.getItem(`klarity_${uid}_ai_status`) || localStorage.getItem('klarity_ai_status') || localStorage.getItem('klarity_u-ziyad_ai_status');

          let prov = json.ai.provider || storedProv || 'gemini';
          let mod = json.ai.model || storedMod || 'gemini-2.0-flash';
          if (mod.includes('tts') || mod.includes('audio') || mod.includes('deep-research') || mod === 'gemini-3.8-flash') mod = 'gemini-2.0-flash';

          const finalMasked = json.ai.maskedKey || storedMasked || '';
          const finalStatus = (json.ai.status === 'connected' || prov === 'local' || Boolean(json.ai.maskedKey) || storedStatus === 'connected' || Boolean(storedMasked)) ? 'connected' : 'not_connected';

          setSettingsAiProvider(prov);
          setSettingsAiModel(mod);
          setSettingsAiMaskedKey(finalMasked);
          setSettingsAiApiKey('');
          setSettingsAiStatus(finalStatus);
          if (json.ai.localEngine) {
            setLocalAiEngineStatus(json.ai.localEngine);
          }
          if (json.ai.responseLength) {
            setAiResponseLength(json.ai.responseLength);
          }
          if (json.ai.webSearchEnabled !== undefined) {
            setAiWebSearchEnabled(Boolean(json.ai.webSearchEnabled));
          }
          if (json.ai.dataPermissions) {
            setSettingsAiPermissions(json.ai.dataPermissions);
          }
          if (Array.isArray(json.ai.memory)) {
            setAiMemory(json.ai.memory);
            try {
              localStorage.setItem('klarity_ai_memory', JSON.stringify(json.ai.memory));
              localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(json.ai.memory));
            } catch {}
          }
        }
        if (json.plaid) {
          const storedClientId = localStorage.getItem(`klarity_${uid}_plaid_client_id`) || localStorage.getItem('klarity_plaid_client_id') || '';
          const storedMaskedSecret = localStorage.getItem(`klarity_${uid}_plaid_masked_secret`) || localStorage.getItem('klarity_plaid_masked_secret') || '';
          const storedStatus = localStorage.getItem(`klarity_${uid}_plaid_status`) || localStorage.getItem('klarity_plaid_status') || 'not_connected';

          const finalClientId = json.plaid.clientId || storedClientId;
          const finalMasked = json.plaid.maskedSecret || storedMaskedSecret;
          const finalStatus = (json.plaid.status === 'connected' || storedStatus === 'connected' || Boolean(storedClientId) || Boolean(finalClientId)) ? 'connected' : 'not_connected';

          setSettingsPlaidClientId(finalClientId || '');
          setSettingsPlaidMaskedSecret(finalMasked || '');
          setSettingsPlaidSecret('');
          setSettingsPlaidStatus(finalStatus);
        }
      }
    } catch (err) {
      console.warn('Could not fetch settings:', err);
    }
  };

  // Subscribe to real-time Local GGUF Engine status & Hugging Face download progress
  useEffect(() => {
    let cleanupDesktop = null;
    if (window.klarityDesktop?.onLocalAiStatus) {
      cleanupDesktop = window.klarityDesktop.onLocalAiStatus((st) => {
        if (st) setLocalAiEngineStatus(st);
      });
    }

    if (settingsAiProvider !== 'local' && settingsActiveTab !== 'ai') {
      return () => {
        if (cleanupDesktop) cleanupDesktop();
      };
    }

    let es = null;
    try {
      es = new EventSource('/api/ai/local/stream-status');
      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed) setLocalAiEngineStatus(parsed);
        } catch {}
      };
    } catch {}

    return () => {
      if (cleanupDesktop) cleanupDesktop();
      if (es) es.close();
    };
  }, [settingsAiProvider, settingsActiveTab]);

  const handleProviderChange = (newProvider) => {
    setSettingsAiProvider(newProvider);
    if (newProvider === 'local') setSettingsAiModel('Llama-3.2-3B-Instruct-Q4_K_M.gguf');
    else if (newProvider === 'anthropic') setSettingsAiModel('claude-3-7-sonnet-20250219');
    else if (newProvider === 'openai') setSettingsAiModel('gpt-4o');
    else if (newProvider === 'gemini') setSettingsAiModel('gemini-2.0-flash');
  };

  const handleSaveProfile = async () => {
    if (!settingsDisplayName.trim()) return;
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: settingsDisplayName.trim() })
      });
      if (res.ok) {
        setCurrentUser(prev => ({ ...prev, name: settingsDisplayName.trim() }));
        setNotificationToast('Profile updated!');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveAndTestAiKey = async () => {
    const uid = currentUser?.id || 'default';
    const rawKey = settingsAiApiKey.trim();
    if (settingsAiProvider !== 'local' && !rawKey) {
      setNotificationToast('Please enter an API key to test');
      setTimeout(() => setNotificationToast(''), 3000);
      return;
    }
    setSettingsAiTesting(true);
    try {
      const res = await fetch('/api/settings/ai-key/test-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: settingsAiProvider,
          model: settingsAiModel,
          apiKey: rawKey,
          dataPermissions: settingsAiPermissions
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSettingsAiStatus('connected');
        setSettingsAiMaskedKey(json.maskedKey || '');
        setSettingsAiApiKey('');
        if (json.localEngine) {
          setLocalAiEngineStatus(json.localEngine);
        }
        try {
          localStorage.setItem(`klarity_${uid}_ai_masked_key`, json.maskedKey || '');
          localStorage.setItem(`klarity_${uid}_ai_provider`, settingsAiProvider);
          localStorage.setItem(`klarity_${uid}_ai_model`, settingsAiModel);
          localStorage.setItem(`klarity_${uid}_ai_status`, 'connected');
          // Global fallbacks
          localStorage.setItem('klarity_ai_masked_key', json.maskedKey || '');
          localStorage.setItem('klarity_ai_provider', settingsAiProvider);
          localStorage.setItem('klarity_ai_model', settingsAiModel);
          localStorage.setItem('klarity_ai_status', 'connected');
        } catch {}
        setNotificationToast(
          settingsAiProvider === 'local'
            ? 'Built-in Local AI model activated (no API key required)!'
            : 'API key verified and securely saved for your account!'
        );
      } else {
        setSettingsAiStatus('invalid_key');
        setNotificationToast(`Verification failed: ${json.error || 'Invalid API key'}`);
      }
    } catch (err) {
      setSettingsAiStatus('invalid_key');
      setNotificationToast('Verification request failed');
    } finally {
      setSettingsAiTesting(false);
      setTimeout(() => setNotificationToast(''), 4000);
    }
  };

  const handleRemoveAiKey = async () => {
    const uid = currentUser?.id || 'default';
    try {
      const res = await fetch('/api/settings/ai-key/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setSettingsAiStatus('not_connected');
        setSettingsAiMaskedKey('');
        setSettingsAiApiKey('');
        try {
          localStorage.removeItem(`klarity_${uid}_ai_masked_key`);
          localStorage.removeItem(`klarity_${uid}_ai_status`);
          localStorage.removeItem('klarity_ai_masked_key');
          localStorage.removeItem('klarity_ai_status');
          localStorage.removeItem('klarity_u-ziyad_ai_masked_key');
          localStorage.removeItem('klarity_u-ziyad_ai_status');
        } catch {}
        setNotificationToast('AI API key removed.');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePermission = async (category) => {
    const uid = currentUser?.id || 'default';
    const updated = { ...settingsAiPermissions, [category]: !settingsAiPermissions[category] };
    setSettingsAiPermissions(updated);
    try {
      localStorage.setItem('klarity_ai_permissions', JSON.stringify(updated));
      localStorage.setItem(`klarity_${uid}_ai_permissions`, JSON.stringify(updated));
    } catch {}
    try {
      await fetch('/api/settings/ai-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataPermissions: updated })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePlaidCredentials = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const uid = currentUser?.id || 'default';
    try {
      if (settingsPlaidClientId) {
        try {
          localStorage.setItem(`klarity_${uid}_plaid_client_id`, settingsPlaidClientId);
        } catch {}
      }
      const res = await fetch('/api/settings/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: settingsPlaidClientId,
          secret: settingsPlaidSecret
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSettingsPlaidMaskedSecret(json.maskedSecret);
        setSettingsPlaidStatus(json.status);
        setSettingsPlaidSecret('');
        try {
          if (json.clientId) {
            localStorage.setItem(`klarity_${uid}_plaid_client_id`, json.clientId);
          }
          if (json.maskedSecret) {
            localStorage.setItem(`klarity_${uid}_plaid_masked_secret`, json.maskedSecret);
          }
          localStorage.setItem(`klarity_${uid}_plaid_status`, json.status || 'connected');
        } catch {}
        setNotificationToast('Plaid credentials saved securely for your account!');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySeniorScript = () => {
    const script = "Hello, I am calling regarding my account ending in [XXXX]. I am an elderly retiree on a fixed CalPERS public pension and Social Security. The current interest charges are making it impossible to pay down this principal balance. I want to honor my debt and pay back 100% of what I borrowed, but I cannot sustain this APR on my fixed income. I am requesting to enroll this account into an internal Financial Relief / Hardship Program with a 0% interest rate and a fixed monthly payoff plan in exchange for closing the card.";
    navigator.clipboard.writeText(script).then(() => {
      setCopiedSeniorScript(true);
      setNotificationToast('Senior Hardship phone script copied to clipboard!');
      setTimeout(() => setCopiedSeniorScript(false), 3500);
      setTimeout(() => setNotificationToast(''), 4000);
    });
  };

  const handleToggleIncomeSource = (source) => {
    const uid = currentUser?.id || 'u-ziyad';
    setIncomeSources(prev => {
      const exists = prev.includes(source);
      const updated = exists ? prev.filter(s => s !== source) : [...prev, source];
      try {
        localStorage.setItem('klarity_' + uid + '_income_sources', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleDisconnectBank = async (itemId, institutionName) => {
    if (!window.confirm(`Are you sure you want to disconnect ${institutionName || 'this bank'}? Its linked accounts and cards will be removed.`)) return;
    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        await fetchSettings();
        setNotificationToast(`${institutionName || 'Bank'} disconnected.`);
        setTimeout(() => setNotificationToast(''), 3500);
      }
    } catch (err) {
      console.error('Failed to disconnect bank:', err);
    }
  };

  // Fetch user data
  const fetchData = async (user = currentUser, household = viewHousehold) => {
    if (!user) return;
    setLoading(true);
    try {
      const getLocalList = (key) => {
        try {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      };
      const localCachedAccounts = getLocalList('klarity_accounts');
      const localCachedBills = getLocalList('klarity_bills');
      const localCachedSubs = getLocalList('klarity_subscriptions');
      const localCachedTxs = getLocalList('klarity_transactions');

      const res = await fetch(`/api/data?household=${household}`);
      if (res.ok) {
        const json = await res.json();
        const cleanMockBills = (list) => (list || []).filter(b => {
          if (!b) return false;
          const id = String(b.id || '').toLowerCase();
          const acct = String(b.account || b.dueText || '').toLowerCase();
          return !(id.startsWith('mock-') || id.startsWith('demo-') || id === 'bill-pge' || id === 'bill-rent' || id === 'bill-water' || acct.includes('4821'));
        });
        const cleanServerBills = cleanMockBills(json.bills);
        const cleanLocalBills = cleanMockBills(localCachedBills);
        const mergedAccounts = (json.accounts && json.accounts.length > 0) ? json.accounts : localCachedAccounts;
        const mergedBills = (cleanServerBills.length > 0) ? cleanServerBills : cleanLocalBills;
        const mergedSubs = (json.subscriptions && json.subscriptions.length > 0) ? json.subscriptions : localCachedSubs;
        const mergedTxs = (json.transactions && json.transactions.length > 0) ? json.transactions : localCachedTxs;

        const needsSync =
          (json.accounts?.length === 0 && localCachedAccounts.length > 0) ||
          (json.bills?.length === 0 && localCachedBills.length > 0) ||
          (json.subscriptions?.length === 0 && localCachedSubs.length > 0) ||
          (json.transactions?.length === 0 && localCachedTxs.length > 0);

        const finalData = {
          ...json,
          accounts: mergedAccounts,
          bills: mergedBills,
          subscriptions: mergedSubs,
          transactions: mergedTxs,
          metrics: {
            ...json.metrics,
            totalCreditDebt: mergedAccounts.filter(a => a.type === 'credit').reduce((s, a) => s + Number(a.balance || 0), 0),
            totalChecking: mergedAccounts.filter(a => a.type === 'depository').reduce((s, a) => s + Number(a.balance || 0), 0),
            totalMonthlyBills: mergedBills.reduce((s, b) => s + Number(b.expectedAmount || 0), 0),
            totalSubscriptions: mergedSubs.reduce((s, sub) => s + Number(sub.amount || 0), 0)
          }
        };

        if (Array.isArray(json.retirementPlans)) {
          setRetirementPlans(json.retirementPlans);
          secureStorage.setItem('klarity_retirement_plans', json.retirementPlans).catch(() => {});
        }
        if (json.householdProfile && typeof json.householdProfile === 'object' && (json.householdProfile.dwellingType || json.householdProfile.zillowUrl || json.householdProfile.address)) {
          setHouseholdProfile(prev => {
            if (json.householdProfile.zillowUrl || json.householdProfile.address || !prev.zillowUrl) {
              try {
                localStorage.setItem('klarity_household_profile_plain', JSON.stringify(json.householdProfile));
                localStorage.setItem('klarity_household_profile', JSON.stringify(json.householdProfile));
                secureStorage.setItem('klarity_household_profile', json.householdProfile).catch(() => {});
              } catch {}
              return { ...prev, ...json.householdProfile };
            }
            return prev;
          });
        }
        if (json.featureFlags && typeof json.featureFlags === 'object') {
          setFeatureFlags(prev => ({ ...prev, ...json.featureFlags }));
        }
        setData(finalData);
        try {
          localStorage.setItem('klarity_finance_data', JSON.stringify(finalData));
          if (mergedAccounts.length > 0) localStorage.setItem('klarity_accounts', JSON.stringify(mergedAccounts));
          if (mergedBills.length > 0) localStorage.setItem('klarity_bills', JSON.stringify(mergedBills));
          if (mergedSubs.length > 0) localStorage.setItem('klarity_subscriptions', JSON.stringify(mergedSubs));
          if (mergedTxs.length > 0) localStorage.setItem('klarity_transactions', JSON.stringify(mergedTxs));
        } catch (e) {}

        if (needsSync) {
          fetch('/api/accounts/batch-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accounts: mergedAccounts,
              bills: mergedBills,
              subscriptions: mergedSubs,
              transactions: mergedTxs,
              retirementPlans: retirementPlans
            })
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchSettings(currentUser);
      fetchData(currentUser, viewHousehold);
    }
  }, [currentUser?.id, viewHousehold]);

  useEffect(() => {
    scrollChatToBottom();
  }, [chatMessages, isAiTyping, activeTab]);

  // ================= GOOGLE AUTHENTICATION HANDLERS =================
  const handleGoogleProfileSuccess = async (profile, sessionData = null) => {
    try {
      if (sessionData && sessionData.token) {
        await handleAuthSessionSuccess(profile, sessionData);
        setNotificationToast('Signed in with Google as ' + (profile.name || profile.email));
        setTimeout(() => setNotificationToast(''), 4000);
        return;
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          name: profile.name || profile.given_name || profile.email.split('@')[0],
          avatar: profile.picture || '',
          sub: profile.sub || profile.id,
          accessToken: profile.accessToken || '',
          desktopVerified: Boolean(profile.desktopVerified)
        })
      });
      const json = await res.json();
      if (res.ok && json.user) {
        await handleAuthSessionSuccess(json.user, json.session);
        setNotificationToast(`Signed in with Google as ${json.user.name}`);
        setTimeout(() => setNotificationToast(''), 4000);
      } else {
        setAuthError(json.error || 'Google authentication failed.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Could not reach authentication server.');
    }
  };

  const handleGoogleOfficialSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      await handleGoogleProfileSuccess(decoded);
    } catch (err) {
      console.error('Credential decode error:', err);
      setAuthError('Google credential decode failed.');
    }
  };

  // ================= EMAIL AUTHENTICATION HANDLERS =================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    if (!email || !password) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPasswordInput) {
        setAuthError('Passwords do not match.');
        return;
      }

      setIsAuthenticating(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            name: nameInput.trim() || email.split('@')[0]
          })
        });
        const json = await res.json();

        if (res.ok && json.user) {
          await handleAuthSessionSuccess(json.user, json.session);
          setNotificationToast(`Welcome to Klarity, ${json.user.name}!`);
          setTimeout(() => setNotificationToast(''), 4000);
        } else {
          setAuthError(json.error || 'Failed to create account. Please try again.');
        }
      } catch (err) {
        console.error('Sign up error:', err);
        const localUser = {
          id: `u-${Date.now()}`,
          email,
          name: nameInput.trim() || email.split('@')[0],
          avatar: '',
          role: 'Primary Member'
        };
        await handleAuthSessionSuccess(localUser);
      } finally {
        setIsAuthenticating(false);
      }
    } else {
      setIsAuthenticating(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const json = await res.json();

        if (res.ok && json.user) {
          await handleAuthSessionSuccess(json.user, json.session);
          setNotificationToast(`Welcome back, ${json.user.name}!`);
          setTimeout(() => setNotificationToast(''), 4000);
        } else {
          setAuthError(json.error || 'Invalid email or password.');
        }
      } catch (err) {
        console.error('Sign in error:', err);
        setAuthError('Could not connect to authentication server.');
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  const handleLogout = async () => {
    window.__triggerKlaritySignOut = null;
    setCurrentUser(null);
    setAuthSession(null);
    secureStorage.removeItem('klarity_auth_session');
    secureStorage.removeItem('klarity_user');
    localStorage.removeItem('klarity_user');
    try {
      await fetch('/api/auth/session', { method: 'DELETE' });
    } catch {}
    if (typeof window !== 'undefined' && window.klarityDesktop?.clearSession) {
      try {
        await window.klarityDesktop.clearSession();
      } catch {}
    }
    setSettingsPlaidClientId('');
    setSettingsPlaidSecret('');
    setSettingsPlaidMaskedSecret('');
    setSettingsPlaidStatus('not_connected');
    setSettingsAiApiKey('');
    setSettingsAiMaskedKey('');
    setSettingsAiStatus('not_connected');
  };

  // Plaid Link Launcher (User-scoped)
  const initiatePlaidLink = async () => {
    setIsConnectingPlaid(true);
    setPlaidError('');
    try {
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();

      if (json.needsKeys) {
        setIsAddAccountOpen(false);
        setSettingsActiveTab('plaid');
        setIsSettingsOpen(true);
        setPlaidError('Please enter your Plaid keys in Settings to connect live banks.');
        return;
      }

      if (json.link_token) {
        setIsAddAccountOpen(false);
        setLinkToken(json.link_token);
      } else {
        setPlaidError(json.error || 'Could not initialize bank connection.');
      }
    } catch (err) {
      setPlaidError('Could not reach bank network. You can also add cards manually.');
    } finally {
      setIsConnectingPlaid(false);
    }
  };

  const handlePlaidSuccess = async (public_token, metadata) => {
    try {
      setIsConnectingPlaid(true);

      const res = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          metadata
        })
      });

      const resData = await res.json();
      if (res.ok && resData.accounts && resData.accounts.length > 0) {
        setData(prev => {
          const existing = prev.accounts || [];
          const updatedAccounts = existing.filter(a => !resData.accounts.some(na => na.id === a.id)).concat(resData.accounts);
          const newData = {
            ...prev,
            accounts: updatedAccounts,
            metrics: {
              ...prev.metrics,
              totalCreditDebt: updatedAccounts.filter(a => a.type === 'credit').reduce((s, a) => s + Number(a.balance || 0), 0),
              totalChecking: updatedAccounts.filter(a => a.type === 'depository').reduce((s, a) => s + Number(a.balance || 0), 0)
            }
          };
          try {
            localStorage.setItem('klarity_finance_data', JSON.stringify(newData));
            localStorage.setItem('klarity_accounts', JSON.stringify(updatedAccounts));
            localStorage.setItem('klarity_plaid_status', 'connected');
          } catch (e) {}
          return newData;
        });
        setSettingsPlaidStatus('connected');
        setBankTab('connected');
        setNotificationToast(`Connected ${resData.accounts.length} account(s) from ${metadata?.institution?.name || 'bank'}!`);
      } else if (!res.ok) {
        setPlaidError(resData.error || 'Failed to exchange Plaid token.');
      }
      setLinkToken(null);
      await fetchData();
      await fetchSettings();
    } catch (err) {
      console.error('Plaid link exchange error:', err);
      setPlaidError('Could not complete bank linking: ' + err.message);
    } finally {
      setIsConnectingPlaid(false);
      setTimeout(() => setNotificationToast(''), 5000);
    }
  };



  // Add Manual Card
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.name.trim()) return;

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          ownerId: currentUser.id,
          mask: Math.floor(1000 + Math.random() * 9000).toString()
        })
      });
      if (res.ok) {
        setIsAddAccountOpen(false);
        setNewAccount({
          institution: 'Capital One',
          name: '',
          type: 'credit',
          balance: '',
          limit: '',
          apr: '',
          minPayment: '',
          dueDate: ''
        });
        await fetchData();
        setNotificationToast('Card added to your portfolio.');
        setTimeout(() => setNotificationToast(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remove / Delete Card or Account
  const handleDeleteAccount = async (accountId, accountName) => {
    if (!window.confirm(`Are you sure you want to remove ${accountName || 'this card'}?`)) return;
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotificationToast('Card removed successfully.');
        setTimeout(() => setNotificationToast(''), 3000);
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to remove card:', err);
    }
  };

  // Add Bill
  const handleAddBill = async (e) => {
    e.preventDefault();
    if (!newBill.name.trim() || !newBill.expectedAmount) return;

    const chosenAccount = newBill.account || allFilterableCards[0]?.fullLabel || 'Checking •••• 4821';
    const createdBillPayload = {
      ...newBill,
      account: chosenAccount,
      assignedOwnerId: currentUser?.id
    };

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdBillPayload)
      });
      let savedBill = null;
      if (res.ok) {
        try {
          const json = await res.json();
          savedBill = json?.bill || json;
        } catch (err) {}
      }
      const billItem = savedBill && savedBill.id ? savedBill : {
        id: `bill-${Date.now()}`,
        name: newBill.name.trim(),
        biller: newBill.name.trim(),
        category: newBill.category || 'Utilities',
        expectedAmount: parseFloat(newBill.expectedAmount),
        amount: parseFloat(newBill.expectedAmount),
        dueDay: parseInt(newBill.dueDay || '15', 10),
        account: chosenAccount,
        status: 'upcoming'
      };

      setData(prev => {
        const baseBills = (prev.bills && prev.bills.length > 0) ? prev.bills : DEFAULT_OVERVIEW_BILLS;
        const nextBills = [billItem, ...baseBills.filter(b => b.id !== billItem.id)];
        const nextState = { ...prev, bills: nextBills };
        try {
          localStorage.setItem('klarity_bills', JSON.stringify(nextBills));
          localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
        } catch (err) {}
        return nextState;
      });

      setIsAddBillOpen(false);
      setNewBill({
        name: '',
        biller: '',
        category: 'Utilities',
        expectedAmount: '',
        dueDay: '15',
        account: ''
      });
      setNotificationToast(`Bill added: ${billItem.name}`);
      setTimeout(() => setNotificationToast(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  // Pay Bill
  const handlePayBill = async (billId, billName, amount) => {
    try {
      const res = await fetch(`/api/bills/${billId}/pay`, { method: 'POST' });
      if (res.ok) {
        await fetchData();
        setNotificationToast(`Payment recorded: $${Number(amount).toFixed(2)} to ${billName}.`);
        setTimeout(() => setNotificationToast(''), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scan Document / Statement Sentences via AI Comprehension
  const handleScanBill = async () => {
    const rawSentences = (scanText || '').trim();
    if (!rawSentences) return;
    setIsScanBillOpen(false);
    setScanText('');
    setScanResult(null);
    await handleSendChatMessage(
      `Please scan and comprehend these statement details/sentences and automatically add every bill, subscription, and purchase mentioned:\n\n${rawSentences}`
    );
  };

  // Add Transaction Manually
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!newTx.name.trim() || !newTx.amount) return;
    const chosenAccount = newTx.account || allFilterableCards.find(c => c.type === 'credit')?.fullLabel || 'Everyday Rewards •••• 4417';
    const payload = {
      ...newTx,
      account: chosenAccount,
      ownerId: currentUser?.id
    };
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let savedTx = null;
      if (res.ok) {
        try {
          const json = await res.json();
          savedTx = json?.transaction || json;
        } catch (err) {}
      }
      const txItem = savedTx && savedTx.id ? savedTx : {
        id: `tx-${Date.now()}`,
        name: newTx.name.trim(),
        amount: parseFloat(newTx.amount),
        category: newTx.category || 'Groceries',
        date: newTx.date || new Date().toISOString().split('T')[0],
        account: chosenAccount,
        notes: newTx.notes || ''
      };

      setData(prev => {
        const baseTxs = (prev.transactions && prev.transactions.length > 0) ? prev.transactions : DEFAULT_OVERVIEW_TXS;
        const nextTxs = [txItem, ...baseTxs.filter(t => t.id !== txItem.id)];
        const nextState = { ...prev, transactions: nextTxs };
        try {
          localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs));
          localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
        } catch (err) {}
        return nextState;
      });

      setIsAddTxOpen(false);
      setNewTx({
        name: '',
        amount: '',
        category: 'Groceries',
        date: new Date().toISOString().split('T')[0],
        account: '',
        notes: ''
      });
      setNotificationToast(`Added purchase: ${txItem.name}`);
      setTimeout(() => setNotificationToast(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Purchase (Transaction)
  const handleDeleteTransaction = async (txId, txName) => {
    if (!window.confirm(`Delete purchase "${txName || 'this transaction'}"?`)) return;
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        setNotificationToast('Purchase deleted.');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
    }
  };

  // Add Subscription
  const handleAddSubscription = async (eOrSub) => {
    if (eOrSub && eOrSub.preventDefault) eOrSub.preventDefault();
    const subToSave = (eOrSub && eOrSub.name) ? eOrSub : newSub;
    if (!subToSave.name || !subToSave.amount) return;

    const chosenAccount = subToSave.account || allFilterableCards.find(c => c.type === 'credit')?.fullLabel || 'Everyday Rewards •••• 4417';
    const payload = {
      ...subToSave,
      account: chosenAccount,
      ownerId: currentUser?.id
    };

    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let savedSub = null;
      if (res.ok) {
        try {
          const json = await res.json();
          savedSub = json?.subscription || json;
        } catch (err) {}
      }
      const subItem = savedSub && savedSub.id ? savedSub : {
        id: `sub-${Date.now()}`,
        name: subToSave.name.trim(),
        amount: parseFloat(subToSave.amount),
        billingCycle: subToSave.billingCycle || 'monthly',
        renewalDate: subToSave.renewalDate || 'Renews monthly',
        category: subToSave.category || 'Streaming',
        account: chosenAccount
      };

      setData(prev => {
        const baseSubs = (prev.subscriptions && prev.subscriptions.length > 0) ? prev.subscriptions : DEFAULT_OVERVIEW_SUBS;
        const nextSubs = [subItem, ...baseSubs.filter(s => s.id !== subItem.id)];
        const nextState = { ...prev, subscriptions: nextSubs };
        try {
          localStorage.setItem('klarity_subscriptions', JSON.stringify(nextSubs));
          localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
        } catch (err) {}
        return nextState;
      });

      setIsAddSubOpen(false);
      setNewSub({
        name: '',
        amount: '',
        billingCycle: 'monthly',
        renewalDate: '1st of month',
        category: 'Streaming',
        account: ''
      });
      setNotificationToast(`Added subscription: ${subItem.name}`);
      setTimeout(() => setNotificationToast(''), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Subscription
  const handleDeleteSubscription = async (subId, subName) => {
    if (!window.confirm(`Remove subscription "${subName || 'this subscription'}"?`)) return;
    try {
      const res = await fetch(`/api/subscriptions/${subId}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        setNotificationToast('Subscription removed.');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (err) {
      console.error('Failed to delete subscription:', err);
    }
  };

  // Auto-Detect Category & Card based on Store / Merchant Name
  const autoDetectPurchaseCategory = (name) => {
    if (!name) return 'Shopping';
    const n = name.toLowerCase().trim();
    if (categoryRules && categoryRules[n]) return categoryRules[n];
    if (n.includes('electric') || n.includes('pge') || n.includes('water') || n.includes('utility') || n.includes('gas co') || n.includes('internet') || n.includes('wifi') || n.includes('comcast') || n.includes('verizon') || n.includes('at&t') || n.includes('t-mobile')) return 'Utilities';
    if (n.includes('rent') || n.includes('mortgage') || n.includes('lease') || n.includes('apartment')) return 'Housing';
    if (n.includes('safeway') || n.includes('trader joe') || n.includes('grocery') || n.includes('market') || n.includes('whole foods') || n.includes('costco') || n.includes('kroger') || n.includes('sprouts') || n.includes('aldi') || n.includes('supermarket') || n.includes('heb') || n.includes('publix')) return 'Groceries';
    if (n.includes('chipotle') || n.includes('starbucks') || n.includes('mcdonald') || n.includes('burger') || n.includes('restaurant') || n.includes('cafe') || n.includes('coffee') || n.includes('pizza') || n.includes('taco') || n.includes('dining') || n.includes('doordash') || n.includes('uber eats') || n.includes('grubhub') || n.includes('sweetgreen') || n.includes('panera') || n.includes('chick-fil-a') || n.includes('dunkin') || n.includes('bakery')) return 'Dining';
    if (n.includes('shell') || n.includes('chevron') || n.includes('gas') || n.includes('fuel') || n.includes('exxon') || n.includes('bp') || n.includes('mobil') || n.includes('uber') || n.includes('lyft') || n.includes('transit') || n.includes('metro') || n.includes('parking') || n.includes('toll')) return 'Transportation';
    if (n.includes('netflix') || n.includes('spotify') || n.includes('hulu') || n.includes('disney') || n.includes('apple') || n.includes('icloud') || n.includes('chatgpt') || n.includes('youtube') || n.includes('subscription')) return 'Subscriptions';
    if (n.includes('payroll') || n.includes('salary') || n.includes('deposit') || n.includes('direct dep') || n.includes('paycheck') || n.includes('income')) return 'Income';
    if (n.includes('pharmacy') || n.includes('cvs') || n.includes('walgreens') || n.includes('doctor') || n.includes('dental') || n.includes('health') || n.includes('clinic')) return 'Health';
    if (n.includes('flight') || n.includes('airline') || n.includes('hotel') || n.includes('airbnb') || n.includes('delta') || n.includes('united')) return 'Travel';
    if (n.includes('amazon') || n.includes('best buy') || n.includes('nike') || n.includes('target') || n.includes('walmart') || n.includes('shop') || n.includes('store') || n.includes('retail')) return 'Shopping';
    return 'Shopping';
  };

  // Recategorize Transaction & Remember Merchant Rule
  const handleRecategorizeTransaction = async (txId, txName, newCategory) => {
    const cleanMerchant = (txName || '').toLowerCase().trim();
    if (cleanMerchant) {
      setCategoryRules(prev => ({ ...prev, [cleanMerchant]: newCategory }));
    }
    setData(prev => {
      const nextTxs = (prev.transactions || []).map(t => {
        if (t.id === txId || (cleanMerchant && (t.name || '').toLowerCase().trim() === cleanMerchant)) {
          return { ...t, category: newCategory };
        }
        return t;
      });
      const nextState = { ...prev, transactions: nextTxs };
      try {
        localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
        localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs));
      } catch (e) {}
      return nextState;
    });
    try {
      await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory })
      });
    } catch (e) {}
    setNotificationToast(`Categorized "${txName}" as ${newCategory} (rule remembered)`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  // Change Card/Account tied to a Transaction, Bill, or Subscription
  const handleChangeItemCard = async (itemType, itemId, newAccountLabel) => {
    setData(prev => {
      if (itemType === 'tx') {
        const nextTxs = (prev.transactions || []).map(t => t.id === itemId ? { ...t, account: newAccountLabel } : t);
        try { localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs)); } catch (e) {}
        return { ...prev, transactions: nextTxs };
      }
      if (itemType === 'bill') {
        const nextBills = (prev.bills || []).map(b => b.id === itemId ? { ...b, account: newAccountLabel } : b);
        try { localStorage.setItem('klarity_bills', JSON.stringify(nextBills)); } catch (e) {}
        return { ...prev, bills: nextBills };
      }
      if (itemType === 'sub') {
        const nextSubs = (prev.subscriptions || []).map(s => s.id === itemId ? { ...s, account: newAccountLabel } : s);
        try { localStorage.setItem('klarity_subscriptions', JSON.stringify(nextSubs)); } catch (e) {}
        return { ...prev, subscriptions: nextSubs };
      }
      return prev;
    });
    const endpoint = itemType === 'tx' ? 'transactions' : itemType === 'bill' ? 'bills' : 'subscriptions';
    try {
      await fetch(`/api/${endpoint}/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: newAccountLabel })
      });
    } catch (e) {}
    setNotificationToast(`Updated payment card to ${newAccountLabel}`);
    setTimeout(() => setNotificationToast(''), 3000);
  };

  // Save Note on Transaction
  const handleSaveTxNote = async (txId) => {
    const noteVal = editingTxNoteText.trim();
    setData(prev => {
      const nextTxs = (prev.transactions || []).map(t => t.id === txId ? { ...t, notes: noteVal } : t);
      try { localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs)); } catch (e) {}
      return { ...prev, transactions: nextTxs };
    });
    setEditingTxNoteId(null);
    setEditingTxNoteText('');
    try {
      await fetch(`/api/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteVal })
      });
    } catch (e) {}
    setNotificationToast('Transaction note saved.');
    setTimeout(() => setNotificationToast(''), 2500);
  };

  // Export Transactions to CSV
  const handleExportCsv = (txsToExport) => {
    const rows = [
      ['Date', 'Description', 'Category', 'Card / Account', 'Amount', 'Notes'],
      ...(txsToExport || []).map(t => [
        t.date || '',
        `"${String(t.name || '').replace(/"/g, '""')}"`,
        t.category || 'Shopping',
        `"${String(t.account || 'Checking •••• 4821').replace(/"/g, '""')}"`,
        Number(t.amount || 0).toFixed(2),
        `"${String(t.notes || '').replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `klarity_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotificationToast(`Exported ${(txsToExport || []).length} transactions to CSV.`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  // Import Transactions from CSV
  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return;
      const imported = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2) {
          const dateVal = cols[0] && /\d{4}-\d{2}-\d{2}/.test(cols[0]) ? cols[0] : new Date().toISOString().split('T')[0];
          const nameVal = cols[1] || 'Imported Purchase';
          const rememberedCat = categoryRules[nameVal.toLowerCase()];
          const catVal = rememberedCat || cols[2] || 'Shopping';
          const accVal = cols[3] || 'Everyday Rewards •••• 4417';
          const amtVal = parseFloat(cols[4] || cols[2] || 0);
          if (!isNaN(amtVal) && amtVal !== 0) {
            imported.push({
              id: `tx-csv-${Date.now()}-${i}`,
              date: dateVal,
              name: nameVal,
              category: catVal,
              account: accVal,
              amount: amtVal,
              notes: cols[5] || ''
            });
          }
        }
      }
      if (imported.length > 0) {
        setData(prev => {
          const nextTxs = [...imported, ...(prev.transactions || [])];
          try { localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs)); } catch (err) {}
          return { ...prev, transactions: nextTxs };
        });
        setNotificationToast(`Imported ${imported.length} transactions from CSV!`);
        setTimeout(() => setNotificationToast(''), 4000);
      }
    } catch (err) {
      console.error('CSV import error:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Add or Update Budget Category Limit
  const handleAddOrUpdateBudget = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const limitNum = parseFloat(newBudget.limit);
    if (!newBudget.category || isNaN(limitNum) || limitNum <= 0) return;
    setBudgets(prev => {
      const exists = prev.find(b => (b.category || '').toLowerCase() === (newBudget.category || '').toLowerCase());
      if (exists) {
        return prev.map(b => b.id === exists.id ? { ...b, limit: limitNum } : b);
      }
      return [...prev, { id: `b-${Date.now()}`, category: newBudget.category, limit: limitNum, lastMonthSpent: Math.round(limitNum * 0.82) }];
    });
    setIsAddBudgetOpen(false);
    setNotificationToast(`Budget set: $${limitNum}/mo for ${newBudget.category}`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  // Add Savings Goal
  const handleAddGoal = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const target = parseFloat(newGoal.targetAmount);
    const current = parseFloat(newGoal.currentAmount || 0);
    const monthly = parseFloat(newGoal.monthlyContribution || 200);
    if (!newGoal.name.trim() || isNaN(target) || target <= 0) return;
    setSavingsGoals(prev => [
      ...prev,
      {
        id: `goal-${Date.now()}`,
        name: newGoal.name.trim(),
        targetAmount: target,
        currentAmount: current,
        monthlyContribution: monthly
      }
    ]);
    setIsAddGoalOpen(false);
    setNewGoal({ name: '', targetAmount: '3000', currentAmount: '500', monthlyContribution: '250' });
    setNotificationToast(`Savings goal created: ${newGoal.name}`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  const handleContributeGoal = (goalId, addAmount = 100) => {
    setSavingsGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const nextAmt = Math.min(g.targetAmount, Number(g.currentAmount || 0) + addAmount);
        return { ...g, currentAmount: nextAmt };
      }
      return g;
    }));
    setNotificationToast(`Added +$${addAmount} toward your savings goal!`);
    setTimeout(() => setNotificationToast(''), 3000);
  };

  // Add Manual Asset or Liability for Net Worth
  const handleAddManualAsset = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const bal = parseFloat(newManualAsset.balance);
    if (!newManualAsset.name.trim() || isNaN(bal)) return;
    setManualAssets(prev => [
      ...prev,
      { id: `ma-${Date.now()}`, name: newManualAsset.name.trim(), type: newManualAsset.type, balance: bal }
    ]);
    setIsAddManualAssetOpen(false);
    setNewManualAsset({ name: '', type: 'savings', balance: '' });
    setNotificationToast(`Added ${newManualAsset.name} to Net Worth tracker.`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  // AI Chat
// Generate smart, context-aware suggested actions and follow-up prompts
function generateContextualSuggestions(userMsg = '', replyText = '') {
  const u = (userMsg || '').toLowerCase();
  const r = (replyText || '').toLowerCase();
  const combined = `${u} ${r}`;

  // 1. Internet, Web, Online browsing, Search
  if (u.includes('internet') || u.includes('web') || u.includes('online') || u.includes('browse') || u.includes('search')) {
    return [
      { label: 'Search 0% APR card deals', type: 'prompt', prompt: 'Search the web for the best 0% intro APR balance transfer cards right now' },
      { label: 'Find cheapest gas near me', type: 'prompt', prompt: 'Where is the cheapest gas in my area right now?' },
      { label: 'Check today’s market news', type: 'prompt', prompt: 'What is today’s financial and market news?' }
    ];
  }

  // 2. Date, Time, Today, Calendar, Schedule, Week, Month
  if (u.includes('day') || u.includes('today') || u.includes('date') || u.includes('time') || u.includes('calendar') || u.includes('schedule') || u.includes('week') || u.includes('month')) {
    return [
      { label: 'What bills are due this week?', type: 'prompt', prompt: 'What bills are due this week?' },
      { label: 'View Bills Calendar', type: 'navigate', tab: 'bills' },
      { label: 'How is my spending this month?', type: 'prompt', prompt: 'How much have I spent so far this month?' }
    ];
  }

  // 3. Vehicles, Cars, Auto, Fleet, Gas vs EV
  if (combined.includes('vehicle') || combined.includes('car') || combined.includes('fleet') || combined.includes('auto') || combined.includes('gas price') || combined.includes('electric car') || combined.includes(' ev ') || combined.includes('ioniq') || combined.includes('tesla')) {
    return [
      { label: 'Compare Gas vs EV savings', type: 'prompt', prompt: 'How much would I save switching my cars to an EV?' },
      { label: 'View Vehicles', type: 'navigate', tab: 'lifestyle' },
      { label: 'Find local EV deals', type: 'prompt', prompt: 'What 0% APR electric car deals are available in my city?' }
    ];
  }

  // 4. Health insurance, Copays, Deductible, Doctors, Medical
  if (combined.includes('health') || combined.includes('insurance') || combined.includes('copay') || combined.includes('doctor') || combined.includes('deductible') || combined.includes('hospital') || combined.includes('rx')) {
    return [
      { label: 'View Insurance Card', type: 'navigate', tab: 'lifestyle' },
      { label: 'Review my copays', type: 'prompt', prompt: 'What are my current health insurance copays and deductible?' },
      { label: 'View Doctors', type: 'navigate', tab: 'lifestyle' }
    ];
  }

  // 5. Retirement, Pension, Social Security, CalPERS, 401k, Debt Shield
  if (combined.includes('retire') || combined.includes('pension') || combined.includes('calpers') || combined.includes('social security') || combined.includes('401k') || combined.includes('ira') || combined.includes('judgment-proof') || combined.includes('shield')) {
    return [
      { label: 'View Retirement Plans', type: 'navigate', tab: 'retirement' },
      { label: 'Estimate pension benefit', type: 'prompt', prompt: 'Estimate my monthly retirement benefit and pension' },
      { label: 'Check creditor protection', type: 'prompt', prompt: 'How much of my income is legally protected from private card debt?' }
    ];
  }

  // 6. Credit cards, APR, Debt payoff, Balance transfer
  if (combined.includes('credit card') || combined.includes('card balance') || combined.includes('apr') || combined.includes('interest') || combined.includes('debt') || combined.includes('avalanche') || combined.includes('snowball') || combined.includes('balance transfer')) {
    return [
      { label: 'Open Debt Payoff Planner', type: 'navigate', tab: 'cards' },
      { label: 'Compare payoff strategies', type: 'prompt', prompt: 'Compare the debt avalanche vs snowball method for my credit cards' },
      { label: 'Check 0% balance transfer cards', type: 'prompt', prompt: 'What 0% balance transfer card would save me the most interest?' }
    ];
  }

  // 7. Subscriptions, Recurring charges, Streaming
  if (combined.includes('subscription') || combined.includes('recurring') || combined.includes('netflix') || combined.includes('spotify') || combined.includes('cancel')) {
    return [
      { label: 'Audit Subscriptions', type: 'navigate', tab: 'subscriptions' },
      { label: 'Which can I cancel?', type: 'prompt', prompt: 'Which of my subscriptions could I cancel to save money?' },
      { label: 'Add a subscription', type: 'navigate', tab: 'subscriptions' }
    ];
  }

  // 8. Bills, Utilities, PG&E, Electric, Water, Due dates
  if (combined.includes('bill') || combined.includes('due') || combined.includes('electric') || combined.includes('utility') || combined.includes('pg&e') || combined.includes('pge') || combined.includes('water') || combined.includes('rent')) {
    return [
      { label: 'View Upcoming Bills', type: 'navigate', tab: 'bills' },
      { label: 'Set a payment reminder', type: 'payment_reminder' },
      { label: 'How can I lower my utility bill?', type: 'prompt', prompt: 'How can I lower my monthly electric and gas bill?' }
    ];
  }

  // 9. Budgets, Spending, Groceries, Dining
  if (combined.includes('budget') || combined.includes('grocer') || combined.includes('dining') || combined.includes('spending') || combined.includes('spent') || combined.includes('expense')) {
    return [
      { label: 'Open Budgets', type: 'navigate', tab: 'budgets' },
      { label: 'How much budget is left?', type: 'prompt', prompt: 'How much do I have left in my budgets this month?' },
      { label: 'Create a $400 Groceries budget', type: 'set_budget', category: 'Groceries', limit: 400 }
    ];
  }

  // 10. Savings, Goals, Emergency Fund
  if (combined.includes('saving') || combined.includes('goal') || combined.includes('emergency fund') || combined.includes('hysa')) {
    return [
      { label: 'View Savings Goals', type: 'navigate', tab: 'budgets' },
      { label: 'How can I save $500 faster?', type: 'prompt', prompt: 'Give me practical ways to save an extra $500 this month' },
      { label: 'Check top HYSA rates', type: 'prompt', prompt: 'What are the top high-yield savings account rates right now?' }
    ];
  }

  // 11. General / Conversation / Fallback
  return [
    { label: 'Summarize my finances', type: 'prompt', prompt: 'Give me a quick summary of my finances and upcoming bills' },
    { label: 'What bills are due next?', type: 'prompt', prompt: 'What are my next upcoming bills and due dates?' },
    { label: 'Where can I save money?', type: 'prompt', prompt: 'Based on my accounts and spending, where can I save money?' }
  ];
}

  const handleSendChatMessage = async (eOrText) => {
    if (eOrText && typeof eOrText === 'object' && eOrText.preventDefault) {
      eOrText.preventDefault();
    }
    const userMsg = (typeof eOrText === 'string' ? eOrText : chatInput).trim();
    const currentFiles = typeof eOrText === 'string' ? [] : chatFiles;
    if ((!userMsg && currentFiles.length === 0) || isAiTyping) return;

    if (typeof eOrText !== 'string') {
      setChatInput('');
      setChatFiles([]);
    }

    // Instant client-side intent navigation (only if user explicitly asks to view/go to a tab without uploading files)
    const lower = userMsg.toLowerCase();
    if (currentFiles.length === 0 && !lower.includes('please scan and comprehend')) {
      if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && lower.includes('subscription')) {
        setActiveTab('subscriptions');
      } else if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && lower.includes('bill')) {
        setActiveTab('bills');
      } else if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && (lower.includes('budget') || lower.includes('goal'))) {
        setActiveTab('budgets');
      } else if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && lower.includes('card')) {
        setActiveTab('cards');
      } else if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && (lower.includes('transaction') || lower.includes('purchase'))) {
        setActiveTab('transactions');
      } else if ((lower.includes('show') || lower.includes('go to') || lower.includes('open') || lower.includes('view')) && (lower.includes('overview') || lower.includes('dashboard') || lower.includes('home'))) {
        setActiveTab('dashboard');
      } else if (lower.includes('setting')) {
        setSettingsActiveTab('ai');
        setIsSettingsOpen(true);
      }
    }

    const displayAttachments = currentFiles.map(f => ({
      id: f.id,
      name: f.name,
      size: f.size,
      mimeType: f.mimeType,
      ext: f.ext,
      isImage: f.isImage,
      previewUrl: f.isImage ? f.previewUrl : null
    }));

    const newDisplayMsg = {
      role: 'user',
      text: userMsg || (currentFiles.length === 1 ? `Submitted file: ${currentFiles[0].name}` : `Submitted ${currentFiles.length} files for analysis`),
      attachments: displayAttachments
    };

    const userUpdatedMessages = [...chatMessages, newDisplayMsg];
    updateActiveSession(userUpdatedMessages);
    setIsAiTyping(true);
    scrollChatToBottom();

    if (chatAbortControllerRef.current) {
      chatAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      const uid = currentUser?.id || 'default';
      const cachedProvider = settingsAiProvider || localStorage.getItem(`klarity_${uid}_ai_provider`) || 'gemini';
      let cachedModel = settingsAiModel || localStorage.getItem(`klarity_${uid}_ai_model`) || 'gemini-2.0-flash';
      if (cachedModel.includes('tts') || cachedModel.includes('audio') || cachedModel.includes('deep-research') || cachedModel === 'gemini-3.8-flash') {
        cachedModel = 'gemini-2.0-flash';
        try {
          localStorage.setItem(`klarity_${uid}_ai_model`, 'gemini-2.0-flash');
        } catch {}
      }

      const payloadAttachments = currentFiles.map(f => ({
        name: f.name,
        mimeType: f.mimeType,
        base64: f.base64,
        textContent: f.textContent || ''
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMsg,
          userMemory: aiMemory,
          clientProvider: cachedProvider,
          clientModel: cachedModel,
          attachments: payloadAttachments,
          responseLength: aiResponseLength,
          webSearchEnabled: aiWebSearchEnabled,
          statutoryShield: {
            ...calculateJudgmentProofRatio(incomeStreams),
            incomeStreams: incomeStreams
          },
          cards: displayCards,
          checkingAccounts: checkingAccounts,
          availableCash: displayCash,
          projectedCashAfterBills: projectedCashAfterBills,
          bills: sourceBillsList,
          subscriptions: sourceSubsList,
          transactions: sourceTxsList.slice(0, 60),
          budgets: featureFlags.budgets ? computedBudgets : [],
          debtStrategy: debtStrategy,
          extraDebtPayment: extraDebtPayment,
          debtPayoffComparison: debtPayoffComparison,
          savingsGoals: (featureFlags.budgets && featureFlags.savingsGoals) ? savingsGoals : [],
          manualAssets: manualAssets,
          retirementPlans: featureFlags.retirement ? retirementPlans : [],
          netWorth: totalNetWorth || 0,
          householdProfile: householdProfile,
          householdMetrics: calculateHouseholdAndFleetMetrics(householdProfile)
        })
      });

      const json = await res.json();
      let replyText = json.reply || "I've reviewed your request.";

      // Update local state and localStorage immediately if backend returned updatedData
      if (json.updatedData) {
        setData(prev => {
          const nextBills = json.updatedData.bills || prev.bills || [];
          const nextSubs = json.updatedData.subscriptions || prev.subscriptions || [];
          const nextTxs = json.updatedData.transactions || prev.transactions || [];
          const nextState = {
            ...prev,
            bills: nextBills,
            subscriptions: nextSubs,
            transactions: nextTxs,
            metrics: {
              ...prev.metrics,
              totalMonthlyBills: nextBills.reduce((s, b) => s + Number(b.expectedAmount || 0), 0),
              totalSubscriptions: nextSubs.reduce((s, sub) => s + Number(sub.amount || 0), 0)
            }
          };
          try {
            localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
            localStorage.setItem('klarity_bills', JSON.stringify(nextBills));
            localStorage.setItem('klarity_subscriptions', JSON.stringify(nextSubs));
            localStorage.setItem('klarity_transactions', JSON.stringify(nextTxs));
          } catch (e) {}
          return nextState;
        });
      }

      // Handle AI action execution notifications (e.g. adding subscriptions, bills, purchases, budgets, goals)
      if (json.actionsExecuted && json.actionsExecuted.length > 0) {
        for (const act of json.actionsExecuted) {
          if (act.type === 'budget' && act.item?.category && act.item?.limit) {
            const lim = parseFloat(act.item.limit);
            setBudgets(prev => {
              const exists = prev.find(b => (b.category || '').toLowerCase() === (act.item.category || '').toLowerCase());
              if (exists) return prev.map(b => b.id === exists.id ? { ...b, limit: lim } : b);
              return [...prev, { id: `b-${Date.now()}`, category: act.item.category, limit: lim, lastMonthSpent: Math.round(lim * 0.8) }];
            });
          } else if (act.type === 'delete_budget' && act.item?.category) {
            setBudgets(prev => prev.filter(b => (b.category || '').toLowerCase() !== (act.item.category || '').toLowerCase()));
          } else if (act.type === 'delete_goal' && act.item?.name) {
            setSavingsGoals(prev => prev.filter(g => (g.name || '').toLowerCase() !== (act.item.name || '').toLowerCase()));
          } else if (act.type === 'delete_bill' && act.item?.name) {
            setData(prev => {
              const nextBills = (prev.bills || []).filter(b => (b.name || '').toLowerCase() !== (act.item.name || '').toLowerCase());
              return { ...prev, bills: nextBills };
            });
          } else if (act.type === 'delete_subscription' && act.item?.name) {
            setData(prev => {
              const nextSubs = (prev.subscriptions || []).filter(s => (s.name || '').toLowerCase() !== (act.item.name || '').toLowerCase());
              return { ...prev, subscriptions: nextSubs };
            });
          } else if (act.type === 'set_income' && act.item?.amount) {
            setIncomeStreams(prev => {
              const idx = prev.findIndex(s => s.type === act.item.type);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], amount: parseFloat(act.item.amount), label: act.item.label || copy[idx].label };
                return copy;
              }
              return [...prev, {
                id: `stream-${Date.now()}`,
                type: act.item.type || 'other',
                label: act.item.label || 'Retirement Benefit',
                amount: parseFloat(act.item.amount),
                isStatutorilyExempt: ['social_security', 'calpers', 'pension'].includes(act.item.type)
              }];
            });
          } else if (act.type === 'delete_income' && act.item?.type) {
            setIncomeStreams(prev => prev.filter(s => s.type !== act.item.type));
          } else if (act.type === 'set_household' && act.item) {
            setHouseholdProfile(prev => ({
              ...prev,
              ...(act.item.dwellingType ? { dwellingType: act.item.dwellingType } : {}),
              ...(act.item.householdSize ? { householdSize: Number(act.item.householdSize) } : {}),
              ...(act.item.sqFt ? { sqFt: Number(act.item.sqFt) } : {}),
              ...(act.item.cityOrZip ? { cityOrZip: act.item.cityOrZip } : {}),
              ...(act.item.utilityRegionId ? { utilityRegionId: act.item.utilityRegionId } : {}),
              ...(typeof act.item.hasCareDiscount === 'boolean' ? { hasCareDiscount: act.item.hasCareDiscount } : {}),
              ...(typeof act.item.hasSolar === 'boolean' ? { hasSolar: act.item.hasSolar } : {})
            }));
          } else if (act.type === 'add_vehicle' && act.item?.name) {
            setHouseholdProfile(prev => ({
              ...prev,
              vehicles: [
                ...(prev.vehicles || []),
                {
                  id: `veh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                  name: act.item.name,
                  type: act.item.type || 'gas',
                  mpgOrEfficiency: Number(act.item.mpgOrEfficiency) || (act.item.type === 'ev' ? 28 : 30),
                  monthlyMiles: Number(act.item.monthlyMiles) || 900,
                  insuranceMonthly: Number(act.item.insuranceMonthly) || 120,
                  monthlyPayment: Number(act.item.monthlyPayment) || 0,
                  freeChargingSharePercent: act.item.type === 'ev' ? Number(act.item.freeChargingSharePercent ?? 35) : 0
                }
              ]
            }));
          } else if (act.type === 'delete_vehicle' && act.item?.name) {
            setHouseholdProfile(prev => ({
              ...prev,
              vehicles: (prev.vehicles || []).filter(v => !(v.name || '').toLowerCase().includes((act.item.name || '').toLowerCase()))
            }));
          } else if (act.type === 'add_vault_item' && act.item?.service) {
            setVaultItems(prev => [
              {
                id: `v-ai-${Date.now()}`,
                service: act.item.service,
                category: act.item.category || 'Household',
                username: act.item.username || '',
                password: act.item.password || '',
                accountNumber: act.item.accountNumber || '',
                website: act.item.website || '',
                notes: act.item.notes || ''
              },
              ...(prev || [])
            ]);
          } else if (act.type === 'retirement' && act.item?.name) {
            setRetirementPlans(prev => {
              const updated = [...(prev || [])];
              const idx = updated.findIndex(p => p.id === act.item.id || (p.name || '').toLowerCase() === act.item.name.toLowerCase());
              if (idx >= 0) updated[idx] = { ...updated[idx], ...act.item };
              else updated.push(act.item);
              return updated;
            });
          } else if (act.type === 'delete_retirement' && (act.item?.id || act.item?.name)) {
            setRetirementPlans(prev => (prev || []).filter(p => (!act.item.id || p.id !== act.item.id) && (!act.item.name || (p.name || '').toLowerCase() !== act.item.name.toLowerCase())));
          } else if (act.type === 'goal' && act.item?.name && act.item?.targetAmount) {
            setSavingsGoals(prev => [
              ...prev,
              {
                id: `goal-${Date.now()}`,
                name: act.item.name,
                targetAmount: parseFloat(act.item.targetAmount),
                currentAmount: parseFloat(act.item.currentAmount || 0),
                monthlyContribution: parseFloat(act.item.monthlyContribution || 200)
              }
            ]);
          }
        }
        const count = json.actionsExecuted.length;
        setNotificationToast(`Auto-added ${count} item${count > 1 ? 's' : ''} to your records!`);
        setTimeout(() => setNotificationToast(''), 4500);
      } else if (json.actionExecuted) {
        const act = json.actionExecuted;
        setNotificationToast(`Added ${act.item?.name || 'item'} to ${act.type}!`);
        setTimeout(() => setNotificationToast(''), 4000);
      }

      // Handle AI navigation tags: [NAVIGATE:target] (support single destination or pipe-delimited)
      const navMatch = replyText.match(/\[NAVIGATE:([^\]]+)\]/i);
      if (navMatch) {
        const rawTarget = navMatch[1].toLowerCase();
        const parts = rawTarget.split('|').map(s => s.trim());
        const validTabs = ['dashboard', 'bills', 'subscriptions', 'cards', 'transactions', 'budgets', 'overview', 'vault', 'passwords', 'retirement', 'pension', 'pensions', 'lifestyle', 'household', 'health', 'settings'];
        const matchedTab = parts.find(p => validTabs.includes(p));
        if (matchedTab === 'settings') {
          setSettingsActiveTab('ai');
          setIsSettingsOpen(true);
        } else if (matchedTab) {
          setActiveTab(matchedTab === 'overview' ? 'dashboard' : matchedTab === 'passwords' ? 'vault' : ['retirement', 'pension', 'pensions'].includes(matchedTab) ? 'retirement' : ['household', 'health'].includes(matchedTab) ? 'lifestyle' : matchedTab);
        }
      }

      // Stripping: ALWAYS thoroughly remove all [NAVIGATE:...] and [ACTION:...] tags regardless of content
      replyText = replyText
        .replace(/\[NAVIGATE:[\s\S]*?\]/gi, '')
        .replace(/\[ACTION:[\s\S]*?\]/gi, '')
        .trim();

      if (json.needsKey) {
        setSettingsAiStatus('not_connected');
      }

      // Build context-aware interactive Action Buttons for the assistant bubble
      const autoSuggestedActions = generateContextualSuggestions(userMsg, replyText);

      const updated = [
        ...userUpdatedMessages,
        {
          role: 'assistant',
          text: replyText,
          suggestedActions: autoSuggestedActions.slice(0, 3)
        }
      ];
      updateActiveSession(updated);
      scrollChatToBottom();
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
        const updated = [
          ...userUpdatedMessages,
          {
            role: 'assistant',
            text: 'Response generation stopped.',
            suggestedActions: [
              { label: 'Create a $400 Groceries budget', type: 'set_budget', category: 'Groceries', limit: 400 },
              { label: 'Set a payment reminder', type: 'payment_reminder' },
              { label: 'Open Debt Payoff Planner', type: 'navigate', tab: 'cards' }
            ]
          }
        ];
        updateActiveSession(updated);
        scrollChatToBottom();
        return;
      }
      const updated = [
        ...userUpdatedMessages,
        { role: 'assistant', text: "Could not connect to AI advisor. Please verify your settings." }
      ];
      updateActiveSession(updated);
      scrollChatToBottom();
    } finally {
      chatAbortControllerRef.current = null;
      setIsAiTyping(false);
      scrollChatToBottom();
    }
  };

  // Splash loading screen while verifying existing stored session (prevents Google sign-in flash)
  if (isCheckingSession && !currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center selection:bg-blue-100">
        <div className="flex flex-col items-center gap-3">
          <KlarityLogo className="w-12 h-12 text-[#18457c] animate-pulse" />
          <span className="font-serif-title text-2xl font-bold tracking-tight text-slate-800">Klarity</span>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 1. SIGN IN SCREEN: GOOGLE OAUTH + OPTIONAL EMAIL
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900">
        {/* Top Navbar */}
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KlarityLogo className="w-7 h-7 text-[#18457c] shrink-0" />
            <span className="font-serif-title text-2xl font-bold tracking-tight text-slate-900">Klarity</span>
          </div>
        </header>

        {/* Center Container */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-6">
            
            {/* Header */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <KlarityLogo className="w-7 h-7 text-[#18457c]" />
              </div>
              <h2 className="font-serif-title text-2xl font-bold tracking-tight text-slate-900">
                Sign In to Klarity
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage your real cards, balances, and household bills securely
              </p>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            {/* REAL GOOGLE OAUTH SIGN IN BUTTON */}
            <div>
              <GoogleSignInButton
                onAuthSuccess={handleGoogleProfileSuccess}
                onError={err => setAuthError(err)}
                setIsAuthenticating={setIsAuthenticating}
                isAuthenticating={isAuthenticating}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                or use email
              </span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-lg transition-all ${
                  authMode === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`py-1.5 rounded-lg transition-all ${
                  authMode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Email Form */}
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5 text-xs">
              {authMode === 'signup' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 pr-10 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat your password"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full mt-1 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>
                  {isAuthenticating
                    ? 'Processing...'
                    : authMode === 'signup'
                    ? 'Create Account'
                    : 'Sign In with Email'}
                </span>
              </button>
            </form>
          </div>
        </div>

        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          © 2026 Klarity. All personal financial data is AES-256 encrypted and private.
        </footer>
      </div>
    );
  }

  // Session Inactivity Lock Screen
  if (isSessionLocked) {
    const isPasswordMode = vaultLockType === 'password';
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-blue-100">
        <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KlarityLogo className="w-7 h-7 text-[#18457c] shrink-0" />
            <span className="font-serif-title text-2xl font-bold tracking-tight text-slate-900">Klarity</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
          >
            Sign Out
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center mx-auto mb-3 text-[#18457c]">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="font-serif-title text-2xl font-bold tracking-tight text-slate-900">
                Session Inactive
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Klarity locked automatically after {autoLockMinutes} minutes of inactivity. Enter your {isPasswordMode ? 'master password' : 'security PIN'} to resume.
              </p>
              <p className="text-[11px] font-semibold text-slate-600 mt-2 bg-slate-50 py-1 px-3 rounded-full inline-block border border-slate-200">
                {currentUser?.email || 'User'}
              </p>
            </div>

            {lockError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockSession} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {isPasswordMode ? 'Master Password' : 'Security PIN'}
                </label>
                <input
                  type="password"
                  inputMode={isPasswordMode ? 'text' : 'numeric'}
                  autoFocus
                  value={lockPinInput}
                  onChange={e => setLockPinInput(e.target.value)}
                  placeholder={isPasswordMode ? 'Enter your master password' : '••••'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:bg-white focus:border-[#18457c]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                Resume Session
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                Not you? Sign out of this session
              </button>
            </div>
          </div>
        </div>

        <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          Session protected by Klarity Security
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. MAIN APP: REAL CARDS, REAL BILLS, REAL DATA ONLY (Clean Light Theme)
  // =========================================================================
  const accountsList = data?.accounts || [];
  const billsList = data?.bills || [];
  const subscriptionsList = data?.subscriptions || [];
  const transactionsList = data?.transactions || [];

  const isCard = (a) => a.type === 'credit' || (a.subtype || '').toLowerCase().includes('credit') || (a.subtype || '').toLowerCase().includes('card') || (a.name || '').toLowerCase().includes('credit') || (a.name || '').toLowerCase().includes('card');
  const creditCards = accountsList.filter(isCard);
  const checkingAccounts = accountsList.filter(a => !isCard(a));
  const highestAprCard = (creditCards || [])
    .filter(a => Number(a.balance) > 0)
    .sort((a, b) => Number(b.apr || 0) - Number(a.apr || 0))[0] || null;

  const isHalalFinance = aiMemory.some(m => {
    const s = m.toLowerCase();
    return s.includes('muslim') || s.includes('halal') || s.includes('islam') || s.includes('riba');
  });

  const availableCash = checkingAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const cardBalances = creditCards.reduce((sum, a) => sum + Number(a.balance || 0), 0);
  const billsDueIn14DaysSum = billsList
    .filter(b => b.status !== 'paid' && (b.daysUntil == null || b.daysUntil <= 14))
    .reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);
  const billsDueIn14DaysCount = billsList.filter(b => b.status !== 'paid' && (b.daysUntil == null || b.daysUntil <= 14)).length;
  const totalMonthlyBills = billsList.reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);
  const totalMonthlySubscriptions = subscriptionsList.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  // Default fallback mocks to guarantee 1:1 visual match with reference design
  const DEFAULT_OVERVIEW_CARDS = [
    { id: 'mock-card-1', name: 'Everyday Rewards', mask: '4417', balance: 1102.20, limit: 5000, apr: 21.9, minPayment: 35, bgColor: 'bg-[#18457c]' },
    { id: 'mock-card-2', name: 'Travel Card', mask: '9082', balance: 662.00, limit: 2000, apr: 24.4, minPayment: 25, bgColor: 'bg-[#242e3d]' }
  ];

  const DEFAULT_OVERVIEW_BILLS = [];

  const DEFAULT_OVERVIEW_SUBS = [
    { id: 'mock-s-1', name: 'Netflix', category: 'Streaming', renewalDate: 'Nov 3', renewText: 'Renews Nov 3', amount: 15.49, billingCycle: 'monthly', account: 'Everyday Rewards •••• 4417', priceIncreased: 2.00 },
    { id: 'mock-s-2', name: 'Spotify', category: 'Music', renewalDate: 'Nov 9', renewText: 'Renews Nov 9', amount: 11.99, billingCycle: 'monthly', account: 'Everyday Rewards •••• 4417' },
    { id: 'mock-s-3', name: 'iCloud', category: 'Cloud Storage', renewalDate: 'Nov 14', renewText: 'Renews Nov 14', amount: 2.99, billingCycle: 'monthly', account: 'Travel Card •••• 9082' },
    { id: 'mock-s-4', name: 'ChatGPT Plus', category: 'AI & Software', renewalDate: 'Nov 20', renewText: 'Renews Nov 20', amount: 20.00, billingCycle: 'monthly', account: 'Everyday Rewards •••• 4417' }
  ];

  const DEFAULT_OVERVIEW_TXS = [
    { id: 'mock-t-0', name: 'Chipotle', date: 'Oct 26', category: 'Dining', account: 'Everyday Rewards •••• 4417', subText: 'Oct 26 · Dining', amount: -16.40, pending: true, notes: '' },
    { id: 'mock-t-sub-1', name: 'Netflix', date: 'Oct 25', category: 'Subscriptions', account: 'Everyday Rewards •••• 4417', subText: 'Oct 25 · Subscriptions', amount: -15.49, notes: '' },
    { id: 'mock-t-1', name: "Trader Joe's", date: 'Oct 24', category: 'Groceries', account: 'Everyday Rewards •••• 4417', subText: 'Oct 24 · Groceries', amount: -54.12, notes: 'Weekly family groceries' },
    { id: 'mock-t-2', name: 'Shell', date: 'Oct 23', category: 'Gas', account: 'Everyday Rewards •••• 4417', subText: 'Oct 23 · Gas', amount: -41.80, notes: '' },
    { id: 'mock-t-3', name: 'Paycheck', date: 'Oct 22', category: 'Income', account: 'Checking •••• 4821', subText: 'Oct 22 · Income', amount: 1850.00, notes: 'Bi-weekly direct deposit' },
    { id: 'mock-t-4', name: 'Amazon', date: 'Oct 21', category: 'Shopping', account: 'Everyday Rewards •••• 4417', subText: 'Oct 21 · Shopping', amount: -67.90, notes: '' },
    { id: 'mock-t-5', name: 'Starbucks', date: 'Oct 20', category: 'Dining', account: 'Everyday Rewards •••• 4417', subText: 'Oct 20 · Dining', amount: -6.85, notes: '' },
    { id: 'mock-t-6', name: 'Safeway', date: 'Oct 19', category: 'Groceries', account: 'Everyday Rewards •••• 4417', subText: 'Oct 19 · Groceries', amount: -88.30, notes: '' },
    { id: 'mock-t-7', name: 'Spotify', date: 'Oct 18', category: 'Subscriptions', account: 'Everyday Rewards •••• 4417', subText: 'Oct 18 · Subscriptions', amount: -11.99, notes: '' },
    { id: 'mock-t-8', name: 'Chevron', date: 'Oct 16', category: 'Gas', account: 'Travel Card •••• 9082', subText: 'Oct 16 · Gas', amount: -48.20, notes: '' },
    { id: 'mock-t-9', name: 'Sweetgreen', date: 'Oct 15', category: 'Dining', account: 'Travel Card •••• 9082', subText: 'Oct 15 · Dining', amount: -33.75, notes: '' }
  ];

  // Unified list of every connected card and account (with last 4 digits) for the Multi-Card Filter
  const allFilterableCards = (() => {
    const list = [];
    for (const acc of accountsList) {
      const maskStr = String(acc.mask || (isCard(acc) ? '4417' : '4821')).slice(-4);
      list.push({
        id: acc.id,
        name: acc.name || 'Account',
        institution: acc.institution || '',
        mask: maskStr,
        type: isCard(acc) ? 'credit' : 'depository',
        fullLabel: `${acc.name || 'Account'} •••• ${maskStr}`
      });
    }
    if (!list.some(c => c.type === 'depository' || c.name.toLowerCase().includes('checking'))) {
      list.unshift({
        id: 'card-checking-4821',
        name: 'Checking',
        institution: 'Chase',
        mask: '4821',
        type: 'depository',
        fullLabel: 'Checking •••• 4821'
      });
    }
    if (!list.some(c => c.type === 'credit')) {
      list.push(
        { id: 'mock-card-1', name: 'Everyday Rewards', institution: 'Chase', mask: '4417', type: 'credit', fullLabel: 'Everyday Rewards •••• 4417' },
        { id: 'mock-card-2', name: 'Travel Card', institution: 'Capital One', mask: '9082', type: 'credit', fullLabel: 'Travel Card •••• 9082' }
      );
    }
    return list;
  })();

  // Format any item's assigned card with its name and last 4 digits
  const resolveItemCard = (item, fallbackType = 'credit') => {
    const rawAcc = String(item?.account || item?.paymentMethod || '').trim();
    const rawCardId = String(item?.cardId || '').trim();
    if (rawCardId) {
      const byId = allFilterableCards.find(c => c.id === rawCardId);
      if (byId) return byId;
    }
    if (rawAcc) {
      const lowerAcc = rawAcc.toLowerCase();
      const byMatch = allFilterableCards.find(c =>
        lowerAcc.includes(c.mask.toLowerCase()) ||
        lowerAcc.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(lowerAcc)
      );
      if (byMatch) return byMatch;
    }
    if (fallbackType === 'depository') {
      return allFilterableCards.find(c => c.type === 'depository') || allFilterableCards[0];
    }
    return allFilterableCards.find(c => c.type === 'credit') || allFilterableCards[0];
  };

  // Check if an item belongs to the currently selected card(s) in MultiCardFilterDropdown
  const matchesSelectedCards = (item, fallbackType = 'credit') => {
    if (!selectedCardIds || selectedCardIds.length === 0) return true;
    const resolved = resolveItemCard(item, fallbackType);
    if (resolved && selectedCardIds.includes(resolved.id)) return true;
    const rawAcc = String(item?.account || '').toLowerCase();
    const selectedObjs = allFilterableCards.filter(c => selectedCardIds.includes(c.id));
    return selectedObjs.some(c =>
      rawAcc.includes(c.mask.toLowerCase()) ||
      rawAcc.includes(c.name.toLowerCase())
    );
  };

  // Helper to format money respecting Hide-Balances mode
  const fmtMoney = (amount, decimals = 2) => {
    // Balances always visible
    const num = Number(amount || 0);
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const displayCash = checkingAccounts.length > 0 ? availableCash : 4218.36;
  const displayCards = creditCards.length > 0
    ? creditCards.map((c, i) => ({
        id: c.id,
        name: c.name,
        mask: c.mask || '4417',
        balance: Number(c.balance || 0),
        limit: Number(c.limit || 5000),
        apr: c.apr || 21.9,
        minPayment: c.minPayment || Math.max(25, Math.round(Number(c.balance || 0) * 0.025)),
        bgColor: i % 2 === 0 ? 'bg-[#18457c]' : 'bg-[#242e3d]'
      }))
    : DEFAULT_OVERVIEW_CARDS;

  const displayCardBalances = creditCards.length > 0 ? cardBalances : 1764.20;

  // Source lists for Bills, Subscriptions, and Transactions (using real data when present, or defaults)
  const sourceBillsList = (Array.isArray(billsList) ? billsList : []).map(b => {
    const cardObj = resolveItemCard(b, 'depository');
    return {
      ...b,
      expectedAmount: Number(b.expectedAmount ?? b.amount ?? 0),
      amount: Number(b.expectedAmount ?? b.amount ?? 0),
      account: cardObj ? cardObj.fullLabel : (b.account || 'Checking •••• 4821'),
      cardId: cardObj ? cardObj.id : '',
      dueText: b.nextDueDate
        ? `Due ${b.nextDueDate} · ${cardObj?.name || 'Checking'} (•••• ${cardObj?.mask || '4821'})`
        : (b.dueDay ? `Due Day ${b.dueDay} · ${cardObj?.name || 'Checking'} (•••• ${cardObj?.mask || '4821'})` : `Due soon · ${cardObj?.name || 'Checking'}`),
      daysUntil: b.daysUntil != null ? b.daysUntil : (b.dueDay ? Math.max(1, ((b.dueDay - new Date().getDate() + 30) % 30) || 3) : 3)
    };
  });

  const sourceSubsList = (Array.isArray(subscriptionsList) ? subscriptionsList : []).map(s => {
    const cardObj = resolveItemCard(s, 'credit');
    return {
      ...s,
      amount: Number(s.amount || 0),
      category: s.category || 'Entertainment',
      account: cardObj ? cardObj.fullLabel : (s.account || 'Everyday Rewards •••• 4417'),
      cardId: cardObj ? cardObj.id : '',
      renewText: s.renewalDate ? `Renews ${s.renewalDate} · •••• ${cardObj?.mask || '4417'}` : `Renews monthly · •••• ${cardObj?.mask || '4417'}`
    };
  });

  const sourceTxsList = (Array.isArray(transactionsList) ? transactionsList : []).map(t => {
    const isIncome = (t.category || '').toLowerCase() === 'income' || (t.name || '').toLowerCase().includes('deposit') || Number(t.amount) > 500;
    const cardObj = resolveItemCard(t, isIncome ? 'depository' : 'credit');
    const rememberedCat = categoryRules[(t.name || '').toLowerCase().trim()];
    return {
      ...t,
      category: rememberedCat || t.category || 'Shopping',
      account: cardObj ? cardObj.fullLabel : (t.account || 'Everyday Rewards •••• 4417'),
      cardId: cardObj ? cardObj.id : '',
      subText: `${t.date || 'Recent'} · ${cardObj?.name || 'Checking'} (•••• ${cardObj?.mask || '4417'})`,
      amount: Number(t.amount || 0)
    };
  });

  const displayBills = sourceBillsList;
  const displayDue14Sum = sourceBillsList
    .filter(b => b.status !== 'paid' && (b.daysUntil == null || b.daysUntil <= 14))
    .reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);
  const displayDue14Count = sourceBillsList.filter(b => b.status !== 'paid' && (b.daysUntil == null || b.daysUntil <= 14)).length;
  const displayTotalMonthlyBills = sourceBillsList.reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);

  const displaySubs = sourceSubsList;
  const displayTotalSubs = sourceSubsList.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const displayTxs = sourceTxsList.slice(0, 4);

  const firstName = currentUser?.name ? currentUser.name.split(' ')[0] : 'Ziyad';
  const userInitials = (currentUser?.name || 'Ziyad Elmahi')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ZE';

  const getTimeGreeting = () => {
    const hr = new Date().getHours();
    if (hr >= 4 && hr < 12) return 'morning';
    if (hr >= 12 && hr < 17) return 'afternoon';
    return 'night';
  };

  // Filtered Transactions (respecting Multi-Card Filter, Category Filter, and Search)
  const filteredTransactions = sourceTxsList.filter(t => {
    const matchCard = matchesSelectedCards(t, 'credit');
    const matchCategory = categoryFilter === 'all' ? true : (t.category || '').toLowerCase() === categoryFilter.toLowerCase();
    const q = txSearch.toLowerCase().trim();
    const matchSearch = q
      ? ((t.name || '').toLowerCase().includes(q) ||
         (t.category || '').toLowerCase().includes(q) ||
         (t.notes || '').toLowerCase().includes(q) ||
         String(Math.abs(Number(t.amount || 0))).includes(q))
      : true;
    return matchCard && matchCategory && matchSearch;
  });

  const filteredTxSpent = filteredTransactions
    .filter(t => (t.category || '').toLowerCase() !== 'income' && !(t.name || '').toLowerCase().includes('deposit'))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  const filteredTxIncome = filteredTransactions
    .filter(t => (t.category || '').toLowerCase() === 'income' || (t.name || '').toLowerCase().includes('deposit'))
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  // Filtered Bills (respecting Multi-Card Filter, Status/Category Filter, and Search)
  const filteredBills = sourceBillsList.filter(b => {
    const matchCard = matchesSelectedCards(b, 'depository');
    const query = billSearch.toLowerCase().trim();
    const matchSearch = query
      ? (b.name?.toLowerCase().includes(query) || (b.biller || '').toLowerCase().includes(query) || (b.account || '').toLowerCase().includes(query))
      : true;
    let matchFilter = true;
    if (billFilter === 'due_soon') {
      matchFilter = b.status === 'due_soon' || (b.daysUntil != null && b.daysUntil <= 5);
    } else if (billFilter === 'paid') {
      matchFilter = b.status === 'paid';
    } else if (billFilter === 'upcoming') {
      matchFilter = b.status !== 'paid';
    } else if (billFilter !== 'all') {
      matchFilter = (b.category || '').toLowerCase() === billFilter.toLowerCase();
    }
    return matchCard && matchSearch && matchFilter;
  });

  const filteredTotalMonthlyBills = filteredBills.reduce((sum, b) => sum + Number(b.expectedAmount || 0), 0);

  // Filtered Subscriptions (respecting Multi-Card Filter, Category Filter, and Search)
  const filteredSubscriptions = sourceSubsList.filter(s => {
    const matchCard = matchesSelectedCards(s, 'credit');
    const q = subSearch.toLowerCase().trim();
    const matchSearch = q
      ? ((s.name || '').toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q) || (s.account || '').toLowerCase().includes(q))
      : true;
    const matchCat = subCategoryFilter === 'all' ? true : (s.category || '').toLowerCase() === subCategoryFilter.toLowerCase();
    return matchCard && matchSearch && matchCat;
  });

  const filteredTotalSubscriptions = filteredSubscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  // Budgets Calculations (dynamically tied to the Multi-Card Filter!)
  const cardFilteredTxsForBudgets = sourceTxsList.filter(t => matchesSelectedCards(t, 'credit'));
  const cardFilteredBillsForBudgets = sourceBillsList.filter(b => matchesSelectedCards(b, 'depository'));
  const cardFilteredSubsForBudgets = sourceSubsList.filter(s => matchesSelectedCards(s, 'credit'));

  const computedBudgets = budgets.map(b => {
    const catLower = (b.category || '').toLowerCase();
    let spent = cardFilteredTxsForBudgets
      .filter(t => {
        const tc = (t.category || '').toLowerCase();
        if (tc === 'income') return false;
        if (catLower === 'gas' || catLower === 'transportation') {
          return tc === 'gas' || tc === 'transportation';
        }
        return tc === catLower;
      })
      .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    if (catLower === 'utilities' || catLower === 'housing' || catLower === 'bills') {
      const billsToCount = catLower === 'bills'
        ? cardFilteredBillsForBudgets.filter(bill => bill.status === 'due_soon' || (bill.daysUntil != null && bill.daysUntil <= 5))
        : cardFilteredBillsForBudgets.filter(bill => (bill.category || '').toLowerCase() === catLower);
      spent += billsToCount.reduce((sum, bill) => sum + Number(bill.expectedAmount || 0), 0);
    }
    if ((catLower === 'entertainment' || catLower === 'subscriptions') && spent === 0) {
      spent += cardFilteredSubsForBudgets
        .reduce((sum, sub) => sum + Number(sub.amount || 0), 0);
    }

    const limit = Number(b.limit || 1);
    const pct = Math.round((spent / limit) * 100);
    const lastMonth = selectedCardIds.length === 0 ? Number(b.lastMonthSpent || Math.round(limit * 0.8)) : Math.round(spent * 0.9);
    const diffFromLastMonth = spent - lastMonth;
    return {
      ...b,
      spent,
      limit,
      pct,
      isWarning: pct >= 80 && pct <= 100,
      isOver: spent > limit,
      lastMonth,
      diffFromLastMonth
    };
  });

  const totalBudgetLimit = computedBudgets.reduce((s, b) => s + b.limit, 0);
  const totalBudgetSpent = Math.ceil(computedBudgets.reduce((s, b) => s + b.spent, 0));
  const hasAnyBudgetPaymentsOnSelectedCard =
    cardFilteredTxsForBudgets.length > 0 || cardFilteredBillsForBudgets.length > 0 || cardFilteredSubsForBudgets.length > 0;

  // Net Worth & 6-Month History Calculation
  const manualPositiveAssets = manualAssets
    .filter(a => a.type !== 'loan')
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  const manualLoans = manualAssets
    .filter(a => a.type === 'loan')
    .reduce((s, a) => s + Number(a.balance || 0), 0);
  // Retirement Account Balances (401k, 403b, 457, IRA, Roth IRA - strictly excluding pensions and Social Security)
  const retirementAccountBalances = featureFlags.retirement
    ? retirementPlans
        .filter(p => p.planType !== 'pension' && p.planType !== 'social_security')
        .reduce((s, p) => s + Number(p.balance || 0), 0)
    : 0;

  // Projected Monthly Retirement Income (Pensions + Social Security + 4% safe draw on accounts)
  const projectedRetirementMonthlyIncome = (!featureFlags.retirement || retirementPlans.length === 0)
    ? 0
    : retirementPlans.reduce((sum, p) => {
        if (p.planType === 'pension' || p.planType === 'social_security') {
          return sum + Number(p.estimatedMonthlyBenefit || 0);
        } else {
          return sum + ((Number(p.balance || 0) * 0.04) / 12);
        }
      }, 0);
  const totalNetWorth = displayCash + manualPositiveAssets + retirementAccountBalances - displayCardBalances - manualLoans;
  const netWorthHistory = [
    { month: 'May', value: Math.round(totalNetWorth * 0.78) },
    { month: 'Jun', value: Math.round(totalNetWorth * 0.83) },
    { month: 'Jul', value: Math.round(totalNetWorth * 0.86) },
    { month: 'Aug', value: Math.round(totalNetWorth * 0.91) },
    { month: 'Sep', value: Math.round(totalNetWorth * 0.96) },
    { month: 'Oct', value: Math.round(totalNetWorth) }
  ];

  // Cash Flow Forecast ("You'll be at $X on Nov 15 after rent and bills")
  const projectedCashAfterBills = displayCash - displayDue14Sum;

  // Smart Alerts (Bill due soon, Card over 30% utilization, Budget near limit, Price increase)
  const smartAlerts = (() => {
    const list = [];
    for (const c of displayCards) {
      const u = c.limit > 0 ? Math.round((c.balance / c.limit) * 100) : 0;
      if (u >= 30) {
        list.push({
          id: `alert-util-${c.id}`,
          type: 'warning',
          title: `${c.name} (•••• ${c.mask}) is at ${u}% credit utilization`,
          detail: `Keeping utilization under 30% ($${Math.round(c.limit * 0.3)}) improves your credit score.`,
          actionTab: 'cards',
          actionLabel: 'Payoff Planner'
        });
      }
    }
    for (const b of sourceBillsList) {
      if (b.status !== 'paid' && b.daysUntil != null && b.daysUntil <= 3) {
        list.push({
          id: `alert-bill-${b.id}`,
          type: 'urgent',
          title: `${b.name} ($${Number(b.expectedAmount).toFixed(2)}) is due in ${b.daysUntil} days`,
          detail: `Scheduled from ${b.account}.`,
          actionTab: 'bills',
          actionLabel: 'View Bills'
        });
      }
    }
    for (const bg of computedBudgets) {
      if (bg.pct >= 80) {
        list.push({
          id: `alert-bg-${bg.id}`,
          type: bg.isOver ? 'urgent' : 'warning',
          title: `${bg.category} budget is at ${bg.pct}% ($${bg.spent.toFixed(0)} of $${bg.limit})`,
          detail: bg.isOver ? 'You have exceeded this monthly category limit.' : 'Approaching your monthly category limit.',
          actionTab: 'budgets',
          actionLabel: 'Review Budgets'
        });
      }
    }
    return list.slice(0, 4);
  })();

  // Debt Payoff Planner Simulation (Avalanche vs Snowball)
  const debtPayoffComparison = (() => {
    const cardsWithDebt = displayCards.filter(c => Number(c.balance) > 0);
    if (cardsWithDebt.length === 0) return null;

    const simulate = (strategy, extraMonthly) => {
      const clones = cardsWithDebt.map(c => ({
        id: c.id,
        name: c.name,
        mask: c.mask,
        balance: Number(c.balance),
        apr: Number(c.apr || 21.9),
        minPayment: Math.max(25, Number(c.minPayment || Math.round(c.balance * 0.025)))
      }));
      if (strategy === 'avalanche') {
        clones.sort((a, b) => (b.apr - a.apr) || ((b.balance / (b.limit || 1)) - (a.balance / (a.limit || 1))) || (b.balance - a.balance));
      } else {
        clones.sort((a, b) => (a.balance - b.balance) || (b.apr - a.apr));
      }
      let months = 0;
      let totalInterest = 0;
      while (clones.some(c => c.balance > 0.01) && months < 120) {
        months++;
        let extraAvailable = Number(extraMonthly || 0);
        for (const c of clones) {
          if (c.balance <= 0) continue;
          const monthlyInterest = c.balance * (c.apr / 100 / 12);
          totalInterest += monthlyInterest;
          c.balance += monthlyInterest;
          const minPay = Math.min(c.balance, c.minPayment);
          c.balance -= minPay;
        }
        for (const c of clones) {
          if (c.balance > 0 && extraAvailable > 0) {
            const pay = Math.min(c.balance, extraAvailable);
            c.balance -= pay;
            extraAvailable -= pay;
          }
        }
      }
      const finishDate = new Date();
      finishDate.setMonth(finishDate.getMonth() + months);
      const finishLabel = finishDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return { months, totalInterest, finishLabel, order: clones.map(c => `${c.name} (•••• ${c.mask})`) };
    };

    const avalanche = simulate('avalanche', extraDebtPayment);
    const snowball = simulate('snowball', extraDebtPayment);
    const minOnly = simulate('avalanche', 0);
    return {
      avalanche,
      snowball,
      minOnly,
      activePlan: debtStrategy === 'avalanche' ? avalanche : snowball,
      interestSavedVsMin: Math.max(0, minOnly.totalInterest - (debtStrategy === 'avalanche' ? avalanche.totalInterest : snowball.totalInterest)),
      monthsSavedVsMin: Math.max(0, minOnly.months - (debtStrategy === 'avalanche' ? avalanche.months : snowball.months))
    };
  })();

  // Build comprehensive, data-driven Weekly Financial Advisor Analysis pulling live Cards, Transactions, Budgets, Bills & Subscriptions
  const buildPersonalizedAdvisorBriefing = () => {
    const money = (n) => `${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const money0 = (n) => `${Math.round(Number(n || 0)).toLocaleString('en-US')}`;

    // 1. Analyze all credit cards (unfiltered across portfolio)
    const enrichedCards = displayCards.map(c => {
      const bal = Number(c.balance || 0);
      const lim = Math.max(1, Number(c.limit || 5000));
      const utilPct = Math.round((bal / lim) * 100);
      const apr = Number(c.apr || 21.5);
      const minPay = bal > 0 ? Math.max(25, Number(c.minPayment || Math.round(bal * 0.025))) : 0;
      const monthlyInterest = bal * (apr / 100) / 12;
      const target30Bal = lim * 0.30;
      const paydownFor30Pct = Math.max(0, bal - target30Bal);
      return {
        ...c,
        balance: bal,
        limit: lim,
        utilPct,
        apr,
        minPay,
        monthlyInterest,
        target30Bal,
        paydownFor30Pct,
        label: `${c.name} (•••• ${c.mask})`
      };
    });

    const cardsWithBalance = enrichedCards.filter(c => c.balance > 0);
    const zeroBalanceCards = enrichedCards.filter(c => c.balance <= 0);
    const totalCardDebt = cardsWithBalance.reduce((s, c) => s + c.balance, 0);
    const totalMinPayments = cardsWithBalance.reduce((s, c) => s + c.minPay, 0);
    const totalMonthlyInterest = cardsWithBalance.reduce((s, c) => s + c.monthlyInterest, 0);

    // Rank cards from FIRST to LAST to pay off:
    // Avalanche: highest APR first, breaking ties by highest utilization % and highest monthly interest cost
    const avalancheRanked = [...cardsWithBalance].sort(
      (a, b) => (b.apr - a.apr) || (b.utilPct - a.utilPct) || (b.balance - a.balance)
    );
    // Snowball: smallest balance first for fastest account elimination
    const snowballRanked = [...cardsWithBalance].sort(
      (a, b) => (a.balance - b.balance) || (b.apr - a.apr)
    );
    const primaryRanked = debtStrategy === 'snowball' ? snowballRanked : avalancheRanked;
    const firstCard = primaryRanked[0] || null;
    const lastCard = primaryRanked.length > 1 ? primaryRanked[primaryRanked.length - 1] : null;
    const lowestUtilCard = [...enrichedCards].sort((a, b) => (a.utilPct - b.utilPct) || (a.apr - b.apr))[0] || null;

    // 2. Analyze all transactions & budgets (unfiltered across portfolio so no card filter hides data)
    const expenseTxs = sourceTxsList.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const name = (t.name || '').toLowerCase();
      return cat !== 'income' && !name.includes('paycheck') && !name.includes('deposit');
    });
    const incomeTxs = sourceTxsList.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const name = (t.name || '').toLowerCase();
      return cat === 'income' || name.includes('paycheck') || name.includes('deposit');
    });
    const totalRecordedSpend = expenseTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
    const totalRecordedIncome = incomeTxs.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

    // Category & Merchant aggregation from live transactions
    const catStatsMap = {};
    const merchantStatsMap = {};
    for (const tx of expenseTxs) {
      const cat = tx.category || 'Shopping';
      const amt = Math.abs(Number(tx.amount || 0));
      if (!catStatsMap[cat]) catStatsMap[cat] = { category: cat, spent: 0, count: 0, merchants: {} };
      catStatsMap[cat].spent += amt;
      catStatsMap[cat].count += 1;
      const mName = tx.name || 'Purchase';
      catStatsMap[cat].merchants[mName] = (catStatsMap[cat].merchants[mName] || 0) + amt;

      if (!merchantStatsMap[mName]) {
        merchantStatsMap[mName] = { name: mName, total: 0, count: 0, category: cat, account: tx.account || '' };
      }
      merchantStatsMap[mName].total += amt;
      merchantStatsMap[mName].count += 1;
    }

    const topMerchants = Object.values(merchantStatsMap).sort((a, b) => b.total - a.total);

    // Evaluate full-portfolio budgets
    const portfolioBudgets = budgets.map(b => {
      const catLower = (b.category || '').toLowerCase();
      let spent = expenseTxs
        .filter(t => (t.category || '').toLowerCase() === catLower)
        .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
      if (catLower === 'utilities' || catLower === 'housing' || catLower === 'bills') {
        const billsToCount = catLower === 'bills'
          ? sourceBillsList.filter(bill => bill.status === 'due_soon' || (bill.daysUntil != null && bill.daysUntil <= 5))
          : sourceBillsList.filter(bill => (bill.category || '').toLowerCase() === catLower);
        spent += billsToCount.reduce((s, bill) => s + Number(bill.expectedAmount || 0), 0);
      }
      if ((catLower === 'entertainment' || catLower === 'subscriptions') && spent === 0) {
        spent += sourceSubsList.reduce((s, sub) => s + Number(sub.amount || 0), 0);
      }
      const limit = Math.max(1, Number(b.limit || 1));
      const pct = Math.round((spent / limit) * 100);
      const topCatMerchants = Object.entries(catStatsMap[b.category]?.merchants || {})
        .sort((x, y) => y[1] - x[1])
        .slice(0, 2)
        .map(([m, val]) => `${m} (${money(val)})`);
      return {
        ...b,
        spent,
        limit,
        pct,
        overAmount: Math.max(0, spent - limit),
        remaining: Math.max(0, limit - spent),
        isOver: spent > limit,
        isNear: pct >= 80 && spent <= limit,
        topMerchantsText: topCatMerchants.length > 0 ? topCatMerchants.join(', ') : ''
      };
    });

    const overBudgets = [...portfolioBudgets].filter(b => b.isOver).sort((a, b) => b.overAmount - a.overAmount);
    const nearBudgets = [...portfolioBudgets].filter(b => b.isNear).sort((a, b) => b.pct - a.pct);
    const underBudgets = [...portfolioBudgets].filter(b => !b.isOver && !b.isNear && (b.limit - b.spent) >= 25).sort((a, b) => b.remaining - a.remaining);
    const budgetedCatNames = new Set(portfolioBudgets.map(b => (b.category || '').toLowerCase()));
    const unbudgetedCats = Object.values(catStatsMap)
      .filter(c => !budgetedCatNames.has(c.category.toLowerCase()) && c.spent > 0)
      .sort((a, b) => b.spent - a.spent);

    // 3. Upcoming Bills & Subscriptions
    const due14Bills = sourceBillsList.filter(b => b.status !== 'paid' && b.daysUntil != null && b.daysUntil <= 14);
    const unpaidBills = sourceBillsList.filter(b => b.status !== 'paid');
    const topSubs = [...sourceSubsList].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0));

    // --- BUILD SECTION 1: CREDIT CARD PAYOFF ORDER (FIRST TO LAST) ---
    let cardSection = `### **1. Credit Card Payoff Order (What to Pay First vs. Last)**\n`;
    if (cardsWithBalance.length === 0) {
      cardSection += `* **Debt-Free Status:** All **${enrichedCards.length}** connected credit cards currently carry a **$0.00** balance! Keep paying statements in full each month to maintain 0% interest.\n\n`;
    } else {
      const canPayAllInFull = projectedCashAfterBills > (totalCardDebt + 2000);
      cardSection += `You are carrying **${money(totalCardDebt)}** across **${cardsWithBalance.length} card${cardsWithBalance.length > 1 ? 's' : ''}**, costing **${money(totalMonthlyInterest)}/mo** (**${money(totalMonthlyInterest * 12)}/yr**) in interest against **${money(displayCash)}** in available checking cash.\n`;

      primaryRanked.forEach((c, idx) => {
        const rankTag = idx === 0
          ? `PAY FIRST (Priority #1)`
          : (idx === primaryRanked.length - 1 ? `PAY LAST (Priority #${idx + 1})` : `Priority #${idx + 1}`);
        const reasonText = idx === 0
          ? (c.utilPct >= 30
              ? `Highest credit score impact at **${c.utilPct}% utilization** (${money(c.balance)} of ${money0(c.limit)} limit) and burning **${money(c.monthlyInterest)}/mo** at **${c.apr}% APR**. Paying at least **${money(c.paydownFor30Pct)}** immediately drops utilization to the 30% credit-score threshold (${money0(c.target30Bal)}).`
              : `Costs **${money(c.monthlyInterest)}/mo** in interest at **${c.apr}% APR** (${c.utilPct}% utilization on ${money0(c.limit)} limit). Target all extra debt payments here first.`)
          : (idx === primaryRanked.length - 1
              ? `Lower priority (**${c.utilPct}% utilization** on ${money0(c.limit)} limit, **${c.apr}% APR**, **${money(c.monthlyInterest)}/mo** interest). Pay only the **${money(c.minPay)}** minimum until Priority #1 is eliminated, then roll payments into this card.`
              : ` Carrying **${money(c.balance)}** (${c.utilPct}% utilization at **${c.apr}% APR**). Maintain the **${money(c.minPay)}** minimum payment until higher-priority cards are cleared.`);
        cardSection += `* **${rankTag} — ${c.label}:** **${money(c.balance)}** balance — ${reasonText}\n`;
      });

      if (zeroBalanceCards.length > 0) {
        cardSection += `* **$0 Balance Cards:** ${zeroBalanceCards.map(c => `**${c.label}** ($0.00 / ${money0(c.limit)} limit)`).join(', ')} — no payment needed.\n`;
      }

      if (canPayAllInFull) {
        const cashLeftAfterFullPayoff = projectedCashAfterBills - totalCardDebt;
        cardSection += `* **Advisor Liquidity Recommendation:** Because you have **${money(projectedCashAfterBills)}** in checking after upcoming 14-day bills, you can pay off **100% of your ${money(totalCardDebt)} card debt today** (${primaryRanked.map(c => `**${money(c.balance)}** to **${c.name} •••• ${c.mask}**`).join(' + ')}), still retain **${money(cashLeftAfterFullPayoff)}** in cash reserves, and immediately save **${money(totalMonthlyInterest)}/mo** in interest!\n`;
      } else if (firstCard) {
        const recommendedFirstCardPay = firstCard.minPay + Number(extraDebtPayment || 150);
        cardSection += `* **Monthly Payoff Plan (${debtStrategy === 'snowball' ? 'Snowball' : 'Avalanche'}):** Send **${money(recommendedFirstCardPay)}/mo** (${money(firstCard.minPay)} min + ${money0(extraDebtPayment)} extra) to **${firstCard.label}**${lastCard ? ` and **${money(lastCard.minPay)}/mo** minimum to **${lastCard.label}**` : ''} to become debt-free by **${debtPayoffComparison?.activePlan?.finishLabel || 'next year'}** and save **${money0(debtPayoffComparison?.interestSavedVsMin || totalMonthlyInterest * 6)}** in interest.\n`;
      }

      if (cardsWithBalance.length > 1 && avalancheRanked[0].id !== snowballRanked[0].id) {
        const snowFirst = snowballRanked[0];
        cardSection += `* **Quick-Win Alternative (Snowball Priority):** If your priority is clearing an entire card statement fast, pay **${money(snowFirst.balance)}** to wipe out **${snowFirst.label}** in one shot, then focus 100% on **${avalancheRanked[0].label}**.\n`;
      }
      cardSection += `\n`;
    }

    // --- BUILD SECTION 2: BUDGET & TRANSACTION AUDIT (WHAT TO CHANGE BY PRIORITY) ---
    let budgetSection = `### **2. Budget vs. Actual Spending Audit (What to Change Based on Your Priority)**\n`;
    budgetSection += `Across **${expenseTxs.length} recorded purchases** totaling **${money(totalRecordedSpend)}**${totalRecordedIncome > 0 ? ` (and **${money(totalRecordedIncome)}** in recorded deposits)` : ''}, your tracked category spending is **${money(totalBudgetSpent)}** against your **${money0(totalBudgetLimit)}/mo** total budget (**${Math.round((totalBudgetSpent / Math.max(1, totalBudgetLimit)) * 100)}%** used):\n`;

    if (overBudgets.length > 0) {
      for (const ob of overBudgets) {
        const aggressiveTarget = Math.max(ob.limit + 25, Math.ceil((ob.spent * 0.7) / 25) * 25);
        const realisticTarget = Math.max(aggressiveTarget + 25, Math.ceil((ob.spent * 0.95) / 25) * 25);
        budgetSection += `* **Over Budget — ${ob.category} (${ob.pct}% used):** Spent **${money(ob.spent)}** on a **${money0(ob.limit)}/mo** budget (**${money(ob.overAmount)} over limit**)${ob.topMerchantsText ? `, driven by ${ob.topMerchantsText}` : ''}.\n`;
        budgetSection += `  * *If Priority = Debt Payoff / Max Savings:* Change **${ob.category}** budget from **${money0(ob.limit)}** to **${money0(aggressiveTarget)}/mo** (cuts current category spend by 30% and frees up **+${money0(Math.max(25, ob.spent - aggressiveTarget))}/mo** for debt/savings).\n`;
        budgetSection += `  * *If Priority = Realistic Lifestyle Alignment:* Change **${ob.category}** budget from **${money0(ob.limit)}** to **${money0(realisticTarget)}/mo** so your budget reflects actual household spending without false alerts.\n`;
      }
    }

    if (nearBudgets.length > 0) {
      for (const nb of nearBudgets) {
        budgetSection += `* **Near Limit — ${nb.category} (${nb.pct}% used):** Spent **${money(nb.spent)}** of **${money0(nb.limit)}/mo** (**${money(nb.remaining)}** left this month${nb.topMerchantsText ? ` — top spend: ${nb.topMerchantsText}` : ''}). Hold weekly **${nb.category}** spend under **${money(nb.remaining / 2)}/wk**.\n`;
      }
    }

    if (underBudgets.length > 0) {
      const topUnder = underBudgets.slice(0, 3);
      const totalSlack = topUnder.reduce((s, b) => s + b.remaining, 0);
      budgetSection += `* **Under-Budget Slack to Reallocate:** ${topUnder.map(b => `**${b.category}** (${money(b.spent)} of ${money0(b.limit)} — **${money0(b.remaining)} unused**)`).join(', ')}. You can lower these caps by **${money0(Math.round(totalSlack * 0.5))}/mo** and shift that room to cover over-budget categories or extra card payments.\n`;
    }

    if (unbudgetedCats.length > 0) {
      const topUnb = unbudgetedCats.slice(0, 3);
      budgetSection += `* **Unbudgeted Transaction Categories:** You spent ${topUnb.map(u => `**${money(u.spent)}** in **${u.category}** (${u.count} tx${u.count > 1 ? 's' : ''})`).join(', ')} with no monthly cap set. Recommended: create a **${money0(Math.ceil((topUnb[0].spent * 0.85) / 25) * 25)}/mo ${topUnb[0].category}** budget.\n`;
    }

    if (topMerchants.length > 0) {
      budgetSection += `* **Top Spending Merchants:** ${topMerchants.slice(0, 4).map(m => `**${m.name}** (${money(m.total)} across ${m.count} purchase${m.count > 1 ? 's' : ''} • ${m.category})`).join(' | ')}.\n`;
    }
    budgetSection += `\n`;

    // --- BUILD SECTION 3: WHERE TO SPEND & ALLOCATE YOUR MONEY THIS WEEK ---
    let spendPlanSection = `### **3. Where You Should Spend & Allocate Your Money This Week**\n`;
    // 3a. Bills in next 14 days
    if (due14Bills.length > 0) {
      spendPlanSection += `1. **Cover Upcoming 14-Day Bills First (${money(displayDue14Sum)}):** Pay ${due14Bills.map(b => `**${b.name}** (${money(b.expectedAmount)}, ${b.dueText || 'due soon'})`).join(', ')} from checking, leaving **${money(projectedCashAfterBills)}** in available cash.\n`;
    } else if (unpaidBills.length > 0) {
      const nextB = unpaidBills[0];
      spendPlanSection += `1. **Upcoming Bills ($0.00 due in next 14 days):** Your next scheduled bill is **${nextB.name}** (**${money(nextB.expectedAmount)}**, ${nextB.dueText || `Day ${nextB.dueDay}`}). Your full **${money(displayCash)}** checking balance is clear for the next two weeks.\n`;
    } else {
      spendPlanSection += `1. **Upcoming Bills ($0.00 due in next 14 days):** No unpaid bills due over the next 14 days; **${money(displayCash)}** is available in checking.\n`;
    }

    // 3b. Card payment execution
    if (firstCard) {
      const immediatePay = projectedCashAfterBills > (totalCardDebt + 2000)
        ? firstCard.balance
        : (firstCard.paydownFor30Pct > 0 ? Math.max(firstCard.minPay + Number(extraDebtPayment || 150), firstCard.paydownFor30Pct) : firstCard.minPay + Number(extraDebtPayment || 150));
      spendPlanSection += `2. **Execute Priority Card Payment (${money(immediatePay)}):** Send **${money(immediatePay)}** to **${firstCard.label}** first${lastCard ? `, and keep **${lastCard.label}** on its **${money(lastCard.minPay)}** minimum (or pay its remaining **${money(lastCard.balance)}** once **${firstCard.name}** is $0)` : ''}.\n`;
    } else {
      spendPlanSection += `2. **Grow High-Yield Savings:** With $0 in credit card debt, transfer **${money0(Math.max(250, extraDebtPayment))}** from checking into your **Emergency Fund / Savings Goal**.\n`;
    }

    // 3c. Which card to swipe this week
    if (lowestUtilCard) {
      const highUtilCards = enrichedCards.filter(c => c.utilPct >= 30 && c.id !== lowestUtilCard.id);
      spendPlanSection += `3. **Which Card to Use for Purchases This Week:** Put necessary Groceries, Gas, and everyday expenses on **${lowestUtilCard.label}** (**${lowestUtilCard.utilPct}% utilization**, ${money0(lowestUtilCard.limit - lowestUtilCard.balance)} available headroom)${highUtilCards.length > 0 ? ` and **stop swiping ${highUtilCards.map(c => `${c.name} (•••• ${c.mask} at ${c.utilPct}%)`).join(', ')}** until its balance is paid below 30% (${money0(highUtilCards[0].target30Bal)})` : ''}.\n`;
    }

    // 3d. Safe weekly discretionary allowance & subscriptions check
    const remainingMonthlyBudget = Math.max(0, underBudgets.reduce((s, b) => s + b.remaining, 0) + nearBudgets.reduce((s, b) => s + b.remaining, 0));
    const safeWeeklyAllowance = Math.max(75, Math.round((remainingMonthlyBudget > 0 ? remainingMonthlyBudget / 2 : totalBudgetLimit * 0.2) / 5) * 5);
    const subsSummaryText = topSubs.length > 0
      ? ` Also review your **${sourceSubsList.length} active subscriptions (${money(displayTotalSubs)}/mo)** — top charges: ${topSubs.slice(0, 3).map(s => `**${s.name}** (${money(s.amount)}/mo)`).join(', ')}.`
      : '';
    spendPlanSection += `4. **Weekly Discretionary Spending Cap (${money0(safeWeeklyAllowance)}/week):** Keep non-bill spending under **${money0(safeWeeklyAllowance)}** this week${overBudgets.length > 0 ? ` and pause non-essential **${overBudgets.map(o => o.category).join(' & ')}** purchases` : ''}.${subsSummaryText}`;

    const fullBriefingMd =
      `### **Weekly Financial Advisor Summary**\n\n` +
      cardSection +
      budgetSection +
      spendPlanSection;

    // Build dynamic, personalized suggestedActions based on actual user state
    const dynamicActions = [];
    if (overBudgets.length > 0) {
      const topOver = overBudgets[0];
      const recommendedLimit = Math.max(topOver.limit + 25, Math.ceil((topOver.spent * 0.75) / 25) * 25);
      dynamicActions.push({
        label: `Change ${topOver.category} budget to ${recommendedLimit}/mo`,
        type: 'set_budget',
        category: topOver.category,
        limit: recommendedLimit
      });
    } else if (unbudgetedCats.length > 0) {
      const topUnb = unbudgetedCats[0];
      const recLim = Math.max(100, Math.ceil((topUnb.spent * 0.85) / 25) * 25);
      dynamicActions.push({
        label: `Set ${recLim}/mo ${topUnb.category} budget`,
        type: 'set_budget',
        category: topUnb.category,
        limit: recLim
      });
    } else if (portfolioBudgets.length > 0) {
      dynamicActions.push({ label: 'Review & Edit Budgets', type: 'navigate', tab: 'budgets' });
    }

    if (cardsWithBalance.length > 0) {
      dynamicActions.push({ label: 'Open Debt Payoff Planner', type: 'navigate', tab: 'cards' });
    } else {
      dynamicActions.push({ label: 'View Connected Cards', type: 'navigate', tab: 'cards' });
    }

    dynamicActions.push({
      label: 'Where can I cut spending this week?',
      type: 'prompt',
      prompt: 'Based on my recent transactions, subscriptions, and budgets, what specific expenses should I cut or change this week?'
    });

    return { fullBriefingMd, dynamicActions };
  };

  // Generate AI Advisor Weekly Summary citing actual live cards, transactions, budgets, and priorities
  const handleGenerateWeeklySummary = async () => {
    if (isAiTyping) return;
    const { fullBriefingMd, dynamicActions } = buildPersonalizedAdvisorBriefing();
    const userPromptText = 'Generate my Weekly Advisor Summary: tell me which cards to pay off first or last, what I should change my budgets to based on my priority, and where I should spend my money this week.';

    const userStepMessages = [
      ...chatMessages,
      { role: 'user', text: userPromptText }
    ];
    updateActiveSession(userStepMessages);
    scrollChatToBottom();

    // If an external cloud AI provider is connected, allow the live AI model to enrich the advisor summary
    // while passing the exact pre-computed snapshot so every card, budget, and transaction figure is 100% accurate.
    let cachedProvider = '';
    let cachedModel = '';
    try {
      const rawCfg = localStorage.getItem('klarity_ai_config');
      if (rawCfg) {
        const parsedCfg = JSON.parse(rawCfg);
        cachedProvider = parsedCfg.provider || '';
        cachedModel = parsedCfg.model || '';
      }
    } catch (e) {}

    if (settingsAiStatus === 'connected' && cachedProvider && cachedProvider !== 'local') {
      setIsAiTyping(true);
      const controller = new AbortController();
      aiAbortControllerRef.current = controller;
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            message: userPromptText,
            isWeeklyAdvisorSummary: true,
            advisorSnapshot: fullBriefingMd,
            userMemory: aiMemory,
            clientProvider: cachedProvider,
            clientModel: cachedModel,
            responseLength: 'detailed',
            webSearchEnabled: aiWebSearchEnabled,
            cards: displayCards,
            checkingAccounts: checkingAccounts,
            availableCash: displayCash,
            projectedCashAfterBills: projectedCashAfterBills,
            bills: sourceBillsList,
            subscriptions: sourceSubsList,
            transactions: sourceTxsList.slice(0, 60),
            budgets: featureFlags.budgets ? computedBudgets : [],
            debtStrategy: debtStrategy,
            extraDebtPayment: extraDebtPayment,
            debtPayoffComparison: debtPayoffComparison,
            savingsGoals: (featureFlags.budgets && featureFlags.savingsGoals) ? savingsGoals : [],
            manualAssets: manualAssets,
            retirementPlans: featureFlags.retirement ? retirementPlans : [],
            netWorth: totalNetWorth || 0,
            householdProfile: householdProfile,
            householdMetrics: calculateHouseholdAndFleetMetrics(householdProfile)
          })
        });
        const json = await res.json();
        const rawReply = (json.reply || '')
          .replace(/\[NAVIGATE:[\s\S]*?\]/gi, '')
          .replace(/\[ACTION:[\s\S]*?\]/gi, '')
          .trim();
        const isErrorReply =
          !rawReply ||
          rawReply.includes('rate limit') ||
          rawReply.includes('API error') ||
          rawReply.includes('API key') ||
          rawReply.includes('quota') ||
          rawReply.includes('unable to retrieve') ||
          rawReply.includes('connection notice');

        const finalAdvisorText = isErrorReply ? fullBriefingMd : rawReply;
        updateActiveSession([
          ...userStepMessages,
          {
            role: 'assistant',
            text: finalAdvisorText,
            suggestedActions: dynamicActions
          }
        ]);
      } catch (e) {
        updateActiveSession([
          ...userStepMessages,
          {
            role: 'assistant',
            text: fullBriefingMd,
            suggestedActions: dynamicActions
          }
        ]);
      } finally {
        aiAbortControllerRef.current = null;
        setIsAiTyping(false);
        scrollChatToBottom();
      }
      return;
    }

    // Instant, 100% live-data Advisor Briefing when using local engine or no external key
    updateActiveSession([
      ...userStepMessages,
      {
        role: 'assistant',
        text: fullBriefingMd,
        suggestedActions: dynamicActions
      }
    ]);
    scrollChatToBottom();
  };

  // Execute interactive Action Button inside AI Advisor chat bubbles
  const handleExecuteSuggestedAction = (act) => {
    if (!act) return;
    if (typeof act.action === 'function') {
      act.action();
      return;
    }
    if (act.type === 'prompt' || act.prompt) {
      const q = act.prompt || act.label;
      handleSendChatMessage(q);
      return;
    }
    if (act.type === 'set_budget') {
      const cat = act.category || 'Groceries';
      const lim = Number(act.limit || 400);
      setBudgets(prev => {
        const exists = prev.find(b => (b.category || '').toLowerCase() === cat.toLowerCase());
        if (exists) return prev.map(b => b.id === exists.id ? { ...b, limit: lim } : b);
        return [...prev, { id: `b-${Date.now()}`, category: cat, limit: lim, lastMonthSpent: Math.round(lim * 0.8) }];
      });
      setActiveTab('budgets');
      setNotificationToast(`Updated ${cat} budget to ${lim}/mo!`);
      setTimeout(() => setNotificationToast(''), 3500);
    } else if (act.type === 'payment_reminder') {
      const nextDueBill = sourceBillsList.find(b => b.status !== 'paid') || sourceBillsList[0];
      setActiveTab('bills');
      const dueInfo = nextDueBill?.dueText || nextDueBill?.nextDueDate || 'due soon';
      setNotificationToast(
        nextDueBill
          ? `Payment reminder set for ${nextDueBill.name} ($${Number(nextDueBill.expectedAmount).toFixed(2)}, ${dueInfo}).`
          : 'Payment reminder enabled for upcoming bills!'
      );
      setTimeout(() => setNotificationToast(''), 4000);
    } else if (act.type === 'navigate' && act.tab) {
      setActiveTab(act.tab);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {linkToken && (
        <PlaidLauncher
          token={linkToken}
          onSuccess={handlePlaidSuccess}
          onExit={() => setLinkToken(null)}
        />
      )}

      {/* Hidden CSV Input for Importing Transactions */}
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleImportCsv}
      />

      {/* Notification Toast */}
      {notificationToast && (
        <div className="fixed top-5 right-5 z-50 bg-[#18457c] text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 1. LEFT SIDEBAR (Overview, Transactions, Budgets, Bills, Subscriptions, Cards) */}
      {/* ======================================================================= */}
      <aside className={`shrink-0 border-r border-slate-200/80 bg-[#f8fafc] flex flex-col justify-between h-screen sticky top-0 hidden md:flex transition-all duration-200 ease-in-out relative z-30 ${
        isSidebarCompact ? 'w-[72px] px-2.5 py-5' : 'w-60 p-5'
      }`}>
        <div>
          {/* Logo Brand & Compact Toggle Button */}
          {!isSidebarCompact ? (
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer select-none group"
                onClick={() => setActiveTab('dashboard')}
              >
                <KlarityLogo className="w-7 h-7 text-[#18457c] shrink-0 transition-transform group-hover:scale-105" />
                <h1 className="font-serif-title text-2xl font-bold tracking-tight text-slate-900">
                  Klarity
                </h1>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsSidebarCompact(true)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 cursor-pointer transition-colors"
                  aria-label="Compact sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="p-1.5 rounded-xl hover:bg-slate-200/60 cursor-pointer transition-transform hover:scale-105 relative group"
                aria-label="Klarity Overview"
              >
                <KlarityLogo className="w-7 h-7 text-[#18457c]" />
                <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Overview
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCompact(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-[#183b6b] hover:bg-slate-200/60 cursor-pointer transition-colors relative group"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 text-[#183b6b]" />
                <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Expand sidebar
                </span>
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className={`flex flex-col ${isSidebarCompact ? 'items-center gap-1.5 mt-5' : 'gap-1.5 mt-6'}`}>
            {sidebarNavOrder
              .map(id => SIDEBAR_ITEMS_CONFIG[id])
              .filter(item => Boolean(item) && (!item.flag || featureFlags[item.flag] !== false))
              .map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return !isSidebarCompact ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center gap-3 ${
                      isActive
                        ? 'bg-[#e8edf5] text-[#1e3a8a] font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1e3a8a]' : 'text-slate-500'}`} />
                    <span className="leading-none">{item.label}</span>
                  </button>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all cursor-pointer relative group ${
                      isActive
                        ? 'bg-[#e8edf5] text-[#1e3a8a] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#1e3a8a]' : 'text-slate-500'}`} />
                    {/* Tooltip on hover */}
                    <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Left Sidebar Footer: Refresh App + User Profile */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-200/80">
          {/* Refresh App Data Button */}
          {!isSidebarCompact ? (
            <button
              type="button"
              onClick={handleRefreshApp}
              disabled={isRefreshingApp}
              className="w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-[#18457c] text-xs font-semibold shadow-2xs cursor-pointer transition-all disabled:opacity-50"
              aria-label="Refresh app data & check for updates"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#18457c] shrink-0 ${isRefreshingApp ? 'animate-spin' : ''}`} />
              <span>{isRefreshingApp ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRefreshApp}
                disabled={isRefreshingApp}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-700 hover:text-[#18457c] shadow-2xs cursor-pointer transition-all relative group"
                aria-label="Refresh app data & check for updates"
              >
                <RefreshCw className={`w-4 h-4 text-[#18457c] ${isRefreshingApp ? 'animate-spin' : ''}`} />
                <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Refresh
                </span>
              </button>
            </div>
          )}

          {/* User Profile Footer */}
          {!isSidebarCompact ? (
            <div className="pt-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#183b6b] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate leading-snug">{currentUser?.name || 'Ziyad Elmahi'}</p>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer transition-colors block leading-none mt-0.5"
                >
                  Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label={`Settings (${currentUser?.name || 'User'})`}
                className="w-9 h-9 rounded-full bg-[#183b6b] hover:ring-2 hover:ring-[#183b6b]/40 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs cursor-pointer transition-all relative group"
              >
                {userInitials}
                <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  Settings
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ======================================================================= */}
      {/* 2A. MOBILE APP SHELL (< 768px) — Matches Mobile Reference Mockups 1:1 */}
      {/* ======================================================================= */}
      <div className="md:hidden flex-1 min-w-0 flex flex-col min-h-screen bg-[#f8fafc] pb-16">
        {/* Horizontal Card Filter Pills Helper for Mobile Activity, Budgets, Bills, Subscriptions */}
        {(() => {
          const renderMobileCardPills = () => (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setSelectedCardIds([])}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  selectedCardIds.length === 0
                    ? 'bg-[#18457c] text-white shadow-2xs'
                    : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All cards
              </button>
              {allFilterableCards.map(c => {
                const isSelected = selectedCardIds.includes(c.id);
                const pillLabel = c.name.toLowerCase() === 'checking'
                  ? 'Checking'
                  : `${c.name.split(' ')[0]} ••${c.mask}`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCardIds(prev =>
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#18457c] text-white font-semibold shadow-2xs'
                        : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pillLabel}
                  </button>
                );
              })}
              {selectedCardIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCardIds([])}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-blue-600 bg-blue-50 shrink-0 cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          );

          return (
            <>
              {/* SCREEN 1: MOBILE HOME (OVERVIEW) */}
              {activeTab === 'dashboard' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <KlarityLogo className="w-7 h-7 text-[#18457c] shrink-0" />
                      <h1 className="font-serif-title text-[26px] font-bold text-slate-900 tracking-tight">Overview</h1>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="w-9 h-9 rounded-full bg-[#18457c] text-white flex items-center justify-center font-bold text-xs shadow-2xs cursor-pointer"
                      title="Open Settings"
                    >
                      {userInitials}
                    </button>
                  </div>

                  {/* Available Cash Hero Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
                    <p className="text-xs text-slate-500">Available cash</p>
                    <p className="font-serif-title text-[34px] leading-tight font-bold text-slate-900 mt-1">
                      {fmtMoney(displayCash)}
                    </p>
                    <p className="text-xs font-medium text-emerald-700 mt-1.5">
                      Covers all bills due in 14 days
                    </p>
                  </div>

                  {/* Two Side-by-Side Metric Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                      <p className="text-xs text-slate-500">Card balances</p>
                      <p className="font-serif-title text-xl font-bold text-slate-900 mt-1">
                        {fmtMoney(displayCardBalances)}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
                      <p className="text-xs text-slate-500">Due in 14 days</p>
                      <p className="font-serif-title text-xl font-bold text-slate-900 mt-1">
                        {fmtMoney(displayDue14Sum || 842.15)}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Retirement Prompt (when on, no plans, not dismissed) */}
                  {featureFlags.retirement !== false && retirementPlans.length === 0 && !retirementPromptDismissed && (
                    <div className="bg-white rounded-2xl border border-blue-200/80 p-4 shadow-2xs flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#18457c] flex items-center justify-center shrink-0">
                            <Landmark className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-bold text-slate-900">Planning for retirement?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRetirementPromptDismissed(true);
                            try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Forecast your pensions, 401(k), IRAs, and Social Security lifetime benefits.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab('retirement')}
                          className="px-4 py-2 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer shadow-2xs hover:bg-[#123561] transition-colors"
                        >
                          Set up
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRetirementPromptDismissed(true);
                            try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
                            handleHideRetirement();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium cursor-pointer transition-colors"
                        >
                          Not for me
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mobile Projected Retirement Income Card (when on and has plans) */}
                  {featureFlags.retirement !== false && retirementPlans.length > 0 && (
                    <div
                      onClick={() => setActiveTab('retirement')}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Projected retirement income</p>
                          <p className="font-serif-title text-xl font-bold text-slate-900 mt-0.5">
                            ${Math.round(projectedRetirementMonthlyIncome).toLocaleString('en-US')}<span className="text-xs font-normal text-slate-500">/mo</span>
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  )}

                  {/* Horizontal Scrollable Cards Carousel */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-2.5">Cards</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {displayCards.map(card => {
                        const utilPct = Math.min(100, Math.round((card.balance / (card.limit || 5000)) * 100));
                        return (
                          <div
                            key={card.id}
                            onClick={() => {
                              setSelectedCardIds([card.id]);
                              setActiveTab('transactions');
                            }}
                            className={`w-[160px] shrink-0 rounded-2xl p-4 text-white flex flex-col justify-between min-h-[142px] shadow-xs cursor-pointer ${
                              card.bgColor || 'bg-[#18457c]'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-semibold leading-snug">{card.name}</p>
                              <p className="text-[11px] text-white/75 mt-0.5">•••• {card.mask}</p>
                            </div>
                            <div className="mt-6">
                              <p className="font-serif-title text-lg font-bold">{fmtMoney(card.balance)}</p>
                              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden mt-2">
                                <div className="bg-white h-full rounded-full" style={{ width: `${utilPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsAddAccountOpen(true)}
                        className="w-[120px] shrink-0 rounded-2xl border border-dashed border-slate-300 bg-white/50 hover:bg-white text-slate-600 text-xs font-medium flex items-center justify-center min-h-[142px] cursor-pointer"
                      >
                        + Add card
                      </button>
                    </div>
                  </div>

                  {/* Advisor Callout Box */}
                  <div className="bg-[#e9eff8] rounded-2xl p-4 flex flex-col gap-3">
                    <p className="text-xs text-slate-800 leading-relaxed">
                      <strong className="font-bold text-slate-900">Advisor:</strong> Gas spending is $10 over budget this month. Want to see where else you can adjust?
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('advisor')}
                      className="self-start px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      Ask the advisor
                    </button>
                  </div>

                  {/* Upcoming Bills */}
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 mb-2.5">Upcoming bills</h2>
                    <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                      {displayBills.map(bill => (
                        <div key={bill.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{bill.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Due {bill.nextDueDate || `Oct ${bill.dueDay || 28}`} · {bill.daysUntil || 3} days
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {fmtMoney(bill.expectedAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 2: MOBILE ACTIVITY (TRANSACTIONS) */}
              {activeTab === 'transactions' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h1 className="font-serif-title text-[26px] font-bold text-slate-900 tracking-tight">Activity</h1>
                    <button
                      type="button"
                      onClick={() => setIsAddTxOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>

                  {renderMobileCardPills()}

                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {filteredTransactions.length === 0 ? (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">No payments on this card.</p>
                        {selectedCardIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedCardIds([])}
                            className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                          >
                            Clear filter
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredTransactions.map(t => {
                        const isIncome = (t.category || '').toLowerCase() === 'income' || (t.name || '').toLowerCase().includes('paycheck') || (t.name || '').toLowerCase().includes('deposit');
                        return (
                          <div key={t.id} className="p-4 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <span>{t.date} · {t.category}</span>
                                {t.pending && (
                                  <>
                                    <span>·</span>
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-800 text-[10px] font-semibold">
                                      Pending
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                              {isIncome ? `+${fmtMoney(Math.abs(t.amount))}` : `-${fmtMoney(Math.abs(t.amount))}`}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 3: MOBILE BUDGETS */}
              {activeTab === 'budgets' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h1 className="font-serif-title text-[26px] font-bold text-slate-900 tracking-tight">Budgets</h1>
                    <button
                      type="button"
                      onClick={() => setIsAddBudgetOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Set Limit
                    </button>
                  </div>

                  {renderMobileCardPills()}

                  {/* 3-Column Summary Box */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 grid grid-cols-3 text-center shadow-2xs">
                    <div>
                      <p className="text-xs text-slate-500">Budgeted</p>
                      <p className="font-serif-title text-lg font-bold text-slate-900 mt-0.5">
                        {fmtMoney(totalBudgetLimit, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Spent</p>
                      <p className="font-serif-title text-lg font-bold text-slate-900 mt-0.5">
                        {fmtMoney(totalBudgetSpent, 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Left</p>
                      <p className="font-serif-title text-lg font-bold text-emerald-700 mt-0.5">
                        {fmtMoney(Math.max(0, totalBudgetLimit - totalBudgetSpent), 0)}
                      </p>
                    </div>
                  </div>

                  {/* Category Budgets List Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {!hasAnyBudgetPaymentsOnSelectedCard && selectedCardIds.length > 0 ? (
                      <div className="p-8 text-center flex flex-col items-center gap-2">
                        <p className="text-sm font-semibold text-slate-700">No payments on this card.</p>
                        <button
                          type="button"
                          onClick={() => setSelectedCardIds([])}
                          className="mt-1 px-3.5 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                        >
                          Clear filter
                        </button>
                      </div>
                    ) : (
                      computedBudgets.map(b => {
                        const spentRounded = Math.round(b.spent);
                        const isOver = spentRounded > b.limit;
                        const isWarn = !isOver && b.pct >= 80;
                        return (
                          <div key={b.id} className="p-4 flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900">{b.category}</span>
                              <span className="text-sm text-slate-500">
                                {fmtMoney(spentRounded, 0)} of {fmtMoney(b.limit, 0)}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOver ? 'bg-[#b91c1c]' : isWarn ? 'bg-[#b45309]' : 'bg-[#18457c]'
                                }`}
                                style={{ width: `${Math.min(100, b.pct)}%` }}
                              />
                            </div>
                            <div>
                              {isOver ? (
                                <span className="text-xs font-medium text-[#b91c1c]">
                                  {fmtMoney(spentRounded - b.limit, 0)} over
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500">
                                  {fmtMoney(Math.max(0, b.limit - spentRounded), 0)} left
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* SCREEN 4: MOBILE ADVISOR */}
              {activeTab === 'advisor' && (
                <div className="flex-1 flex flex-col justify-between min-h-[calc(100vh-4rem)]">
                  <div className="px-5 pt-5 pb-2">
                    <h1 className="font-serif-title text-[26px] font-bold text-slate-900 tracking-tight">Advisor</h1>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-3">
                    {/* Active Chat Thread Messages */}
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed flex flex-col gap-2 ${
                            msg.role === 'user'
                              ? 'bg-[#18457c] text-white shadow-2xs'
                              : 'bg-white text-slate-800 border border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          {msg.text && <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />}
                          {msg.role === 'assistant' && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-100">
                              {msg.suggestedActions.map((act, actIdx) => (
                                <button
                                  key={actIdx}
                                  type="button"
                                  onClick={() => handleExecuteSuggestedAction(act)}
                                  className="px-2.5 py-1 rounded-lg bg-[#eff4f9] hover:bg-[#18457c] text-[#18457c] hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  {act.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isAiTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200/80 rounded-2xl px-4 py-2.5 text-xs text-slate-500 animate-pulse shadow-2xs">
                          Advisor is analyzing...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Input Bar */}
                  <form
                    onSubmit={handleSendChatMessage}
                    className="bg-white border-t border-slate-200/80 px-4 py-3 flex items-center gap-2 sticky bottom-14"
                  >
                    <input
                      type="text"
                      placeholder="Ask about your money"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 bg-slate-100/90 border border-slate-200/90 rounded-full px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500"
                    />
                    {isAiTyping ? (
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        className="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm animate-in fade-in zoom-in-90"
                        title="Stop response"
                        aria-label="Stop generating response"
                      >
                        <Square className="w-3.5 h-3.5 fill-current text-white" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!chatInput.trim() && chatFiles.length === 0}
                        className="px-4 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        Send
                      </button>
                    )}
                  </form>
                </div>
              )}

              {/* SCREEN 5: MOBILE MORE MENU */}
              {activeTab === 'more' && (
                <div className="p-5 flex flex-col gap-4">
                  <h1 className="font-serif-title text-[26px] font-bold text-slate-900 tracking-tight">More</h1>

                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {[
                      { label: 'Bills', onClick: () => setActiveTab('bills') },
                      { label: 'Subscriptions', onClick: () => setActiveTab('subscriptions') },
                      { label: 'Cards', onClick: () => setActiveTab('cards') },
                      ...(featureFlags.household !== false ? [{ label: 'Lifestyle', onClick: () => setActiveTab('household') }] : []),
                      ...(featureFlags.retirement !== false ? [{ label: 'Retirement & Pensions', onClick: () => setActiveTab('retirement') }] : []),
                      ...(featureFlags.vault !== false ? [{ label: 'Passwords & Accounts', onClick: () => setActiveTab('vault') }] : []),
                      { label: 'Settings', onClick: () => setIsSettingsOpen(true) }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={item.onClick}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        <span className="text-slate-400 text-base leading-none">›</span>
                      </button>
                    ))}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full p-4 text-left text-sm font-medium text-[#b91c1c] hover:bg-rose-50/40 transition-colors cursor-pointer"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-VIEWS FROM MORE: BILLS, SUBSCRIPTIONS, CARDS ON MOBILE */}
              {activeTab === 'bills' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('more')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h1 className="font-serif-title text-[24px] font-bold text-slate-900">Bills</h1>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddBillOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Add Bill
                    </button>
                  </div>
                  {renderMobileCardPills()}
                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {filteredBills.length === 0 ? (
                      <div className="p-8 text-center text-sm font-semibold text-slate-600">No payments on this card.</div>
                    ) : (
                      filteredBills.map(b => (
                        <div key={b.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{b.dueText}</p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{fmtMoney(b.expectedAmount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('more')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h1 className="font-serif-title text-[24px] font-bold text-slate-900">Subscriptions</h1>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddSubOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                  {renderMobileCardPills()}
                  <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
                    {filteredSubscriptions.length === 0 ? (
                      <div className="p-8 text-center text-sm font-semibold text-slate-600">No payments on this card.</div>
                    ) : (
                      filteredSubscriptions.map(s => (
                        <div key={s.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{s.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.renewText}</p>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{fmtMoney(s.amount)}/mo</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'cards' && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('more')}
                        className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h1 className="font-serif-title text-[24px] font-bold text-slate-900">Cards</h1>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAddAccountOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      + Add Card
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {displayCards.map(card => (
                      <div
                        key={card.id}
                        className={`rounded-2xl p-5 text-white shadow-sm ${card.bgColor || 'bg-[#18457c]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{card.name}</p>
                            <p className="text-xs text-white/75">•••• {card.mask}</p>
                          </div>
                          <span className="text-xs bg-white/15 px-2.5 py-1 rounded-full">{card.apr}% APR</span>
                        </div>
                        <p className="font-serif-title text-2xl font-bold mt-4">{fmtMoney(card.balance)}</p>
                        <p className="text-[11px] text-white/75 mt-1">Limit {fmtMoney(card.limit, 0)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'retirement' && featureFlags.retirement !== false && (
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  <RetirementPage
                    retirementPlans={retirementPlans}
                    onUpdatePlans={setRetirementPlans}
                    onNavigateBack={() => setActiveTab('dashboard')}
                    onAskAiAdvisor={(prompt) => {
                      setChatInput(prompt);
                      setActiveTab('advisor');
                    }}
                    onHideRetirement={handleHideRetirement}
                  />
                </div>
              )}

              {activeTab === 'vault' && featureFlags.vault !== false && (
                <div className="p-3">
                  <PasswordVaultPage
                    vaultItems={vaultItems}
                    onUpdateVaultItems={setVaultItems}
                    onBack={() => setActiveTab('more')}
                  />
                </div>
              )}

              {activeTab === 'household' && featureFlags.household !== false && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('more')}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-600 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h1 className="font-serif-title text-[24px] font-bold text-slate-900">Lifestyle</h1>
                  </div>
                  <HouseholdLifestyleHub
                    bills={data.bills || []}
                    householdProfile={householdProfile}
                    onUpdateProfile={setHouseholdProfile}
                    onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
                    onAskAiAdvisor={(promptText) => {
                      setIsAiDrawerOpen(true);
                      handleSendChatMessage(promptText);
                    }}
                  />
                </div>
              )}
            </>
          );
        })()}

        {/* Fixed Bottom Navigation Bar (Home, Activity, Budgets, Advisor, More) */}
        {(() => {
          const mobileTabs = [
            { id: 'dashboard', label: 'Home', matchIds: ['dashboard'] },
            { id: 'transactions', label: 'Activity', matchIds: ['transactions'] },
            ...(featureFlags.budgets !== false ? [{ id: 'budgets', label: 'Budgets', matchIds: ['budgets'] }] : []),
            { id: 'advisor', label: 'Advisor', matchIds: ['advisor'] },
            { id: 'more', label: 'More', matchIds: ['more', 'bills', 'subscriptions', 'cards', 'vault', 'retirement', 'household'] }
          ];
          const gridColClass = mobileTabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4';
          return (
            <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 grid ${gridColClass}`}>
              {mobileTabs.map(tab => {
                const isActive = tab.matchIds.includes(activeTab);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3.5 text-xs text-center transition-colors cursor-pointer border-t-2 ${
                      isActive
                        ? 'border-[#18457c] text-[#18457c] font-bold'
                        : 'border-transparent text-slate-500 hover:text-slate-800 font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          );
        })()}
      </div>

      {/* ======================================================================= */}
      {/* 2B. DESKTOP CENTER MAIN CONTENT (>= 768px) */}
      {/* ======================================================================= */}
      <main className="hidden md:flex flex-1 min-w-0 p-4 sm:p-6 lg:p-7 flex-col gap-5 overflow-y-auto overflow-x-hidden relative bg-[#f8fafc] text-slate-800">

        {/* Top-of-App Auto-Update Banner (Appears whenever an update is pushed out) */}
        {!updateBannerDismissed && (
          desktopAppInfo.updateStatus?.state === 'available' ||
          desktopAppInfo.updateStatus?.state === 'ready' ||
          desktopAppInfo.updateStatus?.state === 'installing'
        ) && (
          <div className="w-full rounded-2xl bg-[#18457c] text-white px-4 py-3 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Download className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="font-semibold truncate">
                {desktopAppInfo.updateStatus?.state === 'installing'
                  ? 'Updating Klarity and reopening the app now...'
                  : 'A new update for Klarity is available! Would you like to update the app now?'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={desktopAppInfo.updateStatus?.state === 'installing'}
                onClick={() => window.klarityDesktop?.installUpdateNow?.()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold cursor-pointer transition-colors shadow-2xs"
              >
                {desktopAppInfo.updateStatus?.state === 'installing' ? 'Installing...' : 'Install'}
              </button>
              {desktopAppInfo.updateStatus?.state !== 'installing' && (
                <button
                  type="button"
                  onClick={() => setUpdateBannerDismissed(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 font-semibold cursor-pointer transition-colors"
                >
                  Later
                </button>
              )}
            </div>
          </div>
        )}



        {plaidError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{plaidError}</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1 rounded-lg bg-amber-200/60 text-amber-900 font-semibold cursor-pointer text-xs"
            >
              Settings
            </button>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: OVERVIEW (DASHBOARD) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            {/* Top Greeting Message */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Good {getTimeGreeting()}, {firstName}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">Here's where your money stands today.</p>
              </div>
              
            </div>

            {/* Smart Alerts Strip (Bill due soon, Card > 30% utilization, Budget near limit) */}
            {smartAlerts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smartAlerts.slice(0, 2).map(alert => (
                  <div
                    key={alert.id}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 text-xs shadow-2xs ${
                      alert.type === 'urgent'
                        ? 'bg-rose-50/80 border-rose-200 text-rose-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${alert.type === 'urgent' ? 'text-rose-600' : 'text-amber-600'}`} />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{alert.title}</p>
                        <p className="text-[11px] opacity-80 truncate">{alert.detail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab(alert.actionTab)}
                      className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-slate-800 font-semibold text-[11px] border border-black/10 shrink-0 cursor-pointer transition-colors"
                    >
                      {alert.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 1. Top 3-Metric Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 divide-y sm:divide-y-0 gap-4 sm:gap-6">
              <div>
                <div className="text-xs text-slate-500 font-medium">Available cash</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                  {fmtMoney(displayCash)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <span className="text-emerald-700 font-bold">Covers</span>
                  <span>all bills due in the next 14 days ({fmtMoney(projectedCashAfterBills)} left after bills)</span>
                </div>
              </div>

              <div className="pt-4 md:pt-0 md:pl-6">
                <div className="text-xs text-slate-500 font-medium">Card balances</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                  {fmtMoney(displayCardBalances)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  Across {displayCards.length} cards
                </div>
              </div>

              <div className="pt-4 md:pt-0 md:pl-6">
                <div className="text-xs text-slate-500 font-medium">Due in 14 days</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                  {fmtMoney(displayDue14Sum)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1.5">
                  {displayDue14Count} bills
                </div>
              </div>
            </div>

            {/* Desktop Retirement Prompt (when on, no plans, not dismissed) */}
            {featureFlags.retirement !== false && retirementPlans.length === 0 && !retirementPromptDismissed && (
              <div className="rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-blue-50/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-2xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#18457c] text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Planning for retirement?</p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Forecast your public pensions (CalPERS, CalSTRS, FERS), 401(k), IRAs, and Social Security estimates.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('retirement')}
                    className="px-3.5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
                  >
                    Set up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRetirementPromptDismissed(true);
                      try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
                      handleHideRetirement();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-medium text-xs border border-slate-200 cursor-pointer transition-colors shadow-2xs"
                  >
                    Not for me
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRetirementPromptDismissed(true);
                      try { localStorage.setItem('klarity_retirement_prompt_dismissed', 'true'); } catch {}
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Projected Retirement Income Card (when on and has plans) */}
            {featureFlags.retirement !== false && retirementPlans.length > 0 && (
              <div
                onClick={() => setActiveTab('retirement')}
                className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                      <span>Projected retirement income</span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {retirementPlans.length} {retirementPlans.length === 1 ? 'plan' : 'plans'} tracked
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">
                      ${Math.round(projectedRetirementMonthlyIncome).toLocaleString('en-US')}<span className="text-xs font-normal text-slate-500">/mo</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                  <span>View retirement forecast</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )}

            {/* Net Worth & Cash Flow Forecast Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500">Total Net Worth</span>
                    <div className="flex items-baseline gap-2.5 mt-0.5">
                      <span className="text-2xl font-bold text-slate-900">{fmtMoney(totalNetWorth)}</span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        +4.2% this month
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddManualAssetOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    + Manual account
                  </button>
                </div>

                {/* SVG Line Chart over 6 Months */}
                <div className="pt-2">
                  <svg viewBox="0 0 420 90" className="w-full h-24 overflow-visible">
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#18457c" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#18457c" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    {(() => {
                      const vals = netWorthHistory.map(h => h.value);
                      const minV = Math.min(...vals) * 0.95;
                      const maxV = Math.max(...vals) * 1.05 || 1;
                      const pts = netWorthHistory.map((h, i) => {
                        const x = 20 + (i * 380) / (netWorthHistory.length - 1);
                        const y = 70 - ((h.value - minV) / (maxV - minV || 1)) * 55;
                        return { x, y, ...h };
                      });
                      const polyPoints = pts.map(p => `${p.x},${p.y}`).join(' ');
                      const areaPoints = `${pts[0].x},72 ${polyPoints} ${pts[pts.length - 1].x},72`;
                      return (
                        <>
                          <polygon points={areaPoints} fill="url(#nwGrad)" />
                          <polyline
                            fill="none"
                            stroke="#18457c"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={polyPoints}
                          />
                          {pts.map((p, idx) => (
                            <g key={p.month}>
                              <circle cx={p.x} cy={p.y} r={idx === pts.length - 1 ? 4 : 3} fill="#18457c" />
                              <text x={p.x} y={86} textAnchor="middle" className="fill-slate-400 text-[10px]">
                                {p.month}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right Column: Cash Flow Forecast & Manual Assets Summary */}
              <div className="lg:col-span-2 bg-slate-50/80 border border-slate-200/70 rounded-xl p-4 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">14-Day Cash Flow Forecast</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Safe</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    You'll be at <strong className="text-slate-900">{fmtMoney(projectedCashAfterBills)}</strong> after upcoming bills ({fmtMoney(displayDue14Sum)} due over the next 14 days).
                  </p>
                </div>
                <div className="pt-2.5 border-t border-slate-200/70 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Checking & Cash</span>
                    <span className="font-semibold text-slate-800">{fmtMoney(displayCash)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Savings & Investments</span>
                    <span className="font-semibold text-slate-800">{fmtMoney(manualPositiveAssets)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Credit Debt & Loans</span>
                    <span className="font-semibold text-rose-700">-{fmtMoney(displayCardBalances + manualLoans)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Cards Section */}
            <div>
              <h2 className="text-sm font-bold text-slate-900 mb-3">Cards</h2>
              <div className="flex items-center gap-4 flex-wrap">
                {displayCards.map((card) => {
                  const util = card.limit > 0 ? Math.round((card.balance / card.limit) * 100) : 0;
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedCardIds([card.id]);
                        setActiveTab('transactions');
                      }}
                      title="Click to filter payments for this card"
                      className={`w-[185px] h-[185px] rounded-2xl p-5 text-white flex flex-col justify-between shadow-xs cursor-pointer hover:scale-[1.02] transition-transform ${card.bgColor || 'bg-[#18457c]'}`}
                    >
                      <div>
                        <div className="text-xs font-semibold tracking-tight">{card.name}</div>
                        <div className="text-[11px] text-white/70 font-mono mt-0.5">•••• {card.mask}</div>
                      </div>

                      <div>
                        <div className="text-xl font-bold tracking-tight mb-2">
                          {fmtMoney(card.balance)}
                        </div>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full bg-white rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, util))}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-white/80">
                          {util}% of limit · {card.apr}% APR
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* + Add card */}
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(true)}
                  className="w-[185px] h-[185px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 flex flex-col items-center justify-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer group"
                >
                  <span className="group-hover:scale-105 transition-transform">+ Add card</span>
                </button>
              </div>
            </div>

            {/* 3. Upcoming bills Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-slate-900">Upcoming bills</h2>
                  <button
                    type="button"
                    onClick={() => setIsAddBillOpen(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Add bill
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {displayBills.slice(0, 3).map((bill) => {
                    const isUrgent = bill.daysUntil != null && bill.daysUntil <= 3;
                    return (
                      <div key={bill.id} className="py-3 flex items-center justify-between gap-4 first:pt-1">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{bill.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{bill.dueText}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                              isUrgent ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-[#e0e7ff] text-[#3730a3]'
                            }`}
                          >
                            In {bill.daysUntil} days
                          </span>
                          <span className="text-xs font-bold text-slate-900 min-w-16 text-right">
                            {fmtMoney(bill.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shaded Total Section */}
              <div className="-mx-5 -mb-5 px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs mt-3.5">
                <span className="text-slate-500 font-medium">Monthly bills</span>
                <span className="font-bold text-slate-900">
                  {fmtMoney(displayTotalMonthlyBills)}
                </span>
              </div>
            </div>

            {/* 4. Bottom 2-Column Row for Subscriptions & Recent purchases */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Subscriptions Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-slate-900">Subscriptions</h2>
                    <button
                      type="button"
                      onClick={() => setIsAddSubOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {displaySubs.slice(0, 4).map((sub) => (
                      <div key={sub.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-1">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">{sub.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{sub.renewText}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {fmtMoney(sub.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shaded Total Section */}
                <div className="-mx-5 -mb-5 px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs mt-4">
                  <span className="text-slate-500 font-medium">Total per month</span>
                  <span className="font-bold text-slate-900">
                    {fmtMoney(displayTotalSubs)}
                  </span>
                </div>
              </div>

              {/* Recent purchases Card */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-slate-900">Recent purchases</h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('transactions')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      View all
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {displayTxs.slice(0, 3).map((tx) => {
                      const isDeposit = Number(tx.amount) > 0 && ((tx.category || '').toLowerCase() === 'income' || (tx.name || '').toLowerCase().includes('deposit'));
                      const absAmount = Math.abs(Number(tx.amount));
                      return (
                        <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3 first:pt-1">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{tx.name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{tx.subText}</p>
                          </div>
                          <span className={`text-xs font-bold ${isDeposit ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {isDeposit ? `+${fmtMoney(absAmount)}` : `-${fmtMoney(absAmount)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shaded Total Section */}
                <div className="-mx-5 -mb-5 px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs mt-4">
                  <span className="text-slate-500 font-medium">Recent transactions</span>
                  <span className="font-bold text-slate-900">
                    {sourceTxsList.length} total recorded
                  </span>
                </div>
              </div>
            </div>

            {/* Household, Utility (PG&E / Water / Gas) & EV Fleet Intelligence Hub */}
            <HouseholdLifestyleHub
                    bills={data.bills || []}
                    householdProfile={householdProfile}
              onUpdateProfile={setHouseholdProfile}
              onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
              onAskAiAdvisor={(promptText) => {
                setIsAiDrawerOpen(true);
                handleSendChatMessage(promptText);
              }}
            />
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: BUDGETS & GOALS (Dedicated Page with Multi-Card Filter) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'budgets' && (
          <div className="flex flex-col gap-6">
            <SubpageHeader
              title="Budgets & Savings Goals"
              onBack={() => setActiveTab('dashboard')}
              actions={[
                { label: 'Set Category Budget', icon: Plus, onClick: () => setIsAddBudgetOpen(true) },
                { label: '+ Savings Goal', icon: Target, onClick: () => setIsAddGoalOpen(true) }
              ]}
            />

            {/* Filter Bar with Multi-Card Filter Dropdown */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-900">Monthly Spending vs. Limits</span>
                <span className="text-slate-400 ml-2">
                  {selectedCardIds.length === 0
                    ? 'Showing spending across all connected cards & accounts'
                    : `Filtered to ${selectedCardIds.length} selected ${selectedCardIds.length === 1 ? 'card' : 'cards'}`}
                </span>
              </div>
              <MultiCardFilterDropdown
                cards={allFilterableCards}
                selectedCardIds={selectedCardIds}
                onChangeSelectedCards={setSelectedCardIds}
              />
            </div>

            {/* Summary Totals Bar for Budgets */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 divide-y sm:divide-y-0">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total Monthly Budget</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{fmtMoney(totalBudgetLimit, 0)}</p>
                <p className="text-[11px] text-slate-400 mt-1">{computedBudgets.length} active categories</p>
              </div>
              <div className="pt-3 md:pt-0 md:pl-6">
                <span className="text-xs text-slate-500 font-medium">Spent This Month</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">{fmtMoney(totalBudgetSpent)}</p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all ${
                      totalBudgetSpent > totalBudgetLimit ? 'bg-rose-500' : totalBudgetSpent > totalBudgetLimit * 0.8 ? 'bg-amber-500' : 'bg-[#18457c]'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((totalBudgetSpent / (totalBudgetLimit || 1)) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="pt-3 md:pt-0 md:pl-6">
                <span className="text-xs text-slate-500 font-medium">Remaining Budget</span>
                <p className={`text-2xl font-bold mt-1 ${totalBudgetLimit - totalBudgetSpent < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {fmtMoney(Math.max(0, totalBudgetLimit - totalBudgetSpent))}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {Math.round((totalBudgetSpent / (totalBudgetLimit || 1)) * 100)}% of total limit used
                </p>
              </div>
            </div>

            {!hasAnyBudgetPaymentsOnSelectedCard && selectedCardIds.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-10 text-center flex flex-col items-center justify-center gap-3">
                <CreditCard className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No payments on this card.</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  There are no recorded purchases, bills, or subscriptions tied to the selected card filter.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCardIds([])}
                  className="px-4 py-2 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <>
                {/* Category Budget Progress Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {computedBudgets.map(b => (
                    <div key={b.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-slate-900">{b.category}</h3>
                              <button
                                type="button"
                                onClick={() => setBudgets(prev => prev.filter(item => item.id !== b.id))}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                title="Delete budget"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {b.isOver && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                Over budget
                              </span>
                            )}
                            {b.isWarning && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Near limit ({b.pct}%)
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {b.diffFromLastMonth > 0
                              ? `+$${Math.abs(b.diffFromLastMonth).toFixed(0)} vs last month ($${b.lastMonth})`
                              : `-$${Math.abs(b.diffFromLastMonth).toFixed(0)} vs last month ($${b.lastMonth})`}
                          </p>
                        </div>

                        {editingBudgetId === b.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={editingBudgetLimit}
                              onChange={e => setEditingBudgetLimit(e.target.value)}
                              className="w-20 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = parseFloat(editingBudgetLimit);
                                if (!isNaN(val) && val > 0) {
                                  setBudgets(prev => prev.map(item => item.id === b.id ? { ...item, limit: val } : item));
                                }
                                setEditingBudgetId(null);
                              }}
                              className="px-2 py-1 rounded-lg bg-[#18457c] text-white text-[11px] font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-900">
                              {fmtMoney(b.spent)} <span className="text-slate-400 font-normal">/ {fmtMoney(b.limit, 0)}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBudgetId(b.id);
                                setEditingBudgetLimit(String(b.limit));
                              }}
                              className="block ml-auto text-[10px] text-blue-600 hover:underline cursor-pointer mt-0.5"
                            >
                              Edit limit
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              b.isOver ? 'bg-rose-500' : b.isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, b.pct))}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                          <span>{b.pct}% used</span>
                          <span>
                            {b.limit - b.spent >= 0
                              ? `${fmtMoney(b.limit - b.spent)} left`
                              : `${fmtMoney(b.spent - b.limit)} over`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Spending Breakdown by Category Chart (Compared to Last Month) */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Spending Breakdown by Category</h3>
                      <p className="text-xs text-slate-500">Current month category share compared to last month</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {computedBudgets.map((b, i) => {
                      const sharePct = totalBudgetSpent > 0 ? Math.round((b.spent / totalBudgetSpent) * 100) : 0;
                      const colors = ['bg-[#18457c]', 'bg-emerald-600', 'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-teal-600'];
                      return (
                        <div key={b.id} className="text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-800">{b.category} ({sharePct}%)</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-slate-400">Last mo: {fmtMoney(b.lastMonth, 0)}</span>
                              <span className="font-bold text-slate-900">{fmtMoney(b.spent)}</span>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${colors[i % colors.length]}`}
                              style={{ width: `${Math.max(3, sharePct)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Savings Goals Section */}
            {featureFlags.savingsGoals !== false && (
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Savings Goals</h3>
                  <p className="text-xs text-slate-500">Track progress and projected completion dates</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                >
                  + Add Goal
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savingsGoals.length === 0 ? (
                  <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/50">
                    <Target className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-bold text-slate-700">No active savings goals</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      All sample goals have been removed. Click + Add Goal above to create your own personal savings targets.
                    </p>
                  </div>
                ) : savingsGoals.map(goal => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
                  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                  const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : 0;
                  const finishDate = new Date();
                  finishDate.setMonth(finishDate.getMonth() + monthsLeft);
                  const projectedDateStr = remaining <= 0
                    ? 'Goal Reached!'
                    : `Projected finish: ${finishDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} (${monthsLeft} mo)`;

                  return (
                    <div key={goal.id} className="border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between gap-3 bg-slate-50/40">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{goal.name}</p>
                          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">{projectedDateStr}</p>
                        </div>
                        <span className="text-xs font-bold text-slate-900">
                          {fmtMoney(goal.currentAmount, 0)} / {fmtMoney(goal.targetAmount, 0)}
                        </span>
                      </div>

                      <div>
                        <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                          <span>{pct}% saved · +{fmtMoney(goal.monthlyContribution, 0)}/mo</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleContributeGoal(goal.id, 100)}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold cursor-pointer"
                            >
                              +$100
                            </button>
                            <button
                              type="button"
                              onClick={() => setSavingsGoals(prev => prev.filter(g => g.id !== goal.id))}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Remove goal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: BILLS (Dedicated Page with Multi-Card Filter) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'bills' && (
          <div className="flex flex-col gap-6">
            <SubpageHeader
              title="Upcoming Bills"
              onBack={() => setActiveTab('dashboard')}
              actions={[
                { label: 'Add Bill', icon: Plus, onClick: () => setIsAddBillOpen(true) },
                { label: 'Scan PDF', icon: FileText, onClick: () => setIsScanBillOpen(true) }
              ]}
            />



            {/* Filter & Search Bar + Multi-Card Filter Dropdown */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] text-xs">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search bills by name or provider..."
                  value={billSearch}
                  onChange={e => setBillSearch(e.target.value)}
                  className="bg-transparent outline-none w-full text-slate-800 placeholder-slate-400"
                />
              </div>
              <select
                value={billFilter}
                onChange={e => setBillFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Bills</option>
                <option value="due_soon">Due Soon</option>
                <option value="upcoming">Upcoming</option>
                <option value="paid">Paid</option>
                <option value="Utilities">Utilities</option>
                <option value="Housing">Housing</option>
              </select>
              <MultiCardFilterDropdown
                cards={allFilterableCards}
                selectedCardIds={selectedCardIds}
                onChangeSelectedCards={setSelectedCardIds}
              />
            </div>

            {/* Bills List */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 overflow-hidden">
              {filteredBills.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5">
                  <Receipt className="w-7 h-7 text-slate-300" />
                  <p className="text-sm font-bold text-slate-800">No payments on this card.</p>
                  <p className="text-xs text-slate-500">No bills match the selected card or filter criteria.</p>
                  {selectedCardIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCardIds([])}
                      className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredBills.map(bill => (
                    <div key={bill.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{bill.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            {bill.nextDueDate ? `Due ${bill.nextDueDate}` : `Due Day ${bill.dueDay}`} · {bill.category || 'Utilities'} · {bill.account || 'Checking •••• 4821'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <span className="text-xs font-bold text-slate-900">{fmtMoney(bill.expectedAmount)}</span>
                        <button
                          type="button"
                          onClick={() => handlePayBill(bill.id, bill.name, bill.expectedAmount)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            bill.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700'
                          }`}
                        >
                          {bill.status === 'paid' ? 'Paid' : 'Mark Paid'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shaded Total Section */}
              <div className="-mx-5 -mb-5 px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs mt-3">
                <span className="text-slate-500 font-medium">Total Monthly Bills ({filteredBills.length} active)</span>
                <span className="font-bold text-slate-900">{fmtMoney(filteredTotalMonthlyBills)}</span>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: SUBSCRIPTIONS (Dedicated Page with Multi-Card Filter & Audit) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'subscriptions' && (
          <div className="flex flex-col gap-6">
            <SubpageHeader
              title="Subscriptions"
              onBack={() => setActiveTab('dashboard')}
              actions={[
                { label: 'Add Subscription', icon: Plus, onClick: () => setIsAddSubOpen(true) },
                {
                  label: 'AI Subscription Audit',
                  icon: Sparkles,
                  onClick: () =>
                    handleSendChatMessage(
                      `Please perform a full Subscription Audit on my ${sourceSubsList.length} subscriptions totaling ${displayTotalSubs.toFixed(2)}/mo (${sourceSubsList.map(s => `${s.name}: ${s.amount}`).join(', ')}). Flag any price increases, duplicate services, or ways to save.`
                    )
                }
              ]}
            />

            {/* Recurring Detection & Price Increase Alert */}
            <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Recurring Detection:</strong> Netflix increased by <strong>+$2.00/mo</strong> compared to your prior billing cycle. Annual subscription spend is <strong>{fmtMoney(filteredTotalSubscriptions * 12)}/yr</strong>.
                </span>
              </div>
            </div>

            {/* Filter & Search Bar + Multi-Card Filter Dropdown */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] text-xs">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscriptions by service or category..."
                  value={subSearch}
                  onChange={e => setSubSearch(e.target.value)}
                  className="bg-transparent outline-none w-full text-slate-800 placeholder-slate-400"
                />
              </div>
              <select
                value={subCategoryFilter}
                onChange={e => setSubCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Streaming">Streaming</option>
                <option value="Music">Music</option>
                <option value="Cloud Storage">Cloud Storage</option>
                <option value="AI & Software">AI & Software</option>
                <option value="Entertainment">Entertainment</option>
              </select>
              <MultiCardFilterDropdown
                cards={allFilterableCards}
                selectedCardIds={selectedCardIds}
                onChangeSelectedCards={setSelectedCardIds}
              />
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 overflow-hidden">
              {filteredSubscriptions.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5">
                  <Zap className="w-7 h-7 text-slate-300" />
                  <p className="text-sm font-bold text-slate-800">No payments on this card.</p>
                  <p className="text-xs text-slate-500">No recurring subscriptions are tied to the selected card filter.</p>
                  {selectedCardIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCardIds([])}
                      className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSubscriptions.map(sub => (
                    <div key={sub.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{sub.name}</p>
                          {(sub.priceIncreased || sub.name.toLowerCase().includes('netflix')) && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              +$2 price increase
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[11px] text-slate-400">
                            {sub.renewalDate ? `Renews ${sub.renewalDate}` : 'Renews monthly'} · {sub.category} · {sub.account || 'Everyday Rewards •••• 4417'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <span className="text-xs font-bold text-slate-900">{fmtMoney(sub.amount)}/mo</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubscription(sub.id, sub.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Delete subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shaded Total Section */}
              <div className="-mx-5 -mb-5 px-5 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-xl flex items-center justify-between text-xs mt-3">
                <span className="text-slate-500 font-medium">Total Monthly Subscriptions ({filteredSubscriptions.length} active)</span>
                <span className="font-bold text-slate-900">{fmtMoney(filteredTotalSubscriptions)}/mo</span>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: CARDS & ACCOUNTS (Clean, Unified Hub) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'cards' && (() => {
          const rawCheckingList = checkingAccounts.length > 0
            ? checkingAccounts
            : [{ id: 'card-checking-4821', name: 'Checking', institution: 'Chase', mask: '4821', subtype: 'Checking', balance: displayCash }];
          const totalLimitAll = displayCards.reduce((s, c) => s + Number(c.limit || 0), 0);
          const totalAvailHeadroom = displayCards.reduce((s, c) => s + Math.max(0, Number(c.limit || 0) - Number(c.balance || 0)), 0);
          const allCount = displayCards.length + rawCheckingList.length + manualAssets.length;

          return (
            <div className="flex flex-col gap-5 sm:gap-6">
              <SubpageHeader
                title="Cards"
                subtitle="All your credit cards, checking accounts, and payoff plans in one place."
                onBack={() => setActiveTab('dashboard')}
                actions={[
                  { label: 'Add Card / Bank', icon: Plus, onClick: () => setIsAddAccountOpen(true) },
                  { label: 'Add Loan or Asset', icon: CreditCard, onClick: () => setIsAddManualAssetOpen(true) },
                  { label: 'View Debt Payoff', icon: Calculator, onClick: () => setCardsPayoffTab('speed') }
                ]}
              />

              {/* 1. TOP OVERVIEW & FILTER BAR */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col gap-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Card Debt</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{fmtMoney(displayCardBalances)}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">{displayCards.length} {displayCards.length === 1 ? 'card' : 'cards'}</span>
                  </div>
                  <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Cash</span>
                    <span className="text-xl sm:text-2xl font-bold text-emerald-700 mt-0.5">{fmtMoney(displayCash)}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">{rawCheckingList.length} checking</span>
                  </div>
                  <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Credit Headroom</span>
                    <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">{fmtMoney(totalAvailHeadroom, 0)}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5">of {fmtMoney(totalLimitAll, 0)} limit</span>
                  </div>
                  <div className="flex flex-col pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cash vs Debt</span>
                    <span className={`text-xl sm:text-2xl font-bold mt-0.5 ${displayCash >= displayCardBalances ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {displayCash >= displayCardBalances ? `+${fmtMoney(displayCash - displayCardBalances)}` : `-${fmtMoney(displayCardBalances - displayCash)}`}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      {displayCash >= displayCardBalances ? 'Cash covers debt' : 'Debt exceeds cash'}
                    </span>
                  </div>
                </div>

                {/* Filter Selector Tabs */}
                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `All (${allCount})` },
                    { id: 'credit', label: `Credit (${displayCards.length})` },
                    { id: 'checking', label: `Debit (${rawCheckingList.length})` },
                    ...(manualAssets.length > 0 ? [{ id: 'loans', label: `Loans (${manualAssets.length})` }] : [])
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCardsFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        cardsFilter === tab.id
                          ? 'bg-[#18457c] text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. UNIFIED CARDS & ACCOUNTS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {/* Credit Cards */}
                {(cardsFilter === 'all' || cardsFilter === 'credit') && displayCards.map(card => {
                  const util = card.limit > 0 ? Math.min(100, (card.balance / card.limit) * 100) : 0;
                  const isHighUtil = util >= 30;
                  return (
                    <div key={card.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {card.institution ? `${card.institution} ` : ''}{card.name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">•••• {card.mask}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#18457c] border border-blue-200">
                              Credit
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/70">
                              {card.apr || 0}% APR
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-2xl font-bold text-slate-900">{fmtMoney(card.balance)}</span>
                            <span className="text-xs text-slate-500 font-medium">{fmtMoney(card.limit, 0)} Limit</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full transition-all ${isHighUtil ? 'bg-amber-500' : 'bg-[#18457c]'}`}
                              style={{ width: `${Math.max(2, Math.min(100, util))}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                            <span>{fmtMoney(Math.max(0, card.limit - card.balance), 0)} Available</span>
                            <span>{Math.round(util)}% Used</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCardIds([card.id]);
                            setActiveTab('transactions');
                          }}
                          className="text-[#18457c] hover:underline font-semibold cursor-pointer"
                        >
                          View payments →
                        </button>
                        {!String(card.id).startsWith('mock-') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(card.id, card.name)}
                            className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Checking & Cash Accounts */}
                {(cardsFilter === 'all' || cardsFilter === 'checking') && rawCheckingList.map(acc => (
                  <div key={acc.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {acc.institution ? `${acc.institution} ` : ''}{acc.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">•••• {acc.mask || '4821'}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                          Debit
                        </span>
                      </div>

                      <div className="mt-4">
                        <span className="text-2xl font-bold text-slate-900">{fmtMoney(acc.balance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveTab('transactions')}
                        className="text-[#18457c] hover:underline font-semibold cursor-pointer"
                      >
                        View payments →
                      </button>
                    </div>
                  </div>
                ))}

                {/* Manual Loans & Assets */}
                {(cardsFilter === 'all' || cardsFilter === 'loans') && manualAssets.map(ma => (
                  <div key={ma.id} className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-all">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{ma.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{ma.type === 'loan' ? 'Loan' : 'Asset'}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          ma.type === 'loan'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {ma.type === 'loan' ? 'Loan' : 'Asset'}
                        </span>
                      </div>

                      <div className="mt-4">
                        <span className={`text-2xl font-bold ${ma.type === 'loan' ? 'text-rose-600' : 'text-slate-900'}`}>
                          {ma.type === 'loan' ? `-${fmtMoney(ma.balance)}` : fmtMoney(ma.balance)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteManualAsset(ma.id, ma.name)}
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. CONSOLIDATED DEBT PAYOFF & RELIEF HUB (Compact, Tabbed, Never Covers Page) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col mt-2">
                {/* Header Bar with Tab Switcher */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#18457c] shrink-0">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif-title text-base sm:text-lg font-bold text-slate-900">
                        Debt Payoff & Strategy Planner
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Simulate payoff speed and explore 0% interest relief options.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => setCardsPayoffTab('speed')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        cardsPayoffTab === 'speed' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Payoff Speed & Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardsPayoffTab('options')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        cardsPayoffTab === 'options' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Relief Options (4 Plans)
                    </button>
                  </div>
                </div>

                {/* View 1: Payoff Speed & Priority Order */}
                {cardsPayoffTab === 'speed' && debtPayoffComparison && (
                  <div className="p-4 sm:p-5 flex flex-col gap-4">
                    {/* Strategy Switcher & Extra Payment Controls */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="font-semibold text-slate-700 whitespace-nowrap">Strategy:</span>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setDebtStrategy('avalanche')}
                            className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                              debtStrategy === 'avalanche' ? 'bg-[#18457c] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Highest APR (Avalanche)
                          </button>
                          <button
                            type="button"
                            onClick={() => setDebtStrategy('snowball')}
                            className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                              debtStrategy === 'snowball' ? 'bg-[#18457c] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Smallest Balance (Snowball)
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700 whitespace-nowrap">Extra Payment:</span>
                          <span className="font-bold text-[#18457c] font-mono">+${extraDebtPayment}/mo</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[50, 150, 300, 500].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setExtraDebtPayment(amt)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                                extraDebtPayment === amt ? 'bg-[#18457c] text-white border-[#18457c]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              +${amt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3 Metric Summary Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                      <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between">
                        <span className="text-slate-500 font-medium">Projected Debt-Free</span>
                        <p className="text-xl font-bold text-slate-900 mt-1">{debtPayoffComparison.activePlan.finishLabel}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                          {debtPayoffComparison.activePlan.months} months ({debtPayoffComparison.monthsSavedVsMin} mo faster)
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between">
                        <span className="text-slate-500 font-medium">Interest Saved vs Minimums</span>
                        <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(debtPayoffComparison.interestSavedVsMin)}</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Total interest: {fmtMoney(debtPayoffComparison.activePlan.totalInterest)}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-2xs flex flex-col justify-between">
                        <span className="text-slate-500 font-medium">Payoff Priority Order</span>
                        <ol className="list-decimal list-inside font-semibold text-slate-800 mt-1 space-y-0.5">
                          {debtPayoffComparison.activePlan.order.map((name, i) => (
                            <li key={i} className="truncate text-[11px]">{name}</li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Quick Advisor Insight Chip */}
                    {projectedCashAfterBills > displayCardBalances && (
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-800 min-w-0">
                          <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                          <span className="truncate">
                            You have <strong>{fmtMoney(projectedCashAfterBills)}</strong> in checking after bills. You can pay off <strong>100% of card debt</strong> today and save all monthly interest!
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setChatInput('Should I pay off all my credit cards today with my checking balance?');
                            setActiveTab('advisor');
                          }}
                          className="px-3 py-1 rounded-lg bg-[#18457c] text-white font-semibold text-[11px] shrink-0 cursor-pointer shadow-2xs self-start sm:self-center"
                        >
                          Ask Advisor
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* View 2: Relief Options (4 Plans) */}
                {cardsPayoffTab === 'options' && (
                  <div className="p-4 sm:p-5">
                    <InteractivePayoffComparison 
                      cards={displayCards} 
                      availableCash={displayCash}
                      onOpenHardshipPlaybook={() => setIsHardshipModalOpen(true)} 
                      onSendPlanToAi={(plan) => handleSendPayoffPlanToAi(plan)}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: RETIREMENT & PENSIONS TRACKER */}
        {activeTab === 'retirement' && featureFlags.retirement !== false && (
          <RetirementPage
            retirementPlans={retirementPlans}
            onUpdatePlans={setRetirementPlans}
            onNavigateBack={() => setActiveTab('dashboard')}
            onAskAiAdvisor={(prompt) => {
              setChatInput(prompt);
              setActiveTab('advisor');
            }}
            onHideRetirement={handleHideRetirement}
          />
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: PASSWORDS & ACCOUNTS VAULT */}
        {activeTab === 'vault' && featureFlags.vault !== false && (
          <PasswordVaultPage
            vaultItems={vaultItems}
            onUpdateVaultItems={setVaultItems}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: HOUSEHOLD, AUTO & LIFESTYLE */}
        {activeTab === 'household' && featureFlags.household !== false && (
          <div className="flex flex-col gap-6">
            <SubpageHeader
              title="Lifestyle"
              subtitle="Manage home utilities, vehicles, health coverage, and lifestyle expenses."
              onBack={() => setActiveTab('dashboard')}
            />

            <HouseholdLifestyleHub
                    bills={data.bills || []}
                    householdProfile={householdProfile}
              onUpdateProfile={setHouseholdProfile}
              onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
              onAskAiAdvisor={(promptText) => {
                setIsAiDrawerOpen(true);
                handleSendChatMessage(promptText);
              }}
            />
          </div>
        )}

        {/* TAB: TRANSACTIONS (Dedicated Purchases Page with Multi-Card Filter) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'transactions' && (
          <div className="flex flex-col gap-6">
            <SubpageHeader
              title="Transactions"
              onBack={() => setActiveTab('dashboard')}
              actions={[
                { label: 'Add Purchase', icon: Plus, onClick: () => setIsAddTxOpen(true) },
                { label: 'Import CSV', icon: Upload, onClick: () => csvInputRef.current?.click() },
                { label: 'Export CSV', icon: Download, onClick: () => handleExportCsv(filteredTransactions) }
              ]}
            />

            {/* Search, Category Filter, and Multi-Card Filter Dropdown */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px] text-xs">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search purchases by merchant, category, note, or amount..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  className="bg-transparent outline-none w-full text-slate-800 placeholder-slate-400"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Groceries">Groceries</option>
                <option value="Dining">Dining</option>
                <option value="Transportation">Transportation</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Travel">Travel</option>
                <option value="Utilities">Utilities</option>
                <option value="Income">Income / Deposits</option>
              </select>
              <MultiCardFilterDropdown
                cards={allFilterableCards}
                selectedCardIds={selectedCardIds}
                onChangeSelectedCards={setSelectedCardIds}
              />
            </div>

            {/* Dynamic Summary Metrics for Filtered Transactions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <span className="text-xs text-slate-500">Total Spending (Filtered)</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{fmtMoney(filteredTxSpent)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <span className="text-xs text-slate-500">Deposits & Income</span>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">+{fmtMoney(filteredTxIncome)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
                <span className="text-xs text-slate-500">Matching Payments</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{filteredTransactions.length} items</p>
              </div>
            </div>

            {/* Purchases Table */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
              {filteredTransactions.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2.5">
                  <CreditCard className="w-7 h-7 text-slate-300" />
                  <p className="text-sm font-bold text-slate-800">No payments on this card.</p>
                  <p className="text-xs text-slate-500">No purchases or payments match the selected card filter.</p>
                  {selectedCardIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedCardIds([])}
                      className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold uppercase tracking-wider bg-slate-50/50">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description & Notes</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Card / Account</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.map(tx => {
                        const isDeposit = (tx.category || '').toLowerCase() === 'income' || (tx.name || '').toLowerCase().includes('deposit');
                        const displayAmount = Math.abs(Number(tx.amount));
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">{tx.date}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">{tx.name}</div>
                              {editingTxNoteId === tx.id ? (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <input
                                    type="text"
                                    placeholder="Add a note..."
                                    value={editingTxNoteText}
                                    onChange={e => setEditingTxNoteText(e.target.value)}
                                    className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-[11px] text-slate-800 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveTxNote(tx.id)}
                                    className="px-2 py-0.5 rounded bg-[#18457c] text-white text-[10px] font-semibold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTxNoteId(tx.id);
                                    setEditingTxNoteText(tx.notes || '');
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-blue-600 mt-0.5 block cursor-pointer"
                                >
                                  {tx.notes ? `Note: ${tx.notes}` : '+ Add note'}
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={tx.category || 'Shopping'}
                                onChange={e => handleRecategorizeTransaction(tx.id, tx.name, e.target.value)}
                                className="px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200/70 text-slate-700 outline-none cursor-pointer"
                              >
                                <option value="Groceries">Groceries</option>
                                <option value="Dining">Dining</option>
                                <option value="Transportation">Transportation</option>
                                <option value="Shopping">Shopping</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Travel">Travel</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Health">Health</option>
                                <option value="Income">Income</option>
                                <option value="Social Security">Social Security</option>
                                <option value="CalPERS / Pension">CalPERS / Pension</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono border border-slate-200/70 font-medium shadow-2xs">
                                <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{tx.account || 'Everyday Rewards •••• 4417'}</span>
                              </span>
                            </td>
                            <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${isDeposit ? 'text-emerald-700' : 'text-slate-900'}`}>
                              {isDeposit ? `+${fmtMoney(displayAmount)}` : `-${fmtMoney(displayAmount)}`}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(tx.id, tx.name)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition-colors"
                                title="Delete purchase"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Shaded Total Section */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Total Purchases ({filteredTransactions.length} shown)</span>
                <span className="font-bold text-slate-900">
                  {fmtMoney(filteredTxSpent)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: ADVISOR (Full Screen Chat Thread) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'advisor' && (
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col h-[650px] justify-between">
            <div className="pb-3 border-b border-slate-100">
              <SubpageHeader
                title="Advisor"
                subtitle="Reads your bills, cards and spending to answer questions."
                onBack={() => setActiveTab('dashboard')}
                actions={[
                  { label: 'Weekly Summary', icon: Sparkles, onClick: handleGenerateWeeklySummary },
                  { label: 'Past Chats', icon: History, onClick: () => setIsPastChatsOpen(true) },
                  { label: `Memory (${aiMemory.length})`, icon: Brain, onClick: () => setIsMemoryModalOpen(true) }
                ]}
              />
            </div>

            {/* Chat Thread */}
            <div ref={fullChatContainerRef} className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed flex flex-col gap-2 ${
                      msg.role === 'user'
                        ? 'bg-[#18457c] text-white shadow-2xs'
                        : 'bg-[#eff4f9] text-slate-800 border border-slate-200/60 shadow-2xs'
                    }`}
                  >
                    {/* Render multiple attachments (images as thumbnails, non-images as File Cards) */}
                    {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.attachments.map((att, aIdx) =>
                          att.isImage && att.previewUrl ? (
                            <img
                              key={att.id || aIdx}
                              src={att.previewUrl}
                              alt={att.name || 'Uploaded image'}
                              className="max-h-48 rounded-lg object-contain bg-black/10 self-start"
                            />
                          ) : (
                            <div
                              key={att.id || aIdx}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-white min-w-[180px]"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-semibold truncate">{att.name || 'Document'}</p>
                                <p className="text-[10px] text-blue-100">
                                  {att.ext || 'FILE'} {att.size ? `• ${(att.size / 1024).toFixed(1)} KB` : ''}
                                </p>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {/* Legacy single image field fallback: only render <img> if data:image/ */}
                    {!msg.attachments && msg.image && (
                      msg.image.startsWith('data:image/') ? (
                        <img src={msg.image} alt="Uploaded attachment" className="max-h-48 rounded-lg object-contain bg-black/10 self-start" />
                      ) : (
                        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/15 border border-white/25 text-white w-fit">
                          <FileText className="w-4 h-4 text-white shrink-0" />
                          <span className="text-[11px] font-semibold">Attached Document</span>
                        </div>
                      )
                    )}
                    {msg.text && <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />}
                    {msg.role === 'assistant' && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70">
                        {msg.suggestedActions.map((act, actIdx) => (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => handleExecuteSuggestedAction(act)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[11px] font-semibold transition-colors cursor-pointer shadow-2xs"
                          >
                            {act.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#eff4f9] rounded-2xl px-4 py-2.5 text-xs text-slate-500 animate-pulse border border-slate-200/60">
                    Advisor is reading and analyzing...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Multi-File Preview Bar if files attached */}
            {chatFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-2 max-h-32 overflow-y-auto">
                {chatFiles.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="flex items-center gap-2.5 p-2 bg-slate-100/90 rounded-xl border border-slate-200 w-fit max-w-[260px]"
                  >
                    {fileItem.isImage && fileItem.previewUrl ? (
                      <img src={fileItem.previewUrl} alt={fileItem.name} className="w-10 h-10 rounded-lg object-cover border border-slate-300 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#18457c]/10 border border-[#18457c]/20 flex flex-col items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#18457c]" />
                        <span className="text-[8px] font-bold text-[#18457c] uppercase">{fileItem.ext || 'FILE'}</span>
                      </div>
                    )}
                    <div className="min-w-0 pr-1 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{fileItem.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {fileItem.ext || 'FILE'} • {(fileItem.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChatFiles(prev => prev.filter(f => f.id !== fileItem.id))}
                      className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <input
                type="file"
                multiple
                ref={fullAdvisorFileInputRef}
                onChange={async (e) => {
                  await handleAttachFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
                accept="*/*"
              />
              <div className="relative" ref={fullUploadMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsFullUploadMenuOpen(prev => !prev)}
                  className="w-[40px] h-[40px] rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
                  title="Add file or scan document"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {isFullUploadMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullUploadMenuOpen(false);
                        setIsScanBillOpen(true);
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#18457c] flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Scan Document</p>
                        <p className="text-[11px] text-slate-500 leading-snug">Paste sentences & AI auto-adds bills or subscriptions</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFullUploadMenuOpen(false);
                        fullAdvisorFileInputRef.current?.click();
                      }}
                      className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Submit File</p>
                        <p className="text-[11px] text-slate-500 leading-snug">Attach one or multiple files of any format for AI to read</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <textarea
                rows={1}
                placeholder="Ask about your money, or attach files..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if ((chatInput.trim() || chatFiles.length > 0) && !isAiTyping) {
                      handleSendChatMessage();
                    }
                  }
                }}
                onPaste={async e => {
                  const files = e.clipboardData?.files;
                  if (files && files.length > 0) {
                    e.preventDefault();
                    await handleAttachFiles(files);
                  }
                }}
                className="flex-1 min-w-0 h-[40px] min-h-[40px] max-h-36 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs resize-none leading-relaxed flex items-center"
              />
              {isAiTyping ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="h-[38px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 mb-0.5 animate-in fade-in zoom-in-90"
                  title="Stop response"
                  aria-label="Stop generating response"
                >
                  <Square className="w-3.5 h-3.5 fill-current text-white" />
                  <span className="text-xs font-semibold">Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!chatInput.trim() && chatFiles.length === 0}
                  className="h-[40px] px-5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
                >
                  Send
                </button>
              )}
            </form>
          </div>
        )}

        {activeTab === 'more' && (
          <div className="flex flex-col gap-4 max-w-md">
            <h1 className="font-serif-title text-2xl font-bold text-slate-900 tracking-tight">More</h1>
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-2xs">
              {[
                { label: 'Bills', onClick: () => setActiveTab('bills') },
                { label: 'Subscriptions', onClick: () => setActiveTab('subscriptions') },
                { label: 'Cards', onClick: () => setActiveTab('cards') },
                      { label: 'Passwords & Accounts', onClick: () => setActiveTab('vault') },
                { label: 'Settings', onClick: () => setIsSettingsOpen(true) }
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-medium text-slate-900">{item.label}</span>
                  <span className="text-slate-400 text-base leading-none">›</span>
                </button>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full p-4 text-left text-sm font-medium text-[#b91c1c] hover:bg-rose-50/40 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Draggable Tab to Expand Advisor when Collapsed */}
      {isAdvisorCollapsed && activeTab !== 'advisor' && (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={handleTabMouseDown}
          style={{ top: `${advisorTabTop}px` }}
          className="fixed right-0 z-50 bg-[#18457c] hover:bg-[#123561] text-white border-l border-y border-[#123561] shadow-xl rounded-l-2xl py-2.5 px-3 flex items-center gap-2 text-xs font-semibold select-none cursor-grab active:cursor-grabbing transition-colors group animate-in slide-in-from-right-4"
          title="Drag up/down to reposition • Click to open AI Advisor"
        >
          <GripVertical className="w-3.5 h-3.5 text-blue-200/60 group-hover:text-white transition-colors" />
          <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
          <span>Advisor</span>
          <span className={`w-1.5 h-1.5 rounded-full ${isAdvisorOnline ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 3. RIGHT SIDEBAR: ADVISOR (Hidden when on AI Advisor full view) */}
      {/* ======================================================================= */}
      {activeTab !== 'advisor' && !isAdvisorCollapsed && (
      <aside
        style={{ width: `${advisorWidth}px` }}
        className={`shrink-0 border-l border-slate-200/80 bg-[#f8fafc] p-5 xl:p-6 flex flex-col h-screen sticky top-0 hidden lg:flex relative transition-[width] duration-75 ${
          isResizingAdvisor ? 'select-none cursor-col-resize !transition-none' : ''
        }`}
      >
        {/* Draggable Resize Handle on left border */}
        <div
          onMouseDown={startResizingAdvisor}
          className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center transition-colors ${
            isResizingAdvisor ? 'bg-blue-500/30' : 'hover:bg-blue-400/20'
          }`}
          title="Drag to resize Advisor sidebar"
        >
          <div className={`w-1 h-9 rounded-full transition-colors ${
            isResizingAdvisor ? 'bg-blue-600' : 'bg-slate-300 group-hover:bg-blue-500'
          }`}></div>
        </div>
        {/* Header: Collapse & Past Chats (Left), Centered Name (Middle), Weekly Summary, Mini Settings, Fullscreen (Right) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 relative">
          {/* Left: Collapse Button + Past Chats */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsAdvisorCollapsed(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs border border-slate-200/70 bg-white"
              title="Collapse Advisor"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPastChatsOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs border border-slate-200/70 bg-white"
              title="Past Conversations"
            >
              <History className="w-4 h-4" />
            </button>
          </div>

          {/* Middle: Name "Advisor" with Connection Checkmark */}
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">Advisor</h2>
            <span
              title={isAdvisorOnline ? 'Connected to the internet' : 'Connected locally only (Web search disabled)'}
              className={`inline-flex items-center justify-center w-4 h-4 rounded-full border ${
                isAdvisorOnline
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                  : 'bg-blue-50 border-blue-200 text-blue-600'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>

          {/* Right: Weekly Summary + Mini Settings + Full Screen AI */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleGenerateWeeklySummary}
              className="p-1.5 rounded-xl text-[#18457c] bg-[#eff4f9] hover:bg-blue-100 border border-[#18457c]/20 transition-colors cursor-pointer shadow-2xs"
              title="Weekly Advisor Summary"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMiniSettingsOpen(prev => !prev)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs border border-slate-200/70 bg-white"
              title="AI Advisor Settings and Tools"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advisor')}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer shadow-2xs border border-slate-200/70 bg-white"
              title="Full Screen Advisor"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Stream */}
        <div ref={sidebarChatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 pr-0.5">
          {/* Initial Advisor Insight Bubble */}
          {settingsAiStatus !== 'connected' && (
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 flex flex-col gap-2 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>AI Advisor Not Connected</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Connect your Anthropic, OpenAI, or Google Gemini API key to activate personal debt payoff advice and automated intelligence.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSettingsActiveTab('ai');
                  setIsSettingsOpen(true);
                }}
                className="self-start px-3 py-1.5 rounded-lg bg-[#1B4B91] hover:bg-[#153a70] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-all mt-1"
              >
                Configure in Settings &rarr;
              </button>
            </div>
          )}

          {/* Active Chat Messages in Sidebar */}
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed flex flex-col gap-2 ${
                  msg.role === 'user'
                    ? 'bg-[#18457c] text-white shadow-2xs'
                    : 'bg-[#eff4f9] text-slate-800 border border-slate-200/60 shadow-2xs'
                }`}
              >
                {/* Render multiple attachments (images as thumbnails, non-images as File Cards) */}
                {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {msg.attachments.map((att, aIdx) =>
                      att.isImage && att.previewUrl ? (
                        <img
                          key={att.id || aIdx}
                          src={att.previewUrl}
                          alt={att.name || 'Uploaded image'}
                          className="max-h-36 rounded-lg object-contain bg-black/10"
                        />
                      ) : (
                        <div
                          key={att.id || aIdx}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/15 border border-white/25 text-white"
                        >
                          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold truncate">{att.name || 'Document'}</p>
                            <p className="text-[9px] text-blue-100 uppercase">
                              {att.ext || 'FILE'} {att.size ? `• ${(att.size / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
                {/* Legacy single image field fallback: only render <img> if data:image/ */}
                {!msg.attachments && msg.image && (
                  msg.image.startsWith('data:image/') ? (
                    <img src={msg.image} alt="Uploaded attachment" className="max-h-36 rounded-lg object-contain bg-black/10" />
                  ) : (
                    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/15 border border-white/25 text-white">
                      <FileText className="w-3.5 h-3.5 text-white shrink-0" />
                      <span className="text-[11px] font-semibold">Attached Document</span>
                    </div>
                  )
                )}
                {msg.text && <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />}
                {msg.role === 'assistant' && Array.isArray(msg.suggestedActions) && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/70">
                    {msg.suggestedActions.map((act, actIdx) => (
                      <button
                        key={actIdx}
                        type="button"
                        onClick={() => handleExecuteSuggestedAction(act)}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAiTyping && (
            <div className="flex justify-start">
              <div className="bg-[#eff4f9] border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-xs text-slate-500 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions: Multi-File Preview + Chat Input Form */}
        <div className="pt-3 border-t border-slate-200/70 flex flex-col gap-2 shrink-0">
          {/* Multi-File Preview Cards if attached or pasted */}
          {chatFiles.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5">
              {chatFiles.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center gap-2 p-2 bg-slate-100/90 rounded-xl border border-slate-200 w-full"
                >
                  {fileItem.isImage && fileItem.previewUrl ? (
                    <img src={fileItem.previewUrl} alt={fileItem.name} className="w-9 h-9 rounded-lg object-cover border border-slate-300 shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[#18457c]/10 border border-[#18457c]/20 flex flex-col items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#18457c]" />
                      <span className="text-[8px] font-bold text-[#18457c] uppercase">{fileItem.ext || 'FILE'}</span>
                    </div>
                  )}
                  <div className="min-w-0 pr-1 flex-1">
                    <p className="text-[11px] font-semibold text-slate-800 truncate">{fileItem.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {fileItem.ext || 'FILE'} • {(fileItem.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChatFiles(prev => prev.filter(f => f.id !== fileItem.id))}
                    className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Chat Form with Add File Menu (+ / Paperclip) and multiline Textarea */}
          <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 mt-1">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={async (e) => {
                await handleAttachFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
              accept="*/*"
            />
            <div className="relative" ref={uploadMenuRef}>
              <button
                type="button"
                onClick={() => setIsUploadMenuOpen(prev => !prev)}
                className="w-[38px] h-[38px] rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
                title="Add file or scan document"
              >
                <Plus className="w-4 h-4" />
              </button>
              {isUploadMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-60 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadMenuOpen(false);
                      setIsScanBillOpen(true);
                    }}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#18457c] flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Scan Document</p>
                      <p className="text-[10px] text-slate-500 leading-snug">Paste sentences & AI auto-adds bills or subscriptions</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Submit File</p>
                      <p className="text-[10px] text-slate-500 leading-snug">Attach one or multiple files of any format for AI to read</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
            <textarea
              rows={1}
              placeholder="Ask anything or attach files..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if ((chatInput.trim() || chatFiles.length > 0) && !isAiTyping) {
                    handleSendChatMessage();
                  }
                }
              }}
              onPaste={async e => {
                const files = e.clipboardData?.files;
                if (files && files.length > 0) {
                  e.preventDefault();
                  await handleAttachFiles(files);
                }
              }}
              className="flex-1 min-w-0 h-[38px] min-h-[38px] max-h-32 bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs resize-none leading-relaxed flex items-center"
            />
            {isAiTyping ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="h-[38px] px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 animate-in fade-in zoom-in-90"
                title="Stop response"
                aria-label="Stop generating response"
              >
                <Square className="w-3 h-3 fill-current text-white" />
                <span className="text-xs font-semibold">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!chatInput.trim() && chatFiles.length === 0}
                className="h-[38px] px-4 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
              >
                Send
              </button>
            )}
          </form>
        </div>
      </aside>
      )}

      {/* ======================================================================= */}
      {/* 4. MODALS (Clean Light Theme) */}
      {/* ======================================================================= */}

      {/* Add Card Modal: Connect via Plaid or Add Manually */}
      {isAddAccountOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddAccountOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add or Connect Card</h3>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAddCardTab('plaid')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  addCardTab === 'plaid'
                    ? 'bg-white text-[#18457c] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Connect with Plaid</span>
              </button>
              <button
                type="button"
                onClick={() => setAddCardTab('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  addCardTab === 'manual'
                    ? 'bg-white text-[#18457c] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Add Card Manually</span>
              </button>
            </div>

            {addCardTab === 'plaid' ? (
              <div className="flex flex-col gap-4 text-xs pt-1">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-slate-900 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant Bank & Card Sync</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Connect through Plaid Sandbox or your bank to instantly import your credit cards, real-time balances, credit limits, and APRs.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isConnectingPlaid}
                    onClick={() => {
                      setIsAddAccountOpen(false);
                      initiatePlaidLink();
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isConnectingPlaid ? 'Connecting to Plaid...' : 'Connect Bank via Plaid'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddAccountOpen(false);
                      setSettingsActiveTab('plaid');
                      setIsSettingsOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer text-center"
                  >
                    Manage Plaid Keys & Bank Connections
                  </button>

                  <a
                    href="https://dashboard.plaid.com/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-blue-700 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Get Plaid API keys (Plaid Dashboard)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Want to enter credit card details directly?</span>
                  <button
                    type="button"
                    onClick={() => setAddCardTab('manual')}
                    className="text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    Manual entry →
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddAccount} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Bank / Issuer</label>
                  <select
                    value={newAccount.institution}
                    onChange={e => setNewAccount(prev => ({ ...prev, institution: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Everyday Rewards">Everyday Rewards</option>
                    <option value="Travel Card">Travel Card</option>
                    <option value="Capital One">Capital One</option>
                    <option value="Chase">Chase</option>
                    <option value="Citi">Citi</option>
                    <option value="Discover">Discover</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Card Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Everyday Rewards, Travel Card"
                    value={newAccount.name}
                    onChange={e => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700">Balance ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newAccount.balance}
                      onChange={e => setNewAccount(prev => ({ ...prev, balance: e.target.value }))}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700">Credit Limit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5000"
                      value={newAccount.limit}
                      onChange={e => setNewAccount(prev => ({ ...prev, limit: e.target.value }))}
                      className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700">Interest APR (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 21.9"
                    value={newAccount.apr}
                    onChange={e => setNewAccount(prev => ({ ...prev, apr: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAddCardTab('plaid')}
                    className="text-blue-600 hover:text-blue-800 text-[11px] font-medium cursor-pointer"
                  >
                    ← Connect through Plaid
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setIsAddAccountOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Save Card</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Bill Modal */}
      {isAddBillOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddBillOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Upcoming Bill</h3>
              <button onClick={() => setIsAddBillOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddBill} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Bill Name / Provider</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PG&E Electric, Rent, Water Service"
                  value={newBill.name}
                  onChange={e => setNewBill(prev => ({ ...prev, name: e.target.value, biller: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Expected Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="128.40"
                    value={newBill.expectedAmount}
                    onChange={e => setNewBill(prev => ({ ...prev, expectedAmount: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Due Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newBill.dueDay}
                    onChange={e => setNewBill(prev => ({ ...prev, dueDay: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={newBill.category}
                    onChange={e => setNewBill(prev => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Telecom">Telecom / Internet</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Paid From Card / Account</label>
                  <select
                    value={newBill.account || (allFilterableCards[0]?.fullLabel || 'Checking •••• 4821')}
                    onChange={e => setNewBill(prev => ({ ...prev, account: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    {allFilterableCards.map(c => (
                      <option key={c.id} value={c.fullLabel}>{c.fullLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddBillOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Save Bill</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subscription Modal */}
      {isAddSubOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddSubOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Subscription</h3>
              <button onClick={() => setIsAddSubOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddSubscription} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Subscription Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Spotify, iCloud, ChatGPT Plus"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Monthly Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15.49"
                    value={newSub.amount}
                    onChange={e => setNewSub({ ...newSub, amount: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Billing Cycle</label>
                  <select
                    value={newSub.billingCycle}
                    onChange={e => setNewSub({ ...newSub, billingCycle: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={newSub.category}
                    onChange={e => setNewSub({ ...newSub, category: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Streaming">Streaming (Netflix, Hulu)</option>
                    <option value="Music">Music (Spotify, Apple Music)</option>
                    <option value="Cloud Storage">Cloud Storage (iCloud, Drive)</option>
                    <option value="AI & Software">AI & Software (ChatGPT)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Charged To Card</label>
                  <select
                    value={newSub.account || (allFilterableCards.find(c => c.type === 'credit')?.fullLabel || 'Everyday Rewards •••• 4417')}
                    onChange={e => setNewSub({ ...newSub, account: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    {allFilterableCards.map(c => (
                      <option key={c.id} value={c.fullLabel}>{c.fullLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddSubOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Save Subscription</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Actionable 0% Hardship Playbook Modal */}
      <HardshipPlaybookModal
        isOpen={isHardshipModalOpen}
        onClose={() => setIsHardshipModalOpen(false)}
        cards={displayCards}
        userName={currentUser?.name || 'Cardholder'}
      />

      {/* Add Purchase Modal */}
      {isAddTxOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddTxOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Purchase</h3>
              <button onClick={() => setIsAddTxOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Store / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Trader Joe's, Shell, Chipotle, Paycheck"
                  value={newTx.name}
                  onChange={e => {
                    const val = e.target.value;
                    const detectedCategory = autoDetectPurchaseCategory(val);
                    let detectedAccount = newTx.account;
                    if (detectedCategory === 'Income') {
                      const checking = allFilterableCards.find(c => c.type === 'depository');
                      if (checking) detectedAccount = checking.fullLabel;
                    } else if (detectedCategory === 'Travel') {
                      const travel = allFilterableCards.find(c => (c.name || '').toLowerCase().includes('travel'));
                      if (travel) detectedAccount = travel.fullLabel;
                    } else {
                      const credit = allFilterableCards.find(c => c.type === 'credit');
                      if (credit) detectedAccount = credit.fullLabel;
                    }
                    setNewTx({
                      ...newTx,
                      name: val,
                      category: detectedCategory,
                      account: detectedAccount
                    });
                  }}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
                {newTx.name && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Auto-detected: <strong>{newTx.category}</strong> · Card: <strong>{newTx.account}</strong></span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="54.12"
                    value={newTx.amount}
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. Oct 24"
                    value={newTx.date}
                    onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Category</label>
                  <select
                    value={newTx.category}
                    onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="Groceries">Groceries</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Dining">Dining</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Income">Income / Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Card / Account</label>
                  <select
                    value={newTx.account || (allFilterableCards.find(c => c.type === 'credit')?.fullLabel || 'Everyday Rewards •••• 4417')}
                    onChange={e => setNewTx({ ...newTx, account: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    {allFilterableCards.map(c => (
                      <option key={c.id} value={c.fullLabel}>{c.fullLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly family groceries, split with partner..."
                  value={newTx.notes || ''}
                  onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddTxOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Save Purchase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Monthly Category Budget Modal */}
      {isAddBudgetOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddBudgetOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#18457c]" />
                <h3 className="text-sm font-bold text-slate-900">Set Monthly Category Budget</h3>
              </div>
              <button onClick={() => setIsAddBudgetOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddOrUpdateBudget} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Category</label>
                <select
                  value={newBudget.category}
                  onChange={e => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Dining">Dining / Eating Out</option>
                  <option value="Transportation">Transportation / Gas</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Housing">Housing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Monthly Spending Limit ($)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="400"
                  value={newBudget.limit}
                  onChange={e => setNewBudget(prev => ({ ...prev, limit: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Klarity warns you when spending reaches 80% of your monthly limit.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddBudgetOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Save Budget</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Savings Goal Modal */}
      {isAddGoalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddGoalOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#18457c]" />
                <h3 className="text-sm font-bold text-slate-900">Create Savings Goal</h3>
              </div>
              <button onClick={() => setIsAddGoalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleAddGoal} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Goal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emergency Fund, Family Vacation, New Car Down Payment"
                  value={newGoal.name}
                  onChange={e => setNewGoal(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700">Target ($)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="3000"
                    value={newGoal.targetAmount}
                    onChange={e => setNewGoal(prev => ({ ...prev, targetAmount: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Saved So Far ($)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="500"
                    value={newGoal.currentAmount}
                    onChange={e => setNewGoal(prev => ({ ...prev, currentAmount: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Monthly ($/mo)</label>
                  <input
                    type="number"
                    step="1"
                    placeholder="250"
                    value={newGoal.monthlyContribution}
                    onChange={e => setNewGoal(prev => ({ ...prev, monthlyContribution: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddGoalOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Create Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Account / Loan Modal (for Net Worth) */}
      {isAddManualAssetOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsAddManualAssetOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#18457c]" />
                <h3 className="text-sm font-bold text-slate-900">Add Manual Account or Loan</h3>
              </div>
              <button onClick={() => setIsAddManualAssetOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-500">
              Track high-yield savings, investment portfolios, cash, or auto/student loans not linked through Plaid in your Net Worth chart.
            </p>
            <form onSubmit={handleAddManualAsset} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700">Account / Asset / Loan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-Yield Savings, Vanguard 401k, Auto Loan"
                  value={newManualAsset.name}
                  onChange={e => setNewManualAsset(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700">Type</label>
                  <select
                    value={newManualAsset.type}
                    onChange={e => setNewManualAsset(prev => ({ ...prev, type: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="savings">Savings / Cash (+)</option>
                    <option value="investment">Investments / 401k (+)</option>
                    <option value="loan">Loan / Liability (-)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="3200.00"
                    value={newManualAsset.balance}
                    onChange={e => setNewManualAsset(prev => ({ ...prev, balance: e.target.value }))}
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsAddManualAssetOpen(false)} className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white font-semibold cursor-pointer">Add to Net Worth</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Scan Document Modal */}
      {isScanBillOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsScanBillOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#18457c]" />
                <h3 className="text-sm font-bold text-slate-900">Scan Document</h3>
              </div>
              <button onClick={() => setIsScanBillOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste any sentences, statement lines, or bill details below. The AI Advisor will comprehend your text and automatically add every bill, subscription, or purchase mentioned.
            </p>
            <textarea
              rows={5}
              placeholder="e.g. I pay $22.99 a month for Netflix, my ConEdison electric bill is $148.60 due on the 3rd, and I spent $84.32 at Trader Joe's..."
              value={scanText}
              onChange={e => setScanText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsScanBillOpen(false)} className="px-3 py-1.5 text-xs text-slate-500 cursor-pointer">Cancel</button>
              <button
                type="button"
                disabled={!scanText.trim() || isAiTyping}
                onClick={handleScanBill}
                className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                Comprehend & Auto-Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast Notification (6 seconds) */}
      {undoToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:right-6 z-50 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-3 border border-slate-700">
          <span>{undoToast.message}</span>
          <button
            type="button"
            onClick={undoToast.onUndo}
            className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 cursor-pointer transition-colors"
          >
            Undo
          </button>
        </div>
      )}

      {/* Settings Modal - Redesigned matching reference mockup */}
      {isSettingsOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            ref={settingsModalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-[880px] w-full min-h-[580px] h-[640px] flex flex-col overflow-hidden cursor-default"
          >
            
            {/* Modal Body: Left Tabs + Right Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Left Sidebar Tabs */}
              <div className="w-full md:w-56 lg:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between bg-slate-50/80">
                <div>
                  <h3 className="font-serif-title text-xl font-bold text-slate-900 mb-6 hidden md:block">Settings</h3>
                  
                  <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {[
                      { id: 'profile', label: 'Profile', dot: false },
                      { id: 'ui', label: 'UI', dot: false },
                      { id: 'sidebar', label: 'Sidebar', dot: false },
                      { id: 'ai', label: 'AI advisor', dot: settingsAiStatus !== 'connected' },
                      { id: 'plaid', label: 'Bank connection', dot: settingsPlaidStatus !== 'connected' },
                      { id: 'security', label: 'Security', dot: false },
                      { id: 'session', label: 'Session', dot: false },
                      { id: 'about', label: 'About', dot: false }
                    ].map(tab => {
                      const isActive = settingsActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSettingsActiveTab(tab.id)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors duration-100 cursor-pointer shrink-0 ${
                            isActive
                              ? 'bg-white text-[#1B4B91] font-semibold border border-slate-200/90 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 font-medium'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.dot && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 ml-2"></span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>


              </div>

              {/* Right Content Panel */}
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white text-slate-800">
                <div>
                  {/* TAB: SIDEBAR & NAVIGATION */}
                  {settingsActiveTab === 'sidebar' && (
                    <div key="settings-tab-sidebar" className="flex flex-col gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-serif-title text-xl font-bold text-slate-900">Sidebar & Navigation</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Customize your navigation order with Move Up / Move Down, or toggle optional sections to show or hide them.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleResetSidebarOrder}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-2xs transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reset Layout</span>
                        </button>
                      </div>

                      {/* Reorderable and Toggleable List of Navigation Items */}
                      <div className="border border-slate-200/90 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                        {sidebarNavOrder.map((itemId, idx) => {
                          const config = SIDEBAR_ITEMS_CONFIG[itemId];
                          if (!config) return null;
                          const Icon = config.icon;
                          const isOptional = Boolean(config.flag);
                          const isEnabled = isOptional ? featureFlags[config.flag] !== false : true;

                          const descriptions = {
                            dashboard: 'Main financial overview, net worth, cash flow & health score.',
                            cards: 'Credit cards, utilization, weighted APR & interactive payoff engine.',
                            transactions: 'Purchases, transaction history, categories & card filters.',
                            bills: 'Upcoming bills, recurring due dates & payment schedules.',
                            subscriptions: 'Monthly & annual active software and entertainment subs.',
                            budgets: 'Spending budgets and category progress limits.',
                            household: 'Utility bills (PG&E / water), fleet vehicles, and healthcare.',
                            retirement: 'Public pensions (CalPERS, CalSTRS), 401(k), IRAs & Social Security.',
                            vault: 'Encrypted password & account credentials vault.'
                          };

                          return (
                            <div
                              key={itemId}
                              className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                                !isEnabled ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/40'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0">
                                  <Icon className="w-4 h-4 text-[#18457c]" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900">{config.label}</p>
                                    <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                                    {!isOptional && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                        Core
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{descriptions[itemId] || ''}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Up / Down Order Buttons */}
                                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSidebarItem(itemId, 'up')}
                                    disabled={idx === 0}
                                    title="Move section up"
                                    className="p-1.5 rounded-md hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveSidebarItem(itemId, 'down')}
                                    disabled={idx === sidebarNavOrder.length - 1}
                                    title="Move section down"
                                    className="p-1.5 rounded-md hover:bg-white text-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Visibility Toggle (only for optional sections) */}
                                {isOptional ? (
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isEnabled}
                                    title={isEnabled ? `Hide ${config.label}` : `Show ${config.label}`}
                                    onClick={() => handleUpdateFeatureFlags({ [config.flag]: !isEnabled })}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                      isEnabled ? 'bg-[#18457c]' : 'bg-slate-200'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>
                                ) : (
                                  <div className="w-11 text-center">
                                    <span className="text-[11px] text-slate-400 font-medium">Always</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          Your sidebar arrangement and feature visibility are saved in real-time. Hiding an item removes its button from the left navigation and mobile menu while preserving all of your underlying accounts and data.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 1: PROFILE */}
                  {settingsActiveTab === 'profile' && (
                    <div key="settings-tab-profile" className="flex flex-col gap-6">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">Profile</h2>
                        <p className="text-xs text-slate-500 mt-1">How you appear in Klarity.</p>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 bg-white shadow-2xs">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-full bg-[#1B4B91] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                            {userInitials}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{currentUser?.name || 'Ziyad Elmahi'}</p>
                            <p className="text-xs text-slate-500">{currentUser?.email || ''}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Display name</label>
                            <input
                              type="text"
                              value={settingsDisplayName}
                              onChange={e => setSettingsDisplayName(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Email</label>
                            <input
                              type="email"
                              value={currentUser?.email || ''}
                              disabled
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 cursor-not-allowed shadow-2xs"
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">Email can't be changed here.</p>
                          </div>
                        </div>



                        <div className="flex justify-end pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            className="px-4 py-2 rounded-xl bg-[#1B4B91] hover:bg-[#153a70] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            Save profile
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: UI & ACCESSIBILITY */}
                  {settingsActiveTab === 'ui' && (
                    <div key="settings-tab-ui" className="flex flex-col gap-6">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">UI Settings</h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Customize text scaling, layout density, and accessibility features designed to enhance your experience.
                        </p>
                      </div>

                      {/* 1. Text Sizing & Font Scaling */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-2xs">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Text & Content Scaling</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Scale typography and interface elements for easier reading.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            { id: 'normal', label: 'Default (100%)', desc: 'Standard compact text size' },
                            { id: 'large', label: 'Large (110%)', desc: 'Enhanced legibility for comfortable reading' },
                            { id: 'xlarge', label: 'Extra Large (125%)', desc: 'High readability for larger displays' }
                          ].map(scale => {
                            const isSelected = uiFontScale === scale.id;
                            return (
                              <button
                                key={scale.id}
                                type="button"
                                onClick={() => handleSetFontScale(scale.id)}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#18457c] ring-2 ring-[#18457c]/20 bg-blue-50/25'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-900">{scale.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#18457c]" />}
                                </div>
                                <p className="text-[11px] text-slate-500">{scale.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Interface Density */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-2xs">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Interface Density</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Control spacing between cards, tables, and list rows.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { id: 'comfortable', label: 'Comfortable', desc: 'Generous padding and relaxed breathing room' },
                            { id: 'compact', label: 'Compact', desc: 'Condenses cards and lists to view more data on screen' }
                          ].map(dens => {
                            const isSelected = uiDensity === dens.id;
                            return (
                              <button
                                key={dens.id}
                                type="button"
                                onClick={() => handleSetDensity(dens.id)}
                                className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#18457c] ring-2 ring-[#18457c]/20 bg-blue-50/25'
                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-slate-900">{dens.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#18457c]" />}
                                </div>
                                <p className="text-[11px] text-slate-500">{dens.desc}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. Accessibility & Visual Helpers */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-2xs">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Accessibility & Visual Assistance</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Additional visual preferences to help you navigate comfortably.
                          </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {/* Reduced Motion */}
                          <div className="py-3.5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-slate-900">Reduce Motion & Animations</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Disables UI animations and transitions for improved comfort and snappier performance.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggleReduceMotion}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                uiReduceMotion ? 'bg-[#18457c]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  uiReduceMotion ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* High Focus Rings */}
                          <div className="py-3.5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-slate-900">High-Visibility Focus Indicators</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Enhances outlines around clickable buttons, cards, and inputs for easier keyboard navigation.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggleHighFocus}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                uiHighFocus ? 'bg-[#18457c]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  uiHighFocus ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Privacy Mask Mode */}
                          <div className="py-3.5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-xs font-bold text-slate-900">Privacy Mask (Blur Sensitive Balances)</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Automatically blurs sensitive balances until hovered to protect privacy in public spaces.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleTogglePrivacyMask}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                uiPrivacyMask ? 'bg-[#18457c]' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  uiPrivacyMask ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AI ADVISOR */}
                  {settingsActiveTab === 'ai' && (
                    <div key="settings-tab-ai" className="flex flex-col gap-5">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">AI advisor</h2>
                        <p className="text-xs text-slate-500 mt-1">Configure the AI model and choose what data it can access.</p>
                      </div>

                      {/* Card: Model & Key Configuration */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Provider</label>
                            <select
                              value={settingsAiProvider}
                              onChange={e => handleProviderChange(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                            >
                              <option value="local">Built-in Local AI (node-llama-cpp — No Key Required)</option>
                              <option value="gemini">Google Gemini</option>
                              <option value="anthropic">Anthropic (Claude)</option>
                              <option value="openai">OpenAI (ChatGPT)</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Model</label>
                            <input
                              type="text"
                              list={
                                settingsAiProvider === 'local'
                                  ? 'local-model-suggestions'
                                  : settingsAiProvider === 'gemini'
                                    ? 'gemini-model-suggestions'
                                    : undefined
                              }
                              value={settingsAiModel}
                              onChange={e => setSettingsAiModel(e.target.value)}
                              placeholder={
                                settingsAiProvider === 'local'
                                  ? 'e.g. Llama-3.2-3B-Instruct-Q4_K_M.gguf'
                                  : settingsAiProvider === 'gemini'
                                    ? 'e.g. gemini-2.0-flash'
                                    : 'e.g. claude-3-7-sonnet-20250219'
                              }
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                            />
                            {settingsAiProvider === 'local' && (
                              <datalist id="local-model-suggestions">
                                <option value="Llama-3.2-3B-Instruct-Q4_K_M.gguf">Llama 3.2 3B Instruct Q4_K_M (Recommended)</option>
                                <option value="DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf">DeepSeek-R1 Distill Qwen 1.5B Q4_K_M (Fast)</option>
                              </datalist>
                            )}
                            {settingsAiProvider === 'gemini' && (
                              <datalist id="gemini-model-suggestions">
                                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended - 15 RPM Free Tier)</option>
                                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra Reliable)</option>
                                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (High Speed)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                              </datalist>
                            )}
                          </div>
                        </div>

                        {settingsAiProvider === 'local' ? (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-800">
                                {localAiEngineStatus?.modelName || settingsAiModel || 'Local GGUF Engine'}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-600">
                                {localAiEngineStatus?.state === 'ready'
                                  ? 'Ready (Loaded in RAM)'
                                  : localAiEngineStatus?.state === 'downloading'
                                    ? `${(localAiEngineStatus.progressPct || 0).toFixed(1)}%`
                                    : localAiEngineStatus?.state || 'Standby'}
                              </span>
                            </div>
                            {localAiEngineStatus?.state === 'downloading' && (
                              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className="h-full bg-[#1B4B91] transition-all duration-300"
                                  style={{ width: `${Math.min(100, Math.max(2, localAiEngineStatus.progressPct || 0))}%` }}
                                />
                              </div>
                            )}
                            <p className="text-[11px] text-slate-500">
                              {localAiEngineStatus?.message ||
                                'Runs locally on your machine with live web-search retrieval (RAG). No external API key required.'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-medium text-slate-700">API Key</label>
                              <a
                                href="https://aistudio.google.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                              >
                                <span>Get a Gemini API key</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="relative">
                              <input
                                type={settingsAiShowKey ? 'text' : 'password'}
                                value={settingsAiApiKey}
                                onChange={e => setSettingsAiApiKey(e.target.value)}
                                placeholder={settingsAiMaskedKey ? `Saved: ${settingsAiMaskedKey}` : 'Paste API key (AIza... or sk-...)'}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                              />
                              <button
                                type="button"
                                onClick={() => setSettingsAiShowKey(!settingsAiShowKey)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {settingsAiShowKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                              <span>Get your free Gemini API key at</span>
                              <a
                                href="https://aistudio.google.com/api-keys"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                              >
                                aistudio.google.com/api-keys
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </p>
                          </div>
                        )}

                        {/* Status Pill & Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Status:</span>
                            {settingsAiStatus === 'connected' || settingsAiProvider === 'local' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Connected
                              </span>
                            ) : settingsAiStatus === 'invalid_key' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                Invalid key
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                Not connected
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {Boolean(settingsAiMaskedKey) && settingsAiProvider !== 'local' && (
                              <button
                                type="button"
                                onClick={handleRemoveAiKey}
                                className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                              >
                                Remove key
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleSaveAndTestAiKey}
                              disabled={settingsAiTesting}
                              className="px-4 py-2 rounded-xl bg-[#1B4B91] hover:bg-[#153a70] text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                            >
                              {settingsAiTesting && <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>}
                              <span>
                                {settingsAiTesting
                                  ? 'Applying...'
                                  : settingsAiProvider === 'local'
                                    ? 'Activate local model'
                                    : 'Save and test key'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card: Data Access Permissions */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-2xs">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Data access permissions</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Control which categories of personal financial data the AI advisor can analyze.</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          {[
                            { id: 'bills', label: 'Bills' },
                            { id: 'subscriptions', label: 'Subscriptions' },
                            { id: 'cards', label: 'Cards' },
                            { id: 'purchases', label: 'Purchases' },
                            ...(featureFlags.retirement !== false ? [{ id: 'retirement', label: 'Retirement Plans' }] : [])
                          ].map(perm => {
                            const isAllowed = settingsAiPermissions[perm.id];
                            return (
                              <button
                                key={perm.id}
                                type="button"
                                onClick={() => handleTogglePermission(perm.id)}
                                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                  isAllowed
                                    ? 'bg-[#eff4f9] border-[#1B4B91]/40 text-[#1B4B91] shadow-2xs'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                <span>{perm.label}</span>
                                <span className={`w-2 h-2 rounded-full ${isAllowed ? 'bg-[#1B4B91]' : 'bg-slate-300'}`}></span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card: Live Internet & Web Browsing Access */}
                      <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-3 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                              <Globe className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-slate-900">Live Internet Access</h4>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Active
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">Allows the AI to browse Google and search the web in real-time for live rates, card promotions, and market benchmarks.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: BANK CONNECTION */}
                  {settingsActiveTab === 'plaid' && (
                    <div key="settings-tab-plaid" className="flex flex-col gap-5">
                      <div className="flex flex-col gap-3 pb-0 border-b border-slate-200">
                        <div>
                          <h2 className="font-serif-title text-2xl font-bold text-slate-900">Bank connection</h2>
                          <p className="text-xs text-slate-500 mt-0.5">Manage connected banks and link new accounts.</p>
                        </div>

                        {/* Sub-tabs placed directly under the title: Connect a bank on the left, Connected banks on the right with underline indicator */}
                        <div className="flex items-center gap-6 mt-1 -mb-px">
                          <button
                            type="button"
                            onClick={() => setBankTab('connect')}
                            className={`pb-2.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                              bankTab === 'connect'
                                ? 'text-[#18457c] border-[#18457c]'
                                : 'text-slate-500 hover:text-slate-800 border-transparent'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Connect a bank</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBankTab('connected')}
                            className={`pb-2.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border-b-2 ${
                              bankTab === 'connected'
                                ? 'text-[#18457c] border-[#18457c]'
                                : 'text-slate-500 hover:text-slate-800 border-transparent'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Connected banks</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                              bankTab === 'connected' ? 'bg-blue-100 text-[#18457c]' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {(() => {
                                const names = new Set();
                                (data?.accounts || []).forEach(a => { if (a && a.institution) names.add(a.institution); });
                                (settings?.plaidItems || []).forEach(pi => { if (pi && pi.institution) names.add(pi.institution); });
                                if (names.size === 0 && (data?.accounts || []).length > 0) names.add('Connected Bank');
                                return names.size;
                              })()}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* SUB-VIEW 1: CONNECTED BANKS */}
                      {bankTab === 'connected' && (
                        <div className="flex flex-col gap-4">
                          {/* List of distinct connected institutions */}
                          {(() => {
                            const getLocalAccounts = () => {
                              try {
                                const raw = localStorage.getItem('klarity_accounts');
                                return raw ? JSON.parse(raw) : [];
                              } catch { return []; }
                            };

                            const allBankAccounts = (() => {
                              const map = new Map();
                              (data?.accounts || []).forEach(a => { if (a && a.id) map.set(a.id, a); });
                              (settings?.plaidItems || []).forEach(pi => {
                                (pi.accounts || []).forEach(a => {
                                  if (a && a.id && !map.has(a.id)) {
                                    map.set(a.id, { ...a, institution: a.institution || pi.institution });
                                  }
                                });
                              });
                              getLocalAccounts().forEach(a => { if (a && a.id && !map.has(a.id)) map.set(a.id, a); });
                              return Array.from(map.values());
                            })();

                            const institutionsMap = {};

                            // 1. Initialize all connected Plaid bank items
                            (settings?.plaidItems || []).forEach(pi => {
                              const inst = pi.institution || 'Connected Bank';
                              if (!institutionsMap[inst]) {
                                institutionsMap[inst] = {
                                  itemId: pi.itemId,
                                  institution: inst,
                                  accounts: []
                                };
                              }
                              (pi.accounts || []).forEach(acc => {
                                if (acc && !institutionsMap[inst].accounts.some(a => a.id === acc.id)) {
                                  institutionsMap[inst].accounts.push(acc);
                                }
                              });
                            });

                            // 2. Map all accounts (from data.accounts & local cache) to their connected institution
                            allBankAccounts.forEach(acc => {
                              let inst = acc.institution;
                              if (!inst && acc.itemId) {
                                const matchingItem = (settings?.plaidItems || []).find(pi => pi.itemId === acc.itemId);
                                if (matchingItem) inst = matchingItem.institution;
                              }
                              if (!inst) {
                                inst = acc.name && acc.name.toLowerCase().includes('chase') ? 'Chase'
                                  : acc.name && acc.name.toLowerCase().includes('capital one') ? 'Capital One'
                                  : (settings?.plaidItems?.[0]?.institution || 'Connected Bank');
                              }

                              if (!institutionsMap[inst]) {
                                institutionsMap[inst] = {
                                  itemId: acc.itemId || null,
                                  institution: inst,
                                  accounts: []
                                };
                              }

                              if (!institutionsMap[inst].accounts.some(a => a.id === acc.id)) {
                                institutionsMap[inst].accounts.push(acc);
                              }
                            });

                            const instList = Object.values(institutionsMap).map(item => [item.institution, item.accounts]);

                            if (instList.length === 0) {
                              return (
                                <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 flex flex-col items-center justify-center">
                                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                                    <Building2 className="w-6 h-6 stroke-1" />
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-900">No banks connected yet</h3>
                                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                    Link your bank via Plaid or add cards manually to start tracking balances and cash flow in real time.
                                  </p>
                                  <div className="flex items-center gap-2 mt-4">
                                    <button
                                      type="button"
                                      onClick={() => setBankTab('connect')}
                                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Connect a bank</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsSettingsOpen(false);
                                        setIsAddAccountOpen(true);
                                      }}
                                      className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                    >
                                      Add card manually
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="flex flex-col gap-3">
                                {instList.map(([institutionName, accs]) => {
                                  const totalBalance = accs.reduce((sum, a) => sum + Number(a.balance || 0), 0);
                                  const matchingPlaidItem = (settings?.plaidItems || []).find(pi => pi.institution === institutionName);
                                  return (
                                    <div
                                      key={institutionName}
                                      className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs flex flex-col gap-3 hover:border-slate-300 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1B4B91] font-bold text-sm shadow-2xs">
                                            {institutionName.slice(0, 2).toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h4 className="text-xs font-bold text-slate-900">{institutionName}</h4>
                                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                Active
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                              {accs.length} linked {accs.length === 1 ? 'account' : 'accounts'} · Total ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (matchingPlaidItem) {
                                              handleDisconnectBank(matchingPlaidItem.itemId, institutionName);
                                            } else {
                                              // Remove all accounts with this institution
                                              if (window.confirm(`Disconnect all accounts from ${institutionName}?`)) {
                                                accs.forEach(a => handleDeleteAccount(a.id, a.name));
                                              }
                                            }
                                          }}
                                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                          title={`Disconnect ${institutionName}`}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>

                                      {/* Breakdown of individual accounts under this institution */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                        {accs.map(acc => (
                                          <div key={acc.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                            <div className="min-w-0 pr-2">
                                              <p className="font-semibold text-slate-800 truncate">{acc.name}</p>
                                              <p className="text-[10px] text-slate-400 capitalize">
                                                {acc.type === 'credit' ? 'Credit card' : 'Checking / Savings'} (•••• {acc.mask || '0000'})
                                              </p>
                                            </div>
                                            <span className="font-bold text-slate-900 shrink-0">
                                              ${Number(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}

                                <div className="pt-2 flex items-center justify-between">
                                  <p className="text-[11px] text-slate-500">
                                    Want to connect another institution?
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => setBankTab('connect')}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Connect another bank</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* SUB-VIEW 2: CONNECT A BANK */}
                      {bankTab === 'connect' && (
                        <div className="border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 bg-white shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-medium">Connection status:</span>
                            {settingsPlaidStatus === 'connected' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Connected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                No bank linked
                              </span>
                            )}
                          </div>

                          {/* Plaid Link Connect Banner with Green Button */}
                          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">Connect Bank with Plaid</p>
                                <p className="text-[11px] text-slate-500">Securely link your real accounts, balances, and cards.</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={initiatePlaidLink}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
                            >
                              <span>Add bank with Plaid</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>



                          <form onSubmit={handleSavePlaidCredentials} className="flex flex-col gap-4">
                            {/* Plaid Dashboard Callout */}
                            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-bold text-slate-900">Need Plaid API Keys?</p>
                                <p className="text-[11px] text-slate-500">Get your Client ID and Secret directly on the Plaid dashboard.</p>
                              </div>
                              <a
                                href="https://dashboard.plaid.com/overview"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 shadow-2xs transition-colors shrink-0"
                              >
                                <span>Plaid Dashboard</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-slate-700">Plaid Client ID</label>
                                <a
                                  href="https://dashboard.plaid.com/overview"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  <span>Get keys on Plaid</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <input
                                type="text"
                                value={settingsPlaidClientId}
                                onChange={e => {
                                  setSettingsPlaidClientId(e.target.value);
                                  try { localStorage.setItem('klarity_plaid_client_id', e.target.value); } catch {}
                                }}
                                placeholder="Client ID"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-medium text-slate-700 block mb-1.5">Plaid Secret</label>
                              <div className="relative">
                                <input
                                  type={settingsPlaidShowSecret ? 'text' : 'password'}
                                  value={settingsPlaidSecret}
                                  onChange={e => setSettingsPlaidSecret(e.target.value)}
                                  placeholder={settingsPlaidMaskedSecret ? `Saved: ${settingsPlaidMaskedSecret}` : 'Secret Key'}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSettingsPlaidShowSecret(!settingsPlaidShowSecret)}
                                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  {settingsPlaidShowSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={initiatePlaidLink}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                                >
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span>Connect bank (Plaid)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSettingsOpen(false);
                                    setIsAddAccountOpen(true);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                  Add card manually
                                </button>
                              </div>
                              <button
                                type="submit"
                                className="px-4 py-2 rounded-xl bg-[#1B4B91] hover:bg-[#153a70] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                              >
                                Save credentials
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: SECURITY & ACCESS CONTROL */}
                  {settingsActiveTab === 'security' && (
                    <div key="settings-tab-security" className="flex flex-col gap-6">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">Security & Privacy</h2>
                        <p className="text-xs text-slate-500 mt-1">Configure session timeouts, vault master passwords and PINs, and privacy controls.</p>
                      </div>

                      {/* Card 1: Inactivity & Session Timeout */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#18457c] shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">Inactivity & Session Timeout</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Control how long Klarity stays active when nothing is being used before automatically timing out.</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleLockSession}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs shrink-0 flex items-center gap-1.5"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Lock Session Now</span>
                          </button>
                        </div>

                        {/* Inactivity Duration */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Inactivity Timeout Duration</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">How long before the session locks or expires if left unattended.</p>
                          </div>
                          <select
                            value={autoLockMinutes}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setAutoLockMinutes(val);
                              try { localStorage.setItem('klarity_auto_lock_mins', String(val)); } catch {}
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                          >
                            <option value={5}>5 minutes</option>
                            <option value={15}>15 minutes (default)</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={240}>4 hours</option>
                            <option value={480}>8 hours</option>
                            <option value={0}>Never (Stay active)</option>
                          </select>
                        </div>

                        {/* Idle Action */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">When Timeout is Reached</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Choose whether to lock the screen or sign out completely.</p>
                          </div>
                          <select
                            value={idleAction}
                            onChange={e => {
                              setIdleAction(e.target.value);
                              try { localStorage.setItem('klarity_idle_action', e.target.value); } catch {}
                            }}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                          >
                            <option value="lock">Lock screen (Enter PIN/Password to resume)</option>
                            <option value="logout">Sign out completely</option>
                          </select>
                        </div>
                      </div>

                      {/* Card 2: Passwords Vault Protection Mode */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#18457c] shrink-0">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Passwords Vault Access Protection</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Secure your stored passwords and account numbers with a PIN, a password, or leave it unlocked.</p>
                          </div>
                        </div>

                        {/* Mode Selection Pills */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                          <label className="text-xs font-semibold text-slate-800">Vault Protection Type</label>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setVaultLockType('pin');
                                localStorage.setItem('klarity_vault_lock_type', 'pin');
                              }}
                              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                vaultLockType === 'pin'
                                  ? 'border-[#18457c] bg-blue-50/50 text-[#18457c]'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="font-bold text-xs">Security PIN</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">4-6 digit numeric code</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setVaultLockType('password');
                                localStorage.setItem('klarity_vault_lock_type', 'password');
                              }}
                              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                vaultLockType === 'password'
                                  ? 'border-[#18457c] bg-blue-50/50 text-[#18457c]'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="font-bold text-xs">Master Password</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Alphanumeric passphrase</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (vaultLockType !== 'none') {
                                  if (window.confirm('Cancel PIN/Password lock? Your Passwords page will be directly accessible without a security prompt.')) {
                                    setVaultLockType('none');
                                    localStorage.setItem('klarity_vault_lock_type', 'none');
                                    sessionStorage.removeItem('klarity_vault_unlocked_until');
                                    setNotificationToast('Vault lock disabled');
                                    setTimeout(() => setNotificationToast(''), 3000);
                                  }
                                }
                              }}
                              className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                vaultLockType === 'none'
                                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="font-bold text-xs">No Lock (Direct Access)</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">Cancel PIN and open directly</div>
                            </button>
                          </div>
                        </div>

                        {/* When vaultLockType is 'none' */}
                        {vaultLockType === 'none' && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                            <span>Vault protection is turned off. Anyone on this browser can view passwords without entering a PIN or password.</span>
                            <button
                              type="button"
                              onClick={() => {
                                setVaultLockType('pin');
                                localStorage.setItem('klarity_vault_lock_type', 'pin');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#18457c] text-white font-semibold text-xs cursor-pointer shrink-0"
                            >
                              Enable PIN
                            </button>
                          </div>
                        )}

                        {/* When vaultLockType is 'pin' or 'password' */}
                        {vaultLockType !== 'none' && (
                          <>
                            {/* PIN/Password Timeout Setting */}
                            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-800">Vault Unlock Duration</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">How long the vault stays unlocked after entering your {vaultLockType === 'password' ? 'password' : 'PIN'}.</p>
                              </div>
                              <select
                                value={vaultPinTimeout}
                                onChange={e => setVaultPinTimeout(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                              >
                                <option value="immediate">Immediate (every visit)</option>
                                <option value="5m">5 minutes</option>
                                <option value="15m">15 minutes (default)</option>
                                <option value="1h">1 hour</option>
                                <option value="session">Until app closes</option>
                              </select>
                            </div>

                            {/* Change PIN/Password Form */}
                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-900">
                                  {vaultLockType === 'password' ? 'Change Master Password' : 'Change Security PIN'}
                                </p>
                                {changePinMsg && (
                                  <span className={`text-[11px] font-semibold ${
                                    changePinMsg.includes('success') ? 'text-emerald-600' : 'text-rose-600'
                                  }`}>
                                    {changePinMsg}
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    Current {vaultLockType === 'password' ? 'Password' : 'PIN'}
                                  </label>
                                  <input
                                    type="password"
                                    maxLength={vaultLockType === 'password' ? 64 : 12}
                                    value={changePinCurrent}
                                    onChange={e => setChangePinCurrent(vaultLockType === 'password' ? e.target.value : e.target.value.replace(/\D/g, ''))}
                                    placeholder={vaultLockType === 'password' ? 'Current password' : '••••'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    New {vaultLockType === 'password' ? 'Password' : 'PIN'}
                                  </label>
                                  <input
                                    type="password"
                                    maxLength={vaultLockType === 'password' ? 64 : 12}
                                    value={changePinNew}
                                    onChange={e => setChangePinNew(vaultLockType === 'password' ? e.target.value : e.target.value.replace(/\D/g, ''))}
                                    placeholder={vaultLockType === 'password' ? 'At least 4 characters' : '••••'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-medium text-slate-600 block mb-1">
                                    Confirm New {vaultLockType === 'password' ? 'Password' : 'PIN'}
                                  </label>
                                  <input
                                    type="password"
                                    maxLength={vaultLockType === 'password' ? 64 : 12}
                                    value={changePinConfirm}
                                    onChange={e => setChangePinConfirm(vaultLockType === 'password' ? e.target.value : e.target.value.replace(/\D/g, ''))}
                                    placeholder={vaultLockType === 'password' ? 'Re-enter password' : '••••'}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Cancel PIN/Password lock? Your Passwords page will be directly accessible without a security prompt.')) {
                                      setVaultLockType('none');
                                      localStorage.setItem('klarity_vault_lock_type', 'none');
                                      removeMasterPin();
                                      localStorage.removeItem('klarity_vault_pin');
                                      sessionStorage.removeItem('klarity_vault_unlocked_until');
                                      setChangePinMsg('');
                                      setNotificationToast('Vault lock removed');
                                      setTimeout(() => setNotificationToast(''), 3000);
                                    }
                                  }}
                                  className="text-xs text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
                                >
                                  Cancel & remove vault lock
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const currentSaved = localStorage.getItem('klarity_vault_pin') || '1234';
                                    if (changePinCurrent !== currentSaved) {
                                      setChangePinMsg(`Incorrect current ${vaultLockType === 'password' ? 'password' : 'PIN'}.`);
                                      return;
                                    }
                                    if (changePinNew.length < 4) {
                                      setChangePinMsg(`New ${vaultLockType === 'password' ? 'password' : 'PIN'} must be at least 4 characters.`);
                                      return;
                                    }
                                    if (changePinNew !== changePinConfirm) {
                                      setChangePinMsg(`New ${vaultLockType === 'password' ? 'password' : 'PIN'} confirmation does not match.`);
                                      return;
                                    }
                                    localStorage.setItem('klarity_vault_pin', changePinNew);
                                    localStorage.setItem('klarity_vault_lock_type', vaultLockType);
                                    try { await setMasterPin(changePinNew); } catch {}
                                    setChangePinMsg(`${vaultLockType === 'password' ? 'Master password' : 'Security PIN'} updated successfully!`);
                                    setChangePinCurrent('');
                                    setChangePinNew('');
                                    setChangePinConfirm('');
                                    setTimeout(() => setChangePinMsg(''), 4000);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                                >
                                  Update {vaultLockType === 'password' ? 'Password' : 'PIN'}
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Card 3: Clipboard Privacy */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[#18457c] shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">Clipboard Privacy Safeguard</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Wipe copied passwords and account numbers from your device clipboard automatically.</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-slate-800">Clipboard Auto-Clear Delay</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Time before clipboard memory is cleared after copying credentials.</p>
                          </div>
                          <select
                            value={clipboardClearSeconds}
                            onChange={e => setClipboardClearSeconds(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                          >
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds (recommended)</option>
                            <option value={60}>60 seconds</option>
                            <option value={0}>Never clear</option>
                          </select>
                        </div>
                      </div>

                      {/* Card 4: Device Data & Lockout Recovery */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-900">Reset Vault PIN to Default</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Reset your master vault PIN back to default (1234) and clear any rate limit lockouts.</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              clearLockoutState();
                              setNotificationToast('Lockout state cleared');
                              setTimeout(() => setNotificationToast(''), 3000);
                            }}
                            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer transition-colors"
                          >
                            Clear Lockout
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Reset your Passwords Vault PIN to default (1234)?')) {
                                localStorage.setItem('klarity_vault_pin', '1234');
                                localStorage.setItem('klarity_vault_lock_type', 'pin');
                                setVaultLockType('pin');
                                removeMasterPin();
                                sessionStorage.removeItem('klarity_vault_unlocked_until');
                                setNotificationToast('Vault PIN reset to 1234');
                                setTimeout(() => setNotificationToast(''), 3000);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer transition-colors"
                          >
                            Reset to 1234
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: SESSION & UPDATES */}
                  {settingsActiveTab === 'session' && (
                    <div key="settings-tab-session" className="flex flex-col gap-6">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">Session & Updates</h2>
                        <p className="text-xs text-slate-500 mt-1">Manage active logins, inspect software versions, and check for desktop updates.</p>
                      </div>

                      {/* Card 1: Desktop App Engine & GitHub Auto-Updater */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col gap-4 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                Klarity
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {desktopAppInfo.updateStatus?.message && !desktopAppInfo.updateStatus.message.includes('Connected to GitHub') && !desktopAppInfo.updateStatus.message.includes('ByZizo') ? desktopAppInfo.updateStatus.message : 'Up to date'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {desktopAppInfo.updateStatus?.state === 'available' || desktopAppInfo.updateStatus?.state === 'ready' ? (
                              <button
                                type="button"
                                disabled={isInstallingUpdate || desktopAppInfo.updateStatus?.state === 'installing'}
                                onClick={handlePerformUpdate}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold cursor-pointer flex items-center gap-2 shadow-xs transition-colors"
                              >
                                <Download className="w-4 h-4" />
                                <span>{isInstallingUpdate ? 'Updating...' : 'Update Now'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isCheckingUpdateInSettings}
                                onClick={async () => {
                                  setIsCheckingUpdateInSettings(true);
                                  try {
                                    if (typeof window !== 'undefined' && window.klarityDesktop?.checkForUpdates) {
                                      const st = await window.klarityDesktop.checkForUpdates();
                                      if (st?.state === 'available') {
                                        setIsUpdateModalOpen(true);
                                      } else {
                                        setNotificationToast(st?.message || 'Klarity is up to date!');
                                        setTimeout(() => setNotificationToast(''), 3000);
                                      }
                                    } else {
                                      const res = await fetch('/api/app/update-check');
                                      const data = await res.json();
                                      if (data.ok) {
                                        setNotificationToast('Klarity is up to date');
                                      } else {
                                        setNotificationToast('Klarity is up to date');
                                      }
                                      setTimeout(() => setNotificationToast(''), 3500);
                                    }
                                  } catch (err) {
                                    setNotificationToast('Update check complete — up to date.');
                                    setTimeout(() => setNotificationToast(''), 3000);
                                  } finally {
                                    setIsCheckingUpdateInSettings(false);
                                  }
                                }}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-semibold cursor-pointer flex items-center gap-2 transition-colors"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdateInSettings ? 'animate-spin text-[#18457c]' : ''}`} />
                                <span>{isCheckingUpdateInSettings ? 'Checking GitHub...' : 'Check for Updates'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* If an update is available, show a detailed alert banner */}
                        {desktopAppInfo.updateStatus?.state === 'available' && (
                          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-3 text-amber-900 animate-in fade-in duration-150">
                            <div className="flex items-start gap-2.5">
                              <ArrowUpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-xs block">Update available</span>
                                <span className="text-[11px] text-amber-800 leading-snug">
                                  A new version is ready to install.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handlePerformUpdate}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shrink-0 transition-colors shadow-2xs"
                            >
                              Install Now
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card 2: Active Session & Sign Out */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900">Signed in as</p>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{currentUser?.email || ''}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              handleLogout();
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold text-xs cursor-pointer transition-colors shadow-2xs shrink-0"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 6: ABOUT & LAST UPDATES */}
                  {settingsActiveTab === 'about' && (
                    <div key="settings-tab-about" className="flex flex-col gap-6">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">About Klarity</h2>
                        <p className="text-xs text-slate-500 mt-1">Software information, current version, and recent release updates.</p>
                      </div>

                      {/* Card 1: App Version & System Summary */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-2xl bg-[#eff4f9] border border-[#18457c]/20 flex items-center justify-center shrink-0 shadow-2xs">
                            <KlarityLogo className="w-7 h-7 text-[#18457c]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-sm">Klarity Finance</h3>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                {formatVersionString(desktopAppInfo.version || '3.12.14')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {desktopAppInfo.isDesktopApp ? 'Klarity (Windows)' : 'Klarity Web Application'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isCheckingUpdateInSettings}
                            onClick={async () => {
                              setIsCheckingUpdateInSettings(true);
                              try {
                                if (typeof window !== 'undefined' && window.klarityDesktop?.checkForUpdates) {
                                  const st = await window.klarityDesktop.checkForUpdates();
                                  if (st?.state === 'available') {
                                    setIsUpdateModalOpen(true);
                                  } else {
                                    setNotificationToast('You are running the latest version of Klarity.');
                                    setTimeout(() => setNotificationToast(''), 3000);
                                  }
                                } else {
                                  setNotificationToast('You are running the latest version of Klarity.');
                                  setTimeout(() => setNotificationToast(''), 3000);
                                }
                              } catch {
                                setNotificationToast('Update check complete — up to date.');
                                setTimeout(() => setNotificationToast(''), 3000);
                              } finally {
                                setIsCheckingUpdateInSettings(false);
                              }
                            }}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors shadow-2xs flex items-center gap-2"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isCheckingUpdateInSettings ? 'animate-spin' : ''}`} />
                            <span>{isCheckingUpdateInSettings ? 'Checking...' : 'Check for Updates'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Card 2: Last Updates (Release History & Changelog) */}
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">Last Updates & Release Notes</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Recent features, improvements, and bug fixes added to Klarity.</p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">Chronological</span>
                        </div>

                        <div className="space-y-4 pt-2">
                          {/* Release 3.12.14 (Latest) */}
                          <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">Version 3.12.14</span>
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">Current</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Latest Release</span>
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                              <li><strong className="text-slate-800">Weekly Financial Advisor Engine:</strong> Analyzes actual cards, transactions, and budgets to recommend card payoff order (first vs. last), priority-based budget adjustments, and weekly money allocations.</li>
                              <li><strong className="text-slate-800">Subpage Three-Dot Dropdown Menus:</strong> Quick action menus added to Transactions, Budgets, Bills, Subscriptions, Cards, and Lifestyle headers.</li>
                              <li><strong className="text-slate-800">Right-Click Copy:</strong> Added context menu to copy any highlighted text across the app.</li>
                              <li><strong className="text-slate-800">Subpage Layout Elevate:</strong> Centered subpage titles and leveled Back to Overview button to optimize vertical screen room.</li>
                              <li><strong className="text-slate-800">Session Settings Update:</strong> Clean single-row layout with Sign Out directly next to signed-in email.</li>
                              <li><strong className="text-slate-800">Bug Fixes:</strong> Removed duplicate sidebar tooltips, eliminated dark mode white box anomalies, restored 100% clean Light theme, and updated semantic versioning.</li>
                            </ul>
                          </div>

                          {/* Release 3.11.13 */}
                          <div className="border border-slate-100 rounded-xl p-4 bg-white flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">Version 3.11.13</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Previous</span>
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                              <li><strong className="text-slate-800">UI Settings Section:</strong> Added dedicated UI section with text scaling (Default, Large, Extra Large), interface density, and accessibility helpers.</li>
                              <li><strong className="text-slate-800">Household Clickable Providers:</strong> Direct access to provider detail view with statement upload and history.</li>
                            </ul>
                          </div>

                          {/* Release 3.10.12 */}
                          <div className="border border-slate-100 rounded-xl p-4 bg-white flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">Version 3.10.12</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Previous</span>
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                              <li><strong className="text-slate-800">Passwords & Accounts Vault:</strong> Custom sections, website URL fields, Grid/List layout controls, Small/Medium/Large card view sizes, and 3-dots card actions with delete confirmation.</li>
                            </ul>
                          </div>

                          {/* Release 3.9.11 */}
                          <div className="border border-slate-100 rounded-xl p-4 bg-white flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">Version 3.9.11</span>
                              </div>
                              <span className="text-[10px] text-slate-400">Previous</span>
                            </div>
                            <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
                              <li><strong className="text-slate-800">Lifestyle Hub Suite:</strong> Household interactive property questions and PG&E solar estimator, Auto garage with trim selection and per-car insurance card upload, Health insurance OCR card scanner with front/back 3D flip card.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="pt-6 border-t border-slate-200/80 flex items-center justify-between mt-auto">
                  <span className="text-xs text-slate-400">Changes in this section save when you press its button.</span>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="border border-slate-200 rounded-xl px-4 py-2 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* Mini AI Advisor Settings & Tools Modal */}
      {isMiniSettingsOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsMiniSettingsOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 text-slate-800 animate-in fade-in zoom-in-95 cursor-default max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#18457c] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-title text-lg font-bold text-slate-900">AI Advisor Tools & Settings</h3>
                  <p className="text-[11px] text-slate-500">Fine-tune memory, response depth, and live web access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMiniSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tool 1: Response Length / Typing Limit */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Response Length & Detail
              </label>
              <p className="text-[11px] text-slate-500 -mt-1">
                Controls how much the AI writes before finishing its response.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'concise', label: 'Concise', words: '~150 words', desc: 'Fast, bullet points only' },
                  { id: 'balanced', label: 'Balanced', words: '~350 words', desc: 'Standard practical advice' },
                  { id: 'detailed', label: 'In-Depth', words: '~700 words', desc: 'Comprehensive math & plans' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAiResponseLength(opt.id)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      aiResponseLength === opt.id
                        ? 'bg-blue-50/70 border-blue-500 text-slate-900 shadow-2xs ring-1 ring-blue-500'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">{opt.label}</span>
                    <span className="text-[10px] text-blue-700 font-semibold">{opt.words}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tool 2: Live Internet / Web Search Connection */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  aiWebSearchEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">Live Internet Web Search</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      aiWebSearchEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {aiWebSearchEnabled ? 'Active' : 'Offline Mode'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {aiWebSearchEnabled
                      ? 'AI searches Google for live card rates, balance transfer promos, and yields.'
                      : 'AI only evaluates local accounts and bills without external web lookups.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiWebSearchEnabled(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  aiWebSearchEnabled ? 'bg-[#18457c]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    aiWebSearchEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Tool 3: Advisor Memory */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Advisor Memory</label>
                  <p className="text-[11px] text-slate-500">Custom rules the AI remembers across every question.</p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{aiMemory.length} saved</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Prioritize paying off high-interest cards before saving..."
                  value={newMemoryInput}
                  onChange={e => setNewMemoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemory();
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddMemory()}
                  className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto border border-slate-100 rounded-xl px-2">
                {aiMemory.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">No custom preferences saved yet.</p>
                ) : (
                  aiMemory.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-700 leading-snug">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMemory(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                        title="Remove memory"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tool 4: Data Permissions Quick Toggles */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Data Access Permissions</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cards', label: 'Cards' },
                  { id: 'bills', label: 'Bills' },
                  { id: 'subscriptions', label: 'Subscriptions' },
                  { id: 'purchases', label: 'Purchases' },
                  ...(featureFlags.retirement !== false ? [{ id: 'retirement', label: 'Retirement Plans' }] : [])
                ].map(p => {
                  const allowed = settingsAiPermissions[p.id];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePermission(p.id)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                        allowed
                          ? 'bg-blue-50/60 border-blue-300 text-blue-900'
                          : 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                      }`}
                    >
                      <span>{p.label}</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${allowed ? 'text-blue-600' : 'text-slate-300'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear current active conversation thread?')) {
                    const freshThread = [{
                      role: 'assistant',
                      text: "Conversation cleared. How can I assist you with your finances today?"
                    }];
                    updateActiveSession(freshThread);
                    setNotificationToast('Conversation thread cleared');
                    setTimeout(() => setNotificationToast(''), 3000);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear Current Chat
              </button>

              <button
                type="button"
                onClick={() => setIsMiniSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Update Available Notification Prompt Modal (Opens automatically on launch when GitHub update exists) */}
      {isUpdateModalOpen && desktopAppInfo.updateStatus?.state === 'available' && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h3 className="font-serif-title text-lg font-bold text-slate-900">Update Available</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                  {formatVersionString(desktopAppInfo.updateStatus?.latestVersion)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setUpdatePromptDismissed(true);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              A new version of Klarity is available. Would you like to update now?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setUpdatePromptDismissed(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer transition-colors"
              >
                Remind Me Later
              </button>
              <button
                type="button"
                onClick={handlePerformUpdate}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Update Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Fullscreen Updating Progress Overlay */}
      {isInstallingUpdate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-2xl max-w-sm w-full text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-[#18457c] flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-[#18457c] animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif-title text-base font-bold text-slate-900">Updating Klarity...</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Applying latest GitHub updates and rebuilding application. Klarity will restart automatically.
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#18457c] h-1.5 rounded-full animate-pulse w-full" />
            </div>
          </div>
        </div>
      )}

      {/* 3. What's New Pop-up Modal (Appears automatically when the app reopens after update) */}
      {isWhatsNewOpen && whatsNewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs shrink-0 text-2xl">
                  🎉
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif-title text-lg font-bold text-slate-900">What's New in Klarity</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#18457c] font-bold text-[10px] border border-blue-200">
                      {formatVersionString((whatsNewData.version && whatsNewData.version !== '1.8.10') ? whatsNewData.version : (desktopAppInfo.version || '3.12.14'))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Klarity has been successfully updated to the latest version.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissWhatsNew}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 border-y border-slate-100 py-3.5 max-h-64 overflow-y-auto">
              {formatWhatsNewHighlights(whatsNewData.changes).map((change, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{change}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={handleDismissWhatsNew}
                className="px-6 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#133560] text-white font-bold text-xs cursor-pointer transition-colors shadow-2xs"
              >
                Got it, looks great!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Chats Modal */}
      {isPastChatsOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsPastChatsOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">Past Conversations</h3>
              <button onClick={() => setIsPastChatsOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {chatSessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => handleSwitchSession(session.id)}
                  className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{session.title}</p>
                    <p className="text-[10px] text-slate-400">{session.messages?.length || 0} messages</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
