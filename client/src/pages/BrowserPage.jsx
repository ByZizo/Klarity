import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Search,
  Globe,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  FileText,
  DollarSign,
  HelpCircle,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { Button, Card, Pill } from '../components/ui';

const DEFAULT_HOME_URL = 'https://duckduckgo.com';

const QUICK_BOOKMARKS = [
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: Search },
  { label: 'IRS.gov', url: 'https://www.irs.gov', icon: FileText },
  { label: 'CFPB', url: 'https://www.consumerfinance.gov', icon: ShieldCheck },
  { label: 'Bankrate Rates', url: 'https://www.bankrate.com', icon: DollarSign },
  { label: 'TreasuryDirect', url: 'https://www.treasurydirect.gov', icon: Lock },
  { label: 'FRED Economic Data', url: 'https://fred.stlouisfed.org', icon: Globe }
];

export function BrowserPage({
  onAskAdvisor,
  activeBrowserContext,
  setActiveBrowserContext
}) {
  const [urlInput, setUrlInput] = useState(DEFAULT_HOME_URL);
  const [currentUrl, setCurrentUrl] = useState(DEFAULT_HOME_URL);
  const [pageTitle, setPageTitle] = useState('Klarity Browser');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  
  // Ad Blocker State
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [adsBlockedCount, setAdsBlockedCount] = useState(0);
  const [isAdBlockPopoverOpen, setIsAdBlockPopoverOpen] = useState(false);
  const adBlockPopoverRef = useRef(null);

  const webviewRef = useRef(null);
  const isDesktop = typeof window !== 'undefined' && Boolean(window.klarityDesktop?.isDesktopApp);

  // Initialize and subscribe to Ad Blocker Stats from Electron
  useEffect(() => {
    let unsubscribe = null;
    if (isDesktop && window.klarityDesktop?.getAdBlockStats) {
      window.klarityDesktop.getAdBlockStats().then(stats => {
        if (stats) {
          if (stats.adsBlockedCount != null) setAdsBlockedCount(stats.adsBlockedCount);
          if (stats.enabled != null) setAdBlockEnabled(stats.enabled);
        }
      }).catch(() => {});

      if (window.klarityDesktop?.onAdBlockStats) {
        unsubscribe = window.klarityDesktop.onAdBlockStats(stats => {
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

  // Close ad block popover on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adBlockPopoverRef.current && !adBlockPopoverRef.current.contains(e.target)) {
        setIsAdBlockPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe page content extractor that runs inside the webview to feed AI
  const extractPageContent = async () => {
    const webview = webviewRef.current;
    if (!webview || typeof webview.executeJavaScript !== 'function') return;

    try {
      const script = `
        (() => {
          try {
            const title = document.title || '';
            const href = window.location.href || '';
            const metaDesc = document.querySelector('meta[name="description"]')?.content || '';
            
            // Clone body to strip non-content tags safely
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
  }, [webviewRef.current]);

  const navigateTo = (destination) => {
    let clean = (destination || '').trim();
    if (!clean) return;

    // Check if user entered a search query or a domain/URL
    const isUrl = /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(clean) && !clean.includes(' ');
    let target = clean;
    if (isUrl) {
      if (!/^https?:\/\//i.test(target)) {
        target = `https://${target}`;
      }
    } else {
      // Search via DuckDuckGo
      target = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
    }

    setUrlInput(target);
    setCurrentUrl(target);
    if (webviewRef.current) {
      try {
        webviewRef.current.loadURL(target);
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
    navigateTo(DEFAULT_HOME_URL);
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
      setAdBlockEnabled(prev => !prev);
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

  const handleAskAiAboutPage = (customPrompt) => {
    if (typeof onAskAdvisor !== 'function') return;
    const prompt = customPrompt || `I am currently looking at "${pageTitle}" (${currentUrl}). Can you review what's on this page and summarize the key points or details I should know?`;
    onAskAdvisor(prompt);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-hidden">
      {/* 1. TOP BROWSER CONTROLS & SMART ADDRESS BAR */}
      <div className="shrink-0 bg-[var(--surface)] border-b border-[var(--line)] px-4 py-2.5 flex flex-col gap-2 shadow-2xs">
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
              title="Browser Home (DuckDuckGo)"
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
                placeholder="Search DuckDuckGo or enter URL (e.g. pge.com, irs.gov)..."
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
              onClick={() => setIsAdBlockPopoverOpen(prev => !prev)}
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

            {/* Ad Blocker Popover */}
            {isAdBlockPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3.5 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl z-50 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-[var(--ink)]">Klarity Ad Blocker</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    adBlockEnabled ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {adBlockEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink)]">Block Ads & Trackers</p>
                    <p className="text-[11px] text-[var(--muted)]">Stops intrusive ads, pop-ups, and trackers</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAdBlock}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      adBlockEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                    role="switch"
                    aria-checked={adBlockEnabled}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        adBlockEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[var(--muted)] block">Total Ads Blocked</span>
                    <span className="text-sm font-bold text-[var(--ink)]">{adsBlockedCount.toLocaleString()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAdBlockCount}
                    className="text-[11px] text-[var(--brand)] hover:underline font-semibold cursor-pointer"
                  >
                    Reset Count
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ask AI About Page Button */}
          <button
            type="button"
            onClick={() => handleAskAiAboutPage()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
            title="Ask AI Advisor about the current page"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ask AI About Page</span>
          </button>
        </div>

        {/* 2. SECONDARY BAR: QUICK BOOKMARKS & AI QUICK CHIPS */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pt-1">
          {/* Quick Bookmarks */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] uppercase font-bold text-[var(--muted)] tracking-wider mr-1">Quick:</span>
            {QUICK_BOOKMARKS.map((bm) => {
              const Icon = bm.icon;
              return (
                <button
                  key={bm.url}
                  type="button"
                  onClick={() => navigateTo(bm.url)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[11px] text-[var(--ink)] font-medium transition-colors cursor-pointer"
                >
                  <Icon className="w-3 h-3 text-[var(--brand)]" />
                  <span>{bm.label}</span>
                </button>
              );
            })}
          </div>

          {/* AI Page Sync Badge & Quick Prompts */}
          <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-[var(--line)]">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>AI Page Reader Active</span>
            </div>
            <button
              type="button"
              onClick={() => handleAskAiAboutPage("Can you summarize the main points, rates, or figures on this page?")}
              className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
            >
              Summarize
            </button>
            <button
              type="button"
              onClick={() => handleAskAiAboutPage("Please extract all pricing, fees, bill amounts, or interest rates mentioned on this page.")}
              className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
            >
              Extract Rates / Bills
            </button>
            <button
              type="button"
              onClick={() => handleAskAiAboutPage("Based on my financial accounts and budget, is what's offered on this page a good deal or practical decision for me?")}
              className="px-2 py-1 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] text-[11px] font-semibold text-[var(--ink)] hover:text-[var(--brand)] border border-[var(--line)] transition-colors cursor-pointer"
            >
              Is This a Good Deal?
            </button>
          </div>
        </div>
      </div>

      {/* 3. BROWSER CONTENT CANVAS */}
      <div className="flex-1 w-full relative bg-[var(--surface)]">
        {isDesktop ? (
          <webview
            ref={webviewRef}
            src={currentUrl}
            partition="persist:klarity_browser"
            className="w-full h-full border-0"
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
                  Open {new URL(currentUrl).hostname}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
