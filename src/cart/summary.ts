import type { Product } from '../domain/product';
import type { CartLine } from './cartStore';

export interface CartItem {
  product: Product;
  quantity: number;
  /** price x quantity, in INR. */
  lineTotal: number;
}

export interface CartSummary {
  items: CartItem[];
  /** Total number of units. */
  count: number;
  /** Grand total in INR. */
  total: number;
}

/**
 * Joins cart lines with the dataset. Prices come from the products, never from storage;
 * lines for unknown or unavailable products are left out.
 */
export function summarizeCart(lines: readonly CartLine[], lookup: (id: string) => Product | undefined): CartSummary {
  const items: CartItem[] = [];
  let count = 0;
  let total = 0;
  for (const line of lines) {
    const product = lookup(line.productId);
    if (!product?.inStock) continue;
    const lineTotal = product.price * line.quantity;
    items.push({ product, quantity: line.quantity, lineTotal });
    count += line.quantity;
    total += lineTotal;
  }
  return { items, count, total };
}
