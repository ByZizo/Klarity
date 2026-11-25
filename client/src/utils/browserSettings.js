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
  dearrowEnabled: true,
  historyEnabled: true,
  recentSearchesEnabled: true,
  offerToSavePasswords: true,
  neverSavePasswordDomains: []
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

export const NOTE_THEMES = [
  {
    id: 'slate',
    label: 'Slate',
    cardBg: '#1e293b',
    cardBorder: 'rgba(51, 65, 85, 0.8)',
    textBg: 'rgba(15, 23, 42, 0.85)',
    textColor: '#f1f5f9',
    accentColor: '#38bdf8',
    previewColor: '#334155'
  },
  {
    id: 'amber',
    label: 'Amber',
    cardBg: '#2a1f14',
    cardBorder: 'rgba(217, 119, 6, 0.45)',
    textBg: 'rgba(28, 20, 10, 0.9)',
    textColor: '#fef3c7',
    accentColor: '#fbbf24',
    previewColor: '#d97706'
  },
  {
    id: 'blue',
    label: 'Navy',
    cardBg: '#0f1d3a',
    cardBorder: 'rgba(37, 99, 235, 0.45)',
    textBg: 'rgba(8, 16, 38, 0.9)',
    textColor: '#e0e7ff',
    accentColor: '#60a5fa',
    previewColor: '#2563eb'
  },
  {
    id: 'emerald',
    label: 'Forest',
    cardBg: '#062c22',
    cardBorder: 'rgba(5, 150, 105, 0.45)',
    textBg: 'rgba(3, 26, 20, 0.9)',
    textColor: '#d1fae5',
    accentColor: '#34d399',
    previewColor: '#059669'
  },
  {
    id: 'purple',
    label: 'Violet',
    cardBg: '#230f38',
    cardBorder: 'rgba(147, 51, 234, 0.45)',
    textBg: 'rgba(21, 7, 36, 0.9)',
    textColor: '#f3e8ff',
    accentColor: '#c084fc',
    previewColor: '#9333ea'
  },
  {
    id: 'rose',
    label: 'Rose',
    cardBg: '#33101c',
    cardBorder: 'rgba(225, 29, 72, 0.45)',
    textBg: 'rgba(30, 6, 15, 0.9)',
    textColor: '#ffe4e6',
    accentColor: '#fb7185',
    previewColor: '#e11d48'
  },
  {
    id: 'oled',
    label: 'OLED',
    cardBg: '#09090b',
    cardBorder: 'rgba(63, 63, 70, 0.8)',
    textBg: 'rgba(0, 0, 0, 0.95)',
    textColor: '#fafafa',
    accentColor: '#a1a1aa',
    previewColor: '#000000'
  }
];

export const NOTE_SIZE_PRESETS = [
  { id: 'small', label: 'Compact', width: 240, height: 320 },
  { id: 'medium', label: 'Medium', width: 270, height: 420 },
  { id: 'large', label: 'Large', width: 340, height: 500 },
  { id: 'wide', label: 'Wide', width: 420, height: 360 }
];

export const NOTE_FONTS = [
  { id: 'sans', label: 'Sans', fontCss: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` },
  { id: 'mono', label: 'Mono', fontCss: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace` },
  { id: 'serif', label: 'Serif', fontCss: `Georgia, Cambria, 'Times New Roman', Times, serif` },
  { id: 'handwriting', label: 'Cursive', fontCss: `'Caveat', 'Segoe Print', 'Comic Sans MS', cursive` }
];

export const NOTE_FONT_SIZES = [
  { id: 11, label: '11px' },
  { id: 13, label: '13px' },
  { id: 15, label: '15px' },
  { id: 17, label: '17px' }
];

export const DEFAULT_NOTE_STYLES = {
  preset: 'medium', // 'small' | 'medium' | 'large' | 'wide' | 'custom'
  width: 270,
  height: 420,
  fontSize: 13,
  fontFamily: 'sans', // 'sans' | 'mono' | 'serif' | 'handwriting'
  theme: 'slate', // 'slate' | 'amber' | 'blue' | 'emerald' | 'purple' | 'rose' | 'oled' | 'custom'
  customBg: '',
  customText: ''
};

export const NEWTAB_SOLID_PRESETS = [
  { id: 'default', label: 'Theme Default', hex: '', isDark: null },
  { id: 'slate', label: 'Midnight Slate', hex: '#0f172a', isDark: true },
  { id: 'charcoal', label: 'Charcoal', hex: '#18181b', isDark: true },
  { id: 'navy', label: 'Deep Navy', hex: '#0b192f', isDark: true },
  { id: 'forest', label: 'Deep Forest', hex: '#0a221c', isDark: true },
  { id: 'plum', label: 'Dark Plum', hex: '#1f1329', isDark: true },
  { id: 'paper', label: 'Soft Paper', hex: '#f8fafc', isDark: false },
  { id: 'sand', label: 'Warm Sand', hex: '#f5efe6', isDark: false }
];

export const NEWTAB_GRADIENT_PRESETS = [
  {
    id: 'aurora',
    label: 'Aurora',
    css: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 52%, #0f2e2b 100%)',
    isDark: true
  },
  {
    id: 'dusk',
    label: 'Twilight Dusk',
    css: 'linear-gradient(135deg, #1e1b4b 0%, #3b1d5e 52%, #4a1942 100%)',
    isDark: true
  },
  {
    id: 'ocean',
    label: 'Deep Ocean',
    css: 'linear-gradient(135deg, #082f49 0%, #0e4a6f 50%, #155e75 100%)',
    isDark: true
  },
  {
    id: 'emerald',
    label: 'Pine Mist',
    css: 'linear-gradient(135deg, #052e16 0%, #064e3b 52%, #115e59 100%)',
    isDark: true
  },
  {
    id: 'sunset',
    label: 'Warm Horizon',
    css: 'linear-gradient(135deg, #2b1820 0%, #5c2434 52%, #7c3a2d 100%)',
    isDark: true
  },
  {
    id: 'daylight',
    label: 'Soft Daylight',
    css: 'linear-gradient(135deg, #eef2ff 0%, #e0f2fe 52%, #f0fdf4 100%)',
    isDark: false
  }
];

export const NEWTAB_PREFS_UPDATED_EVENT = 'klarity:newtab-prefs-updated';

export const DEFAULT_NEWTAB_PREFS = {
  // Background & visual appearance
  backgroundStyle: 'slate', // 'slate' | 'gradient' | 'wallpaper'
  solidColor: 'default', // preset id or custom '#rrggbb'
  gradientPreset: 'aurora',
  wallpaperUrl: '',
  wallpaperDim: 45, // 0 - 85
  wallpaperBlur: false,
  surfaceContrast: 'auto', // 'auto' | 'light' | 'dark'

  // Search bar
  showSearchBar: true,
  searchBarStyle: 'standard', // 'standard' | 'compact'

  // Quick links (Speed Dial) & Top Visited
  showQuickLinks: true,
  showTopVisited: false,
  quickLinksColumns: 6, // 4 | 6 | 8
  quickLinksStyle: 'card', // 'card' | 'icon_only'

  // Clock & greeting
  showClock: true,
  clockFormat: '12h', // '12h' | '24h'
  showSeconds: false,
  showDate: true,
  greetingName: '',
  greetingSubtitle: '',

  // Notes & Klarity widgets
  showNotes: false,
  pinnedNoteSectionId: '',
  showFinanceGlance: false,
  financeGlanceMasked: true,

  // Layout
  layoutMode: 'centered', // 'centered' | 'dashboard'
  layoutDensity: 'spacious', // 'spacious' | 'compact'

  notesPosition: null,
  noteStyles: { ...DEFAULT_NOTE_STYLES }
};

export const NEWTAB_LAYOUT_PRESETS = [
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean clock & search bar',
    patch: {
      showClock: true,
      showDate: true,
      showSeconds: false,
      showSearchBar: true,
      searchBarStyle: 'compact',
      showQuickLinks: false,
      showNotes: false,
      showFinanceGlance: false,
      layoutMode: 'centered',
      layoutDensity: 'compact'
    }
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Search, clock & speed dial',
    patch: {
      showClock: true,
      showDate: true,
      showSeconds: false,
      showSearchBar: true,
      searchBarStyle: 'standard',
      showQuickLinks: true,
      quickLinksColumns: 6,
      quickLinksStyle: 'card',
      showNotes: false,
      showFinanceGlance: false,
      layoutMode: 'centered',
      layoutDensity: 'spacious'
    }
  },
  {
    id: 'productivity',
    label: 'Productivity',
    description: 'Dashboard with notes & bills',
    patch: {
      showClock: true,
      showDate: true,
      showSeconds: false,
      showSearchBar: true,
      searchBarStyle: 'compact',
      showQuickLinks: true,
      quickLinksColumns: 6,
      quickLinksStyle: 'card',
      showNotes: true,
      showFinanceGlance: true,
      layoutMode: 'dashboard',
      layoutDensity: 'compact'
    }
  }
];

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
    if (!raw) return { ...DEFAULT_NEWTAB_PREFS, noteStyles: { ...DEFAULT_NOTE_STYLES } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NEWTAB_PREFS,
      ...(parsed && typeof parsed === 'object' ? parsed : {}),
      noteStyles: {
        ...DEFAULT_NOTE_STYLES,
        ...(parsed?.noteStyles && typeof parsed.noteStyles === 'object' ? parsed.noteStyles : {})
      }
    };
  } catch {
    return { ...DEFAULT_NEWTAB_PREFS, noteStyles: { ...DEFAULT_NOTE_STYLES } };
  }
}

export function saveNewTabPrefs(prefs) {
  try {
    const serialized = JSON.stringify(prefs);
    const prev = localStorage.getItem(NEWTAB_PREFS_KEY);
    if (prev !== serialized) {
      localStorage.setItem(NEWTAB_PREFS_KEY, serialized);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(NEWTAB_PREFS_UPDATED_EVENT, { detail: prefs }));
      }
    }
  } catch {}
}

export function isHexColorDark(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(clean)) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.52;
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
    const val = String(notes || '');
    const prev = localStorage.getItem(NEWTAB_NOTES_KEY) || '';
    if (prev !== val) {
      localStorage.setItem(NEWTAB_NOTES_KEY, val);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('klarity:notes-updated', { detail: { notes: val } }));
      }
    }
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

export function isDirectUrlInput(input) {
  const clean = String(input || '').trim();
  if (!clean) return false;
  if (clean.toLowerCase() === NEW_TAB_URL) return true;
  if (/^https?:\/\/\S+/i.test(clean)) return true;
  if (
    /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(clean) ||
    /^localhost(:\d+)?(\/\S*)?$/i.test(clean)
  ) {
    return true;
  }
  return false;
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

  if (isDirectUrlInput(clean)) {
    return `https://${clean}`;
  }

  return buildSearchUrl(clean, engineId);
}
