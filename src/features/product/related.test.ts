import { describe, expect, it } from 'vitest';
import { FIXTURE_PRODUCTS, makeProduct } from '../../test/fixtures';
import { relatedProducts } from './related';

const target = makeProduct({ id: 't', title: 'Target', brand: 'Stridex', category: 'Sports', price: 1000 });
const all = [
  target,
  makeProduct({ id: 'b1', brand: 'Stridex', category: 'Apparel', price: 500, inStock: false }),
  makeProduct({ id: 'b2', brand: 'Stridex', category: 'Home', price: 900 }),
  makeProduct({ id: 'c-far', brand: 'Other', category: 'Sports', price: 9000 }),
  makeProduct({ id: 'c-near', brand: 'Other', category: 'Sports', price: 1100 }),
  makeProduct({ id: 'c-out', brand: 'Other', category: 'Sports', price: 1000, inStock: false }),
  makeProduct({ id: 'x', brand: 'Other', category: 'Books', price: 1000 }),
];

describe('relatedProducts', () => {
  it('lists other products of the same brand, in stock first, never the product itself', () => {
    expect(relatedProducts(target, all).sameBrand.map((p) => p.id)).toEqual(['b2', 'b1']);
  });

  it('lists the same category from other brands, in stock first, then by price closeness', () => {
    expect(relatedProducts(target, all).sameCategory.map((p) => p.id)).toEqual(['c-near', 'c-far', 'c-out']);
  });

  it('respects the limit and never repeats a product across the two strips', () => {
    const product = FIXTURE_PRODUCTS[0];
    if (!product) throw new Error('fixture missing');
    const { sameBrand, sameCategory } = relatedProducts(product, FIXTURE_PRODUCTS, 2);
    expect(sameBrand.length).toBeLessThanOrEqual(2);
    expect(sameCategory.length).toBeLessThanOrEqual(2);
    const ids = [...sameBrand, ...sameCategory].map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(product.id);
  });
});
