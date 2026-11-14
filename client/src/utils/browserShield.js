// YouTube Ad Shield, SponsorBlock & DeArrow In-Page Engine for Klarity Browser

export function buildYouTubeAdShieldScript(enabled = true) {
  if (!enabled) return '';
  return `
(function() {
  if (window.__klarityAdShieldInjected) return;
  window.__klarityAdShieldInjected = true;

  // 1. Inject CSS to hide all static banner ads, promoted overlays, and masthead slots
  const style = document.createElement('style');
  style.id = 'klarity-adblock-style';
  style.textContent = \`
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-ad-slot-renderer,
    ytd-display-ad-renderer,
    #masthead-ad,
    ytd-banner-promo-renderer,
    .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytd-statement-banner-renderer,
    .ytd-in-feed-ad-layout-renderer,
    ytd-player-legacy-desktop-watch-ads-renderer,
    #player-ads,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
    ytd-enforcement-message-view-model {
      display: none !important;
    }

    /* Protect YouTube captions, subtitle tracks, and CC toggle */
    .ytp-caption-window-container,
    .caption-window,
    .ytp-caption-segment,
    .ytp-subtitles-button {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
  \`;
  (document.head || document.documentElement).appendChild(style);

  // 2. Real-time in-player video ad fast-forward & skip engine
  let lastAdSkippedTime = 0;

  function processVideoAds() {
    try {
      const player = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
      const video = document.querySelector('video');

      // Dismiss anti-adblock enforcement dialogs if YouTube displays them
      const enforcementDialog = document.querySelector('ytd-enforcement-message-view-model');
      if (enforcementDialog) {
        const dialog = enforcementDialog.closest('tp-yt-paper-dialog') || enforcementDialog;
        dialog.remove();
        const backdrop = document.querySelector('.iron-overlay-backdrop');
        if (backdrop) backdrop.remove();
        if (video && video.paused) video.play();
      }

      if (!player || !video) return;

      // Only fast-forward when YouTube explicitly flags player as ad-showing or ad-interrupting
      const isAdShowing = player.classList.contains('ad-showing') ||
                          player.classList.contains('ad-interrupting');

      if (isAdShowing) {
        // Mute and fast-forward ad to end instantly
        video.muted = true;
        video.playbackRate = 16.0;

        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = video.duration;
        }

        // Click any skip button as soon as it appears
        const skipButtons = [
          '.ytp-ad-skip-button',
          '.ytp-ad-skip-button-modern',
          '.ytp-skip-ad-button',
          '.ytp-ad-skip-button-slot'
        ];
        for (const selector of skipButtons) {
          const btn = document.querySelector(selector);
          if (btn) {
            btn.click();
            break;
          }
        }
      }
    } catch (e) {}
  }

  setInterval(processVideoAds, 150);
  document.addEventListener('timeupdate', processVideoAds, true);
})();
  `;
}

export function buildSponsorBlockScript(segments = [], enabled = true) {
  if (!enabled || !Array.isArray(segments) || segments.length === 0) return '';
  const sanitizedSegments = JSON.stringify(segments);

  return `
(function() {
  const segments = ${sanitizedSegments};
  if (!segments || segments.length === 0) return;

  window.__klaritySponsorSegments = segments;
  window.__klarityIgnoredSegments = window.__klarityIgnoredSegments || new Set();

  function formatTime(seconds) {
    const s = Math.floor(seconds || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m + ':' + (rem < 10 ? '0' : '') + rem;
  }

  function showSkipToast(category, start, end) {
    let toast = document.getElementById('klarity-sponsor-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'klarity-sponsor-toast';
      toast.style.cssText = \`
        position: fixed;
        bottom: 72px;
        left: 24px;
        z-index: 9999999;
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        border: 1px solid rgba(59, 130, 246, 0.5);
        border-radius: 9999px;
        padding: 8px 16px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        transition: opacity 0.3s ease, transform 0.3s ease;
        backdrop-filter: blur(8px);
      \`;
      document.body.appendChild(toast);
    }

    const catLabel = category.charAt(0).toUpperCase() + category.slice(1);
    toast.innerHTML = \`
      <span style="display:flex;align-items:center;gap:6px;">
        <span style="color:#60a5fa;font-size:14px;">⏭️</span>
        <span>Skipped \${catLabel} (\${formatTime(start)} – \${formatTime(end)})</span>
      </span>
      <button id="klarity-unskip-btn" style="
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.4);
        border-radius: 9999px;
        padding: 2px 10px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
      ">Unskip</button>
    \`;

    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    const unskipBtn = document.getElementById('klarity-unskip-btn');
    if (unskipBtn) {
      unskipBtn.onclick = () => {
        const video = document.querySelector('video');
        if (video) video.currentTime = start;
        window.__klarityIgnoredSegments.add(start + '-' + end);
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      };
    }

    clearTimeout(window.__klarityToastTimeout);
    window.__klarityToastTimeout = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
      }
    }, 4500);
  }

  function checkSponsorSegments() {
    const video = document.querySelector('video');
    if (!video) return;

    const current = video.currentTime;
    for (const seg of segments) {
      if (!seg || !seg.segment || seg.segment.length < 2) continue;
      const [start, end] = seg.segment;
      const key = start + '-' + end;

      if (window.__klarityIgnoredSegments.has(key)) continue;

      if (current >= start && current < end - 0.15) {
        video.currentTime = end + 0.05;
        showSkipToast(seg.category || 'sponsor', start, end);
        break;
      }
    }
  }

  const video = document.querySelector('video');
  if (video) {
    video.removeEventListener('timeupdate', window.__klaritySponsorCheck || (() => {}));
    window.__klaritySponsorCheck = checkSponsorSegments;
    video.addEventListener('timeupdate', checkSponsorSegments);
  }
})();
  `;
}

export function buildDeArrowScript(branding = null, enabled = true) {
  if (!enabled) return '';
  const cleanTitle = branding?.title ? JSON.stringify(branding.title) : 'null';

  return `
(function() {
  const dearrowTitle = ${cleanTitle};

  function applyDeArrow() {
    try {
      const titleEl = document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
                      document.querySelector('#title h1 yt-formatted-string') ||
                      document.querySelector('h1.title yt-formatted-string');

      if (!titleEl) return;

      if (dearrowTitle) {
        titleEl.textContent = dearrowTitle;
        document.title = dearrowTitle + ' - YouTube';
      } else {
        // If no crowd-sourced title, clean up shouting ALL-CAPS titles
        const text = titleEl.textContent || '';
        const letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 8) {
          const upperCount = (letters.match(/[A-Z]/g) || []).length;
          if (upperCount / letters.length > 0.7) {
            const formatted = text.charAt(0) + text.slice(1).toLowerCase();
            titleEl.textContent = formatted;
            document.title = formatted + ' - YouTube';
          }
        }
      }
    } catch (e) {}
  }

  setTimeout(applyDeArrow, 300);
  setTimeout(applyDeArrow, 1200);
})();
  `;
}
