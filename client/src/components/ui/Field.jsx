import React, { useId } from 'react';

/**
 * Reusable Klarity Field component
 * Includes visible label (min 13px), input/select/textarea or custom children, helper text, and error
 */
export function Field({
  label,
  id,
  helperText,
  error,
  as = 'input',
  children,
  className = '',
  inputClassName = '',
  required = false,
  ...props
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  const baseControlClasses = `w-full rounded-[8px] bg-[var(--surface)] border ${
    error ? 'border-[var(--danger)]' : 'border-[var(--line)]'
  } px-3 py-2 text-[15px] font-medium text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] transition-colors ${inputClassName}`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="text-[13px] font-medium text-[var(--ink)] flex items-center gap-1"
        >
          <span>{label}</span>
          {required && <span className="text-[var(--danger)]" aria-hidden="true">*</span>}
        </label>
      )}

      {children ? (
        children
      ) : as === 'select' ? (
        <select
          id={fieldId}
          aria-describedby={errorId || helperId}
          aria-invalid={Boolean(error)}
          required={required}
          className={baseControlClasses}
          {...props}
        />
      ) : as === 'textarea' ? (
        <textarea
          id={fieldId}
          aria-describedby={errorId || helperId}
          aria-invalid={Boolean(error)}
          required={required}
          className={baseControlClasses}
          {...props}
        />
      ) : (
        <input
          id={fieldId}
          aria-describedby={errorId || helperId}
          aria-invalid={Boolean(error)}
          required={required}
          className={baseControlClasses}
          {...props}
        />
      )}

      {error ? (
        <p id={errorId} className="text-[13px] font-medium text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[13px] font-medium text-[var(--muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Field;
