import React, { useState, useRef, useEffect, useCallback } from 'react';
import SignaturePad from 'signature_pad';
import {
  X,
  Check,
  RotateCcw,
  Undo2,
  PenTool,
  Type,
  Upload,
  Camera,
  Trash2,
  Star,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui';
import { SCRIPT_FONTS } from '../utils/pdfEditorEngine';
import {
  secureStorage,
  hasMasterPinSet,
  verifyMasterPin
} from '../utils/securityCrypto';

const SAVED_SIGNATURES_KEY = 'klarity_saved_signatures_v2';
const SIG_PIN_PROTECT_KEY = 'klarity_sig_pin_protect_v1';

const INK_COLORS = [
  { label: 'Black', hex: '#000000' },
  { label: 'Navy Blue', hex: '#1B4B91' },
  { label: 'Ink Blue', hex: '#2563EB' }
];

/**
 * Process an uploaded or camera image locally: strip bright paper background to transparent & auto-crop bounds.
 */
function processSignatureImage(sourceImgOrCanvas, threshold = 205, trimEdges = true) {
  const srcW = sourceImgOrCanvas.naturalWidth || sourceImgOrCanvas.width;
  const srcH = sourceImgOrCanvas.naturalHeight || sourceImgOrCanvas.height;
  if (!srcW || !srcH) return '';

  const workCanvas = document.createElement('canvas');
  const maxDim = 900;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  workCanvas.width = Math.max(1, Math.round(srcW * scale));
  workCanvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(sourceImgOrCanvas, 0, 0, workCanvas.width, workCanvas.height);

  const imgData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
  const d = imgData.data;

  let minX = workCanvas.width;
  let minY = workCanvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < workCanvas.height; y++) {
    for (let x = 0; x < workCanvas.width; x++) {
      const idx = (y * workCanvas.width + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];
      const a = d[idx + 3];
      if (a < 20) continue;

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const saturation = Math.max(r, g, b) - Math.min(r, g, b);

      // Remove bright paper/white background while preserving colored or dark ink
      if (luminance > threshold && saturation < 38) {
        d[idx + 3] = 0;
      } else {
        // Darken ink slightly for crisp scan clarity on paper
        const factor = Math.max(0, (threshold - luminance) / threshold);
        d[idx + 3] = Math.min(255, Math.round(140 + factor * 115));
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  if (trimEdges && maxX >= minX && maxY >= minY) {
    const pad = 12;
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(workCanvas.width - cx, maxX - minX + pad * 2);
    const ch = Math.min(workCanvas.height - cy, maxY - minY + pad * 2);
    const outCanvas = document.createElement('canvas');
    outCanvas.width = Math.max(40, cw);
    outCanvas.height = Math.max(24, ch);
    outCanvas.getContext('2d').drawImage(workCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return outCanvas.toDataURL('image/png');
  }

  return workCanvas.toDataURL('image/png');
}

/**
 * Render a typed signature in any of the bundled OFL script fonts as a trimmed transparent PNG.
 */
function renderTypedSignaturePng(text, fontObj, inkHex) {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = inkHex || '#000000';
  ctx.font = `400 72px ${fontObj.css}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(clean, canvas.width / 2, canvas.height / 2, canvas.width - 40);

  // Auto-trim transparent edges cleanly
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (d[(y * canvas.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas.toDataURL('image/png');
  const pad = 16;
  const cx = Math.max(0, minX - pad);
  const cy = Math.max(0, minY - pad);
  const cw = Math.min(canvas.width - cx, maxX - minX + pad * 2);
  const ch = Math.min(canvas.height - cy, maxY - minY + pad * 2);
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
  return out.toDataURL('image/png');
}

export default function SignaturePadModal({
  isOpen,
  onClose,
  onAdoptSignature,
  initialKind = 'signature', // 'signature' | 'initials'
  defaultSignerName = ''
}) {
  const [kind, setKind] = useState(initialKind);
  const [tab, setTab] = useState('draw'); // 'draw' | 'type' | 'upload' | 'camera' | 'saved'
  const [inkColor, setInkColor] = useState('#000000');

  // Draw tab via signature_pad
  const drawCanvasRef = useRef(null);
  const sigPadRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Type tab
  const [typedText, setTypedText] = useState(defaultSignerName || '');
  const [selectedFontId, setSelectedFontId] = useState(SCRIPT_FONTS[0].id);

  // Upload & Camera processing
  const [rawUploadImg, setRawUploadImg] = useState(null);
  const [bgThreshold, setBgThreshold] = useState(205);
  const [autoTrim, setAutoTrim] = useState(true);
  const [processedImageUrl, setProcessedImageUrl] = useState('');
  const uploadInputRef = useRef(null);

  // Camera opt-in state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Optional label + name/title subtitle under placed signature
  const [saveLabel, setSaveLabel] = useState('');
  const [captionText, setCaptionText] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  // Encrypted saved library & optional Vault PIN protection
  const [savedItems, setSavedItems] = useState([]);
  const [protectWithPin, setProtectWithPin] = useState(() => {
    try {
      return localStorage.getItem(SIG_PIN_PROTECT_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isLibraryUnlocked, setIsLibraryUnlocked] = useState(false);
  const [pinEntry, setPinEntry] = useState('');
  const [pinError, setPinError] = useState('');
  const vaultPinExists = hasMasterPinSet();

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    setKind(initialKind || 'signature');
    setTypedText((prev) => prev || defaultSignerName || '');
    setHasDrawn(false);
    setProcessedImageUrl('');
    setRawUploadImg(null);
    setCameraError('');
    setPinEntry('');
    setPinError('');

    const pinRequired = protectWithPin && hasMasterPinSet();
    setIsLibraryUnlocked(!pinRequired);

    secureStorage.getItem(SAVED_SIGNATURES_KEY, []).then((list) => {
      setSavedItems(Array.isArray(list) ? list : []);
    });
  }, [isOpen, initialKind, defaultSignerName, protectWithPin, stopCamera]);

  // Initialize & sync SignaturePad instance
  useEffect(() => {
    if (!isOpen || tab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(460, rect.width || 520);
    const cssH = 190;
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    const pad = new SignaturePad(canvas, {
      minWidth: 1.0,
      maxWidth: 3.4,
      penColor: inkColor,
      throttle: 8
    });
    pad.addEventListener('endStroke', () => {
      setHasDrawn(!pad.isEmpty());
    });
    sigPadRef.current = pad;

    return () => {
      pad.off();
      sigPadRef.current = null;
    };
  }, [isOpen, tab]);

  useEffect(() => {
    if (sigPadRef.current) {
      sigPadRef.current.penColor = inkColor;
    }
  }, [inkColor]);

  // Re-run background removal cleanly when slider changes
  useEffect(() => {
    if (rawUploadImg) {
      setProcessedImageUrl(processSignatureImage(rawUploadImg, bgThreshold, autoTrim));
    }
  }, [rawUploadImg, bgThreshold, autoTrim]);

  if (!isOpen) return null;

  const handleUndoStroke = () => {
    const pad = sigPadRef.current;
    if (!pad) return;
    const data = pad.toData();
    if (data.length > 0) {
      data.pop();
      pad.fromData(data);
      setHasDrawn(!pad.isEmpty());
    }
  };

  const handleClearDraw = () => {
    sigPadRef.current?.clear();
    setHasDrawn(false);
  };

  const handleUploadFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        setRawUploadImg(img);
        setProcessedImageUrl(processSignatureImage(img, bgThreshold, autoTrim));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStartCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Webcam capture is not available in this environment.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } }
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 40);
    } catch (err) {
      setCameraError(err?.message || 'Camera permission denied or unavailable.');
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const capCanvas = document.createElement('canvas');
    capCanvas.width = video.videoWidth;
    capCanvas.height = video.videoHeight;
    capCanvas.getContext('2d').drawImage(video, 0, 0, capCanvas.width, capCanvas.height);

    const img = new Image();
    img.onload = () => {
      setRawUploadImg(img);
      setProcessedImageUrl(processSignatureImage(img, bgThreshold, autoTrim));
      stopCamera();
    };
    img.src = capCanvas.toDataURL('image/png');
  };

  const handleTogglePinProtect = (nextVal) => {
    setProtectWithPin(nextVal);
    try {
      localStorage.setItem(SIG_PIN_PROTECT_KEY, nextVal ? 'true' : 'false');
    } catch {}
    if (nextVal && hasMasterPinSet()) {
      setIsLibraryUnlocked(false);
    } else {
      setIsLibraryUnlocked(true);
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    setPinError('');
    const result = await verifyMasterPin(pinEntry);
    if (result.valid) {
      setIsLibraryUnlocked(true);
      setPinEntry('');
    } else {
      setPinError(result.error || 'Incorrect PIN.');
    }
  };

  const persistNewLibraryEntry = async (dataUrl, customName) => {
    if (!saveToLibrary) return;
    const label =
      (customName || '').trim() ||
      (typedText || '').trim() ||
      `${kind === 'initials' ? 'Initials' : 'Signature'} ${savedItems.length + 1}`;
    const entry = {
      id: `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      name: label,
      captionText: captionText.trim(),
      dataUrl,
      isDefault: !savedItems.some((s) => s.kind === kind && s.isDefault),
      createdAtIso: new Date().toISOString()
    };
    const updated = [entry, ...savedItems];
    setSavedItems(updated);
    await secureStorage.setItem(SAVED_SIGNATURES_KEY, updated);
  };

  const handleSetDefault = async (itemId) => {
    const target = savedItems.find((s) => s.id === itemId);
    if (!target) return;
    const updated = savedItems.map((s) =>
      s.kind === target.kind ? { ...s, isDefault: s.id === itemId } : s
    );
    setSavedItems(updated);
    await secureStorage.setItem(SAVED_SIGNATURES_KEY, updated);
  };

  const handleDeleteSaved = async (itemId) => {
    const updated = savedItems.filter((s) => s.id !== itemId);
    setSavedItems(updated);
    await secureStorage.setItem(SAVED_SIGNATURES_KEY, updated);
  };

  const handleAdopt = async () => {
    let dataUrl = '';
    if (tab === 'draw') {
      const pad = sigPadRef.current;
      if (!pad || pad.isEmpty()) return;
      dataUrl = pad.toDataURL('image/png');
    } else if (tab === 'type') {
      const fontObj = SCRIPT_FONTS.find((f) => f.id === selectedFontId) || SCRIPT_FONTS[0];
      dataUrl = renderTypedSignaturePng(typedText, fontObj, inkColor);
    } else if (tab === 'upload' || tab === 'camera') {
      dataUrl = processedImageUrl;
    }
    if (!dataUrl) return;

    await persistNewLibraryEntry(dataUrl, saveLabel);
    stopCamera();
    onAdoptSignature({
      dataUrl,
      captionText: captionText.trim(),
      kind
    });
    onClose();
  };

  const canAdopt =
    tab === 'draw'
      ? hasDrawn
      : tab === 'type'
      ? Boolean(typedText.trim())
      : tab === 'upload' || tab === 'camera'
      ? Boolean(processedImageUrl)
      : false;

  const filteredSaved = savedItems.filter((s) => (s.kind || 'signature') === kind);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create or Choose Signature"
    >
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[16px] text-[var(--ink)]">
                {kind === 'initials' ? 'Create or Select Initials' : 'Create or Select Signature'}
              </h3>
              <p className="text-[13px] text-[var(--muted)]">
                Stored locally with AES-256-GCM encryption on this device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Signature vs Initials Switch */}
            <div className="flex items-center p-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => setKind('signature')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-[13px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                  kind === 'signature'
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Signature
              </button>
              <button
                type="button"
                onClick={() => setKind('initials')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-[13px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                  kind === 'initials'
                    ? 'bg-[var(--brand)] text-white'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                Initials
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              aria-label="Close signature dialog"
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface-subtle)] overflow-x-auto">
          {[
            { id: 'draw', label: 'Draw', icon: PenTool },
            { id: 'type', label: 'Type', icon: Type },
            { id: 'upload', label: 'Upload', icon: Upload },
            { id: 'camera', label: 'Webcam', icon: Camera },
            { id: 'saved', label: `Saved (${filteredSaved.length})`, icon: ShieldCheck }
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (t.id !== 'camera') stopCamera();
                  setTab(t.id);
                }}
                className={`flex-1 min-w-[100px] py-3 px-3 text-[13px] font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${
                  active
                    ? 'border-[var(--brand)] text-[var(--brand)] bg-[var(--surface)]'
                    : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* DRAW TAB */}
          {tab === 'draw' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--muted)]">
                <span>Draw with mouse, trackpad, touch, or pressure stylus</span>
                <div className="flex items-center gap-2">
                  <span>Ink:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setInkColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`${c.label} ink`}
                      title={c.label}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                        inkColor === c.hex ? 'border-[var(--brand)] scale-110 ring-2 ring-[var(--brand)]/30' : 'border-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="relative border-2 border-dashed border-[var(--line)] rounded-xl bg-white overflow-hidden shadow-inner">
                <canvas
                  ref={drawCanvasRef}
                  className="w-full h-[190px] touch-none block cursor-crosshair"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 italic text-xl select-none">
                    {kind === 'initials' ? 'Draw initials above the line' : 'Sign on this line'}
                  </div>
                )}
                <div className="absolute left-8 right-8 bottom-9 border-b border-slate-300 pointer-events-none" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUndoStroke}
                    className="px-3 py-1.5 min-h-[38px] rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Undo stroke</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDraw}
                    className="px-3 py-1.5 min-h-[38px] rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] hover:text-rose-500 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TYPE TAB (6+ Bundled OFL Script Fonts) */}
          {tab === 'type' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label htmlFor="sig-typed-input" className="text-[13px] font-medium text-[var(--ink)] block mb-1">
                    {kind === 'initials' ? 'Type your initials' : 'Type your full name'}
                  </label>
                  <input
                    id="sig-typed-input"
                    type="text"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder={kind === 'initials' ? 'e.g. J.D.' : 'e.g. Jane Doe'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] text-[15px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <span className="text-[13px] text-[var(--muted)]">Ink:</span>
                  {INK_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setInkColor(c.hex)}
                      style={{ backgroundColor: c.hex }}
                      aria-label={`${c.label} ink`}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                        inkColor === c.hex ? 'border-[var(--brand)] scale-110 ring-2 ring-[var(--brand)]/30' : 'border-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
                {SCRIPT_FONTS.map((fontObj) => {
                  const isSel = selectedFontId === fontObj.id;
                  return (
                    <button
                      key={fontObj.id}
                      type="button"
                      onClick={() => setSelectedFontId(fontObj.id)}
                      className={`p-3 rounded-xl border-2 text-left bg-white transition-all cursor-pointer flex flex-col justify-between min-h-[84px] ${
                        isSel
                          ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/25'
                          : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span
                        style={{ fontFamily: fontObj.css, color: inkColor }}
                        className="text-3xl leading-tight truncate block"
                      >
                        {typedText.trim() || (kind === 'initials' ? 'J.D.' : 'Jane Doe')}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 mt-1">
                        {fontObj.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* UPLOAD TAB */}
          {tab === 'upload' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleUploadFile}
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => uploadInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  <span>Choose signature image</span>
                </Button>

                {rawUploadImg && (
                  <div className="flex flex-wrap items-center gap-3 text-[13px]">
                    <label className="flex items-center gap-2 text-[var(--muted)]">
                      <span>Paper removal:</span>
                      <input
                        type="range"
                        min={130}
                        max={245}
                        value={bgThreshold}
                        onChange={(e) => setBgThreshold(Number(e.target.value))}
                        className="w-28"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoTrim}
                        onChange={(e) => setAutoTrim(e.target.checked)}
                      />
                      <span>Auto-crop edges</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="border-2 border-dashed border-[var(--line)] rounded-xl bg-white min-h-[180px] flex items-center justify-center p-4">
                {processedImageUrl ? (
                  <img
                    src={processedImageUrl}
                    alt="Processed uploaded signature"
                    className="max-h-40 object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-[14px]">
                    Upload a photo or scan of your handwritten {kind}. Background paper is removed locally.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OPT-IN CAMERA TAB */}
          {tab === 'camera' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!isCameraActive ? (
                    <Button variant="secondary" size="sm" onClick={handleStartCamera}>
                      <Camera className="w-4 h-4 mr-1.5" />
                      <span>Start Camera (Local Only)</span>
                    </Button>
                  ) : (
                    <>
                      <Button variant="primary" size="sm" onClick={handleCaptureCameraFrame}>
                        <Check className="w-4 h-4 mr-1.5" />
                        <span>Capture Paper {kind === 'initials' ? 'Initials' : 'Signature'}</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={stopCamera}>
                        <span>Stop Camera</span>
                      </Button>
                    </>
                  )}
                </div>

                {rawUploadImg && !isCameraActive && (
                  <label className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                    <span>Paper removal:</span>
                    <input
                      type="range"
                      min={130}
                      max={245}
                      value={bgThreshold}
                      onChange={(e) => setBgThreshold(Number(e.target.value))}
                      className="w-28"
                    />
                  </label>
                )}
              </div>

              {cameraError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[13px]">
                  {cameraError}
                </div>
              )}

              <div className="border border-[var(--line)] rounded-xl bg-slate-950 min-h-[190px] flex items-center justify-center overflow-hidden">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-56 w-full object-contain"
                  />
                ) : processedImageUrl ? (
                  <div className="bg-white w-full min-h-[190px] flex items-center justify-center p-4">
                    <img
                      src={processedImageUrl}
                      alt="Captured signature"
                      className="max-h-40 object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-slate-400 text-[13px] px-4 text-center">
                    Click &quot;Start Camera&quot; to photograph a signature written on white paper. Frames never leave this device.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SAVED SIGNATURES & INITIALS LIBRARY */}
          {tab === 'saved' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)]">
                <label className="flex items-center gap-2 text-[13px] font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={protectWithPin}
                    onChange={(e) => handleTogglePinProtect(e.target.checked)}
                    disabled={!vaultPinExists}
                  />
                  <KeyRound className="w-4 h-4 text-[var(--brand)]" />
                  <span>Protect saved signatures with Vault PIN</span>
                </label>
                {!vaultPinExists && (
                  <span className="text-[12px] text-[var(--muted)]">
                    Set a Vault PIN in Settings &rarr; Security to enable
                  </span>
                )}
              </div>

              {!isLibraryUnlocked ? (
                <form
                  onSubmit={handleVerifyPin}
                  className="p-5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] flex flex-col items-center gap-3 text-center"
                >
                  <KeyRound className="w-6 h-6 text-[var(--brand)]" />
                  <p className="text-[14px] font-medium">Enter your Vault PIN to access saved {kind}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={pinEntry}
                      onChange={(e) => setPinEntry(e.target.value)}
                      placeholder="Vault PIN"
                      className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[14px] outline-none focus:border-[var(--brand)]"
                    />
                    <Button type="submit" variant="primary" size="sm">
                      Unlock
                    </Button>
                  </div>
                  {pinError && <p className="text-[13px] text-rose-500">{pinError}</p>}
                </form>
              ) : filteredSaved.length === 0 ? (
                <div className="p-6 text-center text-[14px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
                  No saved {kind} yet. Create one using Draw, Type, Upload, or Webcam.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
                  {filteredSaved.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border bg-[var(--surface-subtle)] flex flex-col gap-2 ${
                        item.isDefault ? 'border-[var(--brand)]' : 'border-[var(--line)]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          onAdoptSignature({
                            dataUrl: item.dataUrl,
                            captionText: captionText.trim() || item.captionText || '',
                            kind: item.kind || kind
                          });
                          onClose();
                        }}
                        className="bg-white rounded-lg p-2.5 h-20 flex items-center justify-center border border-slate-200 hover:border-[var(--brand)] cursor-pointer transition-colors"
                        title={`Use ${item.name}`}
                      >
                        <img src={item.dataUrl} alt={item.name} className="max-h-16 object-contain" />
                      </button>
                      <div className="flex items-center justify-between gap-2 text-[13px]">
                        <span className="font-semibold truncate" title={item.name}>
                          {item.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetDefault(item.id)}
                            title={item.isDefault ? 'Default' : 'Set as default'}
                            aria-label={`Set ${item.name} as default`}
                            className={`p-1.5 rounded-lg cursor-pointer ${
                              item.isDefault ? 'text-amber-500' : 'text-[var(--muted)] hover:text-amber-500'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${item.isDefault ? 'fill-amber-500' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSaved(item.id)}
                            title="Delete saved item"
                            aria-label={`Delete ${item.name}`}
                            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optional Name / Title Caption & Save Options (for creation tabs) */}
          {tab !== 'saved' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line)]">
              <div>
                <label htmlFor="sig-save-name" className="text-[13px] font-medium text-[var(--muted)] block mb-1">
                  Label (optional)
                </label>
                <input
                  id="sig-save-name"
                  type="text"
                  value={saveLabel}
                  onChange={(e) => setSaveLabel(e.target.value)}
                  placeholder="e.g. Formal Signature"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[14px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label htmlFor="sig-caption-line" className="text-[13px] font-medium text-[var(--muted)] block mb-1">
                  Name / Title line under signature (optional)
                </label>
                <input
                  id="sig-caption-line"
                  type="text"
                  value={captionText}
                  onChange={(e) => setCaptionText(e.target.value)}
                  placeholder="e.g. Jane Doe, Authorized Signer"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-[14px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-[13px] font-medium text-[var(--ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToLibrary}
                  onChange={(e) => setSaveToLibrary(e.target.checked)}
                />
                <span>Save encrypted copy to my local signature library for reuse</span>
              </label>
            </div>
          )}

          {/* Plain Legal Note */}
          <p className="text-[13px] leading-relaxed text-[var(--muted)] bg-[var(--surface-subtle)] border border-[var(--line)] rounded-xl px-3.5 py-2.5">
            Electronic signatures are generally accepted for many documents, but rules differ by country and document type. For legal or regulated documents, check what is required.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Cancel
          </Button>
          {tab !== 'saved' && (
            <Button variant="primary" size="sm" onClick={handleAdopt} disabled={!canAdopt}>
              <Check className="w-4 h-4 mr-1.5" />
              <span>Place {kind === 'initials' ? 'Initials' : 'Signature'}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
