import React, { useState, useEffect } from 'react';
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Building2,
  Clock,
  Lock,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  LayoutDashboard,
  CreditCard,
  History,
  Receipt,
  Zap,
  PieChart,
  Home,
  Landmark,
  Sparkles,
  Globe,
  Search,
  Folder,
  Bookmark
} from 'lucide-react';
import { Button, Card, Pill, ConfirmDialog } from '../components/ui';
import { formatCleanUpdateMessage, formatWhatsNewHighlights } from '../components/SharedAppComponents';
import { SEARCH_ENGINES, DEFAULT_BROWSER_SETTINGS, clearBrowserSessionState } from '../utils/browserSettings';
import {
  hasMasterPinSet,
  verifyMasterPin,
  setMasterPin,
  removeMasterPin,
  clearLockoutState
} from '../utils/securityCrypto';

export function SettingsPage({
  isOpen,
  onClose,
  settingsActiveTab = 'profile',
  setSettingsActiveTab,
  currentUser,
  userInitials = 'U',
  settingsDisplayName = '',
  setSettingsDisplayName,
  handleSaveProfile,
  uiFontScale = '100',
  handleSetFontScale,
  uiDensity = 'comfortable',
  handleSetDensity,
  uiReduceMotion = false,
  handleToggleReduceMotion,
  uiHighFocus = false,
  handleToggleHighFocus,
  uiPrivacyMask = false,
  handleTogglePrivacyMask,
  featureFlags = {},
  handleUpdateFeatureFlags,
  settingsAiProvider = 'local',
  handleProviderChange,
  settingsAiModel = '',
  setSettingsAiModel,
  localAiEngineStatus,
  settingsAiApiKey = '',
  setSettingsAiApiKey,
  settingsAiMaskedKey = '',
  settingsAiShowKey = false,
  setSettingsAiShowKey,
  settingsAiStatus = 'not_connected',
  settingsAiTesting = false,
  handleRemoveAiKey,
  handleSaveAndTestAiKey,
  aiPermissions = {},
  handleToggleAiPermission,
  aiMemory = [],
  handleClearAllMemory,
  settingsPlaidStatus = 'not_connected',
  settingsPlaidClientId = '',
  setSettingsPlaidClientId,
  settingsPlaidSecret = '',
  setSettingsPlaidSecret,
  settingsPlaidMaskedSecret = '',
  settingsPlaidShowSecret = false,
  setSettingsPlaidShowSecret,
  handleSavePlaidCredentials,
  initiatePlaidLink,
  plaidItems = [],
  data = {},
  handleDisconnectBank,
  handleDeleteAccount,
  setIsAddAccountOpen,
  autoLockMinutes = 15,
  setAutoLockMinutes,
  idleAction = 'lock',
  setIdleAction,
  handleLockSession,
  vaultLockType = 'pin',
  setVaultLockType,
  vaultPinTimeout = '15m',
  setVaultPinTimeout,
  clipboardClearSeconds = 30,
  setClipboardClearSeconds,
  handleLogout,
  desktopAppInfo = {},
  formatVersionString,
  handleManualCheckForUpdate,
  isCheckingUpdateInSettings = false,
  onOpenUpdateModal,
  handlePerformUpdate,
  isInstallingUpdate = false,
  feedbackType = 'General Feedback',
  setFeedbackType,
  feedbackText = '',
  setFeedbackText,
  isSubmittingFeedback = false,
  feedbackSubmitted = false,
  handleSendFeedback,
  onShowToast,
  sidebarNavOrder = [],
  handleMoveSidebarItem,
  handleResetSidebarOrder,
  SIDEBAR_ITEMS_CONFIG: propsSidebarConfig,
  browserSettings = DEFAULT_BROWSER_SETTINGS,
  onUpdateBrowserSettings,
  browserBookmarks = [],
  onUpdateBrowserBookmarks,
  browserOnly = false
}) {
  // Map legacy tab names ('ui', 'plaid') into modern tabs
  const normalizedTab = browserOnly
    ? 'browser'
    : settingsActiveTab === 'ui'
    ? 'preferences'
    : settingsActiveTab === 'plaid'
    ? 'bank'
    : settingsActiveTab || 'profile';

  const [themeMode, setThemeMode] = useState(() => {
    try {
      return localStorage.getItem('klarity_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  const [pinAlreadySet, setPinAlreadySet] = useState(() => hasMasterPinSet());
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinStatusMsg, setPinStatusMsg] = useState('');
  const [pinStatusError, setPinStatusError] = useState(false);

  const [confirmDisablePinOpen, setConfirmDisablePinOpen] = useState(false);
  const [disablePinVerifyInput, setDisablePinVerifyInput] = useState('');
  const [confirmDisconnectBank, setConfirmDisconnectBank] = useState(null);
  const [confirmClearMemory, setConfirmClearMemory] = useState(false);
  const [showFullReleaseNotes, setShowFullReleaseNotes] = useState(false);

  // Browser Settings local states
  const [browserAdBlockStats, setBrowserAdBlockStats] = useState({ enabled: true, adsBlockedCount: 0 });
  const [newSettingsBmTitle, setNewSettingsBmTitle] = useState('');
  const [newSettingsBmUrl, setNewSettingsBmUrl] = useState('');
  const [newSettingsBmFolder, setNewSettingsBmFolder] = useState('');
  const [newSettingsFolderName, setNewSettingsFolderName] = useState('');
  const [isClearingBrowserData, setIsClearingBrowserData] = useState(false);
  const [newStartupPageInput, setNewStartupPageInput] = useState('');
  const [electronBrowserPrefs, setElectronBrowserPrefs] = useState({
    doNotTrack: Boolean(browserSettings?.doNotTrack),
    cookiePolicy: browserSettings?.cookiePolicy || 'allow',
    downloadPath: browserSettings?.downloadPath || '',
    askWhereToSave: Boolean(browserSettings?.askWhereToSave)
  });

  useEffect(() => {
    if (isOpen && normalizedTab === 'browser') {
      if (window.klarityDesktop?.getAdBlockStats) {
        window.klarityDesktop.getAdBlockStats().then((stats) => {
          if (stats) setBrowserAdBlockStats(stats);
        }).catch(() => {});
      }
      if (window.klarityDesktop?.getBrowserPrefs) {
        window.klarityDesktop.getBrowserPrefs().then((prefs) => {
          if (prefs) setElectronBrowserPrefs(prefs);
        }).catch(() => {});
      }
    }
  }, [isOpen, normalizedTab]);

  const updateDesktopBrowserPrefs = async (patch) => {
    const next = { ...electronBrowserPrefs, ...patch };
    setElectronBrowserPrefs(next);
    if (onUpdateBrowserSettings) {
      onUpdateBrowserSettings({ ...browserSettings, ...patch });
    }
    if (window.klarityDesktop?.updateBrowserPrefs) {
      try {
        const saved = await window.klarityDesktop.updateBrowserPrefs(patch);
        if (saved) setElectronBrowserPrefs(saved);
      } catch {}
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPinAlreadySet(hasMasterPinSet());
      setPinStatusMsg('');
      setPinStatusError(false);
      // Clean up any legacy plaintext PIN
      try {
        localStorage.removeItem('klarity_vault_pin');
      } catch {}
    }
  }, [isOpen]);

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem('klarity_theme', mode);
      const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (mode === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('dark');
      } else if (mode === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', isDark);
      }
    } catch {}
    if (onShowToast) {
      onShowToast(`Theme set to ${mode}`, 'success');
    }
  };

  const handleSaveVaultPin = async (e) => {
    e.preventDefault();
    setPinStatusMsg('');
    setPinStatusError(false);

    if (pinAlreadySet) {
      if (!currentPinInput) {
        setPinStatusError(true);
        setPinStatusMsg('Please enter your current PIN to change it.');
        return;
      }
      const verification = await verifyMasterPin(currentPinInput);
      if (!verification.valid) {
        setPinStatusError(true);
        setPinStatusMsg(verification.error || 'Current PIN is incorrect.');
        return;
      }
    }

    if (!newPinInput || newPinInput.length < 4) {
      setPinStatusError(true);
      setPinStatusMsg('New PIN must be at least 4 characters.');
      return;
    }

    if (newPinInput !== confirmPinInput) {
      setPinStatusError(true);
      setPinStatusMsg('New PIN and confirmation do not match.');
      return;
    }

    try {
      await setMasterPin(newPinInput);
      localStorage.removeItem('klarity_vault_pin');
      localStorage.setItem('klarity_vault_lock_type', 'pin');
      setVaultLockType('pin');
      setPinAlreadySet(true);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinStatusError(false);
      setPinStatusMsg('Security PIN updated.');
      if (onShowToast) onShowToast('Vault security PIN updated', 'success');
    } catch (err) {
      setPinStatusError(true);
      setPinStatusMsg(err.message || 'Could not update PIN.');
    }
  };

  const handleConfirmDisableVaultPin = async () => {
    if (pinAlreadySet) {
      const verification = await verifyMasterPin(disablePinVerifyInput);
      if (!verification.valid) {
        setPinStatusError(true);
        setPinStatusMsg(verification.error || 'Incorrect current PIN. Cannot disable lock.');
        setConfirmDisablePinOpen(false);
        setDisablePinVerifyInput('');
        return;
      }
    }
    removeMasterPin();
    try {
      localStorage.removeItem('klarity_vault_pin');
      localStorage.setItem('klarity_vault_lock_type', 'none');
      sessionStorage.removeItem('klarity_vault_unlocked_until');
    } catch {}
    setVaultLockType('none');
    setPinAlreadySet(false);
    setDisablePinVerifyInput('');
    setConfirmDisablePinOpen(false);
    if (onShowToast) onShowToast('Vault lock disabled', 'success');
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'sidebar', label: 'Sidebar' },
    { id: 'browser', label: 'Browser' },
    { id: 'ai', label: 'AI advisor', dot: settingsAiStatus !== 'connected' && settingsAiProvider !== 'local' },
    { id: 'bank', label: 'Bank', dot: settingsPlaidStatus !== 'connected' },
    { id: 'security', label: 'Security' },
    { id: 'about', label: 'About' }
  ];

  const DEFAULT_CONFIG = {
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
  const effectiveConfig = propsSidebarConfig || DEFAULT_CONFIG;
  const effectiveSidebarOrder =
    Array.isArray(sidebarNavOrder) && sidebarNavOrder.length > 0
      ? sidebarNavOrder
      : Object.keys(effectiveConfig);

  const displayNameFallback =
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split('@')[0] : 'Account holder');

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className={`${browserOnly ? 'max-w-[700px]' : 'max-w-[900px]'} w-full max-h-[90vh] h-[680px] flex flex-col overflow-hidden shadow-xl`}
      >
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Navigation Tabs (Hidden when opened directly as Browser Settings) */}
          {!browserOnly && (
          <div className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-[var(--line)] p-4 sm:p-5 flex flex-col justify-between bg-[var(--surface-subtle)]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 id="settings-modal-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                  Settings
                </h2>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={onClose}
                  className="md:hidden p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0" aria-label="Settings sections">
                {tabs.map((tab) => {
                  const isActive = normalizedTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSettingsActiveTab(tab.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-[8px] text-[15px] flex items-center justify-between transition-colors cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-[#1B4B91] text-white font-semibold'
                          : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] font-medium'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.dot && (
                        <span className="w-2 h-2 rounded-full bg-[#B45309] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="hidden md:block pt-4 border-t border-[var(--line)]">
              <Button variant="secondary" size="sm" className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
          )}

          {/* Right Content Panel */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto bg-[var(--surface)] text-[var(--ink)]">
            {/* TAB 1: PROFILE */}
            {normalizedTab === 'profile' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Profile</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Manage how your name and account details appear in Klarity.
                  </p>
                </div>

                <Card className="p-5 flex flex-col gap-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-[#1B4B91] text-white flex items-center justify-center font-semibold text-[16px] shrink-0">
                      {userInitials}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--ink)]">{displayNameFallback}</p>
                      <p className="text-[13px] font-medium text-[var(--muted)]">{currentUser?.email || ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label htmlFor="profile-display-name" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Display name
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        value={settingsDisplayName}
                        onChange={(e) => setSettingsDisplayName(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                      />
                    </div>

                    <div>
                      <label htmlFor="profile-email-readonly" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Email address
                      </label>
                      <input
                        id="profile-email-readonly"
                        type="email"
                        value={currentUser?.email || ''}
                        disabled
                        className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--muted)] cursor-not-allowed"
                      />
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                        Account email cannot be changed here.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-[var(--line)]">
                    <Button variant="primary" onClick={handleSaveProfile}>
                      Save profile
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: PREFERENCES (Merged UI, Theme, Readability, Density & Sidebar Visibility) */}
            {normalizedTab === 'preferences' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Preferences</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Customize color theme, readability scale, layout density, and visible sections.
                  </p>
                </div>

                {/* Theme Mode */}
                <Card className="p-5 flex flex-col gap-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--ink)]">Appearance</h4>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      Choose light mode, dark mode, or match your system setting.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'light', label: 'Light' },
                      { id: 'dark', label: 'Dark' },
                      { id: 'system', label: 'System default' }
                    ].map((opt) => (
                      <Button
                        key={opt.id}
                        variant={themeMode === opt.id ? 'primary' : 'secondary'}
                        onClick={() => handleThemeChange(opt.id)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </Card>

                {/* Readability Scaling (100% - 200%) */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[16px] font-semibold text-[var(--ink)]">Readability scale</h4>
                        <Pill variant="brand">{Number(uiFontScale) || 100}%</Pill>
                      </div>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                        Scale page text and numbers up to 200% while keeping navigation controls fixed.
                      </p>
                    </div>
                    {String(uiFontScale) !== '100' && (
                      <Button variant="ghost" size="sm" onClick={() => handleSetFontScale('100')}>
                        Reset to 100%
                      </Button>
                    )}
                  </div>

                  <div>
                    <label htmlFor="readability-scale-range" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                      Text and content zoom ({Number(uiFontScale) || 100}%)
                    </label>
                    <input
                      id="readability-scale-range"
                      type="range"
                      min="100"
                      max="200"
                      step="5"
                      value={Number(uiFontScale) || 100}
                      onChange={(e) => handleSetFontScale(e.target.value)}
                      className="w-full accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[100, 125, 150, 175, 200].map((pct) => (
                      <Button
                        key={pct}
                        variant={Number(uiFontScale) === pct ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => handleSetFontScale(String(pct))}
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
                </Card>

                {/* Density & Accessibility */}
                <Card className="p-5 flex flex-col gap-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--ink)]">Layout and accessibility</h4>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      Adjust spacing and visual comfort options.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'comfortable', label: 'Comfortable spacing' },
                      { id: 'compact', label: 'Compact spacing' }
                    ].map((d) => (
                      <Button
                        key={d.id}
                        variant={uiDensity === d.id ? 'primary' : 'secondary'}
                        onClick={() => handleSetDensity(d.id)}
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>

                  <div className="divide-y divide-[var(--line)] pt-2">
                    {[
                      {
                        label: 'Reduce motion',
                        desc: 'Minimize transitions and animations across pages.',
                        checked: uiReduceMotion,
                        onToggle: handleToggleReduceMotion
                      },
                      {
                        label: 'High-visibility focus rings',
                        desc: 'Strengthen keyboard focus outlines on buttons and inputs.',
                        checked: uiHighFocus,
                        onToggle: handleToggleHighFocus
                      },
                      {
                        label: 'Privacy mask',
                        desc: 'Hide account balances until hovered.',
                        checked: uiPrivacyMask,
                        onToggle: handleTogglePrivacyMask
                      }
                    ].map((item) => (
                      <div key={item.label} className="py-3 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[15px] font-medium text-[var(--ink)]">{item.label}</p>
                          <p className="text-[13px] font-medium text-[var(--muted)]">{item.desc}</p>
                        </div>
                        <Button
                          variant={item.checked ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={item.onToggle}
                        >
                          {item.checked ? 'On' : 'Off'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Navigation Section Toggles */}
                <Card className="p-5 flex flex-col gap-3">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--ink)]">Optional navigation sections</h4>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      Show or hide optional pages in the sidebar without deleting your data.
                    </p>
                  </div>
                  <div className="divide-y divide-[var(--line)]">
                    {[
                      { flag: 'budgets', label: 'Budgets and savings goals' },
                      { flag: 'retirement', label: 'Retirement and pensions' },
                      { flag: 'household', label: 'Household and providers' },
                      { flag: 'vault', label: 'Password vault' }
                    ].map((sec) => {
                      const enabled = featureFlags[sec.flag] !== false;
                      return (
                        <div key={sec.flag} className="py-3 flex items-center justify-between gap-3">
                          <span className="text-[15px] font-medium text-[var(--ink)]">{sec.label}</span>
                          <Button
                            variant={enabled ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleUpdateFeatureFlags({ [sec.flag]: !enabled })}
                          >
                            {enabled ? 'Shown' : 'Hidden'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB: SIDEBAR & NAVIGATION */}
            {normalizedTab === 'sidebar' && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Sidebar and navigation</h3>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                      Customize your navigation order with Move Up / Move Down, or toggle optional sections to show or hide them.
                    </p>
                  </div>
                  {handleResetSidebarOrder && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleResetSidebarOrder}
                      className="self-start sm:self-auto flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset layout</span>
                    </Button>
                  )}
                </div>

                {/* Reorderable and Toggleable List of Navigation Items */}
                <Card className="divide-y divide-[var(--line)] overflow-hidden p-0">
                  {effectiveSidebarOrder.map((itemId, idx) => {
                    const config = effectiveConfig[itemId];
                    if (!config) return null;
                    const Icon = config.icon || LayoutDashboard;
                    const isOptional = Boolean(config.flag);
                    const isEnabled = isOptional ? featureFlags[config.flag] !== false : true;

                    const descriptions = {
                      dashboard: 'Main financial overview, net worth, cash flow and health score.',
                      cards: 'Credit cards, utilization, weighted APR and interactive payoff engine.',
                      transactions: 'Purchases, transaction history, categories and card filters.',
                      bills: 'Upcoming bills, recurring due dates and payment schedules.',
                      subscriptions: 'Monthly and annual active software and entertainment subs.',
                      budgets: 'Spending budgets and category progress limits.',
                      household: 'Utility bills (PG&E / water), fleet vehicles, and healthcare.',
                      retirement: 'Public pensions (CalPERS, CalSTRS), 401(k), IRAs and Social Security.',
                      vault: 'Encrypted password and account credentials vault.',
                      advisor: 'Interactive AI financial and lifestyle assistant.'
                    };

                    return (
                      <div
                        key={itemId}
                        className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                          !isEnabled ? 'bg-[var(--surface-subtle)]/50 opacity-60' : 'hover:bg-[var(--surface-subtle)]/30'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center text-[#1B4B91] shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-semibold text-[var(--ink)]">{config.label}</p>
                              <span className="text-[11px] font-mono text-[var(--muted)]">#{idx + 1}</span>
                              {!isOptional ? (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-subtle)] text-[var(--muted)]">
                                  Core
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5 line-clamp-1">
                              {descriptions[itemId] || ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Up / Down Order Buttons */}
                          <div className="flex items-center bg-[var(--surface-subtle)] rounded-lg p-0.5 border border-[var(--line)]">
                            <button
                              type="button"
                              onClick={() => handleMoveSidebarItem && handleMoveSidebarItem(itemId, 'up')}
                              disabled={idx === 0}
                              title="Move section up"
                              aria-label={`Move ${config.label} up`}
                              className="p-1.5 rounded-md hover:bg-white text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSidebarItem && handleMoveSidebarItem(itemId, 'down')}
                              disabled={idx === effectiveSidebarOrder.length - 1}
                              title="Move section down"
                              aria-label={`Move ${config.label} down`}
                              className="p-1.5 rounded-md hover:bg-white text-[var(--ink)] disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Visibility Toggle */}
                          {isOptional ? (
                            <Button
                              variant={isEnabled ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => handleUpdateFeatureFlags({ [config.flag]: !isEnabled })}
                            >
                              {isEnabled ? 'Shown' : 'Hidden'}
                            </Button>
                          ) : (
                            <div className="w-16 text-center">
                              <span className="text-[13px] text-[var(--muted)] font-medium">Always</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Card>

                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] text-[13px] font-medium text-[var(--muted)] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Your sidebar arrangement and feature visibility are saved in real-time. Hiding an item removes its button from navigation and mobile menu while preserving all of your underlying accounts and data.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: AI ADVISOR */}
            {normalizedTab === 'ai' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">AI advisor</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Configure the AI model and choose which financial categories it can read.
                  </p>
                </div>

                <Card className="p-5 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="ai-provider-select" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Provider
                      </label>
                      <select
                        id="ai-provider-select"
                        value={settingsAiProvider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                      >
                        <option value="local">Built-in Local AI (No key required)</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="openai">OpenAI (ChatGPT)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="ai-model-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Model
                      </label>
                      <input
                        id="ai-model-input"
                        type="text"
                        value={settingsAiModel}
                        onChange={(e) => setSettingsAiModel(e.target.value)}
                        placeholder={settingsAiProvider === 'local' ? 'Llama-3.2-3B-Instruct' : 'gemini-2.0-flash'}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                      />
                    </div>
                  </div>

                  {settingsAiProvider === 'local' ? (
                    <div className="p-3.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] text-[13px] font-medium text-[var(--muted)]">
                      {localAiEngineStatus?.message || 'Runs locally on your device. No external API key required.'}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="ai-api-key-input" className="text-[13px] font-medium text-[var(--ink)]">
                          API key
                        </label>
                        <a
                          href="https://aistudio.google.com/api-keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1B4B91] hover:underline"
                        >
                          <span>Get a Gemini API key</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          id="ai-api-key-input"
                          type={settingsAiShowKey ? 'text' : 'password'}
                          value={settingsAiApiKey}
                          onChange={(e) => setSettingsAiApiKey(e.target.value)}
                          placeholder={settingsAiMaskedKey ? `Saved: ${settingsAiMaskedKey}` : 'Paste API key'}
                          className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 pr-10 text-[15px] font-medium text-[var(--ink)]"
                        />
                        <button
                          type="button"
                          aria-label={settingsAiShowKey ? 'Hide API key' : 'Show API key'}
                          onClick={() => setSettingsAiShowKey(!settingsAiShowKey)}
                          className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                        >
                          {settingsAiShowKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--muted)] font-medium">Status:</span>
                      {settingsAiStatus === 'connected' || settingsAiProvider === 'local' ? (
                        <Pill variant="success">Connected</Pill>
                      ) : settingsAiStatus === 'invalid_key' ? (
                        <Pill variant="danger">Invalid key</Pill>
                      ) : (
                        <Pill variant="warning">Not connected</Pill>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {Boolean(settingsAiMaskedKey) && settingsAiProvider !== 'local' && (
                        <Button variant="danger" size="sm" onClick={handleRemoveAiKey}>
                          Remove key
                        </Button>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSaveAndTestAiKey}
                        disabled={settingsAiTesting}
                      >
                        {settingsAiTesting
                          ? 'Saving...'
                          : settingsAiProvider === 'local'
                          ? 'Activate local model'
                          : 'Save and test key'}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Data Access Permissions */}
                <Card className="p-5 flex flex-col gap-4">
                  <div>
                    <h4 className="text-[16px] font-semibold text-[var(--ink)]">Data access permissions</h4>
                    <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                      Control which categories of financial data the Advisor can read.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'bills', label: 'Bills' },
                      { id: 'subscriptions', label: 'Subscriptions' },
                      { id: 'cards', label: 'Cards' },
                      { id: 'purchases', label: 'Purchases' }
                    ].map((perm) => {
                      const active = aiPermissions[perm.id] !== false;
                      return (
                        <Button
                          key={perm.id}
                          variant={active ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => handleToggleAiPermission && handleToggleAiPermission(perm.id)}
                        >
                          {active && <Check className="w-3.5 h-3.5" />}
                          {perm.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-[var(--line)] flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-medium text-[var(--ink)]">Advisor memory ({aiMemory.length} facts)</p>
                      <p className="text-[13px] font-medium text-[var(--muted)]">
                        Saved preferences and financial notes remembered across chats.
                      </p>
                    </div>
                    {aiMemory.length > 0 && (
                      <Button variant="danger" size="sm" onClick={() => setConfirmClearMemory(true)}>
                        Clear memory
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: BANK */}
            {normalizedTab === 'bank' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Bank connection</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Connect your bank accounts via Plaid or manage existing connections.
                  </p>
                </div>

                {/* Connected Banks */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[16px] font-semibold text-[var(--ink)]">Connected institutions</h4>
                      <p className="text-[13px] font-medium text-[var(--muted)]">
                        Link accounts with Plaid or add cards manually.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="primary" size="sm" onClick={initiatePlaidLink}>
                        <Building2 className="w-4 h-4" />
                        Connect bank with Plaid
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onClose();
                          setIsAddAccountOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        Add manually
                      </Button>
                    </div>
                  </div>

                  {(() => {
                    const realAccounts = (data.accounts || []).filter((a) => !String(a.id).startsWith('mock-'));
                    const groupedByInst = {};
                    realAccounts.forEach((acc) => {
                      const inst = acc.institution || 'Manual / Connected Account';
                      if (!groupedByInst[inst]) groupedByInst[inst] = [];
                      groupedByInst[inst].push(acc);
                    });
                    const instNames = Object.keys(groupedByInst);

                    if (instNames.length === 0 && (!plaidItems || plaidItems.length === 0)) {
                      return (
                        <div className="p-4 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] text-[13px] font-medium text-[var(--muted)]">
                          No external bank institutions linked yet.
                        </div>
                      );
                    }

                    return (
                      <div className="divide-y divide-[var(--line)]">
                        {instNames.map((institutionName) => {
                          const accs = groupedByInst[institutionName] || [];
                          const matchingPlaidItem = (plaidItems || []).find(
                            (item) => (item.institutionName || '').toLowerCase() === institutionName.toLowerCase()
                          );
                          return (
                            <div key={institutionName} className="py-3.5 flex items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[15px] font-semibold text-[var(--ink)]">{institutionName}</span>
                                  <Pill variant="success">Active</Pill>
                                </div>
                                <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                                  {accs.length} {accs.length === 1 ? 'account' : 'accounts'} linked
                                </p>
                              </div>
                              <button
                                type="button"
                                aria-label={`Disconnect ${institutionName}`}
                                onClick={() =>
                                  setConfirmDisconnectBank({
                                    institutionName,
                                    matchingPlaidItem,
                                    accs
                                  })
                                }
                                className="p-2 rounded-[8px] text-[var(--muted)] hover:text-[#B91C1C] hover:bg-[#B91C1C]/10 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </Card>

                {/* Plaid API Credentials */}
                <Card className="p-5">
                  <form onSubmit={handleSavePlaidCredentials} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-[16px] font-semibold text-[var(--ink)]">Plaid API credentials</h4>
                        <p className="text-[13px] font-medium text-[var(--muted)]">
                          Optional personal Plaid developer keys for custom bank sync.
                        </p>
                      </div>
                      <a
                        href="https://dashboard.plaid.com/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#1B4B91] hover:underline"
                      >
                        <span>Plaid dashboard</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="plaid-client-id-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                          Plaid Client ID
                        </label>
                        <input
                          id="plaid-client-id-input"
                          type="text"
                          value={settingsPlaidClientId}
                          onChange={(e) => {
                            setSettingsPlaidClientId(e.target.value);
                            try {
                              localStorage.setItem('klarity_plaid_client_id', e.target.value);
                            } catch {}
                          }}
                          placeholder="Client ID"
                          className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
                        />
                      </div>

                      <div>
                        <label htmlFor="plaid-secret-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                          Plaid Secret
                        </label>
                        <div className="relative">
                          <input
                            id="plaid-secret-input"
                            type={settingsPlaidShowSecret ? 'text' : 'password'}
                            value={settingsPlaidSecret}
                            onChange={(e) => setSettingsPlaidSecret(e.target.value)}
                            placeholder={settingsPlaidMaskedSecret ? `Saved: ${settingsPlaidMaskedSecret}` : 'Secret key'}
                            className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 pr-10 text-[15px] font-medium text-[var(--ink)]"
                          />
                          <button
                            type="button"
                            aria-label={settingsPlaidShowSecret ? 'Hide Plaid secret' : 'Show Plaid secret'}
                            onClick={() => setSettingsPlaidShowSecret(!settingsPlaidShowSecret)}
                            className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                          >
                            {settingsPlaidShowSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-[var(--line)]">
                      <Button type="submit" variant="primary" size="sm">
                        Save credentials
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* TAB 5: SECURITY */}
            {normalizedTab === 'security' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Security and privacy</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Manage session timeouts, hashed vault PIN protection, and account access.
                  </p>
                </div>

                {/* Card 1: Session Timeout */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[8px] bg-[#1B4B91]/10 flex items-center justify-center text-[#1B4B91] shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-semibold text-[var(--ink)]">Inactivity timeout</h4>
                        <p className="text-[13px] font-medium text-[var(--muted)]">
                          Automatically lock or sign out when Klarity is left unattended.
                        </p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleLockSession}>
                      <Lock className="w-4 h-4" />
                      Lock session now
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--line)]">
                    <div>
                      <label htmlFor="security-timeout-select" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        Inactivity duration
                      </label>
                      <select
                        id="security-timeout-select"
                        value={autoLockMinutes}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAutoLockMinutes(val);
                          try {
                            localStorage.setItem('klarity_auto_lock_mins', String(val));
                          } catch {}
                        }}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes (default)</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={240}>4 hours</option>
                        <option value={0}>Never</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="security-idle-action" className="text-[13px] font-medium text-[var(--ink)] block mb-1.5">
                        When timeout is reached
                      </label>
                      <select
                        id="security-idle-action"
                        value={idleAction}
                        onChange={(e) => {
                          setIdleAction(e.target.value);
                          try {
                            localStorage.setItem('klarity_idle_action', e.target.value);
                          } catch {}
                        }}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                      >
                        <option value="lock">Lock screen</option>
                        <option value="logout">Sign out completely</option>
                      </select>
                    </div>
                  </div>
                </Card>

                {/* Card 2: Hashed Vault PIN Protection (PBKDF2 via securityCrypto.js) */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-[8px] bg-[#1B4B91]/10 flex items-center justify-center text-[#1B4B91] shrink-0">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-semibold text-[var(--ink)]">Vault PIN protection</h4>
                        <p className="text-[13px] font-medium text-[var(--muted)]">
                          Protected with PBKDF2 SHA-256 hashing. Your current PIN is required to change or remove the lock.
                        </p>
                      </div>
                    </div>
                    <Pill variant={pinAlreadySet ? 'success' : 'neutral'}>
                      {pinAlreadySet ? 'PIN active' : 'No PIN set'}
                    </Pill>
                  </div>

                  <div className="pt-3 border-t border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label htmlFor="vault-unlock-duration" className="text-[15px] font-medium text-[var(--ink)] block">
                        Vault unlock duration
                      </label>
                      <p className="text-[13px] font-medium text-[var(--muted)]">
                        How long the vault stays unlocked after verification.
                      </p>
                    </div>
                    <select
                      id="vault-unlock-duration"
                      value={vaultPinTimeout}
                      onChange={(e) => setVaultPinTimeout(e.target.value)}
                      className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                    >
                      <option value="immediate">Every visit</option>
                      <option value="5m">5 minutes</option>
                      <option value="15m">15 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="session">Until app closes</option>
                    </select>
                  </div>

                  <form onSubmit={handleSaveVaultPin} className="pt-3 border-t border-[var(--line)] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-[var(--ink)]">
                        {pinAlreadySet ? 'Change security PIN' : 'Set a security PIN'}
                      </span>
                      {pinStatusMsg && (
                        <span className={`text-[13px] font-semibold ${pinStatusError ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                          {pinStatusMsg}
                        </span>
                      )}
                    </div>

                    <div className={`grid grid-cols-1 ${pinAlreadySet ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                      {pinAlreadySet && (
                        <div>
                          <label htmlFor="current-vault-pin" className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                            Current PIN
                          </label>
                          <input
                            id="current-vault-pin"
                            type="password"
                            value={currentPinInput}
                            onChange={(e) => setCurrentPinInput(e.target.value)}
                            placeholder="Enter current PIN"
                            className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                          />
                        </div>
                      )}
                      <div>
                        <label htmlFor="new-vault-pin" className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                          New PIN (4+ characters)
                        </label>
                        <input
                          id="new-vault-pin"
                          type="password"
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          placeholder="New PIN"
                          className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="confirm-vault-pin" className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                          Confirm new PIN
                        </label>
                        <input
                          id="confirm-vault-pin"
                          type="password"
                          value={confirmPinInput}
                          onChange={(e) => setConfirmPinInput(e.target.value)}
                          placeholder="Confirm new PIN"
                          className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      {pinAlreadySet ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDisablePinVerifyInput('');
                            setConfirmDisablePinOpen(true);
                          }}
                        >
                          Remove vault lock
                        </Button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            clearLockoutState();
                            if (onShowToast) onShowToast('Rate-limit lockout state cleared', 'success');
                          }}
                        >
                          Clear lockout state
                        </Button>
                        <Button type="submit" variant="primary" size="sm">
                          {pinAlreadySet ? 'Update PIN' : 'Enable PIN'}
                        </Button>
                      </div>
                    </div>
                  </form>
                </Card>

                {/* Card 3: Clipboard Privacy */}
                <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[8px] bg-[#1B4B91]/10 flex items-center justify-center text-[#1B4B91] shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <label htmlFor="clipboard-clear-select" className="text-[15px] font-semibold text-[var(--ink)] block">
                        Clipboard auto-clear delay
                      </label>
                      <p className="text-[13px] font-medium text-[var(--muted)]">
                        Automatically clear copied passwords from your clipboard.
                      </p>
                    </div>
                  </div>
                  <select
                    id="clipboard-clear-select"
                    value={clipboardClearSeconds}
                    onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
                    className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[15px] font-medium text-[var(--ink)] cursor-pointer"
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds (recommended)</option>
                    <option value={60}>60 seconds</option>
                    <option value={0}>Never clear</option>
                  </select>
                </Card>

                {/* Card 4: Active Session & Sign Out at bottom of Security */}
                <Card className="p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[var(--ink)]">Signed in as</p>
                    <p className="text-[13px] font-medium text-[var(--muted)] truncate">{currentUser?.email || ''}</p>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => {
                      onClose();
                      handleLogout();
                    }}
                  >
                    Sign out
                  </Button>
                </Card>
              </div>
            )}

            {/* BROWSER SETTINGS TAB */}
            {normalizedTab === 'browser' && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">Browser</h3>
                  {browserOnly && (
                    <button
                      type="button"
                      aria-label="Close browser settings"
                      onClick={onClose}
                      className="p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {/* 1. Appearance */}
                <Card className="p-5 flex flex-col gap-3.5">
                  <h4 className="text-[15px] font-semibold text-[var(--ink)]">Appearance</h4>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Show bookmarks bar</span>
                    <input
                      type="checkbox"
                      checked={browserSettings?.showBookmarksBar !== false}
                      onChange={(e) =>
                        onUpdateBrowserSettings &&
                        onUpdateBrowserSettings({ ...browserSettings, showBookmarksBar: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Show Home button</span>
                    <input
                      type="checkbox"
                      checked={browserSettings?.showHomeButton !== false}
                      onChange={(e) =>
                        onUpdateBrowserSettings &&
                        onUpdateBrowserSettings({ ...browserSettings, showHomeButton: e.target.checked })
                      }
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Theme</span>
                    <select
                      value={themeMode}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Page zoom</span>
                    <select
                      value={String(browserSettings?.pageZoom || 100)}
                      onChange={(e) =>
                        onUpdateBrowserSettings &&
                        onUpdateBrowserSettings({ ...browserSettings, pageZoom: Number(e.target.value) })
                      }
                      className="bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
                    >
                      {[75, 80, 90, 100, 110, 125, 150, 175, 200].map((z) => (
                        <option key={z} value={String(z)}>
                          {z}%
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>

                {/* 2. On Startup */}
                <Card className="p-5 flex flex-col gap-3">
                  <h4 className="text-[15px] font-semibold text-[var(--ink)]">On startup</h4>

                  <label className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="radio"
                      name="browserStartupMode"
                      checked={(browserSettings?.startupMode || 'new_tab') === 'new_tab'}
                      onChange={() =>
                        onUpdateBrowserSettings &&
                        onUpdateBrowserSettings({ ...browserSettings, startupMode: 'new_tab' })
                      }
                      className="accent-[#1B4B91]"
                    />
                    <span className="text-[14px] font-medium text-[var(--ink)]">Open the New Tab page</span>
                  </label>

                  <label className="flex items-center gap-3 py-1 cursor-pointer">
                    <input
                      type="radio"
                      name="browserStartupMode"
                      checked={browserSettings?.startupMode === 'continue'}
                      onChange={() =>
                        onUpdateBrowserSettings &&
                        onUpdateBrowserSettings({ ...browserSettings, startupMode: 'continue' })
                      }
                      className="accent-[#1B4B91]"
                    />
                    <span className="text-[14px] font-medium text-[var(--ink)]">Continue where you left off</span>
                  </label>

                  <div className="flex flex-col gap-2.5 py-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="browserStartupMode"
                        checked={browserSettings?.startupMode === 'specific_pages'}
                        onChange={() =>
                          onUpdateBrowserSettings &&
                          onUpdateBrowserSettings({ ...browserSettings, startupMode: 'specific_pages' })
                        }
                        className="accent-[#1B4B91]"
                      />
                      <span className="text-[14px] font-medium text-[var(--ink)]">
                        Open a specific page or set of pages
                      </span>
                    </label>

                    {browserSettings?.startupMode === 'specific_pages' && (
                      <div className="pl-7 flex flex-col gap-2">
                        {(browserSettings?.startupPages || []).map((pageUrl, idx) => (
                          <div
                            key={`${pageUrl}-${idx}`}
                            className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]"
                          >
                            <span className="text-[13px] font-medium text-[var(--ink)] truncate">{pageUrl}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextPages = (browserSettings?.startupPages || []).filter((_, i) => i !== idx);
                                onUpdateBrowserSettings &&
                                  onUpdateBrowserSettings({ ...browserSettings, startupPages: nextPages });
                              }}
                              className="p-1 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer"
                              aria-label="Remove startup page"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const raw = newStartupPageInput.trim();
                            if (!raw || !onUpdateBrowserSettings) return;
                            const clean = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                            const nextPages = [...(browserSettings?.startupPages || []), clean];
                            onUpdateBrowserSettings({ ...browserSettings, startupPages: nextPages });
                            setNewStartupPageInput('');
                          }}
                          className="flex gap-2"
                        >
                          <input
                            type="text"
                            value={newStartupPageInput}
                            onChange={(e) => setNewStartupPageInput(e.target.value)}
                            placeholder="Add a new page (e.g. https://www.google.com)"
                            className="flex-1 min-w-0 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--ink)]"
                          />
                          <Button type="submit" size="sm" variant="secondary">
                            Add
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </Card>

                {/* 3. Search Engine */}
                <Card className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-[15px] font-semibold text-[var(--ink)]">Search engine</h4>
                    <select
                      value={browserSettings?.searchEngine || 'duckduckgo'}
                      onChange={(e) => {
                        const engineId = e.target.value;
                        if (onUpdateBrowserSettings) {
                          onUpdateBrowserSettings({
                            ...browserSettings,
                            searchEngine: engineId,
                            homepageMode: 'search_engine'
                          });
                        }
                      }}
                      className="bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer min-w-[180px]"
                    >
                      {SEARCH_ENGINES.map((engine) => (
                        <option key={engine.id} value={engine.id}>
                          {engine.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>

                {/* 4. Privacy & Security */}
                <Card className="p-5 flex flex-col gap-3.5">
                  <h4 className="text-[15px] font-semibold text-[var(--ink)]">Privacy &amp; security</h4>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Clear browsing data</span>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={isClearingBrowserData}
                      onClick={async () => {
                        setIsClearingBrowserData(true);
                        try {
                          clearBrowserSessionState();
                          if (window.klarityDesktop?.clearBrowserData) {
                            await window.klarityDesktop.clearBrowserData();
                          }
                          if (onShowToast) onShowToast('Browsing data cleared', 'success');
                        } catch {
                          if (onShowToast) onShowToast('Could not clear browsing data', 'error');
                        } finally {
                          setIsClearingBrowserData(false);
                        }
                      }}
                    >
                      {isClearingBrowserData ? 'Clearing...' : 'Clear data'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      Send a &ldquo;Do Not Track&rdquo; request
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(electronBrowserPrefs.doNotTrack)}
                      onChange={(e) => updateDesktopBrowserPrefs({ doNotTrack: e.target.checked })}
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">Cookies</span>
                    <select
                      value={electronBrowserPrefs.cookiePolicy || 'allow'}
                      onChange={(e) => updateDesktopBrowserPrefs({ cookiePolicy: e.target.value })}
                      className="bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
                    >
                      <option value="allow">Allow all cookies</option>
                      <option value="block_third_party">Block third-party cookies</option>
                      <option value="block_all">Block all cookies</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      Ad &amp; tracker blocker ({browserAdBlockStats.adsBlockedCount || 0} blocked)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={browserAdBlockStats.enabled ? 'primary' : 'secondary'}
                        onClick={async () => {
                          if (window.klarityDesktop?.toggleAdBlock) {
                            const next = await window.klarityDesktop.toggleAdBlock(!browserAdBlockStats.enabled);
                            if (next) setBrowserAdBlockStats(next);
                          }
                        }}
                      >
                        {browserAdBlockStats.enabled ? 'On' : 'Off'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          if (window.klarityDesktop?.resetAdBlockCount) {
                            const next = await window.klarityDesktop.resetAdBlockCount();
                            if (next) setBrowserAdBlockStats(next);
                          }
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      YouTube video ad shield
                    </span>
                    <input
                      type="checkbox"
                      checked={browserSettings?.youtubeAdShield !== false}
                      onChange={(e) => {
                        if (onUpdateBrowserSettings) {
                          onUpdateBrowserSettings({
                            ...browserSettings,
                            youtubeAdShield: e.target.checked
                          });
                        }
                      }}
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      Skip sponsor segments (SponsorBlock)
                    </span>
                    <input
                      type="checkbox"
                      checked={browserSettings?.sponsorBlockEnabled !== false}
                      onChange={(e) => {
                        if (onUpdateBrowserSettings) {
                          onUpdateBrowserSettings({
                            ...browserSettings,
                            sponsorBlockEnabled: e.target.checked
                          });
                        }
                      }}
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      Clean video titles (DeArrow)
                    </span>
                    <input
                      type="checkbox"
                      checked={browserSettings?.dearrowEnabled !== false}
                      onChange={(e) => {
                        if (onUpdateBrowserSettings) {
                          onUpdateBrowserSettings({
                            ...browserSettings,
                            dearrowEnabled: e.target.checked
                          });
                        }
                      }}
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>
                </Card>

                {/* 5. Downloads */}
                <Card className="p-5 flex flex-col gap-3.5">
                  <h4 className="text-[15px] font-semibold text-[var(--ink)]">Downloads</h4>

                  <div className="flex items-center justify-between gap-4 py-1">
                    <div className="min-w-0">
                      <div className="text-[14px] font-medium text-[var(--ink)]">Location</div>
                      <div className="text-[12px] text-[var(--muted)] truncate max-w-[360px]">
                        {electronBrowserPrefs.downloadPath || 'Default Downloads folder'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        if (window.klarityDesktop?.selectBrowserDownloadDir) {
                          const res = await window.klarityDesktop.selectBrowserDownloadDir();
                          if (res && !res.canceled && res.downloadPath) {
                            setElectronBrowserPrefs((prev) => ({ ...prev, downloadPath: res.downloadPath }));
                            if (onUpdateBrowserSettings) {
                              onUpdateBrowserSettings({ ...browserSettings, downloadPath: res.downloadPath });
                            }
                          }
                        }
                      }}
                    >
                      Change
                    </Button>
                  </div>

                  <div className="flex items-center justify-between gap-4 py-1 border-t border-[var(--line)] pt-3">
                    <span className="text-[14px] font-medium text-[var(--ink)]">
                      Ask where to save each file before downloading
                    </span>
                    <input
                      type="checkbox"
                      checked={Boolean(electronBrowserPrefs.askWhereToSave)}
                      onChange={(e) => updateDesktopBrowserPrefs({ askWhereToSave: e.target.checked })}
                      className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                    />
                  </div>
                </Card>

                {/* 6. Bookmarks & Folders */}
                <Card className="p-5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[15px] font-semibold text-[var(--ink)]">Bookmarks</h4>
                    {browserBookmarks.length > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (onUpdateBrowserBookmarks) onUpdateBrowserBookmarks([]);
                          if (onShowToast) onShowToast('All bookmarks cleared', 'success');
                        }}
                      >
                        Clear all
                      </Button>
                    )}
                  </div>

                  {browserBookmarks.length === 0 ? (
                    <div className="text-[13px] text-[var(--muted)] py-1">No bookmarks saved.</div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {browserBookmarks.map((item) => {
                        const parentFolder = item.folderId
                          ? browserBookmarks.find((f) => f.id === item.folderId)
                          : null;
                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface-subtle)]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {item.type === 'folder' ? (
                                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <Bookmark className="w-4 h-4 text-[#1B4B91] shrink-0" />
                              )}
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-[var(--ink)] truncate">
                                  {item.title}
                                  {parentFolder && (
                                    <span className="ml-2 text-[11px] font-medium text-[var(--muted)]">
                                      ({parentFolder.title})
                                    </span>
                                  )}
                                </div>
                                {item.url && (
                                  <div className="text-[11px] text-[var(--muted)] truncate">{item.url}</div>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateBrowserBookmarks) {
                                  onUpdateBrowserBookmarks(
                                    browserBookmarks.filter((b) => b.id !== item.id && b.folderId !== item.id)
                                  );
                                }
                              }}
                              className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                              aria-label={`Delete ${item.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* TAB 6: ABOUT */}
            {normalizedTab === 'about' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="font-serif text-[22px] font-semibold text-[var(--ink)]">About Klarity</h3>
                  <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                    Current software version and summary of recent improvements.
                  </p>
                </div>

                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-serif text-[18px] font-semibold text-[var(--ink)]">Klarity Finance</h4>
                        <Pill variant="success">
                          {formatVersionString ? formatVersionString(desktopAppInfo.version || '3.12.24') : 'v3.12.24'}
                        </Pill>
                      </div>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-1">
                        {desktopAppInfo.isDesktopApp ? 'Klarity Desktop Application' : 'Klarity Web Application'}
                        {desktopAppInfo.updateStatus?.message
                          ? ` • ${formatCleanUpdateMessage(
                              desktopAppInfo.updateStatus.message,
                              desktopAppInfo.updateStatus?.latestVersion
                            )}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(desktopAppInfo.updateStatus?.state === 'available' ||
                        desktopAppInfo.updateStatus?.state === 'ready') &&
                        (handlePerformUpdate || onOpenUpdateModal) && (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isInstallingUpdate}
                            onClick={handlePerformUpdate || onOpenUpdateModal}
                          >
                            {isInstallingUpdate ? 'Updating...' : 'Install update'}
                          </Button>
                        )}
                      {handleManualCheckForUpdate && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isCheckingUpdateInSettings}
                          onClick={handleManualCheckForUpdate}
                        >
                          <RefreshCw className={`w-4 h-4 ${isCheckingUpdateInSettings ? 'animate-spin' : ''}`} />
                          {isCheckingUpdateInSettings ? 'Checking...' : 'Check for updates'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Feedback Section */}
                <Card className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-[16px] font-semibold text-[var(--ink)]">Feedback</h4>
                      <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                        Share thoughts, report bugs, or request features to help improve Klarity.
                      </p>
                    </div>
                    <Pill variant="brand">User feedback</Pill>
                  </div>

                  <form
                    onSubmit={(e) => {
                      if (handleSendFeedback) {
                        handleSendFeedback(e);
                      } else {
                        e.preventDefault();
                      }
                    }}
                    className="flex flex-col gap-3 pt-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {['General Feedback', 'Feature Request', 'Bug Report'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFeedbackType && setFeedbackType(type)}
                          className={`px-3 py-1.5 rounded-[8px] text-[13px] font-semibold border transition-colors cursor-pointer ${
                            feedbackType === type
                              ? 'bg-[#1B4B91] text-white border-[#1B4B91]'
                              : 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label htmlFor="about-feedback-textarea" className="sr-only">
                        Your feedback message
                      </label>
                      <textarea
                        id="about-feedback-textarea"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText && setFeedbackText(e.target.value)}
                        rows={3}
                        placeholder="What can we improve? Let us know what you'd like to see..."
                        className="w-full text-[15px] font-medium p-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink)] placeholder:text-[var(--muted)] resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {feedbackSubmitted ? (
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-[#15803D] font-semibold bg-[#15803D]/10 px-3 py-1.5 rounded-[8px] border border-[#15803D]/25">
                          <CheckCircle2 className="w-4 h-4" />
                          Thank you! Your feedback has been received.
                        </span>
                      ) : (
                        <span className="text-[13px] font-medium text-[var(--muted)]">
                          Your feedback directly shapes upcoming updates.
                        </span>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={!feedbackText.trim() || isSubmittingFeedback}
                      >
                        {isSubmittingFeedback ? 'Sending...' : 'Send Feedback'}
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* Concise 3-line What's New with link to full notes */}
                <Card className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[16px] font-semibold text-[var(--ink)]">What&apos;s new</h4>
                    <button
                      type="button"
                      onClick={() => setShowFullReleaseNotes((prev) => !prev)}
                      className="text-[13px] font-semibold text-[#1B4B91] hover:underline cursor-pointer"
                    >
                      {showFullReleaseNotes ? 'Hide full notes' : 'View full release notes'}
                    </button>
                  </div>

                  <ul className="list-disc list-inside space-y-1.5 text-[15px] font-medium text-[var(--ink)]">
                    {formatWhatsNewHighlights(
                      desktopAppInfo.updateStatus?.recentChanges ||
                      desktopAppInfo.updateStatus?.message ||
                      []
                    ).map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>

                  {showFullReleaseNotes && (
                    <div className="mt-3 pt-3 border-t border-[var(--line)] space-y-2 text-[13px] font-medium text-[var(--muted)]">
                      <p>
                        <span className="font-semibold text-[var(--ink)]">v3.12.23:</span> Added labeled navigation groups (Overview, Money, Plan, Home and life, Vault, Advisor), mobile 5-tab bar, and accessible form controls across all pages.
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--ink)]">v3.12.20:</span> Added Home Warranty provider category in Household and improved multi-card filtering across Transactions, Bills, Subscriptions, and Budgets.
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--ink)]">v3.12.15:</span> Added local GGUF AI advisor support and automatic PII redaction for web search queries.
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Confirm Disable Vault PIN Modal */}
      {confirmDisablePinOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disable-pin-dialog-title"
        >
          <Card className="w-full max-w-md p-6">
            <h3 id="disable-pin-dialog-title" className="font-serif text-[20px] font-semibold text-[var(--ink)]">
              Remove vault PIN lock?
            </h3>
            <p className="text-[15px] font-medium text-[var(--muted)] mt-2">
              Enter your current PIN to confirm removing the password vault lock.
            </p>
            <div className="mt-4">
              <label htmlFor="confirm-disable-pin-input" className="block text-[13px] font-medium text-[var(--ink)] mb-1.5">
                Current PIN
              </label>
              <input
                id="confirm-disable-pin-input"
                type="password"
                value={disablePinVerifyInput}
                onChange={(e) => setDisablePinVerifyInput(e.target.value)}
                placeholder="Enter current PIN"
                className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3.5 py-2.5 text-[15px] font-medium text-[var(--ink)]"
              />
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDisablePinOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleConfirmDisableVaultPin}>
                Remove lock
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Disconnect Bank */}
      <ConfirmDialog
        open={Boolean(confirmDisconnectBank)}
        title="Disconnect bank?"
        message={
          confirmDisconnectBank
            ? `Are you sure you want to disconnect all accounts from ${confirmDisconnectBank.institutionName}?`
            : ''
        }
        confirmLabel="Disconnect"
        variant="danger"
        onCancel={() => setConfirmDisconnectBank(null)}
        onConfirm={() => {
          if (confirmDisconnectBank) {
            if (confirmDisconnectBank.matchingPlaidItem) {
              handleDisconnectBank(
                confirmDisconnectBank.matchingPlaidItem.itemId,
                confirmDisconnectBank.institutionName
              );
            } else {
              (confirmDisconnectBank.accs || []).forEach((a) => handleDeleteAccount(a.id, a.name));
            }
            setConfirmDisconnectBank(null);
          }
        }}
      />

      {/* Confirm Clear Advisor Memory */}
      <ConfirmDialog
        open={confirmClearMemory}
        title="Clear advisor memory?"
        message="Are you sure you want to delete all saved facts from your Advisor memory?"
        confirmLabel="Clear memory"
        variant="danger"
        onCancel={() => setConfirmClearMemory(false)}
        onConfirm={() => {
          if (handleClearAllMemory) handleClearAllMemory();
          setConfirmClearMemory(false);
        }}
      />
    </div>
  );
}

export default SettingsPage;
