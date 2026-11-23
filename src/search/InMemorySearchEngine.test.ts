import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, type FilterState } from '../domain/filters';
import { FIXTURE_PRODUCTS, makeProduct } from '../test/fixtures';
import { InMemorySearchEngine } from './InMemorySearchEngine';
import { normalize, tokenize } from './normalize';

const engine = new InMemorySearchEngine(FIXTURE_PRODUCTS);
const ALL_IDS = FIXTURE_PRODUCTS.map((p) => p.id);

function ids(patch: Partial<FilterState>): string[] {
  const result = engine.search({ ...DEFAULT_FILTERS, ...patch });
  return result.indices.map((i) => FIXTURE_PRODUCTS[i]?.id ?? '?');
}

describe('normalize', () => {
  it.each([
    ['  Running   SHOES ', 'running shoes'],
    ['Élan', 'elan'],
    ['Café Living', 'cafe living'],
    ['ＳＨＯＥＳ', 'shoes'],
  ])('normalize(%j) = %j', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it('keeps Devanagari vowel signs (does not strip every combining mark)', () => {
    expect(normalize('जूते')).toContain('ू');
    expect(normalize('किताब')).toBe('किताब'.normalize('NFKD'));
  });

  it('tokenizes on whitespace and drops empties', () => {
    expect(tokenize('  a  b ')).toEqual(['a', 'b']);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('InMemorySearchEngine filters', () => {
  it.each<[string, Partial<FilterState>, string[]]>([
    ['no filters returns everything in dataset order', {}, ALL_IDS],
    ['query matches title', { q: 'shoes' }, ['p-1', 'p-2']],
    ['query matches brand', { q: 'voltix' }, ['p-4']],
    ['query is case-insensitive', { q: 'SHOES' }, ['p-1', 'p-2']],
    ['query matches substrings', { q: 'earb' }, ['p-4']],
    ['multi-word query requires every token', { q: 'running shoes' }, ['p-1']],
    ['multi-word query across title and brand', { q: 'shoes stridex' }, ['p-1']],
    ['multi-word query with no common match', { q: 'shoes voltix' }, []],
    ['accent-insensitive: plain query finds accented brand', { q: 'elan' }, ['p-2']],
    ['accent-insensitive: accented query finds brand', { q: 'cafè' }, ['p-6']],
    ['alias: joote finds shoes and sneakers', { q: 'joote' }, ['p-1', 'p-2', 'p-11']],
    ['alias: Devanagari जूते finds shoes', { q: 'जूते' }, ['p-1', 'p-2', 'p-11']],
    ['alias: jute finds the jute rug as well as shoes', { q: 'jute' }, ['p-1', 'p-2', 'p-6', 'p-11']],
    ['alias: kitab finds books', { q: 'kitab' }, ['p-8', 'p-9']],
    ['alias: Devanagari किताब finds books', { q: 'किताब' }, ['p-8', 'p-9']],
    ['single category', { categories: ['Books'] }, ['p-8', 'p-9']],
    ['categories combine with OR', { categories: ['Electronics', 'Books'] }, ['p-4', 'p-5', 'p-8', 'p-9']],
    ['in stock only', { inStock: true, categories: ['Apparel'] }, ['p-2', 'p-11']],
    ['min price is inclusive', { minPrice: 5499 }, ['p-5', 'p-12']],
    ['max price is inclusive', { maxPrice: 499 }, ['p-3', 'p-8']],
    ['price range is inclusive at both ends', { minPrice: 2499, maxPrice: 2999 }, ['p-1', 'p-4', 'p-7']],
    ['inverted price range is not applied', { minPrice: 9000, maxPrice: 100 }, ALL_IDS],
    ['groups combine with AND', { q: 'shoes', categories: ['Sports'], inStock: true, maxPrice: 3000 }, ['p-1']],
    ['no match', { q: 'zzzz' }, []],
  ])('%s', (_name, patch, expected) => {
    expect(ids(patch)).toEqual(expected);
  });

  it('reports total equal to the number of indices', () => {
    const result = engine.search({ ...DEFAULT_FILTERS, q: 'shoes' });
    expect(result.total).toBe(result.indices.length);
  });
});

describe('InMemorySearchEngine sorting', () => {
  it('sorts by price ascending, ties broken by dataset order', () => {
    expect(ids({ sort: 'price_asc', categories: ['Home', 'Sports'] })).toEqual(['p-10', 'p-6', 'p-1', 'p-7', 'p-12']);
  });

  it('sorts by price descending, ties broken by dataset order', () => {
    expect(ids({ sort: 'price_desc', categories: ['Home', 'Sports'] })).toEqual(['p-12', 'p-1', 'p-7', 'p-6', 'p-10']);
  });

  it('sorts by rating descending, ties broken by dataset order', () => {
    expect(ids({ sort: 'rating_desc', categories: ['Electronics', 'Sports'] })).toEqual([
      'p-5',
      'p-12',
      'p-1',
      'p-4',
      'p-10',
    ]);
  });

  it('keeps dataset order when every key ties', () => {
    const same = [3, 1, 2].map((n) => makeProduct({ id: `t-${n}`, price: 100, rating: 4 }));
    const tied = new InMemorySearchEngine(same);
    for (const sort of ['price_asc', 'price_desc', 'rating_desc'] as const) {
      expect(tied.search({ ...DEFAULT_FILTERS, sort }).indices).toEqual([0, 1, 2]);
    }
  });
});

describe('InMemorySearchEngine facet counts', () => {
  it('counts every category with no filters', () => {
    expect(engine.search(DEFAULT_FILTERS).facetCounts).toEqual({
      Electronics: 2,
      Apparel: 3,
      Home: 2,
      Books: 2,
      Sports: 3,
    });
  });

  it('applies every filter except category', () => {
    const result = engine.search({ ...DEFAULT_FILTERS, inStock: true, categories: ['Books'] });
    expect(result.total).toBe(1);
    expect(result.facetCounts).toEqual({ Electronics: 1, Apparel: 2, Home: 2, Books: 1, Sports: 3 });
  });

  it('follows the text query', () => {
    expect(engine.search({ ...DEFAULT_FILTERS, q: 'shoes' }).facetCounts).toEqual({
      Electronics: 0,
      Apparel: 1,
      Home: 0,
      Books: 0,
      Sports: 1,
    });
  });
});
