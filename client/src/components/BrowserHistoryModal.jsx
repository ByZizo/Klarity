import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Globe,
  History,
  PauseCircle,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { Button, ConfirmDialog } from './ui';
import {
  BROWSER_HISTORY_UPDATED_EVENT,
  clearBrowserHistory,
  deleteBrowserHistoryItem,
  formatHistoryTime,
  getHistoryDateGroup,
  loadBrowserHistory
} from '../utils/browserHistory';

const HISTORY_PAGE_SIZE = 40;
const GROUP_ORDER = ['Today', 'Yesterday', 'Last 7 Days', 'Earlier'];

function HistoryFavicon({ favicon, title }) {
  const [failed, setFailed] = useState(false);

  if (!favicon || failed) {
    return (
      <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] shrink-0">
        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center overflow-hidden shrink-0">
      <img
        src={favicon}
        alt={title || ''}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-4 h-4 object-contain"
      />
    </div>
  );
}

function BrowserHistoryModalBody({
  onClose,
  historyEnabled,
  onToggleHistoryEnabled,
  onNavigate,
  onShowToast
}) {
  const [historyItems, setHistoryItems] = useState(() => loadBrowserHistory());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(HISTORY_PAGE_SIZE);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 40);

    const handleSync = () => {
      setHistoryItems(loadBrowserHistory());
      setNowMs(Date.now());
    };
    window.addEventListener(BROWSER_HISTORY_UPDATED_EVENT, handleSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(BROWSER_HISTORY_UPDATED_EVENT, handleSync);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !confirmClearOpen) {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [confirmClearOpen, onClose]);

  const filteredItems = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return historyItems;
    return historyItems.filter(
      (item) =>
        String(item.title || '').toLowerCase().includes(needle) ||
        String(item.hostname || '').toLowerCase().includes(needle) ||
        String(item.url || '').toLowerCase().includes(needle)
    );
  }, [historyItems, searchQuery]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleLimit),
    [filteredItems, visibleLimit]
  );

  const groupedSections = useMemo(() => {
    const buckets = new Map();
    GROUP_ORDER.forEach((label) => buckets.set(label, []));

    for (let i = 0; i < visibleItems.length; i += 1) {
      const entry = visibleItems[i];
      const groupLabel = getHistoryDateGroup(entry.visitedAt, nowMs);
      buckets.get(groupLabel).push(entry);
    }

    return GROUP_ORDER.map((label) => ({
      label,
      items: buckets.get(label) || []
    })).filter((section) => section.items.length > 0);
  }, [visibleItems, nowMs]);

  const hasMore = filteredItems.length > visibleItems.length;
  const remainingCount = filteredItems.length - visibleItems.length;

  const handleDeleteOne = (id) => {
    const updated = deleteBrowserHistoryItem(id);
    setHistoryItems(updated);
  };

  const handleConfirmClearAll = () => {
    setConfirmClearOpen(false);
    const cleared = clearBrowserHistory();
    setHistoryItems(cleared);
    onShowToast?.('Browser history cleared', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="klarity-browser-history-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmClearOpen) {
          onClose?.();
        }
      }}
    >
      <div
        className="w-full max-w-2xl h-[min(640px,88vh)] rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--line)] bg-[var(--surface-subtle)]/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]/20 flex items-center justify-center shrink-0">
              <History className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="klarity-browser-history-title"
                className="font-serif-title text-[18px] font-semibold text-[var(--ink)] truncate"
              >
                Browser History
              </h2>
              <p className="text-[12px] text-[var(--muted)]">
                {historyItems.length === 0
                  ? 'No visited pages recorded'
                  : `${historyItems.length} ${historyItems.length === 1 ? 'site' : 'sites'} saved locally`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {historyItems.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmClearOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear all history
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close browser history"
              title="Close (Esc)"
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Tracking Paused Notice */}
        {!historyEnabled && (
          <div className="px-5 py-2.5 bg-[var(--warning-soft)] border-b border-[var(--warning-line)] flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--warning)]">
              <PauseCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Browser history is paused. New page visits are not being saved.</span>
            </div>
            {typeof onToggleHistoryEnabled === 'function' && (
              <button
                type="button"
                onClick={() => onToggleHistoryEnabled(true)}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[12px] font-semibold text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0"
              >
                Resume
              </button>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/15">
            <Search className="w-4 h-4 text-[var(--muted)] shrink-0" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleLimit(HISTORY_PAGE_SIZE);
              }}
              placeholder="Search history by title, website, or URL..."
              aria-label="Search browser history"
              className="no-focus-outline flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] text-[var(--ink)] placeholder:text-[var(--muted)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setVisibleLimit(HISTORY_PAGE_SIZE);
                }}
                aria-label="Clear history search"
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grouped Chronological List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 min-h-0">
          {filteredItems.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-6 py-8">
              <div className="w-11 h-11 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] mb-3">
                <History className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="text-[15px] font-semibold text-[var(--ink)]">
                {searchQuery ? 'No matching history entries' : 'Your browser history is empty'}
              </h3>
              <p className="text-[13px] text-[var(--muted)] mt-1 max-w-xs">
                {searchQuery
                  ? 'Try a different keyword or clear your search filter.'
                  : historyEnabled
                  ? 'Pages you visit in Klarity Browser will appear here.'
                  : 'History tracking is currently paused in Settings.'}
              </p>
            </div>
          ) : (
            <>
              {groupedSections.map((section) => (
                <section key={section.label} aria-label={section.label}>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2 px-1">
                    {section.label}
                  </h3>
                  <div className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
                    {section.items.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-3 px-3.5 py-2.5 hover:bg-[var(--surface-subtle)]/70 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => onNavigate?.(item.url, { newTab: false })}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                          title={item.url}
                        >
                          <HistoryFavicon key={item.favicon} favicon={item.favicon} title={item.title} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-[var(--ink)] group-hover:text-[var(--brand)] truncate">
                              {item.title || item.hostname || item.url}
                            </div>
                            <div className="text-[12px] text-[var(--muted)] truncate flex items-center gap-1.5">
                              <span className="truncate">{item.hostname || item.url}</span>
                              <span aria-hidden="true">·</span>
                              <span className="shrink-0">{formatHistoryTime(item.visitedAt, nowMs)}</span>
                            </div>
                          </div>
                        </button>

                        {item.visitCount > 1 && (
                          <span
                            title={`${item.visitCount} visits`}
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--muted)] shrink-0 tabular-nums"
                          >
                            {item.visitCount}×
                          </span>
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavigate?.(item.url, { newTab: true })}
                            title="Open in new tab"
                            aria-label={`Open ${item.title || item.hostname} in new tab`}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--surface-hover)] cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(item.id)}
                            title="Delete from history"
                            aria-label={`Delete ${item.title || item.hostname} from history`}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisibleLimit((prev) => prev + HISTORY_PAGE_SIZE)}
                  >
                    Show more ({remainingCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Summary */}
        {filteredItems.length > 0 && (
          <div className="px-5 py-2.5 border-t border-[var(--line)] bg-[var(--surface-subtle)]/50 text-[12px] text-[var(--muted)] flex items-center justify-between shrink-0">
            <span>
              Showing {visibleItems.length} of {filteredItems.length}{' '}
              {filteredItems.length === 1 ? 'entry' : 'entries'}
            </span>
            <span className="hidden sm:inline">Stored locally on this device</span>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear all browser history?"
        message="This will permanently remove all saved visited pages from your local browser history. Recent searches and bookmarks will not be affected."
        confirmLabel="Clear history"
        variant="danger"
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={handleConfirmClearAll}
      />
    </div>
  );
}

export function BrowserHistoryModal({ isOpen = false, ...props }) {
  if (!isOpen) return null;
  return <BrowserHistoryModalBody {...props} />;
}

export default BrowserHistoryModal;
