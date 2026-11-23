import { useCallback, useSyncExternalStore } from 'react';
import { useServices } from './useServices';

/**
 * How many of one product are in the cart. A cheap per-card subscription (a number snapshot,
 * no summary, no effects) so mounting cards while scrolling stays light.
 */
export function useCartQuantity(productId: string): number {
  const { cartStore } = useServices();
  const getSnapshot = useCallback(() => cartStore.quantityOf(productId), [cartStore, productId]);
  return useSyncExternalStore(cartStore.subscribe, getSnapshot, getSnapshot);
}
