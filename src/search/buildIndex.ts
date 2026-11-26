import { CATEGORIES, type Category, type Product } from '../domain/product';
import { ALL_ITEM_TYPES, itemTypeOf, type ItemType } from '../domain/productType';
import { normalize } from './normalize';

/**
 * Column-oriented view of the catalog. The hot filter loop reads typed arrays instead of
 * chasing object properties, and text matching runs on pre-normalised strings.
 */
export interface SearchIndex {
  readonly products: readonly Product[];
  /** normalize(title + ' ' + brand), one per product. */
  readonly haystacks: readonly string[];
  readonly price: Float64Array;
  readonly rating: Float64Array;
  /** 1 = in stock. */
  readonly inStock: Uint8Array;
  /** Index into CATEGORIES. */
  readonly category: Uint8Array;
  /** Index into ALL_ITEM_TYPES, or -1 when the title names no known type. */
  readonly itemType: Int16Array;
}

export const ITEM_TYPE_CODE: ReadonlyMap<ItemType, number> = new Map(ALL_ITEM_TYPES.map((type, code) => [type, code]));

/** normalize(category name), by category code: a query word may also name a category. */
export const CATEGORY_KEYS: readonly string[] = CATEGORIES.map((category) => normalize(category));

export const CATEGORY_CODE: Readonly<Record<Category, number>> = Object.fromEntries(
  CATEGORIES.map((category, code) => [category, code]),
) as Record<Category, number>;

export function buildIndex(products: readonly Product[]): SearchIndex {
  const count = products.length;
  const haystacks = new Array<string>(count);
  const price = new Float64Array(count);
  const rating = new Float64Array(count);
  const inStock = new Uint8Array(count);
  const category = new Uint8Array(count);
  const itemType = new Int16Array(count);

  products.forEach((product, i) => {
    haystacks[i] = normalize(`${product.title} ${product.brand}`);
    price[i] = product.price;
    rating[i] = product.rating;
    inStock[i] = product.inStock ? 1 : 0;
    category[i] = CATEGORY_CODE[product.category];
    const type = itemTypeOf(product);
    itemType[i] = type === null ? -1 : (ITEM_TYPE_CODE.get(type) ?? -1);
  });

  return { products, haystacks, price, rating, inStock, category, itemType };
}
