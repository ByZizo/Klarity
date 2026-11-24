import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Download,
  X,
  Check,
  AlertCircle,
  Loader2,
  Sparkles,
  FileOutput
} from 'lucide-react';
import { Button, Card } from './ui';
import {
  buildSafeExportFilename,
  ensureDocumentCanonical,
  exportVaultDocument,
  getExportFormatRecommendations,
  triggerSafeBlobDownload
} from '../utils/documentPipeline';

export default function VaultExportModal({
  doc,
  isOpen,
  onClose,
  onShowToast
}) {
  const [resolvedCanonical, setResolvedCanonical] = useState(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [fileNameInput, setFileNameInput] = useState('');
  const [scopeType, setScopeType] = useState('full'); // 'full' | 'table' | 'slides'
  const [selectedTableIndex, setSelectedTableIndex] = useState(0);
  const [slideStart, setSlideStart] = useState(1);
  const [slideEnd, setSlideEnd] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [error, setError] = useState('');

  const abortRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !doc) return;
    let active = true;
    setError('');
    setScopeType('full');
    setSelectedTableIndex(0);
    setFileNameInput(doc.name || doc.fileName || 'document');

    async function loadCanonical() {
      setIsPreparing(true);
      try {
        const canonical = await ensureDocumentCanonical(doc);
        if (!active) return;
        setResolvedCanonical(canonical);
        const slideCount = canonical?.slides?.length || 1;
        setSlideStart(1);
        setSlideEnd(slideCount);

        const recs = getExportFormatRecommendations({ ...doc, canonical });
        if (recs.length > 0) {
          setSelectedFormat(recs[0].id);
        }
      } catch (err) {
        if (active) setError(err?.message || 'Could not inspect document for export.');
      } finally {
        if (active) setIsPreparing(false);
      }
    }

    loadCanonical();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [isOpen, doc]);

  const formatOptions = useMemo(() => {
    if (!doc) return [];
    return getExportFormatRecommendations({ ...doc, canonical: resolvedCanonical });
  }, [doc, resolvedCanonical]);

  const activeFormatMeta = useMemo(
    () => formatOptions.find((f) => f.id === selectedFormat) || formatOptions[0],
    [formatOptions, selectedFormat]
  );

  const previewFileName = useMemo(
    () => buildSafeExportFilename(fileNameInput || doc?.name || 'document', selectedFormat),
    [fileNameInput, doc, selectedFormat]
  );

  if (!isOpen || !doc) return null;

  const tables = resolvedCanonical?.tables || [];
  const slides = resolvedCanonical?.slides || [];

  const handleClose = () => {
    abortRef.current?.abort();
    setIsExporting(false);
    onClose?.();
  };

  const handleExport = async (e) => {
    e.preventDefault();
    if (!resolvedCanonical) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsExporting(true);
    setError('');
    setProgress({ percent: 10, stage: 'Starting export...' });

    try {
      const scope =
        scopeType === 'table'
          ? { type: 'table', tableIndex: selectedTableIndex }
          : scopeType === 'slides'
          ? { type: 'slides', slideStart, slideEnd }
          : { type: 'full' };

      const result = await exportVaultDocument(
        { ...doc, canonical: resolvedCanonical },
        {
          targetFormat: selectedFormat,
          fileName: fileNameInput,
          scope,
          signal: controller.signal,
          onProgress: (p) => setProgress(p)
        }
      );

      triggerSafeBlobDownload(result.bytes, result.mimeType, result.fileName);
      onShowToast?.(`Exported "${result.fileName}"`, 'success');
      handleClose();
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Export cancelled.');
      } else {
        setError(err?.message || 'Failed to export document.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={handleClose} />
      <Card className="relative w-full max-w-xl p-6 shadow-2xl z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 text-[var(--ink)] font-semibold text-[17px]">
            <FileOutput className="w-5 h-5 text-[#1B4B91]" />
            <span>Export Document As...</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close export modal"
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[13px] text-[var(--muted)] flex items-center justify-between gap-2 bg-[var(--surface-subtle)] px-3 py-2 rounded-[8px] border border-[var(--line)]">
          <span className="truncate font-medium text-[var(--ink)]">{doc.name}</span>
          <span className="text-[11px] shrink-0">
            {resolvedCanonical?.summary || (isPreparing ? 'Analyzing...' : '')}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleExport} className="flex flex-col gap-4">
          {/* Format Grid with Smart Recommendations */}
          <div>
            <label className="text-[13px] font-medium text-[var(--ink)] block mb-2">
              Choose Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {formatOptions.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`p-2.5 rounded-[10px] border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'border-[#1B4B91] bg-[#1B4B91]/10 ring-1 ring-[#1B4B91]'
                        : 'border-[var(--line)] bg-[var(--surface-subtle)] hover:border-[#1B4B91]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[13px] text-[var(--ink)]">{fmt.shortLabel}</span>
                      {fmt.recommended && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="w-2.5 h-2.5" />
                          Best
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--muted)] leading-tight">{fmt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fidelity Guardrail Notice */}
          {activeFormatMeta?.fidelityNote && (
            <div className="p-2.5 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-[12px] text-[var(--ink)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{activeFormatMeta.fidelityNote}</span>
            </div>
          )}

          {/* Scope Selector (when tables or slides exist) */}
          {(tables.length > 0 || slides.length > 1) && (
            <div className="p-3 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--line)] flex flex-col gap-2.5">
              <label className="text-[12px] font-semibold text-[var(--ink)] uppercase tracking-wider">
                Export Scope
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScopeType('full')}
                  className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border cursor-pointer ${
                    scopeType === 'full'
                      ? 'bg-[#1B4B91] text-white border-[#1B4B91]'
                      : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                  }`}
                >
                  Full Document
                </button>
                {tables.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setScopeType('table')}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border cursor-pointer ${
                      scopeType === 'table'
                        ? 'bg-[#1B4B91] text-white border-[#1B4B91]'
                        : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                    }`}
                  >
                    Specific Sheet / Table
                  </button>
                )}
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setScopeType('slides')}
                    className={`px-3 py-1.5 rounded-[8px] text-[12px] font-medium border cursor-pointer ${
                      scopeType === 'slides'
                        ? 'bg-[#1B4B91] text-white border-[#1B4B91]'
                        : 'bg-[var(--surface)] text-[var(--ink)] border-[var(--line)]'
                    }`}
                  >
                    Slide Range
                  </button>
                )}
              </div>

              {scopeType === 'table' && tables.length > 0 && (
                <select
                  value={selectedTableIndex}
                  onChange={(e) => setSelectedTableIndex(Number(e.target.value))}
                  className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-[8px] px-3 py-1.5 text-[13px] text-[var(--ink)]"
                >
                  {tables.map((t, idx) => (
                    <option key={idx} value={idx}>
                      {t.name || `Table ${idx + 1}`} ({(t.rows || []).length} rows)
                    </option>
                  ))}
                </select>
              )}

              {scopeType === 'slides' && slides.length > 1 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="text-[var(--muted)]">From slide</span>
                  <input
                    type="number"
                    min={1}
                    max={slides.length}
                    value={slideStart}
                    onChange={(e) => setSlideStart(Math.max(1, Math.min(slides.length, Number(e.target.value) || 1)))}
                    className="w-16 bg-[var(--surface)] border border-[var(--line)] rounded-[6px] px-2 py-1 text-[var(--ink)]"
                  />
                  <span className="text-[var(--muted)]">to</span>
                  <input
                    type="number"
                    min={slideStart}
                    max={slides.length}
                    value={slideEnd}
                    onChange={(e) => setSlideEnd(Math.max(slideStart, Math.min(slides.length, Number(e.target.value) || slides.length)))}
                    className="w-16 bg-[var(--surface)] border border-[var(--line)] rounded-[6px] px-2 py-1 text-[var(--ink)]"
                  />
                  <span className="text-[var(--muted)]">of {slides.length}</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Filename */}
          <div>
            <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
              Output Filename
            </label>
            <input
              type="text"
              required
              value={fileNameInput}
              onChange={(e) => setFileNameInput(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
            />
            <p className="text-[11px] text-[var(--muted)] mt-1">
              Will save as: <strong className="text-[var(--ink)]">{previewFileName}</strong>
            </p>
          </div>

          {isExporting && (
            <div className="flex items-center gap-2 text-[12px] text-[#1B4B91] font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{progress.stage || 'Generating file...'}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line)]">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isExporting || isPreparing || !resolvedCanonical}>
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Exporting...' : `Export ${activeFormatMeta?.shortLabel || ''}`}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
