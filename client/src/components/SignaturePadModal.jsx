import React, { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool, Type } from 'lucide-react';
import { Button } from './ui';

export default function SignaturePadModal({ isOpen, onClose, onAdoptSignature }) {
  const [tab, setTab] = useState('draw'); // 'draw' | 'type'
  const [typedName, setTypedName] = useState('');
  const [penColor, setPenColor] = useState('#000000');
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Clear canvas on opening
  useEffect(() => {
    if (isOpen) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    isDrawingRef.current = true;
    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
    setHasDrawn(true);
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentPoint = {
      x: clientX - rect.left,
      y: clientY - rect.top
    };

    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleAdopt = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const signatureDataUrl = canvas.toDataURL('image/png');
      try {
        localStorage.setItem('klarity_last_signature', signatureDataUrl);
      } catch {}
      onAdoptSignature(signatureDataUrl);
      onClose();
    } else {
      // Generate typed cursive signature as transparent PNG
      if (!typedName.trim()) return;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 600;
      offCanvas.height = 200;
      const ctx = offCanvas.getContext('2d');
      ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.fillStyle = penColor;
      ctx.font = 'italic 52px "Brush Script MT", "Caveat", "Dancing Script", cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName.trim(), offCanvas.width / 2, offCanvas.height / 2);

      const signatureDataUrl = offCanvas.toDataURL('image/png');
      try {
        localStorage.setItem('klarity_last_signature', signatureDataUrl);
      } catch {}
      onAdoptSignature(signatureDataUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--surface)] border border-[var(--line)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#1B4B91]/10 text-[#1B4B91]">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-[var(--ink)]">Add Signature</h3>
              <p className="text-xs text-[var(--muted)]">Sign documents securely and cleanly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[var(--line)] bg-[var(--surface-subtle)]">
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'draw'
                ? 'border-[#1B4B91] text-[#1B4B91] bg-[var(--surface)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Draw</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
              tab === 'type'
                ? 'border-[#1B4B91] text-[#1B4B91] bg-[var(--surface)]'
                : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Type</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          {tab === 'draw' ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                <span>Draw your signature below</span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]">Ink:</span>
                  <button
                    type="button"
                    onClick={() => setPenColor('#000000')}
                    className={`w-5 h-5 rounded-full bg-black border-2 ${penColor === '#000000' ? 'border-[#1B4B91] scale-110' : 'border-transparent'}`}
                    title="Black ink"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#1B4B91')}
                    className={`w-5 h-5 rounded-full bg-[#1B4B91] border-2 ${penColor === '#1B4B91' ? 'border-amber-400 scale-110' : 'border-transparent'}`}
                    title="Navy blue ink"
                  />
                  <button
                    type="button"
                    onClick={() => setPenColor('#047857')}
                    className={`w-5 h-5 rounded-full bg-emerald-700 border-2 ${penColor === '#047857' ? 'border-amber-400 scale-110' : 'border-transparent'}`}
                    title="Green ink"
                  />
                </div>
              </div>

              <div className="relative border-2 border-dashed border-[var(--line)] rounded-xl bg-white overflow-hidden shadow-inner cursor-crosshair">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] touch-none block"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 font-serif italic text-2xl select-none">
                    Sign on this line
                  </div>
                )}
                {/* Baseline Guide */}
                <div className="absolute left-6 right-6 bottom-8 border-b border-slate-200 pointer-events-none" />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs text-[var(--muted)] hover:text-rose-500 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear pad</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-[var(--muted)]">Type your full name:</label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] text-[var(--ink)] focus:outline-none focus:border-[#1B4B91]"
              />

              <div className="text-xs font-medium text-[var(--muted)] mt-1">Preview signature:</div>
              <div className="border border-[var(--line)] rounded-xl bg-white p-6 min-h-[140px] flex items-center justify-center shadow-inner overflow-hidden">
                {typedName.trim() ? (
                  <span
                    style={{
                      fontFamily: '"Brush Script MT", "Caveat", "Dancing Script", cursive',
                      color: penColor
                    }}
                    className="text-4xl italic select-none"
                  >
                    {typedName}
                  </span>
                ) : (
                  <span className="text-slate-300 italic text-xl">Type name above to preview</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdopt}
            disabled={tab === 'draw' ? !hasDrawn : !typedName.trim()}
          >
            <Check className="w-4 h-4 mr-1.5" />
            <span>Use Signature</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
