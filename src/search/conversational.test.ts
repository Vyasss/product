import { describe, expect, it } from 'vitest';
import { generateProducts } from '../data/generateProducts';
import { DEFAULT_FILTERS, type FilterState } from '../domain/filters';
import { closestWord, editDistance, maxEditsFor } from './fuzzy';
import { InMemorySearchEngine } from './InMemorySearchEngine';
import { withoutStopWords } from './stopWords';

const products = generateProducts();
const engine = new InMemorySearchEngine(products);
const search = (q: string, patch: Partial<FilterState> = {}) => engine.search({ ...DEFAULT_FILTERS, ...patch, q });

describe('stop words (core search, smart-search flag not involved)', () => {
  it.each([
    ['ek smart tv chahie', 'smart tv'],
    ['mujhe running shoes chahiye', 'running shoes'],
    ['show me a smart tv please', 'smart tv'],
    ['I need some wireless earbuds', 'wireless earbuds'],
  ])('"%s" searches for "%s" without any relaxation', (query, plain) => {
    const result = search(query);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBe(search(plain).total);
    expect(result.relaxed).toBeNull();
  });

  it('understands Devanagari filler: "एक किताब चाहिए" finds books', () => {
    const result = search('एक किताब चाहिए');
    expect(result.total).toBeGreaterThan(0);
    expect(result.relaxed).toBeNull();
    expect(result.indices.every((i) => products[i]?.category === 'Books')).toBe(true);
  });

  it('keeps a stop-words-only query as ordinary words instead of matching everything', () => {
    expect(withoutStopWords(['the'])).toEqual(['the']);
    const result = search('the');
    expect(result.total).toBeLessThan(products.length);
    expect(result.total).toBeGreaterThan(0);
    // Every result contains the word as typed (title or brand).
    expect(search('the').indices.every((i) => `${products[i]?.title} ${products[i]?.brand}`.toLowerCase().includes('the'))).toBe(true);
    expect(search('ek').total).toBeLessThan(products.length);
  });
});

describe('unknown-word fallback', () => {
  it('drops a word that matches nothing and says so', () => {
    const result = search('smart tv xyzabc');
    expect(result.total).toBe(search('smart tv').total);
    expect(result.relaxed).toEqual({
      appliedQuery: 'smart tv',
      originalQuery: 'smart tv xyzabc',
      corrections: [],
      ignored: ['xyzabc'],
    });
  });

  it('shows the normal empty result when no word matches anything', () => {
    const result = search('xyzabc qwrtyu');
    expect(result.total).toBe(0);
    expect(result.relaxed).toBeNull();
  });

  it('does not relax when every word matches something but not together', () => {
    const result = search('kurta laptop');
    expect(result.total).toBe(0);
    expect(result.relaxed).toBeNull();
  });

  it('never changes a query that has strict results (the brief example is unaffected)', () => {
    const brief = search('shoes', { categories: ['Apparel', 'Sports'], inStock: true, sort: 'price_asc' });
    expect(brief.total).toBe(260);
    expect(brief.relaxed).toBeNull();
    expect(search('running shoes').relaxed).toBeNull();
  });
});

describe('typo tolerance', () => {
  it.each<[string, string, { from: string; to: string }[]]>([
    ['runing shoez', 'running shoes', [{ from: 'runing', to: 'running' }, { from: 'shoez', to: 'shoes' }]],
    ['smrt tv', 'smart tv', [{ from: 'smrt', to: 'smart' }]],
    ['headphnes', 'headphones', [{ from: 'headphnes', to: 'headphones' }]],
    ['vlotix', 'voltix', [{ from: 'vlotix', to: 'voltix' }]],
    ['stirdex shoes', 'stridex shoes', [{ from: 'stirdex', to: 'stridex' }]],
    ['ek smrt tv chahie', 'smart tv', [{ from: 'smrt', to: 'smart' }]],
  ])('"%s" is corrected to "%s"', (query, applied, corrections) => {
    const result = search(query);
    expect(result.total).toBeGreaterThan(0);
    expect(result.total).toBe(search(applied).total);
    expect(result.relaxed?.appliedQuery).toBe(applied);
    expect(result.relaxed?.corrections).toEqual(corrections);
    expect(result.relaxed?.ignored).toEqual([]);
  });

  it('does not correct short tokens (under 4 characters): they are ignored instead', () => {
    const result = search('smart tvv'); // one edit from "tv", but too short to correct
    expect(result.relaxed?.corrections).toEqual([]);
    expect(result.relaxed?.ignored).toEqual(['tvv']);
  });

  it('leaves a correctly spelled query alone', () => {
    expect(search('headphones').relaxed).toBeNull();
    expect(search('stridex').relaxed).toBeNull();
  });

  it('measures edits with transpositions and respects the length limits', () => {
    expect(editDistance('vlotix', 'voltix', 2)).toBe(1);
    expect(editDistance('runing', 'running', 2)).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBe(2);
    expect([maxEditsFor('tv'), maxEditsFor('shoe'), maxEditsFor('running'), maxEditsFor('headphnes')]).toEqual([0, 1, 1, 2]);
  });

  it('breaks ties deterministically: more products first, then alphabetical', () => {
    const vocabulary = [
      { word: 'cart', frequency: 1 },
      { word: 'card', frequency: 5 },
      { word: 'care', frequency: 5 },
    ];
    expect(closestWord('carx', vocabulary)).toBe('card');
    expect(closestWord('carx', vocabulary.slice(0, 1))).toBe('cart');
  });
});

describe('everyday short forms', () => {
  it.each([
    ['television', 'tv'],
    ['earphones', 'earbuds'],
    ['tshirt', 't-shirt'],
    ['mobile', 'smartphone'],
  ])('"%s" finds the same products as "%s" (or more)', (alias, plain) => {
    const result = search(alias);
    expect(result.total).toBeGreaterThanOrEqual(search(plain).total);
    expect(result.total).toBeGreaterThan(0);
    expect(result.relaxed).toBeNull();
  });
});
