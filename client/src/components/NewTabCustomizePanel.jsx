import React, { useRef, useState } from 'react';
import {
  Check,
  Clock,
  Grid,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  Wallet,
  X
} from 'lucide-react';
import {
  DEFAULT_NEWTAB_PREFS,
  NEWTAB_GRADIENT_PRESETS,
  NEWTAB_SOLID_PRESETS
} from '../utils/browserSettings';

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[var(--brand)]' : 'bg-[var(--line-strong,var(--line))]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  );
}

function SegmentedButtons({ options, value, onChange, cols = 3 }) {
  const gridColsClass =
    cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className={`grid ${gridColsClass} gap-1 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--line)]`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer truncate ${
              active
                ? 'bg-[var(--surface)] text-[var(--brand)] shadow-xs border border-[var(--line)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)] border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function compressWallpaperFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        try {
          const maxW = 1600;
          const maxH = 900;
          let { width, height } = img;
          const ratio = Math.min(1, maxW / width, maxH / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let quality = 0.78;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Keep payload lightweight for localStorage & low-RAM Chromebooks
          while (dataUrl.length > 380000 && quality > 0.45) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function NewTabCustomizePanel({
  prefs,
  setPrefs,
  showHomepageNotes,
  onToggleHomepageNotes,
  noteSections = [],
  activeNoteSectionId = '',
  onSelectNoteSection,
  isLowPowerDevice = false,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'widgets' | 'layout'
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const updatePrefs = (patch) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const isNotesEnabled =
    typeof showHomepageNotes === 'boolean' ? showHomepageNotes : prefs.showNotes !== false;

  const handleToggleNotes = (nextChecked) => {
    updatePrefs({ showNotes: nextChecked });
    if (typeof onToggleHomepageNotes === 'function') {
      onToggleHomepageNotes(nextChecked);
    }
  };

  const handleResetDefaults = () => {
    const reset = {
      ...DEFAULT_NEWTAB_PREFS,
      noteStyles: { ...DEFAULT_NEWTAB_PREFS.noteStyles }
    };
    setPrefs(reset);
    if (typeof onToggleHomepageNotes === 'function') {
      onToggleHomepageNotes(Boolean(reset.showNotes));
    }
    setUploadStatus('');
    setUploadError('');
  };

  const handleWallpaperUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file (JPG, PNG, or WebP).');
      return;
    }
    setUploadError('');
    setUploadStatus('Optimizing image...');
    try {
      const dataUrl = await compressWallpaperFile(file);
      updatePrefs({ backgroundStyle: 'wallpaper', wallpaperUrl: dataUrl });
      const kb = Math.round((dataUrl.length * 3) / 4 / 1024);
      setUploadStatus(`Saved locally (${kb} KB)`);
    } catch (err) {
      setUploadStatus('');
      setUploadError(err?.message || 'Failed to process image.');
    }
  };

  const customHexValue = /^#[0-9a-f]{6}$/i.test(prefs.solidColor || '')
    ? prefs.solidColor
    : '#1e293b';

  const isUploadedDataUrl = Boolean(prefs.wallpaperUrl?.startsWith('data:image/'));

  return (
    <div className="absolute right-0 mt-2 w-[348px] max-w-[calc(100vw-2rem)] max-h-[82vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl text-xs z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--brand)]" />
          <span className="font-semibold text-[var(--ink)] text-sm">Customize Page</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close customize menu"
          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Section Tabs */}
      <div className="grid grid-cols-3 border-b border-[var(--line)] bg-[var(--surface)] shrink-0">
        {[
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'widgets', label: 'Widgets', icon: Grid },
          { id: 'layout', label: 'Layout', icon: LayoutGrid }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer ${
                active
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* TAB 1: APPEARANCE */}
        {activeTab === 'appearance' && (
          <>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Background Style
              </div>
              <SegmentedButtons
                value={prefs.backgroundStyle || 'slate'}
                onChange={(val) => updatePrefs({ backgroundStyle: val })}
                options={[
                  { value: 'slate', label: 'Solid' },
                  { value: 'gradient', label: 'Gradient' },
                  { value: 'wallpaper', label: 'Image' }
                ]}
              />

              {/* Solid Color Presets + Custom Picker */}
              {(prefs.backgroundStyle || 'slate') === 'slate' && (
                <div className="mt-3 space-y-2.5">
                  <div className="grid grid-cols-4 gap-2">
                    {NEWTAB_SOLID_PRESETS.map((swatch) => {
                      const active = (prefs.solidColor || 'default') === swatch.id;
                      return (
                        <button
                          key={swatch.id}
                          type="button"
                          onClick={() => updatePrefs({ solidColor: swatch.id })}
                          title={swatch.label}
                          className={`group flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-colors cursor-pointer ${
                            active
                              ? 'border-[var(--brand)] bg-[var(--brand-soft)]/50'
                              : 'border-[var(--line)] hover:border-[var(--brand)]/40 bg-[var(--surface-subtle)]'
                          }`}
                        >
                          <div
                            className="w-full h-6 rounded-md border border-black/15 flex items-center justify-center"
                            style={{
                              backgroundColor: swatch.hex || 'var(--background)'
                            }}
                          >
                            {active && (
                              <Check
                                className={`w-3.5 h-3.5 ${
                                  swatch.isDark === false ? 'text-slate-900' : 'text-white drop-shadow'
                                }`}
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-[var(--muted)] truncate w-full text-center">
                            {swatch.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
                    <span className="text-[11px] font-medium text-[var(--ink)]">Custom Color</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] font-mono text-[var(--muted)] uppercase">
                        {/^#[0-9a-f]{6}$/i.test(prefs.solidColor || '') ? prefs.solidColor : 'Pick'}
                      </span>
                      <input
                        type="color"
                        value={customHexValue}
                        onChange={(e) => updatePrefs({ solidColor: e.target.value })}
                        className="w-6 h-6 rounded border border-[var(--line)] bg-transparent cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Gradient Presets */}
              {prefs.backgroundStyle === 'gradient' && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {NEWTAB_GRADIENT_PRESETS.map((grad) => {
                    const active = (prefs.gradientPreset || 'aurora') === grad.id;
                    return (
                      <button
                        key={grad.id}
                        type="button"
                        onClick={() => updatePrefs({ gradientPreset: grad.id })}
                        aria-label={grad.label}
                        className={`relative h-11 rounded-xl border overflow-hidden transition-all cursor-pointer ${
                          active
                            ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/30'
                            : 'border-[var(--line)] hover:border-[var(--brand)]/50'
                        }`}
                        style={{ background: grad.css }}
                      >
                        {active && (
                          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--brand)] text-white flex items-center justify-center shadow-xs">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Image Wallpaper */}
              {prefs.backgroundStyle === 'wallpaper' && (
                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={isUploadedDataUrl ? '' : (prefs.wallpaperUrl || '')}
                      onChange={(e) => {
                        setUploadStatus('');
                        setUploadError('');
                        updatePrefs({ wallpaperUrl: e.target.value });
                      }}
                      placeholder={isUploadedDataUrl ? 'Local image uploaded' : 'Paste image URL...'}
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-xs text-[var(--ink)] placeholder-[var(--muted)]"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload local image"
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-[var(--ink)] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[var(--brand)]" />
                      <span>Upload</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleWallpaperUpload}
                      className="hidden"
                    />
                  </div>

                  {prefs.wallpaperUrl && (
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)]">
                      <span className="text-[11px] text-[var(--muted)] flex items-center gap-1.5 truncate">
                        <ImageIcon className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                        <span className="truncate">
                          {uploadStatus || (isUploadedDataUrl ? 'Local wallpaper active' : 'Custom URL active')}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          updatePrefs({ wallpaperUrl: '' });
                          setUploadStatus('');
                        }}
                        className="text-[11px] font-semibold text-[var(--danger)] hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[11px] text-[var(--danger)] font-medium">{uploadError}</p>
                  )}

                  {/* Background Dim Slider */}
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[var(--ink)]">Background Dim Overlay</span>
                      <span className="text-[var(--muted)] tabular-nums">{prefs.wallpaperDim ?? 45}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={85}
                      step={5}
                      value={prefs.wallpaperDim ?? 45}
                      onChange={(e) => updatePrefs({ wallpaperDim: Number(e.target.value) })}
                      className="w-full accent-[var(--brand)] cursor-pointer"
                    />
                  </div>

                  {/* Subtle Blur Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <div className="text-[11px] font-medium text-[var(--ink)]">Subtle Background Blur</div>
                      {isLowPowerDevice && (
                        <div className="text-[10px] text-[var(--muted)]">Disabled in low-power mode</div>
                      )}
                    </div>
                    <ToggleSwitch
                      checked={!isLowPowerDevice && Boolean(prefs.wallpaperBlur)}
                      onChange={(val) => !isLowPowerDevice && updatePrefs({ wallpaperBlur: val })}
                      label="Toggle background blur"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Card & Widget Surface Contrast
              </div>
              <SegmentedButtons
                value={prefs.surfaceContrast || 'auto'}
                onChange={(val) => updatePrefs({ surfaceContrast: val })}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' }
                ]}
              />
            </div>
          </>
        )}

        {/* TAB 2: WIDGETS */}
        {activeTab === 'widgets' && (
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)]/70 border border-[var(--line)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Search Bar
                </span>
                <ToggleSwitch
                  checked={prefs.showSearchBar !== false}
                  onChange={(val) => updatePrefs({ showSearchBar: val })}
                  label="Show search bar"
                />
              </div>
              {prefs.showSearchBar !== false && (
                <SegmentedButtons
                  cols={2}
                  value={prefs.searchBarStyle || 'standard'}
                  onChange={(val) => updatePrefs({ searchBarStyle: val })}
                  options={[
                    { value: 'standard', label: 'Standard' },
                    { value: 'compact', label: 'Compact' }
                  ]}
                />
              )}
            </div>

            {/* Quick Links & Top Visited */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)]/70 border border-[var(--line)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Quick Links (Speed Dial)
                </span>
                <ToggleSwitch
                  checked={prefs.showQuickLinks !== false}
                  onChange={(val) => updatePrefs({ showQuickLinks: val })}
                  label="Show quick links"
                />
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]/70">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Top Visited Sites
                </span>
                <ToggleSwitch
                  checked={Boolean(prefs.showTopVisited || prefs.quickLinksSource === 'top_visited')}
                  onChange={(val) => updatePrefs({ showTopVisited: val, quickLinksSource: 'custom' })}
                  label="Show top visited sites"
                />
              </div>
              {(prefs.showQuickLinks !== false || Boolean(prefs.showTopVisited || prefs.quickLinksSource === 'top_visited')) && (
                <div className="space-y-2 pt-1 border-t border-[var(--line)]/70">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
                      Columns per Row
                    </div>
                    <SegmentedButtons
                      cols={3}
                      value={Number(prefs.quickLinksColumns) || 6}
                      onChange={(val) => updatePrefs({ quickLinksColumns: val })}
                      options={[
                        { value: 4, label: '4 cols' },
                        { value: 6, label: '6 cols' },
                        { value: 8, label: '8 cols' }
                      ]}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
                      Tile Style
                    </div>
                    <SegmentedButtons
                      cols={2}
                      value={prefs.quickLinksStyle || 'card'}
                      onChange={(val) => updatePrefs({ quickLinksStyle: val })}
                      options={[
                        { value: 'card', label: 'Icon + Title' },
                        { value: 'icon_only', label: 'Icon Only' }
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Clock & Greeting */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)]/70 border border-[var(--line)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Clock & Greeting
                </span>
                <ToggleSwitch
                  checked={prefs.showClock !== false}
                  onChange={(val) => updatePrefs({ showClock: val })}
                  label="Show clock and greeting"
                />
              </div>
              {prefs.showClock !== false && (
                <div className="space-y-2 pt-0.5">
                  <SegmentedButtons
                    cols={2}
                    value={prefs.clockFormat || '12h'}
                    onChange={(val) => updatePrefs({ clockFormat: val })}
                    options={[
                      { value: '12h', label: '12-Hour' },
                      { value: '24h', label: '24-Hour' }
                    ]}
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--ink)] font-medium">Show Seconds</span>
                    <ToggleSwitch
                      checked={Boolean(prefs.showSeconds)}
                      onChange={(val) => updatePrefs({ showSeconds: val })}
                      label="Show seconds"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--ink)] font-medium">Show Date</span>
                    <ToggleSwitch
                      checked={prefs.showDate !== false}
                      onChange={(val) => updatePrefs({ showDate: val })}
                      label="Show date"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <input
                      type="text"
                      value={prefs.greetingName || ''}
                      onChange={(e) => updatePrefs({ greetingName: e.target.value.slice(0, 32) })}
                      placeholder="Your name..."
                      className="px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-[11px] text-[var(--ink)] placeholder-[var(--muted)]"
                    />
                    <input
                      type="text"
                      value={prefs.greetingSubtitle || ''}
                      onChange={(e) => updatePrefs({ greetingSubtitle: e.target.value.slice(0, 48) })}
                      placeholder="Subtitle..."
                      className="px-2 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] outline-none text-[11px] text-[var(--ink)] placeholder-[var(--muted)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Notes */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)]/70 border border-[var(--line)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Quick Notes
                </span>
                <ToggleSwitch
                  checked={isNotesEnabled}
                  onChange={handleToggleNotes}
                  label="Show quick notes"
                />
              </div>
              {isNotesEnabled && Array.isArray(noteSections) && noteSections.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">
                    Pinned Note Section
                  </div>
                  <select
                    value={prefs.pinnedNoteSectionId || activeNoteSectionId || noteSections[0]?.id || ''}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      updatePrefs({ pinnedNoteSectionId: nextId });
                      if (typeof onSelectNoteSection === 'function') {
                        onSelectNoteSection(nextId);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--line)] text-[11px] font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)] cursor-pointer"
                  >
                    {noteSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.title || 'Untitled Note'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Klarity Financial / Bills Glance */}
            <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)]/70 border border-[var(--line)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[var(--brand)]" />
                  Klarity Financial Glance
                </span>
                <ToggleSwitch
                  checked={Boolean(prefs.showFinanceGlance)}
                  onChange={(val) => updatePrefs({ showFinanceGlance: val })}
                  label="Show financial glance widget"
                />
              </div>
              {prefs.showFinanceGlance && (
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-[var(--muted)]">Mask dollar amounts by default</span>
                  <ToggleSwitch
                    checked={prefs.financeGlanceMasked !== false}
                    onChange={(val) => updatePrefs({ financeGlanceMasked: val })}
                    label="Mask financial glance amounts"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LAYOUT */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Page Alignment
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'centered',
                    label: 'Centered',
                    desc: 'Classic focused new-tab look'
                  },
                  {
                    id: 'dashboard',
                    label: 'Dashboard Grid',
                    desc: 'Wider multi-column layout'
                  }
                ].map((opt) => {
                  const active = (prefs.layoutMode || 'centered') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updatePrefs({ layoutMode: opt.id })}
                      className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--brand-soft)] border-[var(--brand)]'
                          : 'bg-[var(--surface-subtle)] border-[var(--line)] hover:border-[var(--brand)]/40'
                      }`}
                    >
                      <div className={`text-xs font-semibold ${active ? 'text-[var(--brand)]' : 'text-[var(--ink)]'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-[var(--muted)] mt-0.5 leading-snug">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">
                Spacing Density
              </div>
              <SegmentedButtons
                cols={2}
                value={prefs.layoutDensity || 'spacious'}
                onChange={(val) => updatePrefs({ layoutDensity: val })}
                options={[
                  { value: 'spacious', label: 'Spacious' },
                  { value: 'compact', label: 'Compact' }
                ]}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer: Reset to Default */}
      <div className="px-4 py-2.5 border-t border-[var(--line)] bg-[var(--surface-subtle)]/50 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Default</span>
        </button>
        <span className="text-[10px] text-[var(--muted)] font-medium">Saved automatically</span>
      </div>
    </div>
  );
}
