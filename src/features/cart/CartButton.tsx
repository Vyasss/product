import { Link } from 'react-router';
import { CartIcon } from '../../components/ui/icons';
import { useCart } from '../../hooks/useCart';

/**
 * Header link to the cart with a live item-count badge. The accessible name is one
 * screen-reader text, "Cart, 2 items"; the visible word and badge are hidden from it, so the
 * name always contains what is shown (no aria-label to drift out of sync).
 */
export function CartButton() {
  const { count } = useCart();
  const items = `${count} ${count === 1 ? 'item' : 'items'}`;
  return (
    <Link
      to="/cart"
      title={`Cart, ${items}`}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-control px-2 text-white hover:bg-white/10"
    >
      <CartIcon className="size-6" />
      <span aria-hidden="true" className="hidden text-sm font-semibold md:inline">
        Cart
      </span>
      <span className="sr-only">Cart, {items}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 left-6 min-w-5 rounded-full bg-accent px-1 text-center text-xs leading-5 font-bold text-ink tabular-nums md:static md:-ml-1"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
