import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { ChevronDownIcon } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<'select'>, 'children'> {
  label: ReactNode;
  options: readonly SelectOption[];
}

/** Native select with a visible label: free keyboard and screen-reader support. */
export function Select({ label, options, id, className = '', ...rest }: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor={selectId} className="text-sm font-medium whitespace-nowrap text-ink-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className="min-h-11 appearance-none rounded-control border border-line-strong bg-card py-0 pr-9 pl-3 text-sm font-medium text-ink hover:border-ink-muted"
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-muted" />
      </div>
    </div>
  );
}
