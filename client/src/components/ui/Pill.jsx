import React from 'react';

/**
 * Reusable Klarity Pill component
 * Variants: 'neutral' | 'brand' | 'success' | 'warning' | 'danger'
 * Minimum text size: 13px, normal case, 8px radius
 */
export function Pill({
  variant = 'neutral',
  children,
  icon: Icon,
  className = ''
}) {
  const variantClasses = {
    neutral: 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--line)]',
    brand: 'bg-[var(--brand-soft)] text-[var(--brand)] border-[var(--line)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-line)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-line)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-line)]'
  }[variant] || 'bg-[var(--surface-subtle)] text-[var(--muted)] border-[var(--line)]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] border text-[13px] font-medium leading-snug ${variantClasses} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}

export default Pill;
