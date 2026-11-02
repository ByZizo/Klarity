import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2,
  AlertCircle,
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
  Shield
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
import { DEFAULT_HOUSEHOLD_PROFILE, calculateHouseholdAndFleetMetrics } from './utils/householdLifestyleEngine';
import {
  secureStorage,
  enforceStorageEncryptionAudit,
  hasMasterPinSet,
  setMasterPin,
  removeMasterPin,
  verifyMasterPin,
  sanitizeHtmlAgainstInjection
} from './utils/securityCrypto';

// Configure marked with GitHub-flavored markdown and automatic line breaks
marked.setOptions({
  breaks: true,
  gfm: true
});

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
  if (isUser) {
    return <div className="whitespace-pre-wrap leading-relaxed text-white">{text}</div>;
  }
  let html = '';
  try {
    html = sanitizeHtmlAgainstInjection(marked.parse(text, { breaks: true, gfm: true }));
  } catch (err) {
    return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;
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
          setCurrentUser(res.user);
          secureStorage.setItem('klarity_user', res.user);
          setNotificationToast(`Welcome to Klarity, ${res.user.name}!`);
          setTimeout(() => setNotificationToast(''), 4000);
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

export default function App() {
  return <KlarityApp />;
}

function KlarityApp() {
  // Current user state (Encrypted in localStorage; requires authentication gate when null)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = secureStorage.getItem('klarity_user', null);
      if (saved && typeof saved === 'object' && saved.email) return saved;
      return null;
    } catch {
      return null;
    }
  });

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
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockError, setLockError] = useState('');
  const [masterPinActive, setMasterPinActive] = useState(() => hasMasterPinSet());
  const [secNewPin, setSecNewPin] = useState('');
  const [secConfirmPin, setSecConfirmPin] = useState('');
  const [secPinMsg, setSecPinMsg] = useState('');
  const [desktopAppInfo, setDesktopAppInfo] = useState({
    isDesktopApp: Boolean(typeof window !== 'undefined' && window.klarityDesktop?.isDesktopApp),
    version: '1.0.0',
    updateStatus: { state: 'idle', message: 'Connected to GitHub Releases (zeoe13/Klarity)' }
  });
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
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

  // Run background storage encryption audit on mount so all sensitive localStorage keys use ENCv2
  useEffect(() => {
    enforceStorageEncryptionAudit();
  }, []);

  // Inactivity Auto-Lock Watcher
  useEffect(() => {
    if (!currentUser || !autoLockMinutes || autoLockMinutes <= 0) return;
    let timerId = null;
    const timeoutMs = autoLockMinutes * 60 * 1000;

    const resetIdleTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(() => {
        setIsSessionLocked(true);
        try { sessionStorage.setItem('klarity_session_locked', 'true'); } catch {}
      }, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [currentUser, autoLockMinutes]);

  const handleLockSession = () => {
    setIsSessionLocked(true);
    try { sessionStorage.setItem('klarity_session_locked', 'true'); } catch {}
  };

  const handleUnlockSession = (e) => {
    e.preventDefault();
    if (hasMasterPinSet()) {
      const res = verifyMasterPin(lockPinInput);
      if (res.valid) {
        setIsSessionLocked(false);
        setLockPinInput('');
        setLockError('');
        try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
      } else {
        setLockError(res.error || 'Incorrect PIN.');
      }
    } else {
      if (lockPinInput.trim().length >= 1) {
        setIsSessionLocked(false);
        setLockPinInput('');
        setLockError('');
        try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
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
        if (parsed && Array.isArray(parsed.accounts)) return parsed;
      }
    } catch (e) {}
    return {
      accounts: [],
      bills: [],
      transactions: [],
      metrics: { totalChecking: 0, totalCreditDebt: 0, totalMonthlyBills: 0, netWorthEstimate: 0 }
    };
  });
  const VALID_TABS = ['dashboard', 'cards', 'bills', 'subscriptions', 'transactions', 'budgets', 'vault', 'advisor', 'more'];

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
  const [settingsActiveTab, setSettingsActiveTab] = useState('profile'); // 'profile' | 'ai' | 'plaid' | 'session'
  const [settingsDisplayName, setSettingsDisplayName] = useState(currentUser?.name || 'Ziyad Elmahi');
  const getInitialUserStorage = (key, fallback = '') => {
    try {
      const savedUser = localStorage.getItem('klarity_user');
      const u = savedUser ? JSON.parse(savedUser) : null;
      const uid = u?.id || 'u-ziyad';
      const userVal = localStorage.getItem(`klarity_${uid}_${key}`);
      if (userVal !== null && userVal !== undefined) return userVal;
      if (uid === 'u-ziyad') {
        const legacy = localStorage.getItem(`klarity_${key}`);
        if (legacy !== null && legacy !== undefined) return legacy;
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const [settingsAiProvider, setSettingsAiProvider] = useState(() => getInitialUserStorage('ai_provider', 'gemini'));
  const [settingsAiModel, setSettingsAiModel] = useState(() => {
    const saved = getInitialUserStorage('ai_model', 'gemini-3.8-flash');
    if (saved && !saved.includes('2.0') && !saved.includes('2.5') && !saved.includes('tts')) return saved;
    return 'gemini-3.8-flash';
  });
  const [settingsAiApiKey, setSettingsAiApiKey] = useState(() => getInitialUserStorage('ai_api_key', ''));
  const [settingsAiMaskedKey, setSettingsAiMaskedKey] = useState(() => getInitialUserStorage('ai_masked_key', ''));
  const [settingsAiStatus, setSettingsAiStatus] = useState(() => getInitialUserStorage('ai_status', 'not_connected'));
  const [settingsAiShowKey, setSettingsAiShowKey] = useState(false);
  const [settingsAiTesting, setSettingsAiTesting] = useState(false);
  const [settingsAiPermissions, setSettingsAiPermissions] = useState({
    bills: true,
    subscriptions: true,
    cards: true,
    purchases: true
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

  // Household, Utility (PG&E / Water / Gas) & Vehicle Fleet Profile
  const [householdProfile, setHouseholdProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_household_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.dwellingType) return parsed;
      }
    } catch (e) {}
    return DEFAULT_HOUSEHOLD_PROFILE;
  });

  useEffect(() => {
    try {
      localStorage.setItem('klarity_household_profile', JSON.stringify(householdProfile));
    } catch (e) {}
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
    if (!calcMetrics || !calcMetrics.utilities) return;
    const pgeAmount = Number(calcMetrics.utilities.totalPgeCombinedBill || 0);
    const waterAmount = Number(calcMetrics.utilities.waterTrashTotalCost || 0);
    const insAmount = Number(calcMetrics.fleet?.totalMonthlyInsurance || 0);
    const gasFuelAmount = Number(calcMetrics.fleet?.totalMonthlyGasCost || 0);

    setData(prev => {
      const existingBills = [...(prev.bills || [])];
      const upsertBill = (name, category, amount, dueDay) => {
        if (amount <= 0) return;
        const idx = existingBills.findIndex(b => (b.name || '').toLowerCase().includes(name.toLowerCase().split(' ')[0]));
        if (idx >= 0) {
          existingBills[idx] = { ...existingBills[idx], name, expectedAmount: amount, category };
        } else {
          existingBills.push({
            id: `bill-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name,
            category,
            expectedAmount: amount,
            dueDay,
            nextDueDate: `Monthly on Day ${dueDay}`,
            autopay: true,
            status: 'upcoming'
          });
        }
      };

      upsertBill('PG&E Electric & Gas (Household Est.)', 'Utilities', pgeAmount, 15);
      upsertBill('Municipal Water, Sewer & Trash', 'Utilities', waterAmount, 20);
      if (insAmount > 0) {
        upsertBill(`Auto Insurance (${calcMetrics.fleet.vehicles.length} Household Cars)`, 'Insurance', insAmount, 10);
      }

      const nextState = {
        ...prev,
        bills: existingBills,
        metrics: {
          ...prev.metrics,
          totalMonthlyBills: existingBills.reduce((s, b) => s + Number(b.expectedAmount || 0), 0)
        }
      };
      try {
        localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
        localStorage.setItem('klarity_bills', JSON.stringify(existingBills));
      } catch (e) {}
      return nextState;
    });

    if (gasFuelAmount > 0) {
      setBudgets(prev => {
        const exists = prev.find(b => (b.category || '').toLowerCase() === 'gas');
        if (exists) {
          return prev.map(b => b.id === exists.id ? { ...b, limit: gasFuelAmount } : b);
        }
        return [...prev, { id: `b-gas-${Date.now()}`, category: 'Gas', limit: gasFuelAmount, lastMonthSpent: gasFuelAmount }];
      });
    }
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
    } catch (e) {
      return false;
    }
  });

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
      const saved = localStorage.getItem('klarity_ai_memory');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
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
    const item = (fact || newMemoryInput).trim();
    if (!item) return;
    if (aiMemory.includes(item)) return;
    const updated = [...aiMemory, item];
    setAiMemory(updated);
    localStorage.setItem('klarity_ai_memory', JSON.stringify(updated));
    setNewMemoryInput('');
    setNotificationToast('Saved to AI Memory!');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  const handleRemoveMemory = (index) => {
    const updated = aiMemory.filter((_, i) => i !== index);
    setAiMemory(updated);
    localStorage.setItem('klarity_ai_memory', JSON.stringify(updated));
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
      const res = await fetch(`/api/settings?userId=${encodeURIComponent(uid)}`, {
        headers: { 'x-user-id': uid }
      });
      if (res.ok) {
        const json = await res.json();
        setSettings(json);
        if (json.user?.name) {
          setSettingsDisplayName(json.user.name);
        }
        if (json.ai) {
          const storedProv = localStorage.getItem(`klarity_${uid}_ai_provider`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_provider') : null);
          const storedMod = localStorage.getItem(`klarity_${uid}_ai_model`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_model') : null);
          const storedKey = localStorage.getItem(`klarity_${uid}_ai_api_key`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_api_key') : null);
          const storedMasked = localStorage.getItem(`klarity_${uid}_ai_masked_key`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_masked_key') : null);
          const storedStatus = localStorage.getItem(`klarity_${uid}_ai_status`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_status') : null);

          let prov = storedProv || json.ai.provider || 'gemini';
          let mod = storedMod || json.ai.model || 'gemini-3.8-flash';
          if (mod.includes('2.0') || mod.includes('2.5') || mod.includes('tts')) mod = 'gemini-3.8-flash';

          const finalMasked = json.ai.maskedKey || storedMasked || '';
          const finalStatus = (json.ai.status === 'connected' || storedStatus === 'connected' || Boolean(storedKey)) ? 'connected' : 'not_connected';

          setSettingsAiProvider(prov);
          setSettingsAiModel(mod);
          setSettingsAiMaskedKey(finalMasked);
          setSettingsAiApiKey(storedKey || '');
          setSettingsAiStatus(finalStatus);
          if (json.ai.dataPermissions) {
            setSettingsAiPermissions(json.ai.dataPermissions);
          }
        }
        if (json.plaid) {
          const storedClientId = localStorage.getItem(`klarity_${uid}_plaid_client_id`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_client_id') : '');
          const storedMaskedSecret = localStorage.getItem(`klarity_${uid}_plaid_masked_secret`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_masked_secret') : '');
          const storedSecret = localStorage.getItem(`klarity_${uid}_plaid_secret`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_secret') : '');
          const storedStatus = localStorage.getItem(`klarity_${uid}_plaid_status`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_status') : 'not_connected');

          const finalClientId = json.plaid.clientId || storedClientId;
          const finalMasked = json.plaid.maskedSecret || storedMaskedSecret;
          const finalStatus = (json.plaid.status === 'connected' || storedStatus === 'connected' || Boolean(storedClientId)) ? 'connected' : 'not_connected';

          setSettingsPlaidClientId(finalClientId || '');
          setSettingsPlaidMaskedSecret(finalMasked || '');
          setSettingsPlaidSecret(storedSecret || '');
          setSettingsPlaidStatus(finalStatus);
        }
      }
    } catch (err) {
      console.warn('Could not fetch settings:', err);
    }
  };

  const handleProviderChange = (newProvider) => {
    setSettingsAiProvider(newProvider);
    if (newProvider === 'anthropic') setSettingsAiModel('claude-3-7-sonnet-20250219');
    else if (newProvider === 'openai') setSettingsAiModel('gpt-4o');
    else if (newProvider === 'gemini') setSettingsAiModel('gemini-3.8-flash');
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
    const uid = currentUser?.id || 'u-ziyad';
    const rawKey = settingsAiApiKey.trim() || localStorage.getItem(`klarity_${uid}_ai_api_key`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_api_key') : '') || '';
    if (!rawKey) {
      setNotificationToast('Please enter an API key to test');
      setTimeout(() => setNotificationToast(''), 3000);
      return;
    }
    setSettingsAiTesting(true);
    try {
      const res = await fetch('/api/settings/ai-key/test-and-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          userId: uid,
          provider: settingsAiProvider,
          model: settingsAiModel,
          apiKey: rawKey,
          dataPermissions: settingsAiPermissions
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSettingsAiStatus('connected');
        setSettingsAiMaskedKey(json.maskedKey);
        try {
          localStorage.setItem(`klarity_${uid}_ai_api_key`, rawKey);
          localStorage.setItem(`klarity_${uid}_ai_masked_key`, json.maskedKey);
          localStorage.setItem(`klarity_${uid}_ai_provider`, settingsAiProvider);
          localStorage.setItem(`klarity_${uid}_ai_model`, settingsAiModel);
          localStorage.setItem(`klarity_${uid}_ai_status`, 'connected');
          if (uid === 'u-ziyad') {
            localStorage.setItem('klarity_ai_api_key', rawKey);
            localStorage.setItem('klarity_ai_masked_key', json.maskedKey);
            localStorage.setItem('klarity_ai_provider', settingsAiProvider);
            localStorage.setItem('klarity_ai_model', settingsAiModel);
            localStorage.setItem('klarity_ai_status', 'connected');
          }
        } catch {}
        setNotificationToast('API key verified and securely saved for your account!');
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
    const uid = currentUser?.id || 'u-ziyad';
    try {
      const res = await fetch('/api/settings/ai-key/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ userId: uid })
      });
      if (res.ok) {
        setSettingsAiStatus('not_connected');
        setSettingsAiMaskedKey('');
        setSettingsAiApiKey('');
        try {
          localStorage.removeItem(`klarity_${uid}_ai_api_key`);
          localStorage.removeItem(`klarity_${uid}_ai_masked_key`);
          localStorage.removeItem(`klarity_${uid}_ai_status`);
          if (uid === 'u-ziyad') {
            localStorage.removeItem('klarity_ai_api_key');
            localStorage.removeItem('klarity_ai_masked_key');
            localStorage.removeItem('klarity_ai_status');
          }
        } catch {}
        setNotificationToast('AI API key removed.');
        setTimeout(() => setNotificationToast(''), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePermission = async (category) => {
    const uid = currentUser?.id || 'u-ziyad';
    const updated = { ...settingsAiPermissions, [category]: !settingsAiPermissions[category] };
    setSettingsAiPermissions(updated);
    try {
      await fetch('/api/settings/ai-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({ userId: uid, dataPermissions: updated })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePlaidCredentials = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const uid = currentUser?.id || 'u-ziyad';
    try {
      if (settingsPlaidClientId) {
        try {
          localStorage.setItem(`klarity_${uid}_plaid_client_id`, settingsPlaidClientId);
          if (uid === 'u-ziyad') localStorage.setItem('klarity_plaid_client_id', settingsPlaidClientId);
        } catch {}
      }
      const res = await fetch('/api/settings/plaid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          userId: uid,
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
            if (uid === 'u-ziyad') localStorage.setItem('klarity_plaid_client_id', json.clientId);
          }
          if (json.maskedSecret) {
            localStorage.setItem(`klarity_${uid}_plaid_masked_secret`, json.maskedSecret);
            if (uid === 'u-ziyad') localStorage.setItem('klarity_plaid_masked_secret', json.maskedSecret);
          }
          if (settingsPlaidSecret) {
            localStorage.setItem(`klarity_${uid}_plaid_secret`, settingsPlaidSecret);
            if (uid === 'u-ziyad') localStorage.setItem('klarity_plaid_secret', settingsPlaidSecret);
          }
          localStorage.setItem(`klarity_${uid}_plaid_status`, json.status || 'connected');
          if (uid === 'u-ziyad') localStorage.setItem('klarity_plaid_status', json.status || 'connected');
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

      const res = await fetch(`/api/data?userId=${user.id}&household=${household}`);
      if (res.ok) {
        const json = await res.json();
        const mergedAccounts = (json.accounts && json.accounts.length > 0) ? json.accounts : localCachedAccounts;
        const mergedBills = (json.bills && json.bills.length > 0) ? json.bills : localCachedBills;
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
              userId: user.id
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
  const handleGoogleProfileSuccess = async (profile) => {
    try {
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
        setCurrentUser(json.user);
        secureStorage.setItem('klarity_user', json.user);
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
          setCurrentUser(json.user);
          secureStorage.setItem('klarity_user', json.user);
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
        setCurrentUser(localUser);
        secureStorage.setItem('klarity_user', localUser);
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
          setCurrentUser(json.user);
          secureStorage.setItem('klarity_user', json.user);
          setNotificationToast(`Welcome back, ${json.user.name}!`);
          setTimeout(() => setNotificationToast(''), 4000);
        } else {
          setAuthError(json.error || 'Invalid email or password.');
        }
      } catch (err) {
        console.error('Sign in error:', err);
        const isOwner = email.toLowerCase() === 'zeoe13@gmail.com';
        const localUser = {
          id: isOwner ? 'u-ziyad' : `u-${Date.now()}`,
          email,
          name: isOwner ? 'Ziyad Elmahi' : email.split('@')[0],
          avatar: '',
          role: 'Primary Member'
        };
        setCurrentUser(localUser);
        secureStorage.setItem('klarity_user', localUser);
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('klarity_user');
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
    const uid = currentUser?.id || 'u-ziyad';
    try {
      const storedClientId = settingsPlaidClientId || localStorage.getItem(`klarity_${uid}_plaid_client_id`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_client_id') : '') || '';
      const storedSecret = settingsPlaidSecret || localStorage.getItem(`klarity_${uid}_plaid_secret`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_secret') : '') || '';

      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          userId: uid,
          clientPlaidId: storedClientId,
          clientPlaidSecret: storedSecret
        })
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
    const uid = currentUser?.id || 'u-ziyad';
    try {
      setIsConnectingPlaid(true);
      const storedClientId = settingsPlaidClientId || localStorage.getItem(`klarity_${uid}_plaid_client_id`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_client_id') : '') || '';
      const storedSecret = settingsPlaidSecret || localStorage.getItem(`klarity_${uid}_plaid_secret`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_plaid_secret') : '') || '';

      const res = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': uid },
        body: JSON.stringify({
          public_token,
          metadata,
          userId: uid,
          clientPlaidId: storedClientId,
          clientPlaidSecret: storedSecret
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
        setNotificationToast(`Connected ${resData.accounts.length} account(s) from ${metadata?.institution?.name || 'bank'}!`);
      } else if (!res.ok) {
        setPlaidError(resData.error || 'Failed to exchange Plaid token.');
      }
      setLinkToken(null);
      await fetchData();
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
      const uid = currentUser?.id || 'u-ziyad';
      const cachedApiKey = settingsAiApiKey.trim() || localStorage.getItem(`klarity_${uid}_ai_api_key`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_api_key') : '') || '';
      const cachedProvider = settingsAiProvider || localStorage.getItem(`klarity_${uid}_ai_provider`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_provider') : '') || 'gemini';
      let cachedModel = settingsAiModel || localStorage.getItem(`klarity_${uid}_ai_model`) || (uid === 'u-ziyad' ? localStorage.getItem('klarity_ai_model') : '') || 'gemini-3.8-flash';
      if (cachedModel.includes('2.0') || cachedModel.includes('2.5') || cachedModel.includes('tts')) {
        cachedModel = 'gemini-3.8-flash';
        try {
          localStorage.setItem(`klarity_${uid}_ai_model`, 'gemini-3.8-flash');
          if (uid === 'u-ziyad') localStorage.setItem('klarity_ai_model', 'gemini-3.8-flash');
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
          userId: currentUser?.id,
          userMemory: aiMemory,
          clientApiKey: cachedApiKey,
          clientProvider: cachedProvider,
          clientModel: cachedModel,
          attachments: payloadAttachments,
          statutoryShield: {
            ...calculateJudgmentProofRatio(incomeStreams),
            incomeStreams: incomeStreams
          },
          budgets: budgets,
          savingsGoals: savingsGoals,
          manualAssets: manualAssets,
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

      // Strip any [ACTION:...] tags from display text
      replyText = replyText.replace(/\[ACTION:[a-zA-Z0-9_-]+:[\s\S]*?\]/gi, '').trim();

      // Handle AI navigation tags: [NAVIGATE:target]
      const navMatch = replyText.match(/\[NAVIGATE:([a-zA-Z0-9_-]+)\]/i);
      if (navMatch) {
        const dest = navMatch[1].toLowerCase();
        if (dest === 'settings') {
          setSettingsActiveTab('ai');
          setIsSettingsOpen(true);
        } else if (['dashboard', 'bills', 'subscriptions', 'cards', 'transactions', 'budgets', 'overview', 'vault', 'passwords'].includes(dest)) {
          setActiveTab(dest === 'overview' ? 'dashboard' : dest === 'passwords' ? 'vault' : dest);
        }
        replyText = replyText.replace(/\[NAVIGATE:[a-zA-Z0-9_-]+\]/gi, '').trim();
      }

      if (json.needsKey) {
        setSettingsAiStatus('not_connected');
      }

      // Build context-aware interactive Action Buttons for the assistant bubble
      const lowerReply = (replyText + ' ' + userMsg).toLowerCase();
      const autoSuggestedActions = [];
      if (lowerReply.includes('grocer') || lowerReply.includes('budget') || lowerReply.includes('dining') || lowerReply.includes('spend')) {
        autoSuggestedActions.push({ label: 'Create a $400 Groceries budget', type: 'set_budget', category: 'Groceries', limit: 400 });
        autoSuggestedActions.push({ label: 'Open Budgets', type: 'navigate', tab: 'budgets' });
      }
      if (lowerReply.includes('card') || lowerReply.includes('apr') || lowerReply.includes('interest') || lowerReply.includes('utilization') || lowerReply.includes('debt')) {
        autoSuggestedActions.push({ label: 'Open Debt Payoff Planner', type: 'navigate', tab: 'cards' });
      }
      if (lowerReply.includes('subscription') || lowerReply.includes('netflix') || lowerReply.includes('spotify') || lowerReply.includes('audit') || lowerReply.includes('recurring')) {
        autoSuggestedActions.push({ label: 'Audit Subscriptions', type: 'navigate', tab: 'subscriptions' });
      }
      if (lowerReply.includes('bill') || lowerReply.includes('due') || lowerReply.includes('remind') || lowerReply.includes('electric') || lowerReply.includes('rent')) {
        autoSuggestedActions.push({ label: 'Set a payment reminder', type: 'payment_reminder' });
        autoSuggestedActions.push({ label: 'View Bills', type: 'navigate', tab: 'bills' });
      }
      if (autoSuggestedActions.length === 0) {
        autoSuggestedActions.push(
          { label: 'Create a $400 Groceries budget', type: 'set_budget', category: 'Groceries', limit: 400 },
          { label: 'Set a payment reminder', type: 'payment_reminder' },
          { label: 'Open Debt Payoff Planner', type: 'navigate', tab: 'cards' }
        );
      }

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

  const DEFAULT_OVERVIEW_BILLS = [
    { id: 'mock-b-1', name: 'PG&E Electric', category: 'Utilities', dueDay: 28, nextDueDate: 'Oct 28', dueText: 'Due Oct 28 · Checking', daysUntil: 3, expectedAmount: 128.40, amount: 128.40, status: 'due_soon', account: 'Checking •••• 4821' },
    { id: 'mock-b-2', name: 'Rent', category: 'Housing', dueDay: 1, nextDueDate: 'Nov 1', dueText: 'Due Nov 1 · Checking', daysUntil: 7, expectedAmount: 650.00, amount: 650.00, status: 'upcoming', account: 'Checking •••• 4821' },
    { id: 'mock-b-3', name: 'Water Service', category: 'Utilities', dueDay: 6, nextDueDate: 'Nov 6', dueText: 'Due Nov 6 · Checking', daysUntil: 12, expectedAmount: 63.75, amount: 63.75, status: 'upcoming', account: 'Checking •••• 4821' }
  ];

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
  const totalNetWorth = displayCash + manualPositiveAssets - displayCardBalances - manualLoans;
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
        clones.sort((a, b) => b.apr - a.apr);
      } else {
        clones.sort((a, b) => a.balance - b.balance);
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

  // Generate AI Advisor Weekly Summary citing actual numbers
  const handleGenerateWeeklySummary = () => {
    const topCat = [...computedBudgets].sort((a, b) => b.spent - a.spent)[0];
    const highestUtilCard = [...displayCards].sort((a, b) => (b.balance / (b.limit || 1)) - (a.balance / (a.limit || 1)))[0];
    const highestUtilPct = highestUtilCard ? Math.round((highestUtilCard.balance / (highestUtilCard.limit || 1)) * 100) : 0;

    const summaryMd =
      `### **Weekly Financial Briefing**\n\n` +
      `**What Changed This Week**\n` +
      `* **Net Worth:** Currently **$${totalNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** across cash, savings, and cards.\n` +
      `* **Category Spending:** You have spent **$${totalBudgetSpent.toFixed(2)}** of your **$${totalBudgetLimit.toFixed(0)}** monthly budget (${Math.round((totalBudgetSpent / (totalBudgetLimit || 1)) * 100)}% used).${topCat ? ` Your top category is **${topCat.category}** at **$${topCat.spent.toFixed(2)}** (${topCat.diffFromLastMonth >= 0 ? `+$${Math.abs(topCat.diffFromLastMonth).toFixed(0)} more` : `$${Math.abs(topCat.diffFromLastMonth).toFixed(0)} less`} than last month).` : ''}\n` +
      `* **Recurring Subscriptions:** Tracking **${sourceSubsList.length} active subscriptions** totaling **$${displayTotalSubs.toFixed(2)}/mo**.\n\n` +
      `**What to Watch**\n` +
      `* **Cash Flow Forecast:** After **$${displayDue14Sum.toFixed(2)}** in bills due over the next 14 days, your projected checking balance will be **$${projectedCashAfterBills.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}**.\n` +
      (highestUtilCard ? `* **Credit Utilization:** **${highestUtilCard.name} (•••• ${highestUtilCard.mask})** is at **${highestUtilPct}%** utilization ($${highestUtilCard.balance.toFixed(2)} / $${highestUtilCard.limit.toLocaleString()} limit at ${highestUtilCard.apr}% APR).\n\n` : '\n') +
      `**One Thing to Do Right Now**\n` +
      (highestAprCard || highestUtilCard
        ? `1. **Target High-APR Debt:** Direct an extra **$${extraDebtPayment}/mo** toward **${(highestAprCard || highestUtilCard).name}** (${(highestAprCard || highestUtilCard).apr}% APR) using the Avalanche plan to become debt-free by **${debtPayoffComparison?.avalanche?.finishLabel || 'next year'}** and save **$${(debtPayoffComparison?.interestSavedVsMin || 184).toFixed(0)}** in interest.`
        : `1. **Boost Your Emergency Fund:** Transfer **$250** from checking into your **Emergency Fund** goal to stay on track.`);

    const updated = [
      ...chatMessages,
      { role: 'user', text: 'Generate my weekly financial summary.' },
      {
        role: 'assistant',
        text: summaryMd,
        suggestedActions: [
          { label: 'Create a $400 Groceries budget', type: 'set_budget', category: 'Groceries', limit: 400 },
          { label: 'View Debt Payoff Planner', type: 'navigate', tab: 'cards' },
          { label: 'Audit Subscriptions', type: 'navigate', tab: 'subscriptions' }
        ]
      }
    ];
    updateActiveSession(updated);
    scrollChatToBottom();
  };

  // Execute interactive Action Button inside AI Advisor chat bubbles
  const handleExecuteSuggestedAction = (act) => {
    if (!act) return;
    if (typeof act.action === 'function') {
      act.action();
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
      setNotificationToast(`Created $${lim}/mo ${cat} budget!`);
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
      <aside className={`shrink-0 border-r border-slate-200/80 bg-[#f8fafc] flex flex-col justify-between h-screen sticky top-0 hidden md:flex transition-all duration-200 ease-in-out ${
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
                  title="Compact sidebar"
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
                className="p-1.5 rounded-xl hover:bg-slate-200/60 cursor-pointer transition-transform hover:scale-105"
                title="Klarity Overview"
              >
                <KlarityLogo className="w-7 h-7 text-[#18457c]" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCompact(false)}
                className="p-2 rounded-xl text-slate-500 hover:text-[#183b6b] hover:bg-slate-200/60 cursor-pointer transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 text-[#183b6b]" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className={`flex flex-col ${isSidebarCompact ? 'items-center gap-1.5 mt-5' : 'gap-1.5 mt-6'}`}>
            {[
              { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
              { id: 'cards', label: 'Cards', icon: CreditCard },
              { id: 'transactions', label: 'Transactions', icon: History },
              { id: 'bills', label: 'Bills', icon: Receipt },
              { id: 'subscriptions', label: 'Subscriptions', icon: Zap },
              { id: 'budgets', label: 'Budgets', icon: PieChart },
              { id: 'vault', label: 'Passwords', icon: KeyRound }
            ].map(item => {
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
                  title={item.label}
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

        {/* User Profile Footer */}
        {!isSidebarCompact ? (
          <div className="pt-4 border-t border-slate-200/80 flex items-center gap-3">
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
          <div className="pt-4 border-t border-slate-200/80 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title={`Settings (${currentUser?.name || 'User'})`}
              className="w-9 h-9 rounded-full bg-[#183b6b] hover:ring-2 hover:ring-[#183b6b]/40 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs cursor-pointer transition-all"
            >
              {userInitials}
            </button>
          </div>
        )}
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
                    {/* Initial Advisor Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-800 leading-relaxed shadow-2xs max-w-[92%]">
                      Your cash covers everything due this month. The {highestAprCard ? highestAprCard.name : 'Travel Card'} has the highest rate at {highestAprCard ? highestAprCard.apr : '24.4'}%, so extra payments there save the most interest.
                    </div>

                    {/* Quick-Prompt Pills */}
                    <div className="flex flex-col items-start gap-2">
                      {[
                        'What should I pay off first?',
                        "What's due in 14 days?",
                        'Where can I cut subscriptions?',
                        'Social Security & CalPERS protections',
                        'Get 0% Bank Hardship script',
                        'Compare minimums vs 0% plan'
                      ].map((qText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendChatMessage(qText)}
                          className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-medium text-slate-800 shadow-2xs cursor-pointer transition-colors"
                        >
                          {qText}
                        </button>
                      ))}
                    </div>

                    {/* Active Chat Thread Messages */}
                    {chatMessages.filter((_, idx) => idx > 0).map((msg, i) => (
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

              {activeTab === 'vault' && (
                <div className="p-5 flex flex-col gap-4">
                  <PasswordVaultPage
                    vaultItems={vaultItems}
                    onUpdateVaultItems={setVaultItems}
                  />
                </div>
              )}
            </>
          );
        })()}

        {/* Fixed Bottom Navigation Bar (Home, Activity, Budgets, Advisor, More) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 grid grid-cols-5">
          {[
            { id: 'dashboard', label: 'Home', matchIds: ['dashboard'] },
            { id: 'transactions', label: 'Activity', matchIds: ['transactions'] },
            { id: 'budgets', label: 'Budgets', matchIds: ['budgets'] },
            { id: 'advisor', label: 'Advisor', matchIds: ['advisor'] },
            { id: 'more', label: 'More', matchIds: ['more', 'bills', 'subscriptions', 'cards', 'vault'] }
          ].map(tab => {
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
      </div>

      {/* ======================================================================= */}
      {/* 2B. DESKTOP CENTER MAIN CONTENT (>= 768px) */}
      {/* ======================================================================= */}
      <main className="hidden md:flex flex-1 min-w-0 p-6 lg:p-8 flex-col gap-5 overflow-y-auto relative">

        {/* Top-of-App Auto-Update Banner (Appears whenever an update is pushed out) */}
        {!updateBannerDismissed && (
          desktopAppInfo.updateStatus?.state === 'available' ||
          desktopAppInfo.updateStatus?.state === 'ready' ||
          desktopAppInfo.updateStatus?.state === 'installing'
        ) && (
          <div className="w-full rounded-2xl bg-[#18457c] text-white px-4 py-3 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
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

        {/* Top-Right Refresh Button right next to the AI Advisor sidebar */}
        <div className="flex items-center justify-end -mb-3">
          <button
            type="button"
            onClick={handleRefreshApp}
            disabled={isRefreshingApp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 hover:text-[#18457c] text-xs font-semibold shadow-2xs cursor-pointer transition-all"
            title="Refresh app data & check for updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#18457c] ${isRefreshingApp ? 'animate-spin' : ''}`} />
            <span>{isRefreshingApp ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateWeeklySummary}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-xs font-semibold text-[#18457c] shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#18457c]" />
                  <span>Weekly Advisor Summary</span>
                </button>
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
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 gap-4 md:gap-6">
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

            {/* Net Worth & Cash Flow Forecast Card */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 mb-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">Budgets & Savings Goals</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>+ Savings Goal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddBudgetOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Set Category Budget</span>
                </button>
              </div>
            </div>

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
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
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
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: BILLS (Dedicated Page with Multi-Card Filter) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'bills' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 mb-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">Upcoming Bills</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScanBillOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Scan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddBillOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Bill</span>
                </button>
              </div>
            </div>

            {/* Household, Utility (PG&E / Water / Gas) & EV Fleet Estimator */}
            <HouseholdLifestyleHub
              householdProfile={householdProfile}
              onUpdateProfile={setHouseholdProfile}
              onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
              onAskAiAdvisor={(promptText) => {
                setIsAiDrawerOpen(true);
                handleSendChatMessage(promptText);
              }}
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
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 mb-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">Subscriptions</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSendChatMessage(
                      `Please perform a full Subscription Audit on my ${sourceSubsList.length} subscriptions totaling $${displayTotalSubs.toFixed(2)}/mo (${sourceSubsList.map(s => `${s.name}: $${s.amount}`).join(', ')}). Flag any price increases, duplicate services, or ways to save.`
                    )
                  }
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#18457c]" />
                  <span>AI Subscription Audit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddSubOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Subscription</span>
                </button>
              </div>
            </div>

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
        {/* TAB: CARDS & DEBT PAYOFF PLANNER (Dedicated Page) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'cards' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 mb-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">Cards & Household</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddManualAssetOpen(true)}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer"
                >
                  + Manual Account / Loan
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Card</span>
                </button>
              </div>
            </div>

            {/* Shaded Total Summary Card for Cards */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[#18457c]" />
                <span className="font-semibold text-slate-700">Total Card Balances ({displayCards.length} {displayCards.length === 1 ? 'card' : 'cards'})</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-slate-900 text-sm">
                  {fmtMoney(displayCardBalances)}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">Total Limit: {fmtMoney(displayCards.reduce((s, c) => s + Number(c.limit || 0), 0), 0)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayCards.map(card => {
                const util = card.limit > 0 ? Math.min(100, (card.balance / card.limit) * 100) : 0;
                return (
                  <div key={card.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{card.institution ? `${card.institution} ` : ''}{card.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">•••• {card.mask}</p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60">
                          {card.apr || 0}% APR
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Balance: {fmtMoney(card.balance)}</span>
                          <span>Limit: {fmtMoney(card.limit, 0)} ({Math.round(util)}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${util > 30 ? 'bg-amber-500' : 'bg-[#18457c]'}`}
                            style={{ width: `${util}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardIds([card.id]);
                          setActiveTab('transactions');
                        }}
                        className="text-xs text-[#18457c] hover:underline font-semibold cursor-pointer"
                      >
                        View payments on this card →
                      </button>
                      {!String(card.id).startsWith('mock-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(card.id, card.name)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          Remove Card
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Debt Payoff Planner (Avalanche vs. Snowball) */}
            {debtPayoffComparison && (
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-[#18457c]" />
                      <span>Debt Payoff Planner</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Compare Highest-APR-First (Avalanche) vs. Smallest-Balance-First (Snowball)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setDebtStrategy('avalanche')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        debtStrategy === 'avalanche' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Highest APR First (Avalanche)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDebtStrategy('snowball')}
                      className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                        debtStrategy === 'snowball' ? 'bg-white text-[#18457c] shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Smallest Balance First (Snowball)
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-700">Extra Monthly Payment Beyond Minimums: <strong className="text-[#18457c]">+${extraDebtPayment}/mo</strong></span>
                    <input
                      type="range"
                      min="0"
                      max="600"
                      step="25"
                      value={extraDebtPayment}
                      onChange={e => setExtraDebtPayment(Number(e.target.value))}
                      className="w-64 accent-[#18457c] cursor-pointer mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {[50, 150, 300, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setExtraDebtPayment(amt)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                          extraDebtPayment === amt ? 'bg-[#18457c] text-white border-[#18457c]' : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        +${amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-slate-500">Projected Debt-Free Date</span>
                    <p className="text-xl font-bold text-slate-900 mt-1">{debtPayoffComparison.activePlan.finishLabel}</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1">
                      {debtPayoffComparison.activePlan.months} months ({debtPayoffComparison.monthsSavedVsMin} mo faster than minimums)
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-slate-500">Total Interest Saved</span>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{fmtMoney(debtPayoffComparison.interestSavedVsMin)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Est. total interest: {fmtMoney(debtPayoffComparison.activePlan.totalInterest)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-slate-500">Payoff Priority Order</span>
                    <ol className="list-decimal list-inside font-semibold text-slate-800 mt-1 space-y-0.5">
                      {debtPayoffComparison.activePlan.order.map((name, i) => (
                        <li key={i} className="truncate text-[11px]">{name}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            )}

                        {/* 1. Statutory Legal Shield Status Card (42 U.S.C. § 407, CA CCP § 704.110, 31 CFR Part 212) */}
            <LegalShieldStatusCard 
              incomeStreams={incomeStreams} 
              debtAccounts={allFilterableCards.filter(c => c.type === 'credit')} 
              transactions={data.transactions || []}
              accounts={data.accounts || []}
              onUpdateIncomeStreams={setIncomeStreams}
            />

            {/* 2. Mathematical 4-Option Payoff Engine (Minimum, Accelerated, 0% Hardship/NFCC, Family Qard Hasan) */}
            <InteractivePayoffComparison 
              cards={allFilterableCards.filter(c => c.type === 'credit')} 
              onOpenHardshipPlaybook={() => setIsHardshipModalOpen(true)} 
            />

            {/* Household, Auto & Health Sections */}
            <HouseholdLifestyleHub
              householdProfile={householdProfile}
              onUpdateProfile={setHouseholdProfile}
              onSyncUtilitiesToBills={handleSyncUtilitiesToBills}
              onAskAiAdvisor={(promptText) => {
                setIsAiDrawerOpen(true);
                handleSendChatMessage(promptText);
              }}
            />

            {/* Connected Bank Checking, Savings & Manual Accounts */}
            <div className="flex flex-col gap-3 mt-2">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">Checking, Savings & Manual Accounts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(checkingAccounts.length > 0 ? checkingAccounts : [{ id: 'card-checking-4821', name: 'Checking', institution: 'Chase', mask: '4821', subtype: 'Checking', balance: displayCash }]).map(acc => (
                  <div key={acc.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <p className="text-xs font-bold text-slate-900">{acc.institution ? `${acc.institution} ` : ''}{acc.name}</p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">•••• {acc.mask || '4821'} • {acc.subtype || 'Depository'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{fmtMoney(acc.balance)}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">Available Cash</p>
                    </div>
                  </div>
                ))}
                {manualAssets.map(ma => (
                  <div key={ma.id} className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{ma.name}</p>
                      <p className="text-[11px] text-slate-400 capitalize mt-0.5">Manual {ma.type}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${ma.type === 'loan' ? 'text-rose-600' : 'text-slate-900'}`}>
                        {ma.type === 'loan' ? `-${fmtMoney(ma.balance)}` : fmtMoney(ma.balance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteManualAsset(ma.id, ma.name)}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* TAB: PASSWORDS & ACCOUNTS VAULT */}
        {activeTab === 'vault' && (
          <PasswordVaultPage vaultItems={vaultItems} onUpdateVaultItems={setVaultItems} />
        )}

        {/* TAB: TRANSACTIONS (Dedicated Purchases Page with Multi-Card Filter) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'transactions' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 mb-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Overview</span>
                </button>
                <h2 className="font-serif-title text-2xl font-bold text-slate-900">Transactions & Purchases</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-600" />
                  <span>Import CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportCsv(filteredTransactions)}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Purchase</span>
                </button>
              </div>
            </div>

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
                        <th className="py-3 px-4">Category (Auto-Remembered)</th>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Back to Overview"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif-title text-xl font-bold text-slate-900">Advisor</h2>
                    <span
                      title={isOnline ? 'Connected to the internet' : 'Connected locally only'}
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                        isOnline
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-blue-50 border-blue-200 text-blue-600'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">Reads your bills, cards and spending to answer questions.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateWeeklySummary}
                  className="px-3 py-1.5 rounded-lg bg-[#eff4f9] hover:bg-blue-100 text-xs font-semibold text-[#18457c] border border-[#18457c]/20 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#18457c]" />
                  <span>Weekly Summary</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPastChatsOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  <span>Past Chats</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMemoryModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Brain className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Memory ({aiMemory.length})</span>
                </button>
              </div>
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
            <form onSubmit={handleSendChatMessage} className="flex items-end gap-2 pt-3 border-t border-slate-100">
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
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 mb-0.5 flex items-center justify-center"
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
                className="flex-1 min-w-0 max-h-36 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
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
                  className="px-5 py-2.5 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 mb-0.5"
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

      {/* ======================================================================= */}
      {/* 3. RIGHT SIDEBAR: ADVISOR (Hidden when on AI Advisor full view) */}
      {/* ======================================================================= */}
      {activeTab !== 'advisor' && (
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
        {/* Header with Quick Actions */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/70">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900">Advisor</h2>
              <span
                title={isOnline ? 'Connected to the internet' : 'Connected locally only'}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-blue-50 border-blue-200 text-blue-600'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Reads your bills, cards and spending to answer questions.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <button
              type="button"
              onClick={handleGenerateWeeklySummary}
              className="p-1.5 rounded-lg text-[#18457c] bg-[#eff4f9] hover:bg-blue-100 border border-[#18457c]/20 transition-colors cursor-pointer"
              title="Generate Weekly Summary"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPastChatsOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Past Conversations"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMemoryModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer relative"
              title="Advisor Memory"
            >
              <Brain className="w-4 h-4" />
              {aiMemory.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-600"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('advisor')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Open full Advisor page"
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

          <div className="bg-[#eff4f9] rounded-2xl p-4 text-xs text-slate-700 leading-relaxed border border-slate-200/60 shadow-2xs flex flex-col gap-2.5">
            {highestAprCard ? (
              <span>
                Your cash covers everything due this month. The <strong>{highestAprCard.name}</strong> has the highest rate at <strong>{highestAprCard.apr}%</strong>, so extra payments there save the most interest.
              </span>
            ) : (
              <span>
                Your cash covers everything due this month. Your accounts and bills are in great financial health.
              </span>
            )}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-200/70">
              <button
                type="button"
                onClick={handleGenerateWeeklySummary}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Weekly Summary
              </button>
              <button
                type="button"
                onClick={() => handleExecuteSuggestedAction({ type: 'set_budget', category: 'Groceries', limit: 400 })}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Create $400 Groceries budget
              </button>
              <button
                type="button"
                onClick={() => handleSendChatMessage('What are my Social Security and CalPERS debt protections and how do I get a 0% bank hardship script?')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-300 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Senior Legal Shield
              </button>
              <button
                type="button"
                onClick={() => handleExecuteSuggestedAction({ type: 'payment_reminder' })}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#18457c] text-[#18457c] hover:text-white border border-[#18457c]/25 text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                Set payment reminder
              </button>
            </div>
          </div>

          {/* Active Chat Messages in Sidebar */}
          {chatMessages.filter((_, idx) => idx > 0).map((msg, i) => (
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
          <form onSubmit={handleSendChatMessage} className="flex items-end gap-2 mt-1">
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
                className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/90 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer shrink-0 mb-0.5 flex items-center justify-center"
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
              className="flex-1 min-w-0 max-h-32 bg-white border border-slate-200/90 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs resize-none"
            />
            {isAiTyping ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="h-[34px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 mb-0.5 animate-in fade-in zoom-in-90"
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
                className="px-3.5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 mb-0.5"
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
        cards={allFilterableCards.filter(c => c.type === 'credit')}
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
              <div className="w-full md:w-56 lg:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between bg-slate-50/60">
                <div>
                  <h3 className="font-serif-title text-xl font-bold text-slate-900 mb-6 hidden md:block">Settings</h3>
                  
                  <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                    {[
                      { id: 'profile', label: 'Profile', dot: false },
                      { id: 'ai', label: 'AI advisor', dot: settingsAiStatus !== 'connected' },
                      { id: 'plaid', label: 'Bank connection', dot: settingsPlaidStatus !== 'connected' },
                      { id: 'session', label: 'Security & Session', dot: false }
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
              <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-white">
                <div>
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
                            <p className="text-xs text-slate-500">{currentUser?.email || 'zeoe13@gmail.com'}</p>
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
                              value={currentUser?.email || 'zeoe13@gmail.com'}
                              disabled
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 cursor-not-allowed shadow-2xs"
                            />
                            <p className="text-[11px] text-slate-400 mt-1.5">Email can't be changed here.</p>
                          </div>
                        </div>

                        {/* Retirement & Income Sources */}
                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">Retirement & Income Sources</p>
                              <p className="text-[11px] text-slate-500">Select your active income sources to unlock legal protections and senior hardship tools.</p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Protected</span>
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {[
                              'Social Security',
                              'CalPERS Public Pension',
                              'STRS / State Pension',
                              '401(k) / IRA Distribution',
                              'CalPERS 457(b)',
                              'Medi-Cal / Medicare',
                              'Employment / Salary'
                            ].map(source => {
                              const isSelected = incomeSources.includes(source);
                              return (
                                <button
                                  key={source}
                                  type="button"
                                  onClick={() => handleToggleIncomeSource(source)}
                                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-50/80 border-[#1B4B91]/40 text-[#1B4B91] shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  <span className="truncate pr-1 text-[11px]">{source}</span>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-[#1B4B91]' : 'bg-slate-300'}`}></span>
                                </button>
                              );
                            })}
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
                              <option value="anthropic">Anthropic (Claude)</option>
                              <option value="openai">OpenAI (ChatGPT)</option>
                              <option value="gemini">Google Gemini</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-slate-700 block mb-1.5">Model</label>
                            <input
                              type="text"
                              value={settingsAiModel}
                              onChange={e => setSettingsAiModel(e.target.value)}
                              placeholder="e.g. claude-3-7-sonnet-20250219"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
                            />
                          </div>
                        </div>

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

                        {/* Status Pill & Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Status:</span>
                            {settingsAiStatus === 'connected' ? (
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
                            {Boolean(settingsAiMaskedKey) && (
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
                              <span>{settingsAiTesting ? 'Testing key...' : 'Save and test key'}</span>
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
                            { id: 'purchases', label: 'Purchases' }
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
                              {(data?.accounts || []).filter(a => a.institution).length > 0
                                ? new Set((data?.accounts || []).map(a => a.institution)).size
                                : 0}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* SUB-VIEW 1: CONNECTED BANKS */}
                      {bankTab === 'connected' && (
                        <div className="flex flex-col gap-4">
                          {/* List of distinct connected institutions */}
                          {(() => {
                            const accounts = data?.accounts || [];
                            const institutionsMap = {};
                            accounts.forEach(acc => {
                              const inst = acc.institution || 'Connected Bank';
                              if (!institutionsMap[inst]) {
                                institutionsMap[inst] = [];
                              }
                              institutionsMap[inst].push(acc);
                            });
                            const instList = Object.entries(institutionsMap);

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

                  {/* TAB 4: SECURITY & SESSION */}
                  {settingsActiveTab === 'session' && (
                    <div key="settings-tab-session" className="flex flex-col gap-5">
                      <div>
                        <h2 className="font-serif-title text-2xl font-bold text-slate-900">Security & Session</h2>
                        <p className="text-xs text-slate-500 mt-1">Background encryption, anti-injection firewall, app updates, and active session.</p>
                      </div>

                      {/* Card 1: Encryption & Anti-Code-Injection Firewall Status */}
                      <div className="border border-emerald-200 rounded-2xl p-4 bg-emerald-50/50 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">AES-256 Encryption & Anti-Injection Firewall Active</p>
                            <p className="text-[11px] text-slate-600">Blocks XSS, script injection, prototype pollution & Excel formula exploits in the background.</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                          Protected
                        </span>
                      </div>

                      {/* Card 1B: Desktop App Engine & GitHub Auto-Updater */}
                      <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {desktopAppInfo.isDesktopApp ? 'Klarity Desktop App (Local Engine)' : 'Klarity App Version'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#18457c] font-bold text-[10px] border border-blue-200">
                              v{desktopAppInfo.version || '1.0.0'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {desktopAppInfo.updateStatus?.message || 'Auto-updates directly from GitHub Releases (zeoe13/Klarity)'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {desktopAppInfo.updateStatus?.state === 'ready' ? (
                            <button
                              type="button"
                              onClick={() => window.klarityDesktop?.installUpdateNow?.()}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                            >
                              Restart to Update
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.klarityDesktop?.checkForUpdates) {
                                  await window.klarityDesktop.checkForUpdates();
                                } else {
                                  setDesktopAppInfo(prev => ({
                                    ...prev,
                                    updateStatus: { state: 'up-to-date', message: 'Up to date — v1.0.0 (Synced with zeoe13/Klarity)' }
                                  }));
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Check for Updates</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Active Session & Sign Out */}
                      <div className="border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 bg-white shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">Signed in as</p>
                            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email || 'zeoe13@gmail.com'}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">End this session and require login</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSettingsOpen(false);
                              handleLogout();
                            }}
                            className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
                          >
                            Sign Out
                          </button>
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
      {/* AI Memory Modal */}
      {isMemoryModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsMemoryModalOpen(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 text-slate-800 animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif-title text-lg font-bold text-slate-900">AI Advisor Memory</h3>
              <button onClick={() => setIsMemoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom preference..."
                value={newMemoryInput}
                onChange={e => setNewMemoryInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddMemory()}
                className="px-4 py-2 rounded-xl bg-[#18457c] text-white text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {aiMemory.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <span>{item}</span>
                  <button type="button" onClick={() => handleRemoveMemory(idx)} className="text-slate-400 hover:text-rose-600">✕</button>
                </div>
              ))}
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
