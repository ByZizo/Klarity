import React from 'react';

/**
 * Reusable Klarity Button component
 * Variants: 'primary' | 'secondary' | 'ghost' | 'danger'
 * Radius: 8px (--radius-control)
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  children,
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-[13px] min-h-[34px]',
    md: 'px-4 py-2 text-[15px] min-h-[40px]',
    lg: 'px-5 py-2.5 text-[15px] min-h-[44px]'
  }[size] || 'px-4 py-2 text-[15px] min-h-[40px]';

  const variantStyles = {
    primary:
      'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white border border-transparent font-medium',
    secondary:
      'bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--ink)] border border-[var(--line)] font-medium',
    ghost:
      'bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--ink)] border border-transparent font-medium',
    danger:
      'bg-[var(--danger)] hover:opacity-90 text-white border border-transparent font-medium'
  }[variant] || 'bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white border border-transparent font-medium';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[8px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${sizeClasses} ${variantStyles} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />}
      {loading ? <span>Working...</span> : children}
    </button>
  );
}

export default Button;
