import { describe, expect, it } from 'vitest';
import { generateProducts } from '../data/generateProducts';
import { FIXTURE_PRODUCTS, makeProduct } from '../test/fixtures';
import { createInMemorySearchEngine } from './InMemorySearchEngine';
import {
  createRecentSearches,
  MAX_RECENT_SEARCHES,
  memoryRecentSearchStorage,
  parseRecentSearches,
} from './recentSearches';
import { buildSuggestionEntries, suggest } from './suggest';

const SHOES = [
  makeProduct({ id: 'a', title: 'Trail Running Shoes', brand: 'Stridex' }),
  makeProduct({ id: 'b', title: 'Road Running Shoes', brand: 'Stridex' }),
  makeProduct({ id: 'c', title: 'Leather Formal Shoes', brand: 'Élan' }),
  makeProduct({ id: 'd', title: 'Canvas Formal Shoes', brand: 'Élan' }),
  makeProduct({ id: 'e', title: 'Smart TV', brand: 'Voltix' }),
  makeProduct({ id: 'f', title: 'Compact Smart TV', brand: 'Voltix' }),
  makeProduct({ id: 'g', title: 'Monsoon Letters: Novel', brand: 'Penrose Press' }),
];
const entries = buildSuggestionEntries(SHOES);
const texts = (query: string, limit?: number) => suggest(query, entries, limit).map((entry) => entry.text);

describe('buildSuggestionEntries', () => {
  it('collects title phrases shared by at least two products, and every brand', () => {
    const keys = entries.map((entry) => entry.key);
    expect(keys).toEqual(expect.arrayContaining(['shoes', 'running shoes', 'formal shoes', 'smart tv']));
    expect(keys).toEqual(expect.arrayContaining(['stridex', 'elan', 'voltix', 'penrose press']));
    // One-off wordings and very short single words are not offered.
    expect(keys).not.toContain('trail running shoes');
    expect(keys).not.toContain('novel');
    expect(keys).not.toContain('tv');
    // "running" appears in exactly the products "running shoes" does, so only the phrase is kept.
    expect(keys).not.toContain('running');
    expect(keys).not.toContain('smart');
  });

  it('finds a product type wherever it sits in the title', () => {
    const tvs = buildSuggestionEntries([
      makeProduct({ id: 'a', title: 'Smart TV Max Z4', brand: 'Voltix' }),
      makeProduct({ id: 'b', title: 'Smart TV Pro X2', brand: 'Voltix' }),
      makeProduct({ id: 'c', title: 'Smart TV Max G7', brand: 'Nexora' }),
    ]);
    expect(suggest('sma', tvs).map((entry) => entry.text)).toEqual(['smart tv', 'smart tv max']);
    expect(tvs.map((entry) => entry.key)).not.toContain('z4');
  });

  it('keeps the brand as written and counts products per phrase', () => {
    const brand = entries.find((entry) => entry.key === 'elan');
    expect(brand).toMatchObject({ text: 'Élan', kind: 'brand', count: 2 });
    expect(entries.find((entry) => entry.key === 'shoes')).toMatchObject({ text: 'shoes', kind: 'product', count: 4 });
  });
});

describe('suggest', () => {
  it('completes a prefix, most common phrase first', () => {
    expect(texts('sho')).toEqual(['shoes', 'formal shoes', 'running shoes']);
    expect(texts('sm')).toEqual(['smart tv']);
  });

  it('matches each typed word against the start of a word in the phrase', () => {
    expect(texts('run sh')).toEqual(['running shoes']);
    expect(texts('shoes run')).toEqual(['running shoes']);
    expect(texts('tv')).toEqual(['smart tv']);
  });

  it('ignores case and accents, and offers brands', () => {
    expect(texts('ELA')).toEqual(['Élan']);
    expect(texts('élan')).toEqual([]);
    expect(texts('pen')).toEqual(['Penrose Press']);
  });

  it('offers nothing for blank text, an exact phrase, or text that completes to nothing', () => {
    expect(texts('')).toEqual([]);
    expect(texts('   ')).toEqual([]);
    expect(texts('smart tv')).toEqual([]);
    expect(texts('zzz')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(texts('sh', 2)).toHaveLength(2);
  });

  it('suggests from the first letter: phrases starting with it first, then by product count', () => {
    expect(texts('s')).toEqual(['shoes', 'Stridex', 'smart tv', 'formal shoes', 'running shoes']);
    expect(texts('v')).toEqual(['Voltix']);
  });
});

describe('suggestions through the engine', () => {
  it('every suggestion from the real catalog finds products', () => {
    const engine = createInMemorySearchEngine(generateProducts());
    const base = { categories: [], minPrice: null, maxPrice: null, inStock: false, sort: null } as const;
    for (const typed of ['sm', 'run', 'sho', 'he', 'bo', 'yo', 'co']) {
      const suggestions = engine.suggest(typed);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(engine.search({ ...base, q: suggestion.text }).total).toBeGreaterThan(0);
      }
    }
  });

  it('works on the small fixture catalog', () => {
    const engine = createInMemorySearchEngine(FIXTURE_PRODUCTS);
    expect(engine.suggest('sho').map((entry) => entry.text)).toEqual(['shoes']);
  });

  it('builds the suggestion data once, ahead of the first keystroke', () => {
    const engine = createInMemorySearchEngine(FIXTURE_PRODUCTS);
    const prepared = engine.prepareSuggestions?.();
    expect(engine.prepareSuggestions?.()).toBe(prepared);
    expect(engine.suggest('sho').map((entry) => entry.text)).toEqual(['shoes']);
  });

  it('normalises words in titles the same way as whole phrases', () => {
    const accented = buildSuggestionEntries([
      makeProduct({ id: 'a', title: 'Café  Crème Mugs,', brand: 'Élan' }),
      makeProduct({ id: 'b', title: 'CAFÉ crème mugs', brand: 'Élan' }),
    ]);
    expect(accented.map((entry) => entry.key)).toEqual(expect.arrayContaining(['cafe creme mugs', 'elan']));
    expect(accented.find((entry) => entry.key === 'cafe creme mugs')).toMatchObject({ count: 2, kind: 'product' });
  });
});

describe('recent searches', () => {
  it('keeps the most recent first, without duplicates, up to the limit', () => {
    const recent = createRecentSearches(memoryRecentSearchStorage());
    for (const query of ['shoes', 'smart tv', 'Shoes', 'yoga mat', 'books', 'lamp', 'rug']) recent.add(query);
    expect(recent.list()).toEqual(['rug', 'lamp', 'books', 'yoga mat', 'Shoes']);
    expect(recent.list()).toHaveLength(MAX_RECENT_SEARCHES);
  });

  it('ignores blank and one-character searches', () => {
    const recent = createRecentSearches(memoryRecentSearchStorage());
    recent.add('');
    recent.add('   ');
    recent.add('a');
    expect(recent.list()).toEqual([]);
  });

  it('survives a reload through the same storage, and can be cleared', () => {
    const storage = memoryRecentSearchStorage();
    createRecentSearches(storage).add('running shoes');
    const reloaded = createRecentSearches(storage);
    expect(reloaded.list()).toEqual(['running shoes']);
    reloaded.clear();
    expect(createRecentSearches(storage).list()).toEqual([]);
  });

  it.each([
    ['corrupt JSON', '{oops'],
    ['not a list', '{"a":1}'],
    ['wrong item types', '[1, null, {"x":1}]'],
    ['empty', ''],
    ['null', null],
  ])('reads %s as no history', (_name, raw) => {
    expect(parseRecentSearches(raw)).toEqual([]);
  });

  it('keeps the valid items of a partly bad list and caps their length', () => {
    const long = 'x'.repeat(500);
    expect(parseRecentSearches(JSON.stringify(['shoes', 7, ' ', 'shoes', long]))).toEqual(['shoes', 'x'.repeat(100)]);
  });
});
