// Lightweight, privacy-respecting storage and query helpers for Klarity Browser History & Recent Searches

import { isDirectUrlInput, isNewTabUrl } from './browserSettings.js';

export const BROWSER_HISTORY_STORAGE_KEY = 'klarity_browser_history';
export const RECENT_SEARCHES_STORAGE_KEY = 'klarity_browser_recent_searches';
export const BROWSER_HISTORY_UPDATED_EVENT = 'klarity:browser-history-updated';
export const RECENT_SEARCHES_UPDATED_EVENT = 'klarity:recent-searches-updated';

export const MAX_HISTORY_ITEMS = 250;
export const MAX_RECENT_SEARCHES = 20;
export const RAPID_REVISIT_WINDOW_MS = 30 * 1000;

function emitSyncEvent(eventName, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {}
}

function makeEntryId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Validates and normalizes http/https URLs for history persistence.
 * Rejects internal or unsafe schemes (`about:`, `klarity://newtab`, `javascript:`, `data:`, `blob:`).
 */
export function normalizeHistoryUrl(rawUrl) {
  const raw = String(rawUrl || '').trim();
  if (!raw || raw.toLowerCase() === 'about:blank' || isNewTabUrl(raw)) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return null;
  }

  const hostname = (parsed.hostname || '').toLowerCase().replace(/^www\./, '');
  if (!hostname) return null;

  // Canonical key so trailing slashes on bare roots or empty hashes deduplicate cleanly
  const normalizedPath = parsed.pathname === '/' ? '' : parsed.pathname;
  const normalizedHash = parsed.hash && parsed.hash !== '#' ? parsed.hash : '';
  const portPart = parsed.port ? `:${parsed.port}` : '';
  const normalizedUrl = `${protocol}//${hostname}${portPart}${normalizedPath}${parsed.search}${normalizedHash}`;
  const cleanUrl = `${protocol}//${parsed.hostname}${portPart}${parsed.pathname}${parsed.search}${normalizedHash}`;

  return {
    url: cleanUrl,
    normalizedUrl,
    hostname,
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`
  };
}

/**
 * Extracts a clean search query if the submitted omnibox text is a search phrase,
 * or returns an empty string if the user typed a direct URL or blank query.
 */
export function extractSearchQueryFromInput(rawInput) {
  const cleaned = String(rawInput || '').trim().replace(/\s+/g, ' ');
  if (!cleaned || isDirectUrlInput(cleaned)) {
    return '';
  }
  return cleaned;
}

/**
 * Validates, deduplicates, sorts newest-first, and caps stored browser history items.
 */
export function sanitizeBrowserHistory(raw) {
  if (!Array.isArray(raw)) {
    return { items: [], changed: raw !== null && raw !== undefined };
  }

  let changed = false;
  const byNormalized = new Map();

  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    if (!entry || typeof entry !== 'object') {
      changed = true;
      continue;
    }

    const urlInfo = normalizeHistoryUrl(entry.url || entry.normalizedUrl);
    if (!urlInfo) {
      changed = true;
      continue;
    }

    const rawVisited = Number(entry.visitedAt);
    const visitedAt = Number.isFinite(rawVisited) && rawVisited > 0 ? rawVisited : Date.now();
    const rawFirstVisited = Number(entry.firstVisitedAt);
    const firstVisitedAt =
      Number.isFinite(rawFirstVisited) && rawFirstVisited > 0
        ? Math.min(rawFirstVisited, visitedAt)
        : visitedAt;
    const rawCount = Number(entry.visitCount);
    const visitCount = Number.isFinite(rawCount) && rawCount >= 1 ? Math.floor(rawCount) : 1;

    const cleanTitle =
      typeof entry.title === 'string' && entry.title.trim() && entry.title.trim() !== 'about:blank'
        ? entry.title.trim()
        : urlInfo.hostname;

    const cleanId =
      typeof entry.id === 'string' && entry.id.trim() ? entry.id.trim() : makeEntryId('bh');
    const favicon =
      typeof entry.favicon === 'string' && entry.favicon.trim() ? entry.favicon.trim() : urlInfo.favicon;

    if (
      !entry.id ||
      entry.normalizedUrl !== urlInfo.normalizedUrl ||
      entry.hostname !== urlInfo.hostname ||
      entry.favicon !== favicon ||
      entry.visitedAt !== visitedAt ||
      entry.firstVisitedAt !== firstVisitedAt ||
      entry.visitCount !== visitCount ||
      entry.title !== cleanTitle
    ) {
      changed = true;
    }

    const normalizedEntry = {
      id: cleanId,
      url: urlInfo.url,
      normalizedUrl: urlInfo.normalizedUrl,
      title: cleanTitle,
      hostname: urlInfo.hostname,
      favicon,
      visitedAt,
      firstVisitedAt,
      visitCount
    };

    const existing = byNormalized.get(urlInfo.normalizedUrl);
    if (existing) {
      changed = true;
      const newer = visitedAt >= existing.visitedAt ? normalizedEntry : existing;
      const older = visitedAt >= existing.visitedAt ? existing : normalizedEntry;
      byNormalized.set(urlInfo.normalizedUrl, {
        ...newer,
        title:
          newer.title && newer.title !== newer.hostname
            ? newer.title
            : older.title || newer.hostname,
        firstVisitedAt: Math.min(existing.firstVisitedAt, firstVisitedAt),
        visitCount: Math.max(existing.visitCount, visitCount)
      });
    } else {
      byNormalized.set(urlInfo.normalizedUrl, normalizedEntry);
    }
  }

  const sorted = Array.from(byNormalized.values()).sort((a, b) => b.visitedAt - a.visitedAt);
  if (sorted.length > MAX_HISTORY_ITEMS) {
    changed = true;
  }

  return {
    items: sorted.slice(0, MAX_HISTORY_ITEMS),
    changed
  };
}

/**
 * Validates, deduplicates (case-insensitively), sorts newest-first, and caps recent searches.
 */
export function sanitizeRecentSearches(raw) {
  if (!Array.isArray(raw)) {
    return { items: [], changed: raw !== null && raw !== undefined };
  }

  let changed = false;
  const seen = new Map();

  for (let i = 0; i < raw.length; i += 1) {
    const entry = raw[i];
    const queryRaw = typeof entry === 'string' ? entry : entry?.query;
    const query = String(queryRaw || '').trim().replace(/\s+/g, ' ');
    if (!query || isDirectUrlInput(query)) {
      changed = true;
      continue;
    }

    const rawSearchedAt = typeof entry === 'object' && entry ? Number(entry.searchedAt) : NaN;
    const searchedAt =
      Number.isFinite(rawSearchedAt) && rawSearchedAt > 0 ? rawSearchedAt : Date.now();
    const cleanId =
      typeof entry === 'object' && entry && typeof entry.id === 'string' && entry.id.trim()
        ? entry.id.trim()
        : makeEntryId('rs');

    if (
      typeof entry !== 'object' ||
      !entry ||
      !entry.id ||
      entry.query !== query ||
      entry.searchedAt !== searchedAt
    ) {
      changed = true;
    }

    const key = query.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      changed = true;
      if (searchedAt > existing.searchedAt) {
        seen.set(key, { id: cleanId, query, searchedAt });
      }
    } else {
      seen.set(key, { id: cleanId, query, searchedAt });
    }
  }

  const sorted = Array.from(seen.values()).sort((a, b) => b.searchedAt - a.searchedAt);
  if (sorted.length > MAX_RECENT_SEARCHES) {
    changed = true;
  }

  return {
    items: sorted.slice(0, MAX_RECENT_SEARCHES),
    changed
  };
}

export function loadBrowserHistory() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BROWSER_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeBrowserHistory(parsed).items;
  } catch {
    return [];
  }
}

export function saveBrowserHistory(items) {
  const sanitized = sanitizeBrowserHistory(items).items;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(BROWSER_HISTORY_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}
  }
  emitSyncEvent(BROWSER_HISTORY_UPDATED_EVENT, { items: sanitized });
  return sanitized;
}

/**
 * Records a page visit if history tracking is enabled.
 * Deduplicates by normalized URL and avoids inflating visit counts on rapid reloads/back-forward clicks.
 */
export function recordBrowserVisit({ url, title, favicon } = {}, { enabled = true } = {}) {
  const current = loadBrowserHistory();
  if (!enabled) return current;

  const urlInfo = normalizeHistoryUrl(url);
  if (!urlInfo) return current;

  const now = Date.now();
  const trimmedTitle =
    typeof title === 'string' && title.trim() && title.trim() !== 'about:blank'
      ? title.trim()
      : '';
  const existingIdx = current.findIndex((item) => item.normalizedUrl === urlInfo.normalizedUrl);

  let nextItems;
  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    const isRapidRevisit = now - existing.visitedAt < RAPID_REVISIT_WINDOW_MS;
    const isInformativeTitle =
      trimmedTitle &&
      trimmedTitle !== urlInfo.url &&
      trimmedTitle !== urlInfo.hostname &&
      trimmedTitle !== rawUrlWithoutTrailingSlash(urlInfo.url);
    const resolvedTitle = isInformativeTitle
      ? trimmedTitle
      : existing.title || trimmedTitle || urlInfo.hostname;

    const updatedItem = {
      ...existing,
      url: urlInfo.url,
      title: resolvedTitle,
      favicon: favicon || existing.favicon || urlInfo.favicon,
      visitedAt: isRapidRevisit ? existing.visitedAt : now,
      visitCount: isRapidRevisit ? existing.visitCount : (existing.visitCount || 1) + 1
    };

    const rest = current.filter((_, idx) => idx !== existingIdx);
    nextItems = [updatedItem, ...rest];
  } else {
    const newItem = {
      id: makeEntryId('bh'),
      url: urlInfo.url,
      normalizedUrl: urlInfo.normalizedUrl,
      title: trimmedTitle || urlInfo.hostname,
      hostname: urlInfo.hostname,
      favicon: favicon || urlInfo.favicon,
      visitedAt: now,
      firstVisitedAt: now,
      visitCount: 1
    };
    nextItems = [newItem, ...current].slice(0, MAX_HISTORY_ITEMS);
  }

  return saveBrowserHistory(nextItems);
}

function rawUrlWithoutTrailingSlash(url) {
  return String(url || '').replace(/\/+$/, '');
}

/**
 * Updates the page title of an existing history entry without creating duplicate records or incrementing visitCount.
 */
export function updateHistoryEntryTitle(url, title, { enabled = true } = {}) {
  const trimmedTitle =
    typeof title === 'string' && title.trim() && title.trim() !== 'about:blank'
      ? title.trim()
      : '';
  if (!enabled || !trimmedTitle) return loadBrowserHistory();

  const urlInfo = normalizeHistoryUrl(url);
  if (!urlInfo) return loadBrowserHistory();

  const current = loadBrowserHistory();
  const idx = current.findIndex((item) => item.normalizedUrl === urlInfo.normalizedUrl);
  if (idx < 0 || current[idx].title === trimmedTitle) {
    return current;
  }

  const next = current.map((item, i) =>
    i === idx ? { ...item, title: trimmedTitle } : item
  );
  return saveBrowserHistory(next);
}

export function deleteBrowserHistoryItem(id) {
  if (!id) return loadBrowserHistory();
  const next = loadBrowserHistory().filter((item) => item.id !== id);
  return saveBrowserHistory(next);
}

export function clearBrowserHistory() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(BROWSER_HISTORY_STORAGE_KEY);
    } catch {}
  }
  emitSyncEvent(BROWSER_HISTORY_UPDATED_EVENT, { items: [] });
  return [];
}

export function loadRecentSearches() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeRecentSearches(parsed).items;
  } catch {
    return [];
  }
}

export function saveRecentSearches(items) {
  const sanitized = sanitizeRecentSearches(items).items;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {}
  }
  emitSyncEvent(RECENT_SEARCHES_UPDATED_EVENT, { items: sanitized });
  return sanitized;
}

/**
 * Records a submitted search query if recent searches are enabled.
 * Trims whitespace, ignores direct URLs/empty input, deduplicates case-insensitively,
 * moves matches to the top, and caps at MAX_RECENT_SEARCHES.
 */
export function recordRecentSearch(rawQuery, { enabled = true } = {}) {
  const current = loadRecentSearches();
  if (!enabled) return current;

  const query = extractSearchQueryFromInput(rawQuery);
  if (!query) return current;

  const lower = query.toLowerCase();
  const rest = current.filter((item) => item.query.toLowerCase() !== lower);
  const next = [
    {
      id: makeEntryId('rs'),
      query,
      searchedAt: Date.now()
    },
    ...rest
  ].slice(0, MAX_RECENT_SEARCHES);

  return saveRecentSearches(next);
}

export function deleteRecentSearchItem(id) {
  if (!id) return loadRecentSearches();
  const next = loadRecentSearches().filter((item) => item.id !== id);
  return saveRecentSearches(next);
}

export function clearRecentSearches() {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {}
  }
  emitSyncEvent(RECENT_SEARCHES_UPDATED_EVENT, { items: [] });
  return [];
}

/**
 * Filters recent searches for dropdown display (prefix matches first, then substring matches).
 */
export function filterRecentSearches(items, rawQuery = '', limit = 8) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const needle = String(rawQuery || '').trim().toLowerCase();
  if (!needle) {
    return items.slice(0, limit);
  }

  const startsWith = [];
  const contains = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const qLower = String(item?.query || '').toLowerCase();
    if (!qLower) continue;
    if (qLower.startsWith(needle)) {
      startsWith.push(item);
    } else if (qLower.includes(needle)) {
      contains.push(item);
    }
  }
  return [...startsWith, ...contains].slice(0, limit);
}

/**
 * Filters browser history items when typing a non-empty query in the omnibox / search bar.
 */
export function filterHistorySuggestions(items, rawQuery = '', limit = 4) {
  const needle = String(rawQuery || '').trim().toLowerCase();
  if (!needle || !Array.isArray(items) || items.length === 0) return [];

  const strong = [];
  const weak = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item || !item.url) continue;
    const titleLower = String(item.title || '').toLowerCase();
    const hostLower = String(item.hostname || '').toLowerCase();
    const urlLower = String(item.url || '').toLowerCase();

    if (titleLower.startsWith(needle) || hostLower.startsWith(needle)) {
      strong.push(item);
    } else if (
      titleLower.includes(needle) ||
      hostLower.includes(needle) ||
      urlLower.includes(needle)
    ) {
      weak.push(item);
    }
    if (strong.length + weak.length >= limit * 3) break;
  }

  return [...strong, ...weak].slice(0, limit);
}

/**
 * Computes the flat keyboard-navigable dropdown items list in exact render order.
 */
export function buildSearchDropdownItems({
  recentSearches = [],
  historyItems = [],
  query = '',
  showRecentSearches = true,
  historyEnabled = true,
  recentLimit = 7,
  historyLimit = 4
}) {
  const recentMatches = showRecentSearches
    ? filterRecentSearches(recentSearches, query, recentLimit)
    : [];
  const historyMatches =
    historyEnabled !== false && String(query || '').trim()
      ? filterHistorySuggestions(historyItems, query, historyLimit)
      : [];

  const flatItems = [];
  for (let i = 0; i < recentMatches.length; i += 1) {
    flatItems.push({ type: 'recent', item: recentMatches[i] });
  }
  for (let i = 0; i < historyMatches.length; i += 1) {
    flatItems.push({ type: 'history', item: historyMatches[i] });
  }

  return {
    recentMatches,
    historyMatches,
    flatItems
  };
}

export function getHistoryDateGroup(timestamp, nowMs = Date.now()) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return 'Earlier';

  const now = new Date(nowMs);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  if (ts >= startOfToday) return 'Today';
  if (ts >= startOfToday - dayMs) return 'Yesterday';
  if (ts >= startOfToday - 7 * dayMs) return 'Last 7 Days';
  return 'Earlier';
}

export function formatHistoryTime(timestamp, nowMs = Date.now()) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const date = new Date(ts);
  const group = getHistoryDateGroup(ts, nowMs);
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (group === 'Today' || group === 'Yesterday') {
    return timeStr;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${timeStr}`;
}
