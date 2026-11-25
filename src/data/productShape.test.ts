import { describe, expect, expectTypeOf, it } from 'vitest';
import { generateProducts } from './generateProducts';
import { CATEGORIES, type Category, type Product } from '../domain/product';

const PRODUCT_FIELDS = ['brand', 'category', 'id', 'inStock', 'price', 'rating', 'thumbnailUrl', 'title'];

describe('Product interface', () => {
  it('lists every category of the interface, and nothing else (compile-time check)', () => {
    expectTypeOf<(typeof CATEGORIES)[number]>().toEqualTypeOf<Category>();
    expectTypeOf<Product['category']>().toEqualTypeOf<'Electronics' | 'Apparel' | 'Home' | 'Books' | 'Sports'>();
  });

  it('the generator returns Product[] (compile-time check)', () => {
    expectTypeOf(generateProducts).returns.toEqualTypeOf<Product[]>();
  });

  it('every one of the 5,000 generated products has exactly the eight fields, with valid values', () => {
    const products = generateProducts();
    expect(products).toHaveLength(5000);
    const ids = new Set<string>();
    for (const product of products) {
      expect(Object.keys(product).sort()).toEqual(PRODUCT_FIELDS);
      expect(typeof product.id).toBe('string');
      expect(typeof product.title).toBe('string');
      expect(typeof product.brand).toBe('string');
      expect(CATEGORIES).toContain(product.category);
      expect(Number.isFinite(product.price) && product.price > 0).toBe(true);
      expect(product.rating >= 1 && product.rating <= 5).toBe(true);
      expect(Math.round(product.rating * 10) / 10).toBe(product.rating);
      expect(typeof product.inStock).toBe('boolean');
      expect(typeof product.thumbnailUrl).toBe('string');
      ids.add(product.id);
    }
    expect(ids.size).toBe(5000);
  });
});
