import { useId, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/ui/Button';
import { CartIcon } from '../../components/ui/icons';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { MAX_QUANTITY } from '../../cart/cartStore';
import type { Product } from '../../domain/product';
import { useCart } from '../../hooks/useCart';
import { useCartActions } from './useCartActions';

/** Product page: quantity, Add to cart, Buy now, and the reason when either is unavailable. */
export function PurchasePanel({ product }: { product: Product }) {
  const { store } = useCart();
  const { add, buyNow } = useCartActions();
  const reasonId = useId();
  const inCart = store.quantityOf(product.id);
  const room = MAX_QUANTITY - inCart;
  const [quantity, setQuantity] = useState(1);
  const chosen = Math.min(quantity, Math.max(1, room));

  const reason = !product.inStock
    ? 'Currently unavailable, so it can’t be added to the cart or bought.'
    : room <= 0
      ? `You already have the maximum of ${MAX_QUANTITY} in your cart.`
      : null;

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      {product.inStock && room > 0 && (
        <QuantityStepper
          label="Quantity"
          itemName={product.title}
          value={chosen}
          min={1}
          max={room}
          onChange={setQuantity}
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="min-w-40 flex-1"
          disabled={reason !== null}
          onClick={() => {
            add(product, chosen);
            setQuantity(1);
          }}
          {...(reason ? { 'aria-describedby': reasonId } : {})}
        >
          <CartIcon className="size-4" />
          Add to cart
        </Button>
        <Button
          variant="primary"
          className="min-w-40 flex-1"
          disabled={!product.inStock}
          onClick={() => buyNow(product)}
          {...(!product.inStock ? { 'aria-describedby': reasonId } : {})}
        >
          Buy now
        </Button>
      </div>
      {reason && (
        <p id={reasonId} className="text-sm font-medium text-danger">
          {reason}
        </p>
      )}
      {inCart > 0 && (
        <p className="text-sm text-ink-muted">
          In your cart: <span className="font-semibold text-ink">{inCart}</span> ·{' '}
          <Link to="/cart" className="font-semibold text-brand-ink underline-offset-4 hover:underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
