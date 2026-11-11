import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

/**
 * Reusable Klarity ConfirmDialog component
 * Replaces all native browser confirm dialogs calls with an accessible in-app modal
 */
export function ConfirmDialog({
  open,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="klarity-confirm-title"
      className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onCancel) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-[12px] bg-[var(--surface)] border border-[var(--line)] p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 ${
              variant === 'danger'
                ? 'bg-[var(--danger-soft)] text-[var(--danger)]'
                : 'bg-[var(--brand-soft)] text-[var(--brand)]'
            }`}
          >
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="klarity-confirm-title"
              className="font-serif-title text-[18px] font-semibold text-[var(--ink)]"
            >
              {title}
            </h3>
            {message && (
              <p className="text-[15px] font-medium text-[var(--muted)] mt-1.5 leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
