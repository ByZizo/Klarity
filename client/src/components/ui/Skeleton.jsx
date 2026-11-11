import React from 'react';

/**
 * Reusable Klarity Skeleton component for loading states
 */
export function Skeleton({
  rows = 3,
  height = 'h-12',
  className = ''
}) {
  if (rows === 1) {
    return (
      <div
        aria-hidden="true"
        className={`w-full ${height} rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)] ${className}`}
      />
    );
  }

  return (
    <div aria-busy="true" aria-label="Loading content" className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className={`w-full ${height} rounded-[8px] bg-[var(--surface-subtle)] border border-[var(--line)]`}
        />
      ))}
    </div>
  );
}

export default Skeleton;
