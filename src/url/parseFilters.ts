import { MAX_QUERY_LENGTH, isSortKey, type FilterState } from '../domain/filters';
import { MAX_PAGE } from '../domain/pagination';
import { CATEGORIES, type Category } from '../domain/product';
import { ALL_ITEM_TYPES, findItemType, type ItemType } from '../domain/productType';

/** The query-string keys this app owns, in canonical order. Everything else is preserved. */
export const FILTER_PARAM_KEYS = ['q', 'category', 'type', 'minPrice', 'maxPrice', 'inStock', 'sort', 'page'] as const;

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

function parseTypes(raw: string | null): readonly ItemType[] {
  if (!raw) return [];
  const wanted = new Set<ItemType>();
  for (const part of raw.split(',')) {
    const type = findItemType(part);
    if (type) wanted.add(type);
  }
  return ALL_ITEM_TYPES.filter((type) => wanted.has(type));
}

function parsePrice(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

/**
 * Total: any input produces a valid FilterState and it never throws.
 * Unknown categories and types are dropped, an unknown sort becomes null, bad prices become null.
 */
export function parseFilters(params: URLSearchParams): FilterState {
  const sort = params.get('sort');
  return {
    q: sanitizeQuery(params.get('q') ?? ''),
    categories: parseCategories(params.get('category')),
    types: parseTypes(params.get('type')),
    minPrice: parsePrice(params.get('minPrice')),
    maxPrice: parsePrice(params.get('maxPrice')),
    inStock: params.get('inStock') === 'true',
    sort: sort !== null && isSortKey(sort) ? sort : null,
  };
}

/**
 * Result page, 1-based. Kept apart from FilterState: it is a position in the results, not a
 * filter. Total like parseFilters: anything but a whole number from 1 to MAX_PAGE is page 1.
 */
export function parsePage(params: URLSearchParams): number {
  const raw = params.get('page');
  if (raw === null || !/^\d{1,5}$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}
