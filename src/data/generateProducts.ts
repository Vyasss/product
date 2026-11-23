import { CATEGORIES, type Category, type Product } from '../domain/product';
import { ITEM_TYPES } from './itemTypes';
import { mulberry32, pick, randomInt, type Random } from './prng';
import { thumbnailFor } from './thumbnails';

export const DEFAULT_SEED = 20240611;
export const DEFAULT_PRODUCT_COUNT = 5000;

interface CategoryPool {
  brands: readonly string[];
  modifiers: readonly string[];
  /** Price range in INR (both ends shop-style, ending in 9). */
  price: readonly [min: number, max: number];
  title: (item: string, modifier: string, random: Random) => string;
}

const POOLS: Readonly<Record<Category, CategoryPool>> = {
  Electronics: {
    brands: ['Voltix', 'Nexora', 'Lumina', 'Quantro', 'Sonique', 'Zentek', 'Orbix'],
    modifiers: ['Pro', 'Max', 'Lite', 'Ultra', 'Mini', 'Air', 'Neo', 'Plus'],
    price: [499, 89999],
    title: (item, modifier, random) =>
      `${item} ${modifier} ${pick(random, ['S', 'X', 'Z', 'G'])}${randomInt(random, 1, 9)}`,
  },
  Apparel: {
    brands: ['Élan', 'Urban Thread', 'Kora', 'Indigo Loom', 'Northpeak', 'Saffron & Co', 'Mira'],
    modifiers: ['Black', 'Navy', 'Olive', 'White', 'Maroon', 'Grey', 'Mustard', 'Sky Blue'],
    price: [199, 7999],
    title: (item, modifier) => `${modifier} ${item}`,
  },
  Home: {
    brands: ['Café Living', 'Hearth & Home', 'Nestwell', 'Casa Verde', 'Loomcraft', 'Brightnest'],
    modifiers: ['Classic', 'Handcrafted', 'Premium', 'Minimal', 'Rustic', 'Modern', 'Compact', 'Family'],
    price: [149, 24999],
    title: (item, modifier) => `${modifier} ${item}`,
  },
  Books: {
    brands: ['Penrose Press', 'Inkwell Books', 'Banyan House', 'Lotus Publishing', 'Northstar Editions'],
    modifiers: [
      'The Silent River',
      'Monsoon Letters',
      'Coding for Everyone',
      'Indian Kitchen Classics',
      'Stars Above Ladakh',
      'Midnight Trains',
      'Mathematics Made Simple',
      'The Last Kingdom',
      'Mindful Mornings',
      'Tales from the Ghats',
    ],
    price: [99, 1999],
    title: (item, modifier) => `${modifier}: ${item}`,
  },
  Sports: {
    brands: ['Stridex', 'Peakform', 'Kinetiq', 'Arena Pro', 'Velocity', 'Trailblaze'],
    modifiers: ['Pro', 'Elite', 'Junior', 'Trainer', 'Club', 'Match', 'Lightweight', 'All-Weather'],
    price: [199, 14999],
    title: (item, modifier) => `${modifier} ${item}`,
  },
};

const IN_STOCK_PROBABILITY = 0.8;

/**
 * "Shop" prices: below ₹1,000 they end in 5 or 9 (₹115, ₹119, ₹125), up to ₹10,000 in 9
 * (₹1,249), above that in 99 (₹12,499). The finer steps at the cheap end keep many products
 * from landing on exactly the same price.
 */
export function toShopPrice(raw: number): number {
  if (raw < 1000) {
    const nearestFive = Math.round(raw / 5) * 5;
    return nearestFive % 10 === 0 ? nearestFive - 1 : nearestFive;
  }
  return raw < 10000 ? Math.round(raw / 10) * 10 - 1 : Math.round(raw / 100) * 100 - 1;
}

/**
 * Bell-shaped draw in log space: the average of three uniforms, mapped onto log(price). Prices
 * are most common in the middle of the range and thin out smoothly towards both ends, so the
 * cheapest end has a spread of values instead of a pile-up at the category minimum (which the
 * earlier log-uniform draw produced, because it is densest at the bottom).
 */
export function drawPrice(random: Random, [min, max]: readonly [number, number]): number {
  const u = (random() + random() + random()) / 3;
  const raw = Math.exp(Math.log(min) + u * (Math.log(max) - Math.log(min)));
  return Math.min(max, Math.max(min, toShopPrice(raw)));
}

function drawRating(random: Random): number {
  // Skewed towards higher ratings, like real catalogs; one decimal place, 1.0 to 5.0.
  return Math.round((1 + 4 * Math.pow(random(), 0.6)) * 10) / 10;
}

/**
 * Deterministic: the same seed and count always produce identical products.
 * Uses only the seeded PRNG (no Math.random, no dates), and draws values in a fixed order.
 */
export function generateProducts(
  seed: number = DEFAULT_SEED,
  count: number = DEFAULT_PRODUCT_COUNT,
): Product[] {
  const random = mulberry32(seed);
  const products: Product[] = new Array<Product>(count);

  for (let i = 0; i < count; i++) {
    const category = pick(random, CATEGORIES);
    const pool = POOLS[category];
    const item = pick(random, ITEM_TYPES[category]);
    const modifier = pick(random, pool.modifiers);
    const title = pool.title(item, modifier, random);
    const brand = pick(random, pool.brands);
    const price = drawPrice(random, pool.price);
    const rating = drawRating(random);
    const inStock = random() < IN_STOCK_PROBABILITY;

    products[i] = Object.freeze({
      id: `p-${String(i + 1).padStart(5, '0')}`,
      title,
      brand,
      category,
      price,
      rating,
      inStock,
      thumbnailUrl: thumbnailFor(item),
    });
  }

  return products;
}
