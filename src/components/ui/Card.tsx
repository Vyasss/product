import type { ComponentPropsWithRef } from 'react';

export type CardProps = ComponentPropsWithRef<'div'>;

const BASE = 'rounded-card border border-line bg-card shadow-card';

/**
 * The one surface style for cards, panels and state messages. No hover effect here: only
 * product cards, which are links, add one (see ProductCard).
 */
export function Card({ className = '', ...rest }: CardProps) {
  return <div className={`${BASE} ${className}`} {...rest} />;
}
