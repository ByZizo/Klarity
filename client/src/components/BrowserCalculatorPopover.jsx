import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Delete, RotateCcw, GripHorizontal, X } from 'lucide-react';
import { evaluateExpression } from '../utils/calculatorParser.js';

const STORAGE_KEY = 'klarity_browser_calc_history';

function loadCalcHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function BrowserCalculatorPopover({
  onClose,
  floating = false,
  position = null,
  width = 320,
  isDragging = false,
  isResizing = false,
  onDragStart,
  onResizeStart,
  cardRef
}) {
  const [expression, setExpression] = useState('');
  const [displayResult, setDisplayResult] = useState('0');
  const [errorMsg, setErrorMsg] = useState('');
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState(loadCalcHistory);
  const localRef = useRef(null);
  const setContainerRef = (el) => {
    localRef.current = el;
    if (cardRef) cardRef.current = el;
  };
  const containerRef = localRef;

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 6)));
    } catch {}
  }, [history]);

  const appendToken = (token) => {
    const isOperator = ['+', '-', '×', '÷', '*', '/'].includes(token);
    setErrorMsg('');

    setExpression((prev) => {
      let base = prev;
      if (justEvaluated) {
        if (isOperator || token === '%') {
          base = displayResult && !errorMsg ? displayResult : '';
        } else {
          base = '';
        }
        setJustEvaluated(false);
      }

      // Prevent duplicate consecutive binary operators (allow unary minus after open paren or operator)
      const visualToken = token === '*' ? '×' : token === '/' ? '÷' : token === '-' ? '−' : token;
      return base + visualToken;
    });
  };

  const handleClear = () => {
    setExpression('');
    setDisplayResult('0');
    setErrorMsg('');
    setJustEvaluated(false);
  };

  const handleBackspace = () => {
    setErrorMsg('');
    if (justEvaluated) {
      setJustEvaluated(false);
    }
    setExpression((prev) => prev.slice(0, -1));
  };

  const handleEvaluate = () => {
    const targetExpr = expression.trim();
    if (!targetExpr) return;

    const res = evaluateExpression(targetExpr);
    if (res.ok) {
      setDisplayResult(res.formatted);
      setErrorMsg('');
      setJustEvaluated(true);
      setHistory((prev) => {
        const entry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          expr: targetExpr,
          result: res.formatted
        };
        return [entry, ...prev.filter((h) => !(h.expr === entry.expr && h.result === entry.result))].slice(0, 6);
      });
    } else {
      setErrorMsg(res.error);
      setJustEvaluated(false);
    }
  };

  const handleCopyResult = () => {
    const textToCopy = errorMsg ? '' : displayResult || '0';
    if (!textToCopy) return;
    try {
      navigator.clipboard?.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const handleReuseHistory = (item) => {
    if (!item?.result) return;
    setErrorMsg('');
    setDisplayResult(item.result);
    setExpression((prev) => {
      if (!prev || justEvaluated) {
        setJustEvaluated(false);
        return item.result;
      }
      const lastChar = prev.slice(-1);
      if (['+', '−', '-', '×', '*', '÷', '/', '('].includes(lastChar)) {
        return prev + item.result;
      }
      setJustEvaluated(false);
      return item.result;
    });
  };

  // Global keyboard handler while calculator is open (ignores typing inside inputs/textareas)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const activeEl = document.activeElement;
      const activeTag = activeEl?.tagName;
      const isEditingOtherField =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        activeTag === 'SELECT' ||
        activeEl?.isContentEditable;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose && onClose();
        return;
      }

      if (isEditingOtherField) return;

      const insideKeypadBtn = activeTag === 'BUTTON' && containerRef.current?.contains(activeEl);

      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        if (insideKeypadBtn && e.key === 'Enter') {
          const btnAction = activeEl.getAttribute('data-calc-key');
          if (btnAction === '=') {
            handleEvaluate();
            return;
          }
        }
        handleEvaluate();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }

      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClear();
        return;
      }

      if (/^[0-9.()+\-*/%]$/.test(e.key)) {
        e.preventDefault();
        appendToken(e.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Live preview of valid partial result when typing (before pressing =)
  const livePreview = React.useMemo(() => {
    if (!expression.trim() || justEvaluated) return null;
    const res = evaluateExpression(expression);
    return res.ok ? res.formatted : null;
  }, [expression, justEvaluated]);

  const scale = floating ? Math.max(0.875, Math.min(1.75, Number(width || 320) / 320)) : 1;
  const scaledBtnHeight = Math.round(40 * scale);
  const scaledBtnFont = Math.round(14 * scale);
  const scaledPad = Math.round(14 * scale);
  const scaledGap = Math.round(10 * scale);
  const scaledGridGap = Math.round(6 * scale);
  const scaledExprFont = Math.round(12 * scale);
  const scaledResultFont = Math.round(20 * scale);
  const scaledHistoryMaxH = Math.round(144 * scale);

  const keypadBtnClass =
    'rounded-lg font-semibold border border-[var(--line)] transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[var(--brand)] focus-visible:outline-offset-2';

  const wrapperClass = floating
    ? `absolute z-40 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col outline-none select-none transition-shadow ${
        isDragging || isResizing ? 'ring-2 ring-[var(--brand)]/50' : ''
      }`
    : 'absolute right-0 top-full mt-2 w-80 bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col outline-none select-none';

  const floatingStyle = floating
    ? {
        width: `${Math.round(width || 320)}px`,
        ...(position ? { left: `${position.x}px`, top: `${position.y}px` } : { right: '16px', top: '16px' })
      }
    : undefined;

  return (
    <aside
      ref={setContainerRef}
      tabIndex={-1}
      role="dialog"
      aria-label="Calculator"
      style={floatingStyle}
      className={wrapperClass}
    >
      {/* Draggable Header Bar */}
      <div
        onMouseDown={floating ? onDragStart : undefined}
        title={floating ? 'Click and drag to move calculator anywhere' : undefined}
        className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--line)] bg-[var(--surface-subtle)]/70 select-none shrink-0 ${
          floating ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <div className="flex items-center gap-1.5">
          {floating && <GripHorizontal className="w-4 h-4 text-[var(--muted)]" />}
          <span className="text-xs font-semibold text-[var(--ink)]">Calculator</span>
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          title="Close calculator (Esc)"
          aria-label="Close calculator"
          className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        style={{ padding: `${scaledPad}px`, gap: `${scaledGap}px` }}
        className="flex flex-col relative"
      >
      {/* Display */}
      <div
        style={{ padding: `${Math.round(12 * scale)}px` }}
        className="rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] flex flex-col gap-1"
      >
        <div
          style={{ fontSize: `${scaledExprFont}px`, minHeight: `${Math.round(18 * scale)}px` }}
          className="font-medium text-[var(--muted)] text-right break-all"
          aria-label="Expression"
        >
          {expression || '0'}
        </div>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleCopyResult}
            disabled={Boolean(errorMsg)}
            title="Copy result"
            aria-label="Copy result"
            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-[var(--surface)] hover:bg-[var(--surface-hover)] disabled:opacity-40 border border-[var(--line)] text-[var(--ink)] flex items-center gap-1 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[var(--muted)]" />
                <span>Copy result</span>
              </>
            )}
          </button>

          <div
            aria-live="polite"
            style={!errorMsg ? { fontSize: `${scaledResultFont}px` } : undefined}
            className={`text-right font-semibold truncate ${
              errorMsg
                ? 'text-xs text-[var(--danger)]'
                : 'text-[var(--ink)] tabular-nums'
            }`}
          >
            {errorMsg ? errorMsg : justEvaluated ? displayResult : livePreview ?? displayResult}
          </div>
        </div>
      </div>

      {/* Keypad: C, backspace, %, ÷, 7-9 ×, 4-6 −, 1-3 +, 0 . = */}
      <div
        style={{
          gap: `${scaledGridGap}px`,
          '--calc-btn-h': `${scaledBtnHeight}px`,
          '--calc-btn-fs': `${scaledBtnFont}px`
        }}
        className="grid grid-cols-4 [&_button]:h-[var(--calc-btn-h)] [&_button]:text-[length:var(--calc-btn-fs)]"
      >
        <button
          type="button"
          data-calc-key="C"
          onClick={handleClear}
          aria-label="Clear"
          title="Clear (C)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          C
        </button>
        <button
          type="button"
          data-calc-key="Backspace"
          onClick={handleBackspace}
          aria-label="Backspace"
          title="Backspace"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-calc-key="%"
          onClick={() => appendToken('%')}
          aria-label="Percent"
          title="Percent (%)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          %
        </button>
        <button
          type="button"
          data-calc-key="/"
          onClick={() => appendToken('/')}
          aria-label="Divide"
          title="Divide (/)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          ÷
        </button>

        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            data-calc-key={d}
            onClick={() => appendToken(d)}
            className={`${keypadBtnClass} bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          data-calc-key="*"
          onClick={() => appendToken('*')}
          aria-label="Multiply"
          title="Multiply (*)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          ×
        </button>

        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            data-calc-key={d}
            onClick={() => appendToken(d)}
            className={`${keypadBtnClass} bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          data-calc-key="-"
          onClick={() => appendToken('-')}
          aria-label="Minus"
          title="Minus (-)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          −
        </button>

        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            data-calc-key={d}
            onClick={() => appendToken(d)}
            className={`${keypadBtnClass} bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          data-calc-key="+"
          onClick={() => appendToken('+')}
          aria-label="Plus"
          title="Plus (+)"
          className={`${keypadBtnClass} bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          +
        </button>

        <button
          type="button"
          data-calc-key="0"
          onClick={() => appendToken('0')}
          className={`${keypadBtnClass} col-span-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          0
        </button>
        <button
          type="button"
          data-calc-key="."
          onClick={() => appendToken('.')}
          aria-label="Decimal point"
          className={`${keypadBtnClass} bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--ink)]`}
        >
          .
        </button>
        <button
          type="button"
          data-calc-key="="
          onClick={handleEvaluate}
          aria-label="Equals"
          title="Evaluate (= or Enter)"
          className={`${keypadBtnClass} bg-[var(--brand)] hover:bg-[var(--brand-hover)] border-[var(--brand)] text-white`}
        >
          =
        </button>
      </div>

      {/* History (last 6 calculations) */}
      <div className="pt-2 border-t border-[var(--line)] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
          <span>History</span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              title="Clear calculation history"
              aria-label="Clear calculation history"
              className="hover:text-[var(--ink)] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="text-[11px] text-[var(--muted)] py-1 pr-4">
            Recent calculations appear here. Click one to reuse its result.
          </div>
        ) : (
          <div
            style={{ maxHeight: `${scaledHistoryMaxH}px` }}
            className="flex flex-col gap-1 overflow-y-auto"
          >
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleReuseHistory(item)}
                title={`Reuse ${item.result}`}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--line)] text-left flex items-center justify-between gap-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
              >
                <span className="text-[11px] text-[var(--muted)] truncate">{item.expr}</span>
                <span className="text-xs font-semibold text-[var(--ink)] tabular-nums shrink-0">
                  = {item.result}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {floating && onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center text-[var(--muted)] hover:text-[var(--brand)] transition-colors z-20 select-none group/resize"
          title="Click and drag to resize calculator"
          aria-label="Resize calculator"
        >
          <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 stroke-current fill-none stroke-2 opacity-60 group-hover/resize:opacity-100">
            <path d="M14 14H10M14 14V10M14 8L8 14M14 3L3 14" strokeLinecap="round" />
          </svg>
        </div>
      )}
      </div>
    </aside>
  );
}
