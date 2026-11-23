import type { ComponentPropsWithRef, ReactNode } from 'react';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'aria-label' | 'children'> {
  /** Required: an icon has no text, so the button needs an accessible name. */
  label: string;
  icon: ReactNode;
  tone?: 'light' | 'dark';
}

const TONES = {
  light: 'text-ink-muted hover:bg-tint hover:text-ink',
  dark: 'text-header-muted hover:bg-white/10 hover:text-white',
} as const;

/** Square, icon-only button with a 44px target and a required accessible name. */
export function IconButton({ label, icon, tone = 'light', className = '', type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-control transition-[color,background-color,border-color] ${TONES[tone]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
