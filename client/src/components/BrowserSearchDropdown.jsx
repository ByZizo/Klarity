import React from 'react';
import { ArrowUpLeft, Clock, Globe, Search, X } from 'lucide-react';
import { formatHistoryTime } from '../utils/browserHistory';

function DropdownHistoryIcon({ favicon, hostname }) {
  const [imgFailed, setImgFailed] = React.useState(false);

  if (!favicon || imgFailed) {
    return <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" aria-hidden="true" />;
  }

  return (
    <img
      src={favicon}
      alt=""
      aria-hidden="true"
      loading="lazy"
      title={hostname || ''}
      onError={() => setImgFailed(true)}
      className="w-3.5 h-3.5 rounded-xs object-contain shrink-0"
    />
  );
}

/**
 * Lightweight, keyboard-accessible autocomplete dropdown for Recent Searches and History matches.
 */
export function BrowserSearchDropdown({
  id = 'klarity-browser-search-dropdown',
  isOpen = false,
  flatItems = [],
  recentMatches = [],
  historyMatches = [],
  activeIndex = -1,
  onHighlight,
  onSelectSearch,
  onFillSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onSelectHistory,
  roundedClass = 'rounded-xl',
  className = ''
}) {
  if (!isOpen || flatItems.length === 0) {
    return null;
  }

  const recentCount = recentMatches.length;

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Search suggestions"
      onMouseDown={(e) => {
        // Keep input focus intact while clicking dropdown controls inside web/Electron views
        e.preventDefault();
      }}
      className={`absolute left-0 right-0 top-full mt-1.5 bg-[var(--surface)] border border-[var(--line)] ${roundedClass} shadow-xl z-[70] overflow-hidden max-h-[min(360px,55vh)] overflow-y-auto py-1.5 text-left ${className}`}
    >
      {recentCount > 0 && (
        <div>
          <div className="flex items-center justify-between px-3.5 pt-1 pb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              Recent Searches
            </span>
            {typeof onClearRecentSearches === 'function' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRecentSearches();
                }}
                className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--surface-subtle)]"
              >
                Clear recent
              </button>
            )}
          </div>

          {recentMatches.map((entry, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={entry.id || entry.query}
                id={`${id}-opt-${idx}`}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => onHighlight?.(idx)}
                className={`group flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-soft)] text-[var(--ink)]'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSearch?.(entry.query)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 py-0.5 text-left cursor-pointer"
                >
                  <Clock
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[var(--brand)]' : 'text-[var(--muted)]'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] font-medium truncate">{entry.query}</span>
                </button>

                {typeof onFillSearch === 'function' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFillSearch(entry.query);
                    }}
                    title={`Fill "${entry.query}" into search box`}
                    aria-label={`Fill search with ${entry.query}`}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer shrink-0"
                  >
                    <ArrowUpLeft className="w-3.5 h-3.5" />
                  </button>
                )}

                {typeof onRemoveRecentSearch === 'function' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveRecentSearch(entry.id);
                    }}
                    title="Remove recent search"
                    aria-label={`Remove "${entry.query}" from recent searches`}
                    className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] cursor-pointer shrink-0 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {historyMatches.length > 0 && (
        <div className={recentCount > 0 ? 'mt-1.5 pt-1.5 border-t border-[var(--line)]' : ''}>
          <div className="px-3.5 pt-0.5 pb-1.5 flex items-center gap-1.5">
            <Search className="w-3 h-3 text-[var(--muted)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              From History
            </span>
          </div>

          {historyMatches.map((entry, hIdx) => {
            const flatIdx = recentCount + hIdx;
            const isActive = flatIdx === activeIndex;
            return (
              <div
                key={entry.id || entry.normalizedUrl}
                id={`${id}-opt-${flatIdx}`}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => onHighlight?.(flatIdx)}
                className={`flex items-center gap-2 px-3 py-1.5 mx-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-soft)] text-[var(--ink)]'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectHistory?.(entry.url)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 py-0.5 text-left cursor-pointer"
                >
                  <DropdownHistoryIcon favicon={entry.favicon} hostname={entry.hostname} />
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <span className="text-[13px] font-medium truncate">
                      {entry.title || entry.hostname || entry.url}
                    </span>
                    <span className="text-[11px] text-[var(--muted)] truncate shrink">
                      {entry.hostname || entry.url}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--muted)] shrink-0">
                    {formatHistoryTime(entry.visitedAt)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BrowserSearchDropdown;
