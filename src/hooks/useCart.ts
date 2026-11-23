import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { CartLine, CartStore } from '../cart/cartStore';
import { summarizeCart, type CartSummary } from '../cart/summary';
import { useCatalogData } from './useCatalogData';
import { useServices } from './useServices';

export interface CartApi {
  store: CartStore;
  lines: readonly CartLine[];
  summary: CartSummary;
  /** Units in the cart (before products load: what storage says). */
  count: number;
}

/**
 * Cart state for components. Once the catalog is loaded, lines for unknown or unavailable
 * products (e.g. edited storage) are dropped from the store.
 */
export function useCart(): CartApi {
  const { cartStore } = useServices();
  const { byId } = useCatalogData();
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getLines, cartStore.getLines);

  useEffect(() => {
    if (byId) cartStore.retain((id) => byId.get(id)?.inStock === true);
  }, [byId, cartStore]);

  const summary = useMemo(() => summarizeCart(lines, (id) => byId?.get(id)), [lines, byId]);
  const count = byId ? summary.count : lines.reduce((sum, line) => sum + line.quantity, 0);

  return useMemo(() => ({ store: cartStore, lines, summary, count }), [cartStore, lines, summary, count]);
}
