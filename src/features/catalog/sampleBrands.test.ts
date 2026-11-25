import { describe, expect, it } from 'vitest';
import { generateProducts } from '../../data/generateProducts';
import { FIXTURE_PRODUCTS } from '../../test/fixtures';
import { sampleBrands } from './sampleBrands';

describe('sampleBrands', () => {
  it('takes brands from each category in turn, largest first', () => {
    expect(sampleBrands(FIXTURE_PRODUCTS)).toEqual([
      'Nexora', 'Élan', 'Café Living', 'Banyan House', 'Arena Pro',
      'Voltix', 'Kora', 'Casa Verde', 'Penrose Press', 'Peakform',
    ]);
  });

  it('gives two brands per category for the real catalog, all different', () => {
    const products = generateProducts();
    const brands = sampleBrands(products);
    expect(brands).toHaveLength(10);
    const categoryOf = new Map(products.map((product) => [product.brand, product.category]));
    const perCategory = new Map<string, number>();
    for (const brand of brands) perCategory.set(categoryOf.get(brand) ?? '', (perCategory.get(categoryOf.get(brand) ?? '') ?? 0) + 1);
    expect([...perCategory.values()]).toEqual([2, 2, 2, 2, 2]);
  });

  it('returns what there is for a small or empty catalog', () => {
    expect(sampleBrands([])).toEqual([]);
    expect(sampleBrands(FIXTURE_PRODUCTS, 3)).toEqual(['Nexora', 'Élan', 'Café Living']);
  });
});
