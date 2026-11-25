import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  FolderPlus,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Ungroup,
  Wallet,
  X
} from 'lucide-react';
import {
  NEWTAB_GRADIENT_PRESETS,
  NEWTAB_PREFS_UPDATED_EVENT,
  NEWTAB_SOLID_PRESETS,
  getSearchEngineById,
  isHexColorDark,
  loadNewTabPrefs,
  loadNewTabQuickLinks,
  saveNewTabPrefs,
  saveNewTabQuickLinks
} from '../utils/browserSettings';
import {
  BROWSER_HISTORY_UPDATED_EVENT,
  RECENT_SEARCHES_UPDATED_EVENT,
  buildSearchDropdownItems,
  clearRecentSearches,
  deleteRecentSearchItem,
  loadBrowserHistory,
  loadRecentSearches
} from '../utils/browserHistory';
import { BrowserSearchDropdown } from './BrowserSearchDropdown';
import { NewTabCustomizePanel } from './NewTabCustomizePanel';

function normalizeShortcutUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getHostname(url) {
  try {
    return new URL(normalizeShortcutUrl(url)).hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

function getBadgeColor(label) {
  const palette = [
    'bg-blue-600',
    'bg-indigo-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-cyan-600',
    'bg-amber-600',
    'bg-rose-600'
  ];
  let hash = 0;
  const str = String(label || 'K');
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % palette.length;
  }
  return palette[Math.abs(hash) % palette.length];
}

function ShortcutIcon({ name, url, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const host = useMemo(() => getHostname(url), [url]);
  const faviconUrl = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : '';
  const initial = (name || host || 'K').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [faviconUrl]);

  const boxClass =
    size === 'sm'
      ? 'w-5 h-5 rounded-md text-[10px]'
      : 'w-10 h-10 rounded-xl text-base';
  const imgClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

  if (!faviconUrl || failed) {
    return (
      <div
        className={`${boxClass} ${getBadgeColor(name || host)} text-white font-bold flex items-center justify-center shadow-sm shrink-0`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div
      className={`${boxClass} bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center overflow-hidden shadow-sm shrink-0`}
    >
      <img
        src={faviconUrl}
        alt={name}
        className={`${imgClass} object-contain`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function getGreeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function NewTabPage({
  searchEngineId,
  onNavigate,
  onOpenNewTab,
  showHomepageNotes,
  onToggleHomepageNotes,
  recentSearches: propRecentSearches,
  browserHistory: propBrowserHistory,
  recentSearchesEnabled = true,
  historyEnabled = true,
  financialContext = null,
  noteSections = [],
  activeNoteSectionId = '',
  onSelectNoteSection
}) {
  const activeEngine = getSearchEngineById(searchEngineId);

  const [query, setQuery] = useState('');
  const [localRecentSearches, setLocalRecentSearches] = useState(() =>
    Array.isArray(propRecentSearches) ? propRecentSearches : loadRecentSearches()
  );
  const [localHistoryItems, setLocalHistoryItems] = useState(() =>
    Array.isArray(propBrowserHistory) ? propBrowserHistory : loadBrowserHistory()
  );
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(-1);
  const searchFormRef = useRef(null);
  const searchInputRef = useRef(null);

  const [quickLinks, setQuickLinks] = useState(() => loadNewTabQuickLinks());
  const [prefs, setPrefs] = useState(() => loadNewTabPrefs());
  const [now, setNow] = useState(() => new Date());
  const [glanceRevealed, setGlanceRevealed] = useState(false);

  const isLowPowerDevice = useMemo(() => {
    try {
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      const lowCores = typeof navigator?.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
      const lowMem = typeof navigator?.deviceMemory === 'number' && navigator.deviceMemory <= 4;
      return Boolean(reducedMotion || (lowCores && lowMem));
    } catch {
      return false;
    }
  }, []);

  // Customize popover
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const customizeRef = useRef(null);

  // Add / Edit shortcut modal ({ mode: 'add' | 'edit', id?, groupId?, name, url })
  const [shortcutModal, setShortcutModal] = useState(null);

  // Create / Rename Group modal ({ mode: 'create' | 'edit', groupId?, sourceLinkId?, targetLinkId?, name })
  const [groupModal, setGroupModal] = useState(null);

  // Open Group view modal (groupId)
  const [openGroupId, setOpenGroupId] = useState(null);
  const [isEditingOpenGroupName, setIsEditingOpenGroupName] = useState(false);
  const [openGroupNameDraft, setOpenGroupNameDraft] = useState('');

  // Tile action menu (three-dot or right-click)
  const [tileMenu, setTileMenu] = useState(null); // { item, groupId?, x, y }
  const tileMenuRef = useRef(null);

  // Drag & Drop to combine shortcuts into groups
  const [draggedTileId, setDraggedTileId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  const effectiveRecentSearches = Array.isArray(propRecentSearches)
    ? propRecentSearches
    : localRecentSearches;
  const effectiveHistoryItems = Array.isArray(propBrowserHistory)
    ? propBrowserHistory
    : localHistoryItems;

  useEffect(() => {
    if (Array.isArray(propRecentSearches) && Array.isArray(propBrowserHistory)) return undefined;
    const syncSearches = () => setLocalRecentSearches(loadRecentSearches());
    const syncHistory = () => setLocalHistoryItems(loadBrowserHistory());
    window.addEventListener(RECENT_SEARCHES_UPDATED_EVENT, syncSearches);
    window.addEventListener(BROWSER_HISTORY_UPDATED_EVENT, syncHistory);
    return () => {
      window.removeEventListener(RECENT_SEARCHES_UPDATED_EVENT, syncSearches);
      window.removeEventListener(BROWSER_HISTORY_UPDATED_EVENT, syncHistory);
    };
  }, [propRecentSearches, propBrowserHistory]);

  const {
    recentMatches,
    historyMatches,
    flatItems: dropdownFlatItems
  } = useMemo(
    () =>
      buildSearchDropdownItems({
        recentSearches: effectiveRecentSearches,
        historyItems: effectiveHistoryItems,
        query,
        showRecentSearches: recentSearchesEnabled !== false,
        historyEnabled: historyEnabled !== false
      }),
    [effectiveRecentSearches, effectiveHistoryItems, query, recentSearchesEnabled, historyEnabled]
  );

  useEffect(() => {
    saveNewTabQuickLinks(quickLinks);
  }, [quickLinks]);

  useEffect(() => {
    saveNewTabPrefs(prefs);
  }, [prefs]);

  // Keep multiple open New Tabs in sync when prefs change in any tab
  useEffect(() => {
    const syncPrefs = (e) => {
      if (e?.detail && typeof e.detail === 'object') {
        setPrefs((prev) => {
          const nextStr = JSON.stringify(e.detail);
          return JSON.stringify(prev) === nextStr ? prev : e.detail;
        });
      }
    };
    window.addEventListener(NEWTAB_PREFS_UPDATED_EVENT, syncPrefs);
    return () => window.removeEventListener(NEWTAB_PREFS_UPDATED_EVENT, syncPrefs);
  }, []);

  useEffect(() => {
    if (prefs.financeGlanceMasked !== false) {
      setGlanceRevealed(false);
    }
  }, [prefs.financeGlanceMasked]);

  useEffect(() => {
    if (prefs.showClock === false) return undefined;
    const refreshClock = () => {
      if (!document.hidden) {
        setNow(new Date());
      }
    };
    const intervalMs = prefs.showSeconds ? 1000 : 30000;
    const timer = setInterval(refreshClock, intervalMs);
    document.addEventListener('visibilitychange', refreshClock);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshClock);
    };
  }, [prefs.showClock, prefs.showSeconds]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) {
        setIsCustomizeOpen(false);
      }
      if (tileMenuRef.current && !tileMenuRef.current.contains(e.target)) {
        setTileMenu(null);
      }
      if (searchFormRef.current && !searchFormRef.current.contains(e.target)) {
        setIsSearchDropdownOpen(false);
        setActiveDropdownIndex(-1);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsCustomizeOpen(false);
        setTileMenu(null);
        setShortcutModal(null);
        setGroupModal(null);
        setOpenGroupId(null);
        setIsEditingOpenGroupName(false);
        setIsSearchDropdownOpen(false);
        setActiveDropdownIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const existingGroups = useMemo(
    () => quickLinks.filter((item) => item.type === 'group'),
    [quickLinks]
  );

  const openGroup = useMemo(
    () => quickLinks.find((item) => item.type === 'group' && item.id === openGroupId) || null,
    [quickLinks, openGroupId]
  );

  const handleSelectDropdownSearch = (selectedQuery) => {
    const clean = String(selectedQuery || '').trim();
    if (!clean) return;
    setQuery(clean);
    setIsSearchDropdownOpen(false);
    setActiveDropdownIndex(-1);
    onNavigate(clean);
  };

  const handleFillDropdownSearch = (selectedQuery) => {
    setQuery(selectedQuery);
    setActiveDropdownIndex(-1);
    setIsSearchDropdownOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleSelectDropdownHistory = (url) => {
    if (!url) return;
    setIsSearchDropdownOpen(false);
    setActiveDropdownIndex(-1);
    onNavigate(url);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (isSearchDropdownOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsSearchDropdownOpen(false);
        setActiveDropdownIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      if (dropdownFlatItems.length === 0) return;
      e.preventDefault();
      if (!isSearchDropdownOpen) {
        setIsSearchDropdownOpen(true);
        setActiveDropdownIndex(0);
      } else {
        setActiveDropdownIndex((prev) =>
          prev < dropdownFlatItems.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      if (!isSearchDropdownOpen || dropdownFlatItems.length === 0) return;
      e.preventDefault();
      setActiveDropdownIndex((prev) =>
        prev > 0 ? prev - 1 : dropdownFlatItems.length - 1
      );
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (isSearchDropdownOpen && activeDropdownIndex >= 0 && dropdownFlatItems[activeDropdownIndex]) {
      const selected = dropdownFlatItems[activeDropdownIndex];
      if (selected.type === 'recent') {
        handleSelectDropdownSearch(selected.item.query);
      } else {
        handleSelectDropdownHistory(selected.item.url);
      }
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsSearchDropdownOpen(false);
    setActiveDropdownIndex(-1);
    onNavigate(trimmed);
  };

  const handleSaveShortcut = (e) => {
    e.preventDefault();
    if (!shortcutModal) return;
    const normalizedUrl = normalizeShortcutUrl(shortcutModal.url);
    if (!normalizedUrl) return;
    const fallbackName = getHostname(normalizedUrl) || 'Shortcut';
    const finalName = (shortcutModal.name || '').trim() || fallbackName;

    if (shortcutModal.groupId) {
      setQuickLinks((prev) =>
        prev.map((item) => {
          if (item.id !== shortcutModal.groupId || item.type !== 'group') return item;
          const items = Array.isArray(item.items) ? item.items : [];
          if (shortcutModal.mode === 'edit' && shortcutModal.id) {
            return {
              ...item,
              items: items.map((sub) =>
                sub.id === shortcutModal.id ? { ...sub, name: finalName, url: normalizedUrl } : sub
              )
            };
          }
          return {
            ...item,
            items: [
              ...items,
              {
                id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: finalName,
                url: normalizedUrl
              }
            ]
          };
        })
      );
      setShortcutModal(null);
      return;
    }

    if (shortcutModal.mode === 'edit' && shortcutModal.id) {
      setQuickLinks((prev) =>
        prev.map((item) =>
          item.id === shortcutModal.id
            ? { ...item, name: finalName, url: normalizedUrl }
            : item
        )
      );
    } else {
      setQuickLinks((prev) => [
        ...prev,
        {
          id: `ql-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'link',
          name: finalName,
          url: normalizedUrl
        }
      ]);
    }
    setShortcutModal(null);
  };

  const handleRemoveItem = (id, groupId = null) => {
    if (groupId) {
      setQuickLinks((prev) =>
        prev
          .map((item) => {
            if (item.id !== groupId || item.type !== 'group') return item;
            const remaining = (item.items || []).filter((sub) => sub.id !== id);
            return { ...item, items: remaining };
          })
          .filter((item) => item.type !== 'group' || (item.items && item.items.length > 0))
      );
    } else {
      setQuickLinks((prev) => prev.filter((item) => item.id !== id));
      if (openGroupId === id) setOpenGroupId(null);
    }
    setTileMenu(null);
  };

  const handleCombineIntoNewGroup = (sourceId, targetId, groupName = 'New Group') => {
    const trimmedName = (groupName || '').trim() || 'New Group';
    setQuickLinks((prev) => {
      const source = prev.find((i) => i.id === sourceId && i.type !== 'group');
      const target = prev.find((i) => i.id === targetId && i.type !== 'group');
      if (!source || !target || source.id === target.id) return prev;
      const newGroup = {
        id: `qlg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'group',
        name: trimmedName,
        items: [
          { id: target.id, name: target.name, url: target.url },
          { id: source.id, name: source.name, url: source.url }
        ]
      };
      return prev
        .filter((i) => i.id !== sourceId)
        .map((i) => (i.id === targetId ? newGroup : i));
    });
  };

  const handleMoveLinkToGroup = (linkId, groupId) => {
    setQuickLinks((prev) => {
      const link = prev.find((i) => i.id === linkId && i.type !== 'group');
      if (!link) return prev;
      return prev
        .filter((i) => i.id !== linkId)
        .map((i) =>
          i.id === groupId && i.type === 'group'
            ? {
                ...i,
                items: [...(i.items || []), { id: link.id, name: link.name, url: link.url }]
              }
            : i
        );
    });
    setTileMenu(null);
  };

  const handleRemoveFromGroup = (subId, groupId) => {
    setQuickLinks((prev) => {
      const grp = prev.find((i) => i.id === groupId && i.type === 'group');
      const sub = grp?.items?.find((s) => s.id === subId);
      if (!grp || !sub) return prev;
      const remaining = (grp.items || []).filter((s) => s.id !== subId);
      const next = prev
        .map((i) => (i.id === groupId ? { ...i, items: remaining } : i))
        .filter((i) => i.type !== 'group' || (i.items && i.items.length > 0));
      next.push({ id: sub.id, type: 'link', name: sub.name, url: sub.url });
      if (remaining.length === 0 && openGroupId === groupId) {
        setOpenGroupId(null);
      }
      return next;
    });
    setTileMenu(null);
  };

  const handleUngroup = (groupId) => {
    setQuickLinks((prev) => {
      const idx = prev.findIndex((i) => i.id === groupId && i.type === 'group');
      if (idx < 0) return prev;
      const grp = prev[idx];
      const extracted = (grp.items || []).map((sub) => ({
        id: sub.id,
        type: 'link',
        name: sub.name,
        url: sub.url
      }));
      const next = [...prev];
      next.splice(idx, 1, ...extracted);
      return next;
    });
    if (openGroupId === groupId) setOpenGroupId(null);
    setTileMenu(null);
  };

  const handleSaveGroupModal = (e) => {
    e.preventDefault();
    if (!groupModal) return;
    const finalName = (groupModal.name || '').trim() || 'New Group';

    if (groupModal.mode === 'create' && groupModal.sourceLinkId && groupModal.targetLinkId) {
      handleCombineIntoNewGroup(groupModal.sourceLinkId, groupModal.targetLinkId, finalName);
    } else if (groupModal.mode === 'create' && groupModal.sourceLinkId) {
      setQuickLinks((prev) => {
        const link = prev.find((i) => i.id === groupModal.sourceLinkId && i.type !== 'group');
        if (!link) return prev;
        const newGroup = {
          id: `qlg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'group',
          name: finalName,
          items: [{ id: link.id, name: link.name, url: link.url }]
        };
        return prev.map((i) => (i.id === link.id ? newGroup : i));
      });
    } else if (groupModal.mode === 'edit' && groupModal.groupId) {
      setQuickLinks((prev) =>
        prev.map((i) => (i.id === groupModal.groupId ? { ...i, name: finalName } : i))
      );
    }
    setGroupModal(null);
  };

  const handleSaveOpenGroupName = () => {
    if (!openGroup) return;
    const trimmed = openGroupNameDraft.trim();
    if (trimmed) {
      setQuickLinks((prev) =>
        prev.map((i) => (i.id === openGroup.id ? { ...i, name: trimmed } : i))
      );
    }
    setIsEditingOpenGroupName(false);
  };

  const handleDropOnTile = (targetItem) => {
    if (!draggedTileId || draggedTileId === targetItem.id) {
      setDraggedTileId(null);
      setDropTargetId(null);
      return;
    }

    const draggedItem = quickLinks.find((i) => i.id === draggedTileId);
    if (!draggedItem || draggedItem.type === 'group') {
      setDraggedTileId(null);
      setDropTargetId(null);
      return;
    }

    if (targetItem.type === 'group') {
      handleMoveLinkToGroup(draggedTileId, targetItem.id);
    } else {
      setGroupModal({
        mode: 'create',
        sourceLinkId: draggedTileId,
        targetLinkId: targetItem.id,
        name: ''
      });
    }

    setDraggedTileId(null);
    setDropTargetId(null);
  };

  const openTileMenuAt = (e, item, groupId = null) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.type === 'contextmenu' ? e.clientX : Math.min(rect.right - 140, window.innerWidth - 200);
    const y = e.type === 'contextmenu' ? e.clientY : rect.bottom + 6;
    setTileMenu({
      item,
      groupId,
      x: Math.max(12, Math.min(x, window.innerWidth - 210)),
      y: Math.max(12, Math.min(y, window.innerHeight - 210))
    });
  };

  const timeString = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    ...(prefs.showSeconds ? { second: '2-digit' } : {}),
    hour12: (prefs.clockFormat || '12h') !== '24h'
  });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const baseGreeting = getGreeting(now.getHours());
  const greetingText = prefs.greetingName?.trim()
    ? `${baseGreeting}, ${prefs.greetingName.trim()}`
    : baseGreeting;

  // Derive Top Visited shortcuts from Browser History when quickLinksSource === 'top_visited'
  const topVisitedShortcuts = useMemo(() => {
    if (prefs.quickLinksSource !== 'top_visited') return [];
    const byHost = new Map();
    (effectiveHistoryItems || []).forEach((entry) => {
      if (!entry?.url || !/^https?:\/\//i.test(entry.url)) return;
      const host = getHostname(entry.url);
      if (!host) return;
      const existing = byHost.get(host);
      if (existing) {
        existing.count += 1;
      } else {
        byHost.set(host, {
          id: `tv-${host}`,
          type: 'link',
          name: (entry.title || host).split(' - ')[0].split(' | ')[0].trim().slice(0, 24) || host,
          url: `https://${host}`,
          count: 1
        });
      }
    });
    return Array.from(byHost.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(8, Number(prefs.quickLinksColumns) || 6));
  }, [prefs.quickLinksSource, prefs.quickLinksColumns, effectiveHistoryItems]);

  const displayedQuickLinks =
    prefs.quickLinksSource === 'top_visited' && topVisitedShortcuts.length > 0
      ? topVisitedShortcuts
      : quickLinks;

  // Upcoming bills summary for optional Financial Glance widget
  const financeGlanceSummary = useMemo(() => {
    if (!prefs.showFinanceGlance || !financialContext) return null;
    const availableCash = Number(financialContext.availableCash) || 0;
    const projectedCash = Number(financialContext.projectedCashAfterBills ?? availableCash) || 0;
    const bills = Array.isArray(financialContext.bills) ? financialContext.bills : [];
    const unpaidBills = bills
      .filter((b) => !b.paid && b.status !== 'paid')
      .map((b) => ({
        id: b.id || b.name,
        name: b.name || 'Bill',
        amount: Number(b.amount) || 0,
        dueDate: b.dueDate || b.nextDueDate || ''
      }))
      .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))
      .slice(0, 3);
    return {
      availableCash,
      projectedCash,
      unpaidCount: bills.filter((b) => !b.paid && b.status !== 'paid').length,
      upcomingBills: unpaidBills
    };
  }, [prefs.showFinanceGlance, financialContext]);

  // Background resolution (Solid / Gradient / Wallpaper)
  const bgStyleMode = prefs.backgroundStyle || 'slate';
  const hasWallpaper = bgStyleMode === 'wallpaper' && Boolean(prefs.wallpaperUrl?.trim());
  const selectedGradient =
    NEWTAB_GRADIENT_PRESETS.find((g) => g.id === prefs.gradientPreset) || NEWTAB_GRADIENT_PRESETS[0];
  const selectedSolid = NEWTAB_SOLID_PRESETS.find((s) => s.id === prefs.solidColor);
  const customSolidHex = /^#[0-9a-f]{6}$/i.test(prefs.solidColor || '') ? prefs.solidColor : '';
  const resolvedSolidHex = selectedSolid ? selectedSolid.hex : customSolidHex;

  const isDarkBackdrop = useMemo(() => {
    if (hasWallpaper) return true;
    if (bgStyleMode === 'gradient') return Boolean(selectedGradient?.isDark);
    if (bgStyleMode === 'slate' && resolvedSolidHex) {
      if (selectedSolid && typeof selectedSolid.isDark === 'boolean') return selectedSolid.isDark;
      return isHexColorDark(resolvedSolidHex);
    }
    return false;
  }, [hasWallpaper, bgStyleMode, selectedGradient, resolvedSolidHex, selectedSolid]);

  const isLightBackdrop = useMemo(() => {
    if (hasWallpaper) return false;
    if (bgStyleMode === 'gradient') return selectedGradient?.isDark === false;
    if (bgStyleMode === 'slate' && resolvedSolidHex) {
      if (selectedSolid && typeof selectedSolid.isDark === 'boolean') return !selectedSolid.isDark;
      return !isHexColorDark(resolvedSolidHex);
    }
    return false;
  }, [hasWallpaper, bgStyleMode, selectedGradient, resolvedSolidHex, selectedSolid]);

  const containerBgStyle = useMemo(() => {
    if (bgStyleMode === 'gradient' && selectedGradient) {
      return { background: selectedGradient.css };
    }
    if (bgStyleMode === 'slate' && resolvedSolidHex) {
      return { backgroundColor: resolvedSolidHex };
    }
    return undefined;
  }, [bgStyleMode, selectedGradient, resolvedSolidHex]);

  // Surface contrast classes (Auto / Light / Dark)
  const surfaceContrast = prefs.surfaceContrast || 'auto';
  const cardSurfaceClass =
    surfaceContrast === 'light'
      ? 'bg-white/92 hover:bg-white border-slate-200/90 text-slate-900'
      : surfaceContrast === 'dark'
        ? 'bg-slate-900/88 hover:bg-slate-900 border-slate-700/80 text-slate-100'
        : 'bg-[var(--surface)]/92 hover:bg-[var(--surface-hover)] border-[var(--line)] text-[var(--ink)]';

  const staticCardSurfaceClass =
    surfaceContrast === 'light'
      ? 'bg-white/94 border-slate-200/90 text-slate-900'
      : surfaceContrast === 'dark'
        ? 'bg-slate-900/90 border-slate-700/80 text-slate-100'
        : 'bg-[var(--surface)]/95 border-[var(--line)] text-[var(--ink)]';

  const cardMutedTextClass =
    surfaceContrast === 'light'
      ? 'text-slate-500'
      : surfaceContrast === 'dark'
        ? 'text-slate-400'
        : 'text-[var(--muted)]';

  const clockPrimaryClass = isDarkBackdrop
    ? 'text-white drop-shadow'
    : isLightBackdrop
      ? 'text-slate-900'
      : 'text-[var(--ink)]';
  const clockSecondaryClass = isDarkBackdrop
    ? 'text-slate-200 drop-shadow-xs'
    : isLightBackdrop
      ? 'text-slate-600'
      : 'text-[var(--muted)]';

  const isCompactDensity = prefs.layoutDensity === 'compact';
  const isDashboardLayout = prefs.layoutMode === 'dashboard';
  const isIconOnlyTiles = prefs.quickLinksStyle === 'icon_only';
  const isCompactSearch = prefs.searchBarStyle === 'compact';
  const quickLinksGridColsClass =
    Number(prefs.quickLinksColumns) === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : Number(prefs.quickLinksColumns) === 8
        ? 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8'
        : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6';

  const wallpaperDimOpacity = Math.max(0, Math.min(85, Number(prefs.wallpaperDim ?? 45))) / 100;
  const applyWallpaperBlur = hasWallpaper && Boolean(prefs.wallpaperBlur) && !isLowPowerDevice;
  const isAmountHidden = prefs.financeGlanceMasked !== false && !glanceRevealed;

  const formatMoney = (val) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(Number(val) || 0);

  return (
    <div
      className="w-full h-full relative overflow-y-auto text-[var(--ink)] select-none bg-[var(--background)]"
      style={containerBgStyle}
    >
      {/* Dedicated Wallpaper Layer (supports dim overlay + optional subtle blur) */}
      {hasWallpaper && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url("${prefs.wallpaperUrl.trim()}")`,
              ...(applyWallpaperBlur ? { filter: 'blur(4px)', transform: 'scale(1.03)' } : {})
            }}
          />
          <div
            className="absolute inset-0 bg-slate-950"
            style={{ opacity: wallpaperDimOpacity }}
          />
        </div>
      )}

      {/* Top-right Customize Page button & popover */}
      <div className="sticky top-0 z-20 flex justify-end p-4 pointer-events-none">
        <div className="relative pointer-events-auto" ref={customizeRef}>
          <button
            type="button"
            onClick={() => setIsCustomizeOpen((prev) => !prev)}
            title="Customize page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)]/92 hover:bg-[var(--surface-hover)] border border-[var(--line)] hover:border-[var(--brand)]/50 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--brand)]" />
            <span>Customize</span>
          </button>

          {isCustomizeOpen && (
            <NewTabCustomizePanel
              prefs={prefs}
              setPrefs={setPrefs}
              showHomepageNotes={showHomepageNotes}
              onToggleHomepageNotes={onToggleHomepageNotes}
              noteSections={noteSections}
              activeNoteSectionId={activeNoteSectionId}
              onSelectNoteSection={onSelectNoteSection}
              isLowPowerDevice={isLowPowerDevice}
              onClose={() => setIsCustomizeOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Main Content Canvas (Centered or Dashboard Grid) */}
      <div
        className={`relative z-10 mx-auto px-6 ${
          isCompactDensity ? 'pt-3 pb-10' : 'pt-8 pb-16'
        } flex flex-col items-center w-full ${
          isDashboardLayout ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        {/* Minimal Clock / Greeting */}
        {prefs.showClock !== false && (
          <div className={`text-center ${isCompactDensity ? 'mb-5' : 'mb-7'}`}>
            <div
              className={`${
                isCompactDensity ? 'text-4xl' : 'text-5xl'
              } font-semibold tracking-tight tabular-nums ${clockPrimaryClass}`}
            >
              {timeString}
            </div>
            <div className={`mt-1.5 text-sm font-medium ${clockSecondaryClass}`}>
              {greetingText}
              {prefs.showDate !== false ? ` · ${dateString}` : ''}
            </div>
            {prefs.greetingSubtitle?.trim() && (
              <div className={`mt-0.5 text-xs font-medium ${clockSecondaryClass} opacity-90`}>
                {prefs.greetingSubtitle.trim()}
              </div>
            )}
          </div>
        )}

        {/* Pill Search Bar */}
        {prefs.showSearchBar !== false && (
          <form
            ref={searchFormRef}
            onSubmit={handleSearchSubmit}
            className={`relative w-full ${
              isCompactSearch ? 'max-w-xl' : 'max-w-2xl'
            } ${isCompactDensity ? 'mb-6' : 'mb-10'} z-20`}
          >
            <div
              className={`flex items-center gap-3 ${
                isCompactSearch ? 'pl-4 pr-2 py-1.5 min-h-[42px]' : 'pl-5 pr-2.5 py-2.5 min-h-[52px]'
              } rounded-full border focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20 shadow-md transition-colors ${staticCardSurfaceClass}`}
            >
              <Search className={`${isCompactSearch ? 'w-4 h-4' : 'w-5 h-5'} ${cardMutedTextClass} shrink-0`} />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onFocus={() => {
                  setIsSearchDropdownOpen(true);
                  setActiveDropdownIndex(-1);
                }}
                onBlur={(e) => {
                  if (!searchFormRef.current?.contains(e.relatedTarget)) {
                    setIsSearchDropdownOpen(false);
                    setActiveDropdownIndex(-1);
                  }
                }}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                  setActiveDropdownIndex(-1);
                }}
                onKeyDown={handleSearchKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={isSearchDropdownOpen && dropdownFlatItems.length > 0}
                aria-controls="klarity-newtab-search-dropdown"
                aria-activedescendant={
                  isSearchDropdownOpen && activeDropdownIndex >= 0
                    ? `klarity-newtab-search-dropdown-opt-${activeDropdownIndex}`
                    : undefined
                }
                placeholder={`Search ${activeEngine.name} or enter web address...`}
                className={`no-focus-outline flex-1 bg-transparent border-0 outline-none ${
                  isCompactSearch ? 'text-[14px]' : 'text-[15px]'
                } text-inherit placeholder:opacity-65 min-w-0 px-2 py-0.5 leading-normal rounded-full`}
                style={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveDropdownIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-full opacity-70 hover:opacity-100 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className={`${
                  isCompactSearch ? 'px-4 py-1.5' : 'px-5 py-2'
                } rounded-full bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-sm`}
              >
                Search
              </button>
            </div>

            <BrowserSearchDropdown
              id="klarity-newtab-search-dropdown"
              isOpen={isSearchDropdownOpen}
              flatItems={dropdownFlatItems}
              recentMatches={recentMatches}
              historyMatches={historyMatches}
              activeIndex={activeDropdownIndex}
              onHighlight={setActiveDropdownIndex}
              onSelectSearch={handleSelectDropdownSearch}
              onFillSearch={handleFillDropdownSearch}
              onRemoveRecentSearch={(id) => {
                deleteRecentSearchItem(id);
                setActiveDropdownIndex(-1);
              }}
              onClearRecentSearches={() => {
                clearRecentSearches();
                setActiveDropdownIndex(-1);
              }}
              onSelectHistory={handleSelectDropdownHistory}
              roundedClass="rounded-2xl"
            />
          </form>
        )}

        {/* Widgets Area: Centered Stack OR Dashboard Grid */}
        <div
          className={`w-full ${
            isDashboardLayout && prefs.showQuickLinks !== false && financeGlanceSummary
              ? `grid grid-cols-1 lg:grid-cols-3 ${isCompactDensity ? 'gap-4' : 'gap-6'} items-start`
              : `flex flex-col items-center ${isCompactDensity ? 'gap-4' : 'gap-6'}`
          }`}
        >
          {/* Speed Dial / Quick Links Grid */}
          {prefs.showQuickLinks !== false && (
            <div
              className={`w-full ${
                isDashboardLayout && financeGlanceSummary
                  ? 'lg:col-span-2'
                  : isDashboardLayout
                    ? 'max-w-4xl'
                    : 'max-w-2xl'
              }`}
            >
              {prefs.quickLinksSource === 'top_visited' && (
                <div className={`text-[11px] font-semibold uppercase tracking-wider mb-2 ${clockSecondaryClass}`}>
                  Top Visited Sites
                </div>
              )}
              <div className={`grid ${quickLinksGridColsClass} ${isCompactDensity ? 'gap-2' : 'gap-3'}`}>
                {displayedQuickLinks.map((item) => {
                  const isGroup = item.type === 'group';
                  const isDropTarget = dropTargetId === item.id && draggedTileId !== item.id;
                  const isTopVisitedMode = prefs.quickLinksSource === 'top_visited';

                  if (isGroup) {
                    const previewItems = (item.items || []).slice(0, 4);
                    return (
                      <div
                        key={item.id}
                        draggable={false}
                        title={item.name}
                        onDragOver={(e) => {
                          if (draggedTileId && draggedTileId !== item.id) {
                            e.preventDefault();
                            setDropTargetId(item.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dropTargetId === item.id) setDropTargetId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnTile(item);
                        }}
                        onClick={() => {
                          setOpenGroupId(item.id);
                          setIsEditingOpenGroupName(false);
                          setOpenGroupNameDraft(item.name || '');
                        }}
                        onContextMenu={(e) => openTileMenuAt(e, item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setOpenGroupId(item.id);
                            setIsEditingOpenGroupName(false);
                            setOpenGroupNameDraft(item.name || '');
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-center ${
                          isIconOnlyTiles
                            ? 'p-2.5 gap-1 rounded-xl'
                            : isCompactDensity
                              ? 'p-3 gap-2 rounded-xl'
                              : 'p-4 gap-2.5 rounded-2xl'
                        } border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                          isDropTarget
                            ? 'bg-[var(--brand-soft)] border-[var(--brand)] scale-[1.03]'
                            : `${cardSurfaceClass} hover:border-[var(--brand)]/50`
                        }`}
                      >
                        {!isTopVisitedMode && (
                          <button
                            type="button"
                            onClick={(e) => openTileMenuAt(e, item)}
                            aria-label={`Options for ${item.name}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-1.5 right-1.5 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] p-1 grid grid-cols-2 gap-0.5 place-items-center">
                          {previewItems.map((sub) => (
                            <ShortcutIcon key={sub.id} name={sub.name} url={sub.url} size="sm" />
                          ))}
                        </div>

                        {!isIconOnlyTiles && (
                          <div className="w-full text-center">
                            <div className="text-xs font-medium truncate">{item.name}</div>
                            <div className={`text-[10px] ${cardMutedTextClass}`}>
                              {(item.items || []).length} sites
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      draggable={!isTopVisitedMode}
                      title={item.name}
                      onDragStart={(e) => {
                        if (isTopVisitedMode) return;
                        setDraggedTileId(item.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        if (!isTopVisitedMode && draggedTileId && draggedTileId !== item.id) {
                          e.preventDefault();
                          setDropTargetId(item.id);
                        }
                      }}
                      onDragLeave={() => {
                        if (dropTargetId === item.id) setDropTargetId(null);
                      }}
                      onDrop={(e) => {
                        if (isTopVisitedMode) return;
                        e.preventDefault();
                        handleDropOnTile(item);
                      }}
                      onDragEnd={() => {
                        setDraggedTileId(null);
                        setDropTargetId(null);
                      }}
                      onClick={() => onNavigate(item.url)}
                      onContextMenu={(e) => !isTopVisitedMode && openTileMenuAt(e, item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate(item.url);
                        }
                      }}
                      className={`group relative flex flex-col items-center justify-center ${
                        isIconOnlyTiles
                          ? 'p-2.5 gap-1 rounded-xl'
                          : isCompactDensity
                            ? 'p-3 gap-2 rounded-xl'
                            : 'p-4 gap-2.5 rounded-2xl'
                      } border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                        isDropTarget
                          ? 'bg-[var(--brand-soft)] border-[var(--brand)] scale-[1.03]'
                          : `${cardSurfaceClass} hover:border-[var(--brand)]/50`
                      }`}
                    >
                      {!isTopVisitedMode && (
                        <button
                          type="button"
                          onClick={(e) => openTileMenuAt(e, item)}
                          aria-label={`Options for ${item.name}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-1.5 right-1.5 p-1 rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ShortcutIcon name={item.name} url={item.url} />
                      {!isIconOnlyTiles && (
                        <span className="text-xs font-medium truncate w-full text-center">
                          {item.name}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Add Shortcut Tile (Custom Pinned mode) */}
                {prefs.quickLinksSource !== 'top_visited' && (
                  <button
                    type="button"
                    onClick={() => setShortcutModal({ mode: 'add', name: '', url: '' })}
                    title="Add Shortcut"
                    className={`flex flex-col items-center justify-center ${
                      isIconOnlyTiles
                        ? 'p-2.5 gap-1 rounded-xl'
                        : isCompactDensity
                          ? 'p-3 gap-2 rounded-xl'
                          : 'p-4 gap-2.5 rounded-2xl'
                    } border border-dashed border-[var(--line)] hover:border-[var(--brand)] bg-[var(--surface)]/65 hover:bg-[var(--surface)] transition-all cursor-pointer group`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] group-hover:bg-[var(--brand-soft)] border border-[var(--line)] group-hover:border-[var(--brand)]/40 flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    {!isIconOnlyTiles && (
                      <span className="text-xs font-medium text-[var(--muted)] group-hover:text-[var(--ink)]">
                        Add Shortcut
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optional Klarity Financial / Bills Glance Widget */}
          {financeGlanceSummary && (
            <div
              className={`w-full ${
                isDashboardLayout && prefs.showQuickLinks !== false
                  ? 'lg:col-span-1'
                  : 'max-w-2xl'
              } rounded-2xl border shadow-sm p-4 ${staticCardSurfaceClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold">Klarity Glance</div>
                    <div className={`text-[10px] ${cardMutedTextClass}`}>
                      {financeGlanceSummary.unpaidCount} upcoming bill{financeGlanceSummary.unpaidCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGlanceRevealed((prev) => !prev)}
                  title={isAmountHidden ? 'Show amounts' : 'Hide amounts'}
                  aria-label={isAmountHidden ? 'Show amounts' : 'Hide amounts'}
                  className={`p-1.5 rounded-lg border border-[var(--line)] hover:border-[var(--brand)]/50 cursor-pointer ${cardMutedTextClass}`}
                >
                  {isAmountHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <div className="rounded-xl p-2.5 bg-[var(--surface-subtle)]/70 border border-[var(--line)]">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${cardMutedTextClass}`}>
                    Available Cash
                  </div>
                  <div
                    className={`mt-1 text-base font-bold tabular-nums ${
                      isAmountHidden ? 'blur-[5px] select-none' : ''
                    }`}
                  >
                    {formatMoney(financeGlanceSummary.availableCash)}
                  </div>
                </div>
                <div className="rounded-xl p-2.5 bg-[var(--surface-subtle)]/70 border border-[var(--line)]">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider ${cardMutedTextClass}`}>
                    After Bills
                  </div>
                  <div
                    className={`mt-1 text-base font-bold tabular-nums ${
                      isAmountHidden ? 'blur-[5px] select-none' : ''
                    }`}
                  >
                    {formatMoney(financeGlanceSummary.projectedCash)}
                  </div>
                </div>
              </div>

              {financeGlanceSummary.upcomingBills.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                  <div className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${cardMutedTextClass}`}>
                    <Calendar className="w-3 h-3" />
                    <span>Next Upcoming Bills</span>
                  </div>
                  {financeGlanceSummary.upcomingBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between text-xs py-0.5 gap-2"
                    >
                      <span className="truncate font-medium">{bill.name}</span>
                      <span
                        className={`font-semibold tabular-nums shrink-0 ${
                          isAmountHidden ? 'blur-[5px] select-none' : ''
                        }`}
                      >
                        {formatMoney(bill.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Contents & Editor Modal */}
      {openGroup && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => {
            setOpenGroupId(null);
            setIsEditingOpenGroupName(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[var(--line)]">
              {isEditingOpenGroupName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveOpenGroupName();
                  }}
                  className="flex items-center gap-2 flex-1"
                >
                  <input
                    type="text"
                    value={openGroupNameDraft}
                    onChange={(e) => setOpenGroupNameDraft(e.target.value)}
                    autoFocus
                    className="flex-1 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--brand)] outline-none text-sm font-semibold text-[var(--ink)]"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white cursor-pointer"
                    title="Save group name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-[var(--brand)] shrink-0" />
                  <h3 className="text-sm font-semibold text-[var(--ink)] truncate">{openGroup.name}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGroupNameDraft(openGroup.name || '');
                      setIsEditingOpenGroupName(true);
                    }}
                    className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
                    title="Rename group"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleUngroup(openGroup.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] flex items-center gap-1 cursor-pointer"
                  title="Ungroup all shortcuts"
                >
                  <Ungroup className="w-3.5 h-3.5" />
                  <span>Ungroup</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroupId(null);
                    setIsEditingOpenGroupName(false);
                  }}
                  aria-label="Close group dialog"
                  className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {(openGroup.items || []).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => {
                    setOpenGroupId(null);
                    onNavigate(sub.url);
                  }}
                  onContextMenu={(e) => openTileMenuAt(e, sub, openGroup.id)}
                  role="button"
                  tabIndex={0}
                  className="group relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl bg-[var(--surface-subtle)]/80 hover:bg-[var(--surface-hover)] border border-[var(--line)] hover:border-[var(--brand)]/50 transition-all cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={(e) => openTileMenuAt(e, sub, openGroup.id)}
                    aria-label={`Options for ${sub.name}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-1.5 right-1.5 p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] transition-opacity cursor-pointer"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  <ShortcutIcon name={sub.name} url={sub.url} />
                  <span className="text-xs font-medium text-[var(--ink)] truncate w-full text-center">
                    {sub.name}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setShortcutModal({ mode: 'add', groupId: openGroup.id, name: '', url: '' })
                }
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl bg-[var(--surface-subtle)]/40 hover:bg-[var(--surface-hover)] border border-dashed border-[var(--line)] hover:border-[var(--brand)] transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] group-hover:bg-[var(--brand-soft)] border border-[var(--line)] group-hover:border-[var(--brand)]/40 flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--brand)]">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-[var(--muted)] group-hover:text-[var(--ink)]">
                  Add
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tile 3-Dot / Right-Click Action Menu */}
      {tileMenu && (
        <div
          ref={tileMenuRef}
          style={{ top: `${tileMenu.y}px`, left: `${tileMenu.x}px` }}
          className="fixed z-50 w-52 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-2xl py-1 text-xs text-[var(--ink)]"
        >
          {tileMenu.item.type === 'group' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  (tileMenu.item.items || []).forEach((sub) =>
                    onOpenNewTab(sub.url, sub.name)
                  );
                  setTileMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Open all in new tabs</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupModal({
                    mode: 'edit',
                    groupId: tileMenu.item.id,
                    name: tileMenu.item.name
                  });
                  setTileMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Rename group</span>
              </button>
              <button
                type="button"
                onClick={() => handleUngroup(tileMenu.item.id)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
              >
                <Ungroup className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Ungroup</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(tileMenu.item.id)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--danger-soft)] text-[var(--danger)] flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove group</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onOpenNewTab(tileMenu.item.url, tileMenu.item.name);
                  setTileMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Open in New Tab</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShortcutModal({
                    mode: 'edit',
                    id: tileMenu.item.id,
                    groupId: tileMenu.groupId || null,
                    name: tileMenu.item.name,
                    url: tileMenu.item.url
                  });
                  setTileMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Edit</span>
              </button>

              {tileMenu.groupId ? (
                <button
                  type="button"
                  onClick={() => handleRemoveFromGroup(tileMenu.item.id, tileMenu.groupId)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
                >
                  <Ungroup className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Move out of group</span>
                </button>
              ) : (
                <>
                  <div className="my-1 border-t border-[var(--line)]" />
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                    Add to group
                  </div>
                  {existingGroups.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleMoveLinkToGroup(tileMenu.item.id, grp.id)}
                      className="w-full px-3 py-1.5 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                      <span className="truncate">{grp.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setGroupModal({
                        mode: 'create',
                        sourceLinkId: tileMenu.item.id,
                        name: ''
                      });
                      setTileMenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-[var(--surface-hover)] flex items-center gap-2 cursor-pointer text-[var(--brand)]"
                  >
                    <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>New group...</span>
                  </button>
                  <div className="my-1 border-t border-[var(--line)]" />
                </>
              )}

              <button
                type="button"
                onClick={() => handleRemoveItem(tileMenu.item.id, tileMenu.groupId)}
                className="w-full px-3 py-2 text-left hover:bg-[var(--danger-soft)] text-[var(--danger)] flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Add / Edit Shortcut Modal */}
      {shortcutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                {shortcutModal.mode === 'edit' ? 'Edit Shortcut' : 'Add Shortcut'}
              </h3>
              <button
                type="button"
                onClick={() => setShortcutModal(null)}
                aria-label="Close shortcut modal"
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShortcut} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={shortcutModal.name}
                  onChange={(e) => setShortcutModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. GitHub"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={shortcutModal.url}
                  onChange={(e) => setShortcutModal((m) => ({ ...m, url: e.target.value }))}
                  placeholder="https://github.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShortcutModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {shortcutModal.mode === 'edit' ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Rename Group Modal */}
      {groupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                {groupModal.mode === 'edit' ? 'Rename Group' : 'Create Quick Tile Group'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModal(null)}
                aria-label="Close group modal"
                className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupModal.name}
                  onChange={(e) => setGroupModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. Finance, Social, Work"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer shadow-sm"
                >
                  {groupModal.mode === 'edit' ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
