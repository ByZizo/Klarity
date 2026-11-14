import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Edit2,
  ExternalLink,
  FolderOpen,
  FolderPlus,
  GripHorizontal,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
  Ungroup,
  X
} from 'lucide-react';
import {
  getSearchEngineById,
  loadNewTabNotes,
  loadNewTabPrefs,
  loadNewTabQuickLinks,
  saveNewTabNotes,
  saveNewTabPrefs,
  saveNewTabQuickLinks
} from '../utils/browserSettings';

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
      className={`${boxClass} bg-slate-800/90 border border-slate-700/70 flex items-center justify-center overflow-hidden shadow-sm shrink-0`}
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

export function NewTabPage({ searchEngineId, onNavigate, onOpenNewTab }) {
  const activeEngine = getSearchEngineById(searchEngineId);

  const [query, setQuery] = useState('');
  const [quickLinks, setQuickLinks] = useState(() => loadNewTabQuickLinks());
  const [prefs, setPrefs] = useState(() => loadNewTabPrefs());
  const [notes, setNotes] = useState(() => loadNewTabNotes());
  const [now, setNow] = useState(() => new Date());

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

  // Draggable Notes Box Position State
  const defaultNotesPos = { x: 48, y: 240 };
  const [notesPos, setNotesPos] = useState(() => {
    if (prefs?.notesPosition && typeof prefs.notesPosition.x === 'number' && typeof prefs.notesPosition.y === 'number') {
      return prefs.notesPosition;
    }
    return defaultNotesPos;
  });
  const [isDraggingNotes, setIsDraggingNotes] = useState(false);
  const notesCardRef = useRef(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, cardX: 0, cardY: 0 });

  const handleNotesDragStart = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

    e.preventDefault();
    setIsDraggingNotes(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const currentPos = notesPos || defaultNotesPos;
    dragStartRef.current = {
      pointerX: startX,
      pointerY: startY,
      cardX: currentPos.x,
      cardY: currentPos.y
    };

    let latestPos = currentPos;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.pointerX;
      const deltaY = moveEvent.clientY - dragStartRef.current.pointerY;

      const cardWidth = notesCardRef.current?.offsetWidth || 260;
      const minX = 16;
      const maxX = Math.max(minX, (window.innerWidth || 1200) - cardWidth - 16);
      const minY = 60;
      const maxY = Math.max(minY, (window.innerHeight || 800) + window.scrollY - 100);

      const boundedX = Math.round(Math.min(maxX, Math.max(minX, dragStartRef.current.cardX + deltaX)));
      const boundedY = Math.round(Math.min(maxY, Math.max(minY, dragStartRef.current.cardY + deltaY)));

      latestPos = { x: boundedX, y: boundedY };
      setNotesPos(latestPos);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingNotes(false);
      setPrefs((prev) => ({ ...prev, notesPosition: latestPos }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetNotesPos = () => {
    setNotesPos(defaultNotesPos);
    setPrefs((prev) => ({ ...prev, notesPosition: defaultNotesPos }));
  };

  useEffect(() => {
    saveNewTabQuickLinks(quickLinks);
  }, [quickLinks]);

  useEffect(() => {
    saveNewTabPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    saveNewTabNotes(notes);
  }, [notes]);

  useEffect(() => {
    if (!prefs.showClock) return undefined;
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, [prefs.showClock]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (customizeRef.current && !customizeRef.current.contains(e.target)) {
        setIsCustomizeOpen(false);
      }
      if (tileMenuRef.current && !tileMenuRef.current.contains(e.target)) {
        setTileMenu(null);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
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

  const timeString = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dateString = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const greeting = getGreeting(now.getHours());

  const hasWallpaper = prefs.backgroundStyle === 'wallpaper' && Boolean(prefs.wallpaperUrl?.trim());
  const backgroundClass =
    prefs.backgroundStyle === 'gradient'
      ? 'bg-[radial-gradient(ellipse_at_top,#1e293b_0%,#0f172a_58%,#020617_100%)]'
      : 'bg-[#0f172a]';

  return (
    <div
      className={`w-full h-full relative overflow-y-auto text-slate-100 select-none ${backgroundClass}`}
      style={
        hasWallpaper
          ? {
              backgroundImage: `url("${prefs.wallpaperUrl.trim()}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }
          : undefined
      }
    >
      {/* Subtle scrim when using a custom wallpaper */}
      {hasWallpaper && <div className="fixed inset-0 bg-slate-950/60 pointer-events-none" />}

      {/* Top-right Customize Page button & popover */}
      <div className="sticky top-0 z-20 flex justify-end p-4 pointer-events-none">
        <div className="relative pointer-events-auto" ref={customizeRef}>
          <button
            type="button"
            onClick={() => setIsCustomizeOpen((prev) => !prev)}
            title="Customize page"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e293b]/85 hover:bg-[#1e293b] border border-slate-700/70 hover:border-blue-500/50 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm backdrop-blur-md cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span>Customize</span>
          </button>

          {isCustomizeOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#1e293b] border border-slate-700/80 shadow-2xl p-4 text-xs z-30">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-slate-100 text-sm">Customize Page</span>
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-slate-200 font-medium">Quick Links (Speed Dial)</span>
                  <input
                    type="checkbox"
                    checked={prefs.showQuickLinks}
                    onChange={(e) => setPrefs((p) => ({ ...p, showQuickLinks: e.target.checked }))}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-slate-200 font-medium">Clock & Greeting</span>
                  <input
                    type="checkbox"
                    checked={prefs.showClock}
                    onChange={(e) => setPrefs((p) => ({ ...p, showClock: e.target.checked }))}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between py-1 cursor-pointer">
                  <span className="text-slate-200 font-medium">Quick Notes / Scratchpad</span>
                  <input
                    type="checkbox"
                    checked={prefs.showNotes}
                    onChange={(e) => setPrefs((p) => ({ ...p, showNotes: e.target.checked }))}
                    className="accent-blue-500 w-4 h-4 cursor-pointer"
                  />
                </label>

                {prefs.showNotes && (notesPos.x !== defaultNotesPos.x || notesPos.y !== defaultNotesPos.y) && (
                  <button
                    type="button"
                    onClick={handleResetNotesPos}
                    className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer py-0.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset notes position</span>
                  </button>
                )}
              </div>

              <div className="my-3 border-t border-slate-700/70" />

              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Background Style
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'slate', label: 'Slate' },
                    { id: 'gradient', label: 'Gradient' },
                    { id: 'wallpaper', label: 'Image' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, backgroundStyle: opt.id }))}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                        prefs.backgroundStyle === opt.id
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {prefs.backgroundStyle === 'wallpaper' && (
                  <input
                    type="url"
                    value={prefs.wallpaperUrl || ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, wallpaperUrl: e.target.value }))}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="mt-2.5 w-full px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 focus:border-blue-500 outline-none text-xs text-slate-100 placeholder-slate-500"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draggable Floating Quick Notes Card in the Left Open Space (User can drag anywhere on the canvas) */}
      {prefs.showNotes && (
        <aside
          ref={notesCardRef}
          aria-label="Quick Notes"
          style={{
            left: `${notesPos.x}px`,
            top: `${notesPos.y}px`
          }}
          className={`hidden md:flex flex-col absolute w-[260px] h-[420px] rounded-2xl bg-[#1e293b]/90 border border-slate-700/70 p-4 shadow-xl backdrop-blur-md z-20 select-none transition-shadow ${
            isDraggingNotes ? 'shadow-2xl ring-2 ring-blue-500/50 scale-[1.01]' : 'hover:border-slate-600'
          }`}
        >
          {/* Draggable Header Bar */}
          <div
            onMouseDown={handleNotesDragStart}
            title="Click and drag to move notes anywhere"
            className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60 cursor-grab active:cursor-grabbing group/header"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <GripHorizontal className="w-4 h-4 text-slate-500 group-hover/header:text-blue-400 transition-colors" />
              <StickyNote className="w-3.5 h-3.5 text-blue-400" />
              <span>Quick Notes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-medium select-none">Auto-saved</span>
              {(notesPos.x !== defaultNotesPos.x || notesPos.y !== defaultNotesPos.y) && (
                <button
                  type="button"
                  onClick={handleResetNotesPos}
                  title="Reset notes position"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Jot down quick notes, links, or reminders..."
            className="w-full flex-1 min-h-0 rounded-xl bg-slate-900/75 border border-slate-700/70 focus:border-blue-500 outline-none p-3 text-xs text-slate-100 placeholder-slate-500 resize-none leading-relaxed select-text"
          />
        </aside>
      )}

      {/* Main Centered Content Canvas */}
      <div className="relative z-10 mx-auto px-6 pt-8 pb-16 flex flex-col items-center max-w-3xl w-full">
        {/* Minimal Clock / Greeting */}
        {prefs.showClock && (
          <div className="text-center mb-7">
            <div className="text-5xl font-semibold tracking-tight text-slate-50 tabular-nums">
              {timeString}
            </div>
            <div className="mt-1.5 text-sm font-medium text-slate-400">
              {greeting} · {dateString}
            </div>
          </div>
        )}

        {/* Centered Pill Search Bar */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl mb-10">
          <div className="flex items-center gap-3 pl-5 pr-2.5 py-2.5 rounded-full bg-[#1e293b]/90 border border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25 shadow-xl backdrop-blur-md transition-all min-h-[52px]">
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeEngine.name} or enter web address...`}
              className="no-focus-outline flex-1 bg-transparent border-0 outline-none text-[15px] text-slate-100 placeholder-slate-400 min-w-0 px-2.5 py-1 leading-normal rounded-full"
              style={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Strictly Centered Speed Dial / Quick Links Grid */}
        {prefs.showQuickLinks && (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {quickLinks.map((item) => {
                    const isGroup = item.type === 'group';
                    const isDropTarget = dropTargetId === item.id && draggedTileId !== item.id;

                    if (isGroup) {
                      const previewItems = (item.items || []).slice(0, 4);
                      return (
                        <div
                          key={item.id}
                          draggable={false}
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
                          className={`group relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm ${
                            isDropTarget
                              ? 'bg-blue-600/20 border-blue-400 scale-[1.03]'
                              : 'bg-[#1e293b]/85 hover:bg-[#1e293b] border-slate-700/70 hover:border-blue-500/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={(e) => openTileMenuAt(e, item)}
                            aria-label={`Options for ${item.name}`}
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-opacity cursor-pointer"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* 2x2 Mini-Grid Group Icon */}
                          <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700/80 p-1 grid grid-cols-2 gap-0.5 place-items-center">
                            {previewItems.map((sub) => (
                              <ShortcutIcon key={sub.id} name={sub.name} url={sub.url} size="sm" />
                            ))}
                          </div>

                          <div className="w-full text-center">
                            <div className="text-xs font-medium text-slate-100 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {(item.items || []).length} sites
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedTileId(item.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
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
                        onDragEnd={() => {
                          setDraggedTileId(null);
                          setDropTargetId(null);
                        }}
                        onClick={() => onNavigate(item.url)}
                        onContextMenu={(e) => openTileMenuAt(e, item)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onNavigate(item.url);
                          }
                        }}
                        className={`group relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm ${
                          isDropTarget
                            ? 'bg-blue-600/20 border-blue-400 scale-[1.03]'
                            : 'bg-[#1e293b]/80 hover:bg-[#1e293b] border-slate-700/60 hover:border-blue-500/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => openTileMenuAt(e, item)}
                          aria-label={`Options for ${item.name}`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-opacity cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        <ShortcutIcon name={item.name} url={item.url} />
                        <span className="text-xs font-medium text-slate-200 truncate w-full text-center">
                          {item.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* Add Shortcut Tile */}
                  <button
                    type="button"
                    onClick={() => setShortcutModal({ mode: 'add', name: '', url: '' })}
                    className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#1e293b]/45 hover:bg-[#1e293b]/85 border border-dashed border-slate-700/80 hover:border-blue-500/60 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 group-hover:bg-blue-600/20 border border-slate-700/70 group-hover:border-blue-500/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">
                      Add Shortcut
                    </span>
                  </button>
                </div>
              </div>
            )}

        {/* Mobile Quick Notes Card fallback (below speed dial on narrow viewports) */}
        {prefs.showNotes && (
          <div className="md:hidden w-full max-w-md mt-6 rounded-2xl bg-[#1e293b]/90 border border-slate-700/70 p-4 shadow-xl backdrop-blur-md flex flex-col h-[220px]">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <StickyNote className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Notes</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Auto-saved</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down quick notes, links, or reminders..."
              className="w-full flex-1 min-h-0 rounded-xl bg-slate-900/75 border border-slate-700/70 focus:border-blue-500 outline-none p-3 text-xs text-slate-100 placeholder-slate-500 resize-none leading-relaxed"
            />
          </div>
        )}
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
            className="w-full max-w-lg rounded-2xl bg-[#1e293b] border border-slate-700 shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/70">
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
                    className="flex-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-blue-500 outline-none text-sm font-semibold text-slate-100"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                    title="Save group name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-100 truncate">{openGroup.name}</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGroupNameDraft(openGroup.name || '');
                      setIsEditingOpenGroupName(true);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
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
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-700/70 flex items-center gap-1 cursor-pointer"
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
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
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
                  className="group relative flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/50 transition-all cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={(e) => openTileMenuAt(e, sub, openGroup.id)}
                    aria-label={`Options for ${sub.name}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-1.5 right-1.5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-opacity cursor-pointer"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                  <ShortcutIcon name={sub.name} url={sub.url} />
                  <span className="text-xs font-medium text-slate-200 truncate w-full text-center">
                    {sub.name}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setShortcutModal({ mode: 'add', groupId: openGroup.id, name: '', url: '' })
                }
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900/35 hover:bg-slate-800/70 border border-dashed border-slate-700 hover:border-blue-500/60 transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 group-hover:bg-blue-600/20 border border-slate-700/70 flex items-center justify-center text-slate-400 group-hover:text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">
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
          className="fixed z-50 w-52 rounded-xl bg-[#1e293b] border border-slate-700 shadow-2xl py-1 text-xs text-slate-200"
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
                className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
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
                className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Rename group</span>
              </button>
              <button
                type="button"
                onClick={() => handleUngroup(tileMenu.item.id)}
                className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
              >
                <Ungroup className="w-3.5 h-3.5 text-slate-400" />
                <span>Ungroup</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveItem(tileMenu.item.id)}
                className="w-full px-3 py-2 text-left hover:bg-rose-950/50 text-rose-400 flex items-center gap-2 cursor-pointer"
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
                className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
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
                className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Edit</span>
              </button>

              {tileMenu.groupId ? (
                <button
                  type="button"
                  onClick={() => handleRemoveFromGroup(tileMenu.item.id, tileMenu.groupId)}
                  className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
                >
                  <Ungroup className="w-3.5 h-3.5 text-slate-400" />
                  <span>Move out of group</span>
                </button>
              ) : (
                <>
                  <div className="my-1 border-t border-slate-700/70" />
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Add to group
                  </div>
                  {existingGroups.map((grp) => (
                    <button
                      key={grp.id}
                      type="button"
                      onClick={() => handleMoveLinkToGroup(tileMenu.item.id, grp.id)}
                      className="w-full px-3 py-1.5 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
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
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer text-blue-400"
                  >
                    <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>New group...</span>
                  </button>
                  <div className="my-1 border-t border-slate-700/70" />
                </>
              )}

              <button
                type="button"
                onClick={() => handleRemoveItem(tileMenu.item.id, tileMenu.groupId)}
                className="w-full px-3 py-2 text-left hover:bg-rose-950/50 text-rose-400 flex items-center gap-2 cursor-pointer"
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
          <div className="w-full max-w-sm rounded-2xl bg-[#1e293b] border border-slate-700 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-100">
                {shortcutModal.mode === 'edit' ? 'Edit Shortcut' : 'Add Shortcut'}
              </h3>
              <button
                type="button"
                onClick={() => setShortcutModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveShortcut} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={shortcutModal.name}
                  onChange={(e) => setShortcutModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. GitHub"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 outline-none text-xs text-slate-100 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={shortcutModal.url}
                  onChange={(e) => setShortcutModal((m) => ({ ...m, url: e.target.value }))}
                  placeholder="https://github.com"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 outline-none text-xs text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShortcutModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs font-semibold cursor-pointer shadow-sm"
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
          <div className="w-full max-w-sm rounded-2xl bg-[#1e293b] border border-slate-700 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-100">
                {groupModal.mode === 'edit' ? 'Rename Group' : 'Create Quick Tile Group'}
              </h3>
              <button
                type="button"
                onClick={() => setGroupModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupModal} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupModal.name}
                  onChange={(e) => setGroupModal((m) => ({ ...m, name: e.target.value }))}
                  placeholder="e.g. Finance, Social, Work"
                  autoFocus
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 outline-none text-xs text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupModal(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700/60 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs font-semibold cursor-pointer shadow-sm"
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
