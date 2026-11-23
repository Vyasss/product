import type { ComponentPropsWithRef } from 'react';

export type CardProps = ComponentPropsWithRef<'div'>;

const BASE = 'rounded-card border border-line bg-card shadow-card';

/**
 * The one surface style for cards, panels and state messages. Deliberately no hover effect:
 * product cards are not clickable, so nothing should suggest that they are.
 */
export function Card({ className = '', ...rest }: CardProps) {
  return <div className={`${BASE} ${className}`} {...rest} />;
}
