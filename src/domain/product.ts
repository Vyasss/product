/**
 * The product shape from the brief, field for field. Every product the app generates,
 * receives from an API, searches, filters, sorts or shows is a `Product` and nothing more.
 */
export interface Product {
  id: string;
  title: string;
  brand: string;
  category: 'Electronics' | 'Apparel' | 'Home' | 'Books' | 'Sports';
  price: number; // in INR
  rating: number; // 1.0 to 5.0
  inStock: boolean;
  thumbnailUrl: string;
}

export type Category = Product['category'];

/**
 * Fixed display and URL order for categories. A test checks at compile time that
 * this list and the `category` union in `Product` name exactly the same values (see
 * `data/productShape.test.ts`, which also checks every generated product against the interface).
 */
export const CATEGORIES = ['Electronics', 'Apparel', 'Home', 'Books', 'Sports'] as const satisfies readonly Category[];

const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORIES);

export function isCategory(value: string): value is Category {
  return CATEGORY_SET.has(value);
}
