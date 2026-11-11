import React from 'react';
import { Button } from './Button';

/**
 * Reusable Klarity EmptyState component
 * Displays a clear message and one primary action button
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className = ''
}) {
  return (
    <div
      className={`rounded-[12px] bg-[var(--surface)] border border-[var(--line)] p-6 text-center flex flex-col items-center justify-center gap-3 ${className}`}
    >
      {Icon && (
        <div className="w-10 h-10 rounded-[8px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
      )}
      {title && (
        <h4 className="font-serif-title text-[17px] font-semibold text-[var(--ink)]">
          {title}
        </h4>
      )}
      {message && (
        <p className="text-[15px] font-medium text-[var(--muted)] max-w-md">
          {message}
        </p>
      )}
      {actionLabel && onAction && (
        <div className="mt-1">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default EmptyState;
