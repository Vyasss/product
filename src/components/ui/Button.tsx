import type { ComponentPropsWithRef } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
}

const BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold ' +
  'transition-[color,background-color,border-color] disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-70';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white shadow-card hover:bg-brand-strong',
  accent: 'bg-accent text-ink shadow-card hover:bg-accent-strong',
  secondary: 'border border-line-strong bg-card text-ink hover:border-brand hover:bg-brand-soft',
  ghost: 'text-brand-ink underline-offset-4 hover:bg-brand-soft hover:underline',
};

/** Button styling for elements that must stay links (navigation) but look like buttons. */
export function buttonClassName(variant: ButtonVariant = 'secondary', className = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${className}`;
}

/** Native button with a 44px minimum target. Defaults to type="button" (no accidental submits). */
export function Button({ variant = 'secondary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...rest} />;
}
