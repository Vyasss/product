import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

export interface TextAreaFieldProps extends Omit<ComponentPropsWithRef<'textarea'>, 'children'> {
  label: ReactNode;
  /** Shown under the field and linked with aria-describedby. */
  error?: ReactNode;
  hint?: ReactNode;
}

/** Labelled multi-line input; same conventions as TextField. */
export function TextAreaField({ label, error, hint, id, className = '', ...rest }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hasError = error !== undefined && error !== null && error !== false;
  const describedBy = [hint ? `${fieldId}-hint` : '', hasError ? `${fieldId}-error` : ''].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-semibold text-ink-muted">
        {label}
      </label>
      {hint && (
        <p id={`${fieldId}-hint`} className="mb-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      <textarea
        id={fieldId}
        rows={3}
        className="block w-full rounded-control border border-line-strong bg-card px-3 py-2 text-base text-ink hover:border-ink-muted aria-invalid:border-danger"
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        {...(hasError ? { 'aria-invalid': true } : {})}
        {...rest}
      />
      {hasError && (
        <p id={`${fieldId}-error`} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
