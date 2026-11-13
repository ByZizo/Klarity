import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit2,
  ExternalLink,
  MoreVertical,
  Plus,
  Search,
  SlidersHorizontal,
  StickyNote,
  Trash2,
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

function ShortcutIcon({ name, url }) {
  const [failed, setFailed] = useState(false);
  const host = useMemo(() => getHostname(url), [url]);
  const faviconUrl = host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64` : '';
  const initial = (name || host || 'K').trim().charAt(0).toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [faviconUrl]);

  if (!faviconUrl || failed) {
    return (
      <div
        className={`w-10 h-10 rounded-xl ${getBadgeColor(name || host)} text-white font-bold text-base flex items-center justify-center shadow-sm`}
      >
        {initial}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-xl bg-slate-800/90 border border-slate-700/70 flex items-center justify-center overflow-hidden shadow-sm">
      <img
        src={faviconUrl}
        alt={name}
        className="w-6 h-6 object-contain"
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

  // Add / Edit shortcut modal
  const [shortcutModal, setShortcutModal] = useState(null); // { mode: 'add' | 'edit', id?, name, url }

  // Tile action menu (three-dot or right-click)
  const [tileMenu, setTileMenu] = useState(null); // { link, x, y }
  const tileMenuRef = useRef(null);

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
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
          name: finalName,
          url: normalizedUrl
        }
      ]);
    }
    setShortcutModal(null);
  };

  const handleRemoveShortcut = (id) => {
    setQuickLinks((prev) => prev.filter((item) => item.id !== id));
    setTileMenu(null);
  };

  const openTileMenuAt = (e, link) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.type === 'contextmenu' ? e.clientX : Math.min(rect.right - 140, window.innerWidth - 180);
    const y = e.type === 'contextmenu' ? e.clientY : rect.bottom + 6;
    setTileMenu({
      link,
      x: Math.max(12, Math.min(x, window.innerWidth - 190)),
      y: Math.max(12, Math.min(y, window.innerHeight - 150))
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

      {/* Main Centered Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-8 pb-16 flex flex-col items-center">
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
        <form onSubmit={handleSearchSubmit} className="w-full max-w-xl mb-10">
          <div className="flex items-center gap-2.5 pl-4 pr-2 py-2 rounded-full bg-[#1e293b]/90 border border-slate-700/80 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25 shadow-xl backdrop-blur-md transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeEngine.name} or enter web address...`}
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-100 placeholder-slate-400 min-w-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/60 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 rounded-full bg-[#2563eb] hover:bg-[#3b82f6] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Speed Dial / Quick Links Grid */}
        {prefs.showQuickLinks && (
          <div className="w-full max-w-2xl mb-8">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {quickLinks.map((link) => (
                <div
                  key={link.id}
                  onClick={() => onNavigate(link.url)}
                  onContextMenu={(e) => openTileMenuAt(e, link)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate(link.url);
                    }
                  }}
                  className="group relative flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-[#1e293b]/80 hover:bg-[#1e293b] border border-slate-700/60 hover:border-blue-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md backdrop-blur-sm"
                >
                  <button
                    type="button"
                    onClick={(e) => openTileMenuAt(e, link)}
                    aria-label={`Options for ${link.name}`}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/80 transition-opacity cursor-pointer"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  <ShortcutIcon name={link.name} url={link.url} />
                  <span className="text-xs font-medium text-slate-200 truncate w-full text-center">
                    {link.name}
                  </span>
                </div>
              ))}

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

        {/* Quick Notes / Scratchpad Widget Card */}
        {prefs.showNotes && (
          <div className="w-full max-w-2xl rounded-2xl bg-[#1e293b]/85 border border-slate-700/70 p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <StickyNote className="w-3.5 h-3.5 text-blue-400" />
                <span>Quick Notes</span>
              </div>
              <span className="text-[11px] text-slate-400">Saved automatically</span>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Jot down quick notes, links, or reminders..."
              className="w-full rounded-xl bg-slate-900/70 border border-slate-700/70 focus:border-blue-500 outline-none p-3 text-xs text-slate-100 placeholder-slate-500 resize-y leading-relaxed"
            />
          </div>
        )}
      </div>

      {/* Tile 3-Dot / Right-Click Action Menu */}
      {tileMenu && (
        <div
          ref={tileMenuRef}
          style={{ top: `${tileMenu.y}px`, left: `${tileMenu.x}px` }}
          className="fixed z-40 w-44 rounded-xl bg-[#1e293b] border border-slate-700 shadow-2xl py-1 text-xs text-slate-200"
        >
          <button
            type="button"
            onClick={() => {
              onOpenNewTab(tileMenu.link.url, tileMenu.link.name);
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
                id: tileMenu.link.id,
                name: tileMenu.link.name,
                url: tileMenu.link.url
              });
              setTileMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => handleRemoveShortcut(tileMenu.link.id)}
            className="w-full px-3 py-2 text-left hover:bg-rose-950/50 text-rose-400 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
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
    </div>
  );
}
