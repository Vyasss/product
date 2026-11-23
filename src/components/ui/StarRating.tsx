import { useId } from 'react';

export interface StarRatingProps {
  value: number;
  max?: number;
  /** Show the numeric value (one decimal) after the stars. */
  showValue?: boolean;
  /** Number of reviews shown as "(1,284)"; omit to hide. */
  reviewCount?: number;
  className?: string;
}

/**
 * Fill fraction (0 to 1) for each star, filled to the decimal: 4.3 of 5 gives
 * [1, 1, 1, 1, 0.3]. Values are clamped to [0, max] and rounded to two decimals so
 * floating-point noise (4.3 - 4 = 0.2999...) does not leak into the widths.
 */
export function starFills(value: number, max = 5): number[] {
  const safe = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
  return Array.from({ length: max }, (_, i) => Math.round(Math.min(1, Math.max(0, safe - i)) * 100) / 100);
}

const STAR = 24; // STAR_PATH is drawn in a 24-unit box
const GAP = 3;
const offset = (i: number) => i * (STAR + GAP);

/** The star outline translated by `x` (STAR_PATH's absolute commands shifted; relative ones kept). */
export const starAt = (x: number) =>
  `M${12 + x} 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L${12 + x} 17.5l-5.87 3.08 1.12-6.54L${2.5 + x} 9.41l6.56-.95L${12 + x} 2.5z`;
const rowPath = (count: number) => Array.from({ length: count }, (_, i) => starAt(offset(i))).join('');

/**
 * Width of the filled area. Filled stars are always contiguous from the left (full stars, then
 * one partial), so one clip rectangle reproduces the per-star fills exactly; the gaps between
 * stars contain no path, so covering them changes nothing.
 */
export function filledWidth(fills: readonly number[]): number {
  let width = 0;
  fills.forEach((fill, i) => {
    if (fill > 0) width = offset(i) + STAR * fill;
  });
  return width;
}

/**
 * All stars in one small SVG: one path for the empty stars, one for the filled stars clipped to
 * the filled width. About 6 nodes per card instead of 18, which keeps mounting cards cheap
 * while scrolling.
 */
function Stars({ fills }: { fills: readonly number[] }) {
  const clipId = useId();
  const width = fills.length * STAR + (fills.length - 1) * GAP;
  const path = rowPath(fills.length);
  return (
    <svg
      viewBox={`0 0 ${width} ${STAR}`}
      width={(width / STAR) * 16}
      height={16}
      aria-hidden="true"
      focusable="false"
    >
      <clipPath id={clipId}>
        <rect x={0} y={0} width={filledWidth(fills)} height={STAR} />
      </clipPath>
      <path d={path} className="fill-star-empty" />
      <path d={path} className="fill-star" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

const COUNT_FORMAT = new Intl.NumberFormat('en-IN');

/** Screen-reader sentence, e.g. "Rated 4.3 out of 5 from 1,284 reviews". */
export function ratingLabel(value: number, max = 5, reviewCount?: number): string {
  const base = `Rated ${value.toFixed(1)} out of ${max}`;
  if (reviewCount === undefined) return base;
  if (reviewCount === 0) return `${base}, no reviews yet`;
  return `${base} from ${COUNT_FORMAT.format(reviewCount)} ${reviewCount === 1 ? 'review' : 'reviews'}`;
}

/**
 * Visual star rating. Screen readers get one plain sentence ("Rated 4.3 out of 5 from 1,284
 * reviews"); the stars, number and count are hidden from them to avoid reading it twice.
 */
export function StarRating({ value, max = 5, showValue = true, reviewCount, className = '' }: StarRatingProps) {
  const text = value.toFixed(1);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Stars fills={starFills(value, max)} />
      {showValue && (
        <span aria-hidden="true" className="text-sm font-medium text-ink-muted tabular-nums">
          {text}
        </span>
      )}
      {reviewCount !== undefined && (
        <span aria-hidden="true" className="text-sm text-ink-muted tabular-nums">
          ({COUNT_FORMAT.format(reviewCount)})
        </span>
      )}
      <span className="sr-only">{ratingLabel(value, max, reviewCount)}</span>
    </span>
  );
}
