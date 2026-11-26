import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Crop,
  Download,
  FolderLock,
  Maximize2,
  RotateCcw,
  X
} from 'lucide-react';
import { loadDocumentFolders, saveDocument } from '../utils/documentVaultStorage';

function cropDataUrlToCanvas(sourceDataUrl, selection, viewportSize) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onerror = () => reject(new Error('Failed to load captured snapshot.'));
    img.onload = () => {
      try {
        const scaleX = img.naturalWidth / Math.max(1, viewportSize.width);
        const scaleY = img.naturalHeight / Math.max(1, viewportSize.height);

        const sx = Math.max(0, Math.round(selection.x * scaleX));
        const sy = Math.max(0, Math.round(selection.y * scaleY));
        const sw = Math.min(img.naturalWidth - sx, Math.max(1, Math.round(selection.width * scaleX)));
        const sh = Math.min(img.naturalHeight - sy, Math.max(1, Math.round(selection.height * scaleY)));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Could not encode snapshot PNG.'));
              return;
            }
            const dataUrl = canvas.toDataURL('image/png');
            // Release canvas backing store immediately
            canvas.width = 0;
            canvas.height = 0;
            resolve({
              dataUrl,
              blob,
              pixelWidth: sw,
              pixelHeight: sh
            });
          },
          'image/png'
        );
      } catch (err) {
        reject(err);
      }
    };
    img.src = sourceDataUrl;
  });
}

export function BrowserSnapshotOverlay({
  sourceDataUrl,
  pageTitle = '',
  pageUrl = '',
  onClose,
  onShowToast
}) {
  const containerRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [selection, setSelection] = useState(null); // { x, y, width, height }
  const [isDragging, setIsDragging] = useState(false);

  const [capturedCrop, setCapturedCrop] = useState(null); // { dataUrl, blob, pixelWidth, pixelHeight }
  const [copyDone, setCopyDone] = useState(false);
  const [savingVault, setSavingVault] = useState(false);
  const [savedVaultDone, setSavedVaultDone] = useState(false);

  const folders = loadDocumentFolders();
  const [selectedFolder, setSelectedFolder] = useState(() => folders[0] || '');

  // Clean up temporary buffers on unmount
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      setCapturedCrop(null);
    };
  }, [onClose]);

  const getRelativePoint = (clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, maxW: 1, maxH: 1 };
    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
      maxW: rect.width,
      maxH: rect.height
    };
  };

  const handlePointerDown = (e) => {
    if (capturedCrop || e.button !== 0) return;
    if (e.target?.closest?.('[data-snapshot-toolbar="true"]')) return;
    e.preventDefault();
    const pt = getRelativePoint(e.clientX, e.clientY);
    setDragStart({ x: pt.x, y: pt.y });
    setSelection({ x: pt.x, y: pt.y, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !dragStart) return;
    const pt = getRelativePoint(e.clientX, e.clientY);
    const x = Math.min(dragStart.x, pt.x);
    const y = Math.min(dragStart.y, pt.y);
    const width = Math.abs(pt.x - dragStart.x);
    const height = Math.abs(pt.y - dragStart.y);
    setSelection({ x, y, width, height });
  };

  const finalizeSelection = async (rectToCrop) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect || !sourceDataUrl) return;
    try {
      const result = await cropDataUrlToCanvas(sourceDataUrl, rectToCrop, {
        width: containerRect.width,
        height: containerRect.height
      });
      setCapturedCrop(result);
      setCopyDone(false);
      setSavedVaultDone(false);
    } catch (err) {
      onShowToast?.(err?.message || 'Could not process snapshot.', 'error');
    }
  };

  const handlePointerUp = async () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragStart(null);
    if (!selection || selection.width < 12 || selection.height < 12) {
      setSelection(null);
      return;
    }
    await finalizeSelection(selection);
  };

  const handleCaptureFullViewport = async () => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    const fullRect = {
      x: 0,
      y: 0,
      width: containerRect.width,
      height: containerRect.height
    };
    setSelection(fullRect);
    await finalizeSelection(fullRect);
  };

  const handleRetake = () => {
    setCapturedCrop(null);
    setSelection(null);
    setCopyDone(false);
    setSavedVaultDone(false);
  };

  const handleCopyClipboard = async () => {
    if (!capturedCrop?.dataUrl) return;
    try {
      if (window.klarityDesktop?.copyImageDataUrl) {
        const res = await window.klarityDesktop.copyImageDataUrl(capturedCrop.dataUrl);
        if (res?.ok) {
          setCopyDone(true);
          onShowToast?.('Snapshot copied to clipboard');
          setTimeout(() => setCopyDone(false), 2000);
          return;
        }
      }
      if (navigator.clipboard?.write && capturedCrop.blob && typeof window.ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': capturedCrop.blob })
        ]);
        setCopyDone(true);
        onShowToast?.('Snapshot copied to clipboard');
        setTimeout(() => setCopyDone(false), 2000);
        return;
      }
      throw new Error('Clipboard image API unavailable.');
    } catch {
      onShowToast?.('Could not copy image to clipboard.', 'error');
    }
  };

  const buildSnapshotFileName = () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const cleanTitle = String(pageTitle || 'Web-Capture')
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    return `Snapshot-${cleanTitle || 'Page'}-${stamp}.png`;
  };

  const handleDownloadPng = () => {
    if (!capturedCrop?.blob) return;
    const objectUrl = URL.createObjectURL(capturedCrop.blob);
    try {
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = buildSnapshotFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onShowToast?.('Snapshot downloaded as PNG');
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  const handleSaveToVault = async () => {
    if (!capturedCrop?.dataUrl || savingVault) return;
    setSavingVault(true);
    try {
      const fileName = buildSnapshotFileName();
      const docRecord = {
        id: `doc-snap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: fileName.replace(/\.png$/i, ''),
        fileName,
        mimeType: 'image/png',
        sourceFormat: 'png',
        size: capturedCrop.blob?.size || Math.round((capturedCrop.dataUrl.length * 3) / 4),
        folder: selectedFolder || '',
        tags: ['snapshot', 'browser'],
        searchPreview: `Web snapshot captured from ${pageTitle || ''} ${pageUrl || ''}`.trim(),
        dataUrl: capturedCrop.dataUrl,
        createdAt: new Date().toISOString()
      };
      await saveDocument(docRecord);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('klarity:vault-documents-updated'));
      }
      setSavedVaultDone(true);
      onShowToast?.('Saved snapshot encrypted to Document Vault');
    } catch (err) {
      onShowToast?.(err?.message || 'Failed to save snapshot to Document Vault.', 'error');
    } finally {
      setSavingVault(false);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      className={`absolute inset-0 z-40 select-none overflow-hidden ${
        capturedCrop ? 'cursor-default' : 'cursor-crosshair'
      }`}
      role="dialog"
      aria-label="Browser Snapshot Capture"
    >
      {/* Frozen Viewport Image Layer (1:1 crisp, zero GPU shader lag) */}
      {sourceDataUrl && (
        <img
          src={sourceDataUrl}
          alt="Captured browser viewport"
          draggable={false}
          className="w-full h-full object-fill pointer-events-none block"
        />
      )}

      {/* Top Instruction Pill (while selecting) */}
      {!capturedCrop && (
        <div
          data-snapshot-toolbar="true"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/92 text-white border border-white/15 shadow-lg text-xs"
        >
          <Crop className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-medium">Drag to capture area</span>
          <div className="w-px h-3.5 bg-white/20 mx-0.5" />
          <button
            type="button"
            onClick={handleCaptureFullViewport}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 font-semibold text-[11px] cursor-pointer transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Visible</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Cancel (Esc)"
            aria-label="Cancel snapshot"
            className="p-1 rounded-full hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4-Panel Lightweight Scrim + Crisp Selection Frame (No backdrop-blur for 60fps Chromebook performance) */}
      {!capturedCrop && !selection && (
        <div className="absolute inset-0 bg-black/35 pointer-events-none" />
      )}

      {!capturedCrop && selection && (
        <>
          {/* Top scrim */}
          <div
            className="absolute left-0 right-0 top-0 bg-black/45 pointer-events-none"
            style={{ height: `${selection.y}px` }}
          />
          {/* Bottom scrim */}
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/45 pointer-events-none"
            style={{ top: `${selection.y + selection.height}px` }}
          />
          {/* Left scrim */}
          <div
            className="absolute left-0 bg-black/45 pointer-events-none"
            style={{
              top: `${selection.y}px`,
              width: `${selection.x}px`,
              height: `${selection.height}px`
            }}
          />
          {/* Right scrim */}
          <div
            className="absolute right-0 bg-black/45 pointer-events-none"
            style={{
              top: `${selection.y}px`,
              left: `${selection.x + selection.width}px`,
              height: `${selection.height}px`
            }}
          />

          {/* Selection Rectangle */}
          <div
            className="absolute border-2 border-[#38bdf8] pointer-events-none"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              width: `${selection.width}px`,
              height: `${selection.height}px`
            }}
          >
            {/* Corner handles */}
            <span className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-[#0284c7]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-[#0284c7]" />
            <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-[#0284c7]" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-[#0284c7]" />

            {/* Live Dimensions & Coordinates Pill */}
            {selection.width >= 4 && selection.height >= 4 && (
              <div
                className={`absolute left-0 ${
                  selection.y > 28 ? '-top-7' : 'top-1.5 left-1.5'
                } px-2 py-0.5 rounded bg-slate-900/92 text-white text-[11px] font-mono tabular-nums whitespace-nowrap shadow`}
              >
                {Math.round(selection.width)} × {Math.round(selection.height)} px · ({Math.round(selection.x)}, {Math.round(selection.y)})
              </div>
            )}
          </div>
        </>
      )}

      {/* Post-Capture Preview & Actions Modal */}
      {capturedCrop && (
        <div
          data-snapshot-toolbar="true"
          className="absolute inset-0 bg-black/65 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose?.();
          }}
        >
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Camera className="w-4 h-4 text-[var(--brand)] shrink-0" />
                <span className="text-sm font-semibold truncate">Snapshot Preview</span>
                <span className="text-[11px] text-[var(--muted)] font-mono tabular-nums">
                  {capturedCrop.pixelWidth} × {capturedCrop.pixelHeight} px
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] border border-[var(--line)] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close snapshot preview"
                  className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Preview */}
            <div className="flex-1 min-h-0 overflow-auto p-4 bg-[var(--surface-subtle)] flex items-center justify-center">
              <img
                src={capturedCrop.dataUrl}
                alt="Cropped snapshot preview"
                className="max-w-full max-h-[54vh] object-contain rounded-lg border border-[var(--line)] shadow-md bg-white"
              />
            </div>

            {/* Actions Footer */}
            <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--surface)] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  {copyDone ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copyDone ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span>Download PNG</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                {folders.length > 0 && (
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    aria-label="Document Vault folder"
                    className="h-8 px-2 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-xs text-[var(--ink)] outline-none focus:border-[var(--brand)] cursor-pointer"
                  >
                    <option value="">All Documents</option>
                    {folders.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  disabled={savingVault || savedVaultDone}
                  onClick={handleSaveToVault}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] border border-[var(--line)] text-xs font-semibold cursor-pointer disabled:opacity-60 transition-colors"
                >
                  {savedVaultDone ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <FolderLock className="w-3.5 h-3.5 text-[var(--brand)]" />
                  )}
                  <span>
                    {savingVault ? 'Saving...' : savedVaultDone ? 'Saved to Vault' : 'Save to Document Vault'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrowserSnapshotOverlay;
