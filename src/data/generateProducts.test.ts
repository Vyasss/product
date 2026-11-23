import { describe, expect, it } from 'vitest';
import { CATEGORIES, type Product } from '../domain/product';
import { DEFAULT_PRODUCT_COUNT, DEFAULT_SEED, generateProducts, toShopPrice } from './generateProducts';
import { mulberry32 } from './prng';
import { ITEM_TYPES } from './itemTypes';
import { ILLUSTRATION_FOR_ITEM, ILLUSTRATIONS, thumbnailFor } from './thumbnails';

/** FNV-1a over the data fields (thumbnail URLs depend on the bundler, so they are excluded). */
function checksum(products: readonly Product[]): string {
  let hash = 0x811c9dc5;
  for (const p of products) {
    const row = `${p.id}|${p.title}|${p.brand}|${p.category}|${p.price}|${p.rating}|${p.inStock}\n`;
    for (let i = 0; i < row.length; i++) {
      hash ^= row.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

describe('generateProducts', () => {
  const products = generateProducts();

  it('generates 5,000 products by default', () => {
    expect(DEFAULT_PRODUCT_COUNT).toBe(5000);
    expect(products).toHaveLength(5000);
  });

  it('gives every product a unique, padded id', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(products[0]?.id).toBe('p-00001');
    expect(products[4999]?.id).toBe('p-05000');
  });

  it('uses only the five categories, and all of them', () => {
    const seen = new Set(products.map((p) => p.category));
    expect([...seen].sort()).toEqual([...CATEGORIES].sort());
  });

  it('keeps ratings within 1.0 to 5.0 with one decimal place', () => {
    for (const { rating } of products) {
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
      expect(Math.round(rating * 10) / 10).toBe(rating);
    }
  });

  it('produces positive, finite prices', () => {
    for (const { price } of products) {
      expect(Number.isFinite(price)).toBe(true);
      expect(price).toBeGreaterThan(0);
    }
  });

  it('has non-empty text fields and a thumbnail for every product', () => {
    for (const p of products) {
      expect(p.title.trim()).not.toBe('');
      expect(p.brand.trim()).not.toBe('');
      expect(p.thumbnailUrl).not.toBe('');
    }
  });

  it('puts roughly 80% of products in stock', () => {
    const share = products.filter((p) => p.inStock).length / products.length;
    expect(share).toBeGreaterThan(0.75);
    expect(share).toBeLessThan(0.85);
  });

  it('is deterministic: the same seed gives identical output', () => {
    expect(generateProducts(DEFAULT_SEED, 5000)).toEqual(products);
    expect(generateProducts(7, 100)).toEqual(generateProducts(7, 100));
  });

  it('changes with the seed', () => {
    expect(generateProducts(1, 50)).not.toEqual(generateProducts(2, 50));
  });

  it('matches the recorded dataset checksum', () => {
    // If the generator changes on purpose, update this value; otherwise this catches drift.
    // Updated deliberately when item types were narrowed to illustrated ones and the price draw
    // changed from log-uniform to a bell shape (previous value: 64341ec9).
    expect(checksum(products)).toBe('0f57e079');
  });

  it('freezes products so shared references cannot be mutated', () => {
    expect(Object.isFrozen(products[0])).toBe(true);
  });
});

describe('mulberry32', () => {
  it('returns floats in [0, 1) and repeats for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const value = a();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(b()).toBe(value);
    }
  });
});

describe('illustrations', () => {
  const allItems = CATEGORIES.flatMap((category) => ITEM_TYPES[category].map((item) => [category, item] as const));

  it.each(allItems)('%s item type "%s" has an illustration', (_category, item) => {
    const name = ILLUSTRATION_FOR_ITEM[item];
    expect(name, `no illustration mapped for "${item}"`).toBeDefined();
    expect(ILLUSTRATIONS[name]).toMatch(/\.svg/);
    expect(thumbnailFor(item)).toBe(ILLUSTRATIONS[name]);
  });

  it('uses every illustration for at least one item type (no orphan files)', () => {
    const used = new Set(Object.values(ILLUSTRATION_FOR_ITEM));
    expect(Object.keys(ILLUSTRATIONS).filter((name) => !used.has(name as keyof typeof ILLUSTRATIONS))).toEqual([]);
  });

  it.each([
    ['Smart Watch', 'watch'],
    ['Wireless Earbuds', 'earbuds'],
    ['Kurta', 'kurta'],
    ['Slim Fit Jeans', 'trousers'],
    ['Wall Clock', 'clock'],
    ['Cycling Helmet', 'helmet'],
    ['Cricket Bat', 'cricket-bat'],
    ['Training Shoes', 'sneaker'],
  ] as const)('%s is drawn as %s', (item, name) => {
    expect(ILLUSTRATION_FOR_ITEM[item]).toBe(name);
  });

  it('every generated product uses one of the illustrations', () => {
    const urls = new Set<string>(Object.values(ILLUSTRATIONS));
    for (const product of generateProducts()) expect(urls.has(product.thumbnailUrl)).toBe(true);
  });
});

describe('price distribution', () => {
  const products = generateProducts();

  it('uses shop-style prices: ending in 5 or 9 below ₹1,000, in 9 above', () => {
    for (const { price } of products) {
      expect(Number.isInteger(price)).toBe(true);
      expect(price < 1000 ? [5, 9] : [9]).toContain(price % 10);
    }
    expect([toShopPrice(118), toShopPrice(124), toShopPrice(1253), toShopPrice(12460)]).toEqual([119, 125, 1249, 12499]);
  });

  it('does not pile many products onto a single price', () => {
    const counts = new Map<number, number>();
    for (const { price } of products) counts.set(price, (counts.get(price) ?? 0) + 1);
    const mostCommon = Math.max(...counts.values());
    // 5,000 products: no single price may hold more than 0.5% of the catalog.
    expect(mostCommon).toBeLessThanOrEqual(25);
    expect(counts.size).toBeGreaterThan(800);
  });

  it('spreads the cheapest products (what "price: low to high" shows first)', () => {
    const cheapest = products.map((p) => p.price).sort((a, b) => a - b).slice(0, 16);
    const runs = new Map<number, number>();
    for (const price of cheapest) runs.set(price, (runs.get(price) ?? 0) + 1);
    expect(runs.size).toBeGreaterThanOrEqual(8);
    expect(Math.max(...runs.values())).toBeLessThanOrEqual(4);
  });
});
