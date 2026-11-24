import React, { useState, useRef, useEffect } from 'react';
import {
  UploadCloud,
  X,
  Check,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileImage,
  File,
  Folder,
  Loader2,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { Button, Card } from './ui';
import { formatFileSize } from '../utils/documentVaultStorage';
import {
  IMPORT_ACCEPT_ATTRIBUTE,
  importExternalFile
} from '../utils/documentPipeline';

export default function VaultImportModal({
  isOpen,
  onClose,
  folders = [],
  initialFolder = '',
  initialFile = null,
  onImportComplete
}) {
  const [parsedResult, setParsedResult] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable import options
  const [docTitle, setDocTitle] = useState('');
  const [docFolder, setDocFolder] = useState('');
  const [newFolderInput, setNewFolderInput] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [docTagsInput, setDocTagsInput] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [keepOriginalPayload, setKeepOriginalPayload] = useState(true);

  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialFolder && initialFolder !== 'All' && folders.includes(initialFolder)) {
      setDocFolder(initialFolder);
    } else {
      setDocFolder('');
    }
    setNewFolderInput('');
    setError('');
    setParsedResult(null);
    setDocTitle('');
    setDocNotes('');
    setDocTagsInput('');
    setKeepOriginalPayload(true);
    setDocDate(new Date().toISOString().slice(0, 10));
  }, [isOpen, initialFolder, folders]);

  useEffect(() => {
    if (isOpen && initialFile) {
      handleFileSelected(initialFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialFile]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!isOpen) return null;

  const handleCancelParsing = () => {
    abortControllerRef.current?.abort();
    setIsParsing(false);
    setProgress({ percent: 0, stage: '' });
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setIsParsing(false);
    setParsedResult(null);
    setError('');
    onClose?.();
  };

  const handleFileSelected = async (file) => {
    if (!file) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setError('');
    setParsedResult(null);
    setIsParsing(true);
    setProgress({ percent: 5, stage: 'Validating file...' });

    try {
      const result = await importExternalFile(file, {
        signal: controller.signal,
        onProgress: (p) => setProgress(p)
      });
      setParsedResult(result);
      setDocTitle(result.title || '');
      setKeepOriginalPayload(Boolean(result.canEmbedOriginal));
    } catch (err) {
      if (err?.name === 'AbortError') {
        setError('Import cancelled.');
      } else {
        setError(err?.message || 'Could not parse the selected file.');
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!parsedResult) {
      setError('Please select or drop a file first.');
      return;
    }
    if (docFolder === '__CREATE_NEW__' && !newFolderInput.trim()) {
      setError('Please enter a name for the new folder.');
      return;
    }

    const title = docTitle.trim() || parsedResult.title || parsedResult.fileName;
    const targetFolder =
      docFolder === '__CREATE_NEW__' ? newFolderInput.trim() : docFolder.trim();
    const tags = docTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    setIsSaving(true);
    setError('');

    try {
      const canonicalWithTitle = {
        ...parsedResult.canonical,
        title
      };

      const newDoc = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: title,
        folder: targetFolder,
        fileName: parsedResult.fileName,
        fileType: parsedResult.fileType,
        fileSize: parsedResult.fileSize,
        sourceFormat: parsedResult.sourceFormat,
        dataUrl: keepOriginalPayload ? parsedResult.originalDataUrl : '',
        canonical: canonicalWithTitle,
        stats: canonicalWithTitle.stats,
        searchPreview: (canonicalWithTitle.plainText || '').slice(0, 2400),
        tags,
        notes: docNotes.trim(),
        date: docDate || new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString()
      };

      await onImportComplete?.(newDoc, targetFolder);
      handleClose();
    } catch (err) {
      setError(err?.message || 'Failed to save document into vault.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatIcon = () => {
    const fmt = parsedResult?.sourceFormat;
    if (fmt === 'xlsx' || fmt === 'xls' || fmt === 'csv') return FileSpreadsheet;
    if (fmt === 'pptx') return Presentation;
    if (fmt === 'image') return FileImage;
    if (fmt === 'pdf' || fmt === 'docx' || fmt === 'md' || fmt === 'txt') return FileText;
    return File;
  };
  const FormatIcon = formatIcon();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={handleClose} />
      <Card className="relative w-full max-w-xl p-6 shadow-2xl z-10 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 text-[var(--ink)] font-semibold text-[17px]">
            <UploadCloud className="w-5 h-5 text-[#1B4B91]" />
            <span>Import Document to Vault</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close import modal"
            className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[13px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Dropzone / File Picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelected(f);
            }}
            onClick={() => !isParsing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[12px] p-5 text-center transition-all ${
              isParsing
                ? 'border-[#1B4B91]/50 bg-[#1B4B91]/5 cursor-wait'
                : isDragging
                ? 'border-[#1B4B91] bg-[#1B4B91]/10 scale-[1.01] cursor-pointer'
                : parsedResult
                ? 'border-emerald-500/50 bg-emerald-500/5 cursor-pointer'
                : 'border-[var(--line)] hover:border-[#1B4B91] bg-[var(--surface-subtle)] cursor-pointer'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={IMPORT_ACCEPT_ATTRIBUTE}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelected(f);
                e.target.value = '';
              }}
              className="hidden"
            />

            {isParsing ? (
              <div className="flex flex-col items-center gap-2.5 py-2">
                <Loader2 className="w-7 h-7 text-[#1B4B91] animate-spin" />
                <div className="text-[13px] font-medium text-[var(--ink)]">{progress.stage || 'Parsing...'}</div>
                <div className="w-full max-w-xs h-2 bg-[var(--line)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1B4B91] transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(5, progress.percent || 10))}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelParsing();
                  }}
                  className="text-[12px] font-medium text-rose-500 hover:underline cursor-pointer"
                >
                  Cancel import
                </button>
              </div>
            ) : parsedResult ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FormatIcon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-[14px] text-[var(--ink)]">{parsedResult.fileName}</span>
                <span className="text-[12px] text-[var(--muted)]">
                  {parsedResult.sourceFormat.toUpperCase()} • {formatFileSize(parsedResult.fileSize)} •{' '}
                  {parsedResult.canonical?.summary}
                </span>
                <span className="text-[11px] text-[#1B4B91] font-medium">Click or drop to replace file</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <UploadCloud className="w-9 h-9 text-[var(--muted)]" />
                <div>
                  <span className="font-semibold text-[14px] text-[#1B4B91]">Click to browse</span>
                  <span className="text-[14px] text-[var(--muted)]"> or drag &amp; drop files</span>
                </div>
                <span className="text-[12px] text-[var(--muted)]">
                  PDF, Word (.docx), Excel/CSV (.xlsx, .xls, .csv), PowerPoint (.pptx), Markdown, Text &amp; Images
                </span>
              </div>
            )}
          </div>

          {/* Warnings / Guardrail Notices */}
          {parsedResult?.warnings?.length > 0 && (
            <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/30 text-[12px] text-[var(--ink)] flex flex-col gap-1">
              {parsedResult.warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Lightweight Structured Preview Snippet */}
          {parsedResult?.canonical && (
            <div className="p-3 rounded-[10px] bg-[var(--surface-subtle)] border border-[var(--line)] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <span>Extracted Structure Preview</span>
                <span>{parsedResult.canonical.summary}</span>
              </div>
              {parsedResult.canonical.tables?.length > 0 ? (
                <div className="text-[12px] text-[var(--ink)] overflow-x-auto">
                  <div className="font-medium text-[var(--muted)] mb-1">
                    Sheets: {parsedResult.canonical.tables.map((t) => t.name).join(', ')}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--muted)] truncate">
                    Columns: {(parsedResult.canonical.tables[0].headers || []).slice(0, 8).join(' | ')}
                  </div>
                </div>
              ) : parsedResult.canonical.slides?.length > 0 ? (
                <div className="text-[12px] text-[var(--ink)] flex flex-col gap-0.5">
                  {parsedResult.canonical.slides.slice(0, 3).map((s) => (
                    <div key={s.index} className="truncate">
                      <span className="font-semibold text-[#1B4B91]">Slide {s.index}:</span> {s.title}
                    </div>
                  ))}
                  {parsedResult.canonical.slides.length > 3 && (
                    <span className="text-[11px] text-[var(--muted)]">
                      +{parsedResult.canonical.slides.length - 3} more slides
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-[var(--muted)] line-clamp-3 whitespace-pre-wrap">
                  {parsedResult.canonical.plainText || 'Ready to store in vault.'}
                </p>
              )}
            </div>
          )}

          {/* Editable Title */}
          <div>
            <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026 Budget Plan, Q3 Presentation, Tax Return"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
            />
          </div>

          {/* Destination Folder & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                Destination Folder
              </label>
              <select
                value={docFolder}
                onChange={(e) => {
                  setDocFolder(e.target.value);
                  if (e.target.value === '__CREATE_NEW__') setNewFolderInput('');
                }}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91] cursor-pointer"
              >
                <option value="">No folder (All Documents)</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    📁 {f}
                  </option>
                ))}
                <option disabled>──────────</option>
                <option value="__CREATE_NEW__">📁+ Create new folder...</option>
              </select>

              {docFolder === '__CREATE_NEW__' && (
                <div className="mt-2 relative">
                  <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 fill-amber-400" />
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="New folder name..."
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                    className="w-full bg-[var(--surface-subtle)] border border-amber-500/50 rounded-[8px] pl-9 pr-3.5 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                Document Date
              </label>
              <input
                type="date"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[14px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
              />
            </div>
          </div>

          {/* Tags & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[13px] font-medium text-[var(--ink)] flex items-center gap-1 mb-1">
                <Tag className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Tags (comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. taxes, 2026, budget"
                value={docTagsInput}
                onChange={(e) => setDocTagsInput(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                placeholder="Quick context or policy number..."
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                className="w-full bg-[var(--surface-subtle)] border border-[var(--line)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--ink)] outline-none focus:border-[#1B4B91]"
              />
            </div>
          </div>

          {/* Round-trip storage preference */}
          {parsedResult && parsedResult.sourceFormat !== 'pdf' && parsedResult.sourceFormat !== 'image' && (
            <label className="flex items-start gap-2.5 p-3 rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] cursor-pointer text-[12px]">
              <input
                type="checkbox"
                checked={keepOriginalPayload}
                disabled={!parsedResult.canEmbedOriginal}
                onChange={(e) => setKeepOriginalPayload(e.target.checked)}
                className="mt-0.5 accent-[#1B4B91] cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-[var(--ink)]">
                  Preserve original file alongside structured blocks
                </span>
                <span className="text-[var(--muted)]">
                  {parsedResult.canEmbedOriginal
                    ? 'Enables exact original downloads plus instant cross-format export (encrypted with AES-256-GCM).'
                    : 'Original file exceeds memory-safe embed size; storing lightweight structured blocks only.'}
                </span>
              </div>
            </label>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--line)]">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Encrypted locally (ENCv3 AES-256-GCM)
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving || isParsing || !parsedResult}>
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Encrypting & Saving...' : 'Import to Vault'}</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
