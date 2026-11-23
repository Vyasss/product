/** Fixed display and URL order for categories. The `Category` union is derived from it. */
export const CATEGORIES = ['Electronics', 'Apparel', 'Home', 'Books', 'Sports'] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Product {
  id: string;
  title: string;
  brand: string;
  category: Category;
  /** Price in INR. */
  price: number;
  /** 1.0 to 5.0, one decimal place. */
  rating: number;
  inStock: boolean;
  thumbnailUrl: string;
}

const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORIES);

export function isCategory(value: string): value is Category {
  return CATEGORY_SET.has(value);
}
