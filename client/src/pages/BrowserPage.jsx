import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  Plus,
  Folder,
  FolderPlus,
  Bookmark,
  Trash2,
  Send,
  Settings as SettingsIcon,
  Pin,
  Volume2,
  VolumeX,
  Copy,
  RotateCcw,
  MessageSquare,
  Bot,
  StickyNote,
  Link2,
  Check,
  PanelRight,
  Layers,
  GripHorizontal,
  Edit2,
  Download,
  FolderOpen,
  FileText,
  AlertCircle,
  Calculator,
  MoreVertical,
  Maximize2,
  Minimize2,
  Square,
  ArrowUpRight,
  History,
  ZoomIn,
  Minus
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import { FormattedChatMessage } from '../components/SharedAppComponents';
import { NewTabPage } from '../components/NewTabPage';
import { BrowserCalculatorPopover } from '../components/BrowserCalculatorPopover';
import { BrowserSearchDropdown } from '../components/BrowserSearchDropdown';
import BrowserPasswordPrompt from '../components/BrowserPasswordPrompt';
import {
  buildYouTubeAdShieldScript,
  buildSponsorBlockScript,
  buildDeArrowScript
} from '../utils/browserShield';
import {
  DEFAULT_BROWSER_SETTINGS,
  NEW_TAB_URL,
  TAB_GROUP_COLORS,
  getSearchEngineById,
  getBrowserHomeUrl,
  isNewTabUrl,
  resolveBrowserDestination,
  loadBrowserSessionState,
  saveBrowserSessionState,
  loadNewTabNotes,
  saveNewTabNotes,
  loadNewTabPrefs
} from '../utils/browserSettings';
import {
  BROWSER_HISTORY_UPDATED_EVENT,
  RECENT_SEARCHES_UPDATED_EVENT,
  buildSearchDropdownItems,
  clearRecentSearches,
  deleteRecentSearchItem,
  loadBrowserHistory,
  loadRecentSearches,
  recordBrowserVisit,
  recordRecentSearch,
  updateHistoryEntryTitle
} from '../utils/browserHistory';

function formatDownloadBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
  const scaled = value / Math.pow(1024, idx);
  return `${scaled >= 10 || idx === 0 ? Math.round(scaled) : scaled.toFixed(1)} ${units[idx]}`;
}

function formatDownloadHost(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.hostname.replace(/^www\./i, '');
    }
  } catch {}
  return '';
}

function extractLinksFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const seen = new Map();
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    const cleanUrl = match[2].replace(/[.,;:!?]+$/, '');
    const host = formatDownloadHost(cleanUrl);
    if (host && !seen.has(cleanUrl)) {
      const label = (match[1] || '').trim();
      seen.set(cleanUrl, {
        label: label && !/^https?:\/\//i.test(label) ? label : host,
        url: cleanUrl,
        host
      });
    }
  }
  const bareRegex = /https?:\/\/[^\s<>\]")]+/gi;
  while ((match = bareRegex.exec(text)) !== null) {
    const cleanUrl = match[0].replace(/[.,;:!?]+$/, '');
    const host = formatDownloadHost(cleanUrl);
    if (host && !seen.has(cleanUrl)) {
      seen.set(cleanUrl, { label: host, url: cleanUrl, host });
    }
  }
  return Array.from(seen.values()).slice(0, 6);
}

function formatDownloadTime(ts) {
  const timeMs = Number(ts);
  if (!Number.isFinite(timeMs) || timeMs <= 0) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  const date = new Date(timeMs);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function createTabObject(url, title = 'New Tab', extra = {}) {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url,
    initialUrl: url,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isPinned: false,
    isMuted: false,
    isPlayingMedia: false,
    groupId: null,
    ...extra
  };
}

function getInitialBrowserTabs(browserSettings, pendingBrowserUrl) {
  const homeUrl = getBrowserHomeUrl(browserSettings);
  const engineName = getSearchEngineById(browserSettings?.searchEngine).name;

  if (pendingBrowserUrl) {
    return {
      tabs: [createTabObject(pendingBrowserUrl, 'Loading...')],
      groups: [],
      activeTabId: null
    };
  }

  if (browserSettings?.startupMode === 'continue') {
    const saved = loadBrowserSessionState();
    if (saved && saved.tabs.length > 0) {
      return {
        tabs: saved.tabs.map((t) =>
          createTabObject(t.url || homeUrl, t.title || 'Tab', {
            id: t.id,
            isPinned: Boolean(t.isPinned),
            isMuted: Boolean(t.isMuted),
            groupId: t.groupId || null
          })
        ),
        groups: saved.groups || [],
        activeTabId: saved.activeTabId
      };
    }
  }

  if (
    browserSettings?.startupMode === 'specific_pages' &&
    Array.isArray(browserSettings?.startupPages) &&
    browserSettings.startupPages.length > 0
  ) {
    const validPages = browserSettings.startupPages
      .map((u) => resolveBrowserDestination(u, browserSettings?.searchEngine))
      .filter(Boolean);
    if (validPages.length > 0) {
      return {
        tabs: validPages.map((u) => createTabObject(u, u)),
        groups: [],
        activeTabId: null
      };
    }
  }

  return {
    tabs: [createTabObject(homeUrl, isNewTabUrl(homeUrl) ? 'New Tab' : engineName)],
    groups: [],
    activeTabId: null
  };
}

export function BrowserPage({
  onAskAdvisor,
  activeBrowserContext,
  setActiveBrowserContext,
  aiMemory = [],
  onUpdateAiMemory,
  currentUser,
  settingsAiProvider,
  settingsAiModel,
  advisorContext = null,
  browserSettings = DEFAULT_BROWSER_SETTINGS,
  onUpdateBrowserSettings,
  browserBookmarks = [],
  onUpdateBookmarks,
  vaultItems = [],
  onUpdateVaultItems,
  onShowToast,
  pendingBrowserUrl = '',
  onClearPendingBrowserUrl,
  onOpenBrowserSettings,
  onOpenBrowserHistory,
  isBrowserHistoryOpen = false
}) {
  const activeEngine = getSearchEngineById(browserSettings?.searchEngine);
  const homeUrl = getBrowserHomeUrl(browserSettings);

  // Initialize tabs & groups once on mount
  const initDataRef = useRef(null);
  if (!initDataRef.current) {
    initDataRef.current = getInitialBrowserTabs(browserSettings, pendingBrowserUrl);
  }

  const [tabs, setTabs] = useState(initDataRef.current.tabs);
  const [tabGroups, setTabGroups] = useState(initDataRef.current.groups);
  const [activeTabId, setActiveTabId] = useState(
    initDataRef.current.activeTabId || initDataRef.current.tabs[0]?.id
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [urlInput, setUrlInput] = useState(isNewTabUrl(activeTab?.url) ? '' : (activeTab?.url || ''));
  const urlInputRef = useRef(null);
  const addressBarContainerRef = useRef(null);

  // Local Browser History & Recent Searches state (synced via utils/browserHistory.js events)
  const [browserHistory, setBrowserHistory] = useState(() => loadBrowserHistory());
  const [recentSearches, setRecentSearches] = useState(() => loadRecentSearches());
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [addressDropdownIndex, setAddressDropdownIndex] = useState(-1);

  const browserSettingsRef = useRef(browserSettings);
  const activeTabIdRef = useRef(activeTabId);
  const openUrlHandlersRef = useRef({ navigateTo: null, handleNewTab: null });

  useEffect(() => {
    browserSettingsRef.current = browserSettings;
  }, [browserSettings]);

  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);

  useEffect(() => {
    const syncHistory = () => setBrowserHistory(loadBrowserHistory());
    const syncRecent = () => setRecentSearches(loadRecentSearches());
    window.addEventListener(BROWSER_HISTORY_UPDATED_EVENT, syncHistory);
    window.addEventListener(RECENT_SEARCHES_UPDATED_EVENT, syncRecent);
    return () => {
      window.removeEventListener(BROWSER_HISTORY_UPDATED_EVENT, syncHistory);
      window.removeEventListener(RECENT_SEARCHES_UPDATED_EVENT, syncRecent);
    };
  }, []);

  useEffect(() => {
    const handleOpenHistoryUrl = (e) => {
      const targetUrl = e?.detail?.url;
      const inNewTab = Boolean(e?.detail?.newTab);
      if (!targetUrl) return;
      if (inNewTab) {
        openUrlHandlersRef.current.handleNewTab?.({
          url: targetUrl,
          insertAfterTabId: activeTabIdRef.current
        });
      } else {
        openUrlHandlersRef.current.navigateTo?.(targetUrl, activeTabIdRef.current);
      }
    };
    window.addEventListener('klarity:browser-open-url', handleOpenHistoryUrl);
    return () => window.removeEventListener('klarity:browser-open-url', handleOpenHistoryUrl);
  }, []);

  // Drag & Drop Tab Reordering State
  const [draggedTabId, setDraggedTabId] = useState(null);

  // Tab Context Menu State
  const [tabContextMenu, setTabContextMenu] = useState(null); // { tabId, x, y }
  const contextMenuRef = useRef(null);

  // Tab Group Editor Popover State
  const [editingGroupId, setEditingGroupId] = useState(null);
  const groupEditorRef = useRef(null);

  // Ad Blocker State
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [adsBlockedCount, setAdsBlockedCount] = useState(0);
  const [isAdBlockPopoverOpen, setIsAdBlockPopoverOpen] = useState(false);
  const adBlockPopoverRef = useRef(null);

  // Browser Downloads State
  const [browserDownloads, setBrowserDownloads] = useState([]);
  const [isDownloadsPopoverOpen, setIsDownloadsPopoverOpen] = useState(false);
  const [hasUnseenDownload, setHasUnseenDownload] = useState(false);
  const downloadsPopoverRef = useRef(null);
  const isDownloadsPopoverOpenRef = useRef(false);
  const knownCompletedIdsRef = useRef(new Set());

  // Built-in Local Movable Calculator & Overflow Toolbar State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const calculatorPopoverRef = useRef(null);
  const floatingCalcRef = useRef(null);
  const [floatingCalcPos, setFloatingCalcPos] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_floating_calc_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [isDraggingCalc, setIsDraggingCalc] = useState(false);
  const calcDragStartRef = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0, parentW: 0, parentH: 0, cardW: 0, cardH: 0 });
  const [floatingCalcWidth, setFloatingCalcWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('klarity_floating_calc_width'));
      if (Number.isFinite(saved) && saved >= 280 && saved <= 560) return saved;
    } catch {}
    return 320;
  });
  const [isResizingCalc, setIsResizingCalc] = useState(false);
  const calcResizeStartRef = useRef({ mouseX: 0, mouseY: 0, startW: 320, startH: 430, aspect: 1.34, maxW: 540 });

  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const overflowMenuRef = useRef(null);
  const [passwordSavePrompt, setPasswordSavePrompt] = useState(null);
  const vaultItemsRef = useRef(vaultItems);
  useEffect(() => {
    vaultItemsRef.current = vaultItems;
  }, [vaultItems]);

  const isAnyToolbarPopoverOpen =
    isAdBlockPopoverOpen || isDownloadsPopoverOpen || isOverflowMenuOpen || Boolean(passwordSavePrompt);

  const normalizeSiteHost = (raw) => {
    try {
      const str = String(raw || '').trim();
      if (!str) return '';
      const u = /^https?:\/\//i.test(str) ? new URL(str) : new URL(`https://${str}`);
      return u.hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return String(raw || '').toLowerCase().replace(/^www\./, '').split('/')[0];
    }
  };

  const deriveServiceName = (hostname) => {
    const clean = normalizeSiteHost(hostname);
    if (!clean) return 'Website';
    const parts = clean.split('.');
    const main = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  };

  const handleLoginCandidateDetected = (candidate, tabId) => {
    if (!candidate || !candidate.password) return;
    const settings = browserSettingsRef.current || DEFAULT_BROWSER_SETTINGS;
    if (settings.offerToSavePasswords === false) return;

    const hostname = normalizeSiteHost(candidate.hostname || candidate.origin || candidate.url);
    if (!hostname) return;

    const neverDomains = Array.isArray(settings.neverSavePasswordDomains)
      ? settings.neverSavePasswordDomains.map((d) => normalizeSiteHost(d))
      : [];
    if (neverDomains.includes(hostname)) return;

    const incomingUser = String(candidate.username || '').trim();
    const incomingPw = String(candidate.password);
    const serviceName = deriveServiceName(hostname);

    const existingList = Array.isArray(vaultItemsRef.current) ? vaultItemsRef.current : [];
    const matchingSiteItems = existingList.filter((item) => {
      const itemHost = normalizeSiteHost(item.website || '');
      const itemService = String(item.service || '').trim().toLowerCase();
      return (
        (itemHost && (itemHost === hostname || hostname.endsWith(`.${itemHost}`) || itemHost.endsWith(`.${hostname}`))) ||
        itemService === serviceName.toLowerCase() ||
        itemService === hostname
      );
    });

    const exactAccount = matchingSiteItems.find(
      (item) => String(item.username || '').trim().toLowerCase() === incomingUser.toLowerCase()
    );

    if (exactAccount) {
      if (String(exactAccount.password || '') === incomingPw) {
        // Exact username + password already saved in Vault — do not prompt
        return;
      }
      setPasswordSavePrompt({
        tabId,
        mode: 'update',
        existingItemId: exactAccount.id,
        service: exactAccount.service || serviceName,
        category: exactAccount.category || 'General',
        hostname,
        website: exactAccount.website || candidate.origin || `https://${hostname}`,
        username: incomingUser,
        password: incomingPw
      });
      return;
    }

    setPasswordSavePrompt({
      tabId,
      mode: 'save',
      existingItemId: null,
      service: serviceName,
      category: 'General',
      hostname,
      website: candidate.origin || `https://${hostname}`,
      username: incomingUser,
      password: incomingPw
    });
  };

  const handleConfirmPasswordSavePrompt = (payload) => {
    if (!payload || !payload.password || typeof onUpdateVaultItems !== 'function') {
      setPasswordSavePrompt(null);
      return;
    }

    const currentList = Array.isArray(vaultItemsRef.current) ? vaultItemsRef.current : [];
    if (payload.mode === 'update' && payload.existingItemId) {
      const next = currentList.map((item) =>
        item.id === payload.existingItemId
          ? {
              ...item,
              service: payload.service || item.service,
              username: payload.username,
              password: payload.password,
              website: payload.website || item.website,
              category: payload.category || item.category || 'General'
            }
          : item
      );
      onUpdateVaultItems(next);
      onShowToast?.(`Updated password for ${payload.service}`, 'success');
    } else {
      const newItem = {
        id: `v-${Date.now()}`,
        service: payload.service || payload.hostname || 'Website',
        category: payload.category || 'General',
        username: payload.username || '',
        password: payload.password,
        accountNumber: '',
        website: payload.website || (payload.hostname ? `https://${payload.hostname}` : ''),
        notes: '',
        attachments: [],
        isFavorite: String(payload.category || '').toLowerCase() === 'favorites'
      };
      onUpdateVaultItems([newItem, ...currentList]);
      onShowToast?.(`Saved login for ${newItem.service} to Klarity Vault`, 'success');
    }
    setPasswordSavePrompt(null);
  };

  const handleNeverSaveForDomain = (domain) => {
    const clean = normalizeSiteHost(domain);
    setPasswordSavePrompt(null);
    if (!clean || typeof onUpdateBrowserSettings !== 'function') return;
    const prevList = Array.isArray(browserSettings?.neverSavePasswordDomains)
      ? browserSettings.neverSavePasswordDomains
      : [];
    if (!prevList.includes(clean)) {
      onUpdateBrowserSettings({
        ...browserSettings,
        neverSavePasswordDomains: [...prevList, clean]
      });
      onShowToast?.(`Won't ask to save passwords on ${clean}`, 'info');
    }
  };

  // Dedicated In-Browser AI Sidebar State (Self-contained, Advisor-powered, user-expandable)
  const [isBrowserAiSidebarOpen, setIsBrowserAiSidebarOpen] = useState(false);
  const [browserAiMessages, setBrowserAiMessages] = useState([]);
  const [browserAiInput, setBrowserAiInput] = useState('');
  const [isBrowserAiLoading, setIsBrowserAiLoading] = useState(false);
  const [copiedAiMsgIdx, setCopiedAiMsgIdx] = useState(null);
  const [browserAiWidth, setBrowserAiWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('klarity_browser_ai_width'), 10);
      if (Number.isFinite(saved) && saved >= 320 && saved <= 760) return saved;
    } catch {}
    return 380;
  });
  const [isResizingAiSidebar, setIsResizingAiSidebar] = useState(false);
  const browserAiMessagesEndRef = useRef(null);
  const browserAiInputRef = useRef(null);
  const browserAiAbortRef = useRef(null);

  // In-Browser Notes State (Accessible on any webpage, auto-saving with custom sections)
  // Supports both Docked Sidebar Notes and Smoothly Resizable Draggable Floating Notes
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [showNotesOnHomepage, setShowNotesOnHomepage] = useState(() => {
    try {
      return loadNewTabPrefs().showNotes !== false;
    } catch {
      return true;
    }
  });
  const [homepageNotesDismissed, setHomepageNotesDismissed] = useState(false);
  const [notesDisplayMode, setNotesDisplayMode] = useState(() => {
    try {
      return localStorage.getItem('klarity_browser_notes_mode') || 'sidebar';
    } catch {
      return 'sidebar';
    }
  });

  // Persistent Note Sections
  const [noteSections, setNoteSections] = useState(() => {
    try {
      const raw = localStorage.getItem('klarity_browser_note_sections');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    const legacyNote = loadNewTabNotes() || '';
    return [
      { id: 'sec-general', title: 'General', content: legacyNote, updatedAt: Date.now() }
    ];
  });

  const [activeSectionId, setActiveSectionId] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_active_note_section');
      if (saved) return saved;
    } catch {}
    return 'sec-general';
  });

  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionTitleDraft, setSectionTitleDraft] = useState('');
  const [notesCopiedFeedback, setNotesCopiedFeedback] = useState(false);
  const browserNotesRef = useRef(null);
  const floatingNotesRef = useRef(null);

  // Active section safe resolution
  const activeSection = noteSections.find((s) => s.id === activeSectionId) || noteSections[0] || {
    id: 'sec-general',
    title: 'General',
    content: ''
  };

  // Floating Notes drag position and state
  const [floatingNotesPos, setFloatingNotesPos] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_floating_notes_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { x: 24, y: 24 };
  });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const notesDragStartRef = useRef({ mouseX: 0, mouseY: 0, cardX: 0, cardY: 0, parentW: 0, parentH: 0, cardW: 0, cardH: 0 });

  // Floating Notes size and resizing state
  const [floatingNotesSize, setFloatingNotesSize] = useState(() => {
    try {
      const saved = localStorage.getItem('klarity_floating_notes_size');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { width: 320, height: 420 };
  });
  const [isResizingNotes, setIsResizingNotes] = useState(false);
  const notesResizeStartRef = useRef({ mouseX: 0, mouseY: 0, startW: 0, startH: 0 });

  const isOnHomepage = isNewTabUrl(activeTab?.url);
  const prevActiveTabIdRef = useRef(activeTabId);
  const prevOnHomepageRef = useRef(isOnHomepage);

  useEffect(() => {
    const switchedTab = prevActiveTabIdRef.current !== activeTabId;
    const navigatedToHome = !prevOnHomepageRef.current && isOnHomepage;
    if (isOnHomepage && (switchedTab || navigatedToHome)) {
      setHomepageNotesDismissed(false);
    }
    prevActiveTabIdRef.current = activeTabId;
    prevOnHomepageRef.current = isOnHomepage;
  }, [activeTabId, isOnHomepage]);

  const isShowingHomepageAutoNotes =
    !isNotesOpen && isOnHomepage && showNotesOnHomepage && !homepageNotesDismissed;
  const isNotesVisible = isNotesOpen || isShowingHomepageAutoNotes;
  const activeNotesLayout = isNotesOpen ? notesDisplayMode : 'floating';

  const handleCloseNotes = () => {
    setIsNotesOpen(false);
    if (isOnHomepage) {
      setHomepageNotesDismissed(true);
    }
  };

  const handleToggleHomepageNotes = (enabled) => {
    const nextVal = Boolean(enabled);
    setShowNotesOnHomepage(nextVal);
    if (nextVal) {
      setHomepageNotesDismissed(false);
    } else {
      setHomepageNotesDismissed(true);
      setIsNotesOpen(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('klarity_browser_notes_mode', notesDisplayMode);
    } catch {}
  }, [notesDisplayMode]);

  // Reliable Auto-Save for Note Sections
  useEffect(() => {
    try {
      localStorage.setItem('klarity_browser_note_sections', JSON.stringify(noteSections));
      localStorage.setItem('klarity_active_note_section', activeSectionId);
      // Sync the primary note with New Tab page
      saveNewTabNotes(activeSection.content);
    } catch {}
  }, [noteSections, activeSectionId, activeSection.content]);

  // Live Cross-Tab / Cross-Window Sync
  useEffect(() => {
    const handleNotesSync = (e) => {
      const incoming = e?.detail?.notes;
      const targetSectionId = e?.detail?.sectionId;
      if (typeof incoming === 'string') {
        setNoteSections((prev) =>
          prev.map((s) => {
            if (targetSectionId ? s.id === targetSectionId : s.id === activeSectionId) {
              return s.content !== incoming ? { ...s, content: incoming, updatedAt: Date.now() } : s;
            }
            return s;
          })
        );
      }
    };
    window.addEventListener('klarity:notes-updated', handleNotesSync);
    return () => window.removeEventListener('klarity:notes-updated', handleNotesSync);
  }, [activeSectionId]);

  // Handlers for Custom Note Sections
  const handleUpdateActiveSectionContent = (newContent) => {
    setNoteSections((prev) =>
      prev.map((s) => (s.id === activeSection.id ? { ...s, content: newContent, updatedAt: Date.now() } : s))
    );
  };

  const handleAddNoteSection = () => {
    const newId = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newTitle = `Note ${noteSections.length + 1}`;
    const newSection = { id: newId, title: newTitle, content: '', updatedAt: Date.now() };
    setNoteSections((prev) => [...prev, newSection]);
    setActiveSectionId(newId);
    setTimeout(() => {
      browserNotesRef.current?.focus();
    }, 50);
  };

  const handleDeleteNoteSection = (sectionId, e) => {
    if (e) e.stopPropagation();
    if (noteSections.length <= 1) return;
    setNoteSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      if (activeSectionId === sectionId) {
        setActiveSectionId(filtered[0]?.id || 'sec-general');
      }
      return filtered;
    });
  };

  const handleStartRenameSection = (section, e) => {
    if (e) e.stopPropagation();
    setEditingSectionId(section.id);
    setSectionTitleDraft(section.title);
  };

  const handleSaveRenameSection = (sectionId) => {
    const cleanTitle = sectionTitleDraft.trim() || 'Untitled';
    setNoteSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title: cleanTitle, updatedAt: Date.now() } : s))
    );
    setEditingSectionId(null);
  };

  const handleFloatingDragStart = (e) => {
    if (e.button !== 0) return;
    const currentCard = floatingNotesRef.current;
    if (!currentCard) return;

    const parentRect = currentCard.offsetParent?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768
    };
    const cardRect = currentCard.getBoundingClientRect();
    const currentLeft = cardRect.left - parentRect.left;
    const currentTop = cardRect.top - parentRect.top;

    notesDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: currentLeft,
      cardY: currentTop,
      parentW: parentRect.width,
      parentH: parentRect.height,
      cardW: cardRect.width,
      cardH: cardRect.height
    };

    setIsDraggingNotes(true);
    let latestPos = null;
    let rafId = null;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - notesDragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - notesDragStartRef.current.mouseY;

      const minX = 12;
      const maxX = Math.max(12, notesDragStartRef.current.parentW - notesDragStartRef.current.cardW - 12);
      const minY = 12;
      const maxY = Math.max(12, notesDragStartRef.current.parentH - notesDragStartRef.current.cardH - 12);

      const boundedX = Math.round(Math.min(maxX, Math.max(minX, notesDragStartRef.current.cardX + deltaX)));
      const boundedY = Math.round(Math.min(maxY, Math.max(minY, notesDragStartRef.current.cardY + deltaY)));

      latestPos = { x: boundedX, y: boundedY };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestPos) setFloatingNotesPos(latestPos);
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (latestPos) {
        setFloatingNotesPos(latestPos);
        try {
          localStorage.setItem('klarity_floating_notes_pos', JSON.stringify(latestPos));
        } catch {}
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingNotes(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleFloatingCalcDragStart = (e) => {
    if (e.button !== 0) return;
    const currentCard = floatingCalcRef.current;
    if (!currentCard) return;

    const parentRect = currentCard.offsetParent?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: window.innerWidth || 1024,
      height: window.innerHeight || 768
    };
    const cardRect = currentCard.getBoundingClientRect();
    const currentLeft = cardRect.left - parentRect.left;
    const currentTop = cardRect.top - parentRect.top;

    calcDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      cardX: currentLeft,
      cardY: currentTop,
      parentW: parentRect.width,
      parentH: parentRect.height,
      cardW: cardRect.width,
      cardH: cardRect.height
    };

    setIsDraggingCalc(true);
    let latestPos = null;
    let rafId = null;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - calcDragStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - calcDragStartRef.current.mouseY;

      const minX = 12;
      const maxX = Math.max(12, calcDragStartRef.current.parentW - calcDragStartRef.current.cardW - 12);
      const minY = 12;
      const maxY = Math.max(12, calcDragStartRef.current.parentH - calcDragStartRef.current.cardH - 12);

      const boundedX = Math.round(Math.min(maxX, Math.max(minX, calcDragStartRef.current.cardX + deltaX)));
      const boundedY = Math.round(Math.min(maxY, Math.max(minY, calcDragStartRef.current.cardY + deltaY)));

      latestPos = { x: boundedX, y: boundedY };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestPos) setFloatingCalcPos(latestPos);
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (latestPos) {
        setFloatingCalcPos(latestPos);
        try {
          localStorage.setItem('klarity_floating_calc_pos', JSON.stringify(latestPos));
        } catch {}
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingCalc(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleFloatingResizeStart = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    notesResizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: floatingNotesSize.width,
      startH: floatingNotesSize.height
    };
    setIsResizingNotes(true);
    let latestSize = null;
    let rafId = null;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - notesResizeStartRef.current.mouseX;
      const deltaY = moveEvent.clientY - notesResizeStartRef.current.mouseY;

      const minW = 280;
      const maxW = Math.max(380, (window.innerWidth || 1200) - floatingNotesPos.x - 20);
      const minH = 240;
      const maxH = Math.max(300, (window.innerHeight || 800) - floatingNotesPos.y - 20);

      const nextW = Math.round(Math.min(maxW, Math.max(minW, notesResizeStartRef.current.startW + deltaX)));
      const nextH = Math.round(Math.min(maxH, Math.max(minH, notesResizeStartRef.current.startH + deltaY)));

      latestSize = { width: nextW, height: nextH };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestSize) setFloatingNotesSize(latestSize);
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (latestSize) {
        setFloatingNotesSize(latestSize);
        try {
          localStorage.setItem('klarity_floating_notes_size', JSON.stringify(latestSize));
        } catch {}
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsResizingNotes(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleFloatingCalcResizeStart = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const cardEl = floatingCalcRef.current;
    const rect = cardEl?.getBoundingClientRect();
    const parentRect = cardEl?.offsetParent?.getBoundingClientRect();

    const isRightAnchored = !floatingCalcPos;
    const startW = rect?.width || floatingCalcWidth || 320;
    const startH = rect?.height || 430;
    const aspect = startH / Math.max(1, startW);

    const cardLeftRel = rect && parentRect ? rect.left - parentRect.left : 16;
    const cardRightRel = rect && parentRect ? rect.right - parentRect.left : startW + 16;
    const cardTopRel = rect && parentRect ? rect.top - parentRect.top : 16;
    const availW = parentRect
      ? Math.max(280, isRightAnchored ? cardRightRel - 12 : parentRect.width - cardLeftRel - 12)
      : 540;
    const availH = parentRect ? Math.max(300, parentRect.height - cardTopRel - 12) : 760;
    const maxW = Math.min(540, Math.floor(availW), Math.floor(availH / Math.max(0.5, aspect)));

    calcResizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW,
      startH,
      aspect,
      isRightAnchored,
      maxW: Math.max(280, maxW)
    };
    setIsResizingCalc(true);
    let latestW = null;
    let rafId = null;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - calcResizeStartRef.current.mouseX;
      const dy = moveEvent.clientY - calcResizeStartRef.current.mouseY;
      const candidateFromX =
        calcResizeStartRef.current.startW + (calcResizeStartRef.current.isRightAnchored ? -dx : dx);
      const candidateFromY =
        (calcResizeStartRef.current.startH + dy) / Math.max(0.5, calcResizeStartRef.current.aspect);
      const chosen = Math.abs(dx) >= Math.abs(dy) ? candidateFromX : candidateFromY;
      latestW = Math.round(
        Math.min(calcResizeStartRef.current.maxW, Math.max(280, chosen))
      );
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (latestW !== null) setFloatingCalcWidth(latestW);
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (latestW !== null) {
        setFloatingCalcWidth(latestW);
        try {
          localStorage.setItem('klarity_floating_calc_width', String(latestW));
        } catch {}
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsResizingCalc(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleInsertCurrentPageLink = () => {
    if (!activeTab?.url || isNewTabUrl(activeTab.url)) return;
    const titlePart = activeTab.title && activeTab.title !== activeTab.url ? `${activeTab.title} — ` : '';
    const linkLine = `${titlePart}${activeTab.url}`;
    const trimmed = String(activeSection.content || '').trimEnd();
    const updated = trimmed ? `${trimmed}\n${linkLine}\n` : `${linkLine}\n`;
    handleUpdateActiveSectionContent(updated);
    setTimeout(() => {
      if (browserNotesRef.current) {
        browserNotesRef.current.focus();
        browserNotesRef.current.scrollTop = browserNotesRef.current.scrollHeight;
      }
    }, 30);
  };

  const handleCopyBrowserNotes = async () => {
    try {
      await navigator.clipboard.writeText(activeSection.content || '');
      setNotesCopiedFeedback(true);
      setTimeout(() => setNotesCopiedFeedback(false), 1800);
    } catch {}
  };

  // Add Bookmark / Folder Popover State
  const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
  const [addMode, setAddMode] = useState('bookmark');
  const [bmTitleInput, setBmTitleInput] = useState('');
  const [bmUrlInput, setBmUrlInput] = useState('');
  const [bmFolderId, setBmFolderId] = useState('');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [openFolderId, setOpenFolderId] = useState(null);
  const addBookmarkRef = useRef(null);
  const bookmarksBarRef = useRef(null);

  // Map of tabId -> <webview> DOM element
  const webviewRefs = useRef({});
  const attachedListenersRef = useRef({});
  const isDesktop = typeof window !== 'undefined' && Boolean(window.klarityDesktop?.isDesktopApp);

  // Keep address bar synced when switching tabs
  useEffect(() => {
    if (activeTab) {
      if (isNewTabUrl(activeTab.url)) {
        setUrlInput('');
        setTimeout(() => urlInputRef.current?.focus(), 0);
      } else {
        setUrlInput(activeTab.url || '');
      }
    }
  }, [activeTabId]);

  // Persist open tabs & groups for "Continue where you left off"
  useEffect(() => {
    saveBrowserSessionState({
      tabs: tabs.map((t) => ({
        id: t.id,
        url: t.url,
        title: t.title,
        isPinned: t.isPinned,
        isMuted: t.isMuted,
        groupId: t.groupId
      })),
      groups: tabGroups,
      activeTabId
    });
  }, [tabs, tabGroups, activeTabId]);

  // Initialize and subscribe to Ad Blocker Stats from Electron
  useEffect(() => {
    let unsubscribe = null;
    if (isDesktop && window.klarityDesktop?.getAdBlockStats) {
      window.klarityDesktop
        .getAdBlockStats()
        .then((stats) => {
          if (stats) {
            if (stats.adsBlockedCount != null) setAdsBlockedCount(stats.adsBlockedCount);
            if (stats.enabled != null) setAdBlockEnabled(stats.enabled);
          }
        })
        .catch(() => {});

      if (window.klarityDesktop?.onAdBlockStats) {
        unsubscribe = window.klarityDesktop.onAdBlockStats((stats) => {
          if (stats) {
            if (stats.adsBlockedCount != null) setAdsBlockedCount(stats.adsBlockedCount);
            if (stats.enabled != null) setAdBlockEnabled(stats.enabled);
          }
        });
      }
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isDesktop]);

  // Keep Downloads popover open state ref synced for IPC callbacks
  useEffect(() => {
    isDownloadsPopoverOpenRef.current = isDownloadsPopoverOpen;
  }, [isDownloadsPopoverOpen]);

  // Initialize and subscribe to Browser Downloads from Electron
  useEffect(() => {
    let unsubscribe = null;
    if (isDesktop && window.klarityDesktop?.getBrowserDownloads) {
      window.klarityDesktop
        .getBrowserDownloads()
        .then((items) => {
          if (Array.isArray(items)) {
            items.forEach((d) => {
              if (d.state === 'completed') knownCompletedIdsRef.current.add(d.id);
            });
            setBrowserDownloads(items);
          }
        })
        .catch(() => {});

      if (window.klarityDesktop?.onBrowserDownloads) {
        unsubscribe = window.klarityDesktop.onBrowserDownloads((items) => {
          if (!Array.isArray(items)) return;
          let hasNewlyCompleted = false;
          items.forEach((d) => {
            if (d.state === 'completed' && !knownCompletedIdsRef.current.has(d.id)) {
              knownCompletedIdsRef.current.add(d.id);
              hasNewlyCompleted = true;
            }
          });
          setBrowserDownloads(items);
          if (hasNewlyCompleted && !isDownloadsPopoverOpenRef.current) {
            setHasUnseenDownload(true);
          }
        });
      }
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isDesktop]);

  const refreshBrowserDownloads = async () => {
    if (!isDesktop || !window.klarityDesktop?.getBrowserDownloads) return;
    try {
      const items = await window.klarityDesktop.getBrowserDownloads();
      if (Array.isArray(items)) setBrowserDownloads(items);
    } catch {}
  };

  const onOpenBrowserHistoryRef = useRef(onOpenBrowserHistory);
  useEffect(() => {
    onOpenBrowserHistoryRef.current = onOpenBrowserHistory;
  }, [onOpenBrowserHistory]);

  const closeToolbarPopovers = () => {
    setIsAdBlockPopoverOpen(false);
    setIsDownloadsPopoverOpen(false);
    setIsOverflowMenuOpen(false);
    setIsAddressDropdownOpen(false);
    setAddressDropdownIndex(-1);
  };

  const handleToggleDownloadsPopover = () => {
    const nextOpen = !isDownloadsPopoverOpen;
    setIsDownloadsPopoverOpen(nextOpen);
    if (nextOpen) {
      setIsAdBlockPopoverOpen(false);
      setIsOverflowMenuOpen(false);
      setHasUnseenDownload(false);
      refreshBrowserDownloads();
    }
  };

  const handleOpenDownloadItem = async (item) => {
    if (!item?.id || !isDesktop || !window.klarityDesktop?.openBrowserDownload) return;
    try {
      const res = await window.klarityDesktop.openBrowserDownload(item.id);
      if (!res?.ok) refreshBrowserDownloads();
    } catch {}
  };

  const handleShowDownloadInFolder = async (item) => {
    if (!item?.id || !isDesktop || !window.klarityDesktop?.showBrowserDownloadInFolder) return;
    try {
      const res = await window.klarityDesktop.showBrowserDownloadInFolder(item.id);
      if (!res?.ok) refreshBrowserDownloads();
    } catch {}
  };

  const handleOpenDownloadsFolder = async () => {
    if (!isDesktop || !window.klarityDesktop?.openBrowserDownloadsFolder) return;
    try {
      await window.klarityDesktop.openBrowserDownloadsFolder();
    } catch {}
  };

  const handleCancelDownloadItem = async (id) => {
    if (!id || !isDesktop || !window.klarityDesktop?.cancelBrowserDownload) return;
    try {
      await window.klarityDesktop.cancelBrowserDownload(id);
    } catch {}
  };

  const handleRemoveDownloadItem = async (id) => {
    if (!id || !isDesktop || !window.klarityDesktop?.removeBrowserDownload) return;
    try {
      const items = await window.klarityDesktop.removeBrowserDownload(id);
      if (Array.isArray(items)) setBrowserDownloads(items);
    } catch {}
  };

  const handleClearDownloads = async () => {
    if (!isDesktop || !window.klarityDesktop?.clearBrowserDownloads) return;
    try {
      const items = await window.klarityDesktop.clearBrowserDownloads();
      if (Array.isArray(items)) setBrowserDownloads(items);
    } catch {}
  };

  // Close popovers and context menus on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adBlockPopoverRef.current && !adBlockPopoverRef.current.contains(e.target)) {
        setIsAdBlockPopoverOpen(false);
      }
      if (overflowMenuRef.current && !overflowMenuRef.current.contains(e.target)) {
        setIsOverflowMenuOpen(false);
      }
      if (downloadsPopoverRef.current && !downloadsPopoverRef.current.contains(e.target)) {
        setIsDownloadsPopoverOpen(false);
      }
      if (addressBarContainerRef.current && !addressBarContainerRef.current.contains(e.target)) {
        setIsAddressDropdownOpen(false);
        setAddressDropdownIndex(-1);
      }
      if (addBookmarkRef.current && !addBookmarkRef.current.contains(e.target)) {
        setIsAddBookmarkOpen(false);
      }
      if (bookmarksBarRef.current && !bookmarksBarRef.current.contains(e.target)) {
        setOpenFolderId(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setTabContextMenu(null);
      }
      if (groupEditorRef.current && !groupEditorRef.current.contains(e.target)) {
        setEditingGroupId(null);
      }
    };
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setIsAddressDropdownOpen(false);
        setAddressDropdownIndex(-1);
        onOpenBrowserHistoryRef.current?.();
        return;
      }
      if (e.key === 'Escape') {
        setTabContextMenu(null);
        setEditingGroupId(null);
        setIsCalculatorOpen(false);
        setIsAdBlockPopoverOpen(false);
        setIsDownloadsPopoverOpen(false);
        setIsOverflowMenuOpen(false);
        setIsAddressDropdownOpen(false);
        setAddressDropdownIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Clamp floating panels & AI sidebar within smaller Chromebook / laptop viewports
  useEffect(() => {
    const clampToViewport = () => {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;

      setFloatingNotesSize((prev) => {
        if (!prev) return prev;
        const maxW = Math.max(280, vw - 24);
        const maxH = Math.max(240, vh - 120);
        const nextW = Math.min(Math.max(280, prev.width), maxW);
        const nextH = Math.min(Math.max(240, prev.height), maxH);
        return nextW === prev.width && nextH === prev.height
          ? prev
          : { width: nextW, height: nextH };
      });

      setFloatingNotesPos((prev) => {
        if (!prev) return prev;
        const maxX = Math.max(12, vw - 300);
        const maxY = Math.max(12, vh - 260);
        const nextX = Math.min(Math.max(12, prev.x), maxX);
        const nextY = Math.min(Math.max(12, prev.y), maxY);
        return nextX === prev.x && nextY === prev.y ? prev : { x: nextX, y: nextY };
      });

      setFloatingCalcWidth((prev) => {
        const maxW = Math.min(540, Math.max(280, vw - 24));
        return Math.min(Math.max(280, prev), maxW);
      });

      setFloatingCalcPos((prev) => {
        if (!prev) return prev;
        const maxX = Math.max(12, vw - 300);
        const maxY = Math.max(12, vh - 320);
        const nextX = Math.min(Math.max(12, prev.x), maxX);
        const nextY = Math.min(Math.max(12, prev.y), maxY);
        return nextX === prev.x && nextY === prev.y ? prev : { x: nextX, y: nextY };
      });

      setBrowserAiWidth((prev) => {
        const maxW = Math.max(320, Math.min(760, Math.floor(vw * 0.65)));
        return Math.min(Math.max(320, prev), maxW);
      });
    };

    clampToViewport();
    window.addEventListener('resize', clampToViewport);
    return () => window.removeEventListener('resize', clampToViewport);
  }, []);

  // Focus and scroll Browser AI input when sidebar opens or new message arrives
  useEffect(() => {
    if (isBrowserAiSidebarOpen) {
      setTimeout(() => {
        browserAiInputRef.current?.focus();
        browserAiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isBrowserAiSidebarOpen, browserAiMessages.length]);

  // Apply page zoom setting to all mounted webviews
  useEffect(() => {
    const factor = Math.max(0.5, Math.min(2.5, Number(browserSettings?.pageZoom || 100) / 100));
    Object.values(webviewRefs.current).forEach((wv) => {
      if (wv && typeof wv.setZoomFactor === 'function') {
        try {
          wv.setZoomFactor(factor);
        } catch {}
      }
    });
  }, [browserSettings?.pageZoom, tabs.length]);

  // Navigate when AI Advisor triggers "Open in Browser"
  useEffect(() => {
    if (pendingBrowserUrl) {
      navigateTo(pendingBrowserUrl);
      if (typeof onClearPendingBrowserUrl === 'function') {
        onClearPendingBrowserUrl();
      }
    }
  }, [pendingBrowserUrl]);

  // Extract page content for AI Advisor from a specific tab's webview
  const extractPageContentForTab = async (tabId) => {
    if (browserSettings?.aiPageReaderEnabled === false) {
      setActiveBrowserContext(null);
      return null;
    }
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && isNewTabUrl(tab.url)) {
      setActiveBrowserContext(null);
      return null;
    }

    const webview = webviewRefs.current[tabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return activeBrowserContext;
    }

    try {
      const script = `
        (() => {
          try {
            const href = window.location.href || '';
            const rawTitle = document.title || '';
            const isYouTube = /youtube\\.com|youtu\\.be/i.test(href);

            if (isYouTube) {
              const ytTitleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title, ytd-watch-metadata h1');
              const ytTitle = ytTitleEl ? (ytTitleEl.innerText || ytTitleEl.textContent || '').trim() : rawTitle.replace(/ - YouTube$/, '').trim();
              const channelEl = document.querySelector('#channel-name #text, #upload-info #channel-name a, ytd-channel-name a, #owner #channel-name');
              const channel = channelEl ? (channelEl.innerText || channelEl.textContent || '').trim() : '';
              const descEl = document.querySelector('#description-inline-expander, #description, ytd-text-inline-expander, #description-inner');
              const description = descEl ? (descEl.innerText || descEl.textContent || '').trim() : '';
              const metaDesc = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
              const infoEl = document.querySelector('#info-container yt-formatted-string, ytd-watch-info-text, #info-strings yt-formatted-string');
              const infoText = infoEl ? (infoEl.innerText || infoEl.textContent || '').trim() : '';

              const parts = [];
              if (channel) parts.push('Channel/Creator: ' + channel);
              if (infoText) parts.push('Video Info: ' + infoText);
              if (description) parts.push('Description:\\n' + description);
              else if (metaDesc) parts.push('Summary: ' + metaDesc);

              return {
                title: ytTitle || rawTitle || 'YouTube Video',
                url: href,
                channel: channel,
                isYouTube: true,
                metaDescription: metaDesc,
                text: parts.join('\\n\\n').slice(0, 16000)
              };
            }

            // General web page extraction (safe extraction from live DOM elements)
            const metaDesc = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
            const mainEl = document.querySelector('main, article, [role="main"]') || document.body;
            let text = '';
            if (mainEl) {
              const nodes = Array.from(mainEl.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, table'));
              if (nodes.length > 0) {
                text = nodes
                  .filter(el => !el.closest('nav, footer, header, script, style, noscript, [aria-hidden="true"]'))
                  .map(el => (el.innerText || el.textContent || '').trim())
                  .filter(Boolean)
                  .join('\\n');
              } else {
                text = (mainEl.innerText || mainEl.textContent || '').replace(/\\s+/g, ' ').trim();
              }
            }

            return {
              title: rawTitle,
              url: href,
              channel: '',
              isYouTube: false,
              metaDescription: metaDesc,
              text: (text || metaDesc).slice(0, 16000)
            };
          } catch (e) {
            return { title: document.title, url: window.location.href, text: '', isYouTube: false, channel: '' };
          }
        })()
      `;
      const res = await webview.executeJavaScript(script);
      if (res && (res.title || res.text || res.url)) {
        const ctxObj = {
          title: res.title || 'Page',
          url: res.url || '',
          text: res.text || '',
          channel: res.channel || '',
          isYouTube: Boolean(res.isYouTube),
          timestamp: Date.now()
        };
        setActiveBrowserContext(ctxObj);
        return ctxObj;
      }
    } catch {}
    return null;
  };

  // Refresh AI page context when switching tabs
  useEffect(() => {
    if (activeTabId) {
      extractPageContentForTab(activeTabId);
    }
  }, [activeTabId, browserSettings?.aiPageReaderEnabled]);

  // Apply YouTube video ad fast-forward, banner cleaning, SponsorBlock and DeArrow
  const applyYouTubeEnhancements = (tabId, targetUrl) => {
    const webview = webviewRefs.current[tabId];
    if (!webview || !targetUrl) return;

    try {
      const parsed = new URL(targetUrl);
      const isYouTube = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be');
      if (!isYouTube) return;

      // 1. YouTube video ad fast-forward & banner cleaner
      if (browserSettings?.youtubeAdShield !== false) {
        webview.executeJavaScript(buildYouTubeAdShieldScript(true)).catch(() => {});
      }

      // Extract video ID for watch or shorts pages
      let videoId = '';
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?#&]/)[0] || '';
      }

      if (videoId) {
        // 2. SponsorBlock skipping
        if (browserSettings?.sponsorBlockEnabled !== false && window.klarityDesktop?.getSponsorSegments) {
          window.klarityDesktop.getSponsorSegments(videoId).then((segments) => {
            if (Array.isArray(segments) && segments.length > 0) {
              webview.executeJavaScript(buildSponsorBlockScript(segments, true)).catch(() => {});
            }
          }).catch(() => {});
        }

        // 3. DeArrow clickbait title cleaner
        if (browserSettings?.dearrowEnabled !== false && window.klarityDesktop?.getDeArrowBranding) {
          window.klarityDesktop.getDeArrowBranding(videoId).then((branding) => {
            webview.executeJavaScript(buildDeArrowScript(branding, true)).catch(() => {});
          }).catch(() => {});
        }
      }
    } catch {}
  };

  // Attach Electron <webview> event listeners for each tab
  const attachWebviewListeners = (tabId, webview) => {
    if (!webview || attachedListenersRef.current[tabId] === webview) return;
    attachedListenersRef.current[tabId] = webview;

    const handleDomReady = () => {
      const factor = Math.max(0.5, Math.min(2.5, Number(browserSettings?.pageZoom || 100) / 100));
      try {
        if (typeof webview.setZoomFactor === 'function') webview.setZoomFactor(factor);
        const currentTab = tabs.find((t) => t.id === tabId);
        if (currentTab && typeof webview.setAudioMuted === 'function') {
          webview.setAudioMuted(Boolean(currentTab.isMuted));
        }
        applyYouTubeEnhancements(tabId, webview.getURL());
      } catch {}
    };

    const handleStartLoading = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isLoading: true, isPlayingMedia: false } : t)));
    };

    const handleMediaStarted = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isPlayingMedia: true } : t)));
    };

    const handleMediaPaused = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isPlayingMedia: false } : t)));
    };

    const handleStopLoading = () => {
      let rawUrl = '';
      let rawTitle = '';
      let back = false;
      let fwd = false;
      try {
        back = webview.canGoBack();
        fwd = webview.canGoForward();
        rawUrl = webview.getURL() || '';
        rawTitle = webview.getTitle() || '';
      } catch {}

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (isNewTabUrl(t.url) && (!rawUrl || rawUrl === 'about:blank')) {
            return { ...t, isLoading: false };
          }
          return {
            ...t,
            isLoading: false,
            canGoBack: back,
            canGoForward: fwd,
            url: rawUrl && rawUrl !== 'about:blank' ? rawUrl : t.url,
            title: rawTitle && rawTitle !== 'about:blank' ? rawTitle : t.title
          };
        })
      );

      if (rawUrl && rawUrl !== 'about:blank' && !isNewTabUrl(rawUrl) && rawTitle && rawTitle !== 'about:blank') {
        updateHistoryEntryTitle(rawUrl, rawTitle, {
          enabled: browserSettingsRef.current?.historyEnabled !== false
        });
      }

      if (rawUrl) {
        applyYouTubeEnhancements(tabId, rawUrl);
      }

      if (tabId === activeTabIdRef.current) {
        if (rawUrl && rawUrl !== 'about:blank' && !isNewTabUrl(rawUrl)) {
          setUrlInput(rawUrl);
        }
        if (rawUrl && rawUrl !== 'about:blank') {
          extractPageContentForTab(tabId);
          setTimeout(() => {
            extractPageContentForTab(tabId);
          }, 800);
        }
      }
    };

    const handleDidNavigate = (e) => {
      let back = false;
      let fwd = false;
      try {
        back = webview.canGoBack();
        fwd = webview.canGoForward();
      } catch {}

      const navUrl = e.url || '';
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (isNewTabUrl(t.url) && (!navUrl || navUrl === 'about:blank')) {
            return t;
          }
          return {
            ...t,
            url: navUrl && navUrl !== 'about:blank' ? navUrl : t.url,
            canGoBack: back,
            canGoForward: fwd
          };
        })
      );
      if (navUrl && navUrl !== 'about:blank' && !isNewTabUrl(navUrl)) {
        recordBrowserVisit(
          { url: navUrl, title: '' },
          { enabled: browserSettingsRef.current?.historyEnabled !== false }
        );
      }
      if (navUrl) {
        applyYouTubeEnhancements(tabId, navUrl);
      }
      if (tabId === activeTabIdRef.current && navUrl && navUrl !== 'about:blank' && !isNewTabUrl(navUrl)) {
        setUrlInput(navUrl);
        extractPageContentForTab(tabId);
        setTimeout(() => {
          extractPageContentForTab(tabId);
        }, 800);
      }
    };

    const handleTitleUpdate = (e) => {
      if (e.title && e.title !== 'about:blank') {
        let currentUrl = '';
        try {
          currentUrl = webview.getURL() || '';
        } catch {}
        if (currentUrl && currentUrl !== 'about:blank' && !isNewTabUrl(currentUrl)) {
          updateHistoryEntryTitle(currentUrl, e.title, {
            enabled: browserSettingsRef.current?.historyEnabled !== false
          });
        }
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId && !isNewTabUrl(t.url) ? { ...t, title: e.title } : t
          )
        );
        if (tabId === activeTabIdRef.current) {
          extractPageContentForTab(tabId);
        }
      }
    };

    const handleIpcMessage = (e) => {
      if (e?.channel === 'klarity:login-detected') {
        const candidate = Array.isArray(e.args) ? e.args[0] : null;
        if (candidate && candidate.password) {
          // Slight delay allows immediate client-side validation errors to settle cleanly
          setTimeout(() => {
            handleLoginCandidateDetected(candidate, tabId);
          }, 350);
        }
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('media-started-playing', handleMediaStarted);
    webview.addEventListener('media-paused', handleMediaPaused);
    webview.addEventListener('ipc-message', handleIpcMessage);
  };

  // Navigate active tab (or specific tabId)
  const navigateTo = (destination, targetTabId = activeTabId) => {
    const target = resolveBrowserDestination(destination, browserSettings?.searchEngine);
    if (!target) return;

    recordRecentSearch(destination, {
      enabled: browserSettingsRef.current?.recentSearchesEnabled !== false
    });
    setIsAddressDropdownOpen(false);
    setAddressDropdownIndex(-1);

    if (isNewTabUrl(target)) {
      if (targetTabId === activeTabId) {
        setUrlInput('');
        setTimeout(() => urlInputRef.current?.focus(), 0);
      }
      setTabs((prev) =>
        prev.map((t) =>
          t.id === targetTabId ? { ...t, url: NEW_TAB_URL, title: 'New Tab', isLoading: false } : t
        )
      );
      return;
    }

    if (targetTabId === activeTabId) {
      setUrlInput(target);
    }
    setTabs((prev) => prev.map((t) => (t.id === targetTabId ? { ...t, url: target } : t)));

    const webview = webviewRefs.current[targetTabId];
    if (webview) {
      try {
        if (typeof webview.loadURL === 'function') {
          webview.loadURL(target);
        } else {
          webview.src = target;
        }
      } catch {
        webview.src = target;
      }
    } else if (!isDesktop) {
      recordBrowserVisit(
        { url: target, title: '' },
        { enabled: browserSettingsRef.current?.historyEnabled !== false }
      );
    }
  };

  const effectiveAddressQuery =
    activeTab?.url && !isNewTabUrl(activeTab.url) && urlInput === activeTab.url
      ? ''
      : urlInput;

  const {
    recentMatches: addressRecentMatches,
    historyMatches: addressHistoryMatches,
    flatItems: addressDropdownItems
  } = buildSearchDropdownItems({
    recentSearches,
    historyItems: browserHistory,
    query: effectiveAddressQuery,
    showRecentSearches: browserSettings?.recentSearchesEnabled !== false,
    historyEnabled: browserSettings?.historyEnabled !== false
  });

  const handleSelectAddressSearch = (selectedQuery) => {
    const clean = String(selectedQuery || '').trim();
    if (!clean) return;
    setUrlInput(clean);
    setIsAddressDropdownOpen(false);
    setAddressDropdownIndex(-1);
    navigateTo(clean, activeTabId);
  };

  const handleFillAddressSearch = (selectedQuery) => {
    setUrlInput(selectedQuery);
    setIsAddressDropdownOpen(true);
    setAddressDropdownIndex(-1);
    setTimeout(() => urlInputRef.current?.focus(), 0);
  };

  const handleSelectAddressHistory = (targetUrl) => {
    if (!targetUrl) return;
    setUrlInput(targetUrl);
    setIsAddressDropdownOpen(false);
    setAddressDropdownIndex(-1);
    navigateTo(targetUrl, activeTabId);
  };

  const handleAddressInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isAddressDropdownOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsAddressDropdownOpen(false);
        setAddressDropdownIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (addressDropdownItems.length === 0) return;
      e.preventDefault();
      if (!isAddressDropdownOpen) {
        setIsAddressDropdownOpen(true);
        setAddressDropdownIndex(0);
      } else {
        setAddressDropdownIndex((prev) =>
          prev < addressDropdownItems.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!isAddressDropdownOpen || addressDropdownItems.length === 0) return;
      e.preventDefault();
      setAddressDropdownIndex((prev) =>
        prev > 0 ? prev - 1 : addressDropdownItems.length - 1
      );
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (isAddressDropdownOpen && addressDropdownIndex >= 0 && addressDropdownItems[addressDropdownIndex]) {
      const selected = addressDropdownItems[addressDropdownIndex];
      if (selected.type === 'recent') {
        handleSelectAddressSearch(selected.item.query);
      } else {
        handleSelectAddressHistory(selected.item.url);
      }
      return;
    }
    setIsAddressDropdownOpen(false);
    setAddressDropdownIndex(-1);
    navigateTo(urlInput, activeTabId);
  };

  const handleBack = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoBack()) wv.goBack();
  };

  const handleForward = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoForward()) wv.goForward();
  };

  const handleReload = (targetTabId = activeTabId) => {
    const wv = webviewRefs.current[targetTabId];
    const tabObj = tabs.find((t) => t.id === targetTabId);
    if (isNewTabUrl(tabObj?.url)) return;
    if (wv) {
      if (tabObj?.isLoading) {
        wv.stop();
        setTabs((prev) => prev.map((t) => (t.id === targetTabId ? { ...t, isLoading: false } : t)));
      } else {
        wv.reload();
      }
    }
  };

  const handleHome = () => {
    const targetHome = getBrowserHomeUrl(browserSettings);
    if (!targetHome) return;
    navigateTo(targetHome, activeTabId);
  };

  // Tab Management Operations
  const handleNewTab = (options = {}) => {
    const url = options.url || getBrowserHomeUrl(browserSettings);
    const title = options.title || (isNewTabUrl(url) ? 'New Tab' : activeEngine.name);
    const newTab = createTabObject(url, title, {
      groupId: options.groupId || null
    });

    setTabs((prev) => {
      if (options.insertAfterTabId) {
        const idx = prev.findIndex((t) => t.id === options.insertAfterTabId);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx + 1, 0, newTab);
          return next;
        }
      }
      return [...prev, newTab];
    });
    setActiveTabId(newTab.id);
    if (isNewTabUrl(url)) {
      setUrlInput('');
      setTimeout(() => urlInputRef.current?.focus(), 0);
    } else {
      setUrlInput(url);
    }
  };

  useEffect(() => {
    openUrlHandlersRef.current = { navigateTo, handleNewTab };
  });

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();
    delete webviewRefs.current[tabId];
    delete attachedListenersRef.current[tabId];

    setTabs((prev) => {
      if (prev.length === 1) {
        // Reset the last remaining tab to Home instead of leaving 0 tabs
        const resetTab = createTabObject(homeUrl, isNewTabUrl(homeUrl) ? 'New Tab' : activeEngine.name);
        setActiveTabId(resetTab.id);
        setUrlInput(isNewTabUrl(homeUrl) ? '' : homeUrl);
        return [resetTab];
      }
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        const fallback = next[Math.min(idx, next.length - 1)] || next[0];
        if (fallback) {
          setActiveTabId(fallback.id);
          setUrlInput(isNewTabUrl(fallback.url) ? '' : fallback.url);
        }
      }
      return next;
    });
  };

  const handleDuplicateTab = (tabId) => {
    const source = tabs.find((t) => t.id === tabId);
    if (!source) return;
    handleNewTab({
      url: source.url,
      title: source.title,
      groupId: source.groupId,
      insertAfterTabId: tabId
    });
  };

  const handleTogglePinTab = (tabId) => {
    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === tabId ? { ...t, isPinned: !t.isPinned, groupId: !t.isPinned ? null : t.groupId } : t
      );
      // Keep pinned tabs sorted to the left
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);
      return [...pinned, ...unpinned];
    });
  };

  const handleToggleMuteTab = (tabId) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const nextMuted = !t.isMuted;
        const wv = webviewRefs.current[tabId];
        if (wv && typeof wv.setAudioMuted === 'function') {
          try {
            wv.setAudioMuted(nextMuted);
          } catch {}
        }
        return { ...t, isMuted: nextMuted };
      })
    );
  };

  const handleCloseOtherTabs = (keepTabId) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id === keepTabId || t.isPinned);
      if (!next.some((t) => t.id === activeTabId)) {
        setActiveTabId(keepTabId);
      }
      return next;
    });
  };

  const handleCloseTabsToRight = (tabId) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = prev.filter((t, i) => i <= idx || t.isPinned);
      if (!next.some((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
      }
      return next;
    });
  };

  // Tab Group Management
  const handleAddTabToNewGroup = (tabId) => {
    const color = TAB_GROUP_COLORS[tabGroups.length % TAB_GROUP_COLORS.length].id;
    const newGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: `Group ${tabGroups.length + 1}`,
      color,
      collapsed: false
    };
    setTabGroups((prev) => [...prev, newGroup]);
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: newGroup.id, isPinned: false } : t)));
    setEditingGroupId(newGroup.id);
  };

  const handleAssignTabToGroup = (tabId, groupId) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId, isPinned: false } : t)));
    setTabGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: false } : g)));
  };

  const handleRemoveTabFromGroup = (tabId) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: null } : t)));
  };

  const handleUngroupAll = (groupId) => {
    setTabs((prev) => prev.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t)));
    setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEditingGroupId(null);
  };

  const handleCloseGroup = (groupId) => {
    const groupTabs = tabs.filter((t) => t.groupId === groupId);
    groupTabs.forEach((t) => {
      delete webviewRefs.current[t.id];
      delete attachedListenersRef.current[t.id];
    });

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.groupId !== groupId);
      if (remaining.length === 0) {
        const resetTab = createTabObject(homeUrl, activeEngine.name);
        setActiveTabId(resetTab.id);
        setUrlInput(homeUrl);
        return [resetTab];
      }
      if (!remaining.some((t) => t.id === activeTabId)) {
        setActiveTabId(remaining[0].id);
        setUrlInput(remaining[0].url);
      }
      return remaining;
    });
    setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEditingGroupId(null);
  };

  // Drag & Drop Tab Reordering
  const handleTabDrop = (targetTabId) => {
    if (!draggedTabId || draggedTabId === targetTabId) return;
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === draggedTabId);
      const toIdx = prev.findIndex((t) => t.id === targetTabId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      // Adopt target tab's group if dropped onto a grouped tab (and unpinned)
      const targetTab = prev[toIdx];
      if (!moved.isPinned && !targetTab.isPinned) {
        moved.groupId = targetTab.groupId || null;
      }
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedTabId(null);
  };

  // Ad Blocker Actions
  const handleToggleAdBlock = async () => {
    if (window.klarityDesktop?.toggleAdBlock) {
      const nextState = !adBlockEnabled;
      setAdBlockEnabled(nextState);
      try {
        const stats = await window.klarityDesktop.toggleAdBlock(nextState);
        if (stats) {
          setAdBlockEnabled(stats.enabled);
          setAdsBlockedCount(stats.adsBlockedCount);
        }
      } catch {}
    } else {
      setAdBlockEnabled((prev) => !prev);
    }
  };

  const handleResetAdBlockCount = async () => {
    if (window.klarityDesktop?.resetAdBlockCount) {
      try {
        await window.klarityDesktop.resetAdBlockCount();
        setAdsBlockedCount(0);
      } catch {}
    } else {
      setAdsBlockedCount(0);
    }
  };

  // In-Browser AI Copilot Actions (Self-contained Advisor-powered browser sidebar)
  const startResizingAiSidebar = (mouseDownEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizingAiSidebar(true);
    const startX = mouseDownEvent.clientX;
    const startWidth = browserAiWidth;
    let latestWidth = startWidth;
    let rafId = null;

    const doDrag = (moveEvent) => {
      const maxAllowed = Math.min(760, Math.floor((window.innerWidth || 1200) * 0.65));
      latestWidth = Math.min(
        Math.max(startWidth + (startX - moveEvent.clientX), 320),
        Math.max(360, maxAllowed)
      );
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setBrowserAiWidth(latestWidth);
        });
      }
    };

    const stopDrag = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setBrowserAiWidth(latestWidth);
      setIsResizingAiSidebar(false);
      window.removeEventListener('mousemove', doDrag);
      window.removeEventListener('mouseup', stopDrag);
      try {
        localStorage.setItem('klarity_browser_ai_width', String(latestWidth));
      } catch {}
    };

    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
  };

  const toggleExpandAiSidebar = () => {
    const maxExpanded = Math.min(620, Math.floor((window.innerWidth || 1200) * 0.52));
    const nextWidth = browserAiWidth >= 520 ? 380 : Math.max(480, maxExpanded);
    setBrowserAiWidth(nextWidth);
    try {
      localStorage.setItem('klarity_browser_ai_width', String(nextWidth));
    } catch {}
  };

  const openAiLinkInBrowser = (rawUrl, { inCurrentTab = false } = {}) => {
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) return;
    if (inCurrentTab || isNewTabUrl(activeTab?.url)) {
      navigateTo(rawUrl, activeTabId);
    } else {
      handleNewTab({ url: rawUrl, insertAfterTabId: activeTabId });
    }
  };

  const handleStopBrowserAi = () => {
    if (browserAiAbortRef.current) {
      browserAiAbortRef.current.abort();
      browserAiAbortRef.current = null;
    }
    setIsBrowserAiLoading(false);
  };

  const handleClearBrowserAiChat = () => {
    handleStopBrowserAi();
    setBrowserAiMessages([]);
  };

  const handleSendBrowserAiMessage = async (overrideText) => {
    const raw = (typeof overrideText === 'string' ? overrideText : browserAiInput).trim();
    if (!raw || isBrowserAiLoading) return;

    if (typeof overrideText !== 'string') {
      setBrowserAiInput('');
    }

    // Refresh active webpage context silently if viewing a live webpage
    let freshContext = null;
    try {
      freshContext = await extractPageContentForTab(activeTabId);
    } catch {}
    const ctxCandidate = freshContext || activeBrowserContext;
    const ctx =
      ctxCandidate && (ctxCandidate.url || ctxCandidate.text || ctxCandidate.title) && !isNewTabUrl(ctxCandidate.url)
        ? ctxCandidate
        : null;

    const nextUserMsg = { role: 'user', text: raw };
    const updatedHistory = [...browserAiMessages, nextUserMsg];
    setBrowserAiMessages(updatedHistory);
    setIsBrowserAiLoading(true);

    if (browserAiAbortRef.current) {
      browserAiAbortRef.current.abort();
    }
    const controller = new AbortController();
    browserAiAbortRef.current = controller;

    try {
      const uid = currentUser?.id || 'default';
      const cachedProvider = settingsAiProvider || localStorage.getItem(`klarity_${uid}_ai_provider`) || 'gemini';
      let cachedModel = settingsAiModel || localStorage.getItem(`klarity_${uid}_ai_model`) || 'gemini-2.0-flash';
      if (cachedModel.includes('tts') || cachedModel.includes('audio') || cachedModel.includes('deep-research') || cachedModel === 'gemini-3.8-flash') {
        cachedModel = 'gemini-2.0-flash';
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          ...(advisorContext || {}),
          message: raw,
          browserContext: ctx,
          browserMode: true,
          userMemory: aiMemory,
          clientProvider: cachedProvider,
          clientModel: cachedModel,
          responseLength: advisorContext?.responseLength || 'balanced',
          webSearchEnabled: advisorContext?.webSearchEnabled !== false
        })
      });
      const data = await res.json();
      if (data.updatedData?.memory && typeof onUpdateAiMemory === 'function') {
        onUpdateAiMemory(data.updatedData.memory);
      }
      let reply = (data.reply || '').replace(/\[NAVIGATE:[\s\S]*?\]/gi, '').replace(/\[ACTION:[\s\S]*?\]/gi, '').trim();
      if (!reply) {
        reply = 'How can I help? Feel free to ask any question or request links to open right here in your browser.';
      }
      setBrowserAiMessages([...updatedHistory, { role: 'assistant', text: reply }]);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setBrowserAiMessages([
          ...updatedHistory,
          { role: 'assistant', text: 'Could not connect to Klarity AI. Please check your network connection.' }
        ]);
      }
    } finally {
      if (browserAiAbortRef.current === controller) {
        browserAiAbortRef.current = null;
      }
      setIsBrowserAiLoading(false);
    }
  };

  // Bookmarks & Folders CRUD
  const folders = browserBookmarks.filter((item) => item.type === 'folder');
  const rootItems = browserBookmarks.filter((item) => !item.folderId);

  const openAddPopover = (presetFolderId = '') => {
    setAddMode('bookmark');
    setBmTitleInput(activeTab?.title && activeTab.title !== 'Klarity Browser' ? activeTab.title : '');
    setBmUrlInput(activeTab?.url || homeUrl);
    setBmFolderId(presetFolderId || '');
    setFolderNameInput('');
    setIsAddBookmarkOpen(true);
    setOpenFolderId(null);
  };

  const handleSaveBookmarkOrFolder = (e) => {
    e.preventDefault();
    if (typeof onUpdateBookmarks !== 'function') return;

    if (addMode === 'folder') {
      const cleanName = folderNameInput.trim();
      if (!cleanName) return;
      onUpdateBookmarks([
        ...browserBookmarks,
        { id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, type: 'folder', title: cleanName }
      ]);
      setFolderNameInput('');
      setIsAddBookmarkOpen(false);
      return;
    }

    const cleanUrl = resolveBrowserDestination(bmUrlInput, browserSettings?.searchEngine);
    if (!cleanUrl) return;
    let fallbackTitle = cleanUrl;
    try {
      fallbackTitle = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch {}
    onUpdateBookmarks([
      ...browserBookmarks,
      {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'bookmark',
        title: bmTitleInput.trim() || fallbackTitle,
        url: cleanUrl,
        folderId: bmFolderId || null
      }
    ]);
    setIsAddBookmarkOpen(false);
  };

  const handleDeleteBookmarkItem = (id, e) => {
    if (e) e.stopPropagation();
    if (typeof onUpdateBookmarks !== 'function') return;
    onUpdateBookmarks(browserBookmarks.filter((item) => item.id !== id && item.folderId !== id));
    if (openFolderId === id) setOpenFolderId(null);
  };

  // Build ordered tab strip items with group headers before first contiguous group member
  const pinnedTabs = tabs.filter((t) => t.isPinned);
  const unpinnedTabs = tabs.filter((t) => !t.isPinned);
  const renderedGroupHeaders = new Set();
  const contextTab = tabContextMenu ? tabs.find((t) => t.id === tabContextMenu.tabId) : null;

  // Derived Browser Downloads status for top-right toolbar button
  const activeDownloads = browserDownloads.filter(
    (d) => d.state === 'progressing' || d.state === 'paused'
  );
  const hasFinishedDownloads = browserDownloads.some(
    (d) => d.state !== 'progressing' && d.state !== 'paused'
  );
  const activeTotalBytes = activeDownloads.reduce((sum, d) => sum + (d.totalBytes || 0), 0);
  const activeReceivedBytes = activeDownloads.reduce((sum, d) => sum + (d.receivedBytes || 0), 0);
  const activeProgressPct =
    activeTotalBytes > 0
      ? Math.min(100, Math.round((activeReceivedBytes / activeTotalBytes) * 100))
      : activeDownloads.length > 0
      ? 35
      : null;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-hidden flex-1 min-h-0">
      {/* 0. CHROME/EDGE STYLE TAB STRIP WITH TAB GROUPS */}
      <div className="shrink-0 bg-[var(--surface-subtle)] border-b border-[var(--line)] px-2 pt-1.5 flex items-end gap-1 overflow-x-auto no-scrollbar select-none relative z-40">
        {/* Pinned Tabs */}
        {pinnedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => setDraggedTabId(tab.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleTabDrop(tab.id)}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setTabContextMenu({
                  tabId: tab.id,
                  x: Math.min(e.clientX, window.innerWidth - 230),
                  y: Math.min(e.clientY, window.innerHeight - 340)
                });
              }}
              title={tab.title || tab.url}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-xl border border-b-0 text-xs cursor-pointer transition-colors shrink-0 ${
                isActive
                  ? 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] font-semibold'
                  : 'bg-transparent border-transparent hover:bg-[var(--surface)]/60 text-[var(--muted)]'
              }`}
            >
              {tab.isLoading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)] shrink-0" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
              )}
              {tab.isMuted && <VolumeX className="w-3 h-3 text-rose-500 shrink-0" />}
            </div>
          );
        })}

        {/* Unpinned Tabs & Collapsible Tab Groups */}
        {unpinnedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const group = tab.groupId ? tabGroups.find((g) => g.id === tab.groupId) : null;
          const groupColor = group
            ? TAB_GROUP_COLORS.find((c) => c.id === group.color) || TAB_GROUP_COLORS[0]
            : null;
          const showGroupHeader = group && !renderedGroupHeaders.has(group.id);
          if (group) renderedGroupHeaders.add(group.id);

          const isHiddenByCollapse = Boolean(group && group.collapsed && !isActive);

          return (
            <React.Fragment key={tab.id}>
              {showGroupHeader && (
                <div className="relative flex items-center shrink-0 mb-1 mr-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setTabGroups((prev) =>
                        prev.map((g) => (g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setEditingGroupId(editingGroupId === group.id ? null : group.id);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border ${groupColor.bg} ${groupColor.text} ${groupColor.border}/40`}
                    title="Click to collapse/expand • Right-click to edit group"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: groupColor.hex }}
                    />
                    <span className="max-w-[100px] truncate">{group.name}</span>
                  </button>

                  {editingGroupId === group.id && (
                    <div
                      ref={groupEditorRef}
                      className="fixed top-12 left-auto z-[120] w-64 p-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl flex flex-col gap-2.5"
                    >
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          setTabGroups((prev) =>
                            prev.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g))
                          )
                        }
                        placeholder="Group name"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {TAB_GROUP_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setTabGroups((prev) =>
                                prev.map((g) => (g.id === group.id ? { ...g, color: c.id } : g))
                              )
                            }
                            aria-label={c.label}
                            className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                              group.color === c.id ? 'scale-110 ring-2 ring-[var(--ink)] ring-offset-1' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="border-t border-[var(--line)] pt-2 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleNewTab({ groupId: group.id });
                            setEditingGroupId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          New tab in group
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUngroupAll(group.id)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          Ungroup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseGroup(group.id)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          Close group
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isHiddenByCollapse && (
                <div
                  draggable
                  onDragStart={() => setDraggedTabId(tab.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTabDrop(tab.id)}
                  onClick={() => setActiveTabId(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({
                      tabId: tab.id,
                      x: Math.min(e.clientX, window.innerWidth - 230),
                      y: Math.min(e.clientY, window.innerHeight - 340)
                    });
                  }}
                  style={
                    groupColor
                      ? { borderTopColor: groupColor.hex, borderTopWidth: '2px' }
                      : undefined
                  }
                  className={`group flex items-center gap-2 min-w-[120px] max-w-[210px] px-3 py-1.5 rounded-t-xl border border-b-0 text-xs cursor-pointer transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] font-semibold'
                      : 'bg-transparent border-transparent hover:bg-[var(--surface)]/60 text-[var(--muted)] font-medium'
                  }`}
                >
                  {tab.isLoading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)] shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  )}
                  <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                  {tab.isMuted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMuteTab(tab.id);
                      }}
                      title="Unmute site"
                      className="p-0.5 rounded hover:bg-[var(--surface-hover)] text-rose-500 cursor-pointer shrink-0"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    aria-label="Close tab"
                    title="Close tab"
                    className={`p-0.5 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* New Tab "+" Button */}
        <button
          type="button"
          onClick={() => handleNewTab()}
          aria-label="New tab"
          title="New tab"
          className="mb-1 ml-0.5 p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TAB CONTEXT MENU (Right-Click) */}
      {tabContextMenu && contextTab && (
        <div
          ref={contextMenuRef}
          style={{ top: `${tabContextMenu.y}px`, left: `${tabContextMenu.x}px` }}
          className="fixed z-[150] w-56 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-2xl text-xs text-[var(--ink)] flex flex-col"
        >
          <button
            type="button"
            onClick={() => {
              handleNewTab({ insertAfterTabId: contextTab.id });
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            New tab to the right
          </button>

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleAddTabToNewGroup(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer font-medium"
          >
            Add tab to new group
          </button>

          {tabGroups.length > 0 && (
            <div className="px-3 py-1 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-[var(--muted)] tracking-wider">
                Add to existing group
              </span>
              {tabGroups.map((g) => {
                const c = TAB_GROUP_COLORS.find((col) => col.id === g.color) || TAB_GROUP_COLORS[0];
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      handleAssignTabToGroup(contextTab.id, g.id);
                      setTabContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-subtle)] text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span className="truncate">{g.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {contextTab.groupId && (
            <button
              type="button"
              onClick={() => {
                handleRemoveTabFromGroup(contextTab.id);
                setTabContextMenu(null);
              }}
              className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              Remove from group
            </button>
          )}

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleReload(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              handleDuplicateTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleTogglePinTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
          >
            <Pin className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>{contextTab.isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          {(contextTab.isPlayingMedia || contextTab.isMuted) && (
            <button
              type="button"
              onClick={() => {
                handleToggleMuteTab(contextTab.id);
                setTabContextMenu(null);
              }}
              className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
            >
              {contextTab.isMuted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Unmute tab</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Mute tab</span>
                </>
              )}
            </button>
          )}

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleCloseTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              handleCloseOtherTabs(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close other tabs
          </button>
          <button
            type="button"
            onClick={() => {
              handleCloseTabsToRight(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close tabs to the right
          </button>
        </div>
      )}

      {/* 1. TOP BROWSER CONTROLS & SMART ADDRESS BAR */}
      <div className="shrink-0 bg-[var(--surface)] border-b border-[var(--line)] px-3 sm:px-4 py-2 flex flex-col gap-2 shadow-2xs relative z-50">
        {passwordSavePrompt && (
          <BrowserPasswordPrompt
            promptData={passwordSavePrompt}
            onSave={handleConfirmPasswordSavePrompt}
            onNeverForSite={handleNeverSaveForDomain}
            onDismiss={() => setPasswordSavePrompt(null)}
          />
        )}
        <div className="flex items-center gap-1.5">
          {/* Navigation Buttons: Back, Forward, Reload, Home */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleBack}
              disabled={!activeTab?.canGoBack}
              aria-label="Back"
              title="Back"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                activeTab?.canGoBack
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={!activeTab?.canGoForward}
              aria-label="Forward"
              title="Forward"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                activeTab?.canGoForward
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowRight className="w-[18px] h-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => handleReload(activeTabId)}
              aria-label={activeTab?.isLoading ? 'Stop loading' : 'Reload page'}
              title={activeTab?.isLoading ? 'Stop loading' : 'Reload page'}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2"
            >
              <RotateCw className={`w-[18px] h-[18px] ${activeTab?.isLoading ? 'animate-spin text-[var(--brand)]' : ''}`} />
            </button>
            {browserSettings?.showHomeButton !== false && (
              <button
                type="button"
                onClick={handleHome}
                aria-label="Browser Home"
                title="Home"
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2"
              >
                <Home className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>

          {/* Smart Address & Search Input with Protection Shield inside left edge */}
          <form
            ref={addressBarContainerRef}
            onSubmit={handleUrlSubmit}
            className="flex-1 flex items-center min-w-0 relative"
          >
            <div className="flex-1 flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full bg-[var(--surface-subtle)] border border-[var(--line)] focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20 transition-all min-h-[38px] min-w-0">
              {/* Protection Shield Inside Left Edge */}
              <div className="relative shrink-0" ref={adBlockPopoverRef}>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isAdBlockPopoverOpen;
                    closeToolbarPopovers();
                    setIsAdBlockPopoverOpen(next);
                  }}
                  aria-label={adBlockEnabled ? `Ad & Tracker Protection on (${adsBlockedCount} blocked)` : 'Ad & Tracker Protection off'}
                  title={adBlockEnabled ? `Protection on (${adsBlockedCount} blocked)` : 'Protection off'}
                  aria-expanded={isAdBlockPopoverOpen}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface-hover)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2"
                >
                  {adBlockEnabled ? (
                    <ShieldCheck className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-[18px] h-[18px] text-[var(--muted)]" />
                  )}
                </button>

                {isAdBlockPopoverOpen && (
                  <div className="absolute left-0 top-full mt-2 w-72 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${adBlockEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted)]'}`} />
                        <span className="text-xs font-bold text-[var(--ink)]">Klarity Ad Blocker</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          adBlockEnabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {adBlockEnabled ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between bg-[var(--surface-subtle)] p-2.5 rounded-xl border border-[var(--line)]">
                      <span className="text-xs font-medium text-[var(--ink)]">Blocked</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{adsBlockedCount}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleToggleAdBlock}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          adBlockEnabled
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {adBlockEnabled ? 'Pause' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={handleResetAdBlockCount}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {(activeTab?.url || '').startsWith('https://') ? (
                <Lock className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" title="Secure connection (HTTPS)" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              )}

              <input
                ref={urlInputRef}
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setIsAddressDropdownOpen(true);
                  setAddressDropdownIndex(-1);
                }}
                onFocus={(e) => {
                  e.target.select();
                  setIsAddressDropdownOpen(true);
                  setAddressDropdownIndex(-1);
                }}
                onBlur={(e) => {
                  if (!addressBarContainerRef.current?.contains(e.relatedTarget)) {
                    setIsAddressDropdownOpen(false);
                    setAddressDropdownIndex(-1);
                  }
                }}
                onKeyDown={handleAddressInputKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isAddressDropdownOpen && addressDropdownItems.length > 0}
                aria-controls="klarity-addressbar-search-dropdown"
                aria-activedescendant={
                  isAddressDropdownOpen && addressDropdownIndex >= 0
                    ? `klarity-addressbar-search-dropdown-opt-${addressDropdownIndex}`
                    : undefined
                }
                placeholder="Search or enter web address"
                aria-label="Address bar"
                className="no-focus-outline flex-1 bg-transparent border-0 outline-none text-sm text-[var(--ink)] placeholder-[var(--muted)] min-w-0 font-medium px-1.5 py-0.5 leading-normal rounded-full"
                style={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setIsAddressDropdownOpen(true);
                    setAddressDropdownIndex(-1);
                    urlInputRef.current?.focus();
                  }}
                  aria-label="Clear URL"
                  title="Clear address"
                  className="p-1 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <BrowserSearchDropdown
              id="klarity-addressbar-search-dropdown"
              isOpen={isAddressDropdownOpen}
              flatItems={addressDropdownItems}
              recentMatches={addressRecentMatches}
              historyMatches={addressHistoryMatches}
              activeIndex={addressDropdownIndex}
              onHighlight={setAddressDropdownIndex}
              onSelectSearch={handleSelectAddressSearch}
              onFillSearch={handleFillAddressSearch}
              onRemoveRecentSearch={(id) => {
                deleteRecentSearchItem(id);
                setAddressDropdownIndex(-1);
              }}
              onClearRecentSearches={() => {
                clearRecentSearches();
                setAddressDropdownIndex(-1);
              }}
              onSelectHistory={handleSelectAddressHistory}
              roundedClass="rounded-xl"
            />
          </form>

          {/* Divider after address bar */}
          <div className="w-px h-5 bg-[var(--line)] mx-0.5 shrink-0" aria-hidden="true" />

          {/* Group 1: Calculator & Notes */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative shrink-0" ref={calculatorPopoverRef}>
              <button
                type="button"
                onClick={() => {
                  const next = !isCalculatorOpen;
                  closeToolbarPopovers();
                  setIsCalculatorOpen(next);
                }}
                aria-label="Calculator"
                title="Calculator"
                aria-expanded={isCalculatorOpen}
                aria-pressed={isCalculatorOpen}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                  isCalculatorOpen
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Calculator className="w-[18px] h-[18px]" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                closeToolbarPopovers();
                if (isNotesVisible) {
                  handleCloseNotes();
                } else {
                  setIsNotesOpen(true);
                  setHomepageNotesDismissed(false);
                  if (notesDisplayMode === 'sidebar') {
                    setIsBrowserAiSidebarOpen(false);
                  }
                  setTimeout(() => browserNotesRef.current?.focus(), 50);
                }
              }}
              aria-label="Notes"
              title="Notes"
              aria-pressed={isNotesVisible}
              className={`hidden md:flex w-9 h-9 rounded-lg items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                isNotesVisible
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <StickyNote className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Divider before Downloads & Advisor (hidden on narrow windows where Notes/Downloads collapse) */}
          <div className="hidden md:block w-px h-5 bg-[var(--line)] mx-0.5 shrink-0" aria-hidden="true" />

          {/* Group 2: History, Downloads & AI Advisor */}
          <div className="flex items-center gap-1 shrink-0">
            {typeof onOpenBrowserHistory === 'function' && (
              <button
                type="button"
                onClick={() => {
                  closeToolbarPopovers();
                  onOpenBrowserHistory();
                }}
                aria-label="Browser History"
                title="History (Ctrl+H)"
                aria-pressed={isBrowserHistoryOpen}
                className={`hidden md:flex w-9 h-9 rounded-lg items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                  isBrowserHistoryOpen
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <History className="w-[18px] h-[18px]" />
              </button>
            )}

            <div className="relative shrink-0" ref={downloadsPopoverRef}>
              <button
                type="button"
                onClick={handleToggleDownloadsPopover}
                aria-label={activeDownloads.length > 0 ? `Downloads (${activeDownloads.length} active)` : 'Downloads'}
                title={activeDownloads.length > 0 ? `Downloads (${activeDownloads.length} active)` : 'Downloads'}
                aria-expanded={isDownloadsPopoverOpen}
                className={`hidden md:flex relative w-9 h-9 rounded-lg items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                  isDownloadsPopoverOpen
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Download className="w-[18px] h-[18px]" />
                {activeDownloads.length > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface)]"
                  />
                )}
              </button>

              {isDownloadsPopoverOpen && (
                <div className="absolute right-[-68px] md:right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-24px)] bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--line)] bg-[var(--surface-subtle)]/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Download className="w-4 h-4 text-[var(--brand)] shrink-0" />
                      <span className="text-xs font-bold text-[var(--ink)]">Downloads</span>
                      {browserDownloads.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--muted)]">
                          {browserDownloads.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isDesktop && (
                        <button
                          type="button"
                          onClick={handleOpenDownloadsFolder}
                          title="Open downloads folder"
                          aria-label="Open downloads folder"
                          className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {hasFinishedDownloads && (
                        <button
                          type="button"
                          onClick={handleClearDownloads}
                          className="px-2 py-1 rounded-lg text-[11px] font-medium hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {!isDesktop ? (
                    <div className="p-5 text-center text-xs text-[var(--muted)]">
                      Browser downloads are saved and managed inside the Klarity desktop app.
                    </div>
                  ) : browserDownloads.length === 0 ? (
                    <div className="p-6 flex flex-col items-center text-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)]">
                        <Download className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-semibold text-[var(--ink)]">No downloads yet</div>
                      <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                        Files you download while browsing will appear here for quick access.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenDownloadsFolder}
                        className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-[var(--brand)]" />
                        <span>Open Downloads Folder</span>
                      </button>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-[var(--line)]">
                      {browserDownloads.map((item) => {
                        const isActiveItem = item.state === 'progressing' || item.state === 'paused';
                        const isCompletedItem = item.state === 'completed';
                        const isMissingFile = isCompletedItem && item.exists === false;
                        const isFailedItem = item.state === 'interrupted' || item.state === 'cancelled';
                        const itemPct =
                          item.totalBytes > 0
                            ? Math.min(100, Math.round(((item.receivedBytes || 0) / item.totalBytes) * 100))
                            : null;

                        const subtitleText = isActiveItem
                          ? `${formatDownloadBytes(item.receivedBytes)}${
                              item.totalBytes > 0
                                ? ` / ${formatDownloadBytes(item.totalBytes)}${itemPct != null ? ` (${itemPct}%)` : ''}`
                                : ''
                            }${item.state === 'paused' ? ' • Paused' : ''}`
                          : isMissingFile
                          ? ['File moved or deleted', formatDownloadTime(item.completedAt || item.startedAt)]
                              .filter(Boolean)
                              .join(' • ')
                          : isFailedItem
                          ? [
                              item.state === 'cancelled' ? 'Cancelled' : 'Download interrupted',
                              item.totalBytes > 0
                                ? `${formatDownloadBytes(item.receivedBytes)} / ${formatDownloadBytes(item.totalBytes)}`
                                : null
                            ]
                              .filter(Boolean)
                              .join(' • ')
                          : [
                              item.totalBytes > 0 || item.receivedBytes > 0
                                ? formatDownloadBytes(item.totalBytes || item.receivedBytes)
                                : null,
                              formatDownloadHost(item.url),
                              formatDownloadTime(item.completedAt || item.startedAt)
                            ]
                              .filter(Boolean)
                              .join(' • ');

                        return (
                          <div
                            key={item.id}
                            className="group px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-[var(--surface-subtle)]/50 transition-colors"
                          >
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                isActiveItem
                                  ? 'bg-[var(--brand-soft)] border-[var(--brand)]/30 text-[var(--brand)]'
                                  : isCompletedItem && !isMissingFile
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-500'
                              }`}
                            >
                              {isActiveItem ? (
                                <Download className="w-4 h-4 animate-pulse" />
                              ) : isCompletedItem && !isMissingFile ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <AlertCircle className="w-4 h-4" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {isCompletedItem && !isMissingFile ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDownloadItem(item)}
                                  title={`Open ${item.filename}`}
                                  className="block w-full text-left text-xs font-semibold text-[var(--ink)] hover:text-[var(--brand)] truncate cursor-pointer"
                                >
                                  {item.filename}
                                </button>
                              ) : (
                                <div
                                  title={item.filename}
                                  className={`text-xs font-semibold truncate ${
                                    isMissingFile || isFailedItem
                                      ? 'text-[var(--muted)] line-through'
                                      : 'text-[var(--ink)]'
                                  }`}
                                >
                                  {item.filename}
                                </div>
                              )}

                              {subtitleText && (
                                <div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
                                  {subtitleText}
                                </div>
                              )}

                              {isActiveItem && (
                                <div className="mt-1.5 h-1.5 w-full rounded-full bg-[var(--surface-subtle)] overflow-hidden">
                                  <div
                                    className={`h-full bg-[var(--brand)] transition-all duration-150 ${
                                      itemPct == null ? 'w-1/2 animate-pulse' : ''
                                    }`}
                                    style={itemPct != null ? { width: `${itemPct}%` } : undefined}
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                              {isActiveItem ? (
                                <button
                                  type="button"
                                  onClick={() => handleCancelDownloadItem(item.id)}
                                  title="Cancel download"
                                  aria-label={`Cancel ${item.filename}`}
                                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[var(--muted)] hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <>
                                  {isCompletedItem && !isMissingFile && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenDownloadItem(item)}
                                        title="Open file"
                                        aria-label={`Open ${item.filename}`}
                                        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--brand)] transition-colors cursor-pointer"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleShowDownloadInFolder(item)}
                                        title="Show in folder"
                                        aria-label={`Show ${item.filename} in folder`}
                                        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                                      >
                                        <FolderOpen className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDownloadItem(item.id)}
                                    title="Remove from list"
                                    aria-label={`Remove ${item.filename} from downloads list`}
                                    className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[var(--muted)] hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                closeToolbarPopovers();
                const nextState = !isBrowserAiSidebarOpen;
                setIsBrowserAiSidebarOpen(nextState);
                if (nextState) {
                  if (activeNotesLayout === 'sidebar') {
                    setIsNotesOpen(false);
                  }
                  if (activeTabId) {
                    extractPageContentForTab(activeTabId);
                  }
                }
              }}
              aria-label="Browser AI Advisor"
              title="Browser AI Advisor"
              aria-pressed={isBrowserAiSidebarOpen}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                isBrowserAiSidebarOpen
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <Sparkles className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Divider before Three-Dot Browser Menu */}
          <div className="w-px h-5 bg-[var(--line)] mx-0.5 shrink-0" aria-hidden="true" />

          {/* Unified Three-Dot Browser Menu (All screen sizes, only real Klarity browser features) */}
          <div className="relative shrink-0" ref={overflowMenuRef}>
            <button
              type="button"
              onClick={() => {
                const next = !isOverflowMenuOpen;
                closeToolbarPopovers();
                setIsOverflowMenuOpen(next);
              }}
              aria-label="Browser menu"
              title="Browser menu"
              aria-expanded={isOverflowMenuOpen}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2 ${
                isOverflowMenuOpen
                  ? 'bg-[var(--brand)] text-white'
                  : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <MoreVertical className="w-[18px] h-[18px]" />
              {activeDownloads.length > 0 && !isOverflowMenuOpen && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand)] ring-2 ring-[var(--surface)]"
                />
              )}
            </button>

            {isOverflowMenuOpen && (() => {
              const currentZoom = Number(browserSettings?.pageZoom || 100);
              const zoomSteps = [75, 80, 90, 100, 110, 125, 150, 175, 200];
              const stepZoom = (delta) => {
                if (!onUpdateBrowserSettings) return;
                const idx = zoomSteps.reduce(
                  (best, val, i) => (Math.abs(val - currentZoom) < Math.abs(zoomSteps[best] - currentZoom) ? i : best),
                  3
                );
                const nextIdx = Math.max(0, Math.min(zoomSteps.length - 1, idx + delta));
                onUpdateBrowserSettings({ ...browserSettings, pageZoom: zoomSteps[nextIdx] });
              };

              return (
                <div
                  role="menu"
                  aria-label="Browser menu"
                  className="absolute right-0 top-full mt-2 w-64 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-2xl z-50 py-1.5 flex flex-col"
                >
                  {/* Group 1: Tabs */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      handleNewTab();
                    }}
                    className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Plus className="w-4 h-4 text-[var(--muted)]" />
                      <span>New tab</span>
                    </span>
                    <span className="text-[11px] text-[var(--muted)]">Ctrl+T</span>
                  </button>

                  <div className="my-1.5 border-t border-[var(--line)]" role="separator" />

                  {/* Group 2: History, Bookmarks, Downloads */}
                  {typeof onOpenBrowserHistory === 'function' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsOverflowMenuOpen(false);
                        onOpenBrowserHistory();
                      }}
                      className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <History className="w-4 h-4 text-[var(--muted)]" />
                        <span>History</span>
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">Ctrl+H</span>
                    </button>
                  )}

                  {typeof onUpdateBrowserSettings === 'function' && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onUpdateBrowserSettings({
                          ...browserSettings,
                          showBookmarksBar: browserSettings?.showBookmarksBar === false
                        });
                      }}
                      className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Bookmark className="w-4 h-4 text-[var(--muted)]" />
                        <span>Bookmarks bar</span>
                      </span>
                      {browserSettings?.showBookmarksBar !== false && (
                        <Check className="w-3.5 h-3.5 text-[var(--brand)]" />
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      setIsDownloadsPopoverOpen(true);
                      setHasUnseenDownload(false);
                      refreshBrowserDownloads();
                    }}
                    className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-[var(--muted)]" />
                      <span>Downloads</span>
                    </span>
                    {activeDownloads.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />
                    )}
                  </button>

                  {/* Group 3: Webpage Zoom */}
                  {typeof onUpdateBrowserSettings === 'function' && (
                    <>
                      <div className="my-1.5 border-t border-[var(--line)]" role="separator" />
                      <div className="px-3.5 py-1.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-3 text-[13px] font-medium text-[var(--ink)]">
                          <ZoomIn className="w-4 h-4 text-[var(--muted)]" />
                          <span>Zoom</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => stepZoom(-1)}
                            disabled={currentZoom <= zoomSteps[0]}
                            aria-label="Zoom out"
                            className="w-7 h-7 rounded-md border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdateBrowserSettings({ ...browserSettings, pageZoom: 100 })}
                            title="Reset zoom to 100%"
                            className="min-w-[44px] text-center text-[12px] font-semibold text-[var(--ink)] hover:text-[var(--brand)] tabular-nums cursor-pointer"
                          >
                            {currentZoom}%
                          </button>
                          <button
                            type="button"
                            onClick={() => stepZoom(1)}
                            disabled={currentZoom >= zoomSteps[zoomSteps.length - 1]}
                            aria-label="Zoom in"
                            className="w-7 h-7 rounded-md border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] flex items-center justify-center cursor-pointer disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="my-1.5 border-t border-[var(--line)]" role="separator" />

                  {/* Group 4: Klarity Browser Tools */}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      setIsAdBlockPopoverOpen(true);
                    }}
                    className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-[var(--muted)]" />
                      <span>Ad blocker</span>
                    </span>
                    <span className={`text-[11px] font-semibold ${adBlockEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted)]'}`}>
                      {adBlockEnabled ? 'On' : 'Off'}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      if (isNotesVisible) {
                        handleCloseNotes();
                      } else {
                        setIsNotesOpen(true);
                        setHomepageNotesDismissed(false);
                        if (notesDisplayMode === 'sidebar') setIsBrowserAiSidebarOpen(false);
                        setTimeout(() => browserNotesRef.current?.focus(), 50);
                      }
                    }}
                    className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <StickyNote className="w-4 h-4 text-[var(--muted)]" />
                      <span>Notes</span>
                    </span>
                    {isNotesVisible && <Check className="w-3.5 h-3.5 text-[var(--brand)]" />}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsOverflowMenuOpen(false);
                      setIsBrowserAiSidebarOpen((prev) => !prev);
                    }}
                    className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-[var(--muted)]" />
                      <span>AI Advisor</span>
                    </span>
                    {isBrowserAiSidebarOpen && <Check className="w-3.5 h-3.5 text-[var(--brand)]" />}
                  </button>

                  {/* Group 5: Settings */}
                  {typeof onOpenBrowserSettings === 'function' && (
                    <>
                      <div className="my-1.5 border-t border-[var(--line)]" role="separator" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsOverflowMenuOpen(false);
                          onOpenBrowserSettings();
                        }}
                        className="px-3.5 py-2 text-left text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-3 cursor-pointer"
                      >
                        <SettingsIcon className="w-4 h-4 text-[var(--muted)]" />
                        <span>Settings</span>
                      </button>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. BOOKMARKS BAR */}
        {browserSettings?.showBookmarksBar !== false && (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap" ref={bookmarksBarRef}>
            {rootItems.map((item) => {
              if (item.type === 'folder') {
                const folderChildren = browserBookmarks.filter((b) => b.folderId === item.id);
                const isFolderOpen = openFolderId === item.id;
                return (
                  <div key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFolderId(isFolderOpen ? null : item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[11px] text-[var(--ink)] font-medium transition-colors cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="max-w-[140px] truncate">{item.title}</span>
                      <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
                    </button>

                    {isFolderOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 p-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-0.5">
                        {folderChildren.length === 0 ? (
                          <div className="px-2.5 py-2 text-[11px] text-[var(--muted)] text-center">
                            Empty folder
                          </div>
                        ) : (
                          folderChildren.map((child) => (
                            <div
                              key={child.id}
                              className="group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  navigateTo(child.url, activeTabId);
                                  setOpenFolderId(null);
                                }}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                title={child.url}
                              >
                                <Bookmark className="w-3 h-3 text-[var(--brand)] shrink-0" />
                                <span className="text-xs font-medium text-[var(--ink)] truncate">{child.title}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteBookmarkItem(child.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer transition-opacity"
                                title="Remove bookmark"
                                aria-label={`Remove ${child.title}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                        <div className="border-t border-[var(--line)] mt-1 pt-1 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => openAddPopover(item.id)}
                            className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--surface-subtle)] text-[11px] font-medium text-[var(--brand)] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add page here</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBookmarkItem(item.id, e)}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[var(--muted)] hover:text-rose-600 cursor-pointer"
                            title="Delete folder"
                            aria-label={`Delete folder ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[11px] text-[var(--ink)] font-medium transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => navigateTo(item.url, activeTabId)}
                    className="flex items-center gap-1.5 cursor-pointer max-w-[160px]"
                    title={item.url}
                  >
                    <Bookmark className="w-3 h-3 text-[var(--brand)] shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBookmarkItem(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer transition-opacity"
                    title="Remove bookmark"
                    aria-label={`Remove ${item.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* "+" Button to Add Bookmark or Folder */}
            <div className="relative" ref={addBookmarkRef}>
              <button
                type="button"
                onClick={() => {
                  if (isAddBookmarkOpen) {
                    setIsAddBookmarkOpen(false);
                  } else {
                    openAddPopover('');
                  }
                }}
                aria-label="Add bookmark or folder"
                title="Add bookmark or folder"
                className="flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {isAddBookmarkOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setAddMode('bookmark')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'bookmark'
                          ? 'bg-[var(--surface)] text-[var(--ink)] shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Bookmark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('folder')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'folder'
                          ? 'bg-[var(--surface)] text-[var(--ink)] shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Folder</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveBookmarkOrFolder} className="flex flex-col gap-2.5">
                    {addMode === 'bookmark' ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Name</label>
                          <input
                            type="text"
                            value={bmTitleInput}
                            onChange={(e) => setBmTitleInput(e.target.value)}
                            placeholder="Bookmark name"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">URL</label>
                          <input
                            type="text"
                            required
                            value={bmUrlInput}
                            onChange={(e) => setBmUrlInput(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Folder</label>
                          <select
                            value={bmFolderId}
                            onChange={(e) => setBmFolderId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          >
                            <option value="">Bookmarks Bar</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Folder Name</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={folderNameInput}
                          onChange={(e) => setFolderNameInput(e.target.value)}
                          placeholder="Folder name"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddBookmarkOpen(false)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. MULTI-TAB BROWSER CONTENT CANVAS + INTEGRATED BROWSER AI SIDEBAR */}
      <div className="flex-1 w-full relative bg-[var(--surface)] min-h-0 h-full overflow-hidden flex flex-row">
        {/* Webviews and New Tab Pages */}
        <div className="flex-1 min-w-0 h-full relative overflow-hidden">
          {isAnyToolbarPopoverOpen && (
            <div
              onClick={closeToolbarPopovers}
              aria-hidden="true"
              className="absolute inset-0 z-30 bg-transparent"
            />
          )}
          {isDesktop ? (
            tabs.map((tab) => {
              const isTabActive = tab.id === activeTabId;
              const showNewTab = isNewTabUrl(tab.url);
              const disableWebviewPointer =
                isAnyToolbarPopoverOpen || isDraggingCalc || isResizingCalc || isDraggingNotes || isResizingNotes || isResizingAiSidebar;
              return (
                <React.Fragment key={tab.id}>
                  <webview
                    ref={(el) => {
                      if (el) {
                        webviewRefs.current[tab.id] = el;
                        attachWebviewListeners(tab.id, el);
                      }
                    }}
                    src={isNewTabUrl(tab.initialUrl) ? 'about:blank' : tab.initialUrl}
                    partition="persist:klarity_browser"
                    className="w-full h-full border-0 absolute inset-0"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      border: 'none',
                      outline: 'none',
                      zIndex: isTabActive && !showNewTab ? 10 : 0,
                      opacity: isTabActive && !showNewTab ? 1 : 0,
                      visibility:
                        isTabActive && !showNewTab
                          ? (isAnyToolbarPopoverOpen ? 'hidden' : 'visible')
                          : 'hidden',
                      pointerEvents:
                        isTabActive && !showNewTab && !disableWebviewPointer ? 'auto' : 'none'
                    }}
                    allowpopups="true"
                    webpreferences="contextIsolation=true, sandbox=true"
                  />
                  {showNewTab && (
                    <div
                      className="absolute inset-0 w-full h-full"
                      style={{
                        zIndex: isTabActive ? 20 : 0,
                        opacity: isTabActive ? 1 : 0,
                        pointerEvents: isTabActive ? 'auto' : 'none'
                      }}
                    >
                      <NewTabPage
                        searchEngineId={browserSettings?.searchEngine}
                        onNavigate={(dest) => navigateTo(dest, tab.id)}
                        onOpenNewTab={(url, title) =>
                          handleNewTab({ url, title, insertAfterTabId: tab.id })
                        }
                        showHomepageNotes={showNotesOnHomepage}
                        onToggleHomepageNotes={handleToggleHomepageNotes}
                        recentSearches={recentSearches}
                        browserHistory={browserHistory}
                        recentSearchesEnabled={browserSettings?.recentSearchesEnabled !== false}
                        historyEnabled={browserSettings?.historyEnabled !== false}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })
          ) : isNewTabUrl(activeTab?.url) ? (
            <NewTabPage
              searchEngineId={browserSettings?.searchEngine}
              onNavigate={(dest) => navigateTo(dest, activeTabId)}
              onOpenNewTab={(url, title) =>
                handleNewTab({ url, title, insertAfterTabId: activeTabId })
              }
              showHomepageNotes={showNotesOnHomepage}
              onToggleHomepageNotes={handleToggleHomepageNotes}
              recentSearches={recentSearches}
              browserHistory={browserHistory}
              recentSearchesEnabled={browserSettings?.recentSearchesEnabled !== false}
              historyEnabled={browserSettings?.historyEnabled !== false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--surface-subtle)]">
              <Card className="max-w-md p-6 flex flex-col items-center gap-4 text-center shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)]">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)]">In-App Browser</h3>
                  <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                    Embedded browsing runs natively in the Klarity Desktop application.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={() => window.open(activeTab?.url || homeUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Open Page
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Draggable & Proportionally Resizable Floating Calculator Window */}
          {isCalculatorOpen && (
            <BrowserCalculatorPopover
              floating={true}
              position={floatingCalcPos}
              width={floatingCalcWidth}
              isDragging={isDraggingCalc}
              isResizing={isResizingCalc}
              onDragStart={handleFloatingCalcDragStart}
              onResizeStart={handleFloatingCalcResizeStart}
              cardRef={floatingCalcRef}
              onClose={() => setIsCalculatorOpen(false)}
            />
          )}

          {/* Draggable & Resizable Floating Quick Notes Window (Over any webpage / New Tab) */}
          {isNotesVisible && activeNotesLayout === 'floating' && (
            <aside
              ref={floatingNotesRef}
              aria-label="Floating Quick Notes"
              style={{
                left: `${floatingNotesPos.x}px`,
                top: `${floatingNotesPos.y}px`,
                width: `${floatingNotesSize.width}px`,
                height: `${floatingNotesSize.height}px`,
                minWidth: '280px',
                minHeight: '240px'
              }}
              className={`absolute z-40 flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl overflow-hidden transition-shadow select-none ${
                isDraggingNotes ? 'shadow-2xl ring-2 ring-amber-500/50' : isResizingNotes ? 'ring-2 ring-amber-500/50' : 'hover:border-[var(--muted)]/40'
              }`}
            >
              {/* Draggable Header & Action Bar */}
              <div
                onMouseDown={handleFloatingDragStart}
                className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-[var(--line)] bg-[var(--surface-subtle)]/70 cursor-grab active:cursor-grabbing select-none shrink-0"
                title="Click and drag to move notes anywhere"
              >
                <div className="flex items-center gap-1.5">
                  <GripHorizontal className="w-4 h-4 text-[var(--muted)] hover:text-amber-500 transition-colors" />
                  {/* Icon-Only Mode Switcher (Sidebar vs Floating) */}
                  <div
                    className="flex items-center p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--line)]"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setNotesDisplayMode('sidebar');
                        setIsNotesOpen(true);
                        setIsBrowserAiSidebarOpen(false);
                      }}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        activeNotesLayout === 'sidebar'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                      }`}
                      title="Dock as sidebar"
                      aria-label="Sidebar notes"
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotesDisplayMode('floating');
                        setIsNotesOpen(true);
                      }}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                        activeNotesLayout === 'floating'
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                      }`}
                      title="Floating window active"
                      aria-label="Floating notes"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={handleInsertCurrentPageLink}
                    disabled={!activeTab?.url || isNewTabUrl(activeTab.url)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--brand-soft)] text-[var(--brand)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                    title="Insert current page link"
                  >
                    <Link2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyBrowserNotes}
                    disabled={!activeSection?.content}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Copy active section notes"
                  >
                    {notesCopiedFeedback ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseNotes}
                    className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ml-0.5"
                    title="Close Notes"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sections / Categories Tab Bar */}
              <div
                className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[var(--line)] bg-[var(--surface-subtle)]/40 overflow-x-auto no-scrollbar shrink-0 select-none"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {noteSections.map((sec) => {
                  const isActive = sec.id === activeSection.id;
                  const isEditing = editingSectionId === sec.id;

                  if (isEditing) {
                    return (
                      <form
                        key={sec.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveRenameSection(sec.id);
                        }}
                        className="flex items-center gap-1 shrink-0"
                      >
                        <input
                          type="text"
                          value={sectionTitleDraft}
                          onChange={(e) => setSectionTitleDraft(e.target.value)}
                          onBlur={() => handleSaveRenameSection(sec.id)}
                          autoFocus
                          className="w-20 px-1.5 py-0.5 rounded text-xs bg-[var(--surface)] border border-amber-500 outline-none text-[var(--ink)] font-medium"
                        />
                        <button
                          type="submit"
                          className="p-0.5 rounded text-emerald-500 hover:bg-[var(--surface)] cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={sec.id}
                      onClick={() => setActiveSectionId(sec.id)}
                      onDoubleClick={(e) => handleStartRenameSection(sec, e)}
                      className={`group/sec flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 border ${
                        isActive
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold shadow-2xs'
                          : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]'
                      }`}
                      title={`${sec.title} (Double-click to rename)`}
                    >
                      <span className="max-w-[90px] truncate">{sec.title}</span>
                      {isActive && (
                        <button
                          type="button"
                          onClick={(e) => handleStartRenameSection(sec, e)}
                          className="opacity-0 group-hover/sec:opacity-100 p-0.5 rounded hover:text-[var(--ink)] cursor-pointer transition-opacity"
                          title="Rename section"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {noteSections.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNoteSection(sec.id, e)}
                          className="opacity-0 group-hover/sec:opacity-100 p-0.5 rounded hover:text-rose-500 cursor-pointer transition-opacity"
                          title="Delete section"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleAddNoteSection}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-dashed border-[var(--line)] hover:border-amber-500/50 transition-colors cursor-pointer shrink-0"
                  title="Create new section"
                >
                  <Plus className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px]">New</span>
                </button>
              </div>

              {/* Notes Textarea Editor */}
              <div className="flex-1 p-2.5 flex flex-col min-h-0 bg-[var(--surface)] select-text relative">
                <textarea
                  ref={browserNotesRef}
                  value={activeSection?.content || ''}
                  onChange={(e) => handleUpdateActiveSectionContent(e.target.value)}
                  placeholder={`Jot down notes in ${activeSection?.title || 'this section'}, paste links (Ctrl+V), or click 'Link' above to save the current webpage...`}
                  className="w-full h-full flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]/40 p-3 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 leading-relaxed select-text"
                />
              </div>

              {/* Status Bar with Auto-Save and Resize Corner */}
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--line)] bg-[var(--surface-subtle)]/50 text-[10px] text-[var(--muted)] select-none shrink-0 relative">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Auto-saved</span>
                </div>
                <div className="flex items-center gap-3 pr-3">
                  <span>{(activeSection?.content || '').length} chars</span>
                </div>

                {/* Corner Resize Handle */}
                <div
                  onMouseDown={handleFloatingResizeStart}
                  className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-[var(--muted)] hover:text-amber-500 transition-colors z-20 select-none group/resize"
                  title="Click and drag to resize floating notes"
                  aria-label="Resize notes"
                >
                  <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 stroke-current fill-none stroke-2 opacity-60 group-hover/resize:opacity-100">
                    <path d="M14 14H10M14 14V10M14 8L8 14M14 3L3 14" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </aside>
          )}

          {/* Full-screen overlay while dragging/resizing floating notes or AI sidebar */}
          {(isDraggingNotes || isResizingNotes || isResizingAiSidebar) && (
            <div
              className={`fixed inset-0 z-[100] select-none ${
                isResizingAiSidebar ? 'cursor-col-resize' : isResizingNotes ? 'cursor-se-resize' : 'cursor-grabbing'
              }`}
            />
          )}
        </div>

        {/* Dedicated In-Browser Quick Notes Sidebar (Accessible on any browser page) */}
        {isNotesVisible && activeNotesLayout === 'sidebar' && (
          <aside
            aria-label="Browser Quick Notes"
            className="w-80 sm:w-88 md:w-96 shrink-0 h-full bg-[var(--surface)] border-l border-[var(--line)] flex flex-col z-30 shadow-2xl transition-all"
          >
            {/* Action Bar (Top of sidebar - Icon-Only Mode Switcher & Actions) */}
            <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-[var(--line)] bg-[var(--surface-subtle)]/60 shrink-0 select-none">
              {/* Icon-Only Mode Switcher: Sidebar vs Floating */}
              <div className="flex items-center p-0.5 rounded-lg bg-[var(--surface)] border border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => {
                    setNotesDisplayMode('sidebar');
                    setIsNotesOpen(true);
                    setIsBrowserAiSidebarOpen(false);
                  }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    activeNotesLayout === 'sidebar'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                  }`}
                  title="Sidebar mode active"
                  aria-label="Sidebar notes"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNotesDisplayMode('floating');
                    setIsNotesOpen(true);
                  }}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${
                    activeNotesLayout === 'floating'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)]'
                  }`}
                  title="Switch to floating notes"
                  aria-label="Floating notes"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Actions: Insert Page Link, Copy, Close */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleInsertCurrentPageLink}
                  disabled={!activeTab?.url || isNewTabUrl(activeTab.url)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--brand-soft)] text-[var(--brand)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer"
                  title="Insert current page link"
                >
                  <Link2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Link</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyBrowserNotes}
                  disabled={!activeSection?.content}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Copy active section notes"
                >
                  {notesCopiedFeedback ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseNotes}
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer ml-0.5"
                  title="Close Notes"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sections / Categories Tab Bar */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-[var(--line)] bg-[var(--surface-subtle)]/40 overflow-x-auto no-scrollbar shrink-0 select-none">
              {noteSections.map((sec) => {
                const isActive = sec.id === activeSection.id;
                const isEditing = editingSectionId === sec.id;

                if (isEditing) {
                  return (
                    <form
                      key={sec.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveRenameSection(sec.id);
                      }}
                      className="flex items-center gap-1 shrink-0"
                    >
                      <input
                        type="text"
                        value={sectionTitleDraft}
                        onChange={(e) => setSectionTitleDraft(e.target.value)}
                        onBlur={() => handleSaveRenameSection(sec.id)}
                        autoFocus
                        className="w-20 px-1.5 py-0.5 rounded text-xs bg-[var(--surface)] border border-amber-500 outline-none text-[var(--ink)] font-medium"
                      />
                      <button
                        type="submit"
                        className="p-0.5 rounded text-emerald-500 hover:bg-[var(--surface)] cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </form>
                  );
                }

                return (
                  <div
                    key={sec.id}
                    onClick={() => setActiveSectionId(sec.id)}
                    onDoubleClick={(e) => handleStartRenameSection(sec, e)}
                    className={`group/sec flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer shrink-0 border ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold shadow-2xs'
                        : 'bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]'
                    }`}
                    title={`${sec.title} (Double-click to rename)`}
                  >
                    <span className="max-w-[90px] truncate">{sec.title}</span>
                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => handleStartRenameSection(sec, e)}
                        className="opacity-0 group-hover/sec:opacity-100 p-0.5 rounded hover:text-[var(--ink)] cursor-pointer transition-opacity"
                        title="Rename section"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {noteSections.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNoteSection(sec.id, e)}
                        className="opacity-0 group-hover/sec:opacity-100 p-0.5 rounded hover:text-rose-500 cursor-pointer transition-opacity"
                        title="Delete section"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddNoteSection}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] border border-dashed border-[var(--line)] hover:border-amber-500/50 transition-colors cursor-pointer shrink-0"
                title="Create new section"
              >
                <Plus className="w-3 h-3 text-amber-500" />
                <span className="text-[11px]">New</span>
              </button>
            </div>

            {/* Notes Textarea Editor */}
            <div className="flex-1 p-3 flex flex-col min-h-0 bg-[var(--surface)]">
              <textarea
                ref={browserNotesRef}
                value={activeSection?.content || ''}
                onChange={(e) => handleUpdateActiveSectionContent(e.target.value)}
                placeholder={`Jot down notes in ${activeSection?.title || 'this section'}, paste links (Ctrl+V), or click 'Link' above to save the current webpage...`}
                className="w-full h-full flex-1 resize-none rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)]/50 p-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/60 leading-relaxed"
              />
            </div>

            {/* Status Bar with Auto-Save */}
            <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--line)] bg-[var(--surface-subtle)]/50 text-[10px] text-[var(--muted)] select-none shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span>Auto-saved</span>
              </div>
              <div>
                <span>{(activeSection?.content || '').length} chars</span>
              </div>
            </div>
          </aside>
        )}

        {/* Dedicated In-Browser AI Sidebar (Advisor-powered, expandable, direct browser link opening) */}
        {isBrowserAiSidebarOpen && (
          <aside
            aria-label="Klarity AI Sidebar"
            style={{ width: `${browserAiWidth}px` }}
            className={`max-w-[92vw] shrink-0 h-full bg-[var(--surface)] border-l border-[var(--line)] flex flex-col z-30 shadow-2xl relative ${
              isResizingAiSidebar ? 'select-none !transition-none' : 'transition-[width] duration-150 ease-out'
            }`}
          >
            {/* Draggable Left Resize Handle */}
            <div
              onMouseDown={startResizingAiSidebar}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize AI sidebar"
              title="Drag to resize AI sidebar"
              className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-40 group flex items-center justify-center transition-colors ${
                isResizingAiSidebar ? 'bg-[var(--brand)]/20' : 'hover:bg-[var(--brand)]/10'
              }`}
            >
              <div
                className={`w-1 h-10 rounded-full transition-colors ${
                  isResizingAiSidebar ? 'bg-[var(--brand)]' : 'bg-[var(--line)] group-hover:bg-[var(--brand)]'
                }`}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-[var(--ink)] tracking-tight">Klarity AI</span>
                    {!isNewTabUrl(activeTab?.url) && activeBrowserContext?.isYouTube && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
                        YouTube
                      </span>
                    )}
                  </div>
                  {!isNewTabUrl(activeTab?.url) ? (
                    <p
                      className="text-[11px] text-[var(--muted)] truncate"
                      title={activeTab?.title || activeTab?.url}
                    >
                      {formatDownloadHost(activeTab?.url) || activeTab?.title || 'Viewing page'}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[var(--muted)]">
                      Advisor &amp; web assistant
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={toggleExpandAiSidebar}
                  title={browserAiWidth >= 520 ? 'Restore sidebar width' : 'Expand sidebar width'}
                  aria-label={browserAiWidth >= 520 ? 'Restore sidebar width' : 'Expand sidebar width'}
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  {browserAiWidth >= 520 ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                {typeof onAskAdvisor === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      const latestUserPrompt = browserAiMessages.filter((m) => m.role === 'user').slice(-1)[0]?.text || '';
                      onAskAdvisor(
                        latestUserPrompt || (!isNewTabUrl(activeTab?.url) ? `I am currently viewing "${activeTab?.title || activeTab?.url}" (${activeTab?.url})` : ''),
                        activeBrowserContext
                      );
                      setIsBrowserAiSidebarOpen(false);
                    }}
                    title="Open in Full Advisor"
                    aria-label="Open in Full Advisor"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {browserAiMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBrowserAiChat}
                    title="Clear chat"
                    aria-label="Clear chat"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsBrowserAiSidebarOpen(false)}
                  title="Close Klarity AI"
                  aria-label="Close Klarity AI"
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {browserAiMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand)]/20 flex items-center justify-center mb-3.5 text-[var(--brand)] shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-[15px] font-bold text-[var(--ink)] mb-1.5">
                    Klarity AI
                  </h4>
                  <p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-[260px]">
                    Ask any question, look up links to open right in your browser, or ask about the page you&apos;re viewing.
                  </p>
                </div>
              ) : (
                browserAiMessages.map((msg, i) => {
                  const msgLinks = msg.role === 'assistant' ? extractLinksFromText(msg.text) : [];
                  return (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        onClick={(e) => {
                          const anchor = e.target?.closest?.('a[href]');
                          if (!anchor) return;
                          const href = anchor.getAttribute('href');
                          if (href && /^https?:\/\//i.test(href)) {
                            e.preventDefault();
                            e.stopPropagation();
                            openAiLinkInBrowser(href, { inCurrentTab: false });
                          }
                        }}
                        className={`relative group/msg max-w-[94%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[var(--brand)] text-white rounded-br-xs shadow-2xs'
                            : 'bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)] rounded-bl-xs shadow-2xs w-full'
                        }`}
                      >
                        <FormattedChatMessage text={msg.text} isUser={msg.role === 'user'} />

                        {msg.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                navigator.clipboard?.writeText(msg.text);
                                setCopiedAiMsgIdx(i);
                                setTimeout(() => setCopiedAiMsgIdx((cur) => (cur === i ? null : cur)), 1500);
                              } catch {}
                            }}
                            title="Copy response"
                            aria-label="Copy response"
                            className="absolute top-2 right-2 p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] opacity-0 group-hover/msg:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                          >
                            {copiedAiMsgIdx === i ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {msgLinks.length > 0 && (
                          <div className="mt-2.5 pt-2.5 border-t border-[var(--line)] flex flex-col gap-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Open in Browser
                            </span>
                            {msgLinks.map((link) => (
                              <div
                                key={link.url}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--brand)]/50 transition-colors"
                              >
                                <button
                                  type="button"
                                  onClick={() => openAiLinkInBrowser(link.url, { inCurrentTab: false })}
                                  title={`Open ${link.url} in new tab`}
                                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer group/link"
                                >
                                  <Globe className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-[12px] font-semibold text-[var(--ink)] group-hover/link:text-[var(--brand)] truncate">
                                      {link.label}
                                    </div>
                                    <div className="text-[10px] text-[var(--muted)] truncate">
                                      {link.host}
                                    </div>
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openAiLinkInBrowser(link.url, { inCurrentTab: true })}
                                  title="Open in current tab"
                                  aria-label={`Open ${link.label} in current tab`}
                                  className="px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--surface-subtle)] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Here</span>
                                  <ArrowUpRight className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isBrowserAiLoading && (
                <div className="flex items-center gap-2.5 text-[13px] text-[var(--muted)] px-3.5 py-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--line)] w-fit">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--brand)]" />
                  <span>Thinking...</span>
                </div>
              )}
              <div ref={browserAiMessagesEndRef} />
            </div>

            {/* Bottom Input */}
            <div className="p-3.5 border-t border-[var(--line)] bg-[var(--surface)] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendBrowserAiMessage();
                }}
                className="flex items-end gap-2 px-3 py-2 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--line)] focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15 transition-all"
              >
                <textarea
                  ref={browserAiInputRef}
                  rows={1}
                  value={browserAiInput}
                  onChange={(e) => setBrowserAiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
                      e.preventDefault();
                      handleSendBrowserAiMessage();
                    }
                  }}
                  placeholder="Ask anything or search for links..."
                  className="flex-1 min-w-0 max-h-28 resize-none bg-transparent py-1 text-[13.5px] leading-snug text-[var(--ink)] placeholder-[var(--muted)] outline-none"
                />
                {isBrowserAiLoading ? (
                  <button
                    type="button"
                    onClick={handleStopBrowserAi}
                    className="p-2 rounded-xl bg-[var(--surface)] hover:bg-red-500/10 text-red-500 border border-[var(--line)] transition-colors cursor-pointer shrink-0"
                    title="Stop response"
                    aria-label="Stop response"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!browserAiInput.trim()}
                    className={`p-2 rounded-xl transition-all shrink-0 ${
                      browserAiInput.trim()
                        ? 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white cursor-pointer shadow-2xs'
                        : 'bg-transparent text-[var(--muted)] cursor-not-allowed opacity-50'
                    }`}
                    title="Send"
                    aria-label="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
