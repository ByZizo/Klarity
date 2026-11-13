// Shared configuration and persistence helpers for Klarity's In-App Browser

export const SEARCH_ENGINES = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    homeUrl: 'https://duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q='
  },
  {
    id: 'google',
    name: 'Google',
    homeUrl: 'https://www.google.com',
    searchUrl: 'https://www.google.com/search?q='
  },
  {
    id: 'bing',
    name: 'Bing',
    homeUrl: 'https://www.bing.com',
    searchUrl: 'https://www.bing.com/search?q='
  },
  {
    id: 'brave',
    name: 'Brave Search',
    homeUrl: 'https://search.brave.com',
    searchUrl: 'https://search.brave.com/search?q='
  },
  {
    id: 'startpage',
    name: 'Startpage',
    homeUrl: 'https://www.startpage.com',
    searchUrl: 'https://www.startpage.com/do/search?q='
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    homeUrl: 'https://www.ecosia.org',
    searchUrl: 'https://www.ecosia.org/search?q='
  }
];

export const TAB_GROUP_COLORS = [
  { id: 'blue', label: 'Blue', hex: '#3b82f6', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500' },
  { id: 'red', label: 'Red', hex: '#ef4444', bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', border: 'border-red-500' },
  { id: 'yellow', label: 'Yellow', hex: '#eab308', bg: 'bg-yellow-500/15', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500' },
  { id: 'green', label: 'Green', hex: '#22c55e', bg: 'bg-green-500/15', text: 'text-green-600 dark:text-green-400', border: 'border-green-500' },
  { id: 'pink', label: 'Pink', hex: '#ec4899', bg: 'bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400', border: 'border-pink-500' },
  { id: 'purple', label: 'Purple', hex: '#a855f7', bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500' },
  { id: 'orange', label: 'Orange', hex: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500' }
];

export const DEFAULT_BROWSER_SETTINGS = {
  searchEngine: 'duckduckgo',
  showBookmarksBar: true,
  showHomeButton: true,
  pageZoom: 100,
  startupMode: 'new_tab', // 'new_tab' | 'continue' | 'specific_pages'
  startupPages: [],
  homepageMode: 'search_engine',
  customHomepage: '',
  doNotTrack: false,
  cookiePolicy: 'allow', // 'allow' | 'block_third_party' | 'block_all'
  aiPageReaderEnabled: true,
  downloadPath: '',
  askWhereToSave: false,
  adBlockerEnabled: true,
  youtubeAdShield: true,
  sponsorBlockEnabled: true,
  dearrowEnabled: true
};

export const NEW_TAB_URL = 'klarity://newtab';

export function isNewTabUrl(url) {
  return String(url || '').trim().toLowerCase() === NEW_TAB_URL;
}

export const DEFAULT_QUICK_LINKS = [
  { id: 'ql-google', name: 'Google', url: 'https://www.google.com' },
  { id: 'ql-youtube', name: 'YouTube', url: 'https://www.youtube.com' },
  { id: 'ql-github', name: 'GitHub', url: 'https://github.com' },
  { id: 'ql-reddit', name: 'Reddit', url: 'https://www.reddit.com' },
  { id: 'ql-wikipedia', name: 'Wikipedia', url: 'https://www.wikipedia.org' },
  { id: 'ql-finance', name: 'Yahoo Finance', url: 'https://finance.yahoo.com' }
];

export const DEFAULT_NEWTAB_PREFS = {
  showQuickLinks: true,
  showClock: true,
  showNotes: false,
  backgroundStyle: 'slate', // 'slate' | 'gradient' | 'wallpaper'
  wallpaperUrl: ''
};

const SETTINGS_STORAGE_KEY = 'klarity_browser_settings';
const BOOKMARKS_STORAGE_KEY = 'klarity_browser_bookmarks';
const SESSION_TABS_KEY = 'klarity_browser_session_tabs';
const NEWTAB_QUICK_LINKS_KEY = 'klarity_newtab_quick_links';
const NEWTAB_PREFS_KEY = 'klarity_newtab_prefs';
const NEWTAB_NOTES_KEY = 'klarity_newtab_notes';

export function loadBrowserSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BROWSER_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_BROWSER_SETTINGS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_BROWSER_SETTINGS };
  }
}

export function saveBrowserSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function loadBrowserBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBrowserBookmarks(items) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  } catch {}
}

export function loadBrowserSessionState() {
  try {
    const raw = localStorage.getItem(SESSION_TABS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
      return {
        tabs: parsed.tabs,
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        activeTabId: parsed.activeTabId || parsed.tabs[0].id
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBrowserSessionState(sessionState) {
  try {
    localStorage.setItem(SESSION_TABS_KEY, JSON.stringify(sessionState));
  } catch {}
}

export function clearBrowserSessionState() {
  try {
    localStorage.removeItem(SESSION_TABS_KEY);
  } catch {}
}

export function getSearchEngineById(engineId) {
  return SEARCH_ENGINES.find((e) => e.id === engineId) || SEARCH_ENGINES[0];
}

export function loadNewTabQuickLinks() {
  try {
    const raw = localStorage.getItem(NEWTAB_QUICK_LINKS_KEY);
    if (raw === null) return [...DEFAULT_QUICK_LINKS];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_QUICK_LINKS];
  } catch {
    return [...DEFAULT_QUICK_LINKS];
  }
}

export function saveNewTabQuickLinks(links) {
  try {
    localStorage.setItem(NEWTAB_QUICK_LINKS_KEY, JSON.stringify(Array.isArray(links) ? links : []));
  } catch {}
}

export function loadNewTabPrefs() {
  try {
    const raw = localStorage.getItem(NEWTAB_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NEWTAB_PREFS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_NEWTAB_PREFS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_NEWTAB_PREFS };
  }
}

export function saveNewTabPrefs(prefs) {
  try {
    localStorage.setItem(NEWTAB_PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

export function loadNewTabNotes() {
  try {
    return localStorage.getItem(NEWTAB_NOTES_KEY) || '';
  } catch {
    return '';
  }
}

export function saveNewTabNotes(notes) {
  try {
    localStorage.setItem(NEWTAB_NOTES_KEY, String(notes || ''));
  } catch {}
}

export function getBrowserHomeUrl(settings = DEFAULT_BROWSER_SETTINGS) {
  if (settings?.homepageMode === 'custom' && settings?.customHomepage?.trim()) {
    const custom = settings.customHomepage.trim();
    const matchedEngine = SEARCH_ENGINES.find(
      (e) => e.id === custom.toLowerCase() || e.name.toLowerCase() === custom.toLowerCase()
    );
    if (matchedEngine) return matchedEngine.homeUrl;
    return /^https?:\/\//i.test(custom) ? custom : `https://${custom}`;
  }
  return NEW_TAB_URL;
}

export function buildSearchUrl(query, engineId) {
  const engine = getSearchEngineById(engineId);
  return `${engine.searchUrl}${encodeURIComponent(String(query || '').trim())}`;
}

export function resolveBrowserDestination(input, engineId) {
  const clean = String(input || '').trim();
  if (!clean) return '';

  if (clean.toLowerCase() === NEW_TAB_URL) {
    return NEW_TAB_URL;
  }

  if (/^https?:\/\/\S+/i.test(clean)) {
    return clean;
  }

  if (
    /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(clean) ||
    /^localhost(:\d+)?(\/\S*)?$/i.test(clean)
  ) {
    return `https://${clean}`;
  }

  return buildSearchUrl(clean, engineId);
}
