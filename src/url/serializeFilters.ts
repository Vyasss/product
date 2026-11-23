import type { FilterState } from '../domain/filters';
import { FILTER_PARAM_KEYS } from './parseFilters';

const OWNED: ReadonlySet<string> = new Set(FILTER_PARAM_KEYS);

const encode = (value: string): string => encodeURIComponent(value);

/**
 * Canonical query string (without the leading "?"): owned params in a fixed order with
 * defaults omitted, then every foreign param (`mockFail`, `utm_*`, ...) in its original order.
 * Commas between categories stay literal, matching `?category=Apparel,Sports`.
 */
export function serializeFilters(filters: FilterState, current: URLSearchParams): string {
  const parts: string[] = [];

  if (filters.q !== '') parts.push(`q=${encode(filters.q)}`);
  if (filters.categories.length > 0) {
    parts.push(`category=${filters.categories.map(encode).join(',')}`);
  }
  if (filters.minPrice !== null) parts.push(`minPrice=${filters.minPrice}`);
  if (filters.maxPrice !== null) parts.push(`maxPrice=${filters.maxPrice}`);
  if (filters.inStock) parts.push('inStock=true');
  if (filters.sort !== null) parts.push(`sort=${filters.sort}`);

  current.forEach((value, key) => {
    if (!OWNED.has(key)) parts.push(`${encode(key)}=${encode(value)}`);
  });

  return parts.join('&');
}

/** Same as serializeFilters, with the leading "?" when non-empty (for `location.search`). */
export function toSearchString(filters: FilterState, current: URLSearchParams): string {
  const query = serializeFilters(filters, current);
  return query === '' ? '' : `?${query}`;
}
