import { MAX_QUANTITY, PRODUCT_ID, type CartLine } from './cartStore';

/** Query parameter on `/cart` that carries a shared cart, e.g. `?items=p-00042:2,p-00100:1`. */
export const SHARED_CART_PARAM = 'items';
/** A shared link is typed or pasted by someone else: bound how much of it is read. */
export const MAX_SHARED_LINES = 50;

/** `id:quantity` pairs joined by commas. Ids contain only word characters and hyphens, so no escaping is needed. */
export function serializeSharedCart(lines: readonly CartLine[]): string {
  return lines.map((line) => `${line.productId}:${line.quantity}`).join(',');
}

/**
 * Total: never throws. Entries with a bad id or quantity are dropped, a missing quantity means
 * 1, quantities are capped at MAX_QUANTITY, duplicate ids are merged, and only the first
 * MAX_SHARED_LINES distinct products are kept.
 */
export function parseSharedCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  const merged = new Map<string, number>();
  for (const entry of raw.split(',')) {
    const [id = '', quantityText = '1', ...extra] = entry.trim().split(':');
    if (extra.length > 0 || !PRODUCT_ID.test(id) || !/^\d{1,3}$/.test(quantityText)) continue;
    const quantity = Number(quantityText);
    if (quantity < 1) continue;
    if (!merged.has(id) && merged.size >= MAX_SHARED_LINES) continue;
    merged.set(id, Math.min(MAX_QUANTITY, (merged.get(id) ?? 0) + quantity));
  }
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}
