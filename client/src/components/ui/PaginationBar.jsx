import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

/**
 * Reusable accessible pagination bar that renders only when items exceed pageSize
 * or multiple page-size choices are enabled, keeping small lists clean while
 * protecting lower-memory devices from massive DOM trees.
 */
export function PaginationBar({
  totalItems = 0,
  pageSize = 50,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  itemLabel = 'items'
}) {
  const safePageSize = Math.max(1, Number(pageSize) || 50);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const safePage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);

  if (totalItems <= 25 && safePage === 1) return null;

  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endIdx = Math.min(totalItems, safePage * safePageSize);

  return (
    <div
      className="px-4 py-3 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex flex-wrap items-center justify-between gap-3 text-[13px]"
      role="navigation"
      aria-label="Pagination"
    >
      <div className="flex flex-wrap items-center gap-3 text-[var(--muted)] font-medium">
        <span>
          Showing <strong className="text-[var(--ink)]">{startIdx}–{endIdx}</strong> of{' '}
          <strong className="text-[var(--ink)]">{totalItems}</strong> {itemLabel}
        </span>
        {typeof onPageSizeChange === 'function' && totalItems > pageSizeOptions[0] && (
          <label className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              value={safePageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) || pageSizeOptions[0])}
              aria-label={`Items per page (${itemLabel})`}
              className="bg-[var(--surface)] border border-[var(--line)] rounded-[6px] px-2 py-1 text-[13px] font-medium text-[var(--ink)] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </Button>
          <span className="px-2 font-medium text-[var(--ink)] tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
