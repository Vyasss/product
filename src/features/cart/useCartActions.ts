import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { MAX_QUANTITY } from '../../cart/cartStore';
import type { Product } from '../../domain/product';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useFeatures, useServices } from '../../hooks/useServices';

export interface CartActions {
  quantityOf: (productId: string) => number;
  /** Adds and announces the result through the shared live region. */
  add: (product: Product, quantity?: number) => void;
  /**
   * Adds one if the product is not in the cart yet, then goes to checkout. Without the cart
   * feature there is no checkout page: it adds and says so instead.
   */
  buyNow: (product: Product) => void;
}

export function useCartActions(): CartActions {
  const { cartStore: store } = useServices();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const { cart } = useFeatures();

  const add = useCallback(
    (product: Product, quantity = 1) => {
      if (!product.inStock) return;
      const before = store.quantityOf(product.id);
      const after = store.add(product.id, quantity);
      const added = after - before;
      if (added <= 0) {
        announce(`You already have the maximum of ${MAX_QUANTITY} of ${product.title} in your cart`, 100);
        return;
      }
      const what = added === 1 ? product.title : `${added} × ${product.title}`;
      announce(`Added ${what} to cart${after > added ? `. ${after} in cart` : ''}`, 100);
    },
    [store, announce],
  );

  const buyNow = useCallback(
    (product: Product) => {
      if (!product.inStock) return;
      if (store.quantityOf(product.id) === 0) store.add(product.id, 1);
      if (cart) {
        void navigate('/checkout');
        return;
      }
      announce(`Added ${product.title} to cart. Checkout is not part of this demo.`, 100);
    },
    [store, navigate, cart, announce],
  );

  return { quantityOf: store.quantityOf, add, buyNow };
}
