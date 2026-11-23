import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/700-italic.css';
import '@fontsource/dancing-script/400.css';
import '@fontsource/caveat/400.css';
import '@fontsource/allura/400.css';
import '@fontsource/sacramento/400.css';
import '@fontsource/homemade-apple/400.css';
import '@fontsource/great-vibes/400.css';

import {
  X,
  Download,
  Save,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  RotateCcw,
  Trash2,
  Highlighter,
  Pen,
  Type,
  Edit3,
  FileCheck,
  ShieldAlert,
  Sparkles,
  MousePointer,
  Undo2,
  Redo2,
  Check,
  Loader2,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Cloud,
  Eraser,
  Image as ImageIcon,
  MessageSquare,
  Link2,
  Copy,
  FilePlus,
  Scissors,
  Crop,
  ScanText,
  Lock,
  KeyRound,
  FolderOpen,
  Clock,
  Sliders,
  CheckSquare,
  List,
  Calendar,
  Paperclip,
  Users,
  Wand2,
  Plus
} from 'lucide-react';
import { Button } from './ui';
import { formatFileSize } from '../utils/documentVaultStorage';
import {
  loadPdfForViewing,
  renderPdfPageToCanvas,
  getPageTextLayer,
  sampleCanvasBackgroundColor,
  searchPdfDocument,
  inspectAcroFormFields,
  burnAndExportPdf,
  applySecureRedactions,
  runLocalOcrOnPage,
  extractPdfText
} from '../utils/pdfEditorEngine';
import {
  inspectPdfEncryptionInfo,
  encryptPdfWithQpdf,
  decryptPdfWithQpdf,
  optimizeAndLinearizePdfWithQpdf,
  loadSavedCertificates,
  signPdfWithCertificate,
  inspectPdfDigitalSignatures,
  saveSignatureReceiptRecord
} from '../utils/pdfSecurityEngine';
const SignaturePadModal = React.lazy(() => import('./SignaturePadModal'));
import PdfLeftSidebar from './pdf/PdfLeftSidebar';
import PdfPropertiesPanel from './pdf/PdfPropertiesPanel';
import {
  PageSetupModal,
  ApplyRedactionsModal,
  SecurityEncryptionModal,
  DigitalSignaturesModal,
  SignersSetupModal,
  FinishAndLockModal,
  LinkConfirmModal
} from './pdf/PdfProtectModals';

const RECENT_FILES_KEY = 'klarity_pdf_recent_files_v1';
const AUTOFILL_OPTIN_KEY = 'klarity_pdf_autofill_opt_in';

const MARKUP_COLORS = ['#fef08a', '#bbf7d0', '#bae6fd', '#fbcfe8', '#ef4444'];
const STROKE_COLORS = ['#1B4B91', '#000000', '#dc2626', '#059669', '#d97706'];

const SHAPE_OPTIONS = [
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'roundedRect', label: 'Rounded Box', icon: Square },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'polygon', label: 'Polyline', icon: Edit3 },
  { id: 'cloud', label: 'Cloud', icon: Cloud },
  { id: 'checkmark', label: 'Checkmark', icon: Check },
  { id: 'cross', label: 'Cross Mark', icon: X },
  { id: 'dot', label: 'Dot', icon: Circle }
];

const FIELD_TYPES = [
  { id: 'text', label: 'Text Field', icon: Type },
  { id: 'paragraph', label: 'Paragraph Box', icon: FileText },
  { id: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { id: 'radio', label: 'Radio Group', icon: Circle },
  { id: 'dropdown', label: 'Dropdown List', icon: List },
  { id: 'image', label: 'Image Box', icon: ImageIcon },
  { id: 'attachment', label: 'Attachment Box', icon: Paperclip },
  { id: 'signature', label: 'Signature Field', icon: FileCheck },
  { id: 'initials', label: 'Initials Field', icon: Pen },
  { id: 'date', label: 'Date Field', icon: Calendar }
];

function validateFieldValue(val, fmt) {
  const s = String(val || '').trim();
  if (!s || !fmt) return '';
  if (fmt === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'Enter a valid email address';
  if (fmt === 'number' && Number.isNaN(Number(s))) return 'Enter a valid number';
  if (fmt === 'zip' && !/^\d{5}(?:-\d{4})?$/.test(s)) return 'Enter a 5 or 9-digit ZIP code';
  if (fmt === 'phone' && s.replace(/\D/g, '').length < 10) return 'Enter a valid 10-digit phone number';
  if (fmt === 'date' && Number.isNaN(Date.parse(s))) return 'Enter a valid date';
  return '';
}

function downloadBlobBytes(bytes, fileName, mime = 'application/pdf') {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function PdfEditorModal({
  isOpen,
  onClose,
  initialDocument,
  onSaveToVault,
  onShowToast,
  localProfile = {},
  isLocalOnlyMode = false
}) {
  // Core PDF state
  const [docName, setDocName] = useState('Document');
  const [rawPdfBytes, setRawPdfBytes] = useState(null);
  const [pdfJsDoc, setPdfJsDoc] = useState(null);
  const [pageOrder, setPageOrder] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [readOnlyLocked, setReadOnlyLocked] = useState(false);
  const [isDragOverFile, setIsDragOverFile] = useState(false);

  // Recent file list (names & local descriptors only)
  const [recentFiles, setRecentFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [openMenuDropdown, setOpenMenuDropdown] = useState(null); // 'recent' | 'markup' | 'draw' | 'shapes' | 'notes' | 'fields'

  // Layout & View
  const [modeTab, setModeTab] = useState('edit'); // 'edit' | 'fill' | 'pages' | 'protect'
  const [zoom, setZoom] = useState(1.25);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState('thumbnails');
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  // Inspected Document Metadata
  const [outline, setOutline] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [docMetadata, setDocMetadata] = useState({});
  const [hasJavaScript, setHasJavaScript] = useState(false);
  const [isEncryptedDoc, setIsEncryptedDoc] = useState(false);
  const [embeddedSignatures, setEmbeddedSignatures] = useState([]);
  const [textLayerSpans, setTextLayerSpans] = useState([]);
  const [canvasDims, setCanvasDims] = useState({ width: 612, height: 792 });

  // Active Tools
  const [activeTool, setActiveTool] = useState('select');
  const [activeMarkupSubtype, setActiveMarkupSubtype] = useState('highlight');
  const [markupColor, setMarkupColor] = useState('#fef08a');
  const [markupOpacity, setMarkupOpacity] = useState(0.4);
  const [activeDrawSubtype, setActiveDrawSubtype] = useState('pen'); // 'pen' | 'marker' | 'eraser'
  const [penColor, setPenColor] = useState('#1B4B91');
  const [penThickness, setPenThickness] = useState(2.5);
  const [activeShapeKind, setActiveShapeKind] = useState('rectangle');
  const [activeFieldType, setActiveFieldType] = useState('text');

  // One-time cover-and-replace info notice
  const [showEditTextNote, setShowEditTextNote] = useState(false);
  const editTextNotedRef = useRef(false);

  // Annotations & Undo/Redo History
  const [annotations, setAnnotations] = useState({}); // { [pageUid]: Array<Annotation> }
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState([]);
  const [clipboardAnns, setClipboardAnns] = useState([]);
  const [pageSetup, setPageSetup] = useState({
    headerFooter: { enabled: false, footerCenter: 'Page {page} of {total}' },
    bates: { enabled: false, prefix: 'DOC-', startNumber: 1, digits: 6, position: 'bottom-right' },
    watermark: { enabled: false, text: 'CONFIDENTIAL', opacity: 0.2, rotation: 35 }
  });

  // Fill & Sign: AcroForm + Custom Fields + In-Person Multi-Signer
  const [acroFormFields, setAcroFormFields] = useState([]);
  const [acroFormValues, setAcroFormValues] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [flattenOnExport, setFlattenOnExport] = useState(false);
  const [signers, setSigners] = useState([{ id: 'signer_1', name: localProfile.name || 'Signer 1', color: '#1B4B91' }]);
  const [guidedSigningActive, setGuidedSigningActive] = useState(false);
  const [activeSignerIdx, setActiveSignerIdx] = useState(0);
  const [handoverPromptSigner, setHandoverPromptSigner] = useState(null);
  const [pendingSignatureTargetFieldId, setPendingSignatureTargetFieldId] = useState(null);

  // History
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Modals & Popovers
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureModalKind, setSignatureModalKind] = useState('signature');
  const [pendingSignaturePayload, setPendingSignaturePayload] = useState(null);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);
  const [isApplyRedactionsOpen, setIsApplyRedactionsOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isDigitalSigModalOpen, setIsDigitalSigModalOpen] = useState(false);
  const [isSignersModalOpen, setIsSignersModalOpen] = useState(false);
  const [isFinishLockOpen, setIsFinishLockOpen] = useState(false);
  const [externalLinkConfirmUrl, setExternalLinkConfirmUrl] = useState('');
  const [showCropBar, setShowCropBar] = useState(false);
  const [savedCertificates, setSavedCertificates] = useState([]);

  // Search, OCR, & AI state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIsRegex, setSearchIsRegex] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrResultText, setOcrResultText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExtractedText, setAiExtractedText] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [aiCustomQuestion, setAiCustomQuestion] = useState('');
  const [aiChatResponses, setAiChatResponses] = useState([]);

  // Canvas & Drawing interaction refs
  const pdfCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const openDiskInputRef = useRef(null);
  const insertImageInputRef = useRef(null);
  const mergePdfInputRef = useRef(null);
  const isDrawingRef = useRef(false);
  const dragModeRef = useRef(null); // 'draw' | 'box' | 'move' | 'resize' | 'rotate' | 'moveField' | 'resizeField'
  const dragStartRef = useRef({ x: 0, y: 0, origMap: new Map() });
  const [activeStrokePoints, setActiveStrokePoints] = useState([]);
  const [activeBoxPreview, setActiveBoxPreview] = useState(null);
  const [inlineTextEdit, setInlineTextEdit] = useState(null); // { id? , x, y, width, height, text, isCoverReplace, coverColor, fontSize }
  const inlineTextAreaRef = useRef(null);
  const [, setFontTick] = useState(0);

  const activePageDesc = pageOrder[currentPage - 1] || null;
  const activePageKey = activePageDesc?.uid || currentPage;

  const notify = useCallback(
    (msg, type = 'info') => {
      if (onShowToast) onShowToast(msg, type);
    },
    [onShowToast]
  );

  // Record in Recent Files list (metadata only)
  const recordRecentFile = useCallback((docInfo) => {
    if (!docInfo?.name) return;
    setRecentFiles((prev) => {
      const next = [
        {
          id: docInfo.id || `rec_${Date.now()}`,
          name: docInfo.name,
          fileName: docInfo.fileName || `${docInfo.name}.pdf`,
          fileSize: docInfo.fileSize || 0,
          openedAt: new Date().toLocaleDateString()
        },
        ...prev.filter((x) => x.fileName !== docInfo.fileName)
      ].slice(0, 10);
      try {
        localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Load any PDF source (initialDocument, File upload, decrypted bytes, redacted bytes)
  const loadPdfDocumentSource = useCallback(
    async (sourceData, docTitle, password = '', preserveEdits = false) => {
      setIsLoading(true);
      try {
        let loaded;
        try {
          loaded = await loadPdfForViewing(sourceData, password);
        } catch (err) {
          if (err?.name === 'PasswordException') {
            const entered = window.prompt('This PDF is password-protected. Enter password:');
            if (entered == null) {
              setIsLoading(false);
              return;
            }
            loaded = await loadPdfForViewing(sourceData, entered);
          } else {
            throw err;
          }
        }

        const initialOrder = Array.from({ length: loaded.numPages }, (_, idx) => ({
          uid: `p_${idx + 1}`,
          sourceType: 'original',
          sourcePageNumber: idx + 1,
          rotationOffset: 0,
          cropBox: null
        }));

        let detectedFields = [];
        const initVals = {};
        if (!preserveEdits) {
          try {
            detectedFields = await inspectAcroFormFields(loaded.rawBytes, loaded.pdfJsDoc);
            detectedFields.forEach((f) => {
              initVals[f.fieldName] = f.value;
            });
          } catch (acroErr) {
            console.warn('AcroForm inspect warning:', acroErr);
          }
        }

        setPdfJsDoc(loaded.pdfJsDoc);
        setRawPdfBytes(loaded.rawBytes);
        setOutline(loaded.outline || []);
        setAttachments(loaded.attachments || []);
        setDocMetadata(loaded.metadata || {});
        setHasJavaScript(Boolean(loaded.hasJavaScript));
        setIsEncryptedDoc(inspectPdfEncryptionInfo(loaded.rawBytes).isEncrypted);

        if (docTitle) setDocName(docTitle);

        if (!preserveEdits) {
          setPageOrder(initialOrder);
          setCurrentPage(1);
          setAnnotations({});
          setCustomFields([]);
          setSelectedAnnotationIds([]);
          setSelectedFieldId(null);
          setHistory([{ annotations: {}, pageOrder: initialOrder, customFields: [] }]);
          setHistoryIndex(0);
          setHasUnsavedChanges(false);
          setReadOnlyLocked(false);
          setAcroFormFields(detectedFields);
          setAcroFormValues(initVals);
        }

        inspectPdfDigitalSignatures(loaded.rawBytes).then(setEmbeddedSignatures).catch(() => {});
        const isLowPower = Boolean(
          typeof document !== 'undefined' && document.documentElement?.classList?.contains('low-power')
        );
        if (!isLowPower) {
          extractPdfText(loaded.pdfJsDoc, 10).then(setAiExtractedText).catch(() => {});
        } else {
          setAiExtractedText('');
        }
      } catch (err) {
        console.error('PDF load error:', err);
        notify('Unable to load PDF. Check the file format or password.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [notify]
  );

  // Initialize on open
  useEffect(() => {
    if (!isOpen) return;
    loadSavedCertificates().then(setSavedCertificates).catch(() => {});
    if (initialDocument?.dataUrl) {
      loadPdfDocumentSource(initialDocument.dataUrl, initialDocument.name || initialDocument.fileName || 'Document');
      recordRecentFile(initialDocument);
    } else {
      setIsLoading(false);
    }
  }, [isOpen, initialDocument, loadPdfDocumentSource, recordRecentFile]);

  // Render active page + text layer whenever loading finishes or page/zoom/rotation/crop changes
  useEffect(() => {
    if (!isOpen || isLoading || !pdfJsDoc || !pdfCanvasRef.current || !activePageDesc) return;
    let active = true;

    async function renderPage() {
      if (activePageDesc.sourceType === 'blank') {
        const w = Math.floor(612 * zoom);
        const h = Math.floor(792 * zoom);
        const canvas = pdfCanvasRef.current;
        const isLow = Boolean(typeof document !== 'undefined' && document.documentElement?.classList?.contains('low-power'));
        const dpr = isLow ? 1 : Math.min(2, window.devicePixelRatio || 1);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setCanvasDims({ width: w, height: h });
        setTextLayerSpans([]);
        return;
      }

      try {
        const res = await renderPdfPageToCanvas(
          pdfJsDoc,
          activePageDesc.sourcePageNumber || 1,
          pdfCanvasRef.current,
          zoom,
          activePageDesc.rotationOffset || 0,
          activePageDesc.cropBox
        );
        if (!active || !res) return;
        setCanvasDims({ width: Math.floor(res.viewportWidth), height: Math.floor(res.viewportHeight) });

        try {
          const tl = await getPageTextLayer(
            pdfJsDoc,
            activePageDesc.sourcePageNumber || 1,
            zoom,
            activePageDesc.rotationOffset || 0
          );
          if (active) setTextLayerSpans(tl.spans || []);
        } catch (tlErr) {
          console.warn('Text layer warning:', tlErr);
          if (active) setTextLayerSpans([]);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Page render warning:', err);
        }
      }
    }

    renderPage();
    return () => {
      active = false;
    };
  }, [isOpen, isLoading, pdfJsDoc, activePageDesc, zoom]);

  // History management
  const commitHistory = useCallback(
    (nextAnns, nextOrder = pageOrder, nextFields = customFields) => {
      setHasUnsavedChanges(true);
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const snap = {
          annotations: JSON.parse(JSON.stringify(nextAnns)),
          pageOrder: nextOrder.map((p) => ({ ...p })),
          customFields: JSON.parse(JSON.stringify(nextFields))
        };
        const next = [...sliced, snap].slice(-40);
        setHistoryIndex(next.length - 1);
        return next;
      });
    },
    [historyIndex, pageOrder, customFields]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    setAnnotations(prev.annotations);
    setPageOrder(prev.pageOrder);
    setCustomFields(prev.customFields || []);
    setHistoryIndex(historyIndex - 1);
    setSelectedAnnotationIds([]);
    setSelectedFieldId(null);
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setAnnotations(next.annotations);
    setPageOrder(next.pageOrder);
    setCustomFields(next.customFields || []);
    setHistoryIndex(historyIndex + 1);
    setSelectedAnnotationIds([]);
    setSelectedFieldId(null);
  }, [history, historyIndex]);

  // Update annotations helpers
  const mutatePageAnnotations = useCallback(
    (updater, recordHist = true) => {
      setAnnotations((prev) => {
        const cur = prev[activePageKey] || [];
        const updatedList = updater(cur);
        const nextMap = { ...prev, [activePageKey]: updatedList };
        if (recordHist) commitHistory(nextMap, pageOrder, customFields);
        else setHasUnsavedChanges(true);
        return nextMap;
      });
    },
    [activePageKey, commitHistory, pageOrder, customFields]
  );

  const handleUpdateAnnotation = useCallback(
    (annId, patch) => {
      mutatePageAnnotations((list) => list.map((a) => (a.id === annId ? { ...a, ...patch } : a)));
    },
    [mutatePageAnnotations]
  );

  const handleBatchUpdateAnnotations = useCallback(
    (patch) => {
      mutatePageAnnotations((list) =>
        list.map((a) => (selectedAnnotationIds.includes(a.id) ? { ...a, ...patch } : a))
      );
    },
    [mutatePageAnnotations, selectedAnnotationIds]
  );

  const handleDeleteSelected = useCallback(() => {
    if (readOnlyLocked) return;
    if (selectedFieldId) {
      const nextFields = customFields.filter((f) => f.id !== selectedFieldId);
      setCustomFields(nextFields);
      commitHistory(annotations, pageOrder, nextFields);
      setSelectedFieldId(null);
      return;
    }
    if (selectedAnnotationIds.length === 0) return;
    mutatePageAnnotations((list) => list.filter((a) => !selectedAnnotationIds.includes(a.id)));
    setSelectedAnnotationIds([]);
  }, [readOnlyLocked, selectedFieldId, customFields, commitHistory, annotations, pageOrder, selectedAnnotationIds, mutatePageAnnotations]);

  const handleDuplicateSelected = useCallback(() => {
    if (readOnlyLocked || selectedAnnotationIds.length === 0) return;
    const copies = [];
    mutatePageAnnotations((list) => {
      const target = list.filter((a) => selectedAnnotationIds.includes(a.id));
      const cloned = target.map((a) => {
        const c = {
          ...JSON.parse(JSON.stringify(a)),
          id: `${a.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          x: (a.x || 0) + 18,
          y: (a.y || 0) + 18
        };
        copies.push(c.id);
        return c;
      });
      return [...list, ...cloned];
    });
    setSelectedAnnotationIds(copies);
  }, [readOnlyLocked, selectedAnnotationIds, mutatePageAnnotations]);

  // Alignment & Layering
  const handleAlignSelected = (mode) => {
    const pageList = annotations[activePageKey] || [];
    const sel = pageList.filter((a) => selectedAnnotationIds.includes(a.id) && !a.locked);
    if (sel.length < 2) return;

    const minX = Math.min(...sel.map((a) => a.x || 0));
    const maxX = Math.max(...sel.map((a) => (a.x || 0) + (a.width || 60)));
    const minY = Math.min(...sel.map((a) => a.y || 0));
    const maxY = Math.max(...sel.map((a) => (a.y || 0) + (a.height || 30)));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    mutatePageAnnotations((list) =>
      list.map((a) => {
        if (!selectedAnnotationIds.includes(a.id) || a.locked) return a;
        const w = a.width || 60;
        const h = a.height || 30;
        if (mode === 'left') return { ...a, x: minX };
        if (mode === 'center') return { ...a, x: midX - w / 2 };
        if (mode === 'right') return { ...a, x: maxX - w };
        if (mode === 'top') return { ...a, y: minY };
        if (mode === 'middle') return { ...a, y: midY - h / 2 };
        if (mode === 'bottom') return { ...a, y: maxY - h };
        return a;
      })
    );
  };

  const handleDistributeSelected = (axis) => {
    const pageList = annotations[activePageKey] || [];
    const sel = pageList.filter((a) => selectedAnnotationIds.includes(a.id) && !a.locked);
    if (sel.length < 3) return;
    const sorted = [...sel].sort((a, b) => (axis === 'horizontal' ? (a.x || 0) - (b.x || 0) : (a.y || 0) - (b.y || 0)));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = axis === 'horizontal' ? (last.x || 0) - (first.x || 0) : (last.y || 0) - (first.y || 0);
    const step = span / (sorted.length - 1);
    const posMap = new Map();
    sorted.forEach((a, idx) => {
      posMap.set(a.id, (axis === 'horizontal' ? first.x || 0 : first.y || 0) + idx * step);
    });
    mutatePageAnnotations((list) =>
      list.map((a) =>
        posMap.has(a.id) ? { ...a, [axis === 'horizontal' ? 'x' : 'y']: posMap.get(a.id) } : a
      )
    );
  };

  const handleLayerChange = (annId, dir) => {
    mutatePageAnnotations((list) => {
      const idx = list.findIndex((a) => a.id === annId);
      if (idx === -1) return list;
      const next = [...list];
      const [item] = next.splice(idx, 1);
      const newIdx = dir === 'up' ? Math.min(list.length - 1, idx + 1) : Math.max(0, idx - 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  };

  // Image insertion from disk or clipboard
  const insertImageDataUrl = useCallback(
    (dataUrl, x = 80, y = 80) => {
      const img = new Image();
      img.onload = () => {
        const aspect = (img.naturalWidth || 200) / Math.max(1, img.naturalHeight || 150);
        const w = Math.min(260, Math.max(120, canvasDims.width * 0.32));
        const h = Math.round(w / Math.max(0.2, aspect));
        const newAnn = {
          id: `image_${Date.now()}`,
          type: 'image',
          dataUrl,
          x,
          y,
          width: w,
          height: h,
          canvasWidth: canvasDims.width,
          canvasHeight: canvasDims.height
        };
        mutatePageAnnotations((list) => [...list, newAnn]);
        setSelectedAnnotationIds([newAnn.id]);
        setActiveTool('select');
      };
      img.src = dataUrl;
    },
    [canvasDims, mutatePageAnnotations]
  );

  // Keyboard shortcuts: Select (V), Text (T), Arrow nudge, Delete, Ctrl+C/V/D/Z, Clipboard image paste
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      if (readOnlyLocked) return;
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type?.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => insertImageDataUrl(ev.target.result);
            reader.readAsDataURL(blob);
            e.preventDefault();
            return;
          }
        }
      }
    };

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setOpenMenuDropdown(null);
        setInlineTextEdit(null);
        setSelectedAnnotationIds([]);
        setSelectedFieldId(null);
        setActiveTool('select');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const list = annotations[activePageKey] || [];
        const sel = list.filter((a) => selectedAnnotationIds.includes(a.id));
        if (sel.length > 0) setClipboardAnns(JSON.parse(JSON.stringify(sel)));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardAnns.length > 0 && !readOnlyLocked) {
          const newIds = [];
          mutatePageAnnotations((list) => {
            const pasted = clipboardAnns.map((a) => {
              const id = `${a.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              newIds.push(id);
              return { ...a, id, x: (a.x || 0) + 20, y: (a.y || 0) + 20 };
            });
            return [...list, ...pasted];
          });
          setSelectedAnnotationIds(newIds);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectedAnnotationIds.length > 0 && !readOnlyLocked) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        mutatePageAnnotations((list) =>
          list.map((a) => (selectedAnnotationIds.includes(a.id) && !a.locked ? { ...a, x: (a.x || 0) + dx, y: (a.y || 0) + dy } : a))
        );
      } else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (!e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 't' && !readOnlyLocked) {
        setModeTab('edit');
        setActiveTool('text');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePaste);
    };
  }, [
    isOpen,
    readOnlyLocked,
    activePageKey,
    annotations,
    selectedAnnotationIds,
    clipboardAnns,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleUndo,
    handleRedo,
    insertImageDataUrl,
    mutatePageAnnotations
  ]);

  // Overlay coordinate helper
  const getOverlayPos = (e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0, width: canvasDims.width, height: canvasDims.height };
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top, width: rect.width, height: rect.height };
  };

  // Overlay Pointer Down
  const handleOverlayMouseDown = (e) => {
    if (e.button !== undefined && e.button !== 0 && !e.touches) return;
    setOpenMenuDropdown(null);
    if (readOnlyLocked) return;

    const { x, y, width, height } = getOverlayPos(e);

    // Inline text edit active? Commit it before handling click elsewhere
    if (inlineTextEdit) {
      commitInlineText();
    }

    if (activeTool === 'select') {
      if (!e.shiftKey) {
        setSelectedAnnotationIds([]);
        setSelectedFieldId(null);
      }
      return;
    }

    if (activeTool === 'text') {
      setInlineTextEdit({
        x,
        y,
        width: 220,
        height: 36,
        text: '',
        fontSize: 16,
        fontFamily: 'Inter',
        color: '#000000',
        isCoverReplace: false,
        coverColor: 'transparent'
      });
      setTimeout(() => inlineTextAreaRef.current?.focus(), 20);
      return;
    }

    if (activeTool === 'editText') {
      const hitSpan = textLayerSpans.find(
        (sp) => x >= sp.x - 4 && x <= sp.x + sp.width + 4 && y >= sp.y - 4 && y <= sp.y + sp.height + 4
      );
      if (hitSpan) {
        if (!editTextNotedRef.current) {
          editTextNotedRef.current = true;
          setShowEditTextNote(true);
        }
        const sampledBg = sampleCanvasBackgroundColor(pdfCanvasRef.current, hitSpan.x, hitSpan.y, hitSpan.width, hitSpan.height);
        setInlineTextEdit({
          x: hitSpan.x,
          y: hitSpan.y,
          width: Math.max(80, hitSpan.width + 20),
          height: Math.max(24, hitSpan.height),
          text: hitSpan.str,
          fontSize: Math.round(hitSpan.fontSize * zoom),
          fontFamily: 'Inter',
          color: '#000000',
          isCoverReplace: true,
          coverColor: sampledBg
        });
        setTimeout(() => inlineTextAreaRef.current?.focus(), 20);
      } else {
        notify('Click directly on existing PDF text to edit it.', 'info');
      }
      return;
    }

    if (activeTool === 'signature' || activeTool === 'initials') {
      if (pendingSignaturePayload?.dataUrl) {
        const w = activeTool === 'initials' ? 95 : 185;
        const h = activeTool === 'initials' ? 50 : 66;
        const ann = {
          id: `sig_${Date.now()}`,
          type: 'signature',
          dataUrl: pendingSignaturePayload.dataUrl,
          captionText: pendingSignaturePayload.captionText || '',
          x: Math.max(0, x - w / 2),
          y: Math.max(0, y - h / 2),
          width: w,
          height: h,
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
        setActiveTool('select');
      } else {
        setSignatureModalKind(activeTool === 'initials' ? 'initials' : 'signature');
        setIsSignatureModalOpen(true);
      }
      return;
    }

    if (activeTool === 'comment') {
      const msg = window.prompt('Add sticky-note comment:', '');
      if (msg && msg.trim()) {
        const now = new Date();
        const ann = {
          id: `comment_${Date.now()}`,
          type: 'comment',
          x,
          y,
          width: 24,
          height: 24,
          text: msg.trim(),
          author: localProfile.name || 'Local User',
          createdAtIso: now.toISOString(),
          timestampLabel: `${now.toLocaleString()} (device clock time)`,
          replies: [],
          color: '#f59e0b',
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
        setShowLeftSidebar(true);
        setLeftSidebarTab('comments');
      }
      setActiveTool('select');
      return;
    }

    if (activeTool === 'callout') {
      const msg = window.prompt('Callout box text:', 'Note');
      if (msg && msg.trim()) {
        const ann = {
          id: `callout_${Date.now()}`,
          type: 'callout',
          x: Math.min(width - 180, x + 36),
          y: Math.max(10, y - 36),
          width: 170,
          height: 52,
          anchorX: x,
          anchorY: y,
          text: msg.trim(),
          fontSize: 13,
          color: '#111827',
          bgColor: '#fef3c7',
          borderColor: '#d97706',
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
      }
      setActiveTool('select');
      return;
    }

    if (activeTool === 'field') {
      const signerObj = signers[0] || { id: 'signer_1', name: 'Signer 1' };
      const defaults = {
        text: [0.22, 0.042],
        paragraph: [0.3, 0.1],
        checkbox: [0.032, 0.032],
        radio: [0.16, 0.09],
        dropdown: [0.22, 0.042],
        image: [0.2, 0.14],
        attachment: [0.22, 0.045],
        signature: [0.24, 0.075],
        initials: [0.12, 0.055],
        date: [0.18, 0.042]
      }[activeFieldType] || [0.2, 0.042];
      const newField = {
        id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: activeFieldType,
        name: `${activeFieldType}_${customFields.length + 1}`,
        label: activeFieldType.charAt(0).toUpperCase() + activeFieldType.slice(1),
        page: currentPage,
        xNorm: Math.min(1 - defaults[0], Math.max(0, x / width)),
        yNorm: Math.min(1 - defaults[1], Math.max(0, y / height)),
        wNorm: defaults[0],
        hNorm: defaults[1],
        required: false,
        readOnly: false,
        defaultValue: '',
        value: activeFieldType === 'checkbox' ? false : activeFieldType === 'date' ? new Date().toLocaleDateString() : '',
        options: ['Option A', 'Option B'],
        dateFormat: 'MM/DD/YYYY',
        fontFamily: 'Inter',
        fontSize: 12,
        signerId: signerObj.id
      };
      const nextFields = [...customFields, newField];
      setCustomFields(nextFields);
      commitHistory(annotations, pageOrder, nextFields);
      setSelectedFieldId(newField.id);
      setShowPropertiesPanel(true);
      setActiveTool('select');
      return;
    }

    if (activeTool === 'draw') {
      if (activeDrawSubtype === 'eraser') {
        // Erase any stroke touching cursor
        mutatePageAnnotations((list) =>
          list.filter((a) => {
            if (a.type !== 'draw' || !Array.isArray(a.points)) return true;
            return !a.points.some((pt) => Math.hypot(pt.x - x, pt.y - y) < 14);
          })
        );
        isDrawingRef.current = true;
        dragModeRef.current = 'erase';
        return;
      }
      isDrawingRef.current = true;
      dragModeRef.current = 'draw';
      setActiveStrokePoints([{ x, y, pressure: e.pressure || 0.5 }]);
      return;
    }

    if (['markup', 'whiteout', 'redact', 'shape', 'link'].includes(activeTool)) {
      isDrawingRef.current = true;
      dragModeRef.current = 'box';
      dragStartRef.current = { x, y };
      setActiveBoxPreview({ x, y, width: 0, height: 0, startX: x, startY: y });
    }
  };

  const handleOverlayMouseMove = (e) => {
    if (!dragModeRef.current) return;
    const { x, y } = getOverlayPos(e);

    if (dragModeRef.current === 'draw') {
      setActiveStrokePoints((prev) => [...prev, { x, y, pressure: e.pressure || 0.5 }]);
    } else if (dragModeRef.current === 'erase') {
      mutatePageAnnotations(
        (list) =>
          list.filter((a) => {
            if (a.type !== 'draw' || !Array.isArray(a.points)) return true;
            return !a.points.some((pt) => Math.hypot(pt.x - x, pt.y - y) < 14);
          }),
        false
      );
    } else if (dragModeRef.current === 'box') {
      const sx = dragStartRef.current.x;
      const sy = dragStartRef.current.y;
      setActiveBoxPreview({
        startX: sx,
        startY: sy,
        x: Math.min(sx, x),
        y: Math.min(sy, y),
        width: Math.abs(x - sx),
        height: Math.abs(y - sy),
        endX: x,
        endY: y
      });
    } else if (dragModeRef.current === 'move') {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      const origMap = dragStartRef.current.origMap;
      mutatePageAnnotations(
        (list) =>
          list.map((a) => {
            if (!origMap.has(a.id)) return a;
            const o = origMap.get(a.id);
            return { ...a, x: Math.max(0, o.x + dx), y: Math.max(0, o.y + dy) };
          }),
        false
      );
    } else if (dragModeRef.current === 'resize') {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      const origMap = dragStartRef.current.origMap;
      mutatePageAnnotations(
        (list) =>
          list.map((a) => {
            if (!origMap.has(a.id)) return a;
            const o = origMap.get(a.id);
            if (a.type === 'signature') {
              const aspect = o.width / Math.max(1, o.height);
              const nw = Math.max(40, o.width + dx);
              return { ...a, width: nw, height: Math.round(nw / aspect) };
            }
            return { ...a, width: Math.max(24, o.width + dx), height: Math.max(18, o.height + dy) };
          }),
        false
      );
    } else if (dragModeRef.current === 'moveField' && selectedFieldId) {
      const dx = x - dragStartRef.current.x;
      const dy = y - dragStartRef.current.y;
      const orig = dragStartRef.current.origField;
      if (orig) {
        setCustomFields((prev) =>
          prev.map((f) =>
            f.id === selectedFieldId
              ? {
                  ...f,
                  xNorm: Math.max(0, Math.min(1 - f.wNorm, orig.xNorm + dx / canvasDims.width)),
                  yNorm: Math.max(0, Math.min(1 - f.hNorm, orig.yNorm + dy / canvasDims.height))
                }
              : f
          )
        );
      }
    }
  };

  const handleOverlayMouseUp = (e) => {
    const mode = dragModeRef.current;
    if (!mode) return;
    dragModeRef.current = null;
    isDrawingRef.current = false;

    const { x, y, width, height } = getOverlayPos(e);

    if (mode === 'draw') {
      if (activeStrokePoints.length > 1) {
        const ann = {
          id: `draw_${Date.now()}`,
          type: 'draw',
          points: activeStrokePoints,
          color: activeDrawSubtype === 'marker' ? '#fde047' : penColor,
          thickness: activeDrawSubtype === 'marker' ? Math.max(12, penThickness * 4) : penThickness,
          isMarker: activeDrawSubtype === 'marker',
          opacity: activeDrawSubtype === 'marker' ? 0.38 : 1,
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
      }
      setActiveStrokePoints([]);
    } else if (mode === 'move' || mode === 'resize') {
      commitHistory(annotations, pageOrder, customFields);
    } else if (mode === 'moveField') {
      commitHistory(annotations, pageOrder, customFields);
    } else if (mode === 'box' && activeBoxPreview) {
      const bx = activeBoxPreview.x;
      const by = activeBoxPreview.y;
      let bw = activeBoxPreview.width;
      let bh = activeBoxPreview.height;

      // Text-aware snapping for Highlight / Underline / Strikethrough / Squiggly
      if (activeTool === 'markup') {
        const overlappingSpans = textLayerSpans.filter(
          (sp) =>
            sp.x + sp.width >= bx &&
            sp.x <= bx + Math.max(bw, 4) &&
            sp.y + sp.height >= by &&
            sp.y <= by + Math.max(bh, 4)
        );
        if (overlappingSpans.length > 0) {
          const sx1 = Math.min(...overlappingSpans.map((s) => s.x));
          const sy1 = Math.min(...overlappingSpans.map((s) => s.y));
          const sx2 = Math.max(...overlappingSpans.map((s) => s.x + s.width));
          const sy2 = Math.max(...overlappingSpans.map((s) => s.y + s.height));
          const snapped = {
            id: `${activeMarkupSubtype}_${Date.now()}`,
            type: activeMarkupSubtype,
            x: sx1,
            y: sy1,
            width: sx2 - sx1,
            height: sy2 - sy1,
            color: markupColor,
            opacity: activeMarkupSubtype === 'highlight' ? markupOpacity : 1,
            canvasWidth: width,
            canvasHeight: height
          };
          mutatePageAnnotations((list) => [...list, snapped]);
          setSelectedAnnotationIds([snapped.id]);
          setActiveBoxPreview(null);
          return;
        }
      }

      if (bw < 6 && bh < 6 && activeTool !== 'shape') {
        setActiveBoxPreview(null);
        return;
      }

      if (activeTool === 'shape') {
        const finalW = Math.max(24, bw);
        const finalH = Math.max(24, bh);
        const shapeAnn = {
          id: `shape_${Date.now()}`,
          type: 'shape',
          shapeKind: activeShapeKind,
          x: bx,
          y: by,
          width: finalW,
          height: finalH,
          x1: activeBoxPreview.startX,
          y1: activeBoxPreview.startY,
          x2: x,
          y2: y,
          points:
            activeShapeKind === 'polygon'
              ? [
                  { x: bx, y: by + finalH },
                  { x: bx + finalW / 2, y: by },
                  { x: bx + finalW, y: by + finalH },
                  { x: bx, y: by + finalH }
                ]
              : undefined,
          strokeColor: penColor,
          fillColor: activeShapeKind === 'dot' ? penColor : 'transparent',
          strokeWidth: penThickness,
          dashStyle: 'solid',
          opacity: 1,
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, shapeAnn]);
        setSelectedAnnotationIds([shapeAnn.id]);
        setActiveTool('select');
      } else if (activeTool === 'markup') {
        const ann = {
          id: `${activeMarkupSubtype}_${Date.now()}`,
          type: activeMarkupSubtype,
          x: bx,
          y: by,
          width: bw,
          height: bh,
          color: markupColor,
          opacity: activeMarkupSubtype === 'highlight' ? markupOpacity : 1,
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
      } else if (activeTool === 'whiteout') {
        const ann = {
          id: `whiteout_${Date.now()}`,
          type: 'whiteout',
          x: bx,
          y: by,
          width: bw,
          height: bh,
          color: '#ffffff',
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
        setShowPropertiesPanel(true);
      } else if (activeTool === 'redact') {
        const ann = {
          id: `redact_${Date.now()}`,
          type: 'redact',
          x: bx,
          y: by,
          width: bw,
          height: bh,
          color: '#000000',
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, ann]);
        setSelectedAnnotationIds([ann.id]);
      } else if (activeTool === 'link') {
        const urlInput = window.prompt('Enter external URL (https://...) or leave blank to link to a page:', 'https://');
        let targetPage = 1;
        let linkKind = 'url';
        if (!urlInput || urlInput === 'https://') {
          const pStr = window.prompt(`Jump to page number (1–${pageOrder.length}):`, String(currentPage));
          if (!pStr) {
            setActiveBoxPreview(null);
            return;
          }
          linkKind = 'page';
          targetPage = Math.max(1, Math.min(pageOrder.length, parseInt(pStr, 10) || 1));
        }
        const linkAnn = {
          id: `link_${Date.now()}`,
          type: 'link',
          linkKind,
          url: linkKind === 'url' ? urlInput : '',
          targetPage,
          x: bx,
          y: by,
          width: bw,
          height: bh,
          canvasWidth: width,
          canvasHeight: height
        };
        mutatePageAnnotations((list) => [...list, linkAnn]);
        setSelectedAnnotationIds([linkAnn.id]);
        setActiveTool('select');
      }
      setActiveBoxPreview(null);
    }
  };

  const commitInlineText = () => {
    if (!inlineTextEdit) return;
    if (inlineTextEdit.text.trim()) {
      const ann = {
        id: `${inlineTextEdit.isCoverReplace ? 'coverText' : 'text'}_${Date.now()}`,
        type: inlineTextEdit.isCoverReplace ? 'coverText' : 'text',
        x: inlineTextEdit.x,
        y: inlineTextEdit.y,
        width: inlineTextEdit.width,
        height: inlineTextEdit.height,
        text: inlineTextEdit.text.trim(),
        fontSize: inlineTextEdit.fontSize || 16,
        fontFamily: inlineTextEdit.fontFamily || 'Inter',
        color: inlineTextEdit.color || '#000000',
        bgColor: inlineTextEdit.bgColor || 'transparent',
        coverColor: inlineTextEdit.coverColor || '#ffffff',
        canvasWidth: canvasDims.width,
        canvasHeight: canvasDims.height
      };
      mutatePageAnnotations((list) => [...list, ann]);
      setSelectedAnnotationIds([ann.id]);
      setShowPropertiesPanel(true);
    }
    setInlineTextEdit(null);
    setActiveTool('select');
  };

  // Pages operations
  const updatePageOrder = (nextOrder, nextCurrent = currentPage) => {
    setPageOrder(nextOrder);
    setCurrentPage(Math.max(1, Math.min(nextOrder.length, nextCurrent)));
    commitHistory(annotations, nextOrder, customFields);
  };

  const handleInsertBlankPage = () => {
    const newPage = {
      uid: `blank_${Date.now()}`,
      sourceType: 'blank',
      sourcePageNumber: null,
      rotationOffset: 0,
      cropBox: null
    };
    const next = [...pageOrder];
    next.splice(currentPage, 0, newPage);
    updatePageOrder(next, currentPage + 1);
    notify('Inserted blank page after current page.', 'success');
  };

  const handleDuplicateCurrentPage = () => {
    if (!activePageDesc) return;
    const dup = {
      ...activePageDesc,
      uid: `dup_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    };
    const origAnns = annotations[activePageKey] || [];
    const nextAnns = {
      ...annotations,
      [dup.uid]: JSON.parse(JSON.stringify(origAnns))
    };
    const next = [...pageOrder];
    next.splice(currentPage, 0, dup);
    setAnnotations(nextAnns);
    setPageOrder(next);
    setCurrentPage(currentPage + 1);
    commitHistory(nextAnns, next, customFields);
    notify(`Duplicated page ${currentPage}.`, 'success');
  };

  const handleMoveCurrentPage = (delta) => {
    const idx = currentPage - 1;
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= pageOrder.length) return;
    const next = [...pageOrder];
    const [item] = next.splice(idx, 1);
    next.splice(targetIdx, 0, item);
    updatePageOrder(next, targetIdx + 1);
  };

  const handleRotatePage = (deltaAngle, applyAll = false) => {
    const next = pageOrder.map((p, idx) =>
      applyAll || idx === currentPage - 1
        ? { ...p, rotationOffset: ((p.rotationOffset || 0) + deltaAngle + 360) % 360 }
        : p
    );
    updatePageOrder(next, currentPage);
  };

  const handleMergePdfFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const extBytes = new Uint8Array(ev.target.result);
        const extLoaded = await loadPdfForViewing(extBytes);
        const inserted = Array.from({ length: extLoaded.numPages }, (_, idx) => ({
          uid: `ext_${Date.now()}_${idx + 1}`,
          sourceType: 'external',
          externalBytes: extBytes,
          externalPageNumber: idx + 1,
          rotationOffset: 0,
          cropBox: null
        }));
        const next = [...pageOrder];
        next.splice(currentPage, 0, ...inserted);
        updatePageOrder(next, currentPage + 1);
        notify(`Merged ${inserted.length} pages into document.`, 'success');
      } catch {
        notify('Could not merge selected PDF.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExtractOrSplit = async (splitMode = false) => {
    if (!rawPdfBytes) return;
    try {
      if (!splitMode) {
        const singleOrder = [pageOrder[currentPage - 1]];
        const res = await burnAndExportPdf({ docName, originalBytes: rawPdfBytes, pageOrder: singleOrder, annotations });
        downloadBlobBytes(res.bytes, `${docName}-page-${currentPage}.pdf`);
        notify(`Extracted page ${currentPage}.`, 'success');
      } else {
        const part1 = pageOrder.slice(0, currentPage);
        const part2 = pageOrder.slice(currentPage);
        const res1 = await burnAndExportPdf({ docName, originalBytes: rawPdfBytes, pageOrder: part1, annotations });
        downloadBlobBytes(res1.bytes, `${docName}-part1.pdf`);
        if (part2.length > 0) {
          const res2 = await burnAndExportPdf({ docName, originalBytes: rawPdfBytes, pageOrder: part2, annotations });
          downloadBlobBytes(res2.bytes, `${docName}-part2.pdf`);
        }
        notify('Split PDF downloaded.', 'success');
      }
    } catch {
      notify('Unable to extract/split pages.', 'error');
    }
  };

  const handleRunOcr = async () => {
    if (!pdfCanvasRef.current || isOcrRunning) return;
    setIsOcrRunning(true);
    try {
      const res = await runLocalOcrOnPage(pdfCanvasRef.current);
      setOcrResultText(res.text);
      setAiExtractedText((prev) => `${prev}\n--- OCR Page ${currentPage} ---\n${res.text}`);
      notify(res.text ? `OCR recognized ${res.words.length} words on page ${currentPage}.` : 'OCR completed (no text detected).', 'success');
    } catch (err) {
      console.error('Offline OCR failed:', err);
      notify('Local OCR failed on this page.', 'error');
    } finally {
      setIsOcrRunning(false);
    }
  };

  // Search handlers
  const handleRunSearch = async (patternPreset = '') => {
    if (!pdfJsDoc) return;
    setIsSearching(true);
    try {
      const res = await searchPdfDocument(pdfJsDoc, searchQuery, {
        isRegex: searchIsRegex,
        patternPreset
      });
      setSearchResults(res);
    } catch (err) {
      notify(err.message || 'Search failed', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkSearchAsRedactions = () => {
    if (readOnlyLocked || searchResults.length === 0) return;
    setAnnotations((prev) => {
      const next = { ...prev };
      for (const hit of searchResults) {
        const targetDesc = pageOrder.find((p) => p.sourcePageNumber === hit.pageNumber);
        const key = targetDesc?.uid || hit.pageNumber;
        const box = {
          id: `redact_srch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'redact',
          xNorm: hit.xNorm,
          yNorm: hit.yNorm,
          wNorm: hit.wNorm,
          hNorm: hit.hNorm,
          x: hit.xNorm * canvasDims.width,
          y: hit.yNorm * canvasDims.height,
          width: hit.wNorm * canvasDims.width,
          height: hit.hNorm * canvasDims.height,
          canvasWidth: canvasDims.width,
          canvasHeight: canvasDims.height
        };
        next[key] = [...(next[key] || []), box];
      }
      commitHistory(next, pageOrder, customFields);
      return next;
    });
    notify(`Marked ${searchResults.length} matches for permanent redaction.`, 'success');
  };

  // Apply True Redactions (216 DPI + strict text verification)
  const handleApplySecureRedactions = async (removeMetadata) => {
    setIsExporting(true);
    try {
      // First bake non-redact edits onto assembled pages if needed, then burn redactions cleanly
      const mapByPageIndex = {};
      pageOrder.forEach((desc, idx) => {
        const list = (annotations[desc.uid] || []).filter((a) => a.type === 'redact');
        if (list.length > 0) mapByPageIndex[idx + 1] = list;
      });
      const stripRedactAnns = {};
      Object.entries(annotations).forEach(([k, v]) => {
        stripRedactAnns[k] = (v || []).filter((a) => a.type !== 'redact');
      });

      const preExport = await burnAndExportPdf({
        docName,
        originalBytes: rawPdfBytes,
        pageOrder,
        annotations: stripRedactAnns,
        acroFormValues,
        customFields,
        flattenForm: flattenOnExport,
        pageSetup,
        stripMetadata: removeMetadata
      });

      const res = await applySecureRedactions({
        originalBytes: preExport.bytes,
        annotations: mapByPageIndex,
        removeMetadata
      });

      setIsApplyRedactionsOpen(false);
      await loadPdfDocumentSource(res.bytes, docName);
      setHasUnsavedChanges(true);
      notify('Secure redactions applied and verified: 0 recoverable characters remain.', 'success');
    } catch (err) {
      console.error('Secure redaction failed:', err);
      notify(err.message || 'Redaction verification failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Fill & Sign Helpers
  const handleAutofillFromProfile = () => {
    let isOptedIn = false;
    try {
      isOptedIn = localStorage.getItem(AUTOFILL_OPTIN_KEY) === 'true';
    } catch {}
    if (!isOptedIn) {
      const ok = window.confirm(
        'Enable local Profile Autofill? Your Klarity name, email, phone, and address will stay 100% on this device and never be sent anywhere.'
      );
      if (!ok) return;
      try {
        localStorage.setItem(AUTOFILL_OPTIN_KEY, 'true');
      } catch {}
    }

    const matchValue = (labelStr = '') => {
      const l = labelStr.toLowerCase();
      if (l.includes('email')) return localProfile.email || '';
      if (l.includes('phone') || l.includes('tel')) return localProfile.phone || '';
      if (l.includes('address') || l.includes('street')) return localProfile.address || '';
      if (l.includes('name')) return localProfile.name || '';
      return null;
    };

    const nextAcro = { ...acroFormValues };
    let filledCount = 0;
    for (const f of acroFormFields) {
      const m = matchValue(`${f.fieldName} ${f.label}`);
      if (m) {
        nextAcro[f.fieldName] = m;
        filledCount++;
      }
    }
    setAcroFormValues(nextAcro);

    const nextCustom = customFields.map((f) => {
      if (f.type === 'text' || f.type === 'paragraph') {
        const m = matchValue(`${f.name} ${f.label}`);
        if (m) {
          filledCount++;
          return { ...f, value: m, completedAtIso: new Date().toISOString(), completedAtLabel: `${new Date().toLocaleString()} (device clock time)` };
        }
      }
      return f;
    });
    setCustomFields(nextCustom);
    setHasUnsavedChanges(true);
    notify(filledCount > 0 ? `Autofilled ${filledCount} matching profile field(s).` : 'No matching Name, Email, Phone, or Address fields detected.', 'info');
  };

  const requiredFieldsList = useMemo(() => {
    const reqCustom = customFields.filter((f) => f.required);
    const reqAcro = acroFormFields.filter((f) => f.required);
    return [
      ...reqAcro.map((f) => ({
        id: f.id,
        kind: 'acro',
        page: f.page,
        signerId: f.signerId || 'signer_1',
        done: Boolean(acroFormValues[f.fieldName])
      })),
      ...reqCustom.map((f) => ({
        id: f.id,
        kind: 'custom',
        page: f.page,
        signerId: f.signerId || 'signer_1',
        done: Boolean(f.value)
      }))
    ];
  }, [customFields, acroFormFields, acroFormValues]);

  const doneReqCount = requiredFieldsList.filter((x) => x.done).length;

  const handleJumpNextRequired = () => {
    const targetSignerId = guidedSigningActive ? signers[activeSignerIdx]?.id : null;
    const candidates = requiredFieldsList.filter(
      (x) => !x.done && (!targetSignerId || x.signerId === targetSignerId)
    );
    const nextItem = candidates[0] || requiredFieldsList.find((x) => !x.done);
    if (!nextItem) {
      if (guidedSigningActive && activeSignerIdx < signers.length - 1) {
        setHandoverPromptSigner(signers[activeSignerIdx + 1]);
      } else {
        notify('All required fields are completed!', 'success');
      }
      return;
    }
    setCurrentPage(nextItem.page);
    if (nextItem.kind === 'custom') setSelectedFieldId(nextItem.id);
  };

  // Export / Save / Finish & Lock
  const handleExport = async ({ saveToVault = false, finishAndLock = false, appendRecordPage = true } = {}) => {
    if (!rawPdfBytes) return;
    setIsExporting(true);
    try {
      const addedAttachments = attachments.filter((a) => a.isAdded);
      const res = await burnAndExportPdf({
        docName,
        originalBytes: rawPdfBytes,
        pageOrder,
        annotations,
        acroFormValues,
        customFields,
        flattenForm: flattenOnExport || finishAndLock,
        pageSetup,
        metadata: docMetadata,
        addedAttachments,
        finishAndLock,
        appendSignatureRecordPage: appendRecordPage,
        signers
      });

      if (finishAndLock && res.receipt) {
        await saveSignatureReceiptRecord(res.receipt);
        downloadBlobBytes(
          new TextEncoder().encode(JSON.stringify(res.receipt, null, 2)),
          `${docName}-signature-receipt.json`,
          'application/json'
        );
        setReadOnlyLocked(true);
        setGuidedSigningActive(false);
        setIsFinishLockOpen(false);
        await loadPdfDocumentSource(res.bytes, docName);
        setReadOnlyLocked(true);
      }

      if (saveToVault && onSaveToVault) {
        await onSaveToVault({
          id: initialDocument?.id || `doc_${Date.now()}`,
          name: docName,
          fileName: initialDocument?.fileName?.endsWith('.pdf') ? initialDocument.fileName : `${docName}.pdf`,
          fileType: 'application/pdf',
          fileSize: res.bytes.byteLength,
          dataUrl: res.dataUrl,
          folder: initialDocument?.folder || 'Financial'
        });
        setHasUnsavedChanges(false);
        notify('Saved PDF to encrypted Vault!', 'success');
      } else {
        downloadBlobBytes(res.bytes, docName.endsWith('.pdf') ? docName : `${docName}-edited.pdf`);
        setHasUnsavedChanges(false);
        notify(finishAndLock ? 'Document locked, signed PDF & JSON receipt downloaded!' : 'PDF downloaded!', 'success');
      }
    } catch (err) {
      console.error('Export failed:', err);
      notify(err.message || 'Export failed.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Open local disk PDF
  const openLocalPdfFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const title = file.name.replace(/\.[^/.]+$/, '');
      loadPdfDocumentSource(ev.target.result, title);
      recordRecentFile({ name: title, fileName: file.name, fileSize: file.size });
    };
    reader.readAsDataURL(file);
  };

  // AI Analysis (Respects Local-only Mode)
  const handleAiAction = async (promptType) => {
    if (isLocalOnlyMode) {
      notify('Local-only mode is enabled. AI cloud analysis is disabled.', 'info');
      setShowAiDrawer(true);
      return;
    }
    let sourceText = aiExtractedText;
    if (!sourceText && pdfJsDoc) {
      sourceText = await extractPdfText(pdfJsDoc, 15);
      setAiExtractedText(sourceText);
    }
    setAiLoading(true);
    setShowAiDrawer(true);
    let prompt = '';
    if (promptType === 'summary') prompt = `Summarize this financial document concisely:\n\n${sourceText.slice(0, 8000)}`;
    else if (promptType === 'fees') prompt = `List any fees, APR rates, penalties, or anomalies in this document:\n\n${sourceText.slice(0, 8000)}`;
    else if (promptType === 'transactions') prompt = `Extract transaction line items as Date | Description | Amount:\n\n${sourceText.slice(0, 8000)}`;
    else prompt = `Answer based on the document: "${aiCustomQuestion}"\n\n${sourceText.slice(0, 8000)}`;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, systemInstruction: 'You are a concise Klarity PDF financial assistant.' })
      });
      const data = await res.json();
      const reply = data.reply || 'Unable to generate analysis.';
      if (promptType === 'summary') setAiSummary(reply);
      else {
        setAiChatResponses((prev) => [...prev, { question: promptType === 'custom' ? aiCustomQuestion : promptType.toUpperCase(), answer: reply }]);
        setAiCustomQuestion('');
      }
    } catch {
      setAiSummary('AI analysis unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentPageAnns = annotations[activePageKey] || [];
  const selectedAnnObjects = currentPageAnns.filter((a) => selectedAnnotationIds.includes(a.id));
  const selectedFieldObj = customFields.find((f) => f.id === selectedFieldId) || null;

  const allComments = pageOrder.flatMap((desc, idx) =>
    (annotations[desc.uid] || [])
      .filter((a) => a.type === 'comment' || a.type === 'callout')
      .map((annotation) => ({ pageNumber: idx + 1, annotation }))
  );

  const redactionsSummary = pageOrder
    .map((desc, idx) => ({
      pageNumber: idx + 1,
      count: (annotations[desc.uid] || []).filter((a) => a.type === 'redact').length
    }))
    .filter((x) => x.count > 0);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg)] text-[var(--ink)] select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOverFile(true);
      }}
      onDragLeave={() => setIsDragOverFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOverFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.name.toLowerCase().endsWith('.pdf')) openLocalPdfFile(file);
      }}
    >
      {/* Hidden file inputs */}
      <input ref={openDiskInputRef} type="file" accept="application/pdf" onChange={(e) => { openLocalPdfFile(e.target.files?.[0]); e.target.value = ''; }} className="hidden" />
      <input
        ref={insertImageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = (ev) => insertImageDataUrl(ev.target.result);
          r.readAsDataURL(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input ref={mergePdfInputRef} type="file" accept="application/pdf" onChange={handleMergePdfFile} className="hidden" />

      {/* 1. DARK TOP BAR (Existing layout items preserved) */}
      <header className="h-14 border-b border-slate-800 bg-[#111827] text-slate-100 px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => setShowLeftSidebar((p) => !p)}
            aria-label={showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}
            title={showLeftSidebar ? 'Hide sidebar' : 'Show sidebar'}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            {showLeftSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => openDiskInputRef.current?.click()}
            title="Open PDF from computer"
            aria-label="Open PDF file"
            className="px-2.5 py-1.5 min-h-[38px] rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Open</span>
          </button>

          {/* Recent files dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenuDropdown(openMenuDropdown === 'recent' ? null : 'recent')}
              title="Recent PDF files"
              aria-label="Recent PDF files"
              className="p-2 min-h-[38px] rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <Clock className="w-4 h-4" />
            </button>
            {openMenuDropdown === 'recent' && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-xl p-2 z-50">
                <div className="px-2 py-1 text-[12px] font-semibold text-[var(--muted)] border-b border-[var(--line)] mb-1">
                  Recent PDFs (Names only)
                </div>
                {recentFiles.length === 0 ? (
                  <p className="text-[13px] text-[var(--muted)] p-2">No recent files.</p>
                ) : (
                  recentFiles.map((rf) => (
                    <div key={rf.id} className="px-2 py-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[13px] flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{rf.fileName}</span>
                      <span className="text-[11px] text-[var(--muted)] shrink-0">{rf.openedAt}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            value={docName}
            disabled={readOnlyLocked}
            onChange={(e) => {
              setDocName(e.target.value);
              setHasUnsavedChanges(true);
            }}
            aria-label="Document file name"
            title="Rename document"
            className="font-medium text-[14px] text-slate-100 bg-transparent border border-transparent hover:border-slate-700 focus:border-blue-500 px-2 py-1 rounded max-w-[190px] truncate outline-none"
          />
          {readOnlyLocked && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shrink-0">
              Locked
            </span>
          )}
        </div>

        {/* Center Zoom, Page Nav, Undo/Redo */}
        <div className="flex items-center gap-1.5">
          <div className="hidden md:flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))} aria-label="Zoom out" title="Zoom out" className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[13px] px-2 text-slate-200 font-mono min-w-[50px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button type="button" onClick={() => setZoom((z) => Math.min(2.8, Number((z + 0.15).toFixed(2))))} aria-label="Zoom in" title="Zoom in" className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded cursor-pointer">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label="Previous page" title="Previous page" className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] px-2 text-slate-200 font-mono whitespace-nowrap">
              {currentPage} / {pageOrder.length || 1}
            </span>
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(pageOrder.length, p + 1))} disabled={currentPage >= pageOrder.length} aria-label="Next page" title="Next page" className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700">
            <button type="button" onClick={handleUndo} disabled={historyIndex <= 0 || readOnlyLocked} aria-label="Undo" title="Undo (Ctrl+Z)" className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer">
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1 || readOnlyLocked} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer">
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Actions: AI Analysis, Save to Vault, Download, Close */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !showAiDrawer;
              setShowAiDrawer(next);
              if (next && !aiSummary && !isLocalOnlyMode) handleAiAction('summary');
            }}
            title={isLocalOnlyMode ? 'AI Analysis (Local-only mode active)' : 'AI Analysis'}
            aria-label="AI Analysis"
            className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 border cursor-pointer ${
              showAiDrawer ? 'bg-purple-600/30 border-purple-400 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden lg:inline">AI Analysis</span>
          </button>

          {onSaveToVault && (
            <Button variant="primary" size="sm" onClick={() => handleExport({ saveToVault: true })} disabled={isExporting || isLoading}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              <span className="hidden sm:inline">Save to Vault</span>
            </Button>
          )}

          <button
            type="button"
            onClick={() => handleExport({ saveToVault: false })}
            disabled={isExporting || isLoading}
            className="px-3 py-1.5 min-h-[34px] rounded-[8px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button type="button" onClick={onClose} aria-label="Close PDF editor" title="Close editor" className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. MODE TABS + SINGLE-ROW TOOLBAR */}
      <div className="border-b border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] px-3 sm:px-4 flex flex-col shrink-0">
        {/* Top Mode Tabs */}
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pt-1">
          <div className="flex items-center gap-1" role="tablist" aria-label="Editor modes">
            {[
              { id: 'edit', label: 'Edit' },
              { id: 'fill', label: 'Fill and Sign' },
              { id: 'pages', label: 'Pages' },
              { id: 'protect', label: 'Protect' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={modeTab === m.id}
                onClick={() => {
                  setModeTab(m.id);
                  setOpenMenuDropdown(null);
                  setActiveTool('select');
                }}
                className={`px-3.5 py-2 text-[13px] font-semibold border-b-2 transition-colors cursor-pointer ${
                  modeTab === m.id
                    ? 'border-[var(--brand)] text-[var(--brand)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {selectedAnnObjects.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPropertiesPanel((p) => !p)}
              className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--line)] text-[var(--ink)] text-[12px] font-medium flex items-center gap-1 cursor-pointer hover:bg-[var(--surface-hover)]"
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--brand)]" />
              <span>{showPropertiesPanel ? 'Hide Properties' : 'Properties'}</span>
            </button>
          )}
        </div>

        {/* Mode-Specific Single Row Toolbar (with grouped dropdowns) */}
        <div className="min-h-[48px] py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* EDIT MODE TOOLBAR */}
          {modeTab === 'edit' && (
            <>
              <button
                type="button"
                onClick={() => setActiveTool('select')}
                title="Select / Move / Multi-Select (V)"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTool === 'select' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <MousePointer className="w-4 h-4" />
                <span>Select</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('text')}
                title="Add Text Box (T)"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'text' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Type className="w-4 h-4" />
                <span>Add Text</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('editText')}
                title="Cover & Replace Existing PDF Text"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'editText' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Text</span>
              </button>

              {/* Markup Dropdown (Highlight / Underline / Strikethrough / Squiggly) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={readOnlyLocked}
                  onClick={() => {
                    setActiveTool('markup');
                    setOpenMenuDropdown(openMenuDropdown === 'markup' ? null : 'markup');
                  }}
                  title="Text Markup (Highlight, Underline, Strikethrough, Squiggly)"
                  className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    activeTool === 'markup'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Highlighter className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="capitalize">{activeMarkupSubtype}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openMenuDropdown === 'markup' && (
                  <div className="fixed sm:absolute left-auto top-auto mt-1 w-56 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-1">
                      {['highlight', 'underline', 'strikethrough', 'squiggly'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setActiveMarkupSubtype(m);
                            setActiveTool('markup');
                            setOpenMenuDropdown(null);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[12px] font-medium capitalize text-left cursor-pointer ${
                            activeMarkupSubtype === m ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--surface-subtle)]'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
                      {MARKUP_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setMarkupColor(hex)}
                          style={{ backgroundColor: hex }}
                          className={`w-5 h-5 rounded-full border-2 cursor-pointer ${markupColor === hex ? 'border-[var(--brand)] scale-110' : 'border-slate-300'}`}
                        />
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-[11px] text-[var(--muted)] pt-1">
                      <span>Opacity ({Math.round(markupOpacity * 100)}%)</span>
                      <input
                        type="range"
                        min={0.15}
                        max={0.9}
                        step={0.05}
                        value={markupOpacity}
                        onChange={(e) => setMarkupOpacity(Number(e.target.value))}
                        className="flex-1"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Draw Dropdown (Pen / Marker / Stroke Eraser) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={readOnlyLocked}
                  onClick={() => {
                    setActiveTool('draw');
                    setOpenMenuDropdown(openMenuDropdown === 'draw' ? null : 'draw');
                  }}
                  title="Freehand Pen, Marker & Stroke Eraser"
                  className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    activeTool === 'draw'
                      ? 'bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]/40'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  {activeDrawSubtype === 'eraser' ? <Eraser className="w-4 h-4 text-rose-500" /> : <Pen className="w-4 h-4 text-[var(--brand)]" />}
                  <span className="capitalize">{activeDrawSubtype}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openMenuDropdown === 'draw' && (
                  <div className="fixed sm:absolute mt-1 w-56 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl p-2.5 z-50 flex flex-col gap-2">
                    <div className="flex gap-1">
                      {[
                        ['pen', 'Pen'],
                        ['marker', 'Marker'],
                        ['eraser', 'Eraser']
                      ].map(([id, lbl]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setActiveDrawSubtype(id);
                            setActiveTool('draw');
                            setOpenMenuDropdown(null);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer ${
                            activeDrawSubtype === id ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--surface-subtle)]'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
                      {STROKE_COLORS.map((hex) => (
                        <button key={hex} type="button" onClick={() => setPenColor(hex)} style={{ backgroundColor: hex }} className={`w-5 h-5 rounded-full border-2 cursor-pointer ${penColor === hex ? 'border-amber-400 scale-110' : 'border-slate-300'}`} />
                      ))}
                      <select value={penThickness} onChange={(e) => setPenThickness(Number(e.target.value))} className="text-[12px] border border-[var(--line)] bg-[var(--surface-subtle)] rounded px-1 py-0.5">
                        <option value={1.5}>1.5px</option>
                        <option value={2.5}>2.5px</option>
                        <option value={5}>5px</option>
                        <option value={8}>8px</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Shapes Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={readOnlyLocked}
                  onClick={() => {
                    setActiveTool('shape');
                    setOpenMenuDropdown(openMenuDropdown === 'shapes' ? null : 'shapes');
                  }}
                  title="Insert Vector Shapes"
                  className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    activeTool === 'shape' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Square className="w-4 h-4" />
                  <span>Shapes</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openMenuDropdown === 'shapes' && (
                  <div className="fixed sm:absolute mt-1 w-60 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl p-2 z-50 grid grid-cols-2 gap-1">
                    {SHAPE_OPTIONS.map((sh) => {
                      const Icon = sh.icon;
                      return (
                        <button
                          key={sh.id}
                          type="button"
                          onClick={() => {
                            setActiveShapeKind(sh.id);
                            setActiveTool('shape');
                            setOpenMenuDropdown(null);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[12px] font-medium flex items-center gap-1.5 text-left cursor-pointer ${
                            activeShapeKind === sh.id ? 'bg-[var(--brand)] text-white' : 'hover:bg-[var(--surface-subtle)]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{sh.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('whiteout')}
                title="Whiteout (Cover-only — not secure removal; use Redact to permanently remove)"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'whiteout'
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Eraser className="w-4 h-4" />
                <span>Whiteout</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => insertImageInputRef.current?.click()}
                title="Insert Image (PNG, JPG, WebP, SVG) or Ctrl+V paste"
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image</span>
              </button>

              {/* Comments & Callouts Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={readOnlyLocked}
                  onClick={() => setOpenMenuDropdown(openMenuDropdown === 'notes' ? null : 'notes')}
                  title="Sticky Comments & Callouts"
                  className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    activeTool === 'comment' || activeTool === 'callout'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                      : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>Comment</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openMenuDropdown === 'notes' && (
                  <div className="fixed sm:absolute mt-1 w-48 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                    <button type="button" onClick={() => { setActiveTool('comment'); setOpenMenuDropdown(null); }} className="px-2.5 py-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[13px] font-medium text-left cursor-pointer">
                      Sticky Note Comment
                    </button>
                    <button type="button" onClick={() => { setActiveTool('callout'); setOpenMenuDropdown(null); }} className="px-2.5 py-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[13px] font-medium text-left cursor-pointer">
                      Callout Box
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('link')}
                title="Insert URL Link or Page Jump"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'link' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Link</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('redact')}
                title="Mark Secure Redaction Area"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'redact'
                    ? 'bg-rose-500/15 border border-rose-500 text-rose-700 dark:text-rose-200'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Redact</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setIsPageSetupOpen(true)}
                title="Page Numbers, Headers/Footers, Bates & Watermark"
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Sliders className="w-4 h-4" />
                <span>Page Setup</span>
              </button>
            </>
          )}

          {/* FILL AND SIGN TOOLBAR */}
          {modeTab === 'fill' && (
            <>
              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => {
                  setSignatureModalKind('signature');
                  setIsSignatureModalOpen(true);
                  setActiveTool('signature');
                }}
                title="Create or Place Signature"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'signature' ? 'bg-emerald-600 text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Signature</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => {
                  setSignatureModalKind('initials');
                  setIsSignatureModalOpen(true);
                  setActiveTool('initials');
                }}
                title="Create or Place Initials"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'initials' ? 'bg-emerald-600 text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Pen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Initials</span>
              </button>

              {/* Add Fields Palette Dropdown */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={readOnlyLocked}
                  onClick={() => setOpenMenuDropdown(openMenuDropdown === 'fields' ? null : 'fields')}
                  title="Add Form or Signing Field"
                  className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
                    activeTool === 'field' ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                  }`}
                >
                  <Plus className="w-4 h-4 text-[var(--brand)]" />
                  <span>Add Field</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openMenuDropdown === 'fields' && (
                  <div className="fixed sm:absolute mt-1 w-64 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-xl shadow-2xl p-2 z-50 grid grid-cols-2 gap-1">
                    {FIELD_TYPES.map((ft) => {
                      const Icon = ft.icon;
                      return (
                        <button
                          key={ft.id}
                          type="button"
                          onClick={() => {
                            setActiveFieldType(ft.id);
                            setActiveTool('field');
                            setOpenMenuDropdown(null);
                          }}
                          className="px-2 py-2 rounded-lg text-[12px] font-medium hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 text-left cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5 text-[var(--brand)] shrink-0" />
                          <span className="truncate">{ft.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={handleAutofillFromProfile}
                title="Autofill Name, Email, Phone, Address from local Klarity profile"
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Autofill Profile</span>
              </button>

              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setIsSignersModalOpen(true)}
                title="Configure Multiple In-Person Signers & Guided Signing"
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  guidedSigningActive
                    ? 'bg-[var(--brand-soft)] text-[var(--brand)] border border-[var(--brand)]/40'
                    : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <Users className="w-4 h-4 text-[var(--brand)]" />
                <span>In-Person Signers ({signers.length})</span>
              </button>

              {requiredFieldsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleJumpNextRequired}
                  className="px-2.5 py-1.5 min-h-[38px] rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-[12px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>
                    {doneReqCount} of {requiredFieldsList.length} required done
                  </span>
                  <span className="underline">Next &rarr;</span>
                </button>
              )}

              <label className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[12px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer">
                <input type="checkbox" checked={flattenOnExport} disabled={readOnlyLocked} onChange={(e) => setFlattenOnExport(e.target.checked)} />
                <span>Flatten Form</span>
              </label>

              {!readOnlyLocked && (
                <button
                  type="button"
                  onClick={() => setIsFinishLockOpen(true)}
                  className="ml-auto px-3 py-1.5 min-h-[38px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Finish &amp; Lock</span>
                </button>
              )}
            </>
          )}

          {/* PAGES MODE TOOLBAR */}
          {modeTab === 'pages' && (
            <>
              <button type="button" disabled={readOnlyLocked} onClick={() => handleRotatePage(-90)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40">
                <RotateCcw className="w-4 h-4" /> <span>Rotate Left</span>
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={() => handleRotatePage(90)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40">
                <RotateCw className="w-4 h-4" /> <span>Rotate Right</span>
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={() => handleMoveCurrentPage(-1)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] shrink-0 cursor-pointer disabled:opacity-40">
                Move Up
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={() => handleMoveCurrentPage(1)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] shrink-0 cursor-pointer disabled:opacity-40">
                Move Down
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={handleInsertBlankPage} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40">
                <FilePlus className="w-4 h-4" /> <span>Blank Page</span>
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={() => mergePdfInputRef.current?.click()} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40">
                <Plus className="w-4 h-4" /> <span>Merge PDF</span>
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={handleDuplicateCurrentPage} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40">
                <Copy className="w-4 h-4" /> <span>Duplicate</span>
              </button>
              <button type="button" onClick={() => handleExtractOrSplit(false)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] shrink-0 cursor-pointer">
                Extract Page
              </button>
              <button type="button" onClick={() => handleExtractOrSplit(true)} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0 cursor-pointer">
                <Scissors className="w-4 h-4" /> <span>Split Here</span>
              </button>
              <button type="button" disabled={readOnlyLocked} onClick={() => setShowCropBar((p) => !p)} className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] flex items-center gap-1 shrink-0 cursor-pointer ${showCropBar ? 'bg-[var(--brand)] text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'}`}>
                <Crop className="w-4 h-4" /> <span>Crop</span>
              </button>
              <button type="button" onClick={handleRunOcr} disabled={isOcrRunning} className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-200 flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50">
                {isOcrRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
                <span>OCR Page</span>
              </button>
              <button
                type="button"
                disabled={readOnlyLocked || pageOrder.length <= 1}
                onClick={() => {
                  const next = pageOrder.filter((_, i) => i !== currentPage - 1);
                  updatePageOrder(next, Math.min(currentPage, next.length));
                }}
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" /> <span>Delete</span>
              </button>
            </>
          )}

          {/* PROTECT MODE TOOLBAR */}
          {modeTab === 'protect' && (
            <>
              <button
                type="button"
                disabled={readOnlyLocked}
                onClick={() => setActiveTool('redact')}
                className={`px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 ${
                  activeTool === 'redact' ? 'bg-rose-600 text-white' : 'text-[var(--ink)] hover:bg-[var(--surface-subtle)]'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                <span>Draw Redaction</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLeftSidebar(true);
                  setLeftSidebarTab('search');
                }}
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] shrink-0 cursor-pointer"
              >
                Find &amp; Redact Patterns
              </button>
              <button
                type="button"
                disabled={readOnlyLocked || redactionsSummary.length === 0}
                onClick={() => setIsApplyRedactionsOpen(true)}
                className="px-3 py-1.5 min-h-[38px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
              >
                <Check className="w-4 h-4" />
                <span>Apply Redactions ({redactionsSummary.reduce((s, p) => s + p.count, 0)})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSecurityModalOpen(true)}
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Lock className="w-4 h-4 text-[var(--brand)]" />
                <span>Encrypt / Decrypt / Optimize</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDigitalSigModalOpen(true)}
                className="px-2.5 py-1.5 min-h-[38px] rounded-lg text-[13px] font-medium text-[var(--ink)] hover:bg-[var(--surface-subtle)] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Digital Signatures &amp; Verify ({embeddedSignatures.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notices Banner Area (One-time Edit Text notice, Unsupported JS form notice, Guided In-Person Signing Bar, Crop Bar, OCR output) */}
      {showEditTextNote && (
        <div className="px-4 py-2 bg-blue-600/15 border-b border-blue-500/30 text-[13px] flex items-center justify-between gap-3">
          <span>
            <strong>Cover-and-replace editing:</strong> Matches detected size and background closely, though results may differ slightly from the original embedded font.
          </span>
          <button type="button" onClick={() => setShowEditTextNote(false)} className="text-[12px] font-semibold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {hasJavaScript && modeTab === 'fill' && (
        <div className="px-4 py-1.5 bg-amber-500/15 border-b border-amber-500/30 text-[13px] text-amber-600 dark:text-amber-300 font-medium">
          This form uses scripts that are not supported (scripts are never executed for security).
        </div>
      )}

      {guidedSigningActive && (
        <div className="px-4 py-2 bg-emerald-600/15 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <div className="flex items-center gap-2">
            <span style={{ backgroundColor: signers[activeSignerIdx]?.color }} className="w-3 h-3 rounded-full" />
            <span className="font-semibold">
              In-Person Signing: {signers[activeSignerIdx]?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleJumpNextRequired}>Next Field</Button>
            {activeSignerIdx < signers.length - 1 ? (
              <Button variant="primary" size="sm" onClick={() => setHandoverPromptSigner(signers[activeSignerIdx + 1])}>
                Hand over to {signers[activeSignerIdx + 1]?.name}
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setIsFinishLockOpen(true)}>Finish &amp; Lock</Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setGuidedSigningActive(false)}>Exit Flow</Button>
          </div>
        </div>
      )}

      {showCropBar && modeTab === 'pages' && activePageDesc && (
        <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex flex-wrap items-center gap-3 text-[13px]">
          <span className="font-semibold">Crop Margins (%):</span>
          {['top', 'right', 'bottom', 'left'].map((edge) => (
            <label key={edge} className="flex items-center gap-1 capitalize">
              <span>{edge}</span>
              <input
                type="number"
                min={0}
                max={40}
                value={Math.round(((activePageDesc.cropBox?.[edge] || 0) * 100))}
                onChange={(e) => {
                  const frac = Math.max(0, Math.min(0.4, (Number(e.target.value) || 0) / 100));
                  const next = pageOrder.map((p, idx) =>
                    idx === currentPage - 1 ? { ...p, cropBox: { ...(p.cropBox || {}), [edge]: frac } } : p
                  );
                  updatePageOrder(next, currentPage);
                }}
                className="w-16 px-2 py-1 rounded border border-[var(--line)] bg-[var(--surface)]"
              />
            </label>
          ))}
        </div>
      )}

      {ocrResultText && (
        <div className="px-4 py-2 bg-[var(--surface-subtle)] border-b border-[var(--line)] flex items-center justify-between gap-3 text-[13px]">
          <div className="truncate flex-1">
            <strong>OCR Result (Page {currentPage}):</strong> {ocrResultText}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(ocrResultText);
                notify('OCR text copied to clipboard!', 'success');
              }}
              className="px-2 py-1 rounded bg-[var(--brand)] text-white text-[12px] cursor-pointer"
            >
              Copy Text
            </button>
            <button type="button" onClick={() => setOcrResultText('')} className="text-[12px] underline cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {showLeftSidebar && (
          <PdfLeftSidebar
            activeTab={leftSidebarTab}
            onSelectTab={setLeftSidebarTab}
            visiblePages={pageOrder.map((_, idx) => idx + 1)}
            currentPage={currentPage}
            onSelectPage={(p) => {
              setCurrentPage(p);
              setSelectedAnnotationIds([]);
              setSelectedFieldId(null);
            }}
            pageOrder={pageOrder}
            pdfJsDoc={pdfJsDoc}
            annotations={annotations}
            outline={outline}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchIsRegex={searchIsRegex}
            setSearchIsRegex={setSearchIsRegex}
            searchResults={searchResults}
            isSearching={isSearching}
            onRunSearch={() => handleRunSearch('')}
            onRunPatternSearch={(preset) => handleRunSearch(preset)}
            onMarkSearchAsRedactions={handleMarkSearchAsRedactions}
            commentsList={allComments}
            onSelectComment={(pNum, annId) => {
              setCurrentPage(pNum);
              setSelectedAnnotationIds([annId]);
            }}
            onReplyComment={(pNum, commentId, replyText) => {
              const desc = pageOrder[pNum - 1];
              const key = desc?.uid || pNum;
              const now = new Date();
              setAnnotations((prev) => {
                const updated = {
                  ...prev,
                  [key]: (prev[key] || []).map((a) =>
                    a.id === commentId
                      ? {
                          ...a,
                          replies: [
                            ...(a.replies || []),
                            {
                              author: localProfile.name || 'Local User',
                              text: replyText,
                              timestampLabel: `${now.toLocaleString()} (device clock time)`
                            }
                          ]
                        }
                      : a
                  )
                };
                commitHistory(updated, pageOrder, customFields);
                return updated;
              });
            }}
            attachments={attachments}
            onAddAttachmentFile={(file) => {
              const r = new FileReader();
              r.onload = (ev) => {
                setAttachments((prev) => [
                  ...prev,
                  {
                    id: `att_new_${Date.now()}`,
                    name: file.name,
                    size: file.size,
                    mimeType: file.type,
                    bytes: new Uint8Array(ev.target.result),
                    isAdded: true
                  }
                ]);
                setHasUnsavedChanges(true);
              };
              r.readAsArrayBuffer(file);
            }}
            onDownloadAttachment={(att) =>
              downloadBlobBytes(att.bytes || att.content, att.filename || att.name, att.mimeType || 'application/octet-stream')
            }
            onRemoveAttachment={(id) => setAttachments((prev) => prev.filter((a) => a.id !== id))}
            localProfileName={localProfile.name || 'Local User'}
            readOnlyLocked={readOnlyLocked}
          />
        )}

        {/* CENTER PAGE CANVAS */}
        <main
          className="flex-1 bg-[#dfe5ee] dark:bg-[#090d16] overflow-auto flex items-start justify-center p-6 relative"
          onClick={() => {
            setSelectedAnnotationIds([]);
            setSelectedFieldId(null);
            setOpenMenuDropdown(null);
          }}
        >
          {isDragOverFile && (
            <div className="fixed inset-0 z-50 bg-blue-600/20 border-4 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
              <div className="px-6 py-4 rounded-2xl bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-2xl">
                Drop PDF file to open locally
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="self-center flex flex-col items-center gap-3 text-[var(--ink)]">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--brand)]" />
              <p className="text-[15px] font-medium">Loading PDF locally...</p>
            </div>
          ) : !rawPdfBytes ? (
            <div className="self-center p-8 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] text-center max-w-md text-[var(--ink)] shadow-sm">
              <FileText className="w-10 h-10 mx-auto mb-3 text-[var(--brand)]" />
              <p className="text-[15px] font-semibold mb-1">No PDF Loaded</p>
              <p className="text-[13px] text-[var(--muted)] mb-4">Open a PDF file or drag and drop one anywhere here.</p>
              <Button variant="primary" onClick={() => openDiskInputRef.current?.click()}>
                Open PDF File
              </Button>
            </div>
          ) : (
            <div className="relative shadow-2xl rounded-sm inline-block my-auto" onClick={(e) => e.stopPropagation()}>
              <canvas ref={pdfCanvasRef} className="block bg-white rounded-sm" />

              {/* Interactive Overlay Layer */}
              <div
                ref={overlayRef}
                onMouseDown={handleOverlayMouseDown}
                onMouseMove={handleOverlayMouseMove}
                onMouseUp={handleOverlayMouseUp}
                onTouchStart={handleOverlayMouseDown}
                onTouchMove={handleOverlayMouseMove}
                onTouchEnd={handleOverlayMouseUp}
                className={`absolute inset-0 ${
                  activeTool === 'select'
                    ? 'cursor-default'
                    : activeTool === 'text' || activeTool === 'editText'
                    ? 'cursor-text'
                    : 'cursor-crosshair'
                }`}
              >
                {/* Existing AcroForm HTML Input Overlays (Tab order follows document) */}
                {acroFormFields
                  .filter((f) => f.page === (activePageDesc?.sourcePageNumber || currentPage))
                  .map((f) => {
                    const val = acroFormValues[f.fieldName] ?? '';
                    const errMsg = validateFieldValue(val, f.validationFormat);
                    const style = {
                      left: `${f.xNorm * 100}%`,
                      top: `${f.yNorm * 100}%`,
                      width: `${f.wNorm * 100}%`,
                      height: `${f.hNorm * 100}%`
                    };
                    if (f.type === 'checkbox') {
                      return (
                        <input
                          key={f.id}
                          type="checkbox"
                          tabIndex={f.tabOrder}
                          checked={Boolean(val)}
                          disabled={f.readOnly || readOnlyLocked}
                          aria-label={f.label}
                          onChange={(e) => {
                            setAcroFormValues((p) => ({ ...p, [f.fieldName]: e.target.checked }));
                            setHasUnsavedChanges(true);
                          }}
                          style={style}
                          className="absolute accent-[#1B4B91] cursor-pointer"
                        />
                      );
                    }
                    if (f.type === 'dropdown') {
                      return (
                        <select
                          key={f.id}
                          tabIndex={f.tabOrder}
                          value={val}
                          disabled={f.readOnly || readOnlyLocked}
                          aria-label={f.label}
                          onChange={(e) => {
                            setAcroFormValues((p) => ({ ...p, [f.fieldName]: e.target.value }));
                            setHasUnsavedChanges(true);
                          }}
                          style={style}
                          className={`absolute bg-blue-50/90 text-slate-900 text-xs px-1 border rounded ${
                            f.required && !val ? 'border-amber-500 ring-1 ring-amber-400' : 'border-blue-400/70'
                          }`}
                        >
                          <option value="">-- Select --</option>
                          {(f.options || []).map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input
                        key={f.id}
                        type="text"
                        tabIndex={f.tabOrder}
                        value={val}
                        maxLength={f.maxLength || undefined}
                        readOnly={f.readOnly || readOnlyLocked}
                        aria-label={f.label}
                        title={errMsg || f.label}
                        onChange={(e) => {
                          setAcroFormValues((p) => ({ ...p, [f.fieldName]: e.target.value }));
                          setHasUnsavedChanges(true);
                        }}
                        style={style}
                        className={`absolute bg-blue-50/85 text-slate-900 text-xs px-1.5 border rounded outline-none focus:bg-white ${
                          errMsg
                            ? 'border-rose-500 ring-1 ring-rose-500'
                            : f.required && !val
                            ? 'border-amber-500 ring-1 ring-amber-400'
                            : 'border-blue-400/70 focus:border-[#1B4B91]'
                        }`}
                      />
                    );
                  })}

                {/* User-Added Fill & Sign Fields */}
                {customFields
                  .filter((f) => f.page === currentPage)
                  .map((f) => {
                    const isSel = selectedFieldId === f.id;
                    const signerObj = signers.find((s) => s.id === f.signerId) || signers[0];
                    const errMsg = validateFieldValue(f.value, f.validationFormat);
                    const isOtherSignerLocked = guidedSigningActive && signers[activeSignerIdx]?.id !== f.signerId;

                    return (
                      <div
                        key={f.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedFieldId(f.id);
                          setSelectedAnnotationIds([]);
                          setShowPropertiesPanel(true);
                          if (!readOnlyLocked && activeTool === 'select') {
                            const { x, y } = getOverlayPos(e);
                            dragModeRef.current = 'moveField';
                            dragStartRef.current = { x, y, origField: { ...f } };
                          }
                        }}
                        style={{
                          left: `${f.xNorm * 100}%`,
                          top: `${f.yNorm * 100}%`,
                          width: `${f.wNorm * 100}%`,
                          height: `${f.hNorm * 100}%`,
                          borderColor: isSel ? '#1B4B91' : signerObj?.color || '#2563eb'
                        }}
                        className={`absolute border-2 rounded-md flex items-center justify-center bg-white/90 text-slate-900 shadow-xs ${
                          isSel ? 'ring-2 ring-blue-500/40 z-20' : 'z-10'
                        } ${f.required && !f.value ? 'ring-1 ring-amber-500' : ''} ${
                          isOtherSignerLocked ? 'opacity-45 pointer-events-none' : ''
                        }`}
                      >
                        {(f.type === 'signature' || f.type === 'initials' || f.type === 'image') ? (
                          f.value ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-0.5">
                              <img src={f.value} alt={f.label} className="max-h-full max-w-full object-contain pointer-events-none" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (readOnlyLocked) return;
                                if (f.type === 'image') {
                                  const inp = document.createElement('input');
                                  inp.type = 'file';
                                  inp.accept = 'image/*';
                                  inp.onchange = (ev) => {
                                    const file = ev.target.files?.[0];
                                    if (!file) return;
                                    const r = new FileReader();
                                    r.onload = (re) => {
                                      setCustomFields((prev) =>
                                        prev.map((x) =>
                                          x.id === f.id
                                            ? { ...x, value: re.target.result, completedAtIso: new Date().toISOString(), completedAtLabel: `${new Date().toLocaleString()} (device clock time)` }
                                            : x
                                        )
                                      );
                                      setHasUnsavedChanges(true);
                                    };
                                    r.readAsDataURL(file);
                                  };
                                  inp.click();
                                  return;
                                }
                                setPendingSignatureTargetFieldId(f.id);
                                setSignatureModalKind(f.type === 'initials' ? 'initials' : 'signature');
                                setIsSignatureModalOpen(true);
                              }}
                              className="w-full h-full text-[11px] font-semibold text-blue-700 hover:bg-blue-50 px-1 truncate cursor-pointer"
                            >
                              Click to {f.type === 'initials' ? 'initial' : f.type === 'image' ? 'add image' : 'sign'}
                            </button>
                          )
                        ) : f.type === 'checkbox' ? (
                          <input
                            type="checkbox"
                            checked={Boolean(f.value)}
                            disabled={f.readOnly || readOnlyLocked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setCustomFields((prev) =>
                                prev.map((x) =>
                                  x.id === f.id
                                    ? { ...x, value: e.target.checked, completedAtIso: new Date().toISOString(), completedAtLabel: `${new Date().toLocaleString()} (device clock time)` }
                                    : x
                                )
                              );
                              setHasUnsavedChanges(true);
                            }}
                            className="w-4 h-4 accent-[#1B4B91] cursor-pointer"
                          />
                        ) : f.type === 'dropdown' ? (
                          <select
                            value={f.value || ''}
                            disabled={f.readOnly || readOnlyLocked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setCustomFields((prev) =>
                                prev.map((x) =>
                                  x.id === f.id
                                    ? { ...x, value: e.target.value, completedAtIso: new Date().toISOString(), completedAtLabel: `${new Date().toLocaleString()} (device clock time)` }
                                    : x
                                )
                              );
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full h-full bg-transparent text-xs px-1 outline-none"
                          >
                            <option value="">-- Select --</option>
                            {(f.options || []).map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={f.value || ''}
                            maxLength={f.maxLength || undefined}
                            readOnly={f.readOnly || readOnlyLocked}
                            placeholder={f.label}
                            title={errMsg || f.label}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setCustomFields((prev) =>
                                prev.map((x) =>
                                  x.id === f.id
                                    ? { ...x, value: e.target.value, completedAtIso: new Date().toISOString(), completedAtLabel: `${new Date().toLocaleString()} (device clock time)` }
                                    : x
                                )
                              );
                              setHasUnsavedChanges(true);
                            }}
                            className={`w-full h-full bg-transparent px-1.5 text-xs outline-none ${errMsg ? 'text-rose-600 font-semibold' : ''}`}
                          />
                        )}
                      </div>
                    );
                  })}

                {/* Rendered Page Annotations */}
                {currentPageAnns.map((ann) => {
                  const isSel = selectedAnnotationIds.includes(ann.id);

                  if (ann.type === 'draw') {
                    return (
                      <svg key={ann.id} className="absolute inset-0 w-full h-full pointer-events-none">
                        <polyline
                          points={(ann.points || []).map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke={ann.color || '#1B4B91'}
                          strokeWidth={ann.thickness || 2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeOpacity={ann.opacity ?? 1}
                        />
                      </svg>
                    );
                  }

                  const selectThis = (e) => {
                    e.stopPropagation();
                    setSelectedFieldId(null);
                    setShowPropertiesPanel(true);
                    if (e.shiftKey) {
                      setSelectedAnnotationIds((prev) =>
                        prev.includes(ann.id) ? prev.filter((id) => id !== ann.id) : [...prev, ann.id]
                      );
                    } else {
                      setSelectedAnnotationIds([ann.id]);
                    }
                    if (!ann.locked && !readOnlyLocked && activeTool === 'select') {
                      const { x, y } = getOverlayPos(e);
                      dragModeRef.current = 'move';
                      const origMap = new Map();
                      const activeGroup = e.shiftKey || selectedAnnotationIds.includes(ann.id) ? selectedAnnotationIds : [ann.id];
                      currentPageAnns.forEach((item) => {
                        if (activeGroup.includes(item.id) || item.id === ann.id) {
                          origMap.set(item.id, { x: item.x || 0, y: item.y || 0, width: item.width || 60, height: item.height || 30 });
                        }
                      });
                      dragStartRef.current = { x, y, origMap };
                    }
                  };

                  const renderHandles = () =>
                    isSel && !ann.locked && !readOnlyLocked ? (
                      <>
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const { x, y } = getOverlayPos(e);
                            dragModeRef.current = 'resize';
                            const origMap = new Map();
                            origMap.set(ann.id, { x: ann.x || 0, y: ann.y || 0, width: ann.width || 80, height: ann.height || 30 });
                            dragStartRef.current = { x, y, origMap };
                          }}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-sm cursor-se-resize shadow"
                          title="Drag to resize"
                        />
                      </>
                    ) : null;

                  if (['highlight', 'underline', 'strikethrough', 'squiggly'].includes(ann.type)) {
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          backgroundColor: ann.type === 'highlight' ? ann.color : 'transparent',
                          opacity: ann.type === 'highlight' ? (ann.opacity ?? 0.4) : 1,
                          borderBottom: ann.type === 'underline' ? `2px solid ${ann.color}` : ann.type === 'squiggly' ? `2px wavy ${ann.color}` : undefined
                        }}
                        className={`absolute cursor-move ${isSel ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        {ann.type === 'strikethrough' && (
                          <div style={{ backgroundColor: ann.color }} className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2" />
                        )}
                        {renderHandles()}
                      </div>
                    );
                  }

                  if (ann.type === 'whiteout' || ann.type === 'redact') {
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          backgroundColor: ann.type === 'redact' ? '#000000' : (ann.color || '#ffffff')
                        }}
                        title={ann.type === 'whiteout' ? 'Cover-only whiteout (not secure redaction)' : 'Queued for 216-DPI redaction'}
                        className={`absolute cursor-move ${
                          isSel
                            ? ann.type === 'redact'
                              ? 'ring-2 ring-rose-500'
                              : 'ring-2 ring-blue-500'
                            : ann.type === 'whiteout'
                            ? 'border border-dashed border-slate-400/70'
                            : ''
                        }`}
                      >
                        {ann.type === 'redact' && (
                          <span className="text-[10px] font-bold text-rose-400 px-1 select-none pointer-events-none">REDACT</span>
                        )}
                        {renderHandles()}
                      </div>
                    );
                  }

                  if (ann.type === 'text' || ann.type === 'coverText' || ann.type === 'callout') {
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          minWidth: `${Math.max(40, ann.width || 60)}px`,
                          fontSize: `${ann.fontSize || 16}px`,
                          fontFamily: ann.fontFamily || 'Inter, sans-serif',
                          color: ann.color || '#000000',
                          backgroundColor: ann.isCoverReplace ? ann.coverColor : ann.bgColor || 'transparent',
                          border: ann.borderColor && ann.borderColor !== 'transparent' ? `1px solid ${ann.borderColor}` : undefined,
                          textAlign: ann.align || 'left',
                          fontWeight: ann.isBold ? 700 : 400,
                          fontStyle: ann.isItalic ? 'italic' : 'normal',
                          textDecoration: [ann.isUnderline ? 'underline' : '', ann.isStrikethrough ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
                          lineHeight: ann.lineSpacing || 1.3,
                          opacity: ann.opacity ?? 1
                        }}
                        className={`absolute px-1 py-0.5 rounded whitespace-pre-wrap cursor-move ${
                          isSel ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-400/60'
                        }`}
                      >
                        {ann.text}
                        {renderHandles()}
                      </div>
                    );
                  }

                  if (ann.type === 'shape') {
                    const sk = ann.shapeKind || 'rectangle';
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          opacity: ann.opacity ?? 1
                        }}
                        className={`absolute cursor-move ${isSel ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <svg className="w-full h-full overflow-visible">
                          {(sk === 'rectangle' || sk === 'roundedRect') && (
                            <rect
                              x={1}
                              y={1}
                              width={Math.max(2, ann.width - 2)}
                              height={Math.max(2, ann.height - 2)}
                              rx={sk === 'roundedRect' ? 8 : 0}
                              stroke={ann.strokeColor || '#1B4B91'}
                              strokeWidth={ann.strokeWidth || 2}
                              fill={ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : 'none'}
                              strokeDasharray={ann.dashStyle === 'dashed' ? '6 4' : ann.dashStyle === 'dotted' ? '2 3' : undefined}
                            />
                          )}
                          {sk === 'ellipse' && (
                            <ellipse
                              cx={ann.width / 2}
                              cy={ann.height / 2}
                              rx={Math.max(2, ann.width / 2 - 2)}
                              ry={Math.max(2, ann.height / 2 - 2)}
                              stroke={ann.strokeColor || '#1B4B91'}
                              strokeWidth={ann.strokeWidth || 2}
                              fill={ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : 'none'}
                            />
                          )}
                          {(sk === 'line' || sk === 'arrow') && (
                            <line
                              x1={(ann.x1 ?? ann.x) - ann.x}
                              y1={(ann.y1 ?? ann.y) - ann.y}
                              x2={(ann.x2 ?? ann.x + ann.width) - ann.x}
                              y2={(ann.y2 ?? ann.y + ann.height) - ann.y}
                              stroke={ann.strokeColor || '#1B4B91'}
                              strokeWidth={ann.strokeWidth || 2}
                              strokeLinecap="round"
                            />
                          )}
                          {sk === 'checkmark' && (
                            <polyline
                              points={`${ann.width * 0.18},${ann.height * 0.52} ${ann.width * 0.42},${ann.height * 0.78} ${ann.width * 0.84},${ann.height * 0.22}`}
                              fill="none"
                              stroke={ann.strokeColor || '#16a34a'}
                              strokeWidth={ann.strokeWidth || 3}
                              strokeLinecap="round"
                            />
                          )}
                          {sk === 'cross' && (
                            <>
                              <line x1={ann.width * 0.2} y1={ann.height * 0.2} x2={ann.width * 0.8} y2={ann.height * 0.8} stroke={ann.strokeColor || '#dc2626'} strokeWidth={ann.strokeWidth || 3} />
                              <line x1={ann.width * 0.8} y1={ann.height * 0.2} x2={ann.width * 0.2} y2={ann.height * 0.8} stroke={ann.strokeColor || '#dc2626'} strokeWidth={ann.strokeWidth || 3} />
                            </>
                          )}
                          {sk === 'dot' && (
                            <circle cx={ann.width / 2} cy={ann.height / 2} r={Math.min(ann.width, ann.height) / 3} fill={ann.fillColor || ann.strokeColor || '#1B4B91'} />
                          )}
                          {(sk === 'polygon' || sk === 'cloud') && (
                            <rect x={2} y={2} width={Math.max(4, ann.width - 4)} height={Math.max(4, ann.height - 4)} rx={sk === 'cloud' ? 16 : 0} stroke={ann.strokeColor || '#1B4B91'} strokeWidth={ann.strokeWidth || 2} fill={ann.fillColor !== 'transparent' ? ann.fillColor : 'none'} strokeDasharray={sk === 'cloud' ? '8 3' : undefined} />
                          )}
                        </svg>
                        {renderHandles()}
                      </div>
                    );
                  }

                  if (ann.type === 'image' || ann.type === 'signature') {
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`,
                          transform: ann.rotation ? `rotate(${ann.rotation}deg)` : undefined,
                          opacity: ann.opacity ?? 1
                        }}
                        className={`absolute cursor-move flex flex-col items-center ${isSel ? 'ring-2 ring-blue-500' : ''}`}
                      >
                        <img
                          src={ann.dataUrl}
                          alt={ann.type}
                          style={{
                            clipPath:
                              ann.cropTop || ann.cropRight || ann.cropBottom || ann.cropLeft
                                ? `inset(${ann.cropTop || 0}% ${ann.cropRight || 0}% ${ann.cropBottom || 0}% ${ann.cropLeft || 0}%)`
                                : undefined
                          }}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        {ann.captionText && (
                          <div className="text-[11px] font-medium text-slate-900 whitespace-nowrap bg-white/80 px-1 rounded">
                            {ann.captionText}
                          </div>
                        )}
                        {renderHandles()}
                      </div>
                    );
                  }

                  if (ann.type === 'comment') {
                    return (
                      <button
                        key={ann.id}
                        type="button"
                        onMouseDown={selectThis}
                        style={{ left: `${ann.x}px`, top: `${ann.y}px` }}
                        title={`${ann.author}: ${ann.text}`}
                        className={`absolute w-7 h-7 rounded-lg bg-amber-400 text-slate-900 shadow-md flex items-center justify-center cursor-pointer ${
                          isSel ? 'ring-2 ring-blue-500' : ''
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    );
                  }

                  if (ann.type === 'link') {
                    return (
                      <div
                        key={ann.id}
                        onMouseDown={selectThis}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (ann.linkKind === 'page' && ann.targetPage) {
                            setCurrentPage(ann.targetPage);
                          } else if (ann.url) {
                            setExternalLinkConfirmUrl(ann.url);
                          }
                        }}
                        style={{
                          left: `${ann.x}px`,
                          top: `${ann.y}px`,
                          width: `${ann.width}px`,
                          height: `${ann.height}px`
                        }}
                        title={ann.linkKind === 'page' ? `Page ${ann.targetPage} (double-click to jump)` : `Link: ${ann.url} (double-click to open)`}
                        className={`absolute border-2 border-dashed border-blue-500 bg-blue-500/15 cursor-pointer flex items-end justify-end p-0.5 ${
                          isSel ? 'ring-2 ring-blue-600' : ''
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5 text-blue-600" />
                        {renderHandles()}
                      </div>
                    );
                  }

                  return null;
                })}

                {/* Active Freehand Stroke Preview */}
                {activeTool === 'draw' && activeStrokePoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polyline
                      points={activeStrokePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke={activeDrawSubtype === 'marker' ? '#fde047' : penColor}
                      strokeWidth={activeDrawSubtype === 'marker' ? Math.max(12, penThickness * 4) : penThickness}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeOpacity={activeDrawSubtype === 'marker' ? 0.38 : 1}
                    />
                  </svg>
                )}

                {/* Active Box Preview */}
                {activeBoxPreview && (
                  <div
                    style={{
                      left: `${activeBoxPreview.x}px`,
                      top: `${activeBoxPreview.y}px`,
                      width: `${activeBoxPreview.width}px`,
                      height: `${activeBoxPreview.height}px`
                    }}
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-500/15 pointer-events-none"
                  />
                )}

                {/* Inline Multi-Line Auto-Grow Textarea */}
                {inlineTextEdit && (
                  <div
                    style={{
                      left: `${inlineTextEdit.x}px`,
                      top: `${inlineTextEdit.y}px`,
                      backgroundColor: inlineTextEdit.isCoverReplace ? inlineTextEdit.coverColor : '#ffffff'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-30 border-2 border-blue-600 rounded-md shadow-xl p-1 flex flex-col gap-1 min-w-[200px]"
                  >
                    <textarea
                      ref={inlineTextAreaRef}
                      rows={2}
                      value={inlineTextEdit.text}
                      onChange={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                        setInlineTextEdit((p) => ({ ...p, text: e.target.value }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setInlineTextEdit(null);
                      }}
                      placeholder="Type text (multi-line)..."
                      className="text-sm text-slate-900 bg-transparent outline-none resize-none min-w-[200px]"
                    />
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setInlineTextEdit(null)} className="px-2 py-0.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer">
                        Cancel
                      </button>
                      <button type="button" onClick={commitInlineText} className="px-2.5 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* RIGHT CONTEXT-SENSITIVE PROPERTIES PANEL (hidden when nothing is selected) */}
        {showPropertiesPanel && (selectedAnnObjects.length > 0 || selectedFieldObj) && (
          <PdfPropertiesPanel
            selectedItems={selectedAnnObjects}
            selectedField={selectedFieldObj}
            numPages={pageOrder.length}
            signers={signers}
            onUpdateAnnotation={handleUpdateAnnotation}
            onBatchUpdateAnnotations={handleBatchUpdateAnnotations}
            onDeleteSelected={handleDeleteSelected}
            onDuplicateSelected={handleDuplicateSelected}
            onLayerChange={handleLayerChange}
            onAlignSelected={handleAlignSelected}
            onDistributeSelected={handleDistributeSelected}
            onSwitchWhiteoutToRedact={(id) => {
              handleUpdateAnnotation(id, { type: 'redact', color: '#000000' });
              setModeTab('protect');
              notify('Converted cover whiteout to Secure Redact. Use "Apply Redactions" to permanently destroy data.', 'info');
            }}
            onUpdateField={(id, patch) => {
              const next = customFields.map((f) => (f.id === id ? { ...f, ...patch } : f));
              setCustomFields(next);
              commitHistory(annotations, pageOrder, next);
            }}
            onDeleteField={(id) => {
              const next = customFields.filter((f) => f.id !== id);
              setCustomFields(next);
              commitHistory(annotations, pageOrder, next);
              setSelectedFieldId(null);
            }}
            onDuplicateField={(f) => {
              const copy = {
                ...JSON.parse(JSON.stringify(f)),
                id: `fld_${Date.now()}`,
                yNorm: Math.min(0.92, f.yNorm + 0.05)
              };
              const next = [...customFields, copy];
              setCustomFields(next);
              commitHistory(annotations, pageOrder, next);
              setSelectedFieldId(copy.id);
            }}
            onApplyFieldToAllPages={(f) => {
              const additions = [];
              for (let p = 1; p <= pageOrder.length; p++) {
                if (p === f.page) continue;
                additions.push({
                  ...JSON.parse(JSON.stringify(f)),
                  id: `fld_${Date.now()}_p${p}_${Math.random().toString(36).slice(2, 5)}`,
                  page: p
                });
              }
              const next = [...customFields, ...additions];
              setCustomFields(next);
              commitHistory(annotations, pageOrder, next);
              notify(`Applied field across all ${pageOrder.length} pages.`, 'success');
            }}
            onClose={() => {
              setSelectedAnnotationIds([]);
              setSelectedFieldId(null);
            }}
            onFontAdded={() => setFontTick((t) => t + 1)}
            readOnlyLocked={readOnlyLocked}
          />
        )}

        {/* AI FINANCIAL ASSISTANT DRAWER */}
        {showAiDrawer && (
          <aside className="w-80 border-l border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] flex flex-col shrink-0 shadow-2xl">
            <div className="p-3.5 border-b border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h4 className="font-semibold text-[14px]">Financial AI Assistant</h4>
              </div>
              <button type="button" onClick={() => setShowAiDrawer(false)} aria-label="Close AI panel" className="p-1 text-[var(--muted)] hover:text-[var(--ink)] rounded cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {isLocalOnlyMode ? (
              <div className="p-4 text-[13px] text-[var(--muted)] leading-relaxed">
                <strong className="text-[var(--ink)]">Local-only mode is active.</strong> No document text leaves this device. Use local search and offline OCR instead, or disable Local-only mode in AI Settings to analyze documents.
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-[var(--line)] flex flex-col gap-1.5">
                  <button type="button" onClick={() => handleAiAction('summary')} disabled={aiLoading} className="text-left px-2.5 py-2 rounded-lg text-[13px] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] cursor-pointer">
                    Summarize Document
                  </button>
                  <button type="button" onClick={() => handleAiAction('fees')} disabled={aiLoading} className="text-left px-2.5 py-2 rounded-lg text-[13px] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] cursor-pointer">
                    Find Fees &amp; Penalties
                  </button>
                  <button type="button" onClick={() => handleAiAction('transactions')} disabled={aiLoading} className="text-left px-2.5 py-2 rounded-lg text-[13px] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)] cursor-pointer">
                    Extract Line-Item Charges
                  </button>
                </div>
                <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-3 text-[13px] text-[var(--ink)]">
                  {aiLoading && <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300"><Loader2 className="w-4 h-4 animate-spin" /><span>Analyzing...</span></div>}
                  {aiSummary && <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] whitespace-pre-line">{aiSummary}</div>}
                  {aiChatResponses.map((it, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
                      <div className="font-semibold text-purple-600 dark:text-purple-300 mb-1">{it.question}</div>
                      <div className="whitespace-pre-line">{it.answer}</div>
                    </div>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleAiAction('custom'); }} className="p-3 border-t border-[var(--line)] flex gap-2">
                  <input type="text" value={aiCustomQuestion} onChange={(e) => setAiCustomQuestion(e.target.value)} placeholder="Ask about this PDF..." className="flex-1 bg-[var(--surface-subtle)] text-[var(--ink)] text-[13px] px-3 py-2 rounded-lg border border-[var(--line)] outline-none focus:border-[var(--brand)]" />
                  <button type="submit" disabled={aiLoading || !aiCustomQuestion.trim()} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[13px] font-semibold cursor-pointer disabled:opacity-40">Ask</button>
                </form>
              </>
            )}
          </aside>
        )}
      </div>

      {/* 4. BOTTOM STATUS BAR */}
      <footer className="h-8 border-t border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] px-4 flex items-center justify-between text-[12px] shrink-0">
        <div className="flex items-center gap-4">
          <span>Page {currentPage} of {pageOrder.length || 1}</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Size: {formatFileSize(rawPdfBytes?.byteLength || 0)}</span>
        </div>
        <div className="flex items-center gap-3">
          {isEncryptedDoc && <span className="text-amber-600 dark:text-amber-300 font-medium">Encrypted PDF</span>}
          {embeddedSignatures.length > 0 && <span className="text-emerald-600 dark:text-emerald-300 font-medium">Digitally Signed</span>}
          <span className={hasUnsavedChanges ? 'text-amber-600 dark:text-amber-300 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-medium'}>
            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
          </span>
        </div>
      </footer>

      {/* DIALOGS & MODALS */}
      {isSignatureModalOpen && (
        <Suspense fallback={null}>
          <SignaturePadModal
            isOpen={isSignatureModalOpen}
            initialKind={signatureModalKind}
            defaultSignerName={guidedSigningActive ? signers[activeSignerIdx]?.name : localProfile.name || ''}
            onClose={() => {
              setIsSignatureModalOpen(false);
              setPendingSignatureTargetFieldId(null);
            }}
            onAdoptSignature={(payload) => {
              const sigObj = typeof payload === 'string' ? { dataUrl: payload, captionText: '', kind: 'signature' } : payload;
              if (pendingSignatureTargetFieldId) {
                setCustomFields((prev) =>
                  prev.map((f) =>
                    f.id === pendingSignatureTargetFieldId
                      ? {
                          ...f,
                          value: sigObj.dataUrl,
                          captionText: sigObj.captionText || f.captionText || '',
                          completedAtIso: new Date().toISOString(),
                          completedAtLabel: `${new Date().toLocaleString()} (device clock time)`
                        }
                      : f
                  )
                );
                setPendingSignatureTargetFieldId(null);
                setHasUnsavedChanges(true);
                notify('Signature placed in field.', 'success');
              } else {
                setPendingSignaturePayload(sigObj);
                setActiveTool(sigObj.kind === 'initials' ? 'initials' : 'signature');
                notify('Signature ready! Click anywhere on the page to place.', 'success');
              }
            }}
          />
        </Suspense>
      )}

      <PageSetupModal isOpen={isPageSetupOpen} onClose={() => setIsPageSetupOpen(false)} pageSetup={pageSetup} onSavePageSetup={(draft) => { setPageSetup(draft); setHasUnsavedChanges(true); }} />

      <ApplyRedactionsModal isOpen={isApplyRedactionsOpen} onClose={() => setIsApplyRedactionsOpen(false)} redactionsSummary={redactionsSummary} isApplying={isExporting} onConfirmApply={handleApplySecureRedactions} />

      <SecurityEncryptionModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        isEncryptedDocument={isEncryptedDoc}
        isBusy={isExporting}
        onEncryptPdf={async (opts) => {
          setIsExporting(true);
          try {
            const exported = await burnAndExportPdf({ docName, originalBytes: rawPdfBytes, pageOrder, annotations, acroFormValues, customFields, pageSetup });
            const encryptedBytes = await encryptPdfWithQpdf(exported.bytes, opts);
            downloadBlobBytes(encryptedBytes, `${docName}-encrypted.pdf`);
            setIsSecurityModalOpen(false);
            notify('PDF encrypted with QPDF 256-bit AES and downloaded!', 'success');
          } catch (err) {
            notify(err.message || 'Encryption failed.', 'error');
          } finally {
            setIsExporting(false);
          }
        }}
        onDecryptPdf={async (pass) => {
          setIsExporting(true);
          try {
            const decryptedBytes = await decryptPdfWithQpdf(rawPdfBytes, pass);
            await loadPdfDocumentSource(decryptedBytes, docName);
            setIsSecurityModalOpen(false);
            notify('Document decrypted locally.', 'success');
          } catch (err) {
            notify(err.message || 'Incorrect password or decryption failed.', 'error');
          } finally {
            setIsExporting(false);
          }
        }}
        onOptimizePdf={async () => {
          setIsExporting(true);
          try {
            const optBytes = await optimizeAndLinearizePdfWithQpdf(rawPdfBytes);
            await loadPdfDocumentSource(optBytes, docName);
            setIsSecurityModalOpen(false);
            notify('PDF linearized and object-stream compressed via QPDF.', 'success');
          } catch (err) {
            notify(err.message || 'Optimization failed.', 'error');
          } finally {
            setIsExporting(false);
          }
        }}
      />

      <DigitalSignaturesModal
        isOpen={isDigitalSigModalOpen}
        onClose={() => setIsDigitalSigModalOpen(false)}
        certificates={savedCertificates}
        onRefreshCertificates={setSavedCertificates}
        embeddedSignatures={embeddedSignatures}
        rawPdfBytes={rawPdfBytes}
        isBusy={isExporting}
        onSignWithCertificate={async (cert, pass, reason) => {
          setIsExporting(true);
          try {
            const exported = await burnAndExportPdf({ docName, originalBytes: rawPdfBytes, pageOrder, annotations, acroFormValues, customFields, flattenForm: true, pageSetup });
            const signed = await signPdfWithCertificate(exported.bytes, { p12Base64: cert.p12Base64, passphrase: pass, reason });
            await loadPdfDocumentSource(signed.bytes, docName);
            downloadBlobBytes(signed.bytes, `${docName}-digitally-signed.pdf`);
            notify(`Signed cryptographically by ${signed.signerName}.`, 'success');
          } catch (err) {
            notify(err.message || 'Cryptographic signing failed (check passphrase).', 'error');
          } finally {
            setIsExporting(false);
          }
        }}
      />

      <SignersSetupModal
        isOpen={isSignersModalOpen}
        onClose={() => setIsSignersModalOpen(false)}
        signers={signers}
        onUpdateSigners={setSigners}
        onStartGuidedSigning={() => {
          setActiveSignerIdx(0);
          setGuidedSigningActive(true);
          setModeTab('fill');
        }}
      />

      {/* Handover screen between in-person signers */}
      {handoverPromptSigner && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl max-w-md w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4">
            <Users className="w-10 h-10 text-[var(--brand)]" />
            <h3 className="text-[18px] font-bold">Hand Over Device to Next Signer</h3>
            <p className="text-[14px] text-[var(--muted)]">
              Please pass the device to <strong className="text-[var(--ink)]">{handoverPromptSigner.name}</strong> to review and complete their assigned fields.
            </p>
            <Button
              variant="primary"
              onClick={() => {
                const nextIdx = signers.findIndex((s) => s.id === handoverPromptSigner.id);
                if (nextIdx >= 0) setActiveSignerIdx(nextIdx);
                setHandoverPromptSigner(null);
              }}
            >
              Continue as {handoverPromptSigner.name}
            </Button>
          </div>
        </div>
      )}

      <FinishAndLockModal
        isOpen={isFinishLockOpen}
        onClose={() => setIsFinishLockOpen(false)}
        isBusy={isExporting}
        onConfirmFinish={(appendRecord) =>
          handleExport({ saveToVault: Boolean(onSaveToVault), finishAndLock: true, appendRecordPage: appendRecord })
        }
      />

      <LinkConfirmModal url={externalLinkConfirmUrl} onClose={() => setExternalLinkConfirmUrl('')} />
    </div>
  );
}
