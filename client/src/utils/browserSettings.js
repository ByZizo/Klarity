// Shared configuration and persistence helpers for Klarity's In-App Browser

export const SEARCH_ENGINES = [
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    homeUrl: 'https://duckduckgo.com',
    searchUrl: 'https://duckduckgo.com/?q=',
    description: 'Privacy-focused search with no tracking'
  },
  {
    id: 'google',
    name: 'Google',
    homeUrl: 'https://www.google.com',
    searchUrl: 'https://www.google.com/search?q=',
    description: 'Fast, comprehensive web search'
  },
  {
    id: 'bing',
    name: 'Bing',
    homeUrl: 'https://www.bing.com',
    searchUrl: 'https://www.bing.com/search?q=',
    description: 'Microsoft search with rich instant answers'
  },
  {
    id: 'brave',
    name: 'Brave Search',
    homeUrl: 'https://search.brave.com',
    searchUrl: 'https://search.brave.com/search?q=',
    description: 'Independent, private search index'
  },
  {
    id: 'startpage',
    name: 'Startpage',
    homeUrl: 'https://www.startpage.com',
    searchUrl: 'https://www.startpage.com/do/search?q=',
    description: 'Google results with enhanced privacy'
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    homeUrl: 'https://www.ecosia.org',
    searchUrl: 'https://www.ecosia.org/search?q=',
    description: 'Eco-friendly search engine'
  }
];

export const DEFAULT_BROWSER_SETTINGS = {
  searchEngine: 'duckduckgo',
  homepageMode: 'search_engine', // 'search_engine' | 'custom'
  customHomepage: 'https://duckduckgo.com',
  showBookmarksBar: true,
  aiPageReaderEnabled: true
};

const SETTINGS_STORAGE_KEY = 'klarity_browser_settings';
const BOOKMARKS_STORAGE_KEY = 'klarity_browser_bookmarks';

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

export function getSearchEngineById(engineId) {
  return SEARCH_ENGINES.find((e) => e.id === engineId) || SEARCH_ENGINES[0];
}

export function getBrowserHomeUrl(settings = DEFAULT_BROWSER_SETTINGS) {
  if (settings?.homepageMode === 'custom' && settings?.customHomepage?.trim()) {
    const custom = settings.customHomepage.trim();
    return /^https?:\/\//i.test(custom) ? custom : `https://${custom}`;
  }
  const engine = getSearchEngineById(settings?.searchEngine);
  return engine.homeUrl;
}

export function buildSearchUrl(query, engineId) {
  const engine = getSearchEngineById(engineId);
  return `${engine.searchUrl}${encodeURIComponent(String(query || '').trim())}`;
}

export function resolveBrowserDestination(input, engineId) {
  const clean = String(input || '').trim();
  if (!clean) return '';
  const isUrl = /^(https?:\/\/|[a-z0-9-]+(\.[a-z0-9-]+)+([/:?#].*)?)$/i.test(clean) && !clean.includes(' ');
  if (isUrl) {
    return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  }
  return buildSearchUrl(clean, engineId);
}
