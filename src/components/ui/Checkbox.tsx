import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  label: ReactNode;
}

/** Native checkbox; the whole label row is the click and touch target (at least 44px tall). */
export function Checkbox({ label, id, className = '', ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label
      htmlFor={inputId}
      className={`-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-sm text-ink hover:bg-tint ${className}`}
    >
      <input id={inputId} type="checkbox" className="size-[1.125rem] shrink-0 accent-brand" {...rest} />
      <span className="flex-1">{label}</span>
    </label>
  );
}
