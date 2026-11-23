import { describe, expect, it } from 'vitest';
import type { Category } from '../domain/product';
import { makeProduct } from '../test/fixtures';
import { generateProducts } from './generateProducts';
import { ITEM_TYPES } from './itemTypes';
import { itemTypeOf, kindOf, PLURAL_ITEM_TYPES, templateProductContent } from './productContent';

const products = generateProducts();
const content = products.map((product) => templateProductContent.contentFor(product));

/** Words that must never describe a product in this category. */
const FORBIDDEN: Readonly<Record<Category, RegExp>> = {
  Electronics: /\b(cotton|fabric|fleece|denim|stitch|pages?|paperback|willow|jute|ceramic|wash)\b/i,
  Apparel: /\b(battery|display|screen|bluetooth|charging|pages?|paperback|willow|ceramic|induction)\b/i,
  Home: /\b(battery life|bluetooth|camera|paperback|willow|run|sole|fit)\b/i,
  Books: /\b(battery|bluetooth|fabric|cotton|fit|sole|willow|induction|washable)\b/i,
  Sports: /\b(bluetooth|screen|camera|paperback|pages?|ceramic|induction|cotton)\b/i,
};

describe('generated product content', () => {
  it('is deterministic for the same product', () => {
    const product = products[123];
    if (!product) throw new Error('fixture missing');
    expect(templateProductContent.contentFor(product)).toEqual(templateProductContent.contentFor({ ...product }));
  });

  it('does not touch the dataset (generation is unchanged after computing content)', () => {
    expect(generateProducts()).toEqual(products);
  });

  it('gives every product a non-empty description and 3 to 4 highlights within length bounds', () => {
    for (const item of content) {
      expect(item.description.length).toBeGreaterThan(40);
      expect(item.description.length).toBeLessThanOrEqual(200);
      // Starts with a capital (brands such as "Élan" are allowed) and ends with a full stop.
      expect(item.description).toMatch(/^\p{Lu}.*\.$/u);
      expect(item.highlights.length).toBeGreaterThanOrEqual(3);
      expect(item.highlights.length).toBeLessThanOrEqual(4);
      for (const highlight of item.highlights) {
        expect(highlight.length).toBeGreaterThan(3);
        expect(highlight.length).toBeLessThanOrEqual(40);
      }
      expect(new Set(item.highlights).size).toBe(item.highlights.length);
    }
  });

  it('uses only wording that suits the product category', () => {
    products.forEach((product, i) => {
      const text = `${content[i]?.description ?? ''} ${content[i]?.highlights.join(' ') ?? ''}`;
      expect(text, `${product.title}: ${text}`).not.toMatch(FORBIDDEN[product.category]);
    });
  });

  it('recognises the item type of every generated title', () => {
    for (const product of products) expect(itemTypeOf(product)).not.toBeNull();
    for (const category of Object.keys(ITEM_TYPES) as Category[]) {
      for (const item of ITEM_TYPES[category]) {
        expect(itemTypeOf({ title: `Brand ${item} X1`, category })).toBe(item);
      }
    }
  });

  it.each([
    ['Bluetooth Speaker Max Z3', 'Electronics', /speaker/i],
    ['Olive Running Shoes', 'Apparel', /shoes|sole|run/i],
    ['Monsoon Letters: Novel', 'Books', /book|story|read/i],
    ['Family Wall Clock', 'Home', /clock|dial/i],
  ] as const)('describes "%s" as that kind of item', (title, category, pattern) => {
    const text = templateProductContent.contentFor(makeProduct({ id: 'x', title, category })).description;
    expect(text).toMatch(pattern);
  });

  it('falls back to category wording for titles without a known item type', () => {
    const product = makeProduct({ id: 'x', title: 'Leather Formal Shoes', category: 'Apparel' });
    expect(kindOf(product)).toBe('any-Apparel');
    expect(templateProductContent.contentFor(product).description.length).toBeGreaterThan(40);
  });

  it('spreads review counts plausibly, with a few products at zero', () => {
    const counts = content.map((item) => item.reviewCount);
    const zeros = counts.filter((count) => count === 0).length;
    expect(zeros).toBeGreaterThan(0);
    expect(zeros / counts.length).toBeLessThan(0.08);
    expect(Math.max(...counts)).toBeLessThanOrEqual(4000);
    expect(new Set(counts).size).toBeGreaterThan(500);
    const median = (list: number[]) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;
    const mid = products.filter((p) => p.price >= 500 && p.price <= 5000).map((p) => templateProductContent.contentFor(p).reviewCount);
    const rest = products.filter((p) => p.price < 500 || p.price > 5000).map((p) => templateProductContent.contentFor(p).reviewCount);
    expect(median(mid)).toBeGreaterThan(median(rest));
  });
});

describe('subject-verb agreement', () => {
  const all = (Object.keys(ITEM_TYPES) as Category[]).flatMap((category) =>
    ITEM_TYPES[category].map((item) => [category, item] as const),
  );

  it.each(all)('%s "%s": verbs agree with the item in every template', (category, item) => {
    const plural = PLURAL_ITEM_TYPES.has(item);
    const name = item.toLowerCase();
    // Many ids, so every lead and detail template is exercised for this item type.
    for (let n = 0; n < 60; n++) {
      const product = makeProduct({ id: `g-${n}`, title: `Brand ${item} X1`, category, brand: 'Brand' });
      const text = templateProductContent.contentFor(product).description;
      if (plural) {
        expect(text, text).not.toMatch(new RegExp(`${name} is\b`, 'i'));
        // "It ..." is only right after the singular noun lead ("A pair of shoes from ...").
        if (/\bIt (brings|offers)\b/.test(text)) expect(text, text).toMatch(/^A /);
        if (text.startsWith('The ') || text.startsWith("Brand's")) expect(text, text).toMatch(/\bare\b/);
      } else {
        expect(text, text).not.toMatch(/\b(are|They)\b/);
      }
    }
  });

  it('marks the plural item types', () => {
    expect([...PLURAL_ITEM_TYPES].every((item) => /s$/.test(item))).toBe(true);
    expect(PLURAL_ITEM_TYPES.has('Running Shoes')).toBe(true);
    expect(PLURAL_ITEM_TYPES.has('Dumbbell Set')).toBe(false);
  });
});
