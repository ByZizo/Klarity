import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Compass,
  Palette,
  Shield,
  Download,
  Cpu,
  RotateCcw,
  History,
  Bookmark,
  Folder,
  Trash2,
  Sparkles,
  Check
} from 'lucide-react';
import { Button, ConfirmDialog } from './ui';
import {
  SEARCH_ENGINES,
  DEFAULT_BROWSER_SETTINGS,
  clearBrowserSessionState
} from '../utils/browserSettings';

/**
 * Lightweight, accessible pill switch (no heavy blurs/animations for Chromebooks).
 */
function SettingSwitch({ id, checked, onChange, disabled = false, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'bg-[#1B4B91] border-[#1B4B91]'
          : 'bg-[var(--line)] border-[var(--line)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-5.5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/**
 * Grouped rounded setting card container with thin internal row dividers.
 */
function SettingGroupCard({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)] px-1">
          {title}
        </h4>
      )}
      <div className="rounded-[14px] bg-[var(--surface-subtle)] border border-[var(--line)] divide-y divide-[var(--line)] overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * Standard setting row: label + optional subtext on left, control on right.
 */
function SettingRow({ label, description, htmlFor, children, vertical = false }) {
  return (
    <div
      className={`px-4 py-3.5 ${
        vertical
          ? 'flex flex-col gap-3'
          : 'flex flex-wrap sm:flex-nowrap items-center justify-between gap-3'
      }`}
    >
      <label
        htmlFor={htmlFor}
        className={`min-w-0 flex-1 ${htmlFor ? 'cursor-pointer' : ''}`}
      >
        <div className="text-[14px] font-medium text-[var(--ink)] leading-snug">
          {label}
        </div>
        {description && (
          <div className="text-[12px] text-[var(--muted)] mt-0.5 leading-relaxed">
            {description}
          </div>
        )}
      </label>
      <div className={vertical ? 'w-full' : 'shrink-0 flex items-center gap-2'}>
        {children}
      </div>
    </div>
  );
}

const NAV_CATEGORIES = [
  {
    id: 'startup',
    label: 'Startup & Navigation',
    icon: Compass,
    keywords: 'startup home button bookmarks bar new tab continue pages url'
  },
  {
    id: 'search',
    label: 'Address Bar & Search',
    icon: Search,
    keywords: 'search engine duckduckgo google bing brave recent searches suggestions autocomplete ai reader'
  },
  {
    id: 'appearance',
    label: 'Appearance & Layout',
    icon: Palette,
    keywords: 'theme light dark system zoom font scale layout size'
  },
  {
    id: 'privacy',
    label: 'Privacy & History',
    icon: Shield,
    dividerBefore: true,
    keywords: 'history clear browsing data cookies do not track ad blocker tracker youtube sponsorblock dearrow'
  },
  {
    id: 'downloads',
    label: 'Downloads',
    icon: Download,
    keywords: 'downloads folder location ask save file'
  },
  {
    id: 'performance',
    label: 'Performance & System',
    icon: Cpu,
    dividerBefore: true,
    keywords: 'performance low power chromebook memory ram motion visual effects speed'
  },
  {
    id: 'reset',
    label: 'Reset & About',
    icon: RotateCcw,
    dividerBefore: true,
    keywords: 'reset defaults about version klarity browser'
  }
];

export default function BrowserSettingsPanel({
  browserOnly = false,
  onClose,
  browserSettings = DEFAULT_BROWSER_SETTINGS,
  onUpdateBrowserSettings,
  browserBookmarks = [],
  onUpdateBrowserBookmarks,
  onOpenBrowserHistory,
  historyCount = 0,
  recentSearchCount = 0,
  onRequestClearHistory,
  onClearRecentSearches,
  onRequestClearBrowserData,
  isClearingBrowserData = false,
  browserAdBlockStats = { enabled: true, adsBlockedCount: 0 },
  onUpdateAdBlockStats,
  electronBrowserPrefs = {},
  updateDesktopBrowserPrefs,
  activeThemeMode = 'system',
  onThemeChange,
  uiFontScale = '100',
  onSetFontScale,
  uiReduceMotion = false,
  onToggleReduceMotion,
  uiPerformanceMode = 'auto',
  onSetPerformanceMode,
  isLowPowerMode = false,
  deviceCapabilities = null,
  desktopAppInfo = {},
  formatVersionString,
  onShowToast
}) {
  const [activeCategory, setActiveCategory] = useState('startup');
  const [searchQuery, setSearchQuery] = useState('');
  const [newStartupPageInput, setNewStartupPageInput] = useState('');
  const [confirmResetDefaults, setConfirmResetDefaults] = useState(false);

  const patchSettings = (patch) => {
    if (onUpdateBrowserSettings) {
      onUpdateBrowserSettings({ ...browserSettings, ...patch });
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) return NAV_CATEGORIES;
    return NAV_CATEGORIES.filter(
      (cat) =>
        cat.label.toLowerCase().includes(normalizedQuery) ||
        cat.keywords.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  const effectiveCategory = useMemo(() => {
    if (visibleCategories.some((c) => c.id === activeCategory)) {
      return activeCategory;
    }
    return visibleCategories[0]?.id || 'startup';
  }, [activeCategory, visibleCategories]);

  const activeCategoryObj = NAV_CATEGORIES.find((c) => c.id === effectiveCategory) || NAV_CATEGORIES[0];

  const handleConfirmResetBrowserDefaults = () => {
    setConfirmResetDefaults(false);
    const defaults = { ...DEFAULT_BROWSER_SETTINGS };
    if (onUpdateBrowserSettings) {
      onUpdateBrowserSettings(defaults);
    }
    if (updateDesktopBrowserPrefs) {
      updateDesktopBrowserPrefs({
        doNotTrack: defaults.doNotTrack,
        cookiePolicy: defaults.cookiePolicy,
        askWhereToSave: defaults.askWhereToSave
      });
    }
    clearBrowserSessionState();
    onShowToast?.('Browser settings restored to defaults', 'success');
  };

  const renderCategoryContent = (catId) => {
    if (catId === 'startup') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="On Startup">
            <div className="px-4 py-3.5 flex flex-col gap-2.5">
              {[
                {
                  id: 'new_tab',
                  label: 'Open the New Tab page',
                  desc: 'Start with a clean Klarity New Tab dashboard.'
                },
                {
                  id: 'continue',
                  label: 'Continue where you left off',
                  desc: 'Restore tabs and groups from your previous session.'
                },
                {
                  id: 'specific_pages',
                  label: 'Open a specific page or set of pages',
                  desc: 'Launch custom URLs automatically when opening the browser.'
                }
              ].map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-start gap-3 py-1 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="browserStartupModeV2"
                    checked={(browserSettings?.startupMode || 'new_tab') === opt.id}
                    onChange={() => patchSettings({ startupMode: opt.id })}
                    className="mt-1 accent-[#1B4B91] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--ink)]">{opt.label}</div>
                    <div className="text-[12px] text-[var(--muted)]">{opt.desc}</div>
                  </div>
                </label>
              ))}

              {browserSettings?.startupMode === 'specific_pages' && (
                <div className="pl-7 pt-1 flex flex-col gap-2">
                  {(browserSettings?.startupPages || []).map((pageUrl, idx) => (
                    <div
                      key={`${pageUrl}-${idx}`}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-[8px] bg-[var(--surface)] border border-[var(--line)]"
                    >
                      <span className="text-[13px] font-medium text-[var(--ink)] truncate">{pageUrl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPages = (browserSettings?.startupPages || []).filter((_, i) => i !== idx);
                          patchSettings({ startupPages: nextPages });
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
                      if (!raw) return;
                      const clean = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                      patchSettings({ startupPages: [...(browserSettings?.startupPages || []), clean] });
                      setNewStartupPageInput('');
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={newStartupPageInput}
                      onChange={(e) => setNewStartupPageInput(e.target.value)}
                      placeholder="Add URL (e.g. https://finance.yahoo.com)"
                      className="flex-1 min-w-0 bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
                    />
                    <Button type="submit" size="sm" variant="secondary">
                      Add
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </SettingGroupCard>

          <SettingGroupCard title="Toolbar & Navigation">
            <SettingRow
              htmlFor="bs-show-home"
              label="Show Home button"
              description="Display a quick Home button next to the address bar."
            >
              <SettingSwitch
                id="bs-show-home"
                label="Show Home button"
                checked={browserSettings?.showHomeButton !== false}
                onChange={(val) => patchSettings({ showHomeButton: val })}
              />
            </SettingRow>
            <SettingRow
              htmlFor="bs-show-bookmarks"
              label="Show Bookmarks bar"
              description={`Pin saved bookmarks below the address bar (${browserBookmarks.length} saved).`}
            >
              <SettingSwitch
                id="bs-show-bookmarks"
                label="Show Bookmarks bar"
                checked={browserSettings?.showBookmarksBar !== false}
                onChange={(val) => patchSettings({ showBookmarksBar: val })}
              />
            </SettingRow>
          </SettingGroupCard>

          <SettingGroupCard title="Saved Bookmarks">
            <SettingRow
              label={`Bookmarks (${browserBookmarks.length})`}
              description={
                browserBookmarks.length > 0
                  ? 'Manage or remove saved browser bookmarks and folders.'
                  : 'No bookmarks saved yet. Star any page in the address bar to add one.'
              }
              vertical={browserBookmarks.length > 0}
            >
              {browserBookmarks.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                    {browserBookmarks.map((item) => {
                      const parentFolder = item.folderId
                        ? browserBookmarks.find((f) => f.id === item.folderId)
                        : null;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] border border-[var(--line)] bg-[var(--surface)]"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {item.type === 'folder' ? (
                              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                            ) : (
                              <Bookmark className="w-4 h-4 text-[#1B4B91] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-[var(--ink)] truncate">
                                {item.title}
                                {parentFolder && (
                                  <span className="ml-1.5 text-[11px] text-[var(--muted)]">
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
                              onUpdateBrowserBookmarks?.(
                                browserBookmarks.filter((b) => b.id !== item.id && b.folderId !== item.id)
                              );
                            }}
                            className="p-1.5 rounded-[6px] text-[var(--muted)] hover:text-rose-600 cursor-pointer"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        onUpdateBrowserBookmarks?.([]);
                        onShowToast?.('All bookmarks cleared', 'success');
                      }}
                    >
                      Clear all bookmarks
                    </Button>
                  </div>
                </div>
              )}
            </SettingRow>
          </SettingGroupCard>
        </div>
      );
    }

    if (catId === 'search') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="Default Search Engine">
            <SettingRow
              htmlFor="bs-search-engine"
              label="Search engine used in the address bar"
              description="Applies to address bar searches and the New Tab search box."
            >
              <select
                id="bs-search-engine"
                value={browserSettings?.searchEngine || 'duckduckgo'}
                onChange={(e) =>
                  patchSettings({ searchEngine: e.target.value, homepageMode: 'search_engine' })
                }
                className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer min-w-[165px]"
              >
                {SEARCH_ENGINES.map((engine) => (
                  <option key={engine.id} value={engine.id}>
                    {engine.name}
                  </option>
                ))}
              </select>
            </SettingRow>
          </SettingGroupCard>

          <SettingGroupCard title="Search Suggestions & Recent Searches">
            <SettingRow
              htmlFor="bs-recent-searches"
              label="Show recent searches in search box"
              description={
                browserSettings?.recentSearchesEnabled !== false
                  ? recentSearchCount > 0
                    ? `${recentSearchCount} recent ${recentSearchCount === 1 ? 'query' : 'queries'} available in search autocomplete`
                    : 'Recent queries appear as quick suggestions when focusing the search bar'
                  : 'Off — recent searches are hidden and new queries are not saved'
              }
            >
              <SettingSwitch
                id="bs-recent-searches"
                label="Show recent searches in search box"
                checked={browserSettings?.recentSearchesEnabled !== false}
                onChange={(val) => patchSettings({ recentSearchesEnabled: val })}
              />
            </SettingRow>
            <SettingRow
              label="Clear recent searches"
              description={
                recentSearchCount > 0
                  ? `Remove all ${recentSearchCount} stored search ${recentSearchCount === 1 ? 'term' : 'terms'} immediately.`
                  : 'No recent search terms stored.'
              }
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={recentSearchCount === 0}
                onClick={() => onClearRecentSearches?.()}
              >
                Clear searches
              </Button>
            </SettingRow>
          </SettingGroupCard>

          <SettingGroupCard title="Klarity AI Integration">
            <SettingRow
              htmlFor="bs-ai-reader"
              label="Allow AI Advisor to read active webpage"
              description="Lets Klarity's AI summarize or answer questions about the page you are viewing."
            >
              <SettingSwitch
                id="bs-ai-reader"
                label="Allow AI Advisor to read active webpage"
                checked={browserSettings?.aiPageReaderEnabled !== false}
                onChange={(val) => patchSettings({ aiPageReaderEnabled: val })}
              />
            </SettingRow>
          </SettingGroupCard>
        </div>
      );
    }

    if (catId === 'appearance') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="Theme & Readability">
            <SettingRow
              htmlFor="bs-theme-mode"
              label="Theme mode"
              description="Syncs across Klarity's browser chrome, New Tab page, and app workspace."
            >
              <select
                id="bs-theme-mode"
                value={activeThemeMode}
                onChange={(e) => onThemeChange?.(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer min-w-[130px]"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </SettingRow>
            <SettingRow
              htmlFor="bs-page-zoom"
              label="Default webpage zoom"
              description="Default magnification level applied to websites inside the browser."
            >
              <select
                id="bs-page-zoom"
                value={String(browserSettings?.pageZoom || 100)}
                onChange={(e) => patchSettings({ pageZoom: Number(e.target.value) })}
                className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer min-w-[110px]"
              >
                {[75, 80, 90, 100, 110, 125, 150, 175, 200].map((z) => (
                  <option key={z} value={String(z)}>
                    {z}%
                  </option>
                ))}
              </select>
            </SettingRow>
            {onSetFontScale && (
              <SettingRow
                htmlFor="bs-ui-scale"
                label="Interface text & UI scale"
                description="Adjust overall Klarity UI scaling for comfortable reading."
              >
                <select
                  id="bs-ui-scale"
                  value={String(uiFontScale || '100')}
                  onChange={(e) => onSetFontScale(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer min-w-[110px]"
                >
                  {['85', '90', '100', '110', '125', '150'].map((s) => (
                    <option key={s} value={s}>
                      {s}%
                    </option>
                  ))}
                </select>
              </SettingRow>
            )}
          </SettingGroupCard>
        </div>
      );
    }

    if (catId === 'privacy') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="Browser History">
            <SettingRow
              htmlFor="bs-history-toggle"
              label="Save browser history"
              description={
                browserSettings?.historyEnabled !== false
                  ? historyCount > 0
                    ? `${historyCount} visited ${historyCount === 1 ? 'page' : 'pages'} stored locally on this device`
                    : 'Visited pages are recorded locally and never synced externally'
                  : 'Paused — new page visits will not be recorded'
              }
            >
              <SettingSwitch
                id="bs-history-toggle"
                label="Save browser history"
                checked={browserSettings?.historyEnabled !== false}
                onChange={(val) => patchSettings({ historyEnabled: val })}
              />
            </SettingRow>
            <SettingRow
              label="Manage browsing history"
              description="Search, inspect, or remove individual history entries."
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={!onOpenBrowserHistory}
                onClick={() => onOpenBrowserHistory?.()}
              >
                <History className="w-3.5 h-3.5" />
                <span>View History</span>
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={historyCount === 0}
                onClick={() => onRequestClearHistory?.()}
              >
                Clear History
              </Button>
            </SettingRow>
          </SettingGroupCard>

          <SettingGroupCard title="Trackers, Ads & Media Shields">
            <SettingRow
              label="Ad & tracker blocker"
              description={`${browserAdBlockStats.adsBlockedCount || 0} requests blocked this session`}
            >
              <SettingSwitch
                label="Ad and tracker blocker"
                checked={Boolean(browserAdBlockStats.enabled)}
                onChange={async (val) => {
                  if (window.klarityDesktop?.toggleAdBlock) {
                    const next = await window.klarityDesktop.toggleAdBlock(val);
                    if (next) onUpdateAdBlockStats?.(next);
                  } else {
                    patchSettings({ adBlockerEnabled: val });
                    onUpdateAdBlockStats?.({ ...browserAdBlockStats, enabled: val });
                  }
                }}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (window.klarityDesktop?.resetAdBlockCount) {
                    const next = await window.klarityDesktop.resetAdBlockCount();
                    if (next) onUpdateAdBlockStats?.(next);
                  } else {
                    onUpdateAdBlockStats?.({ ...browserAdBlockStats, adsBlockedCount: 0 });
                  }
                }}
              >
                Reset
              </Button>
            </SettingRow>
            <SettingRow
              htmlFor="bs-yt-shield"
              label="YouTube video ad shield"
              description="Blocks pre-roll and mid-roll ad interruptions on YouTube."
            >
              <SettingSwitch
                id="bs-yt-shield"
                label="YouTube video ad shield"
                checked={browserSettings?.youtubeAdShield !== false}
                onChange={(val) => patchSettings({ youtubeAdShield: val })}
              />
            </SettingRow>
            <SettingRow
              htmlFor="bs-sponsorblock"
              label="Skip sponsor segments (SponsorBlock)"
              description="Automatically skips sponsored segments in supported videos."
            >
              <SettingSwitch
                id="bs-sponsorblock"
                label="Skip sponsor segments"
                checked={browserSettings?.sponsorBlockEnabled !== false}
                onChange={(val) => patchSettings({ sponsorBlockEnabled: val })}
              />
            </SettingRow>
            <SettingRow
              htmlFor="bs-dearrow"
              label="Clean video titles (DeArrow)"
              description="Replaces clickbait video titles with concise community titles."
            >
              <SettingSwitch
                id="bs-dearrow"
                label="Clean video titles"
                checked={browserSettings?.dearrowEnabled !== false}
                onChange={(val) => patchSettings({ dearrowEnabled: val })}
              />
            </SettingRow>
          </SettingGroupCard>

          <SettingGroupCard title="Cookies & Site Data">
            <SettingRow
              htmlFor="bs-dnt"
              label='Send a "Do Not Track" request'
              description="Includes the DNT privacy header with outgoing browser traffic."
            >
              <SettingSwitch
                id="bs-dnt"
                label="Send Do Not Track request"
                checked={Boolean(electronBrowserPrefs.doNotTrack)}
                onChange={(val) => updateDesktopBrowserPrefs?.({ doNotTrack: val })}
              />
            </SettingRow>
            <SettingRow
              htmlFor="bs-cookies"
              label="Cookies policy"
              description="Control how websites store session and third-party cookies."
            >
              <select
                id="bs-cookies"
                value={electronBrowserPrefs.cookiePolicy || 'allow'}
                onChange={(e) => updateDesktopBrowserPrefs?.({ cookiePolicy: e.target.value })}
                className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
              >
                <option value="allow">Allow all cookies</option>
                <option value="block_third_party">Block third-party cookies</option>
                <option value="block_all">Block all cookies</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Clear all browsing data"
              description="Clears history, recent searches, cached site files, cookies, and saved session tabs."
            >
              <Button
                size="sm"
                variant="danger"
                disabled={isClearingBrowserData}
                onClick={() => onRequestClearBrowserData?.()}
              >
                {isClearingBrowserData ? 'Clearing...' : 'Clear data'}
              </Button>
            </SettingRow>
          </SettingGroupCard>
        </div>
      );
    }

    if (catId === 'downloads') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="Downloads">
            <SettingRow
              label="Download location"
              description={electronBrowserPrefs.downloadPath || 'Default system Downloads folder'}
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (window.klarityDesktop?.selectBrowserDownloadDir) {
                    const res = await window.klarityDesktop.selectBrowserDownloadDir();
                    if (res && !res.canceled && res.downloadPath) {
                      updateDesktopBrowserPrefs?.({ downloadPath: res.downloadPath });
                    }
                  } else {
                    onShowToast?.('Custom download folders are managed by your browser in web mode.', 'info');
                  }
                }}
              >
                Change
              </Button>
            </SettingRow>
            <SettingRow
              htmlFor="bs-ask-save"
              label="Ask where to save each file before downloading"
              description="Prompt for a destination folder instead of saving automatically."
            >
              <SettingSwitch
                id="bs-ask-save"
                label="Ask where to save each file"
                checked={Boolean(electronBrowserPrefs.askWhereToSave)}
                onChange={(val) => updateDesktopBrowserPrefs?.({ askWhereToSave: val })}
              />
            </SettingRow>
          </SettingGroupCard>
        </div>
      );
    }

    if (catId === 'performance') {
      return (
        <div className="flex flex-col gap-5">
          <SettingGroupCard title="Resource & Older-Device Optimization">
            <SettingRow
              htmlFor="bs-perf-mode"
              label="Performance profile"
              description={
                isLowPowerMode
                  ? 'Low-power mode active — reduces heavy blurs, shadows, and background overhead for Chromebooks & older laptops.'
                  : 'Automatically tunes rendering and memory usage for your hardware.'
              }
            >
              <select
                id="bs-perf-mode"
                value={uiPerformanceMode || 'auto'}
                onChange={(e) => onSetPerformanceMode?.(e.target.value)}
                className="bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
              >
                <option value="auto">Auto (Recommended)</option>
                <option value="standard">Standard</option>
                <option value="low-power">Low-Power / Chromebook</option>
              </select>
            </SettingRow>
            <SettingRow
              htmlFor="bs-reduce-motion"
              label="Reduce visual effects & animations"
              description="Minimizes transitions and animations for snappier responsiveness."
            >
              <SettingSwitch
                id="bs-reduce-motion"
                label="Reduce visual effects and animations"
                checked={Boolean(uiReduceMotion)}
                onChange={() => onToggleReduceMotion?.()}
              />
            </SettingRow>
          </SettingGroupCard>

          {deviceCapabilities && (
            <SettingGroupCard title="Detected Hardware">
              <SettingRow
                label="Device profile"
                description={`CPU cores: ${deviceCapabilities.hardwareConcurrency || '—'} • Memory: ${
                  deviceCapabilities.deviceMemoryGB ? `${deviceCapabilities.deviceMemoryGB} GB` : 'Standard'
                }`}
              >
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)]">
                  {isLowPowerMode ? 'Low-Power Active' : 'Standard'}
                </span>
              </SettingRow>
            </SettingGroupCard>
          )}
        </div>
      );
    }

    // Reset & About
    const versionStr =
      typeof formatVersionString === 'function'
        ? formatVersionString(desktopAppInfo?.version || '3.12.61')
        : desktopAppInfo?.version || '3.12.61';

    return (
      <div className="flex flex-col gap-5">
        <SettingGroupCard title="Reset Browser Settings">
          <SettingRow
            label="Restore settings to their original defaults"
            description="Resets startup pages, search engine, zoom, shields, and toolbar preferences without deleting your financial data or Vault."
          >
            <Button
              size="sm"
              variant="danger"
              onClick={() => setConfirmResetDefaults(true)}
            >
              Reset settings
            </Button>
          </SettingRow>
        </SettingGroupCard>

        <SettingGroupCard title="About Klarity Browser">
          <SettingRow
            label="Klarity Integrated Browser"
            description="Privacy-first, local-storage browsing built into Klarity Finance."
          >
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] tabular-nums">
              v{String(versionStr).replace(/^v/i, '')}
            </span>
          </SettingRow>
          <SettingRow
            label="Runtime environment"
            description={
              desktopAppInfo?.isDesktopApp
                ? 'Klarity Desktop Engine (Electron + Native Shields)'
                : 'Klarity Web Workspace'
            }
          >
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" />
              Active
            </span>
          </SettingRow>
        </SettingGroupCard>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col md:flex-row w-full ${
        browserOnly ? 'h-full min-h-0' : 'rounded-[14px] border border-[var(--line)] overflow-hidden min-h-[540px]'
      } bg-[var(--surface)] text-[var(--ink)]`}
    >
      {/* Left Navigation Sidebar with Search Filter */}
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col">
        <div className="p-4 pb-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
              {browserOnly ? 'Settings' : 'Browser Settings'}
            </h3>
            {browserOnly && onClose && (
              <button
                type="button"
                aria-label="Close browser settings"
                onClick={onClose}
                className="md:hidden p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings"
              aria-label="Search browser settings"
              className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-full pl-8 pr-7 py-1.5 text-[13px] text-[var(--ink)] placeholder-[var(--muted)] outline-none focus:border-[#1B4B91]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation List */}
        <nav
          aria-label="Browser settings categories"
          className="flex md:flex-col gap-1 px-2.5 pb-3 overflow-x-auto md:overflow-y-auto md:flex-1"
        >
          {visibleCategories.length === 0 ? (
            <div className="px-3 py-4 text-[12px] text-[var(--muted)]">
              No settings match &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            visibleCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = effectiveCategory === cat.id;
              return (
                <React.Fragment key={cat.id}>
                  {cat.dividerBefore && !normalizedQuery && (
                    <div
                      className="hidden md:block my-1.5 mx-2 h-px bg-[var(--line)] shrink-0"
                      role="separator"
                      aria-hidden="true"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13.5px] text-left transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#1B4B91] text-white font-semibold'
                        : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)] font-medium'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </nav>

        {browserOnly && onClose && (
          <div className="hidden md:block p-3 border-t border-[var(--line)]">
            <Button variant="secondary" size="sm" className="w-full" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </aside>

      {/* Right Detail Pane */}
      <div className="flex-1 min-w-0 overflow-y-auto p-5 sm:p-6 bg-[var(--surface)]">
        <div className="max-w-[640px] mx-auto flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 pb-1">
            <div>
              <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
                {normalizedQuery
                  ? `Search: "${searchQuery.trim()}"`
                  : activeCategoryObj.label}
              </h2>
            </div>
            {browserOnly && onClose && (
              <button
                type="button"
                aria-label="Close browser settings"
                onClick={onClose}
                className="hidden md:inline-flex p-1.5 rounded-[8px] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {normalizedQuery ? (
            visibleCategories.length === 0 ? (
              <div className="p-8 text-center rounded-[14px] bg-[var(--surface-subtle)] border border-[var(--line)] text-[13px] text-[var(--muted)]">
                No browser settings matched &ldquo;{searchQuery.trim()}&rdquo;. Try searching for &ldquo;history&rdquo;, &ldquo;zoom&rdquo;, &ldquo;cookies&rdquo;, or &ldquo;search&rdquo;.
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {visibleCategories.map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-2">
                    <h3 className="text-[14px] font-semibold text-[#1B4B91]">{cat.label}</h3>
                    {renderCategoryContent(cat.id)}
                  </div>
                ))}
              </div>
            )
          ) : (
            renderCategoryContent(effectiveCategory)
          )}
        </div>
      </div>

      {/* Confirm Reset Browser Settings */}
      <ConfirmDialog
        open={confirmResetDefaults}
        isOpen={confirmResetDefaults}
        title="Reset browser settings?"
        message="This will restore startup behavior, search engine, zoom, privacy shields, and toolbar layout back to Klarity defaults. Your bookmarks, passwords, and financial data will not be deleted."
        confirmLabel="Reset to Defaults"
        variant="danger"
        onConfirm={handleConfirmResetBrowserDefaults}
        onCancel={() => setConfirmResetDefaults(false)}
      />
    </div>
  );
}
