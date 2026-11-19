import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  Highlighter,
  Pen,
  Type,
  FileCheck,
  ShieldAlert,
  Sparkles,
  MousePointer,
  Undo2,
  Redo2,
  Check,
  Stamp as StampIcon,
  Loader2,
  FileText,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { Button } from './ui';
import {
  loadPdfForViewing,
  renderPdfPageToCanvas,
  burnAndExportPdf,
  generateStampDataUrl,
  extractPdfText
} from '../utils/pdfEditorEngine';
import SignaturePadModal from './SignaturePadModal';

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', hex: '#fef08a' },
  { name: 'Green', hex: '#bbf7d0' },
  { name: 'Cyan', hex: '#bae6fd' },
  { name: 'Pink', hex: '#fbcfe8' }
];

const PEN_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'Navy', hex: '#1B4B91' },
  { name: 'Red', hex: '#dc2626' },
  { name: 'Emerald', hex: '#059669' }
];

const STAMP_PRESETS = [
  { label: 'PAID', color: '#16a34a' },
  { label: 'APPROVED', color: '#2563eb' },
  { label: 'OVERDUE', color: '#dc2626' },
  { label: 'CONFIDENTIAL', color: '#d97706' },
  { label: 'VOID', color: '#64748b' }
];

export default function PdfEditorModal({
  isOpen,
  onClose,
  initialDocument, // { id, name, fileName, dataUrl, folder }
  onSaveToVault,   // callback({ id, name, fileName, dataUrl, folder, fileSize })
  onShowToast
}) {
  // Document state
  const [docName, setDocName] = useState('Document');
  const [rawPdfBytes, setRawPdfBytes] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // View state
  const [zoom, setZoom] = useState(1.2);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  // Active Tool state: 'select' | 'highlight' | 'pen' | 'text' | 'redact' | 'signature' | 'stamp'
  const [activeTool, setActiveTool] = useState('select');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [penColor, setPenColor] = useState('#1B4B91');
  const [penThickness, setPenThickness] = useState(2.5);
  const [selectedStamp, setSelectedStamp] = useState('PAID');
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [activeSignatureDataUrl, setActiveSignatureDataUrl] = useState(null);

  // Editing modifications state
  // annotations: { [pageNum]: Array<Annotation> }
  const [annotations, setAnnotations] = useState({});
  // deletedPages: Array<number> (1-based page numbers)
  const [deletedPages, setDeletedPages] = useState([]);
  // pageRotations: { [pageNum]: number } (0, 90, 180, 270)
  const [pageRotations, setPageRotations] = useState({});

  // History stack for undo / redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas refs
  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);

  // Interactive drawing refs & state
  const isInteractingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const [activeStrokePoints, setActiveStrokePoints] = useState([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);

  // Inline text editing
  const [textInputPos, setTextInputPos] = useState(null);
  const [tempTextValue, setTempTextValue] = useState('');
  const textInputRef = useRef(null);

  // AI Assistant state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExtractedText, setAiExtractedText] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiCustomQuestion, setAiCustomQuestion] = useState('');
  const [aiChatResponses, setAiChatResponses] = useState([]);

  // Initialize and load PDF
  useEffect(() => {
    if (!isOpen || !initialDocument?.dataUrl) return;

    let isSubscribed = true;
    async function loadPdf() {
      setIsLoading(true);
      try {
        setDocName(initialDocument.name || initialDocument.fileName || 'Financial Document');
        const loaded = await loadPdfForViewing(initialDocument.dataUrl);
        if (!isSubscribed) return;

        setPdfJsDoc(loaded.pdfJsDoc);
        setNumPages(loaded.numPages);
        setRawPdfBytes(loaded.rawBytes);
        setCurrentPage(1);
        setAnnotations({});
        setDeletedPages([]);
        setPageRotations({});
        setHistory([]);
        setHistoryIndex(-1);
        setSelectedAnnotationId(null);

        // Pre-fetch document text for AI assistant in background
        extractPdfText(loaded.pdfJsDoc, 10).then(text => {
          if (isSubscribed) setAiExtractedText(text);
        }).catch(err => console.warn('AI text pre-extract error:', err));

      } catch (err) {
        console.error('Failed to load PDF in editor:', err);
        if (onShowToast) onShowToast('Failed to load PDF file. Please try another file.', 'error');
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }

    loadPdf();
    return () => {
      isSubscribed = false;
    };
  }, [isOpen, initialDocument]);

  // Render current page onto Canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfJsDoc || !pdfCanvasRef.current || deletedPages.includes(currentPage)) return;

    const rotationOffset = pageRotations[currentPage] || 0;
    try {
      await renderPdfPageToCanvas(
        pdfJsDoc,
        currentPage,
        pdfCanvasRef.current,
        zoom,
        rotationOffset
      );
    } catch (err) {
      console.warn(`Render error on page ${currentPage}:`, err);
    }
  }, [pdfJsDoc, currentPage, zoom, pageRotations, deletedPages]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Push new state to undo/redo history
  const pushHistory = (newAnnotations, newRotations = pageRotations, newDeletions = deletedPages) => {
    const nextState = {
      annotations: JSON.parse(JSON.stringify(newAnnotations)),
      pageRotations: { ...newRotations },
      deletedPages: [...newDeletions]
    };
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextState);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setAnnotations(prev.annotations);
      setPageRotations(prev.pageRotations);
      setDeletedPages(prev.deletedPages);
      setHistoryIndex(historyIndex - 1);
      setSelectedAnnotationId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setAnnotations(next.annotations);
      setPageRotations(next.pageRotations);
      setDeletedPages(next.deletedPages);
      setHistoryIndex(historyIndex + 1);
      setSelectedAnnotationId(null);
    }
  };

  // Page navigation & thumbnail controls
  const visiblePages = Array.from({ length: numPages }, (_, i) => i + 1).filter(p => !deletedPages.includes(p));

  const handlePrevPage = () => {
    const currentIndex = visiblePages.indexOf(currentPage);
    if (currentIndex > 0) {
      setCurrentPage(visiblePages[currentIndex - 1]);
      setSelectedAnnotationId(null);
    }
  };

  const handleNextPage = () => {
    const currentIndex = visiblePages.indexOf(currentPage);
    if (currentIndex < visiblePages.length - 1) {
      setCurrentPage(visiblePages[currentIndex + 1]);
      setSelectedAnnotationId(null);
    }
  };

  const handleRotateCurrentPage = (angle = 90) => {
    setPageRotations(prev => {
      const updated = {
        ...prev,
        [currentPage]: ((prev[currentPage] || 0) + angle) % 360
      };
      pushHistory(annotations, updated, deletedPages);
      return updated;
    });
  };

  const handleDeleteCurrentPage = () => {
    if (visiblePages.length <= 1) {
      if (onShowToast) onShowToast('Cannot delete the only page in the document.', 'warning');
      return;
    }
    const newDeletions = [...deletedPages, currentPage];
    setDeletedPages(newDeletions);
    pushHistory(annotations, pageRotations, newDeletions);

    // Switch to another visible page
    const remaining = visiblePages.filter(p => p !== currentPage);
    if (remaining.length > 0) {
      setCurrentPage(remaining[0]);
    }
    if (onShowToast) onShowToast(`Page ${currentPage} removed.`, 'info');
  };

  // Tool handling
  const getOverlayCoordinates = (e) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0, width: 0, height: 0 };
    const rect = overlay.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height
    };
  };

  const handleOverlayMouseDown = (e) => {
    if (e.button !== 0 && !e.touches) return;
    const { x, y, width, height } = getOverlayCoordinates(e);
    isInteractingRef.current = true;
    startPosRef.current = { x, y };

    if (activeTool === 'pen') {
      setActiveStrokePoints([{ x, y }]);
    } else if (activeTool === 'text') {
      setTextInputPos({ x, y, canvasWidth: width, canvasHeight: height });
      setTempTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 50);
      isInteractingRef.current = false;
    } else if (activeTool === 'signature') {
      if (activeSignatureDataUrl) {
        addSignatureAnnotation(x, y, activeSignatureDataUrl, width, height);
      } else {
        setIsSignatureModalOpen(true);
      }
      isInteractingRef.current = false;
    } else if (activeTool === 'stamp') {
      addStampAnnotation(x, y, selectedStamp, width, height);
      isInteractingRef.current = false;
    }
  };

  const handleOverlayMouseMove = (e) => {
    if (!isInteractingRef.current) return;
    const { x, y } = getOverlayCoordinates(e);

    if (activeTool === 'pen') {
      setActiveStrokePoints(prev => [...prev, { x, y }]);
    }
  };

  const handleOverlayMouseUp = (e) => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    const { x, y, width, height } = getOverlayCoordinates(e);
    const startX = startPosRef.current.x;
    const startY = startPosRef.current.y;

    if (activeTool === 'pen') {
      if (activeStrokePoints.length > 1) {
        const newAnnotation = {
          id: `pen_${Date.now()}_${Math.random()}`,
          type: 'draw',
          points: [...activeStrokePoints],
          color: penColor,
          thickness: penThickness,
          canvasWidth: width,
          canvasHeight: height
        };
        addAnnotationToCurrentPage(newAnnotation);
      }
      setActiveStrokePoints([]);
    } else if (activeTool === 'highlight' || activeTool === 'redact') {
      const boxWidth = Math.abs(x - startX);
      const boxHeight = Math.abs(y - startY);

      // Minimum bounding box threshold to prevent accidental clicks
      if (boxWidth > 6 && boxHeight > 6) {
        const topLeftX = Math.min(startX, x);
        const topLeftY = Math.min(startY, y);

        const newAnnotation = {
          id: `${activeTool}_${Date.now()}_${Math.random()}`,
          type: activeTool,
          x: topLeftX,
          y: topLeftY,
          width: boxWidth,
          height: boxHeight,
          color: activeTool === 'highlight' ? highlightColor : '#000000',
          canvasWidth: width,
          canvasHeight: height
        };
        addAnnotationToCurrentPage(newAnnotation);
      }
    }
  };

  const addAnnotationToCurrentPage = (annotation) => {
    setAnnotations(prev => {
      const currentList = prev[currentPage] || [];
      const updated = {
        ...prev,
        [currentPage]: [...currentList, annotation]
      };
      pushHistory(updated);
      return updated;
    });
  };

  const addSignatureAnnotation = (x, y, dataUrl, canvasWidth, canvasHeight) => {
    const signatureWidth = 180;
    const signatureHeight = 65;
    const newAnnotation = {
      id: `sig_${Date.now()}_${Math.random()}`,
      type: 'signature',
      dataUrl,
      x: Math.max(0, x - signatureWidth / 2),
      y: Math.max(0, y - signatureHeight / 2),
      width: signatureWidth,
      height: signatureHeight,
      canvasWidth,
      canvasHeight
    };
    addAnnotationToCurrentPage(newAnnotation);
    setActiveTool('select');
  };

  const addStampAnnotation = (x, y, stampLabel, canvasWidth, canvasHeight) => {
    const preset = STAMP_PRESETS.find(p => p.label === stampLabel) || STAMP_PRESETS[0];
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const stampDataUrl = generateStampDataUrl({
      text: preset.label,
      color: preset.color,
      subText: today
    });

    const stampWidth = 170;
    const stampHeight = 60;
    const newAnnotation = {
      id: `stamp_${Date.now()}_${Math.random()}`,
      type: 'stamp',
      dataUrl: stampDataUrl,
      x: Math.max(0, x - stampWidth / 2),
      y: Math.max(0, y - stampHeight / 2),
      width: stampWidth,
      height: stampHeight,
      canvasWidth,
      canvasHeight
    };
    addAnnotationToCurrentPage(newAnnotation);
    setActiveTool('select');
  };

  const handleFinishText = () => {
    if (textInputPos && tempTextValue.trim()) {
      const newAnnotation = {
        id: `text_${Date.now()}_${Math.random()}`,
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        text: tempTextValue.trim(),
        fontSize: 16,
        color: penColor,
        isBold: true,
        bgColor: '#ffffff',
        canvasWidth: textInputPos.canvasWidth,
        canvasHeight: textInputPos.canvasHeight
      };
      addAnnotationToCurrentPage(newAnnotation);
    }
    setTextInputPos(null);
    setTempTextValue('');
    setActiveTool('select');
  };

  const handleDeleteAnnotation = (id) => {
    setAnnotations(prev => {
      const currentList = prev[currentPage] || [];
      const updated = {
        ...prev,
        [currentPage]: currentList.filter(a => a.id !== id)
      };
      pushHistory(updated);
      return updated;
    });
    setSelectedAnnotationId(null);
  };

  // Keyboard shortcuts (Escape, Delete, Backspace, Ctrl+Z)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotationId) {
          handleDeleteAnnotation(selectedAnnotationId);
        }
      } else if (e.key === 'Escape') {
        if (selectedAnnotationId) {
          setSelectedAnnotationId(null);
        } else if (textInputPos) {
          setTextInputPos(null);
        } else {
          setActiveTool('select');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedAnnotationId, textInputPos, historyIndex, history]);

  // Export / Save Handlers
  const handleExport = async (saveToVaultMode = false) => {
    if (!rawPdfBytes) return;
    setIsExporting(true);

    try {
      const result = await burnAndExportPdf({
        originalBytes: rawPdfBytes,
        deletedPages,
        pageRotations,
        annotations
      });

      if (saveToVaultMode && onSaveToVault) {
        // Save back to Klarity Vault
        await onSaveToVault({
          id: initialDocument?.id || `doc_${Date.now()}`,
          name: docName,
          fileName: initialDocument?.fileName?.endsWith('.pdf') ? initialDocument.fileName : `${docName}.pdf`,
          fileType: 'application/pdf',
          fileSize: result.bytes.byteLength,
          dataUrl: result.dataUrl,
          folder: initialDocument?.folder || 'Financial'
        });
        if (onShowToast) onShowToast('Modified PDF successfully saved to Vault!', 'success');
      } else {
        // Direct local file download
        const blob = new Blob([result.bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = docName.endsWith('.pdf') ? docName : `${docName}-edited.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (onShowToast) onShowToast('PDF exported with all edits burned!', 'success');
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      if (onShowToast) onShowToast('Export failed. Please check annotations and try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // AI Assistant actions
  const handleAiAction = async (promptType) => {
    if (!aiExtractedText) {
      if (onShowToast) onShowToast('Extracting document text...', 'info');
      const text = await extractPdfText(pdfJsDoc, 10);
      setAiExtractedText(text);
      if (!text.trim()) {
        if (onShowToast) onShowToast('No readable text found in document (scanned image).', 'warning');
        return;
      }
    }

    setAiLoading(true);
    setShowAiDrawer(true);

    let systemInstruction = 'You are a financial advisor and document assistant in Klarity. Be concise, clear, and structured.';
    let prompt = '';

    if (promptType === 'summary') {
      prompt = `Summarize this financial document in 3-5 bullet points. Include who it is from, the date, total amounts, account balances, and key deadlines:\n\n${aiExtractedText.slice(0, 8000)}`;
    } else if (promptType === 'fees') {
      prompt = `Review this document for any bank fees, interest charges, APR rates, late fees, penalties, or unusual discrepancies. List them clearly:\n\n${aiExtractedText.slice(0, 8000)}`;
    } else if (promptType === 'transactions') {
      prompt = `Extract all line-item transactions, charges, or invoice items found in this statement. Format them as: Date | Description | Amount:\n\n${aiExtractedText.slice(0, 8000)}`;
    } else if (promptType === 'custom') {
      if (!aiCustomQuestion.trim()) return;
      prompt = `Answer this question based on the document text: "${aiCustomQuestion}"\n\nDocument text:\n${aiExtractedText.slice(0, 8000)}`;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          systemInstruction
        })
      });

      if (!res.ok) throw new Error('AI response failed');
      const data = await res.json();
      const reply = data.reply || data.response || data.text || 'Unable to generate analysis.';

      if (promptType === 'summary') {
        setAiSummary(reply);
      } else {
        setAiChatResponses(prev => [
          ...prev,
          { question: promptType === 'custom' ? aiCustomQuestion : promptType.toUpperCase(), answer: reply }
        ]);
        setAiCustomQuestion('');
      }
    } catch (e) {
      console.warn('AI request failed:', e);
      setAiSummary('AI assistant is offline or unavailable. Check your Gemini API connection in Settings.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentAnnotations = annotations[currentPage] || [];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0b0f19] text-slate-100 select-none">
      {/* 1. TOP HEADER & PRIMARY CONTROLS */}
      <header className="h-14 border-b border-slate-800 bg-[#111827] px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowThumbnails(prev => !prev)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={showThumbnails ? 'Hide page thumbnails' : 'Show page thumbnails'}
          >
            {showThumbnails ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div className="p-1.5 rounded-lg bg-[#1B4B91]/20 text-[#60a5fa]">
            <FileText className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            className="font-medium text-sm text-slate-100 bg-transparent border border-transparent hover:border-slate-700 focus:border-[#1B4B91] px-2 py-1 rounded transition-colors max-w-[260px] truncate"
            title="Click to rename document"
          />
        </div>

        {/* Page Nav & Zoom */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.6, z - 0.15))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 text-slate-300 font-mono min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Page Counter */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={visiblePages.indexOf(currentPage) <= 0}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2 text-slate-300 font-mono">
              {currentPage} / {numPages}
            </span>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={visiblePages.indexOf(currentPage) >= visiblePages.length - 1}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Undo / Redo */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons: AI, Save to Vault, Download, Close */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowAiDrawer(!showAiDrawer);
              if (!showAiDrawer && !aiSummary) handleAiAction('summary');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              showAiDrawer
                ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                : 'bg-slate-800 hover:bg-purple-950/40 border-slate-700 text-slate-200 hover:border-purple-500/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">AI Analysis</span>
          </button>

          {onSaveToVault && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport(true)}
              disabled={isExporting || isLoading}
              className="bg-[#1B4B91] hover:bg-[#2563eb]"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              <span>Save to Vault</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleExport(false)}
            disabled={isExporting || isLoading}
            className="border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-1" />
            <span>Download</span>
          </Button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg ml-1 transition-colors"
            title="Close editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. SECONDARY EDITING TOOLBAR */}
      <div className="h-12 border-b border-slate-800/80 bg-[#161e2e] px-4 flex items-center justify-between gap-4 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'select' ? 'bg-[#1B4B91] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Select & move annotations"
          >
            <MousePointer className="w-4 h-4" />
            <span>Select</span>
          </button>

          {/* Highlight Tool */}
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTool('highlight')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTool === 'highlight' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Highlight text areas"
            >
              <Highlighter className="w-4 h-4 text-amber-400" />
              <span>Highlight</span>
            </button>
            {activeTool === 'highlight' && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
                {HIGHLIGHT_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setHighlightColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-4 h-4 rounded-full border ${highlightColor === c.hex ? 'border-white scale-110 shadow-sm' : 'border-transparent'}`}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pen / Freehand Draw */}
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTool === 'pen' ? 'bg-[#1B4B91]/30 text-blue-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Draw / Mark up"
            >
              <Pen className="w-4 h-4 text-blue-400" />
              <span>Pen</span>
            </button>
            {activeTool === 'pen' && (
              <div className="flex items-center gap-1.5 pl-1 border-l border-slate-700">
                {PEN_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-4 h-4 rounded-full border ${penColor === c.hex ? 'border-white scale-110 shadow-sm' : 'border-slate-600'}`}
                    title={c.name}
                  />
                ))}
                <select
                  value={penThickness}
                  onChange={(e) => setPenThickness(parseFloat(e.target.value))}
                  className="bg-slate-900 text-slate-300 text-[11px] rounded px-1 py-0.5 border border-slate-700"
                >
                  <option value="1.5">Thin</option>
                  <option value="2.5">Normal</option>
                  <option value="5">Thick</option>
                </select>
              </div>
            )}
          </div>

          {/* Text Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('text')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'text' ? 'bg-[#1B4B91] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Click anywhere on the page to insert text"
          >
            <Type className="w-4 h-4" />
            <span>Add Text</span>
          </button>

          {/* Signature Tool */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('signature');
              setIsSignatureModalOpen(true);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'signature' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Sign document"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Signature</span>
          </button>

          {/* Redact Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('redact')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTool === 'redact' ? 'bg-rose-900/40 border border-rose-500 text-rose-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Blackout sensitive financial info (SSN, card numbers)"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Redact</span>
          </button>

          {/* Stamp Presets */}
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveTool('stamp')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTool === 'stamp' ? 'bg-amber-600/30 text-amber-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Add status stamp"
            >
              <StampIcon className="w-4 h-4 text-amber-400" />
              <span>Stamp: {selectedStamp}</span>
            </button>
            <select
              value={selectedStamp}
              onChange={(e) => {
                setSelectedStamp(e.target.value);
                setActiveTool('stamp');
              }}
              className="bg-slate-900 text-slate-300 text-[11px] rounded px-1.5 py-0.5 border border-slate-700"
            >
              {STAMP_PRESETS.map(s => (
                <option key={s.label} value={s.label}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Page Actions (Rotate, Delete) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleRotateCurrentPage(90)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Rotate Page Clockwise (90°)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteCurrentPage}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Delete Current Page"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE WITH THUMBNAIL SIDEBAR & VIEWER */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <aside className="w-48 border-r border-slate-800 bg-[#0f172a] p-3 overflow-y-auto flex flex-col gap-3 shrink-0">
            <div className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase flex items-center justify-between">
              <span>Pages ({visiblePages.length})</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {visiblePages.map((pageNum) => {
                const isCurrent = pageNum === currentPage;
                const pageAnnsCount = (annotations[pageNum] || []).length;
                return (
                  <div
                    key={`thumb-p-${pageNum}`}
                    onClick={() => {
                      setCurrentPage(pageNum);
                      setSelectedAnnotationId(null);
                    }}
                    className={`group relative p-2 rounded-xl border transition-all cursor-pointer ${
                      isCurrent
                        ? 'border-[#1B4B91] bg-[#1B4B91]/15 ring-2 ring-[#1B4B91]/40 shadow-md'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-white rounded border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden shadow-xs">
                      <span className="text-slate-800 font-semibold text-xs">{pageNum}</span>
                      {pageAnnsCount > 0 && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">
                          {pageAnnsCount}
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Page {pageNum}</span>
                      {pageRotations[pageNum] ? (
                        <span className="text-[10px] text-amber-400">{pageRotations[pageNum]}°</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center PDF Viewer & Canvas Overlay */}
        <main
          ref={containerRef}
          className="flex-1 bg-[#090d16] overflow-auto flex items-center justify-center p-6 relative"
          onClick={() => setSelectedAnnotationId(null)}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#1B4B91]" />
              <p className="text-sm font-medium">Loading PDF document...</p>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-sm transition-all inline-block select-none" onClick={(e) => e.stopPropagation()}>
              {/* PDF.js Render Canvas */}
              <canvas
                ref={pdfCanvasRef}
                className="block bg-white rounded-sm shadow-xl"
              />

              {/* Interactive Editing & Annotation Overlay */}
              <div
                ref={overlayRef}
                onMouseDown={handleOverlayMouseDown}
                onMouseMove={handleOverlayMouseMove}
                onMouseUp={handleOverlayMouseUp}
                onTouchStart={handleOverlayMouseDown}
                onTouchMove={handleOverlayMouseMove}
                onTouchEnd={handleOverlayMouseUp}
                className={`absolute inset-0 select-none ${
                  activeTool === 'pen' ? 'cursor-crosshair' :
                  activeTool === 'highlight' ? 'cursor-crosshair' :
                  activeTool === 'redact' ? 'cursor-crosshair' :
                  activeTool === 'text' ? 'cursor-text' :
                  activeTool === 'signature' || activeTool === 'stamp' ? 'cursor-copy' :
                  'cursor-default'
                }`}
              >
                {/* Render Existing Annotations for current page */}
                {currentAnnotations.map((ann) => {
                  const isSelected = selectedAnnotationId === ann.id;

                  if (ann.type === 'draw') {
                    const pointsStr = ann.points.map(p => `${p.x},${p.y}`).join(' ');
                    return (
                      <svg
                        key={ann.id}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke={ann.color || '#1B4B91'}
                          strokeWidth={ann.thickness || 2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    );
                  }

                  if (ann.type === 'highlight') {
                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                        }}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          backgroundColor: ann.color || '#fef08a',
                          opacity: 0.4
                        }}
                        className={`absolute rounded-xs cursor-pointer transition-shadow ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:opacity-60'
                        }`}
                      >
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(ann.id);
                            }}
                            className="absolute -top-3 -right-3 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                            title="Delete highlight"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (ann.type === 'redact') {
                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                        }}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          backgroundColor: '#000000'
                        }}
                        className={`absolute rounded-xs cursor-pointer ${
                          isSelected ? 'ring-2 ring-rose-500 shadow-lg' : ''
                        }`}
                        title="Redacted"
                      >
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(ann.id);
                            }}
                            className="absolute -top-3 -right-3 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                            title="Remove redaction"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (ann.type === 'text') {
                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                        }}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          fontSize: `${ann.fontSize || 16}px`,
                          color: ann.color || '#000000',
                          backgroundColor: ann.bgColor || '#ffffff'
                        }}
                        className={`absolute px-1 py-0.5 rounded font-sans font-semibold cursor-pointer shadow-xs ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:ring-1 hover:ring-blue-300'
                        }`}
                      >
                        {ann.text}
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(ann.id);
                            }}
                            className="absolute -top-3 -right-3 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                            title="Delete text"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (ann.type === 'signature' || ann.type === 'stamp') {
                    return (
                      <div
                        key={ann.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnotationId(ann.id);
                        }}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`
                        }}
                        className={`absolute cursor-pointer ${
                          isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-blue-300'
                        }`}
                      >
                        <img
                          src={ann.dataUrl}
                          alt="Signature / Stamp"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAnnotation(ann.id);
                            }}
                            className="absolute -top-3 -right-3 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Active in-progress freehand stroke */}
                {activeTool === 'pen' && activeStrokePoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polyline
                      points={activeStrokePoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={penColor}
                      strokeWidth={penThickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}

                {/* Inline Text Input Box */}
                {textInputPos && (
                  <div
                    style={{ left: `${textInputPos.x}px`, top: `${textInputPos.y}px` }}
                    className="absolute z-20 bg-white border-2 border-blue-600 rounded-md shadow-xl p-1.5 flex items-center gap-1.5 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      ref={textInputRef}
                      type="text"
                      value={tempTextValue}
                      onChange={(e) => setTempTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishText();
                        if (e.key === 'Escape') setTextInputPos(null);
                      }}
                      placeholder="Type text here..."
                      className="text-sm font-semibold text-slate-900 bg-transparent outline-none flex-1 px-1"
                    />
                    <button
                      type="button"
                      onClick={handleFinishText}
                      className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Apply text"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTextInputPos(null)}
                      className="p-1 text-slate-500 hover:text-slate-800"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* 4. RIGHT AI FINANCIAL ASSISTANT DRAWER */}
        {showAiDrawer && (
          <aside className="w-80 border-l border-slate-800 bg-[#111827] flex flex-col shrink-0 shadow-2xl">
            {/* AI Header */}
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h4 className="font-semibold text-sm text-slate-200">Financial AI Assistant</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAiDrawer(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Preset Actions */}
            <div className="p-3 border-b border-slate-800 flex flex-col gap-1.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                Quick Document Queries
              </div>
              <button
                type="button"
                onClick={() => handleAiAction('summary')}
                disabled={aiLoading}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700/80 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Summarize Document</span>
                <span className="text-[10px] text-purple-400">⚡ AI</span>
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('fees')}
                disabled={aiLoading}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700/80 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Find Fees & Penalties</span>
                <span className="text-[10px] text-amber-400">⚡ AI</span>
              </button>
              <button
                type="button"
                onClick={() => handleAiAction('transactions')}
                disabled={aiLoading}
                className="text-left px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700/80 text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Extract Line-Item Charges</span>
                <span className="text-[10px] text-emerald-400">⚡ AI</span>
              </button>
            </div>

            {/* AI Output Stream */}
            <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-xs leading-relaxed text-slate-300">
              {aiLoading && (
                <div className="flex items-center gap-2 p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                  <span>Analyzing document with Gemini AI...</span>
                </div>
              )}

              {aiSummary && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col gap-1.5">
                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Executive Summary</span>
                  </div>
                  <div className="whitespace-pre-line text-slate-300">
                    {aiSummary}
                  </div>
                </div>
              )}

              {aiChatResponses.map((item, idx) => (
                <div key={`chat-resp-${idx}`} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-1">
                  <span className="font-semibold text-purple-300">{item.question}</span>
                  <div className="whitespace-pre-line text-slate-300 mt-1">
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Question Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex gap-2">
              <input
                type="text"
                value={aiCustomQuestion}
                onChange={(e) => setAiCustomQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAiAction('custom');
                }}
                placeholder="Ask anything about this PDF..."
                className="flex-1 bg-slate-800 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => handleAiAction('custom')}
                disabled={aiLoading || !aiCustomQuestion.trim()}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold"
              >
                Ask
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Signature Pad Modal */}
      <SignaturePadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onAdoptSignature={(sigDataUrl) => {
          setActiveSignatureDataUrl(sigDataUrl);
          if (onShowToast) onShowToast('Signature adopted! Click anywhere on the document to place it.', 'success');
        }}
      />
    </div>
  );
}
