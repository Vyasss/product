import { formatPrice, priceParts } from './format';

export interface PriceProps {
  value: number;
  size?: 'md' | 'lg';
  className?: string;
}

/**
 * Storefront price: a raised, smaller rupee symbol before a large amount. Screen readers get
 * the plain formatted price once; the styled parts are hidden from them.
 */
export function Price({ value, size = 'md', className = '' }: PriceProps) {
  const { symbol, amount } = priceParts(value);
  return (
    <p className={`text-ink ${className}`}>
      <span className="sr-only">{formatPrice(value)}</span>
      <span aria-hidden="true" className="inline-flex items-start leading-none">
        <span className={`mt-0.5 mr-0.5 font-semibold ${size === 'lg' ? 'text-lg' : 'text-sm'}`}>{symbol}</span>
        <span className={`font-bold tracking-tight tabular-nums ${size === 'lg' ? 'text-4xl' : 'text-2xl'}`}>{amount}</span>
      </span>
    </p>
  );
}
