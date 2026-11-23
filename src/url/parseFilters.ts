import { MAX_QUERY_LENGTH, isSortKey, type FilterState } from '../domain/filters';
import { CATEGORIES, type Category } from '../domain/product';

/** The query-string keys this app owns, in canonical order. Everything else is preserved. */
export const FILTER_PARAM_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'inStock', 'sort'] as const;

const CATEGORY_BY_LOWERCASE: ReadonlyMap<string, Category> = new Map(
  CATEGORIES.map((category) => [category.toLowerCase(), category]),
);

/** Trim and cap a query. Shared by the URL codec and the live search box. */
export function sanitizeQuery(raw: string): string {
  return raw.trim().slice(0, MAX_QUERY_LENGTH).trim();
}

function parseCategories(raw: string | null): readonly Category[] {
  if (!raw) return [];
  const wanted = new Set<Category>();
  for (const part of raw.split(',')) {
    const category = CATEGORY_BY_LOWERCASE.get(part.trim().toLowerCase());
    if (category) wanted.add(category);
  }
  return CATEGORIES.filter((category) => wanted.has(category));
}

function parsePrice(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Total: any input produces a valid FilterState and it never throws.
 * Unknown categories are dropped, an unknown sort becomes null, bad prices become null.
 */
export function parseFilters(params: URLSearchParams): FilterState {
  const sort = params.get('sort');
  return {
    q: sanitizeQuery(params.get('q') ?? ''),
    categories: parseCategories(params.get('category')),
    minPrice: parsePrice(params.get('minPrice')),
    maxPrice: parsePrice(params.get('maxPrice')),
    inStock: params.get('inStock') === 'true',
    sort: sort !== null && isSortKey(sort) ? sort : null,
  };
}
