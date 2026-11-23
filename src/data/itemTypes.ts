import type { Category } from '../domain/product';

/**
 * Every kind of item the generator can produce, per category. Each one has a matching
 * illustration in `thumbnails.ts`; the `Record<ItemType, ...>` there makes a missing mapping a
 * compile error, and a unit test checks it again at runtime. Add an item here only together
 * with an illustration that actually depicts it.
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
