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
  MoreVertical,
  ArrowUpCircle
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
  decryptPayload,
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


import {
  SubpageHeader,
  MultiCardFilterDropdown,
  FormattedChatMessage,
  GoogleSignInButton,
  PlaidLauncher,
  CURRENT_APP_VERSION,
  isSemverNewer,
  formatVersionString,
  formatWhatsNewHighlights,
  formatUserFacingReleaseNote,
  formatCleanUpdateMessage
} from './components/SharedAppComponents';
import { Button, Card, Pill, Toast, ConfirmDialog } from './components/ui';
import {
  OverviewPage,
  TransactionsPage,
  BillsPage,
  SubscriptionsPage,
  CardsPage,
  BudgetsPage,
  RetirementPage as RetirementPageView,
  HouseholdPage,
  VaultPage,
  AdvisorPage,
  BrowserPage,
  SettingsPage
} from './pages';

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
      return localStorage.getItem('klarity_vault_lock_type') || 'pin';
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
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('General Feedback');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSendFeedback = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      const payload = {
        type: feedbackType,
        text: feedbackText.trim(),
        user: currentUser?.email || 'Anonymous',
        version: CURRENT_APP_VERSION,
        createdAt: new Date().toISOString()
      };
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch {}
      try {
        const list = JSON.parse(localStorage.getItem('klarity_user_feedback') || '[]');
        list.push(payload);
        localStorage.setItem('klarity_user_feedback', JSON.stringify(list));
      } catch {}
      setFeedbackSubmitted(true);
      setFeedbackText('');
      setTimeout(() => setFeedbackSubmitted(false), 4000);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };
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
    const checkServerUpdate = async () => {
      try {
        const res = await fetch(`/api/app/update-check?clientVersion=${encodeURIComponent(CURRENT_APP_VERSION)}&_t=${Date.now()}`);
        const data = await res.json();
        if (data && data.ok && data.isUpdateAvailable) {
          const humanizedMsg = formatUserFacingReleaseNote(data.message || '');
          setDesktopAppInfo(prev => ({
            ...prev,
            updateStatus: {
              state: 'available',
              commitSha: data.sha,
              fullSha: data.fullSha,
              currentSha: data.currentSha,
              latestVersion: data.latestVersion || CURRENT_APP_VERSION,
              commitTitle: humanizedMsg,
              recentChanges: (data.recentChanges || []).map(formatUserFacingReleaseNote),
              message: humanizedMsg
                ? `${humanizedMsg}.`
                : `A new update for Klarity (v${data.latestVersion || CURRENT_APP_VERSION}) is ready to install.`
            }
          }));
        } else if (data && data.ok) {
          setDesktopAppInfo(prev => ({
            ...prev,
            updateStatus: {
              state: 'up-to-date',
              commitSha: data?.currentSha || data?.sha || 'latest',
              currentSha: data?.currentSha || data?.sha || 'latest',
              version: CURRENT_APP_VERSION,
              message: `Up to date — v${CURRENT_APP_VERSION}${data?.currentSha ? ` (${data.currentSha})` : ''}`
            }
          }));
        }
      } catch {}
    };

    if (typeof window !== 'undefined' && window.klarityDesktop) {
      window.klarityDesktop.getAppInfo?.().then(info => {
        if (info) setDesktopAppInfo(info);
      }).catch(() => {});
      const unsub = window.klarityDesktop.onUpdateStatus?.((status) => {
        if (status) {
          setDesktopAppInfo(prev => ({ ...prev, updateStatus: status }));
        }
      });
      // Proactively check for updates immediately on launch and every 60s
      const t = setTimeout(() => {
        window.klarityDesktop.checkForUpdates?.().catch(() => {});
      }, 1000);
      const pollTimer = setInterval(() => {
        window.klarityDesktop.checkForUpdates?.().catch(() => {});
      }, 60 * 1000);
      return () => {
        clearTimeout(t);
        clearInterval(pollTimer);
        if (typeof unsub === 'function') unsub();
      };
    } else {
      // In web browser mode, proactively poll server update check on mount and every 60s
      const t = setTimeout(checkServerUpdate, 1200);
      const pollTimer = setInterval(checkServerUpdate, 60 * 1000);
      return () => {
        clearTimeout(t);
        clearInterval(pollTimer);
      };
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
    setUpdatePromptDismissed(true);
    try {
      const pendingSha = desktopAppInfo.updateStatus?.commitSha || desktopAppInfo.updateStatus?.fullSha;
      if (pendingSha) {
        try {
          sessionStorage.setItem('klarity_last_applied_sha', pendingSha);
        } catch {}
      }
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

  // Trigger update notification prompt when Klarity opens or when a new update is pushed to GitHub
  useEffect(() => {
    if (
      (desktopAppInfo.updateStatus?.state === 'available' || desktopAppInfo.updateStatus?.state === 'ready') &&
      !updatePromptDismissed
    ) {
      let alreadyApplied = false;
      try {
        const lastApplied = sessionStorage.getItem('klarity_last_applied_sha');
        const dismissedSha = localStorage.getItem('klarity_dismissed_update_sha');
        const currentPending = desktopAppInfo.updateStatus?.commitSha || desktopAppInfo.updateStatus?.fullSha;
        if (lastApplied && currentPending && (currentPending.startsWith(lastApplied) || lastApplied.startsWith(currentPending))) {
          alreadyApplied = true;
        }
        if (dismissedSha && currentPending && (currentPending.startsWith(dismissedSha) || dismissedSha.startsWith(currentPending))) {
          alreadyApplied = true;
        }
      } catch {}
      if (!alreadyApplied) {
        setIsUpdateModalOpen(true);
      }
    }
  }, [desktopAppInfo.updateStatus?.state, desktopAppInfo.updateStatus?.commitSha, desktopAppInfo.updateStatus?.fullSha, desktopAppInfo.updateStatus?.latestVersion, updatePromptDismissed]);

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
      setLockError('Please enter your security PIN to unlock.');
      return;
    }
    if (hasMasterPinSet()) {
      const res = await verifyMasterPin(clean);
      if (res.valid) {
        setIsSessionLocked(false);
        setLockPinInput('');
        setLockError('');
        try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
        await reencryptLegacyStorage(clean);
      } else {
        setLockError(res.error || 'Incorrect security PIN. Please try again.');
      }
    } else {
      setIsSessionLocked(false);
      setLockPinInput('');
      setLockError('');
      try { sessionStorage.removeItem('klarity_session_locked'); } catch {}
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
  const [settingsActiveTab, setSettingsActiveTab] = useState('profile'); // 'profile' | 'ui' | 'sidebar' | 'ai' | 'plaid' | 'security' | 'about'

  // UI & Accessibility states: font scale, density, reduce motion, high focus, privacy mask
  const [uiFontScale, setUiFontScale] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_ui_font_scale');
      if (saved === 'normal') return '100';
      if (saved === 'large') return '125';
      if (saved === 'xlarge') return '150';
      if (saved === 'huge') return '175';
      if (saved === 'maximum' || saved === 'max') return '200';
      if (saved && !isNaN(Number(saved))) return saved;
      return '100';
    } catch (e) {
      return '100';
    }
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
      
      // Clear root-level zoom & font-size so viewport, sidebar options, and advisor controls remain unbloated and never force scrolling
      root.style.zoom = '';
      root.style.fontSize = '';

      let percent = 100;
      if (scale === 'normal' || scale === '100' || scale === 100) percent = 100;
      else if (scale === 'large' || scale === '110') percent = 110;
      else if (scale === '125') percent = 125;
      else if (scale === 'xlarge' || scale === '150') percent = 150;
      else if (scale === 'huge' || scale === '175') percent = 175;
      else if (scale === 'maximum' || scale === 'max' || scale === '200' || scale === 200) percent = 200;
      else {
        const num = Number(scale);
        if (!isNaN(num) && num >= 100 && num <= 200) {
          percent = num;
        }
      }

      const zoomFactor = percent / 100;
      root.style.setProperty('--ui-content-zoom', `${zoomFactor}`);

      if (dens === 'compact') root.classList.add('ui-density-compact');
      if (motion) root.classList.add('reduce-motion');
      if (focus) root.classList.add('high-focus');
      if (mask) root.classList.add('privacy-mask');
    } catch (e) {}
  };

  // Scoped zoom factor applied directly to the scrollable main content page,
  // leaving the left sidebar navigation and right AI advisor controls at crisp standard scale
  const contentZoomFactor = useMemo(() => {
    let percent = 100;
    if (uiFontScale === 'normal' || uiFontScale === '100' || uiFontScale === 100) percent = 100;
    else if (uiFontScale === 'large' || uiFontScale === '110') percent = 110;
    else if (uiFontScale === '125') percent = 125;
    else if (uiFontScale === 'xlarge' || uiFontScale === '150') percent = 150;
    else if (uiFontScale === 'huge' || uiFontScale === '175') percent = 175;
    else if (uiFontScale === 'maximum' || uiFontScale === 'max' || uiFontScale === '200' || uiFontScale === 200) percent = 200;
    else {
      const num = Number(uiFontScale);
      if (!isNaN(num) && num >= 100 && num <= 200) {
        percent = num;
      }
    }
    return percent / 100;
  }, [uiFontScale]);

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
      localStorage.removeItem('klarity_vault_pin');
      const savedTheme = localStorage.getItem('klarity_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    } catch (e) {}
    applyUiPreferences(uiFontScale, uiDensity, uiReduceMotion, uiHighFocus, uiPrivacyMask);
  }, []);
  const [settingsDisplayName, setSettingsDisplayName] = useState(currentUser?.name || '');
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

  const [scanText, setScanText] = useState('');
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
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
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

  // Password & Account Vault state (resilient async persistence to localStorage, secureStorage, and server)
  const isVaultLoadedRef = useRef(false);
  const [vaultItems, setVaultItems] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_password_vault');
      if (saved && typeof saved === 'string') {
        if (!saved.startsWith('ENCv3:') && !saved.startsWith('ENCv2:')) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter(item => {
              if ((item.id === 'v-pge' || item.id === 'v-water') && !item.password && !item.username && !item.accountNumber) {
                return false;
              }
              return true;
            });
          }
        }
      }
    } catch (e) {}
    return [];
  });

  // Decrypt and sync vaultItems safely from secureStorage, encrypted storage, and backend on mount
  useEffect(() => {
    let active = true;
    async function loadVault() {
      try {
        // 1. Check secureStorage (handles decryption automatically)
        const secureStored = await secureStorage.getItem('klarity_password_vault', null);
        if (active && Array.isArray(secureStored) && secureStored.length > 0) {
          const cleaned = secureStored.filter(item => !(item.id === 'v-pge' && !item.password) && !(item.id === 'v-water' && !item.password));
          setVaultItems(cleaned);
          isVaultLoadedRef.current = true;
          return;
        }

        // 2. Check localStorage (if it was encrypted with ENCv3 or ENCv2)
        const raw = localStorage.getItem('klarity_password_vault');
        if (raw && (raw.startsWith('ENCv3:') || raw.startsWith('ENCv2:'))) {
          const decryptedStr = await decryptPayload(raw);
          if (decryptedStr) {
            const parsed = JSON.parse(decryptedStr);
            if (active && Array.isArray(parsed) && parsed.length > 0) {
              const cleaned = parsed.filter(item => !(item.id === 'v-pge' && !item.password) && !(item.id === 'v-water' && !item.password));
              setVaultItems(cleaned);
              isVaultLoadedRef.current = true;
              return;
            }
          }
        }

        // 3. Check backend database /api/vault
        const res = await fetch('/api/vault');
        if (res.ok) {
          const json = await res.json();
          if (active && Array.isArray(json.vaultItems) && json.vaultItems.length > 0) {
            const cleaned = json.vaultItems.filter(item => !(item.id === 'v-pge' && !item.password) && !(item.id === 'v-water' && !item.password));
            setVaultItems(cleaned);
            isVaultLoadedRef.current = true;
            return;
          }
        }
      } catch (err) {
        console.warn('Could not load vault items safely:', err);
      } finally {
        isVaultLoadedRef.current = true;
      }
    }
    loadVault();
    return () => { active = false; };
  }, []);

  // Persist vaultItems changes to localStorage, secureStorage, and server backend
  useEffect(() => {
    if (!isVaultLoadedRef.current) return;
    try {
      localStorage.setItem('klarity_password_vault', JSON.stringify(vaultItems));
      secureStorage.setItem('klarity_password_vault', vaultItems).catch(() => {});
    } catch (e) {}

    // Debounced persist to server database
    const timer = setTimeout(() => {
      fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultItems })
      }).catch(err => console.warn('Could not persist vault items to server:', err.message));
    }, 600);

    return () => clearTimeout(timer);
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
      const uid = currentUser?.id || 'default';
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
  const [activeBrowserContext, setActiveBrowserContext] = useState(null);

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
    'vault',
    'advisor',
    'browser'
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
    household: { id: 'household', label: 'Household', icon: Home, flag: 'household' },
    retirement: { id: 'retirement', label: 'Retirement', icon: Landmark, flag: 'retirement' },
    vault: { id: 'vault', label: 'Vault', icon: KeyRound, flag: 'vault' },
    advisor: { id: 'advisor', label: 'Advisor', icon: Sparkles, flag: null },
    browser: { id: 'browser', label: 'Browser', icon: Globe, flag: null }
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
    setAiMemory(prev => {
      const exists = prev.some(m => m.toLowerCase().trim() === item.toLowerCase().trim());
      if (exists) return prev;
      const updated = [...prev, item];
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
      return updated;
    });
    setNewMemoryInput('');
    setNotificationToast('Saved to AI Memory!');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  const handleRemoveMemory = (index) => {
    const uid = currentUser?.id || 'default';
    setAiMemory(prev => {
      const updated = prev.filter((_, i) => i !== index);
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
      return updated;
    });
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
          const storedProv = localStorage.getItem(`klarity_${uid}_ai_provider`) || localStorage.getItem('klarity_ai_provider');
          const storedMod = localStorage.getItem(`klarity_${uid}_ai_model`) || localStorage.getItem('klarity_ai_model');
          const storedMasked = localStorage.getItem(`klarity_${uid}_ai_masked_key`) || localStorage.getItem('klarity_ai_masked_key');
          const storedStatus = localStorage.getItem(`klarity_${uid}_ai_status`) || localStorage.getItem('klarity_ai_status');

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
            const localRaw = localStorage.getItem(`klarity_${uid}_ai_memory`) || localStorage.getItem('klarity_ai_memory');
            let localItems = [];
            try {
              if (localRaw) localItems = JSON.parse(localRaw);
            } catch {}
            const combined = [...(Array.isArray(localItems) ? localItems : [])];
            for (const item of json.ai.memory) {
              if (!combined.some(c => c.toLowerCase().trim() === item.toLowerCase().trim())) {
                combined.push(item);
              }
            }
            const finalMem = combined.length > 0 ? combined : json.ai.memory;
            setAiMemory(finalMem);
            try {
              localStorage.setItem('klarity_ai_memory', JSON.stringify(finalMem));
              localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(finalMem));
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
    const uid = currentUser?.id || 'default';
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

  // Delete Bill (Confirmed via ConfirmDialog in BillsPage)
  const handleDeleteBill = async (billId, billName) => {
    setData(prev => {
      const nextBills = (prev.bills || []).filter(b => b.id !== billId);
      const nextState = { ...prev, bills: nextBills };
      try {
        localStorage.setItem('klarity_bills', JSON.stringify(nextBills));
        localStorage.setItem('klarity_finance_data', JSON.stringify(nextState));
      } catch (e) {}
      return nextState;
    });
    try {
      await fetch(`/api/bills/${billId}`, { method: 'DELETE' });
    } catch (e) {}
    setNotificationToast(`Bill removed: ${billName || 'Bill'}`);
    setTimeout(() => setNotificationToast(''), 3500);
  };

  // Delete Manual Asset (Confirmed via ConfirmDialog in CardsPage)
  const handleDeleteManualAsset = (assetId, assetName) => {
    setManualAssets(prev => prev.filter(a => a.id !== assetId));
    setNotificationToast(`Removed ${assetName || 'account'}`);
    setTimeout(() => setNotificationToast(''), 3000);
  };

  // Clear All AI Memory (Confirmed via ConfirmDialog in SettingsPage / Advisor modal)
  const [confirmClearAdvisorMemoryOpen, setConfirmClearAdvisorMemoryOpen] = useState(false);
  const handleClearAllMemory = () => {
    const uid = currentUser?.id || 'default';
    setAiMemory([]);
    try {
      localStorage.setItem('klarity_ai_memory', '[]');
      localStorage.setItem(`klarity_${uid}_ai_memory`, '[]');
    } catch (e) {}
    setNotificationToast('Cleared advisor memory.');
    setTimeout(() => setNotificationToast(''), 3000);
  };

  const handleManualCheckForUpdate = async () => {
    setIsCheckingUpdateInSettings(true);
    setUpdatePromptDismissed(false);
    setUpdateBannerDismissed(false);
    try {
      localStorage.removeItem('klarity_dismissed_update_sha');
    } catch {}
    try {
      let foundUpdate = false;
      let statusPayload = null;

      if (typeof window !== 'undefined' && window.klarityDesktop?.checkForUpdates) {
        const st = await window.klarityDesktop.checkForUpdates();
        if (st && (st.state === 'available' || st.state === 'ready')) {
          foundUpdate = true;
          statusPayload = st;
        }
      }

      if (!foundUpdate) {
        const res = await fetch(`/api/app/update-check?clientVersion=${encodeURIComponent(CURRENT_APP_VERSION)}&_t=${Date.now()}`);
        const data = await res.json();
        if (data && data.ok && data.isUpdateAvailable) {
          foundUpdate = true;
          const humanizedMsg = formatUserFacingReleaseNote(data.message || '');
          statusPayload = {
            state: 'available',
            commitSha: data.sha,
            fullSha: data.fullSha,
            currentSha: data.currentSha,
            latestVersion: data.latestVersion || CURRENT_APP_VERSION,
            commitTitle: humanizedMsg,
            recentChanges: (data.recentChanges || []).map(formatUserFacingReleaseNote),
            message: humanizedMsg
              ? `${humanizedMsg}.`
              : `A new update for Klarity (v${data.latestVersion || CURRENT_APP_VERSION}) is ready!`
          };
        } else if (data && data.ok && !statusPayload) {
          statusPayload = {
            state: 'up-to-date',
            commitSha: data?.currentSha || data?.sha || 'latest',
            currentSha: data?.currentSha || data?.sha || 'latest',
            version: CURRENT_APP_VERSION,
            message: `Up to date — v${CURRENT_APP_VERSION}${data?.currentSha ? ` (${data.currentSha})` : ''}`
          };
        }
      }

      if (statusPayload) {
        setDesktopAppInfo(prev => ({ ...prev, updateStatus: statusPayload }));
      }

      if (foundUpdate) {
        setIsUpdateModalOpen(true);
        setNotificationToast('New update found! Ready to install.');
      } else {
        setNotificationToast(`You are running the latest version of Klarity (v${CURRENT_APP_VERSION}).`);
      }
      setTimeout(() => setNotificationToast(''), 3500);
    } catch {
      setNotificationToast('Failed to check for updates. Please verify your internet connection.');
      setTimeout(() => setNotificationToast(''), 3500);
    } finally {
      setIsCheckingUpdateInSettings(false);
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
          householdMetrics: calculateHouseholdAndFleetMetrics(householdProfile),
          browserContext: activeBrowserContext
        })
      });

      const json = await res.json();
      let replyText = json.reply || '';

      // Update local state and localStorage immediately if backend returned updatedData
      if (json.updatedData) {
        if (Array.isArray(json.updatedData.memory)) {
          const memArray = json.updatedData.memory;
          setAiMemory(memArray);
          const uid = currentUser?.id || 'default';
          try {
            localStorage.setItem('klarity_ai_memory', JSON.stringify(memArray));
            localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(memArray));
          } catch (e) {}
        }
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
          } else if (act.type === 'set_budget_bills' && act.item?.category && Array.isArray(act.item?.billIds)) {
            setBudgets(prev =>
              prev.map(b =>
                (b.category || '').toLowerCase() === (act.item.category || '').toLowerCase()
                  ? { ...b, assignedBillIds: act.item.billIds }
                  : b
              )
            );
          } else if (act.type === 'add_memory' && act.item?.fact) {
            handleAddMemory(act.item.fact);
          } else if (act.type === 'delete_memory' && act.item?.fact) {
            const targetFact = String(act.item.fact).toLowerCase().trim();
            setAiMemory(prev => {
              const nextMem = prev.filter(m => !m.toLowerCase().includes(targetFact));
              const uid = currentUser?.id || 'default';
              try {
                localStorage.setItem('klarity_ai_memory', JSON.stringify(nextMem));
                localStorage.setItem(`klarity_${uid}_ai_memory`, JSON.stringify(nextMem));
              } catch {}
              try {
                fetch('/api/settings/ai-quick-settings', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ memory: nextMem })
                }).catch(() => {});
              } catch {}
              return nextMem;
            });
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
        if (json.actionsExecuted.some(a => a.type === 'add_memory')) {
          setNotificationToast('Saved to AI Advisor memory!');
        } else {
          setNotificationToast(`Auto-added ${count} item${count > 1 ? 's' : ''} to your records!`);
        }
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
      replyText = (replyText || '')
        .replace(/\[NAVIGATE:[\s\S]*?\]/gi, '')
        .replace(/\[ACTION:[\s\S]*?\]/gi, '')
        .trim();

      if (!replyText) {
        if (json.actionsExecuted && json.actionsExecuted.length > 0) {
          replyText = `Done! I updated ${json.actionsExecuted.length} item${json.actionsExecuted.length === 1 ? '' : 's'} in your Klarity account.`;
        } else {
          replyText = buildPersonalizedAdvisorBriefing().fullBriefingMd;
        }
      }

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

  // Splash loading screen while verifying existing stored session
  if (isCheckingSession && !currentUser) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <KlarityLogo className="w-12 h-12 text-[#1B4B91]" />
          <span className="font-serif text-[24px] font-semibold tracking-tight text-[var(--ink)]">Klarity</span>
        </div>
      </div>
    );
  }

  // 1. SIGN IN SCREEN: GOOGLE OAUTH + EMAIL
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col justify-between">
        <header className="border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KlarityLogo className="w-7 h-7 text-[#1B4B91] shrink-0" />
            <span className="font-serif text-[22px] font-semibold tracking-tight text-[var(--ink)]">Klarity</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
            <div className="text-center">
              <div className="w-12 h-12 rounded-[12px] bg-[#1B4B91]/10 flex items-center justify-center mx-auto mb-3">
                <KlarityLogo className="w-7 h-7 text-[#1B4B91]" />
              </div>
              <h1 className="font-serif text-[26px] font-semibold tracking-tight text-[var(--ink)]">
                Sign in to Klarity
              </h1>
              <p className="text-[15px] font-medium text-[var(--muted)] mt-1">
                Manage your cards, balances, and household bills securely.
              </p>
            </div>

            {authError && (
              <div role="alert" className="p-3.5 rounded-[8px] bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-[#B91C1C] text-[13px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div>
              <GoogleSignInButton
                onAuthSuccess={handleGoogleProfileSuccess}
                onError={err => setAuthError(err)}
                setIsAuthenticating={setIsAuthenticating}
                isAuthenticating={isAuthenticating}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--line)]" />
              <span className="text-[13px] font-medium text-[var(--muted)]">
                or use email
              </span>
              <div className="flex-1 h-px bg-[var(--line)]" />
            </div>

            <div className="grid grid-cols-2 p-1 bg-[var(--surface-subtle)] rounded-[8px] border border-[var(--line)] text-[13px]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError('');
                }}
                className={`py-2 rounded-[8px] transition-colors cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] font-medium'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`py-2 rounded-[8px] transition-colors cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-2xs'
                    : 'text-[var(--muted)] hover:text-[var(--ink)] font-medium'
                }`}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="auth-name-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                    Your name
                  </label>
                  <input
                    id="auth-name-input"
                    type="text"
                    required
                    placeholder="Full name"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Email address
                </label>
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>

              <div>
                <label htmlFor="auth-password-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 pr-10 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm-password-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                    Confirm password
                  </label>
                  <input
                    id="auth-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat your password"
                    value={confirmPasswordInput}
                    onChange={e => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              )}

              <Button type="submit" variant="primary" disabled={isAuthenticating} className="w-full mt-1">
                {isAuthenticating
                  ? 'Signing in...'
                  : authMode === 'signup'
                  ? 'Create account'
                  : 'Sign in with email'}
              </Button>
            </form>
          </Card>
        </div>

        <footer className="border-t border-[var(--line)] py-4 text-center text-[13px] font-medium text-[var(--muted)]">
          © 2026 Klarity. Personal financial data is encrypted and private.
        </footer>
      </div>
    );
  }

  // Session Inactivity Lock Screen
  if (isSessionLocked) {
    const isPasswordMode = vaultLockType === 'password';
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col justify-between">
        <header className="border-b border-[var(--line)] bg-[var(--surface)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <KlarityLogo className="w-7 h-7 text-[#1B4B91] shrink-0" />
            <span className="font-serif text-[22px] font-semibold tracking-tight text-[var(--ink)]">Klarity</span>
          </div>
          <Button variant="danger" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <Card className="max-w-md w-full p-6 sm:p-8 flex flex-col gap-6 shadow-sm">
            <div className="text-center">
              <div className="w-12 h-12 rounded-[12px] bg-[#1B4B91]/10 flex items-center justify-center mx-auto mb-3 text-[#1B4B91]">
                <Lock className="w-6 h-6" />
              </div>
              <h1 className="font-serif text-[24px] font-semibold tracking-tight text-[var(--ink)]">
                Session locked
              </h1>
              <p className="text-[15px] font-medium text-[var(--muted)] mt-1">
                Klarity locked automatically after {autoLockMinutes} minutes of inactivity. Enter your {isPasswordMode ? 'master password' : 'security PIN'} to resume.
              </p>
              <div className="mt-2">
                <Pill variant="neutral">{currentUser?.email || 'Account'}</Pill>
              </div>
            </div>

            {lockError && (
              <div role="alert" className="p-3.5 rounded-[8px] bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-[#B91C1C] text-[13px] font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lockError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockSession} className="flex flex-col gap-4">
              <div>
                <label htmlFor="session-unlock-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                  {isPasswordMode ? 'Master password' : 'Security PIN'}
                </label>
                <input
                  id="session-unlock-input"
                  type="password"
                  inputMode={isPasswordMode ? 'text' : 'numeric'}
                  autoFocus
                  value={lockPinInput}
                  onChange={e => setLockPinInput(e.target.value)}
                  placeholder={isPasswordMode ? 'Enter your master password' : 'Enter PIN'}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full">
                Resume session
              </Button>
            </form>

            <div className="text-center pt-3 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={handleLogout}
                className="text-[13px] font-medium text-[var(--muted)] hover:text-[#B91C1C] transition-colors cursor-pointer"
              >
                Not you? Sign out of this session
              </button>
            </div>
          </Card>
        </div>

        <footer className="border-t border-[var(--line)] py-4 text-center text-[13px] font-medium text-[var(--muted)]">
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

  // Default empty fallback arrays (strictly no fake/premade demo data)
  const DEFAULT_OVERVIEW_CARDS = [];
  const DEFAULT_OVERVIEW_BILLS = [];
  const DEFAULT_OVERVIEW_SUBS = [];
  const DEFAULT_OVERVIEW_TXS = [];

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

  const displayCardBalances = creditCards.length > 0 ? cardBalances : 0;

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

  const firstName = currentUser?.name
    ? currentUser.name.trim().split(/\s+/)[0]
    : currentUser?.email
    ? currentUser.email.split('@')[0]
    : 'there';
  const userInitials = (currentUser?.name || currentUser?.email || 'U')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

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
    const txSpent = cardFilteredTxsForBudgets
      .filter(t => {
        const tc = (t.category || '').toLowerCase();
        if (tc === 'income') return false;
        if (catLower === 'gas' || catLower === 'transportation') {
          return tc === 'gas' || tc === 'transportation';
        }
        return tc === catLower;
      })
      .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    let spent = txSpent;
    let defaultMatchedBillIds = [];
    if (catLower === 'utilities' || catLower === 'housing' || catLower === 'bills') {
      const defaultBills = catLower === 'bills'
        ? cardFilteredBillsForBudgets.filter(bill => bill.status === 'due_soon' || (bill.daysUntil != null && bill.daysUntil <= 5))
        : cardFilteredBillsForBudgets.filter(bill => (bill.category || '').toLowerCase() === catLower);
      defaultMatchedBillIds = defaultBills.map(bill => bill.id);
    }

    if (Array.isArray(b.assignedBillIds)) {
      const selectedBills = cardFilteredBillsForBudgets.filter(bill => b.assignedBillIds.includes(bill.id));
      spent += selectedBills.reduce((sum, bill) => sum + Number(bill.expectedAmount || 0), 0);
    } else if (defaultMatchedBillIds.length > 0) {
      const defaultBills = cardFilteredBillsForBudgets.filter(bill => defaultMatchedBillIds.includes(bill.id));
      spent += defaultBills.reduce((sum, bill) => sum + Number(bill.expectedAmount || 0), 0);
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
      txSpent,
      defaultMatchedBillIds,
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

  const normalizedActiveTab = activeTab === 'lifestyle' ? 'household' : activeTab;

  const sidebarSections = [
    {
      group: 'Overview',
      items: [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, show: true }
      ]
    },
    {
      group: 'Money',
      items: [
        { id: 'transactions', label: 'Transactions', icon: History, show: true },
        { id: 'bills', label: 'Bills', icon: Receipt, show: true },
        { id: 'subscriptions', label: 'Subscriptions', icon: Zap, show: true },
        { id: 'cards', label: 'Cards', icon: CreditCard, show: true },
        { id: 'budgets', label: 'Budgets', icon: PieChart, show: featureFlags.budgets !== false }
      ]
    },
    {
      group: 'Plan',
      items: [
        { id: 'retirement', label: 'Retirement', icon: Landmark, show: featureFlags.retirement !== false }
      ]
    },
    {
      group: 'Home and life',
      items: [
        { id: 'household', label: 'Household', icon: Home, show: featureFlags.household !== false }
      ]
    },
    {
      group: 'Vault',
      items: [
        { id: 'vault', label: 'Vault', icon: KeyRound, show: featureFlags.vault !== false }
      ]
    },
    {
      group: 'Advisor',
      items: [
        { id: 'advisor', label: 'Advisor', icon: Sparkles, show: true }
      ]
    }
  ];

  const isErrorToast = Boolean(
    notificationToast &&
      /(fail|error|invalid|could not|cannot|unable)/i.test(notificationToast)
  );

  const showToast = (msg) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(''), 4000);
  };

  return (
    <div className={`min-h-screen bg-[var(--bg)] text-[var(--ink)] flex font-sans antialiased ${normalizedActiveTab === 'browser' ? 'h-screen max-h-screen overflow-hidden' : ''}`}>
      {linkToken && (
        <PlaidLauncher
          token={linkToken}
          onSuccess={handlePlaidSuccess}
          onExit={() => setLinkToken(null)}
        />
      )}

      {/* Hidden CSV Input for Importing Transactions */}
      <input
        type="file"
        ref={csvInputRef}
        accept=".csv,text/csv"
        onChange={handleImportCsv}
        className="hidden"
        aria-label="Import transactions CSV file"
      />

      {/* Hidden Multi-File Input for Advisor Sidebar */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="*/*"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleAttachFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
        aria-label="Attach files to advisor chat"
      />

      {/* Toast Notification (Success & Error, Auto-Dismiss) */}
      <Toast
        message={notificationToast}
        type={isErrorToast ? 'error' : 'success'}
        onDismiss={() => setNotificationToast('')}
      />

      {/* Undo Toast for Hiding Retirement */}
      {undoToast && (
        <div
          role="status"
          className="fixed bottom-20 min-[760px]:bottom-6 left-1/2 -translate-x-1/2 z-[150] bg-[var(--surface)] text-[var(--ink)] px-4 py-3 rounded-[12px] shadow-lg border border-[var(--line)] flex items-center gap-4 text-[15px] font-medium"
        >
          <span>{undoToast.message}</span>
          <Button variant="secondary" size="sm" onClick={undoToast.onUndo}>
            Undo
          </Button>
        </div>
      )}

      {/* =================================================================== */}
      {/* LEFT LABELED SIDEBAR (>= 760px)                                     */}
      {/* =================================================================== */}
      <aside
        aria-label="Primary Sidebar Navigation"
        className={`hidden min-[760px]:flex shrink-0 flex-col justify-between bg-[var(--surface)] border-r border-[var(--line)] h-screen sticky top-0 select-none z-30 transition-all duration-200 ease-in-out ${
          isSidebarCompact ? 'w-[72px]' : 'w-60'
        }`}
      >
        <div className={`flex flex-col flex-1 min-h-0 overflow-y-auto py-4 ${isSidebarCompact ? 'px-2 gap-3 items-center' : 'px-3.5 gap-4'}`}>
          {/* Brand Header & Collapse/Expand Sidebar Button */}
          {!isSidebarCompact ? (
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="flex items-center gap-2.5 text-left rounded-[8px] py-1 cursor-pointer"
              >
                <KlarityLogo className="w-7 h-7 text-[#1B4B91] shrink-0" />
                <span className="font-serif text-[22px] font-semibold tracking-tight text-[var(--ink)]">
                  Klarity
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleRefreshApp}
                  disabled={isRefreshingApp}
                  aria-label="Refresh financial data"
                  title="Refresh financial data"
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingApp ? 'animate-spin text-[#1B4B91]' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSidebarCompact(true)}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                aria-label="Klarity Overview"
                title="Overview"
                className="p-1.5 rounded-[8px] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
              >
                <KlarityLogo className="w-7 h-7 text-[#1B4B91]" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarCompact(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[#1B4B91] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Navigation Links (Follows custom user order from Settings > Sidebar) */}
          <nav className={`flex flex-col ${isSidebarCompact ? 'items-center gap-1.5 w-full' : 'gap-1'}`} aria-label="Main sections">
            {sidebarNavOrder
              .map((id) => SIDEBAR_ITEMS_CONFIG[id])
              .filter((item) => Boolean(item) && (!item.flag || featureFlags[item.flag] !== false))
              .map((item) => {
                const IconComponent = item.icon;
                const isActive = normalizedActiveTab === item.id;
                return !isSidebarCompact ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-[8px] text-[15px] transition-colors cursor-pointer text-left ${
                      isActive
                        ? 'bg-[#1B4B91] text-white font-semibold'
                        : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)] font-medium'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--muted)]'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-label={item.label}
                    title={item.label}
                    className={`w-10 h-10 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#1B4B91] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[var(--muted)]'}`} />
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Sidebar Footer: User Account & Settings */}
        {!isSidebarCompact ? (
          <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setSettingsActiveTab('profile');
                setIsSettingsOpen(true);
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1.5 rounded-[8px] hover:bg-[var(--surface-subtle)] transition-colors text-left cursor-pointer"
            >
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name || 'User avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-[var(--line)] shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1B4B91] text-white text-[13px] font-semibold flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-[var(--ink)] truncate">
                  {currentUser?.name || firstName}
                </div>
                <div className="text-[13px] font-medium text-[var(--muted)] truncate">
                  {currentUser?.email || 'Settings'}
                </div>
              </div>
            </button>

            <button
              type="button"
              aria-label="Open settings"
              title="Settings"
              onClick={() => {
                setSettingsActiveTab('profile');
                setIsSettingsOpen(true);
              }}
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors shrink-0 cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-3 border-t border-[var(--line)] bg-[var(--surface)] flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshApp}
              disabled={isRefreshingApp}
              aria-label="Refresh financial data"
              title="Refresh financial data"
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingApp ? 'animate-spin text-[#1B4B91]' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Open settings"
              title="Settings"
              onClick={() => {
                setSettingsActiveTab('profile');
                setIsSettingsOpen(true);
              }}
              className="w-9 h-9 rounded-full bg-[#1B4B91] text-white text-[13px] font-semibold flex items-center justify-center shrink-0 cursor-pointer"
            >
              {userInitials}
            </button>
          </div>
        )}
      </aside>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA + RIGHT ADVISOR SIDEBAR                           */}
      {/* =================================================================== */}
      <div className={`flex-1 flex flex-col min-w-0 ${normalizedActiveTab === 'browser' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'}`}>
        {/* Top Mobile Header (< 760px) */}
        <header className="flex min-[760px]:hidden items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--line)] sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2 text-left cursor-pointer"
          >
            <KlarityLogo className="w-6 h-6 text-[#1B4B91]" />
            <span className="font-serif text-[20px] font-semibold text-[var(--ink)]">Klarity</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshApp}
              aria-label="Refresh financial data"
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingApp ? 'animate-spin text-[#1B4B91]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsActiveTab('profile');
                setIsSettingsOpen(true);
              }}
              aria-label="Open settings"
              className="w-9 h-9 rounded-[8px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Software Update Banner */}
        {(desktopAppInfo.updateStatus?.state === 'available' || desktopAppInfo.updateStatus?.state === 'ready') &&
          !updateBannerDismissed && (
            <div className="bg-[#1B4B91] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px] font-medium">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4 shrink-0" />
                <span>
                  {formatCleanUpdateMessage(
                    desktopAppInfo.updateStatus?.message || desktopAppInfo.updateStatus?.commitTitle,
                    desktopAppInfo.updateStatus?.latestVersion
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setIsUpdateModalOpen(true)}>
                  View update
                </Button>
                <button
                  type="button"
                  aria-label="Dismiss update banner"
                  onClick={() => setUpdateBannerDismissed(true)}
                  className="p-1 text-white/80 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        {/* Content + Right Advisor Split */}
        <div className={`flex-1 flex min-w-0 ${normalizedActiveTab === 'browser' ? 'min-h-0 h-full overflow-hidden' : ''}`}>
          {normalizedActiveTab === 'browser' ? (
            <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden p-0 m-0 pb-14 min-[760px]:pb-0">
              <BrowserPage
                onAskAdvisor={(prompt) => {
                  setIsAdvisorCollapsed(false);
                  handleSendChatMessage(prompt);
                }}
                activeBrowserContext={activeBrowserContext}
                setActiveBrowserContext={setActiveBrowserContext}
              />
            </main>
          ) : (
            <main
              className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 pb-24 min-[760px]:pb-12 overflow-x-hidden"
              style={{ zoom: contentZoomFactor !== 1 ? contentZoomFactor : undefined }}
            >
              <div className="max-w-[1140px] mx-auto flex flex-col gap-6">
              {normalizedActiveTab === 'dashboard' && (
                <OverviewPage
                  firstName={firstName}
                  timeGreeting={getTimeGreeting()}
                  isLoading={loading}
                  smartAlerts={smartAlerts}
                  displayCash={displayCash}
                  projectedCashAfterBills={projectedCashAfterBills}
                  displayCardBalances={displayCardBalances}
                  displayCards={displayCards}
                  displayDue14Sum={displayDue14Sum}
                  displayDue14Count={displayDue14Count}
                  featureFlags={featureFlags}
                  retirementPlans={retirementPlans}
                  retirementPromptDismissed={retirementPromptDismissed}
                  setRetirementPromptDismissed={setRetirementPromptDismissed}
                  handleHideRetirement={handleHideRetirement}
                  projectedRetirementMonthlyIncome={projectedRetirementMonthlyIncome}
                  totalNetWorth={totalNetWorth}
                  netWorthHistory={netWorthHistory}
                  manualPositiveAssets={manualPositiveAssets}
                  manualLoans={manualLoans}
                  displayBills={displayBills}
                  displayTotalMonthlyBills={displayTotalMonthlyBills}
                  displaySubs={displaySubs}
                  displayTotalSubs={displayTotalSubs}
                  displayTxs={displayTxs}
                  sourceTxsList={sourceTxsList}
                  householdProfile={householdProfile}
                  setHouseholdProfile={setHouseholdProfile}
                  handleSyncUtilitiesToBills={handleSyncUtilitiesToBills}
                  data={data}
                  setActiveTab={setActiveTab}
                  setSelectedCardIds={setSelectedCardIds}
                  setIsAddManualAssetOpen={setIsAddManualAssetOpen}
                  setIsAddAccountOpen={setIsAddAccountOpen}
                  setIsAddBillOpen={setIsAddBillOpen}
                  setIsAddSubOpen={setIsAddSubOpen}
                  setIsAddTxOpen={setIsAddTxOpen}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'transactions' && (
                <TransactionsPage
                  isLoading={loading}
                  filteredTransactions={filteredTransactions}
                  filteredTxSpent={filteredTxSpent}
                  filteredTxIncome={filteredTxIncome}
                  txSearch={txSearch}
                  setTxSearch={setTxSearch}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  allFilterableCards={allFilterableCards}
                  selectedCardIds={selectedCardIds}
                  setSelectedCardIds={setSelectedCardIds}
                  editingTxNoteId={editingTxNoteId}
                  setEditingTxNoteId={setEditingTxNoteId}
                  editingTxNoteText={editingTxNoteText}
                  setEditingTxNoteText={setEditingTxNoteText}
                  handleSaveTxNote={handleSaveTxNote}
                  handleRecategorizeTransaction={handleRecategorizeTransaction}
                  handleDeleteTransaction={handleDeleteTransaction}
                  handleExportCsv={handleExportCsv}
                  csvInputRef={csvInputRef}
                  setIsAddTxOpen={setIsAddTxOpen}
                  MultiCardFilterDropdown={MultiCardFilterDropdown}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'bills' && (
                <BillsPage
                  isLoading={loading}
                  filteredBills={filteredBills}
                  filteredTotalMonthlyBills={filteredTotalMonthlyBills}
                  billSearch={billSearch}
                  setBillSearch={setBillSearch}
                  billFilter={billFilter}
                  setBillFilter={setBillFilter}
                  allFilterableCards={allFilterableCards}
                  selectedCardIds={selectedCardIds}
                  setSelectedCardIds={setSelectedCardIds}
                  handlePayBill={handlePayBill}
                  handleDeleteBill={handleDeleteBill}
                  setIsAddBillOpen={setIsAddBillOpen}
                  setIsScanBillOpen={setIsScanBillOpen}
                  MultiCardFilterDropdown={MultiCardFilterDropdown}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'subscriptions' && (
                <SubscriptionsPage
                  isLoading={loading}
                  filteredSubscriptions={filteredSubscriptions}
                  filteredTotalSubscriptions={filteredTotalSubscriptions}
                  sourceSubsList={sourceSubsList}
                  displayTotalSubs={displayTotalSubs}
                  subSearch={subSearch}
                  setSubSearch={setSubSearch}
                  subCategoryFilter={subCategoryFilter}
                  setSubCategoryFilter={setSubCategoryFilter}
                  allFilterableCards={allFilterableCards}
                  selectedCardIds={selectedCardIds}
                  setSelectedCardIds={setSelectedCardIds}
                  handleDeleteSubscription={handleDeleteSubscription}
                  handleSendChatMessage={handleSendChatMessage}
                  setIsAddSubOpen={setIsAddSubOpen}
                  MultiCardFilterDropdown={MultiCardFilterDropdown}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'cards' && (
                <CardsPage
                  isLoading={loading}
                  displayCards={displayCards}
                  checkingAccounts={checkingAccounts}
                  manualAssets={manualAssets}
                  displayCardBalances={displayCardBalances}
                  displayCash={displayCash}
                  projectedCashAfterBills={projectedCashAfterBills}
                  cardsFilter={cardsFilter}
                  setCardsFilter={setCardsFilter}
                  cardsPayoffTab={cardsPayoffTab}
                  setCardsPayoffTab={setCardsPayoffTab}
                  debtStrategy={debtStrategy}
                  setDebtStrategy={setDebtStrategy}
                  extraDebtPayment={extraDebtPayment}
                  setExtraDebtPayment={setExtraDebtPayment}
                  debtPayoffComparison={debtPayoffComparison}
                  setSelectedCardIds={setSelectedCardIds}
                  setActiveTab={setActiveTab}
                  setIsAddAccountOpen={setIsAddAccountOpen}
                  setIsAddManualAssetOpen={setIsAddManualAssetOpen}
                  setIsHardshipModalOpen={setIsHardshipModalOpen}
                  handleDeleteAccount={handleDeleteAccount}
                  handleDeleteManualAsset={handleDeleteManualAsset}
                  handleSendPayoffPlanToAi={handleSendPayoffPlanToAi}
                  setChatInput={setChatInput}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'budgets' && (
                <BudgetsPage
                  isLoading={loading}
                  computedBudgets={computedBudgets}
                  totalBudgetLimit={totalBudgetLimit}
                  totalBudgetSpent={totalBudgetSpent}
                  hasAnyBudgetPaymentsOnSelectedCard={hasAnyBudgetPaymentsOnSelectedCard}
                  allFilterableCards={allFilterableCards}
                  selectedCardIds={selectedCardIds}
                  setSelectedCardIds={setSelectedCardIds}
                  editingBudgetId={editingBudgetId}
                  setEditingBudgetId={setEditingBudgetId}
                  editingBudgetLimit={editingBudgetLimit}
                  setEditingBudgetLimit={setEditingBudgetLimit}
                  setBudgets={setBudgets}
                  sourceBillsList={sourceBillsList}
                  sourceTxsList={sourceTxsList}
                  handleSendChatMessage={handleSendChatMessage}
                  featureFlags={featureFlags}
                  savingsGoals={savingsGoals}
                  setSavingsGoals={setSavingsGoals}
                  handleContributeGoal={handleContributeGoal}
                  setIsAddBudgetOpen={setIsAddBudgetOpen}
                  setIsAddGoalOpen={setIsAddGoalOpen}
                  MultiCardFilterDropdown={MultiCardFilterDropdown}
                  onShowToast={showToast}
                  fmtMoney={fmtMoney}
                />
              )}

              {normalizedActiveTab === 'retirement' && (
                <RetirementPageView
                  plans={retirementPlans}
                  onUpdatePlans={setRetirementPlans}
                  onAskAdvisor={(promptText) => handleSendChatMessage(promptText)}
                  onHideFeature={handleHideRetirement}
                  onShowToast={showToast}
                  incomeSources={incomeSources}
                  onToggleIncomeSource={handleToggleIncomeSource}
                  displayCardBalances={displayCardBalances}
                  displayCash={displayCash}
                  displayCards={displayCards}
                  highestAprCard={highestAprCard}
                  seniorReliefTab={seniorReliefTab}
                  setSeniorReliefTab={setSeniorReliefTab}
                  isHalalFinance={isHalalFinance}
                  onOpenHardshipModal={() => setIsHardshipModalOpen(true)}
                  onCopySeniorScript={handleCopySeniorScript}
                  copiedSeniorScript={copiedSeniorScript}
                />
              )}

              {normalizedActiveTab === 'household' && (
                <HouseholdPage
                  householdProfile={householdProfile}
                  onUpdateProfile={setHouseholdProfile}
                  onSyncUtilityBills={handleSyncUtilitiesToBills}
                  bills={data?.bills || []}
                  subscriptions={data?.subscriptions || []}
                  transactions={sourceTxsList}
                  accounts={data?.accounts || []}
                  onNavigateTab={(t) => setActiveTab(t)}
                  vaultItems={vaultItems}
                  onUpdateVaultItems={setVaultItems}
                />
              )}

              {normalizedActiveTab === 'vault' && (
                <VaultPage
                  vaultItems={vaultItems}
                  onUpdateVaultItems={setVaultItems}
                  onShowToast={showToast}
                />
              )}

              {normalizedActiveTab === 'advisor' && (
                <AdvisorPage
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  chatFiles={chatFiles}
                  setChatFiles={setChatFiles}
                  isAiTyping={isAiTyping}
                  aiMemory={aiMemory}
                  handleSendChatMessage={handleSendChatMessage}
                  handleStopGeneration={handleStopGeneration}
                  handleAttachFiles={handleAttachFiles}
                  handleExecuteSuggestedAction={handleExecuteSuggestedAction}
                  handleGenerateWeeklySummary={handleGenerateWeeklySummary}
                  setIsPastChatsOpen={setIsPastChatsOpen}
                  setIsMemoryModalOpen={setIsMemoryModalOpen}
                  setIsScanBillOpen={setIsScanBillOpen}
                  fullChatContainerRef={fullChatContainerRef}
                  chatEndRef={chatEndRef}
                  fullAdvisorFileInputRef={fullAdvisorFileInputRef}
                  fullUploadMenuRef={fullUploadMenuRef}
                  isFullUploadMenuOpen={isFullUploadMenuOpen}
                  setIsFullUploadMenuOpen={setIsFullUploadMenuOpen}
                  FormattedChatMessage={FormattedChatMessage}
                />
              )}

              {normalizedActiveTab === 'more' && (
                <div className="flex flex-col gap-5">
                  <div>
                    <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)]">More sections</h1>
                    <p className="text-[15px] font-medium text-[var(--muted)] mt-0.5">
                      Navigate to additional household, planning, and security pages.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'subscriptions', label: 'Subscriptions', desc: 'Recurring monthly and annual charges', icon: Zap },
                      { id: 'budgets', label: 'Budgets and goals', desc: 'Monthly spending limits and savings targets', icon: PieChart },
                      { id: 'retirement', label: 'Retirement', desc: 'Pensions, 401(k), IRAs, and Social Security', icon: Landmark },
                      { id: 'household', label: 'Household', desc: 'Home, utilities, vehicles, and providers', icon: Home },
                      { id: 'vault', label: 'Password vault', desc: 'Encrypted logins and account numbers', icon: KeyRound }
                    ].map((item) => {
                      const IconComp = item.icon;
                      return (
                        <Card
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[#1B4B91]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-[8px] bg-[#1B4B91]/10 text-[#1B4B91] flex items-center justify-center shrink-0">
                              <IconComp className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[16px] font-semibold text-[var(--ink)]">{item.label}</div>
                              <div className="text-[13px] font-medium text-[var(--muted)] truncate">{item.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0" />
                        </Card>
                      );
                    })}
                  </div>
                  <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-[16px] font-semibold text-[var(--ink)]">Account settings</div>
                      <div className="text-[13px] font-medium text-[var(--muted)]">{currentUser?.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSettingsActiveTab('profile');
                          setIsSettingsOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Button>
                      <Button variant="danger" size="sm" onClick={handleLogout}>
                        Sign out
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </main>
        )}

          {/* ================================================================= */}
          {/* RIGHT PERSISTENT ADVISOR SIDEBAR (Old AI Advisor Chat UI)         */}
          {/* ================================================================= */}
          {normalizedActiveTab !== 'advisor' && (
            <>
              {isAdvisorCollapsed ? (
                <div
                  role="button"
                  tabIndex={0}
                  onMouseDown={handleTabMouseDown}
                  style={{ top: `${advisorTabTop}px` }}
                  className="fixed right-0 z-50 bg-[#18457c] hover:bg-[#123561] text-white border-l border-y border-[#123561] shadow-xl rounded-l-2xl py-2.5 px-3 hidden lg:flex items-center gap-2 text-xs font-semibold select-none cursor-grab active:cursor-grabbing transition-colors group"
                  title="Drag up/down to reposition • Click to open AI Advisor"
                >
                  <GripVertical className="w-3.5 h-3.5 text-blue-200/60 group-hover:text-white transition-colors" />
                  <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
                  <span>Advisor</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAdvisorOnline ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                </div>
              ) : (
                <aside
                  aria-label="Financial Advisor Assistant"
                  style={{ width: `${advisorWidth}px` }}
                  className={`shrink-0 border-l border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-4 xl:p-5 flex flex-col h-screen sticky top-0 hidden lg:flex relative transition-[width] duration-75 select-none ${
                    isResizingAdvisor ? 'select-none cursor-col-resize !transition-none' : ''
                  }`}
                >
                  {/* Draggable Resize Handle on left border */}
                  <div
                    onMouseDown={startResizingAdvisor}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Resize Advisor sidebar"
                    className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center transition-colors ${
                      isResizingAdvisor ? 'bg-blue-500/30' : 'hover:bg-blue-400/20'
                    }`}
                    title="Drag to resize Advisor sidebar"
                  >
                    <div
                      className={`w-1 h-9 rounded-full transition-colors ${
                        isResizingAdvisor ? 'bg-[var(--brand)]' : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-[var(--brand)]'
                      }`}
                    />
                  </div>

                  {/* Header: Collapse & Past Chats (Left), Centered Name (Middle), Weekly Summary, Mini Settings, Fullscreen (Right) */}
                  <div className="shrink-0 flex items-center justify-between pb-3 border-b border-[var(--line)] relative">
                    {/* Left: Collapse Button + Past Chats */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAdvisorCollapsed(true)}
                        className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shadow-2xs border border-[var(--line)] bg-[var(--surface)]"
                        title="Collapse Advisor"
                        aria-label="Collapse Advisor"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPastChatsOpen(true)}
                        className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shadow-2xs border border-[var(--line)] bg-[var(--surface)]"
                        title="Past Conversations"
                        aria-label="Past Conversations"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Middle: Weekly Summary button on the LEFT side of "AI Advisor" title & Online Checkmark */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateWeeklySummary}
                        className="p-1 rounded-lg text-[var(--brand)] bg-[var(--brand-soft)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shadow-2xs border border-[var(--line)]"
                        title="Weekly Advisor Summary"
                        aria-label="Weekly Advisor Summary"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
                      </button>
                      <h2 className="text-sm font-bold text-[var(--ink)] tracking-tight">AI Advisor</h2>
                      <span
                        title={isAdvisorOnline ? 'Connected to the internet' : 'Connected locally only (Web search disabled)'}
                        className={`inline-flex items-center justify-center w-4 h-4 rounded-full border ${
                          isAdvisorOnline
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                            : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    </div>

                    {/* Right: AI Quick Settings (swapped places with Weekly Summary) + Full Screen AI */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsMemoryModalOpen((prev) => !prev)}
                        className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shadow-2xs border border-[var(--line)] bg-[var(--surface)]"
                        title="AI Advisor Quick Settings & Memory"
                        aria-label="AI Advisor Quick Settings & Memory"
                      >
                        <SlidersHorizontal className="w-4 h-4 text-[var(--brand)]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('advisor')}
                        className="p-1.5 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shadow-2xs border border-[var(--line)] bg-[var(--surface)]"
                        title="Full Screen Advisor"
                        aria-label="Full Screen Advisor"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Conversation Stream */}
                  <div ref={sidebarChatContainerRef} className="flex-1 overflow-y-auto py-3 space-y-3 min-h-0 pr-0.5 select-text">
                    {settingsAiStatus !== 'connected' && settingsAiProvider !== 'local' && (
                      <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-800 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>AI Advisor Not Connected</span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          Connect your Anthropic, OpenAI, or Google Gemini API key to activate personal debt payoff advice and automated intelligence.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsActiveTab('ai');
                            setIsSettingsOpen(true);
                          }}
                          className="self-start px-3 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-all mt-1"
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
                              ? 'bg-[var(--brand)] text-white shadow-2xs'
                              : 'bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)] shadow-2xs'
                          }`}
                        >
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
                            <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-[var(--line)]">
                              {msg.suggestedActions.map((act, actIdx) => (
                                <button
                                  key={actIdx}
                                  type="button"
                                  onClick={() => handleExecuteSuggestedAction(act)}
                                  className="px-2 py-1 rounded-lg bg-[var(--surface)] hover:bg-[var(--brand)] text-[var(--brand)] hover:text-white border border-[var(--line)] text-[10px] font-semibold transition-colors cursor-pointer shadow-2xs"
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
                        <div className="bg-[var(--surface-subtle)] border border-[var(--line)] rounded-2xl px-3.5 py-2.5 text-xs text-[var(--muted)] flex items-center gap-1.5 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-bounce [animation-delay:0.4s]" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions: Multi-File Preview + Chat Input Form */}
                  <div className="pt-3 border-t border-[var(--line)] flex flex-col gap-2 shrink-0">
                    {chatFiles.length > 0 && (
                      <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                        {chatFiles.map((fileItem) => (
                          <div
                            key={fileItem.id}
                            className="flex items-center gap-2 p-2 bg-[var(--surface-subtle)] rounded-xl border border-[var(--line)] w-full"
                          >
                            {fileItem.isImage && fileItem.previewUrl ? (
                              <img src={fileItem.previewUrl} alt={fileItem.name} className="w-9 h-9 rounded-lg object-cover border border-[var(--line)] shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-[var(--brand-soft)] border border-[var(--line)] flex flex-col items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-[var(--brand)]" />
                                <span className="text-[8px] font-bold text-[var(--brand)] uppercase">{fileItem.ext || 'FILE'}</span>
                              </div>
                            )}
                            <div className="min-w-0 pr-1 flex-1">
                              <p className="text-[11px] font-semibold text-[var(--ink)] truncate">{fileItem.name}</p>
                              <p className="text-[10px] text-[var(--muted)]">
                                {fileItem.ext || 'FILE'} • {(fileItem.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setChatFiles((prev) => prev.filter((f) => f.id !== fileItem.id))}
                              className="p-1 rounded-full text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                              title="Remove file"
                              aria-label={`Remove ${fileItem.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chat Form with Add File Menu (+) and multiline Textarea */}
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
                          onClick={() => setIsUploadMenuOpen((prev) => !prev)}
                          className="w-[38px] h-[38px] rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
                          title="Add file or scan document"
                          aria-label="Add file or scan document"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {isUploadMenuOpen && (
                          <div className="absolute bottom-full left-0 mb-2 w-60 bg-[var(--surface)] rounded-xl border border-[var(--line)] shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => {
                                setIsUploadMenuOpen(false);
                                setIsScanBillOpen(true);
                              }}
                              className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-left transition-colors cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[var(--ink)]">Scan Document</p>
                                <p className="text-[10px] text-[var(--muted)] leading-snug">Paste sentences &amp; AI auto-adds bills or subscriptions</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsUploadMenuOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-left transition-colors cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                                <UploadCloud className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-[var(--ink)]">Submit File</p>
                                <p className="text-[10px] text-[var(--muted)] leading-snug">Attach one or multiple files of any format for AI to read</p>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                      <label htmlFor="sidebar-advisor-input" className="sr-only">
                        Ask anything or attach files
                      </label>
                      <textarea
                        id="sidebar-advisor-input"
                        rows={1}
                        placeholder="Ask anything or attach files..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if ((chatInput.trim() || chatFiles.length > 0) && !isAiTyping) {
                              handleSendChatMessage(e);
                            }
                          }
                        }}
                        onPaste={async (e) => {
                          const files = e.clipboardData?.files;
                          if (files && files.length > 0) {
                            e.preventDefault();
                            await handleAttachFiles(files);
                          }
                        }}
                        className="flex-1 min-w-0 h-[38px] min-h-[38px] max-h-32 bg-[var(--surface-subtle)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--brand)] shadow-2xs resize-none leading-relaxed flex items-center"
                      />
                      {isAiTyping ? (
                        <button
                          type="button"
                          onClick={handleStopGeneration}
                          className="h-[38px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer shrink-0 animate-in fade-in zoom-in-90"
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
                          className="h-[38px] px-4 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold disabled:opacity-50 transition-colors shadow-2xs cursor-pointer shrink-0 flex items-center justify-center"
                        >
                          Send
                        </button>
                      )}
                    </form>
                  </div>
                </aside>
              )}
            </>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* MOBILE BOTTOM TAB BAR (< 760px): 5 ITEMS + MORE MENU                */}
      {/* =================================================================== */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="flex min-[760px]:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--surface)] border-t border-[var(--line)] px-1 py-1.5 justify-around items-center"
      >
        {[
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'transactions', label: 'Transactions', icon: History },
          { id: 'bills', label: 'Bills', icon: Receipt },
          { id: 'cards', label: 'Cards', icon: CreditCard },
          { id: 'advisor', label: 'Advisor', icon: Sparkles },
          { id: 'more', label: 'More', icon: Layers }
        ].map((tab) => {
          const IconComp = tab.icon;
          const isMoreGroup = ['subscriptions', 'budgets', 'retirement', 'household', 'vault', 'more'].includes(normalizedActiveTab);
          const isActive = tab.id === 'more' ? isMoreGroup : normalizedActiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-[8px] min-w-[52px] cursor-pointer ${
                isActive ? 'text-[#1B4B91] font-semibold' : 'text-[var(--muted)] font-medium'
              }`}
            >
              <IconComp className="w-4 h-4 shrink-0" />
              <span className="text-[13px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* =================================================================== */}
      {/* MODALS & DIALOGS                                                    */}
      {/* =================================================================== */}

      {/* 1. Settings Modal (6 Merged Tabs: Profile, Preferences, AI advisor, Bank, Security, About) */}
      <SettingsPage
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settingsActiveTab={settingsActiveTab}
        setSettingsActiveTab={setSettingsActiveTab}
        currentUser={currentUser}
        userInitials={userInitials}
        settingsDisplayName={settingsDisplayName}
        setSettingsDisplayName={setSettingsDisplayName}
        handleSaveProfile={handleSaveProfile}
        uiFontScale={uiFontScale}
        handleSetFontScale={handleSetFontScale}
        uiDensity={uiDensity}
        handleSetDensity={handleSetDensity}
        uiReduceMotion={uiReduceMotion}
        handleToggleReduceMotion={handleToggleReduceMotion}
        uiHighFocus={uiHighFocus}
        handleToggleHighFocus={handleToggleHighFocus}
        uiPrivacyMask={uiPrivacyMask}
        handleTogglePrivacyMask={handleTogglePrivacyMask}
        featureFlags={featureFlags}
        handleUpdateFeatureFlags={handleUpdateFeatureFlags}
        settingsAiProvider={settingsAiProvider}
        handleProviderChange={handleProviderChange}
        settingsAiModel={settingsAiModel}
        setSettingsAiModel={setSettingsAiModel}
        localAiEngineStatus={localAiEngineStatus}
        settingsAiApiKey={settingsAiApiKey}
        setSettingsAiApiKey={setSettingsAiApiKey}
        settingsAiMaskedKey={settingsAiMaskedKey}
        settingsAiShowKey={settingsAiShowKey}
        setSettingsAiShowKey={setSettingsAiShowKey}
        settingsAiStatus={settingsAiStatus}
        settingsAiTesting={settingsAiTesting}
        handleRemoveAiKey={handleRemoveAiKey}
        handleSaveAndTestAiKey={handleSaveAndTestAiKey}
        aiPermissions={settingsAiPermissions}
        handleToggleAiPermission={handleTogglePermission}
        aiMemory={aiMemory}
        handleClearAllMemory={handleClearAllMemory}
        settingsPlaidStatus={settingsPlaidStatus}
        settingsPlaidClientId={settingsPlaidClientId}
        setSettingsPlaidClientId={setSettingsPlaidClientId}
        settingsPlaidSecret={settingsPlaidSecret}
        setSettingsPlaidSecret={setSettingsPlaidSecret}
        settingsPlaidMaskedSecret={settingsPlaidMaskedSecret}
        settingsPlaidShowSecret={settingsPlaidShowSecret}
        setSettingsPlaidShowSecret={setSettingsPlaidShowSecret}
        handleSavePlaidCredentials={handleSavePlaidCredentials}
        initiatePlaidLink={initiatePlaidLink}
        plaidItems={settings?.plaidItems || []}
        data={data}
        handleDisconnectBank={handleDisconnectBank}
        handleDeleteAccount={handleDeleteAccount}
        setIsAddAccountOpen={setIsAddAccountOpen}
        autoLockMinutes={autoLockMinutes}
        setAutoLockMinutes={setAutoLockMinutes}
        idleAction={idleAction}
        setIdleAction={setIdleAction}
        handleLockSession={handleLockSession}
        vaultLockType={vaultLockType}
        setVaultLockType={setVaultLockType}
        vaultPinTimeout={vaultPinTimeout}
        setVaultPinTimeout={setVaultPinTimeout}
        clipboardClearSeconds={clipboardClearSeconds}
        setClipboardClearSeconds={setClipboardClearSeconds}
        handleLogout={handleLogout}
        desktopAppInfo={desktopAppInfo}
        formatVersionString={formatVersionString}
        handleManualCheckForUpdate={handleManualCheckForUpdate}
        isCheckingUpdateInSettings={isCheckingUpdateInSettings}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        handlePerformUpdate={handlePerformUpdate}
        isInstallingUpdate={isInstallingUpdate}
        feedbackType={feedbackType}
        setFeedbackType={setFeedbackType}
        feedbackText={feedbackText}
        setFeedbackText={setFeedbackText}
        isSubmittingFeedback={isSubmittingFeedback}
        feedbackSubmitted={feedbackSubmitted}
        handleSendFeedback={handleSendFeedback}
        onShowToast={showToast}
        sidebarNavOrder={sidebarNavOrder}
        handleMoveSidebarItem={handleMoveSidebarItem}
        handleResetSidebarOrder={handleResetSidebarOrder}
        SIDEBAR_ITEMS_CONFIG={SIDEBAR_ITEMS_CONFIG}
      />

      {/* 2. Payment Relief Guide Modal */}
      <HardshipPlaybookModal
        isOpen={isHardshipModalOpen}
        onClose={() => setIsHardshipModalOpen(false)}
        cards={displayCards}
        userName={currentUser?.name || firstName}
        isJudgmentProof={true}
        onShowToast={showToast}
      />

      {/* 3. Add Card / Bank Account Modal */}
      {isAddAccountOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-account-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-account-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Add card or bank account
              </h3>
              <button
                type="button"
                aria-label="Close add account modal"
                onClick={() => setIsAddAccountOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 bg-[var(--surface-subtle)] rounded-[8px] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setAddCardTab('plaid')}
                className={`py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
                  addCardTab === 'plaid'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold'
                    : 'text-[var(--muted)] font-medium'
                }`}
              >
                Automatic bank sync
              </button>
              <button
                type="button"
                onClick={() => setAddCardTab('manual')}
                className={`py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
                  addCardTab === 'manual'
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold'
                    : 'text-[var(--muted)] font-medium'
                }`}
              >
                Enter manually
              </button>
            </div>

            {addCardTab === 'plaid' ? (
              <div className="flex flex-col gap-4">
                <p className="text-[15px] font-medium text-[var(--muted)] leading-relaxed">
                  Securely connect your bank or credit card issuer with Plaid to import balances and transactions automatically.
                </p>
                {plaidError && (
                  <div className="p-3 rounded-[8px] bg-[#B91C1C]/10 border border-[#B91C1C]/30 text-[#B91C1C] text-[13px] font-medium">
                    {plaidError}
                  </div>
                )}
                <Button variant="primary" onClick={initiatePlaidLink} disabled={isConnectingPlaid} className="w-full">
                  <Building2 className="w-4 h-4" />
                  {isConnectingPlaid ? 'Connecting to Plaid...' : 'Continue with Plaid'}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAddAccount} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="manual-acc-institution" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Bank or issuer
                  </label>
                  <input
                    id="manual-acc-institution"
                    type="text"
                    required
                    value={newAccount.institution}
                    onChange={(e) => setNewAccount({ ...newAccount, institution: e.target.value })}
                    placeholder="e.g. Chase, Capital One"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="manual-acc-name" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Card or account name
                  </label>
                  <input
                    id="manual-acc-name"
                    type="text"
                    required
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                    placeholder="e.g. Sapphire Preferred"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="manual-acc-type" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                      Account type
                    </label>
                    <select
                      id="manual-acc-type"
                      value={newAccount.type}
                      onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                    >
                      <option value="credit">Credit card</option>
                      <option value="depository">Checking / savings</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="manual-acc-balance" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                      Current balance ($)
                    </label>
                    <input
                      id="manual-acc-balance"
                      type="number"
                      step="0.01"
                      required
                      value={newAccount.balance}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                      placeholder="0.00"
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                    />
                  </div>
                </div>
                {newAccount.type === 'credit' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="manual-acc-limit" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                        Credit limit ($)
                      </label>
                      <input
                        id="manual-acc-limit"
                        type="number"
                        step="1"
                        value={newAccount.limit}
                        onChange={(e) => setNewAccount({ ...newAccount, limit: e.target.value })}
                        placeholder="5000"
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="manual-acc-apr" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                        APR (%)
                      </label>
                      <input
                        id="manual-acc-apr"
                        type="number"
                        step="0.1"
                        value={newAccount.apr}
                        onChange={(e) => setNewAccount({ ...newAccount, apr: e.target.value })}
                        placeholder="21.9"
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                  <Button variant="secondary" onClick={() => setIsAddAccountOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Save account
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* 4. Add Bill Modal */}
      {isAddBillOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-bill-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-bill-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Add recurring bill
              </h3>
              <button
                type="button"
                aria-label="Close add bill modal"
                onClick={() => setIsAddBillOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBill} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-bill-name" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Bill or provider name
                </label>
                <input
                  id="new-bill-name"
                  type="text"
                  required
                  value={newBill.name}
                  onChange={(e) => setNewBill({ ...newBill, name: e.target.value, biller: e.target.value })}
                  placeholder="e.g. Electric & Gas, Water, Internet"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-bill-amount" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Amount ($)
                  </label>
                  <input
                    id="new-bill-amount"
                    type="number"
                    step="0.01"
                    required
                    value={newBill.expectedAmount}
                    onChange={(e) => setNewBill({ ...newBill, expectedAmount: e.target.value })}
                    placeholder="125.00"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="new-bill-due-day" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Due day of month (1–31)
                  </label>
                  <input
                    id="new-bill-due-day"
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={newBill.dueDay}
                    onChange={(e) => setNewBill({ ...newBill, dueDay: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-bill-category" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Category
                  </label>
                  <select
                    id="new-bill-category"
                    value={newBill.category}
                    onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Insurance">Insurance</option>
                    <option value="Phone & Internet">Phone &amp; Internet</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="new-bill-account" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Payment account
                  </label>
                  <select
                    id="new-bill-account"
                    value={newBill.account}
                    onChange={(e) => setNewBill({ ...newBill, account: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    {allFilterableCards.map((c) => (
                      <option key={c.id} value={c.fullLabel}>
                        {c.fullLabel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddBillOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save bill
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 5. Add Transaction / Purchase Modal */}
      {isAddTxOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-tx-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-tx-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Add purchase or deposit
              </h3>
              <button
                type="button"
                aria-label="Close add purchase modal"
                onClick={() => setIsAddTxOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-tx-name" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Merchant or description
                </label>
                <input
                  id="new-tx-name"
                  type="text"
                  required
                  value={newTx.name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewTx({
                      ...newTx,
                      name: val,
                      category: autoDetectPurchaseCategory(val)
                    });
                  }}
                  placeholder="e.g. Trader Joe's, Shell, Direct Deposit"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-tx-amount" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Amount ($)
                  </label>
                  <input
                    id="new-tx-amount"
                    type="number"
                    step="0.01"
                    required
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    placeholder="45.20"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="new-tx-date" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Date
                  </label>
                  <input
                    id="new-tx-date"
                    type="date"
                    required
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-tx-category" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Category
                  </label>
                  <select
                    id="new-tx-category"
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    {['Groceries', 'Dining', 'Gas', 'Shopping', 'Utilities', 'Housing', 'Transportation', 'Health', 'Travel', 'Subscriptions', 'Income'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-tx-account" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Card or account
                  </label>
                  <select
                    id="new-tx-account"
                    value={newTx.account}
                    onChange={(e) => setNewTx({ ...newTx, account: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    {allFilterableCards.map((c) => (
                      <option key={c.id} value={c.fullLabel}>{c.fullLabel}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="new-tx-notes" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Notes (optional)
                </label>
                <input
                  id="new-tx-notes"
                  type="text"
                  value={newTx.notes}
                  onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })}
                  placeholder="Optional memo"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddTxOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save purchase
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 6. Add Subscription Modal */}
      {isAddSubOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-sub-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-sub-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Add subscription
              </h3>
              <button
                type="button"
                aria-label="Close add subscription modal"
                onClick={() => setIsAddSubOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubscription} className="flex flex-col gap-4">
              <div>
                <label htmlFor="new-sub-name" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Service name
                </label>
                <input
                  id="new-sub-name"
                  type="text"
                  required
                  value={newSub.name}
                  onChange={(e) => setNewSub({ ...newSub, name: e.target.value })}
                  placeholder="e.g. Netflix, Spotify, iCloud"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="new-sub-amount" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Monthly cost ($)
                  </label>
                  <input
                    id="new-sub-amount"
                    type="number"
                    step="0.01"
                    required
                    value={newSub.amount}
                    onChange={(e) => setNewSub({ ...newSub, amount: e.target.value })}
                    placeholder="15.99"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="new-sub-category" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Category
                  </label>
                  <select
                    id="new-sub-category"
                    value={newSub.category}
                    onChange={(e) => setNewSub({ ...newSub, category: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    <option value="Streaming">Streaming</option>
                    <option value="Software">Software</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Membership">Membership</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="new-sub-account" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Charged to card
                </label>
                <select
                  id="new-sub-account"
                  value={newSub.account}
                  onChange={(e) => setNewSub({ ...newSub, account: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                >
                  {allFilterableCards.map((c) => (
                    <option key={c.id} value={c.fullLabel}>{c.fullLabel}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddSubOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save subscription
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 7. Add / Update Budget Modal */}
      {isAddBudgetOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-budget-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-budget-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Set monthly category budget
              </h3>
              <button
                type="button"
                aria-label="Close budget modal"
                onClick={() => setIsAddBudgetOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddOrUpdateBudget} className="flex flex-col gap-4">
              <div>
                <label htmlFor="budget-category-select" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Spending category
                </label>
                <select
                  id="budget-category-select"
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                >
                  {['Groceries', 'Dining', 'Gas', 'Shopping', 'Subscriptions', 'Bills', 'Utilities', 'Transportation', 'Health', 'Travel', 'Entertainment'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="budget-limit-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Monthly limit ($)
                </label>
                <input
                  id="budget-limit-input"
                  type="number"
                  step="5"
                  min="10"
                  required
                  value={newBudget.limit}
                  onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddBudgetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save budget
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 8. Add Savings Goal Modal */}
      {isAddGoalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-goal-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-goal-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                New savings goal
              </h3>
              <button
                type="button"
                aria-label="Close savings goal modal"
                onClick={() => setIsAddGoalOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="flex flex-col gap-4">
              <div>
                <label htmlFor="goal-name-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Goal name
                </label>
                <input
                  id="goal-name-input"
                  type="text"
                  required
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g. Emergency Fund, Property Tax Reserve"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="goal-target-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Target amount ($)
                  </label>
                  <input
                    id="goal-target-input"
                    type="number"
                    step="50"
                    min="50"
                    required
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, targetAmount: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label htmlFor="goal-current-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Saved so far ($)
                  </label>
                  <input
                    id="goal-current-input"
                    type="number"
                    step="10"
                    min="0"
                    value={newGoal.currentAmount}
                    onChange={(e) => setNewGoal({ ...newGoal, currentAmount: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="goal-monthly-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Planned monthly contribution ($)
                </label>
                <input
                  id="goal-monthly-input"
                  type="number"
                  step="10"
                  min="10"
                  value={newGoal.monthlyContribution}
                  onChange={(e) => setNewGoal({ ...newGoal, monthlyContribution: e.target.value })}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddGoalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save goal
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 9. Add Manual Asset / Loan Modal */}
      {isAddManualAssetOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-manual-asset-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="add-manual-asset-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Add manual asset or loan
              </h3>
              <button
                type="button"
                aria-label="Close manual asset modal"
                onClick={() => setIsAddManualAssetOpen(false)}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddManualAsset} className="flex flex-col gap-4">
              <div>
                <label htmlFor="manual-asset-name" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                  Account or asset name
                </label>
                <input
                  id="manual-asset-name"
                  type="text"
                  required
                  value={newManualAsset.name}
                  onChange={(e) => setNewManualAsset({ ...newManualAsset, name: e.target.value })}
                  placeholder="e.g. High-Yield Savings, Auto Loan"
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manual-asset-type" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Type
                  </label>
                  <select
                    id="manual-asset-type"
                    value={newManualAsset.type}
                    onChange={(e) => setNewManualAsset({ ...newManualAsset, type: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                  >
                    <option value="savings">Cash / savings</option>
                    <option value="investment">Investment</option>
                    <option value="property">Property / vehicle</option>
                    <option value="loan">Loan / liability</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="manual-asset-balance" className="block text-[13px] font-medium text-[var(--ink)] mb-1">
                    Balance or value ($)
                  </label>
                  <input
                    id="manual-asset-balance"
                    type="number"
                    step="0.01"
                    required
                    value={newManualAsset.balance}
                    onChange={(e) => setNewManualAsset({ ...newManualAsset, balance: e.target.value })}
                    placeholder="5000"
                    className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[15px] font-medium text-[var(--ink)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <Button variant="secondary" onClick={() => setIsAddManualAssetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save item
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* 10. Scan Statement Text Modal */}
      {isScanBillOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-statement-modal-title"
        >
          <Card className="max-w-2xl w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 id="scan-statement-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                  Scan document or statement
                </h3>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">
                  Paste bill lines, account statements, or receipts for AI comprehension.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close scan statement modal"
                onClick={() => {
                  setIsScanBillOpen(false);
                  setScanText('');
                }}
                className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label htmlFor="scan-statement-textarea" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                Statement or bill text
              </label>
              <textarea
                id="scan-statement-textarea"
                rows={11}
                value={scanText}
                onChange={(e) => setScanText(e.target.value)}
                placeholder={"e.g. PACIFIC GAS AND ELECTRIC COMPANY\nAccount: 4819-2041-02\nTotal Amount Due: $248.50\nPayment Due Date: November 15, 2026\nService: Electric and Natural Gas\n\nPaste any bill, receipt, or subscription sentences here..."}
                className="w-full min-h-[220px] bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] p-3.5 text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--muted)]/50 placeholder:font-normal focus:placeholder-transparent focus:outline-none focus:border-[var(--brand)] transition-colors leading-relaxed resize-y"
              />
              <p className="text-[13px] text-[var(--muted)] mt-1.5">
                The AI will automatically identify due dates, amounts, billing cycles, and merchants.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsScanBillOpen(false);
                  setScanText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleScanBill}
                disabled={!scanText.trim()}
              >
                Analyze statement
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 11. Past Chats Modal */}
      {isPastChatsOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="past-chats-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 id="past-chats-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Past conversations
              </h3>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={handleCreateNewChat}>
                  <Plus className="w-4 h-4" />
                  New chat
                </Button>
                <button
                  type="button"
                  aria-label="Close past chats modal"
                  onClick={() => setIsPastChatsOpen(false)}
                  className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[var(--line)]">
              {chatSessions.map((sess) => {
                const isCurrent = sess.id === activeSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSwitchSession(sess.id)}
                    className={`py-3 px-3 rounded-[8px] flex items-center justify-between gap-2 cursor-pointer ${
                      isCurrent ? 'bg-[#1B4B91]/10' : 'hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-[var(--ink)] truncate">
                        {sess.title || 'Conversation'}
                      </div>
                      <div className="text-[13px] font-medium text-[var(--muted)]">
                        {(sess.messages || []).length} messages
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete conversation ${sess.title || ''}`}
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[#B91C1C] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* 12. Mini AI Advisor Settings & Tools Modal */}
      {isMemoryModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMemoryModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advisor-memory-modal-title"
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
                  <h3 id="advisor-memory-modal-title" className="font-serif text-lg font-bold text-slate-900">
                    AI Advisor Tools &amp; Settings
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Fine-tune memory, response depth, and live web access
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close AI Advisor Tools & Settings"
                onClick={() => setIsMemoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tool 1: Response Length & Detail */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Response Length &amp; Detail
              </label>
              <p className="text-[11px] text-slate-500 -mt-1">
                Controls how much the AI writes before finishing its response.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: 'concise', label: 'Concise', words: '~150 words', desc: 'Fast, bullet points only' },
                  { id: 'balanced', label: 'Balanced', words: '~350 words', desc: 'Standard practical advice' },
                  { id: 'detailed', label: 'In-Depth', words: '~700 words', desc: 'Comprehensive math & plans' }
                ].map((opt) => (
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

            {/* Tool 2: Live Internet Web Search Connection */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    aiWebSearchEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">Live Internet Web Search</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        aiWebSearchEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
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
                aria-label="Toggle live internet web search"
                onClick={() => setAiWebSearchEnabled((prev) => !prev)}
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
                  <label htmlFor="new-memory-fact-input" className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Advisor Memory
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Custom rules the AI remembers across every question.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">{aiMemory.length} saved</span>
              </div>

              <div className="flex gap-2">
                <input
                  id="new-memory-fact-input"
                  type="text"
                  placeholder="e.g. Prioritize paying off high-interest cards before saving..."
                  value={newMemoryInput}
                  onChange={(e) => setNewMemoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMemory(newMemoryInput);
                    }
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddMemory(newMemoryInput)}
                  className="px-4 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto border border-slate-100 rounded-xl px-2">
                {aiMemory.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-3 text-center italic">
                    No custom preferences saved yet.
                  </p>
                ) : (
                  aiMemory.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs gap-2">
                      <span className="text-slate-700 leading-snug">{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMemory(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                        title="Remove memory"
                        aria-label="Remove memory"
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
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Data Access Permissions
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cards', label: 'Cards' },
                  { id: 'bills', label: 'Bills' },
                  { id: 'subscriptions', label: 'Subscriptions' },
                  { id: 'purchases', label: 'Purchases' },
                  ...(featureFlags.retirement !== false ? [{ id: 'retirement', label: 'Retirement Plans' }] : [])
                ].map((p) => {
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
                  const freshThread = [
                    {
                      role: 'assistant',
                      text: 'Conversation cleared. How can I assist you with your finances today?'
                    }
                  ];
                  updateActiveSession(freshThread);
                  showToast('Conversation thread cleared', 'success');
                }}
                className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Clear Current Chat
              </button>

              <button
                type="button"
                onClick={() => setIsMemoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#18457c] hover:bg-[#123561] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClearAdvisorMemoryOpen}
        title="Clear all advisor memory?"
        message="This will remove all saved financial preferences and facts from your Advisor memory."
        confirmLabel="Clear memory"
        variant="danger"
        onCancel={() => setConfirmClearAdvisorMemoryOpen(false)}
        onConfirm={() => {
          handleClearAllMemory();
          setConfirmClearAdvisorMemoryOpen(false);
        }}
      />

      {/* 13. Software Update Modal */}
      {isUpdateModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3 id="update-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                Update available
              </h3>
              <Pill variant="brand">
                {formatVersionString(desktopAppInfo.updateStatus?.latestVersion || CURRENT_APP_VERSION)}
              </Pill>
            </div>
            <p className="text-[15px] font-medium text-[var(--ink)] leading-relaxed">
              A new version of Klarity is ready to install with improvements and updates.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setUpdatePromptDismissed(true);
                  const pendingSha =
                    desktopAppInfo.updateStatus?.commitSha || desktopAppInfo.updateStatus?.fullSha;
                  if (pendingSha) {
                    try {
                      localStorage.setItem('klarity_dismissed_update_sha', pendingSha);
                    } catch {}
                  }
                }}
              >
                Later
              </Button>
              <Button variant="primary" onClick={handlePerformUpdate} disabled={isInstallingUpdate}>
                {isInstallingUpdate ? 'Updating...' : 'Install update'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 14. What's New Modal */}
      {isWhatsNewOpen && whatsNewData && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="whats-new-modal-title"
        >
          <Card className="max-w-md w-full p-6 flex flex-col gap-4 shadow-xl">
            {/* Centered Title & Version Pill */}
            <div className="flex items-center justify-center gap-2">
              <h3 id="whats-new-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)] text-center">
                What&apos;s new in Klarity
              </h3>
              <Pill variant="success">
                {formatVersionString ? formatVersionString(whatsNewData.version || CURRENT_APP_VERSION) : CURRENT_APP_VERSION}
              </Pill>
            </div>

            {/* End-to-end divider line */}
            <div className="-mx-6 border-b border-[var(--line)]" />

            {/* Updated Items Bullet List */}
            <ul className="list-disc list-inside space-y-2 text-[15px] font-medium text-[var(--ink)] py-1">
              {formatWhatsNewHighlights(whatsNewData.changes || whatsNewData)
                .slice(0, 4)
                .map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
            </ul>

            {/* End-to-end divider line */}
            <div className="-mx-6 border-b border-[var(--line)]" />

            {/* Faded Informational Sentence */}
            <p className="text-xs text-[var(--muted)] text-center leading-relaxed">
              You can view complete update details in the About page in Settings.
            </p>

            {/* Action Buttons: About (Bottom-Left), Got it (Bottom-Right) */}
            <div className="flex items-center justify-between pt-1">
              <Button
                variant="secondary"
                onClick={() => {
                  handleDismissWhatsNew();
                  setSettingsActiveTab('about');
                  setIsSettingsOpen(true);
                }}
              >
                About
              </Button>
              <Button variant="primary" onClick={handleDismissWhatsNew}>
                Got it
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
