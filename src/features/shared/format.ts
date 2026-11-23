const PRICE_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const COUNT_FORMAT = new Intl.NumberFormat('en-IN');

/** "₹1,24,999": Indian digit grouping, no paise. The one price formatter in the app. */
export function formatPrice(value: number): string {
  return PRICE_FORMAT.format(value);
}

export interface PriceParts {
  /** "₹" */
  symbol: string;
  /** "1,24,999" */
  amount: string;
}

/**
 * The same formatting as `formatPrice`, split so the symbol can be styled smaller than the
 * amount, as shopping sites do. Derived from `formatToParts`, so grouping stays consistent.
 */
export function priceParts(value: number): PriceParts {
  let symbol = '';
  let amount = '';
  for (const part of PRICE_FORMAT.formatToParts(value)) {
    if (part.type === 'currency') symbol += part.value;
    else if (part.type !== 'literal') amount += part.value;
  }
  return { symbol, amount };
}

export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}

export function pluralizeProducts(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'product' : 'products'}`;
}

export function pluralizeResults(count: number): string {
  return `${formatCount(count)} ${count === 1 ? 'result' : 'results'}`;
}

export interface RelaxationLike {
  appliedQuery: string;
  originalQuery: string;
  corrections: readonly { from: string; to: string }[];
  ignored: readonly string[];
}

/**
 * Explains a relaxed search, e.g. `Showing results for “running shoes” (corrected from
 * “runing shoez”)` or `Showing results for “smart tv” — ignored: “xyz”`.
 */
export function relaxationNote(relaxed: RelaxationLike): string {
  let note = `Showing results for “${relaxed.appliedQuery}”`;
  if (relaxed.corrections.length > 0) {
    const from = relaxed.originalQuery
      .split(' ')
      .filter((token) => !relaxed.ignored.includes(token))
      .join(' ');
    note += ` (corrected from “${from}”)`;
  }
  if (relaxed.ignored.length > 0) note += ` — ignored: ${relaxed.ignored.map((t) => `“${t}”`).join(', ')}`;
  return note;
}
