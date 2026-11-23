import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'brand';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-card/90 text-ink-muted ring-1 ring-line',
  brand: 'bg-brand-soft text-brand-ink',
};

/** Small non-interactive label, e.g. a product category. */
export function Badge({ children, tone = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
