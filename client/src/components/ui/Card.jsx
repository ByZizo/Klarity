import React from 'react';

/**
 * Reusable Klarity Card component
 * Radius: 12px (--radius-card)
 */
export function Card({
  title,
  subtitle,
  action,
  children,
  padding = 'p-5',
  className = '',
  ...props
}) {
  return (
    <section
      className={`rounded-[12px] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink)] ${padding} ${className}`}
      {...props}
    >
      {(title || subtitle || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            {title && (
              <h3 className="font-serif-title text-[17px] font-semibold text-[var(--ink)] leading-snug">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[13px] font-medium text-[var(--muted)] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export default Card;
