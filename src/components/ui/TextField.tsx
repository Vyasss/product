import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'children'> {
  label: ReactNode;
  /** Shown under the field and linked with aria-describedby. */
  error?: ReactNode;
  /** Short text shown inside the field before the value, e.g. a currency symbol. */
  prefix?: string;
  labelClassName?: string;
}

const INPUT =
  'block min-h-11 w-full rounded-control border border-line-strong bg-card text-base text-ink ' +
  'placeholder:text-ink-muted hover:border-ink-muted aria-invalid:border-danger';

/** A labelled input. The label is always visible; errors are announced via aria-describedby. */
export function TextField({
  label,
  error,
  prefix,
  id,
  className = '',
  labelClassName = '',
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hasError = error !== undefined && error !== null && error !== false;

  return (
    <div className={className}>
      <label htmlFor={inputId} className={`mb-1 block text-xs font-semibold text-ink-muted ${labelClassName}`}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={`${INPUT} ${prefix ? 'pr-2 pl-7' : 'px-3'}`}
          {...(hasError ? { 'aria-invalid': true, 'aria-describedby': errorId } : {})}
          {...rest}
        />
      </div>
      {hasError && (
        <p id={errorId} className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
