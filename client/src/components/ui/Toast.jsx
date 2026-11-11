import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * Reusable Klarity Toast component
 * Variants: 'success' | 'error'
 * Auto-dismisses after durationMs (default 4000ms)
 */
export function Toast({
  toast,
  onDismiss,
  durationMs = 4000
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      if (onDismiss) onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const isObj = typeof toast === 'object' && toast !== null;
  const message = isObj ? toast.message : String(toast);
  const type = isObj && toast.type === 'error' ? 'error' : 'success';

  const isError = type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 min-[760px]:bottom-6 right-4 z-[90] max-w-[calc(100vw-2rem)] sm:max-w-md"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border shadow-lg ${
          isError
            ? 'bg-[var(--danger-soft)] border-[var(--danger-line)] text-[var(--danger)]'
            : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink)]'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0" aria-hidden="true" />
        )}
        <span className="text-[15px] font-medium flex-1 break-words">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="p-1 rounded-[8px] hover:bg-[var(--surface-subtle)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default Toast;
