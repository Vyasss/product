import type { Category, Product } from './product';

/**
 * The product types (sub-categories) of each category: every kind of item the generator can
 * produce. `Product` has no type field, so a product's type is read from its title (see
 * `itemTypeOf`). Each type has a matching illustration in `data/thumbnails.ts`; the
 * `Record<ItemType, ...>` there makes a missing mapping a compile error. Add a type here only
 * together with an illustration that actually depicts it.
 */
export const ITEM_TYPES = {
  Electronics: [
    'Laptop',
    'Smartphone',
    'Wireless Earbuds',
    'Noise-Cancelling Headphones',
    'Smart Watch',
    'Bluetooth Speaker',
    'Smart TV',
    'LED Monitor',
  ],
  Apparel: [
    'Cotton T-Shirt',
    'Polo T-Shirt',
    'Slim Fit Jeans',
    'Chinos',
    'Track Pants',
    'Hoodie',
    'Denim Jacket',
    'Summer Dress',
    'Kurta',
    'Running Shoes',
    'Sneakers',
  ],
  Home: ['Jute Rug', 'Pressure Cooker', 'Ceramic Dinner Set', 'Table Lamp', 'Cushion Covers', 'Wall Clock', 'Coffee Mug Set'],
  Books: [
    'Novel',
    'Cookbook',
    'Workbook',
    'Story Book',
    'Biography',
    'Poetry Collection',
    'Comic Book',
    'Textbook',
    'Travel Guide',
    'Self-Help Book',
  ],
  Sports: [
    'Running Shoes',
    'Training Shoes',
    'Yoga Mat',
    'Cricket Bat',
    'Football',
    'Badminton Racket',
    'Dumbbell Set',
    'Cycling Helmet',
  ],
} as const satisfies Readonly<Record<Category, readonly string[]>>;

export type ItemType = (typeof ITEM_TYPES)[Category][number];

/** Every type once, in category order: the display and URL order ("Running Shoes" is in two categories). */
export const ALL_ITEM_TYPES: readonly ItemType[] = [...new Set<ItemType>(Object.values(ITEM_TYPES).flat())];

const ITEM_TYPE_BY_LOWERCASE: ReadonlyMap<string, ItemType> = new Map(
  ALL_ITEM_TYPES.map((type) => [type.toLowerCase(), type]),
);

/** The type with this name, ignoring case; undefined for anything else. */
export function findItemType(name: string): ItemType | undefined {
  return ITEM_TYPE_BY_LOWERCASE.get(name.trim().toLowerCase());
}

/** The type named in the title (longest match in the product's category), if any. */
export function itemTypeOf(product: Pick<Product, 'title' | 'category'>): ItemType | null {
  const title = product.title.toLowerCase();
  let best: ItemType | null = null;
  for (const item of ITEM_TYPES[product.category]) {
    if (title.includes(item.toLowerCase()) && (best === null || item.length > best.length)) best = item;
  }
  return best;
}

/**
 * The selected types that can still match once `categories` are selected (all of them when no
 * category is selected). Used when a category is unticked, so no type filter is left behind
 * that matches nothing.
 */
export function typesWithin(types: readonly ItemType[], categories: readonly Category[]): readonly ItemType[] {
  if (categories.length === 0 || types.length === 0) return types;
  const allowed = new Set<ItemType>(categories.flatMap((category) => ITEM_TYPES[category]));
  const kept = types.filter((type) => allowed.has(type));
  return kept.length === types.length ? types : kept;
}
