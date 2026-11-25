import { useId, type ComponentPropsWithRef, type KeyboardEvent, type ReactNode } from 'react';

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'children'> {
  label: ReactNode;
}

/**
 * Native checkbox; the whole label row is the click and touch target (at least 44px tall).
 * Space toggles it as usual, and so does Enter: a native checkbox ignores Enter, but people
 * expect it to work on filters, and it has nothing else to do here.
 */
export function Checkbox({ label, id, className = '', onKeyDown, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.key !== 'Enter' || event.repeat) return;
    event.preventDefault();
    event.currentTarget.click();
  };
  return (
    <label
      htmlFor={inputId}
      className={`-mx-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 text-sm text-ink hover:bg-tint ${className}`}
    >
      <input
        id={inputId}
        type="checkbox"
        className="size-[1.125rem] shrink-0 accent-brand"
        onKeyDown={handleKeyDown}
        {...rest}
      />
      <span className="flex-1">{label}</span>
    </label>
  );
}
