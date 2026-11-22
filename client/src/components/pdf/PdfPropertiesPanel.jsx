import React, { useRef } from 'react';
import {
  X,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Trash2,
  Copy,
  Layers,
  ShieldAlert,
  Upload
} from 'lucide-react';
import {
  EDITOR_FONTS,
  getRegisteredCustomFonts,
  registerCustomFontBytes
} from '../../utils/pdfEditorEngine';

export default function PdfPropertiesPanel({
  selectedItems = [], // array of annotations OR single customField
  selectedField = null,
  numPages = 1,
  signers = [],
  onUpdateAnnotation,
  onBatchUpdateAnnotations,
  onDeleteSelected,
  onDuplicateSelected,
  onLayerChange,
  onAlignSelected,
  onDistributeSelected,
  onSwitchWhiteoutToRedact,
  onUpdateField,
  onDeleteField,
  onDuplicateField,
  onApplyFieldToAllPages,
  onClose,
  onFontAdded,
  readOnlyLocked = false
}) {
  const customFontInputRef = useRef(null);
  const replaceImgInputRef = useRef(null);

  if (selectedItems.length === 0 && !selectedField) return null;

  const isMulti = selectedItems.length > 1;
  const primary = selectedItems[0] || null;

  const handleUploadCustomFont = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const bytes = new Uint8Array(ev.target.result);
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const fontId = registerCustomFontBytes(cleanName, bytes);
      try {
        const blobUrl = URL.createObjectURL(file);
        const face = new FontFace(cleanName, `url(${blobUrl})`);
        await face.load();
        document.fonts.add(face);
      } catch {}
      if (primary) onUpdateAnnotation(primary.id, { fontFamily: fontId });
      if (selectedField) onUpdateField(selectedField.id, { fontFamily: fontId });
      if (onFontAdded) onFontAdded(fontId);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleReplaceImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !primary) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      onUpdateAnnotation(primary.id, { dataUrl: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const customFonts = getRegisteredCustomFonts();

  return (
    <aside
      aria-label="Selection Properties"
      className="w-72 border-l border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex flex-col shrink-0 h-full overflow-y-auto"
    >
      <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between bg-[var(--surface-subtle)] sticky top-0 z-10">
        <span className="text-[13px] font-semibold uppercase tracking-wide text-[var(--ink)]">
          {selectedField
            ? `Field: ${selectedField.type}`
            : isMulti
            ? `${selectedItems.length} Objects Selected`
            : `Properties: ${primary?.type}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close properties panel"
          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 text-[13px]">
        {/* MULTI-SELECT ALIGN & DISTRIBUTE */}
        {isMulti && !readOnlyLocked && (
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[12px] font-semibold text-[var(--muted)] mb-1.5">Align Selection</div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  ['left', 'Align Left'],
                  ['center', 'Align Center'],
                  ['right', 'Align Right'],
                  ['top', 'Align Top'],
                  ['middle', 'Align Middle'],
                  ['bottom', 'Align Bottom']
                ].map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onAlignSelected(mode)}
                    className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-medium cursor-pointer"
                  >
                    {label.replace('Align ', '')}
                  </button>
                ))}
              </div>
            </div>

            {selectedItems.length >= 3 && (
              <div>
                <div className="text-[12px] font-semibold text-[var(--muted)] mb-1.5">Distribute</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDistributeSelected('horizontal')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-medium cursor-pointer"
                  >
                    Horizontal
                  </button>
                  <button
                    type="button"
                    onClick={() => onDistributeSelected('vertical')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-medium cursor-pointer"
                  >
                    Vertical
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="text-[12px] font-semibold text-[var(--muted)] mb-1.5">Batch Opacity</div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={primary?.opacity ?? 1}
                onChange={(e) => onBatchUpdateAnnotations({ opacity: Number(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={onDuplicateSelected}
                className="flex-1 py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={onDeleteSelected}
                className="flex-1 py-2 px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* SINGLE ANNOTATION PROPERTIES */}
        {!isMulti && primary && (
          <>
            {/* Lock & Layer Ordering */}
            {!readOnlyLocked && (
              <div className="flex items-center justify-between gap-1.5 pb-3 border-b border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => onUpdateAnnotation(primary.id, { locked: !primary.locked })}
                  className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-semibold flex items-center gap-1 cursor-pointer ${
                    primary.locked
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                      : 'border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink)]'
                  }`}
                >
                  {primary.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{primary.locked ? 'Locked' : 'Lock'}</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onLayerChange(primary.id, 'up')}
                    title="Bring Forward"
                    aria-label="Bring Forward"
                    className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onLayerChange(primary.id, 'down')}
                    title="Send Backward"
                    aria-label="Send Backward"
                    className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TEXT / COVERTEXT / CALLOUT PROPERTIES */}
            {(primary.type === 'text' || primary.type === 'coverText' || primary.type === 'callout') && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Content</label>
                  <textarea
                    rows={3}
                    value={primary.text || ''}
                    disabled={primary.locked || readOnlyLocked}
                    onChange={(e) => onUpdateAnnotation(primary.id, { text: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[14px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[12px] font-semibold text-[var(--muted)]">Font Family</label>
                    <button
                      type="button"
                      onClick={() => customFontInputRef.current?.click()}
                      className="text-[11px] font-semibold text-[var(--brand)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Font</span>
                    </button>
                    <input
                      ref={customFontInputRef}
                      type="file"
                      accept=".ttf,.otf,.woff"
                      onChange={handleUploadCustomFont}
                      className="hidden"
                    />
                  </div>
                  <select
                    value={primary.fontFamily || 'Inter'}
                    disabled={primary.locked || readOnlyLocked}
                    onChange={(e) => onUpdateAnnotation(primary.id, { fontFamily: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px] text-[var(--ink)]"
                  >
                    {EDITOR_FONTS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                    {customFonts.map((cf) => (
                      <option key={cf.id} value={cf.id}>
                        {cf.label} (Custom)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Size (px)</label>
                    <input
                      type="number"
                      min={8}
                      max={96}
                      value={primary.fontSize || 16}
                      disabled={primary.locked || readOnlyLocked}
                      onChange={(e) => onUpdateAnnotation(primary.id, { fontSize: Number(e.target.value) || 14 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Line Spacing</label>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      step={0.1}
                      value={primary.lineSpacing || 1.3}
                      disabled={primary.locked || readOnlyLocked}
                      onChange={(e) => onUpdateAnnotation(primary.id, { lineSpacing: Number(e.target.value) || 1.3 })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                    />
                  </div>
                </div>

                {/* Formatting & Alignment Buttons */}
                <div className="flex flex-wrap gap-1">
                  {[
                    ['isBold', Bold, 'Bold'],
                    ['isItalic', Italic, 'Italic'],
                    ['isUnderline', Underline, 'Underline'],
                    ['isStrikethrough', Strikethrough, 'Strikethrough']
                  ].map(([prop, Icon, title]) => (
                    <button
                      key={prop}
                      type="button"
                      disabled={primary.locked || readOnlyLocked}
                      onClick={() => onUpdateAnnotation(primary.id, { [prop]: !primary[prop] })}
                      title={title}
                      className={`p-2 rounded-lg border cursor-pointer ${
                        primary[prop]
                          ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                          : 'bg-[var(--surface-subtle)] border-[var(--line)] text-[var(--ink)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                  {['left', 'center', 'right'].map((al) => {
                    const Icon = al === 'left' ? AlignLeft : al === 'center' ? AlignCenter : AlignRight;
                    return (
                      <button
                        key={al}
                        type="button"
                        disabled={primary.locked || readOnlyLocked}
                        onClick={() => onUpdateAnnotation(primary.id, { align: al })}
                        title={`Align ${al}`}
                        className={`p-2 rounded-lg border cursor-pointer ${
                          (primary.align || 'left') === al
                            ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                            : 'bg-[var(--surface-subtle)] border-[var(--line)] text-[var(--ink)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Text</label>
                    <input
                      type="color"
                      value={primary.color || '#000000'}
                      onChange={(e) => onUpdateAnnotation(primary.id, { color: e.target.value })}
                      className="w-full h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Fill</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={primary.bgColor && primary.bgColor !== 'transparent' ? primary.bgColor : '#ffffff'}
                        onChange={(e) => onUpdateAnnotation(primary.id, { bgColor: e.target.value })}
                        className="flex-1 h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateAnnotation(primary.id, { bgColor: 'transparent' })}
                        title="Transparent fill"
                        className="text-[11px] px-1.5 py-1 rounded border border-[var(--line)]"
                      >
                        ∅
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">Border</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={primary.borderColor && primary.borderColor !== 'transparent' ? primary.borderColor : '#1B4B91'}
                        onChange={(e) => onUpdateAnnotation(primary.id, { borderColor: e.target.value })}
                        className="flex-1 h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => onUpdateAnnotation(primary.id, { borderColor: 'transparent' })}
                        title="No border"
                        className="text-[11px] px-1.5 py-1 rounded border border-[var(--line)]"
                      >
                        ∅
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SHAPE / DRAW / MARKUP */}
            {(primary.type === 'shape' ||
              primary.type === 'draw' ||
              ['highlight', 'underline', 'strikethrough', 'squiggly'].includes(primary.type)) && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                      {primary.type === 'shape' ? 'Stroke Color' : 'Color'}
                    </label>
                    <input
                      type="color"
                      value={primary.strokeColor || primary.color || '#1B4B91'}
                      onChange={(e) =>
                        onUpdateAnnotation(primary.id, {
                          strokeColor: e.target.value,
                          color: e.target.value
                        })
                      }
                      className="w-full h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                    />
                  </div>
                  {primary.type === 'shape' && (
                    <div>
                      <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Fill Color</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="color"
                          value={primary.fillColor && primary.fillColor !== 'transparent' ? primary.fillColor : '#ffffff'}
                          onChange={(e) => onUpdateAnnotation(primary.id, { fillColor: e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateAnnotation(primary.id, { fillColor: 'transparent' })}
                          className="text-[11px] px-1.5 py-1 rounded border border-[var(--line)]"
                        >
                          ∅
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {(primary.type === 'shape' || primary.type === 'draw') && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Stroke Width</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        step={0.5}
                        value={primary.strokeWidth || primary.thickness || 2}
                        onChange={(e) =>
                          onUpdateAnnotation(primary.id, {
                            strokeWidth: Number(e.target.value) || 2,
                            thickness: Number(e.target.value) || 2
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)]"
                      />
                    </div>
                    {primary.type === 'shape' && (
                      <div>
                        <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Line Style</label>
                        <select
                          value={primary.dashStyle || 'solid'}
                          onChange={(e) => onUpdateAnnotation(primary.id, { dashStyle: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)]"
                        >
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* WHITEOUT COVER-ONLY WARNING & LINK TO REDACT */}
            {primary.type === 'whiteout' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[12px] leading-relaxed">
                  <strong>Cover-only:</strong> This whiteout hides content visually only. Underlying text can still be extracted.
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Cover Color</label>
                  <input
                    type="color"
                    value={primary.color || '#ffffff'}
                    onChange={(e) => onUpdateAnnotation(primary.id, { color: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[var(--line)] cursor-pointer"
                  />
                </div>
                {!readOnlyLocked && (
                  <button
                    type="button"
                    onClick={() => onSwitchWhiteoutToRedact(primary.id)}
                    className="py-2 px-3 rounded-lg bg-rose-600/15 border border-rose-500/40 text-rose-500 font-semibold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-600/25"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>Convert to Secure Redact</span>
                  </button>
                )}
              </div>
            )}

            {/* IMAGE / SIGNATURE PROPERTIES (Crop, Rotate, Replace, Caption) */}
            {(primary.type === 'image' || primary.type === 'signature') && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                    Rotation ({primary.rotation || 0}°)
                  </label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={5}
                    value={primary.rotation || 0}
                    onChange={(e) => onUpdateAnnotation(primary.id, { rotation: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                {primary.type === 'image' && (
                  <>
                    <div>
                      <div className="text-[12px] font-semibold text-[var(--muted)] mb-1">Crop Edges (%)</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {['cropTop', 'cropBottom', 'cropLeft', 'cropRight'].map((k) => (
                          <input
                            key={k}
                            type="number"
                            min={0}
                            max={45}
                            value={primary[k] || 0}
                            onChange={(e) =>
                              onUpdateAnnotation(primary.id, { [k]: Math.max(0, Math.min(45, Number(e.target.value))) })
                            }
                            placeholder={k.replace('crop', '')}
                            className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[12px]"
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => replaceImgInputRef.current?.click()}
                      className="py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-medium text-[12px] cursor-pointer"
                    >
                      Replace Image File
                    </button>
                    <input
                      ref={replaceImgInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleReplaceImage}
                      className="hidden"
                    />
                  </>
                )}
                {primary.type === 'signature' && (
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                      Name / Title line below
                    </label>
                    <input
                      type="text"
                      value={primary.captionText || ''}
                      onChange={(e) => onUpdateAnnotation(primary.id, { captionText: e.target.value })}
                      placeholder="Optional signer title..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* LINK PROPERTIES */}
            {primary.type === 'link' && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Link Action</label>
                  <select
                    value={primary.linkKind || 'url'}
                    onChange={(e) => onUpdateAnnotation(primary.id, { linkKind: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                  >
                    <option value="url">Open External URL (System Browser)</option>
                    <option value="page">Jump to Page in Document</option>
                  </select>
                </div>
                {(primary.linkKind || 'url') === 'url' ? (
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">URL</label>
                    <input
                      type="url"
                      value={primary.url || ''}
                      onChange={(e) => onUpdateAnnotation(primary.id, { url: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                      Target Page (1–{numPages})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={numPages}
                      value={primary.targetPage || 1}
                      onChange={(e) =>
                        onUpdateAnnotation(primary.id, { targetPage: Math.max(1, Math.min(numPages, Number(e.target.value))) })
                      }
                      className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* OPACITY SLIDER (SHARED) */}
            {primary.type !== 'redact' && primary.type !== 'whiteout' && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                  Opacity ({Math.round((primary.opacity ?? 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={primary.opacity ?? 1}
                  onChange={(e) => onUpdateAnnotation(primary.id, { opacity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}

            {!readOnlyLocked && (
              <div className="flex gap-2 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={onDuplicateSelected}
                  className="flex-1 py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="flex-1 py-2 px-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* FILL & SIGN CUSTOM FIELD PROPERTIES */}
        {selectedField && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Field Name</label>
              <input
                type="text"
                value={selectedField.name || ''}
                disabled={readOnlyLocked}
                onChange={(e) => onUpdateField(selectedField.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Label / Tooltip</label>
              <input
                type="text"
                value={selectedField.label || ''}
                disabled={readOnlyLocked}
                onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
              />
            </div>

            {signers.length > 0 && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Assigned Signer</label>
                <select
                  value={selectedField.signerId || signers[0]?.id}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { signerId: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                >
                  {signers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedField.required)}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { required: e.target.checked })}
                />
                <span>Required</span>
              </label>
              <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedField.readOnly)}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { readOnly: e.target.checked })}
                />
                <span>Read-only</span>
              </label>
            </div>

            {(selectedField.type === 'text' || selectedField.type === 'paragraph') && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Validation</label>
                    <select
                      value={selectedField.validationFormat || ''}
                      disabled={readOnlyLocked}
                      onChange={(e) => onUpdateField(selectedField.id, { validationFormat: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[12px]"
                    >
                      <option value="">Any text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="zip">ZIP code</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Max chars</label>
                    <input
                      type="number"
                      min={0}
                      value={selectedField.maxLength || ''}
                      disabled={readOnlyLocked}
                      onChange={(e) =>
                        onUpdateField(selectedField.id, { maxLength: e.target.value ? Number(e.target.value) : null })
                      }
                      placeholder="None"
                      className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[12px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Default Value</label>
                  <input
                    type="text"
                    value={selectedField.defaultValue || ''}
                    disabled={readOnlyLocked}
                    onChange={(e) => onUpdateField(selectedField.id, { defaultValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                  />
                </div>
              </>
            )}

            {(selectedField.type === 'dropdown' || selectedField.type === 'radio') && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                  Options (one per line)
                </label>
                <textarea
                  rows={4}
                  value={(selectedField.options || []).join('\n')}
                  disabled={readOnlyLocked}
                  onChange={(e) =>
                    onUpdateField(selectedField.id, {
                      options: e.target.value.split(/\r?\n/).filter((s) => s.trim() !== '')
                    })
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                />
              </div>
            )}

            {selectedField.type === 'date' && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Date Format</label>
                <select
                  value={selectedField.dateFormat || 'MM/DD/YYYY'}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { dateFormat: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="MMM D, YYYY">MMM D, YYYY</option>
                </select>
              </div>
            )}

            {(selectedField.type === 'signature' || selectedField.type === 'initials') && (
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">
                  Optional Name / Title Caption
                </label>
                <input
                  type="text"
                  value={selectedField.captionText || ''}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { captionText: e.target.value })}
                  placeholder="Printed below signature"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px]"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Font</label>
                <select
                  value={selectedField.fontFamily || 'Inter'}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { fontFamily: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[12px]"
                >
                  {EDITOR_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[var(--muted)] block mb-1">Size</label>
                <input
                  type="number"
                  min={8}
                  max={36}
                  value={selectedField.fontSize || 12}
                  disabled={readOnlyLocked}
                  onChange={(e) => onUpdateField(selectedField.id, { fontSize: Number(e.target.value) || 12 })}
                  className="w-full px-2 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[12px]"
                />
              </div>
            </div>

            {!readOnlyLocked && (
              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => onApplyFieldToAllPages(selectedField)}
                  className="w-full py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Apply to All Pages</span>
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDuplicateField(selectedField)}
                    className="flex-1 py-2 px-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[12px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteField(selectedField.id)}
                    className="flex-1 py-2 px-2 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 text-[12px] font-medium flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
