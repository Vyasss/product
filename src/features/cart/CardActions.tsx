import { Button } from '../../components/ui/Button';
import { MAX_QUANTITY } from '../../cart/cartStore';
import type { Product } from '../../domain/product';
import { useCartQuantity } from '../../hooks/useCartQuantity';
import { useCartActions } from './useCartActions';

export interface CardActionsProps {
  product: Product;
  /** Id of the visible stock line, which explains why the buttons are disabled. */
  reasonId: string;
  className?: string;
}

/** Add to cart and Buy now, in both card layouts. They sit above the card's stretched title link (relative z-10). */
export function CardActions({ product, reasonId, className = '' }: CardActionsProps) {
  const inCart = useCartQuantity(product.id);
  const { add, buyNow } = useCartActions();
  const atLimit = inCart >= MAX_QUANTITY;
  const disabledReason = !product.inStock || atLimit ? { 'aria-describedby': reasonId } : {};

  return (
    <div className={`relative z-10 grid grid-cols-2 gap-2 whitespace-nowrap ${className}`}>
      <Button
        variant="outline"
        className="px-1"
        disabled={!product.inStock || atLimit}
        aria-label={`Add to cart: ${product.title}`}
        onClick={() => add(product)}
        {...disabledReason}
      >
        Add to cart
      </Button>
      <Button
        variant="primary"
        className="px-1"
        disabled={!product.inStock}
        aria-label={`Buy now: ${product.title}`}
        onClick={() => buyNow(product)}
        {...(!product.inStock ? { 'aria-describedby': reasonId } : {})}
      >
        Buy now
      </Button>
    </div>
  );
}
