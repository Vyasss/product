import { describe, expect, it } from 'vitest';
import { generateProducts } from '../data/generateProducts';
import { DEFAULT_FILTERS, type FilterState } from '../domain/filters';
import { ALL_ITEM_TYPES, findItemType, ITEM_TYPES, itemTypeOf, typesWithin } from '../domain/productType';
import { FIXTURE_PRODUCTS } from '../test/fixtures';
import { createInMemorySearchEngine } from './InMemorySearchEngine';

const products = generateProducts();
const engine = createInMemorySearchEngine(products);
const search = (patch: Partial<FilterState>) => engine.search({ ...DEFAULT_FILTERS, ...patch });
const inCategory = (category: string) => products.filter((product) => product.category === category).length;

describe('searching by category name', () => {
  it.each(['ele', 'elec', 'elect', 'electr', 'electronic', 'electronics', 'ELECTRONICS'])(
    '%j finds every Electronics product, without a correction',
    (q) => {
      const result = search({ q });
      expect(result.total).toBe(inCategory('Electronics'));
      expect(result.relaxed).toBeNull();
      expect(result.indices.every((i) => products[i]?.category === 'Electronics')).toBe(true);
    },
  );

  it.each([
    ['apparel', 'Apparel'],
    ['sports', 'Sports'],
    ['sport', 'Sports'],
    ['appa', 'Apparel'],
  ])('%j finds the %s category', (q, category) => {
    expect(search({ q }).total).toBe(inCategory(category));
  });

  it('a category word also matches titles and brands that contain it', () => {
    // "home" is the Home category and the brand "Hearth & Home"; "book" is Books and "Comic Book".
    expect(search({ q: 'home' }).total).toBe(inCategory('Home'));
    expect(search({ q: 'book' }).total).toBe(inCategory('Books'));
  });

  it('combines with other words and filters', () => {
    const result = search({ q: 'electronics voltix', inStock: true });
    expect(result.total).toBeGreaterThan(0);
    for (const i of result.indices) {
      expect(products[i]).toMatchObject({ category: 'Electronics', brand: 'Voltix', inStock: true });
    }
  });

  it('needs three letters, and only the start of the name counts', () => {
    // "el" is plain title/brand text search; "lectro" and "ports" are not the start of a category.
    expect(search({ q: 'el' }).indices.some((i) => products[i]?.category !== 'Electronics')).toBe(true);
    expect(search({ q: 'lectronics' }).relaxed?.corrections).toEqual([{ from: 'lectronics', to: 'electronics' }]);
  });

  it('corrects a misspelt category name', () => {
    const result = search({ q: 'electronix' });
    expect(result.relaxed?.corrections).toEqual([{ from: 'electronix', to: 'electronics' }]);
    expect(result.total).toBe(inCategory('Electronics'));
  });

  it('suggests categories', () => {
    expect(engine.suggest('elec').map((entry) => [entry.text, entry.kind])).toEqual([['Electronics', 'category']]);
    expect(engine.suggest('spo').map((entry) => entry.text)).toContain('Sports');
  });
});

describe('product types (sub-categories)', () => {
  it('every generated product has a type of its own category', () => {
    for (const product of products) {
      const type = itemTypeOf(product);
      expect(type).not.toBeNull();
      expect(ITEM_TYPES[product.category]).toContain(type);
    }
  });

  it('filters by one type, and by several (OR)', () => {
    const monitors = search({ types: ['LED Monitor'] });
    expect(monitors.total).toBeGreaterThan(0);
    expect(monitors.indices.every((i) => products[i]?.title.includes('LED Monitor'))).toBe(true);

    const tvs = search({ types: ['Smart TV'] });
    expect(search({ types: ['Smart TV', 'LED Monitor'] }).total).toBe(monitors.total + tvs.total);
  });

  it('combines with category, text, price and stock (AND)', () => {
    const all = search({ types: ['Running Shoes'] });
    const sports = search({ types: ['Running Shoes'], categories: ['Sports'] });
    const apparel = search({ types: ['Running Shoes'], categories: ['Apparel'] });
    expect(sports.total).toBeGreaterThan(0);
    expect(apparel.total).toBeGreaterThan(0);
    expect(sports.total + apparel.total).toBe(all.total);
    expect(search({ types: ['Laptop'], categories: ['Books'] }).total).toBe(0);
    expect(search({ q: 'voltix', types: ['Laptop'], inStock: true }).indices.every((i) => products[i]?.brand === 'Voltix')).toBe(true);
  });

  it('type counts apply every filter except the type filter, and add up to the results', () => {
    const scope = search({ q: 'electronics' });
    expect([...scope.typeCounts.keys()]).toEqual([...ITEM_TYPES.Electronics]);
    expect([...scope.typeCounts.values()].reduce((sum, count) => sum + count, 0)).toBe(scope.total);

    // Ticking a type narrows the results but leaves the other types' counts in place.
    const narrowed = search({ q: 'electronics', types: ['Laptop'] });
    expect(narrowed.total).toBe(scope.typeCounts.get('Laptop'));
    expect(narrowed.typeCounts).toEqual(scope.typeCounts);
  });

  it('category counts follow the type filter', () => {
    const { facetCounts } = search({ types: ['Running Shoes'] });
    expect(facetCounts.Electronics).toBe(0);
    expect(facetCounts.Apparel).toBeGreaterThan(0);
    expect(facetCounts.Sports).toBeGreaterThan(0);
  });

  it.each(['price_asc', 'price_desc', 'rating_desc'] as const)('sorts a type-filtered list by %s', (sort) => {
    const { indices } = search({ categories: ['Electronics'], types: ['LED Monitor', 'Smart TV'], sort });
    expect(indices.length).toBeGreaterThan(100);
    const value = (i: number) => (sort === 'rating_desc' ? products[i]?.rating : products[i]?.price) ?? 0;
    for (let n = 1; n < indices.length; n++) {
      const previous = value(indices[n - 1] ?? 0);
      const current = value(indices[n] ?? 0);
      if (sort === 'price_asc') expect(previous).toBeLessThanOrEqual(current);
      else expect(previous).toBeGreaterThanOrEqual(current);
    }
  });

  it('a product whose title names no known type matches no type filter', () => {
    const small = createInMemorySearchEngine(FIXTURE_PRODUCTS);
    const result = small.search({ ...DEFAULT_FILTERS, types: ['Yoga Mat'] });
    expect(result.indices.map((i) => FIXTURE_PRODUCTS[i]?.title)).toEqual(['Yoga Mat Lightweight']);
  });
});

describe('product type helpers', () => {
  it('lists each type once, in category order', () => {
    expect(new Set(ALL_ITEM_TYPES).size).toBe(ALL_ITEM_TYPES.length);
    expect(ALL_ITEM_TYPES[0]).toBe('Laptop');
    expect(ALL_ITEM_TYPES.filter((type) => type === 'Running Shoes')).toHaveLength(1);
  });

  it('finds a type by name, ignoring case and outer spaces', () => {
    expect(findItemType(' led monitor ')).toBe('LED Monitor');
    expect(findItemType('Toaster')).toBeUndefined();
  });

  it('keeps only the types that belong to the selected categories', () => {
    expect(typesWithin(['Laptop', 'Novel'], ['Books'])).toEqual(['Novel']);
    expect(typesWithin(['Running Shoes'], ['Sports'])).toEqual(['Running Shoes']);
    expect(typesWithin(['Laptop', 'Novel'], [])).toEqual(['Laptop', 'Novel']);
  });
});
