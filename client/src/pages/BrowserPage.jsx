import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  Plus,
  Folder,
  FolderPlus,
  Bookmark,
  Trash2,
  Send,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import {
  DEFAULT_BROWSER_SETTINGS,
  getSearchEngineById,
  getBrowserHomeUrl,
  resolveBrowserDestination
} from '../utils/browserSettings';

export function BrowserPage({
  onAskAdvisor,
  activeBrowserContext,
  setActiveBrowserContext,
  browserSettings = DEFAULT_BROWSER_SETTINGS,
  browserBookmarks = [],
  onUpdateBookmarks,
  pendingBrowserUrl = '',
  onClearPendingBrowserUrl,
  onOpenBrowserSettings
}) {
  const activeEngine = getSearchEngineById(browserSettings?.searchEngine);
  const homeUrl = getBrowserHomeUrl(browserSettings);

  // Use a stable initial src ref so React re-renders from did-navigate NEVER reload <webview>
  const initialSrcRef = useRef(pendingBrowserUrl || homeUrl);

  const [urlInput, setUrlInput] = useState(initialSrcRef.current);
  const [currentUrl, setCurrentUrl] = useState(initialSrcRef.current);
  const [pageTitle, setPageTitle] = useState('Klarity Browser');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // Ad Blocker State
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [adsBlockedCount, setAdsBlockedCount] = useState(0);
  const [isAdBlockPopoverOpen, setIsAdBlockPopoverOpen] = useState(false);
  const adBlockPopoverRef = useRef(null);

  // AI Quick-Ask Popover State
  const [isAiPopoverOpen, setIsAiPopoverOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const aiPopoverRef = useRef(null);
  const aiInputRef = useRef(null);

  // Add Bookmark / Folder Popover State
  const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
  const [addMode, setAddMode] = useState('bookmark'); // 'bookmark' | 'folder'
  const [bmTitleInput, setBmTitleInput] = useState('');
  const [bmUrlInput, setBmUrlInput] = useState('');
  const [bmFolderId, setBmFolderId] = useState('');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [openFolderId, setOpenFolderId] = useState(null);
  const addBookmarkRef = useRef(null);
  const bookmarksBarRef = useRef(null);

  const webviewRef = useRef(null);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.klarityDesktop?.isDesktopApp);

  // Initialize and subscribe to Ad Blocker Stats from Electron
  useEffect(() => {
    let unsubscribe = null;
    if (isDesktop && window.klarityDesktop?.getAdBlockStats) {
      window.klarityDesktop
        .getAdBlockStats()
        .then((stats) => {
          if (stats) {
            if (stats.adsBlockedCount != null) setAdsBlockedCount(stats.adsBlockedCount);
            if (stats.enabled != null) setAdBlockEnabled(stats.enabled);
          }
        })
        .catch(() => {});

      if (window.klarityDesktop?.onAdBlockStats) {
        unsubscribe = window.klarityDesktop.onAdBlockStats((stats) => {
          if (stats) {
            if (stats.adsBlockedCount != null) setAdsBlockedCount(stats.adsBlockedCount);
            if (stats.enabled != null) setAdBlockEnabled(stats.enabled);
          }
        });
      }
    }
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isDesktop]);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adBlockPopoverRef.current && !adBlockPopoverRef.current.contains(e.target)) {
        setIsAdBlockPopoverOpen(false);
      }
      if (aiPopoverRef.current && !aiPopoverRef.current.contains(e.target)) {
        setIsAiPopoverOpen(false);
      }
      if (addBookmarkRef.current && !addBookmarkRef.current.contains(e.target)) {
        setIsAddBookmarkOpen(false);
      }
      if (bookmarksBarRef.current && !bookmarksBarRef.current.contains(e.target)) {
        setOpenFolderId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus AI question input when popover opens
  useEffect(() => {
    if (isAiPopoverOpen) {
      setTimeout(() => aiInputRef.current?.focus(), 40);
    }
  }, [isAiPopoverOpen]);

  // Navigate when AI Advisor triggers an "Open in Browser" link
  useEffect(() => {
    if (pendingBrowserUrl) {
      navigateTo(pendingBrowserUrl);
      if (typeof onClearPendingBrowserUrl === 'function') {
        onClearPendingBrowserUrl();
      }
    }
  }, [pendingBrowserUrl]);

  // Safe page content extractor that runs inside the webview to feed AI
  const extractPageContent = async () => {
    if (browserSettings?.aiPageReaderEnabled === false) {
      setActiveBrowserContext(null);
      return;
    }
    const webview = webviewRef.current;
    if (!webview || typeof webview.executeJavaScript !== 'function') return;

    try {
      const script = `
        (() => {
          try {
            const title = document.title || '';
            const href = window.location.href || '';
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            const clone = document.body ? document.body.cloneNode(true) : null;
            if (!clone) return { title, url: href, text: metaDesc };
            const badElements = clone.querySelectorAll('script, style, noscript, nav, footer, iframe, svg, [aria-hidden="true"]');
            badElements.forEach(el => el.remove());
            let text = clone.innerText || clone.textContent || '';
            text = text.replace(/\\s+/g, ' ').trim();
            return {
              title,
              url: href,
              metaDescription: metaDesc,
              text: text.slice(0, 16000)
            };
          } catch (e) {
            return { title: document.title, url: window.location.href, text: '' };
          }
        })()
      `;
      const res = await webview.executeJavaScript(script);
      if (res && (res.title || res.text || res.url)) {
        setActiveBrowserContext({
          title: res.title || pageTitle,
          url: res.url || currentUrl,
          text: res.text || '',
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.warn('Browser content extraction note:', err.message);
    }
  };

  // Setup Webview event listeners in Electron
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => {
      setIsLoading(false);
      try {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
        const rawUrl = webview.getURL();
        if (rawUrl) {
          setCurrentUrl(rawUrl);
          setUrlInput(rawUrl);
        }
        const rawTitle = webview.getTitle();
        if (rawTitle) setPageTitle(rawTitle);
      } catch {}
      extractPageContent();
    };

    const handleDidNavigate = (e) => {
      if (e.url) {
        setCurrentUrl(e.url);
        setUrlInput(e.url);
      }
      try {
        setCanGoBack(webview.canGoBack());
        setCanGoForward(webview.canGoForward());
      } catch {}
    };

    const handleTitleUpdate = (e) => {
      if (e.title) setPageTitle(e.title);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('page-title-updated', handleTitleUpdate);

    return () => {
      try {
        webview.removeEventListener('did-start-loading', handleStartLoading);
        webview.removeEventListener('did-stop-loading', handleStopLoading);
        webview.removeEventListener('did-navigate', handleDidNavigate);
        webview.removeEventListener('did-navigate-in-page', handleDidNavigate);
        webview.removeEventListener('page-title-updated', handleTitleUpdate);
      } catch {}
    };
  }, [browserSettings?.aiPageReaderEnabled]);

  const navigateTo = (destination) => {
    const target = resolveBrowserDestination(destination, browserSettings?.searchEngine);
    if (!target) return;

    setUrlInput(target);
    setCurrentUrl(target);
    if (webviewRef.current) {
      try {
        if (typeof webviewRef.current.loadURL === 'function') {
          webviewRef.current.loadURL(target);
        } else {
          webviewRef.current.src = target;
        }
      } catch {
        webviewRef.current.src = target;
      }
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    navigateTo(urlInput);
  };

  const handleBack = () => {
    if (webviewRef.current && webviewRef.current.canGoBack()) {
      webviewRef.current.goBack();
    }
  };

  const handleForward = () => {
    if (webviewRef.current && webviewRef.current.canGoForward()) {
      webviewRef.current.goForward();
    }
  };

  const handleReload = () => {
    if (webviewRef.current) {
      if (isLoading) {
        webviewRef.current.stop();
        setIsLoading(false);
      } else {
        webviewRef.current.reload();
      }
    }
  };

  const handleHome = () => {
    navigateTo(getBrowserHomeUrl(browserSettings));
  };

  const handleToggleAdBlock = async () => {
    if (window.klarityDesktop?.toggleAdBlock) {
      const nextState = !adBlockEnabled;
      setAdBlockEnabled(nextState);
      try {
        const stats = await window.klarityDesktop.toggleAdBlock(nextState);
        if (stats) {
          setAdBlockEnabled(stats.enabled);
          setAdsBlockedCount(stats.adsBlockedCount);
        }
      } catch {}
    } else {
      setAdBlockEnabled((prev) => !prev);
    }
  };

  const handleResetAdBlockCount = async () => {
    if (window.klarityDesktop?.resetAdBlockCount) {
      try {
        await window.klarityDesktop.resetAdBlockCount();
        setAdsBlockedCount(0);
      } catch {}
    } else {
      setAdsBlockedCount(0);
    }
  };

  const handleSendAiQuestion = (customPrompt) => {
    if (typeof onAskAdvisor !== 'function') return;
    const raw = (typeof customPrompt === 'string' ? customPrompt : aiQuestion).trim();
    const prompt =
      raw ||
      `I am currently looking at "${pageTitle}" (${currentUrl}). Can you review what's on this page and summarize the key points?`;
    onAskAdvisor(prompt);
    setAiQuestion('');
    setIsAiPopoverOpen(false);
  };

  // Bookmark & Folder CRUD
  const folders = browserBookmarks.filter((item) => item.type === 'folder');
  const rootItems = browserBookmarks.filter((item) => !item.folderId);

  const openAddPopover = (presetFolderId = '') => {
    setAddMode('bookmark');
    setBmTitleInput(pageTitle && pageTitle !== 'Klarity Browser' ? pageTitle : '');
    setBmUrlInput(currentUrl || '');
    setBmFolderId(presetFolderId || '');
    setFolderNameInput('');
    setIsAddBookmarkOpen(true);
    setOpenFolderId(null);
  };

  const handleSaveBookmarkOrFolder = (e) => {
    e.preventDefault();
    if (typeof onUpdateBookmarks !== 'function') return;

    if (addMode === 'folder') {
      const cleanName = folderNameInput.trim();
      if (!cleanName) return;
      const nextFolder = {
        id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'folder',
        title: cleanName
      };
      onUpdateBookmarks([...browserBookmarks, nextFolder]);
      setFolderNameInput('');
      setIsAddBookmarkOpen(false);
      return;
    }

    const cleanUrl = resolveBrowserDestination(bmUrlInput, browserSettings?.searchEngine);
    if (!cleanUrl) return;
    let fallbackTitle = cleanUrl;
    try {
      fallbackTitle = new URL(cleanUrl).hostname.replace(/^www\./, '');
    } catch {}
    const nextBm = {
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: 'bookmark',
      title: bmTitleInput.trim() || fallbackTitle,
      url: cleanUrl,
      folderId: bmFolderId || null
    };
    onUpdateBookmarks([...browserBookmarks, nextBm]);
    setIsAddBookmarkOpen(false);
  };

  const handleDeleteBookmarkItem = (id, e) => {
    if (e) e.stopPropagation();
    if (typeof onUpdateBookmarks !== 'function') return;
    onUpdateBookmarks(browserBookmarks.filter((item) => item.id !== id && item.folderId !== id));
    if (openFolderId === id) setOpenFolderId(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-hidden flex-1 min-h-0">
      {/* 1. TOP BROWSER CONTROLS & SMART ADDRESS BAR */}
      <div className="shrink-0 bg-[var(--surface)] border-b border-[var(--line)] px-4 py-2.5 flex flex-col gap-2 shadow-2xs relative z-30">
        <div className="flex items-center gap-2">
          {/* Navigation Buttons: Back, Forward, Reload, Home */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleBack}
              disabled={!canGoBack}
              aria-label="Back"
              title="Back"
              className={`p-1.5 rounded-lg border border-[var(--line)] transition-colors ${
                canGoBack
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={!canGoForward}
              aria-label="Forward"
              title="Forward"
              className={`p-1.5 rounded-lg border border-[var(--line)] transition-colors ${
                canGoForward
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleReload}
              aria-label={isLoading ? 'Stop loading' : 'Reload page'}
              title={isLoading ? 'Stop loading' : 'Reload page'}
              className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[var(--brand)]' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleHome}
              aria-label="Browser Home"
              title={`Home (${activeEngine.name})`}
              className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>

          {/* Smart Address & Search Input */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center min-w-0">
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20 transition-all">
              {currentUrl.startsWith('https://') ? (
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" title="Secure connection (HTTPS)" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
              )}
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder={`Search ${activeEngine.name} or enter URL...`}
                className="flex-1 bg-transparent border-0 outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)] min-w-0 font-medium"
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  aria-label="Clear URL"
                  className="p-0.5 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </form>

          {/* Ad Blocker Status & Popover */}
          <div className="relative shrink-0" ref={adBlockPopoverRef}>
            <button
              type="button"
              onClick={() => setIsAdBlockPopoverOpen((prev) => !prev)}
              title="Built-in Ad & Tracker Blocker"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                adBlockEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-[var(--surface-subtle)] border-[var(--line)] text-[var(--muted)]'
              }`}
            >
              {adBlockEnabled ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600" />
              )}
              <span className="hidden sm:inline">
                {adBlockEnabled ? `${adsBlockedCount} Blocked` : 'Ad Block Off'}
              </span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {isAdBlockPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-[var(--ink)]">Klarity Ad Blocker</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      adBlockEnabled
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {adBlockEnabled ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                  Blocks display ads, pop-unders, and third-party tracking scripts at the network level before they load.
                </p>
                <div className="flex items-center justify-between bg-[var(--surface-subtle)] p-2.5 rounded-xl border border-[var(--line)]">
                  <span className="text-xs font-medium text-[var(--ink)]">Trackers &amp; Ads Blocked</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{adsBlockedCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleToggleAdBlock}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      adBlockEnabled
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {adBlockEnabled ? 'Pause Blocker' : 'Enable Blocker'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAdBlockCount}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Compact AI Icon Button & Interactive Page Q&A Popover */}
          <div className="relative shrink-0" ref={aiPopoverRef}>
            <button
              type="button"
              onClick={() => setIsAiPopoverOpen((prev) => !prev)}
              className="flex items-center justify-center p-1.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white transition-all cursor-pointer shadow-2xs shrink-0"
              title="Ask AI about the current page"
              aria-label="Ask AI about the current page"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            {isAiPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-[var(--brand)] shrink-0" />
                    <span className="text-xs font-bold text-[var(--ink)] truncate">Ask AI about this page</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiPopoverOpen(false)}
                    className="p-0.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                    aria-label="Close AI popover"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-[var(--muted)] bg-[var(--surface-subtle)] px-2.5 py-1.5 rounded-lg border border-[var(--line)] truncate">
                  {pageTitle || currentUrl}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendAiQuestion();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    placeholder="Ask a question about this page..."
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)]"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white cursor-pointer shrink-0 transition-colors"
                    title="Send to AI Advisor"
                    aria-label="Send question"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSendAiQuestion('Can you summarize the main points, rates, or figures on this page?')}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-medium text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
                  >
                    Summarize
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiQuestion('Please extract all pricing, fees, bill amounts, or interest rates mentioned on this page.')}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-medium text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
                  >
                    Extract Rates
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendAiQuestion('Based on my financial accounts and budget, is what is offered on this page a good deal for me?')}
                    className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-medium text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
                  >
                    Is This a Good Deal?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Browser Settings Shortcut */}
          {typeof onOpenBrowserSettings === 'function' && (
            <button
              type="button"
              onClick={onOpenBrowserSettings}
              aria-label="Browser settings"
              title="Browser settings"
              className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shrink-0"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 2. SECONDARY BAR: USER BOOKMARKS, FOLDERS & "+" BUTTON */}
        {browserSettings?.showBookmarksBar !== false && (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap" ref={bookmarksBarRef}>
            {rootItems.map((item) => {
              if (item.type === 'folder') {
                const folderChildren = browserBookmarks.filter((b) => b.folderId === item.id);
                const isFolderOpen = openFolderId === item.id;
                return (
                  <div key={item.id} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenFolderId(isFolderOpen ? null : item.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[11px] text-[var(--ink)] font-medium transition-colors cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="max-w-[140px] truncate">{item.title}</span>
                      <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
                    </button>

                    {isFolderOpen && (
                      <div className="absolute left-0 top-full mt-1.5 w-60 p-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-xl z-50 flex flex-col gap-0.5">
                        {folderChildren.length === 0 ? (
                          <div className="px-2.5 py-2 text-[11px] text-[var(--muted)] text-center">
                            Empty folder
                          </div>
                        ) : (
                          folderChildren.map((child) => (
                            <div
                              key={child.id}
                              className="group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  navigateTo(child.url);
                                  setOpenFolderId(null);
                                }}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                title={child.url}
                              >
                                <Bookmark className="w-3 h-3 text-[var(--brand)] shrink-0" />
                                <span className="text-xs font-medium text-[var(--ink)] truncate">{child.title}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteBookmarkItem(child.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer transition-opacity"
                                title="Remove bookmark"
                                aria-label={`Remove ${child.title}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                        <div className="border-t border-[var(--line)] mt-1 pt-1 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => openAddPopover(item.id)}
                            className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-[var(--surface-subtle)] text-[11px] font-medium text-[var(--brand)] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add page here</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBookmarkItem(item.id, e)}
                            className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[var(--muted)] hover:text-rose-600 cursor-pointer"
                            title="Delete folder"
                            aria-label={`Delete folder ${item.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[11px] text-[var(--ink)] font-medium transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => navigateTo(item.url)}
                    className="flex items-center gap-1.5 cursor-pointer max-w-[160px]"
                    title={item.url}
                  >
                    <Bookmark className="w-3 h-3 text-[var(--brand)] shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteBookmarkItem(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--muted)] hover:text-rose-600 cursor-pointer transition-opacity"
                    title="Remove bookmark"
                    aria-label={`Remove ${item.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* "+" Button to Add Bookmark or Folder */}
            <div className="relative" ref={addBookmarkRef}>
              <button
                type="button"
                onClick={() => {
                  if (isAddBookmarkOpen) {
                    setIsAddBookmarkOpen(false);
                  } else {
                    openAddPopover('');
                  }
                }}
                aria-label="Add bookmark or folder"
                title="Add bookmark or folder"
                className="flex items-center justify-center w-6 h-6 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[var(--ink)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {isAddBookmarkOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setAddMode('bookmark')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'bookmark'
                          ? 'bg-[var(--surface)] text-[var(--ink)] shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Bookmark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('folder')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'folder'
                          ? 'bg-[var(--surface)] text-[var(--ink)] shadow-2xs'
                          : 'text-[var(--muted)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>New Folder</span>
                    </button>
                  </div>

                  <form onSubmit={handleSaveBookmarkOrFolder} className="flex flex-col gap-2.5">
                    {addMode === 'bookmark' ? (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Name</label>
                          <input
                            type="text"
                            value={bmTitleInput}
                            onChange={(e) => setBmTitleInput(e.target.value)}
                            placeholder="Bookmark name"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">URL</label>
                          <input
                            type="text"
                            required
                            value={bmUrlInput}
                            onChange={(e) => setBmUrlInput(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Folder</label>
                          <select
                            value={bmFolderId}
                            onChange={(e) => setBmFolderId(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                          >
                            <option value="">Bookmarks Bar (No Folder)</option>
                            {folders.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--muted)] mb-1">Folder Name</label>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={folderNameInput}
                          onChange={(e) => setFolderNameInput(e.target.value)}
                          placeholder="e.g. Bills, Investing, Shopping"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddBookmarkOpen(false)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. BROWSER CONTENT CANVAS */}
      <div className="flex-1 w-full relative bg-[var(--surface)] min-h-0 h-full overflow-hidden">
        {isDesktop ? (
          <webview
            ref={webviewRef}
            src={initialSrcRef.current}
            partition="persist:klarity_browser"
            className="w-full h-full border-0 absolute inset-0"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              border: 'none',
              outline: 'none'
            }}
            allowpopups="true"
            webpreferences="contextIsolation=true, sandbox=true"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--surface-subtle)]">
            <Card className="max-w-md p-6 flex flex-col items-center gap-4 text-center shadow-lg">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)]">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[var(--ink)]">In-App Browser &amp; Ad Blocker</h3>
                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                  Full embedded browsing with hardware ad blocking and real-time AI page reading runs natively in the Klarity Desktop application.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => window.open(currentUrl, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open {(() => {
                    try {
                      return new URL(currentUrl).hostname;
                    } catch {
                      return 'Page';
                    }
                  })()}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
