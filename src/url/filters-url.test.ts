import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, type FilterState } from '../domain/filters';
import { parseFilters, parsePage, sanitizeQuery } from './parseFilters';
import { serializeFilters, toSearchString } from './serializeFilters';

const parse = (query: string) => parseFilters(new URLSearchParams(query));
const serialize = (filters: FilterState, current = '') => serializeFilters(filters, new URLSearchParams(current));

describe('parseFilters', () => {
  it('parses the example URL from the brief', () => {
    expect(parse('?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc')).toEqual({
      q: 'shoes',
      categories: ['Apparel', 'Sports'],
      types: [],
      minPrice: null,
      maxPrice: null,
      inStock: true,
      sort: 'price_asc',
    });
  });

  it('returns defaults for an empty query string', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it.each<[string, string, Partial<FilterState>]>([
    ['unknown categories are dropped', 'category=Toys,Books,,', { categories: ['Books'] }],
    ['categories are case-insensitive and canonicalised', 'category=sports,APPAREL', { categories: ['Apparel', 'Sports'] }],
    ['duplicate categories collapse', 'category=Books,Books', { categories: ['Books'] }],
    ['unknown sort becomes null', 'sort=popularity', { sort: null }],
    ['non-numeric price becomes null', 'minPrice=abc&maxPrice=', { minPrice: null, maxPrice: null }],
    ['negative price becomes null', 'minPrice=-5', { minPrice: null }],
    ['infinite price becomes null', 'maxPrice=Infinity', { maxPrice: null }],
    ['zero is a valid price', 'minPrice=0', { minPrice: 0 }],
    ['decimal prices are kept', 'maxPrice=99.5', { maxPrice: 99.5 }],
    ['inStock must be exactly "true"', 'inStock=1', { inStock: false }],
    ['q is trimmed', 'q=%20%20shoes%20%20', { q: 'shoes' }],
    ['q is capped at 100 characters', `q=${'a'.repeat(150)}`, { q: 'a'.repeat(100) }],
    ['repeated keys use the first value', 'sort=price_desc&sort=price_asc', { sort: 'price_desc' }],
  ])('%s', (_name, query, expected) => {
    expect(parse(query)).toEqual({ ...DEFAULT_FILTERS, ...expected });
  });

  it('never throws on hostile input', () => {
    for (const query of ['%', 'q=%E0%A4%A', 'category=%2C%2C', '&&&=', 'q=\u0000']) {
      expect(() => parse(query)).not.toThrow();
    }
  });
});

describe('serializeFilters', () => {
  it('omits defaults', () => {
    expect(serialize(DEFAULT_FILTERS)).toBe('');
  });

  it('writes the brief example in canonical order with literal commas', () => {
    const filters: FilterState = {
      ...DEFAULT_FILTERS,
      sort: 'price_asc',
      inStock: true,
      categories: ['Apparel', 'Sports'],
      q: 'shoes',
    };
    expect(serialize(filters)).toBe('q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc');
  });

  it('uses a fixed param order regardless of input order', () => {
    const filters: FilterState = {
      q: 'a',
      categories: ['Home'],
      types: [],
      minPrice: 10,
      maxPrice: 20,
      inStock: true,
      sort: 'rating_desc',
    };
    expect(serialize(filters)).toBe('q=a&category=Home&minPrice=10&maxPrice=20&inStock=true&sort=rating_desc');
  });

  it('preserves foreign params after the owned ones', () => {
    expect(serialize({ ...DEFAULT_FILTERS, q: 'x' }, '?utm_source=mail&q=old&mockFail=2')).toBe(
      'q=x&utm_source=mail&mockFail=2',
    );
  });

  it('removes owned params that went back to defaults but keeps foreign ones', () => {
    expect(serialize(DEFAULT_FILTERS, '?sort=price_asc&mockFail=1')).toBe('mockFail=1');
  });

  it('encodes special characters in q', () => {
    expect(serialize({ ...DEFAULT_FILTERS, q: 'salt & pepper+co' })).toBe('q=salt%20%26%20pepper%2Bco');
  });

  it('toSearchString adds "?" only when there is something to write', () => {
    expect(toSearchString(DEFAULT_FILTERS, new URLSearchParams())).toBe('');
    expect(toSearchString({ ...DEFAULT_FILTERS, inStock: true }, new URLSearchParams())).toBe('?inStock=true');
  });
});

describe('round trip', () => {
  it.each<[string, FilterState]>([
    ['defaults', DEFAULT_FILTERS],
    ['everything set', { q: 'running shoes', categories: ['Electronics', 'Books'], types: ['Laptop', 'Novel'], minPrice: 0, maxPrice: 4999.5, inStock: true, sort: 'price_desc' }],
    ['ampersand and plus', { ...DEFAULT_FILTERS, q: 'salt & pepper + more' }],
    ['Devanagari', { ...DEFAULT_FILTERS, q: 'जूते किताब' }],
    ['accents and quotes', { ...DEFAULT_FILTERS, q: 'café "élan" 100%' }],
    ['commas inside q', { ...DEFAULT_FILTERS, q: 'a,b', categories: ['Apparel', 'Sports'] }],
    ['inverted price range is kept as-is', { ...DEFAULT_FILTERS, minPrice: 500, maxPrice: 100 }],
  ])('parse(serialize(x)) equals x: %s', (_name, filters) => {
    expect(parse(serialize(filters))).toEqual(filters);
  });

  it('serialising a parsed canonical URL gives the same URL', () => {
    const canonical = 'q=shoes&category=Apparel,Sports&minPrice=100&inStock=true&sort=price_asc&utm_source=x';
    expect(serialize(parse(canonical), canonical)).toBe(canonical);
  });
});

describe('sanitizeQuery', () => {
  it('trims after capping so no trailing space survives', () => {
    expect(sanitizeQuery(`${'a'.repeat(99)} b`)).toBe('a'.repeat(99));
  });
});

describe('page', () => {
  const page = (query: string) => parsePage(new URLSearchParams(query));

  it.each([
    ['', 1],
    ['page=2', 2],
    ['page=84', 84],
    ['page=0', 1],
    ['page=-3', 1],
    ['page=2.5', 1],
    ['page=abc', 1],
    ['page=%202', 1],
    ['page=99999999', 1],
  ])('parsePage(%j) is %i', (query, expected) => {
    expect(page(query)).toBe(expected);
  });

  it('is written after sort and before foreign params, and omitted on page 1', () => {
    const filters: FilterState = { ...DEFAULT_FILTERS, q: 'shoes', sort: 'price_asc' };
    expect(serializeFilters(filters, new URLSearchParams('mockFail=1'), 3)).toBe('q=shoes&sort=price_asc&page=3&mockFail=1');
    expect(serializeFilters(filters, new URLSearchParams('page=3'), 1)).toBe('q=shoes&sort=price_asc');
  });

  it('is not part of the filters', () => {
    expect(parse('q=shoes&page=4')).toEqual({ ...DEFAULT_FILTERS, q: 'shoes' });
  });
});
