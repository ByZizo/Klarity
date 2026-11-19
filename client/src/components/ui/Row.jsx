import React from 'react';

/**
 * Reusable Klarity Row component
 * Layout: label left, value right, optional muted detail
 */
export function Row({
  label,
  detail,
  value,
  icon: Icon,
  actions,
  onClick,
  className = '',
  valueClassName = ''
}) {
  const InteractiveWrapper = onClick ? 'button' : 'div';
  return (
    <InteractiveWrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex flex-wrap items-center justify-between gap-3 py-3 border-b border-[var(--line)] last:border-b-0 text-left ${
        onClick ? 'hover:bg-[var(--surface-subtle)] px-2 rounded-[8px] cursor-pointer transition-colors' : ''
      } ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="w-9 h-9 rounded-[8px] bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0 mt-0.5">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-[var(--ink)] break-words">
            {label}
          </div>
          {detail && (
            <div className="text-[13px] font-medium text-[var(--muted)] mt-0.5 break-words">
              {detail}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {value !== undefined && value !== null && (
          <div className={`text-[15px] font-semibold text-[var(--ink)] text-right ${valueClassName}`}>
            {value}
          </div>
        )}
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
    </InteractiveWrapper>
  );
}

export default Row;
