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
  Settings as SettingsIcon,
  Pin,
  Volume2,
  VolumeX,
  Copy,
  RotateCcw,
  MessageSquare,
  Bot
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import { NewTabPage } from '../components/NewTabPage';
import {
  buildYouTubeAdShieldScript,
  buildSponsorBlockScript,
  buildDeArrowScript
} from '../utils/browserShield';
import {
  DEFAULT_BROWSER_SETTINGS,
  NEW_TAB_URL,
  TAB_GROUP_COLORS,
  getSearchEngineById,
  getBrowserHomeUrl,
  isNewTabUrl,
  resolveBrowserDestination,
  loadBrowserSessionState,
  saveBrowserSessionState
} from '../utils/browserSettings';

function createTabObject(url, title = 'New Tab', extra = {}) {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url,
    initialUrl: url,
    title,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    isPinned: false,
    isMuted: false,
    isPlayingMedia: false,
    groupId: null,
    ...extra
  };
}

function getInitialBrowserTabs(browserSettings, pendingBrowserUrl) {
  const homeUrl = getBrowserHomeUrl(browserSettings);
  const engineName = getSearchEngineById(browserSettings?.searchEngine).name;

  if (pendingBrowserUrl) {
    return {
      tabs: [createTabObject(pendingBrowserUrl, 'Loading...')],
      groups: [],
      activeTabId: null
    };
  }

  if (browserSettings?.startupMode === 'continue') {
    const saved = loadBrowserSessionState();
    if (saved && saved.tabs.length > 0) {
      return {
        tabs: saved.tabs.map((t) =>
          createTabObject(t.url || homeUrl, t.title || 'Tab', {
            id: t.id,
            isPinned: Boolean(t.isPinned),
            isMuted: Boolean(t.isMuted),
            groupId: t.groupId || null
          })
        ),
        groups: saved.groups || [],
        activeTabId: saved.activeTabId
      };
    }
  }

  if (
    browserSettings?.startupMode === 'specific_pages' &&
    Array.isArray(browserSettings?.startupPages) &&
    browserSettings.startupPages.length > 0
  ) {
    const validPages = browserSettings.startupPages
      .map((u) => resolveBrowserDestination(u, browserSettings?.searchEngine))
      .filter(Boolean);
    if (validPages.length > 0) {
      return {
        tabs: validPages.map((u) => createTabObject(u, u)),
        groups: [],
        activeTabId: null
      };
    }
  }

  return {
    tabs: [createTabObject(homeUrl, isNewTabUrl(homeUrl) ? 'New Tab' : engineName)],
    groups: [],
    activeTabId: null
  };
}

export function BrowserPage({
  onAskAdvisor,
  activeBrowserContext,
  setActiveBrowserContext,
  aiMemory = [],
  onUpdateAiMemory,
  currentUser,
  settingsAiProvider,
  settingsAiModel,
  browserSettings = DEFAULT_BROWSER_SETTINGS,
  browserBookmarks = [],
  onUpdateBookmarks,
  pendingBrowserUrl = '',
  onClearPendingBrowserUrl,
  onOpenBrowserSettings
}) {
  const activeEngine = getSearchEngineById(browserSettings?.searchEngine);
  const homeUrl = getBrowserHomeUrl(browserSettings);

  // Initialize tabs & groups once on mount
  const initDataRef = useRef(null);
  if (!initDataRef.current) {
    initDataRef.current = getInitialBrowserTabs(browserSettings, pendingBrowserUrl);
  }

  const [tabs, setTabs] = useState(initDataRef.current.tabs);
  const [tabGroups, setTabGroups] = useState(initDataRef.current.groups);
  const [activeTabId, setActiveTabId] = useState(
    initDataRef.current.activeTabId || initDataRef.current.tabs[0]?.id
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [urlInput, setUrlInput] = useState(isNewTabUrl(activeTab?.url) ? '' : (activeTab?.url || ''));
  const urlInputRef = useRef(null);

  // Drag & Drop Tab Reordering State
  const [draggedTabId, setDraggedTabId] = useState(null);

  // Tab Context Menu State
  const [tabContextMenu, setTabContextMenu] = useState(null); // { tabId, x, y }
  const contextMenuRef = useRef(null);

  // Tab Group Editor Popover State
  const [editingGroupId, setEditingGroupId] = useState(null);
  const groupEditorRef = useRef(null);

  // Ad Blocker State
  const [adBlockEnabled, setAdBlockEnabled] = useState(true);
  const [adsBlockedCount, setAdsBlockedCount] = useState(0);
  const [isAdBlockPopoverOpen, setIsAdBlockPopoverOpen] = useState(false);
  const adBlockPopoverRef = useRef(null);

  // Dedicated In-Browser AI Sidebar State (Self-contained, doesn't open global app advisor)
  const [isBrowserAiSidebarOpen, setIsBrowserAiSidebarOpen] = useState(false);
  const [browserAiMessages, setBrowserAiMessages] = useState([]);
  const [browserAiInput, setBrowserAiInput] = useState('');
  const [isBrowserAiLoading, setIsBrowserAiLoading] = useState(false);
  const browserAiMessagesEndRef = useRef(null);
  const browserAiInputRef = useRef(null);

  // Add Bookmark / Folder Popover State
  const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
  const [addMode, setAddMode] = useState('bookmark');
  const [bmTitleInput, setBmTitleInput] = useState('');
  const [bmUrlInput, setBmUrlInput] = useState('');
  const [bmFolderId, setBmFolderId] = useState('');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [openFolderId, setOpenFolderId] = useState(null);
  const addBookmarkRef = useRef(null);
  const bookmarksBarRef = useRef(null);

  // Map of tabId -> <webview> DOM element
  const webviewRefs = useRef({});
  const attachedListenersRef = useRef({});
  const isDesktop = typeof window !== 'undefined' && Boolean(window.klarityDesktop?.isDesktopApp);

  // Keep address bar synced when switching tabs
  useEffect(() => {
    if (activeTab) {
      if (isNewTabUrl(activeTab.url)) {
        setUrlInput('');
        setTimeout(() => urlInputRef.current?.focus(), 0);
      } else {
        setUrlInput(activeTab.url || '');
      }
    }
  }, [activeTabId]);

  // Persist open tabs & groups for "Continue where you left off"
  useEffect(() => {
    saveBrowserSessionState({
      tabs: tabs.map((t) => ({
        id: t.id,
        url: t.url,
        title: t.title,
        isPinned: t.isPinned,
        isMuted: t.isMuted,
        groupId: t.groupId
      })),
      groups: tabGroups,
      activeTabId
    });
  }, [tabs, tabGroups, activeTabId]);

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

  // Close popovers and context menus on outside click
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
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setTabContextMenu(null);
      }
      if (groupEditorRef.current && !groupEditorRef.current.contains(e.target)) {
        setEditingGroupId(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setTabContextMenu(null);
        setEditingGroupId(null);
        setIsAiPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Focus and scroll Browser AI input when sidebar opens or new message arrives
  useEffect(() => {
    if (isBrowserAiSidebarOpen) {
      setTimeout(() => {
        browserAiInputRef.current?.focus();
        browserAiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [isBrowserAiSidebarOpen, browserAiMessages.length]);

  // Apply page zoom setting to all mounted webviews
  useEffect(() => {
    const factor = Math.max(0.5, Math.min(2.5, Number(browserSettings?.pageZoom || 100) / 100));
    Object.values(webviewRefs.current).forEach((wv) => {
      if (wv && typeof wv.setZoomFactor === 'function') {
        try {
          wv.setZoomFactor(factor);
        } catch {}
      }
    });
  }, [browserSettings?.pageZoom, tabs.length]);

  // Navigate when AI Advisor triggers "Open in Browser"
  useEffect(() => {
    if (pendingBrowserUrl) {
      navigateTo(pendingBrowserUrl);
      if (typeof onClearPendingBrowserUrl === 'function') {
        onClearPendingBrowserUrl();
      }
    }
  }, [pendingBrowserUrl]);

  // Extract page content for AI Advisor from a specific tab's webview
  const extractPageContentForTab = async (tabId) => {
    if (browserSettings?.aiPageReaderEnabled === false) {
      setActiveBrowserContext(null);
      return null;
    }
    const tab = tabs.find((t) => t.id === tabId);
    if (tab && isNewTabUrl(tab.url)) {
      setActiveBrowserContext(null);
      return null;
    }

    const webview = webviewRefs.current[tabId];
    if (!webview || typeof webview.executeJavaScript !== 'function') {
      return activeBrowserContext;
    }

    try {
      const script = `
        (() => {
          try {
            const href = window.location.href || '';
            const rawTitle = document.title || '';
            const isYouTube = /youtube\\.com|youtu\\.be/i.test(href);

            if (isYouTube) {
              const ytTitleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string, #title h1 yt-formatted-string, h1.title, ytd-watch-metadata h1');
              const ytTitle = ytTitleEl ? (ytTitleEl.innerText || ytTitleEl.textContent || '').trim() : rawTitle.replace(/ - YouTube$/, '').trim();
              const channelEl = document.querySelector('#channel-name #text, #upload-info #channel-name a, ytd-channel-name a, #owner #channel-name');
              const channel = channelEl ? (channelEl.innerText || channelEl.textContent || '').trim() : '';
              const descEl = document.querySelector('#description-inline-expander, #description, ytd-text-inline-expander, #description-inner');
              const description = descEl ? (descEl.innerText || descEl.textContent || '').trim() : '';
              const metaDesc = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
              const infoEl = document.querySelector('#info-container yt-formatted-string, ytd-watch-info-text, #info-strings yt-formatted-string');
              const infoText = infoEl ? (infoEl.innerText || infoEl.textContent || '').trim() : '';

              const parts = [];
              if (channel) parts.push('Channel/Creator: ' + channel);
              if (infoText) parts.push('Video Info: ' + infoText);
              if (description) parts.push('Description:\\n' + description);
              else if (metaDesc) parts.push('Summary: ' + metaDesc);

              return {
                title: ytTitle || rawTitle || 'YouTube Video',
                url: href,
                channel: channel,
                isYouTube: true,
                metaDescription: metaDesc,
                text: parts.join('\\n\\n').slice(0, 16000)
              };
            }

            // General web page extraction (safe extraction from live DOM elements)
            const metaDesc = document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content || '';
            const mainEl = document.querySelector('main, article, [role="main"]') || document.body;
            let text = '';
            if (mainEl) {
              const nodes = Array.from(mainEl.querySelectorAll('h1, h2, h3, h4, p, li, blockquote, table'));
              if (nodes.length > 0) {
                text = nodes
                  .filter(el => !el.closest('nav, footer, header, script, style, noscript, [aria-hidden="true"]'))
                  .map(el => (el.innerText || el.textContent || '').trim())
                  .filter(Boolean)
                  .join('\\n');
              } else {
                text = (mainEl.innerText || mainEl.textContent || '').replace(/\\s+/g, ' ').trim();
              }
            }

            return {
              title: rawTitle,
              url: href,
              channel: '',
              isYouTube: false,
              metaDescription: metaDesc,
              text: (text || metaDesc).slice(0, 16000)
            };
          } catch (e) {
            return { title: document.title, url: window.location.href, text: '', isYouTube: false, channel: '' };
          }
        })()
      `;
      const res = await webview.executeJavaScript(script);
      if (res && (res.title || res.text || res.url)) {
        const ctxObj = {
          title: res.title || 'Page',
          url: res.url || '',
          text: res.text || '',
          channel: res.channel || '',
          isYouTube: Boolean(res.isYouTube),
          timestamp: Date.now()
        };
        setActiveBrowserContext(ctxObj);
        return ctxObj;
      }
    } catch {}
    return null;
  };

  // Refresh AI page context when switching tabs
  useEffect(() => {
    if (activeTabId) {
      extractPageContentForTab(activeTabId);
    }
  }, [activeTabId, browserSettings?.aiPageReaderEnabled]);

  // Apply YouTube video ad fast-forward, banner cleaning, SponsorBlock and DeArrow
  const applyYouTubeEnhancements = (tabId, targetUrl) => {
    const webview = webviewRefs.current[tabId];
    if (!webview || !targetUrl) return;

    try {
      const parsed = new URL(targetUrl);
      const isYouTube = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be');
      if (!isYouTube) return;

      // 1. YouTube video ad fast-forward & banner cleaner
      if (browserSettings?.youtubeAdShield !== false) {
        webview.executeJavaScript(buildYouTubeAdShieldScript(true)).catch(() => {});
      }

      // Extract video ID for watch or shorts pages
      let videoId = '';
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/shorts/')[1]?.split(/[?#&]/)[0] || '';
      }

      if (videoId) {
        // 2. SponsorBlock skipping
        if (browserSettings?.sponsorBlockEnabled !== false && window.klarityDesktop?.getSponsorSegments) {
          window.klarityDesktop.getSponsorSegments(videoId).then((segments) => {
            if (Array.isArray(segments) && segments.length > 0) {
              webview.executeJavaScript(buildSponsorBlockScript(segments, true)).catch(() => {});
            }
          }).catch(() => {});
        }

        // 3. DeArrow clickbait title cleaner
        if (browserSettings?.dearrowEnabled !== false && window.klarityDesktop?.getDeArrowBranding) {
          window.klarityDesktop.getDeArrowBranding(videoId).then((branding) => {
            webview.executeJavaScript(buildDeArrowScript(branding, true)).catch(() => {});
          }).catch(() => {});
        }
      }
    } catch {}
  };

  // Attach Electron <webview> event listeners for each tab
  const attachWebviewListeners = (tabId, webview) => {
    if (!webview || attachedListenersRef.current[tabId] === webview) return;
    attachedListenersRef.current[tabId] = webview;

    const handleDomReady = () => {
      const factor = Math.max(0.5, Math.min(2.5, Number(browserSettings?.pageZoom || 100) / 100));
      try {
        if (typeof webview.setZoomFactor === 'function') webview.setZoomFactor(factor);
        const currentTab = tabs.find((t) => t.id === tabId);
        if (currentTab && typeof webview.setAudioMuted === 'function') {
          webview.setAudioMuted(Boolean(currentTab.isMuted));
        }
        applyYouTubeEnhancements(tabId, webview.getURL());
      } catch {}
    };

    const handleStartLoading = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isLoading: true, isPlayingMedia: false } : t)));
    };

    const handleMediaStarted = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isPlayingMedia: true } : t)));
    };

    const handleMediaPaused = () => {
      setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, isPlayingMedia: false } : t)));
    };

    const handleStopLoading = () => {
      let rawUrl = '';
      let rawTitle = '';
      let back = false;
      let fwd = false;
      try {
        back = webview.canGoBack();
        fwd = webview.canGoForward();
        rawUrl = webview.getURL() || '';
        rawTitle = webview.getTitle() || '';
      } catch {}

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (isNewTabUrl(t.url) && (!rawUrl || rawUrl === 'about:blank')) {
            return { ...t, isLoading: false };
          }
          return {
            ...t,
            isLoading: false,
            canGoBack: back,
            canGoForward: fwd,
            url: rawUrl && rawUrl !== 'about:blank' ? rawUrl : t.url,
            title: rawTitle && rawTitle !== 'about:blank' ? rawTitle : t.title
          };
        })
      );

      if (rawUrl) {
        applyYouTubeEnhancements(tabId, rawUrl);
      }

      if (tabId === activeTabId) {
        if (rawUrl && rawUrl !== 'about:blank' && !isNewTabUrl(rawUrl)) {
          setUrlInput(rawUrl);
        }
        if (rawUrl && rawUrl !== 'about:blank') {
          extractPageContentForTab(tabId);
          setTimeout(() => {
            extractPageContentForTab(tabId);
          }, 800);
        }
      }
    };

    const handleDidNavigate = (e) => {
      let back = false;
      let fwd = false;
      try {
        back = webview.canGoBack();
        fwd = webview.canGoForward();
      } catch {}

      const navUrl = e.url || '';
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          if (isNewTabUrl(t.url) && (!navUrl || navUrl === 'about:blank')) {
            return t;
          }
          return {
            ...t,
            url: navUrl && navUrl !== 'about:blank' ? navUrl : t.url,
            canGoBack: back,
            canGoForward: fwd
          };
        })
      );
      if (navUrl) {
        applyYouTubeEnhancements(tabId, navUrl);
      }
      if (tabId === activeTabId && navUrl && navUrl !== 'about:blank' && !isNewTabUrl(navUrl)) {
        setUrlInput(navUrl);
        extractPageContentForTab(tabId);
        setTimeout(() => {
          extractPageContentForTab(tabId);
        }, 800);
      }
    };

    const handleTitleUpdate = (e) => {
      if (e.title && e.title !== 'about:blank') {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId && !isNewTabUrl(t.url) ? { ...t, title: e.title } : t
          )
        );
        if (tabId === activeTabId) {
          extractPageContentForTab(tabId);
        }
      }
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('did-navigate', handleDidNavigate);
    webview.addEventListener('did-navigate-in-page', handleDidNavigate);
    webview.addEventListener('page-title-updated', handleTitleUpdate);
    webview.addEventListener('media-started-playing', handleMediaStarted);
    webview.addEventListener('media-paused', handleMediaPaused);
  };

  // Navigate active tab (or specific tabId)
  const navigateTo = (destination, targetTabId = activeTabId) => {
    const target = resolveBrowserDestination(destination, browserSettings?.searchEngine);
    if (!target) return;

    if (isNewTabUrl(target)) {
      if (targetTabId === activeTabId) {
        setUrlInput('');
        setTimeout(() => urlInputRef.current?.focus(), 0);
      }
      setTabs((prev) =>
        prev.map((t) =>
          t.id === targetTabId ? { ...t, url: NEW_TAB_URL, title: 'New Tab', isLoading: false } : t
        )
      );
      return;
    }

    if (targetTabId === activeTabId) {
      setUrlInput(target);
    }
    setTabs((prev) => prev.map((t) => (t.id === targetTabId ? { ...t, url: target } : t)));

    const webview = webviewRefs.current[targetTabId];
    if (webview) {
      try {
        if (typeof webview.loadURL === 'function') {
          webview.loadURL(target);
        } else {
          webview.src = target;
        }
      } catch {
        webview.src = target;
      }
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    navigateTo(urlInput, activeTabId);
  };

  const handleBack = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoBack()) wv.goBack();
  };

  const handleForward = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoForward()) wv.goForward();
  };

  const handleReload = (targetTabId = activeTabId) => {
    const wv = webviewRefs.current[targetTabId];
    const tabObj = tabs.find((t) => t.id === targetTabId);
    if (isNewTabUrl(tabObj?.url)) return;
    if (wv) {
      if (tabObj?.isLoading) {
        wv.stop();
        setTabs((prev) => prev.map((t) => (t.id === targetTabId ? { ...t, isLoading: false } : t)));
      } else {
        wv.reload();
      }
    }
  };

  const handleHome = () => {
    const targetHome = getBrowserHomeUrl(browserSettings);
    if (!targetHome) return;
    navigateTo(targetHome, activeTabId);
  };

  // Tab Management Operations
  const handleNewTab = (options = {}) => {
    const url = options.url || getBrowserHomeUrl(browserSettings);
    const title = options.title || (isNewTabUrl(url) ? 'New Tab' : activeEngine.name);
    const newTab = createTabObject(url, title, {
      groupId: options.groupId || null
    });

    setTabs((prev) => {
      if (options.insertAfterTabId) {
        const idx = prev.findIndex((t) => t.id === options.insertAfterTabId);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx + 1, 0, newTab);
          return next;
        }
      }
      return [...prev, newTab];
    });
    setActiveTabId(newTab.id);
    if (isNewTabUrl(url)) {
      setUrlInput('');
      setTimeout(() => urlInputRef.current?.focus(), 0);
    } else {
      setUrlInput(url);
    }
  };

  const handleCloseTab = (tabId, e) => {
    if (e) e.stopPropagation();
    delete webviewRefs.current[tabId];
    delete attachedListenersRef.current[tabId];

    setTabs((prev) => {
      if (prev.length === 1) {
        // Reset the last remaining tab to Home instead of leaving 0 tabs
        const resetTab = createTabObject(homeUrl, isNewTabUrl(homeUrl) ? 'New Tab' : activeEngine.name);
        setActiveTabId(resetTab.id);
        setUrlInput(isNewTabUrl(homeUrl) ? '' : homeUrl);
        return [resetTab];
      }
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      if (tabId === activeTabId) {
        const fallback = next[Math.min(idx, next.length - 1)] || next[0];
        if (fallback) {
          setActiveTabId(fallback.id);
          setUrlInput(isNewTabUrl(fallback.url) ? '' : fallback.url);
        }
      }
      return next;
    });
  };

  const handleDuplicateTab = (tabId) => {
    const source = tabs.find((t) => t.id === tabId);
    if (!source) return;
    handleNewTab({
      url: source.url,
      title: source.title,
      groupId: source.groupId,
      insertAfterTabId: tabId
    });
  };

  const handleTogglePinTab = (tabId) => {
    setTabs((prev) => {
      const updated = prev.map((t) =>
        t.id === tabId ? { ...t, isPinned: !t.isPinned, groupId: !t.isPinned ? null : t.groupId } : t
      );
      // Keep pinned tabs sorted to the left
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);
      return [...pinned, ...unpinned];
    });
  };

  const handleToggleMuteTab = (tabId) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const nextMuted = !t.isMuted;
        const wv = webviewRefs.current[tabId];
        if (wv && typeof wv.setAudioMuted === 'function') {
          try {
            wv.setAudioMuted(nextMuted);
          } catch {}
        }
        return { ...t, isMuted: nextMuted };
      })
    );
  };

  const handleCloseOtherTabs = (keepTabId) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id === keepTabId || t.isPinned);
      if (!next.some((t) => t.id === activeTabId)) {
        setActiveTabId(keepTabId);
      }
      return next;
    });
  };

  const handleCloseTabsToRight = (tabId) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tabId);
      if (idx === -1) return prev;
      const next = prev.filter((t, i) => i <= idx || t.isPinned);
      if (!next.some((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
      }
      return next;
    });
  };

  // Tab Group Management
  const handleAddTabToNewGroup = (tabId) => {
    const color = TAB_GROUP_COLORS[tabGroups.length % TAB_GROUP_COLORS.length].id;
    const newGroup = {
      id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: `Group ${tabGroups.length + 1}`,
      color,
      collapsed: false
    };
    setTabGroups((prev) => [...prev, newGroup]);
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: newGroup.id, isPinned: false } : t)));
    setEditingGroupId(newGroup.id);
  };

  const handleAssignTabToGroup = (tabId, groupId) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId, isPinned: false } : t)));
    setTabGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, collapsed: false } : g)));
  };

  const handleRemoveTabFromGroup = (tabId) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: null } : t)));
  };

  const handleUngroupAll = (groupId) => {
    setTabs((prev) => prev.map((t) => (t.groupId === groupId ? { ...t, groupId: null } : t)));
    setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEditingGroupId(null);
  };

  const handleCloseGroup = (groupId) => {
    const groupTabs = tabs.filter((t) => t.groupId === groupId);
    groupTabs.forEach((t) => {
      delete webviewRefs.current[t.id];
      delete attachedListenersRef.current[t.id];
    });

    setTabs((prev) => {
      const remaining = prev.filter((t) => t.groupId !== groupId);
      if (remaining.length === 0) {
        const resetTab = createTabObject(homeUrl, activeEngine.name);
        setActiveTabId(resetTab.id);
        setUrlInput(homeUrl);
        return [resetTab];
      }
      if (!remaining.some((t) => t.id === activeTabId)) {
        setActiveTabId(remaining[0].id);
        setUrlInput(remaining[0].url);
      }
      return remaining;
    });
    setTabGroups((prev) => prev.filter((g) => g.id !== groupId));
    setEditingGroupId(null);
  };

  // Drag & Drop Tab Reordering
  const handleTabDrop = (targetTabId) => {
    if (!draggedTabId || draggedTabId === targetTabId) return;
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === draggedTabId);
      const toIdx = prev.findIndex((t) => t.id === targetTabId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      // Adopt target tab's group if dropped onto a grouped tab (and unpinned)
      const targetTab = prev[toIdx];
      if (!moved.isPinned && !targetTab.isPinned) {
        moved.groupId = targetTab.groupId || null;
      }
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedTabId(null);
  };

  // Ad Blocker Actions
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

  // In-Browser AI Copilot Actions (Self-contained within browser sidebar)
  const handleClearBrowserAiChat = () => {
    setBrowserAiMessages([]);
  };

  const handleSendBrowserAiMessage = async (overrideText) => {
    const raw = (typeof overrideText === 'string' ? overrideText : browserAiInput).trim();
    if (!raw || isBrowserAiLoading) return;

    if (typeof overrideText !== 'string') {
      setBrowserAiInput('');
    }

    // Refresh context immediately from the active tab's webview
    let freshContext = null;
    try {
      freshContext = await extractPageContentForTab(activeTabId);
    } catch {}
    const ctx = freshContext || activeBrowserContext;

    let enrichedPrompt = raw;
    if (ctx && (ctx.title || ctx.url)) {
      if (ctx.isYouTube || /youtube\.com\/watch|youtu\.be/i.test(ctx.url || '')) {
        enrichedPrompt = `[Currently watching YouTube video: "${ctx.title}"${ctx.channel ? ` by ${ctx.channel}` : ''} (${ctx.url})]\n\n${raw}`;
      } else if (!isNewTabUrl(ctx.url)) {
        enrichedPrompt = `[Currently viewing webpage: "${ctx.title}" (${ctx.url})]\n\n${raw}`;
      }
    }

    const nextUserMsg = { role: 'user', text: raw };
    const updatedHistory = [...browserAiMessages, nextUserMsg];
    setBrowserAiMessages(updatedHistory);
    setIsBrowserAiLoading(true);

    try {
      const uid = currentUser?.id || 'default';
      const cachedProvider = settingsAiProvider || localStorage.getItem(`klarity_${uid}_ai_provider`) || 'gemini';
      const cachedModel = settingsAiModel || localStorage.getItem(`klarity_${uid}_ai_model`) || 'gemini-2.0-flash';

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enrichedPrompt,
          browserContext: ctx,
          userMemory: aiMemory,
          clientProvider: cachedProvider,
          clientModel: cachedModel,
          responseLength: 'concise',
          webSearchEnabled: true
        })
      });
      const data = await res.json();
      if (data.updatedData?.memory && typeof onUpdateAiMemory === 'function') {
        onUpdateAiMemory(data.updatedData.memory);
      }
      let reply = (data.reply || '').replace(/\[NAVIGATE:[\s\S]*?\]/gi, '').replace(/\[ACTION:[\s\S]*?\]/gi, '').trim();
      if (!reply) {
        reply = "I've reviewed the current page. Feel free to ask any specific questions about its content, video topics, or products!";
      }
      setBrowserAiMessages([...updatedHistory, { role: 'assistant', text: reply }]);
    } catch (err) {
      setBrowserAiMessages([
        ...updatedHistory,
        { role: 'assistant', text: "Could not connect to the AI copilot. Please check your network connection." }
      ]);
    } finally {
      setIsBrowserAiLoading(false);
    }
  };

  // Bookmarks & Folders CRUD
  const folders = browserBookmarks.filter((item) => item.type === 'folder');
  const rootItems = browserBookmarks.filter((item) => !item.folderId);

  const openAddPopover = (presetFolderId = '') => {
    setAddMode('bookmark');
    setBmTitleInput(activeTab?.title && activeTab.title !== 'Klarity Browser' ? activeTab.title : '');
    setBmUrlInput(activeTab?.url || homeUrl);
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
      onUpdateBookmarks([
        ...browserBookmarks,
        { id: `fld-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, type: 'folder', title: cleanName }
      ]);
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
    onUpdateBookmarks([
      ...browserBookmarks,
      {
        id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        type: 'bookmark',
        title: bmTitleInput.trim() || fallbackTitle,
        url: cleanUrl,
        folderId: bmFolderId || null
      }
    ]);
    setIsAddBookmarkOpen(false);
  };

  const handleDeleteBookmarkItem = (id, e) => {
    if (e) e.stopPropagation();
    if (typeof onUpdateBookmarks !== 'function') return;
    onUpdateBookmarks(browserBookmarks.filter((item) => item.id !== id && item.folderId !== id));
    if (openFolderId === id) setOpenFolderId(null);
  };

  // Build ordered tab strip items with group headers before first contiguous group member
  const pinnedTabs = tabs.filter((t) => t.isPinned);
  const unpinnedTabs = tabs.filter((t) => !t.isPinned);
  const renderedGroupHeaders = new Set();
  const contextTab = tabContextMenu ? tabs.find((t) => t.id === tabContextMenu.tabId) : null;

  return (
    <div className="flex flex-col h-full w-full bg-[var(--background)] overflow-hidden flex-1 min-h-0">
      {/* 0. CHROME/EDGE STYLE TAB STRIP WITH TAB GROUPS */}
      <div className="shrink-0 bg-[var(--surface-subtle)] border-b border-[var(--line)] px-2 pt-1.5 flex items-end gap-1 overflow-x-auto no-scrollbar select-none relative z-40">
        {/* Pinned Tabs */}
        {pinnedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => setDraggedTabId(tab.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleTabDrop(tab.id)}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setTabContextMenu({
                  tabId: tab.id,
                  x: Math.min(e.clientX, window.innerWidth - 230),
                  y: Math.min(e.clientY, window.innerHeight - 340)
                });
              }}
              title={tab.title || tab.url}
              className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-t-xl border border-b-0 text-xs cursor-pointer transition-colors shrink-0 ${
                isActive
                  ? 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] font-semibold'
                  : 'bg-transparent border-transparent hover:bg-[var(--surface)]/60 text-[var(--muted)]'
              }`}
            >
              {tab.isLoading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)] shrink-0" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
              )}
              {tab.isMuted && <VolumeX className="w-3 h-3 text-rose-500 shrink-0" />}
            </div>
          );
        })}

        {/* Unpinned Tabs & Collapsible Tab Groups */}
        {unpinnedTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const group = tab.groupId ? tabGroups.find((g) => g.id === tab.groupId) : null;
          const groupColor = group
            ? TAB_GROUP_COLORS.find((c) => c.id === group.color) || TAB_GROUP_COLORS[0]
            : null;
          const showGroupHeader = group && !renderedGroupHeaders.has(group.id);
          if (group) renderedGroupHeaders.add(group.id);

          const isHiddenByCollapse = Boolean(group && group.collapsed && !isActive);

          return (
            <React.Fragment key={tab.id}>
              {showGroupHeader && (
                <div className="relative flex items-center shrink-0 mb-1 mr-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setTabGroups((prev) =>
                        prev.map((g) => (g.id === group.id ? { ...g, collapsed: !g.collapsed } : g))
                      )
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setEditingGroupId(editingGroupId === group.id ? null : group.id);
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border ${groupColor.bg} ${groupColor.text} ${groupColor.border}/40`}
                    title="Click to collapse/expand • Right-click to edit group"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: groupColor.hex }}
                    />
                    <span className="max-w-[100px] truncate">{group.name}</span>
                  </button>

                  {editingGroupId === group.id && (
                    <div
                      ref={groupEditorRef}
                      className="fixed top-12 left-auto z-[120] w-64 p-3 bg-[var(--surface)] border border-[var(--line)] rounded-2xl shadow-xl flex flex-col gap-2.5"
                    >
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          setTabGroups((prev) =>
                            prev.map((g) => (g.id === group.id ? { ...g, name: e.target.value } : g))
                          )
                        }
                        placeholder="Group name"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {TAB_GROUP_COLORS.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              setTabGroups((prev) =>
                                prev.map((g) => (g.id === group.id ? { ...g, color: c.id } : g))
                              )
                            }
                            aria-label={c.label}
                            className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${
                              group.color === c.id ? 'scale-110 ring-2 ring-[var(--ink)] ring-offset-1' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                      <div className="border-t border-[var(--line)] pt-2 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleNewTab({ groupId: group.id });
                            setEditingGroupId(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          New tab in group
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUngroupAll(group.id)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                        >
                          Ungroup
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCloseGroup(group.id)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                        >
                          Close group
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isHiddenByCollapse && (
                <div
                  draggable
                  onDragStart={() => setDraggedTabId(tab.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleTabDrop(tab.id)}
                  onClick={() => setActiveTabId(tab.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setTabContextMenu({
                      tabId: tab.id,
                      x: Math.min(e.clientX, window.innerWidth - 230),
                      y: Math.min(e.clientY, window.innerHeight - 340)
                    });
                  }}
                  style={
                    groupColor
                      ? { borderTopColor: groupColor.hex, borderTopWidth: '2px' }
                      : undefined
                  }
                  className={`group flex items-center gap-2 min-w-[120px] max-w-[210px] px-3 py-1.5 rounded-t-xl border border-b-0 text-xs cursor-pointer transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)] font-semibold'
                      : 'bg-transparent border-transparent hover:bg-[var(--surface)]/60 text-[var(--muted)] font-medium'
                  }`}
                >
                  {tab.isLoading ? (
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)] shrink-0" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  )}
                  <span className="truncate flex-1">{tab.title || 'New Tab'}</span>
                  {tab.isMuted && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleMuteTab(tab.id);
                      }}
                      title="Unmute site"
                      className="p-0.5 rounded hover:bg-[var(--surface-hover)] text-rose-500 cursor-pointer shrink-0"
                    >
                      <VolumeX className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    aria-label="Close tab"
                    title="Close tab"
                    className={`p-0.5 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0 transition-opacity ${
                      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* New Tab "+" Button */}
        <button
          type="button"
          onClick={() => handleNewTab()}
          aria-label="New tab"
          title="New tab"
          className="mb-1 ml-0.5 p-1.5 rounded-lg hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TAB CONTEXT MENU (Right-Click) */}
      {tabContextMenu && contextTab && (
        <div
          ref={contextMenuRef}
          style={{ top: `${tabContextMenu.y}px`, left: `${tabContextMenu.x}px` }}
          className="fixed z-[150] w-56 py-1.5 bg-[var(--surface)] border border-[var(--line)] rounded-xl shadow-2xl text-xs text-[var(--ink)] flex flex-col"
        >
          <button
            type="button"
            onClick={() => {
              handleNewTab({ insertAfterTabId: contextTab.id });
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            New tab to the right
          </button>

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleAddTabToNewGroup(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer font-medium"
          >
            Add tab to new group
          </button>

          {tabGroups.length > 0 && (
            <div className="px-3 py-1 flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase text-[var(--muted)] tracking-wider">
                Add to existing group
              </span>
              {tabGroups.map((g) => {
                const c = TAB_GROUP_COLORS.find((col) => col.id === g.color) || TAB_GROUP_COLORS[0];
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      handleAssignTabToGroup(contextTab.id, g.id);
                      setTabContextMenu(null);
                    }}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--surface-subtle)] text-left cursor-pointer"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.hex }} />
                    <span className="truncate">{g.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {contextTab.groupId && (
            <button
              type="button"
              onClick={() => {
                handleRemoveTabFromGroup(contextTab.id);
                setTabContextMenu(null);
              }}
              className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              Remove from group
            </button>
          )}

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleReload(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => {
              handleDuplicateTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            onClick={() => {
              handleTogglePinTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
          >
            <Pin className="w-3.5 h-3.5 text-[var(--muted)]" />
            <span>{contextTab.isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          {(contextTab.isPlayingMedia || contextTab.isMuted) && (
            <button
              type="button"
              onClick={() => {
                handleToggleMuteTab(contextTab.id);
                setTabContextMenu(null);
              }}
              className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer flex items-center gap-2"
            >
              {contextTab.isMuted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Unmute tab</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[var(--muted)]" />
                  <span>Mute tab</span>
                </>
              )}
            </button>
          )}

          <div className="my-1 border-t border-[var(--line)]" />

          <button
            type="button"
            onClick={() => {
              handleCloseTab(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              handleCloseOtherTabs(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close other tabs
          </button>
          <button
            type="button"
            onClick={() => {
              handleCloseTabsToRight(contextTab.id);
              setTabContextMenu(null);
            }}
            className="px-3 py-1.5 text-left hover:bg-[var(--surface-subtle)] cursor-pointer"
          >
            Close tabs to the right
          </button>
        </div>
      )}

      {/* 1. TOP BROWSER CONTROLS & SMART ADDRESS BAR */}
      <div className="shrink-0 bg-[var(--surface)] border-b border-[var(--line)] px-4 py-2 flex flex-col gap-2 shadow-2xs relative z-30">
        <div className="flex items-center gap-2">
          {/* Navigation Buttons: Back, Forward, Reload, Home (optional) */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleBack}
              disabled={!activeTab?.canGoBack}
              aria-label="Back"
              title="Back"
              className={`p-1.5 rounded-lg border border-[var(--line)] transition-colors ${
                activeTab?.canGoBack
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleForward}
              disabled={!activeTab?.canGoForward}
              aria-label="Forward"
              title="Forward"
              className={`p-1.5 rounded-lg border border-[var(--line)] transition-colors ${
                activeTab?.canGoForward
                  ? 'hover:bg-[var(--surface-subtle)] text-[var(--ink)] cursor-pointer'
                  : 'opacity-40 cursor-not-allowed text-[var(--muted)]'
              }`}
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleReload(activeTabId)}
              aria-label={activeTab?.isLoading ? 'Stop loading' : 'Reload page'}
              title={activeTab?.isLoading ? 'Stop loading' : 'Reload page'}
              className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${activeTab?.isLoading ? 'animate-spin text-[var(--brand)]' : ''}`} />
            </button>
            {browserSettings?.showHomeButton !== false && (
              <button
                type="button"
                onClick={handleHome}
                aria-label="Browser Home"
                title="Home"
                className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Smart Address & Search Input */}
          <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center min-w-0">
            <div className="flex-1 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--surface-subtle)] border border-[var(--line)] focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20 transition-all min-h-[38px]">
              {(activeTab?.url || '').startsWith('https://') ? (
                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" title="Secure connection (HTTPS)" />
              ) : (
                <Globe className="w-4 h-4 text-[var(--muted)] shrink-0" />
              )}
              <input
                ref={urlInputRef}
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Search or enter web address"
                className="no-focus-outline flex-1 bg-transparent border-0 outline-none text-sm text-[var(--ink)] placeholder-[var(--muted)] min-w-0 font-medium px-2 py-0.5 leading-normal rounded-full"
                style={{ outline: 'none', boxShadow: 'none', border: 'none', background: 'transparent' }}
              />
              {urlInput && (
                <button
                  type="button"
                  onClick={() => setUrlInput('')}
                  aria-label="Clear URL"
                  className="p-1 rounded-full hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Ad Blocker Status & Popover */}
          <div className="relative shrink-0" ref={adBlockPopoverRef}>
            <button
              type="button"
              onClick={() => setIsAdBlockPopoverOpen((prev) => !prev)}
              title="Ad & Tracker Blocker"
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
                <div className="flex items-center justify-between bg-[var(--surface-subtle)] p-2.5 rounded-xl border border-[var(--line)]">
                  <span className="text-xs font-medium text-[var(--ink)]">Blocked</span>
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
                    {adBlockEnabled ? 'Pause' : 'Enable'}
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

          {/* In-Browser AI Copilot Sidebar Toggle Button */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !isBrowserAiSidebarOpen;
                setIsBrowserAiSidebarOpen(nextState);
                if (nextState && activeTabId) {
                  extractPageContentForTab(activeTabId);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
                isBrowserAiSidebarOpen
                  ? 'bg-[var(--brand)] text-white border-[var(--brand)] shadow-sm'
                  : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)]'
              }`}
              title={isBrowserAiSidebarOpen ? 'Close AI Sidebar' : 'Open Browser AI Copilot'}
              aria-label="Browser AI"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isBrowserAiSidebarOpen ? 'text-white' : 'text-[var(--brand)]'}`} />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
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

        {/* 2. BOOKMARKS BAR */}
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
                                  navigateTo(child.url, activeTabId);
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
                    onClick={() => navigateTo(item.url, activeTabId)}
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
                            <option value="">Bookmarks Bar</option>
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
                          placeholder="Folder name"
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

      {/* 3. MULTI-TAB BROWSER CONTENT CANVAS + INTEGRATED BROWSER AI SIDEBAR */}
      <div className="flex-1 w-full relative bg-[var(--surface)] min-h-0 h-full overflow-hidden flex flex-row">
        {/* Webviews and New Tab Pages */}
        <div className="flex-1 min-w-0 h-full relative overflow-hidden">
          {isDesktop ? (
            tabs.map((tab) => {
              const isTabActive = tab.id === activeTabId;
              const showNewTab = isNewTabUrl(tab.url);
              return (
                <React.Fragment key={tab.id}>
                  <webview
                    ref={(el) => {
                      if (el) {
                        webviewRefs.current[tab.id] = el;
                        attachWebviewListeners(tab.id, el);
                      }
                    }}
                    src={isNewTabUrl(tab.initialUrl) ? 'about:blank' : tab.initialUrl}
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
                      outline: 'none',
                      zIndex: isTabActive && !showNewTab ? 10 : 0,
                      opacity: isTabActive && !showNewTab ? 1 : 0,
                      pointerEvents: isTabActive && !showNewTab ? 'auto' : 'none'
                    }}
                    allowpopups="true"
                    webpreferences="contextIsolation=true, sandbox=true"
                  />
                  {showNewTab && (
                    <div
                      className="absolute inset-0 w-full h-full"
                      style={{
                        zIndex: isTabActive ? 20 : 0,
                        opacity: isTabActive ? 1 : 0,
                        pointerEvents: isTabActive ? 'auto' : 'none'
                      }}
                    >
                      <NewTabPage
                        searchEngineId={browserSettings?.searchEngine}
                        onNavigate={(dest) => navigateTo(dest, tab.id)}
                        onOpenNewTab={(url, title) =>
                          handleNewTab({ url, title, insertAfterTabId: tab.id })
                        }
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })
          ) : isNewTabUrl(activeTab?.url) ? (
            <NewTabPage
              searchEngineId={browserSettings?.searchEngine}
              onNavigate={(dest) => navigateTo(dest, activeTabId)}
              onOpenNewTab={(url, title) =>
                handleNewTab({ url, title, insertAfterTabId: activeTabId })
              }
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[var(--surface-subtle)]">
              <Card className="max-w-md p-6 flex flex-col items-center gap-4 text-center shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)]">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[var(--ink)]">In-App Browser</h3>
                  <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                    Embedded browsing runs natively in the Klarity Desktop application.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="primary" onClick={() => window.open(activeTab?.url || homeUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Open Page
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Dedicated In-Browser AI Sidebar (Edge Copilot / Aria Style, fully contained in browser) */}
        {isBrowserAiSidebarOpen && (
          <aside
            aria-label="Browser AI Copilot"
            className="w-80 sm:w-88 md:w-96 shrink-0 h-full bg-[var(--surface)] border-l border-[var(--line)] flex flex-col z-30 shadow-2xl transition-all"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--surface-subtle)]/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--ink)]">AI Copilot</span>
                    {activeBrowserContext?.isYouTube && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-500 font-semibold border border-red-500/20">
                        YouTube
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] truncate max-w-[200px]" title={activeTab?.title || activeTab?.url}>
                    {activeTab?.title || activeTab?.url || 'Current page'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {typeof onAskAdvisor === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      const latestUserPrompt = browserAiMessages.filter((m) => m.role === 'user').slice(-1)[0]?.text || '';
                      onAskAdvisor(
                        latestUserPrompt || `I am currently viewing "${activeTab?.title || activeTab?.url}" (${activeTab?.url})`,
                        activeBrowserContext
                      );
                      setIsBrowserAiSidebarOpen(false);
                    }}
                    title="Open in Main Financial Advisor"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {browserAiMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBrowserAiChat}
                    title="Clear chat"
                    className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsBrowserAiSidebarOpen(false)}
                  title="Close AI Copilot"
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="px-3.5 py-2 border-b border-[var(--line)] flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => handleSendBrowserAiMessage(activeBrowserContext?.isYouTube ? 'Summarize this video' : 'Summarize this page')}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] text-[var(--ink)] border border-[var(--line)] shrink-0 transition-colors cursor-pointer"
              >
                ✨ {activeBrowserContext?.isYouTube ? 'Summarize Video' : 'Summarize Page'}
              </button>
              <button
                type="button"
                onClick={() => handleSendBrowserAiMessage(activeBrowserContext?.isYouTube ? 'What are the main key points in this video?' : 'What are the key points of this page?')}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-subtle)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)] text-[var(--ink)] border border-[var(--line)] shrink-0 transition-colors cursor-pointer"
              >
                📌 Key Points
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {browserAiMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--muted)]">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--line)] flex items-center justify-center mb-3 text-[var(--brand)]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--ink)] mb-1">
                    Ask about this {activeBrowserContext?.isYouTube ? 'video' : 'page'}
                  </h4>
                  <p className="text-[11px] leading-relaxed max-w-[220px]">
                    Ask questions, get summaries, or extract details directly without leaving your browser tab.
                  </p>
                </div>
              ) : (
                browserAiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[var(--brand)] text-white rounded-br-xs font-normal'
                          : 'bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)] rounded-bl-xs'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))
              )}
              {isBrowserAiLoading && (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)] p-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[var(--brand)]" />
                  <span>Analyzing page...</span>
                </div>
              )}
              <div ref={browserAiMessagesEndRef} />
            </div>

            {/* Bottom Input */}
            <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendBrowserAiMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={browserAiInputRef}
                  type="text"
                  value={browserAiInput}
                  onChange={(e) => setBrowserAiInput(e.target.value)}
                  placeholder={`Ask about this ${activeBrowserContext?.isYouTube ? 'video' : 'webpage'}...`}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] text-xs text-[var(--ink)] placeholder-[var(--muted)] outline-none"
                />
                <button
                  type="submit"
                  disabled={!browserAiInput.trim() || isBrowserAiLoading}
                  className={`p-2 rounded-xl transition-all ${
                    browserAiInput.trim() && !isBrowserAiLoading
                      ? 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white cursor-pointer'
                      : 'bg-[var(--surface-subtle)] text-[var(--muted)] cursor-not-allowed opacity-50'
                  }`}
                  title="Send"
                  aria-label="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
