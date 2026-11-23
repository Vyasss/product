import type { Category } from './product';

export const SORT_KEYS = ['price_asc', 'price_desc', 'rating_desc'] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  rating_desc: 'Rating: highest first',
};

export interface FilterState {
  /** Trimmed, at most MAX_QUERY_LENGTH characters. */
  q: string;
  /** Canonical CATEGORIES order, no duplicates. Empty means all categories. */
  categories: readonly Category[];
  minPrice: number | null;
  maxPrice: number | null;
  /** true = only in-stock products; false = all products. */
  inStock: boolean;
  /** null = dataset order. */
  sort: SortKey | null;
}

export type FilterPatch = Partial<FilterState>;

export const MAX_QUERY_LENGTH = 100;

export const DEFAULT_FILTERS: FilterState = Object.freeze({
  q: '',
  categories: Object.freeze([]),
  minPrice: null,
  maxPrice: null,
  inStock: false,
  sort: null,
});

const SORT_KEY_SET: ReadonlySet<string> = new Set(SORT_KEYS);

export function isSortKey(value: string): value is SortKey {
  return SORT_KEY_SET.has(value);
}

/**
 * Domain rule: an inverted range (min above max) is not applied as a filter;
 * the UI explains the problem instead of silently showing zero results.
 */
export function isPriceRangeInverted(
  filters: Pick<FilterState, 'minPrice' | 'maxPrice'>,
): boolean {
  return filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice;
}

/** True when any filter or the query differs from the defaults (sort is not a filter). */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.q !== '' ||
    filters.categories.length > 0 ||
    filters.minPrice !== null ||
    filters.maxPrice !== null ||
    filters.inStock
  );
}
