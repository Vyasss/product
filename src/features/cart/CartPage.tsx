import { useId, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, buttonClassName } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CartIcon, TrashIcon } from '../../components/ui/icons';
import { QuantityStepper } from '../../components/ui/QuantityStepper';
import { Skeleton } from '../../components/ui/Skeleton';
import { MAX_QUANTITY } from '../../cart/cartStore';
import { parseSharedCart, serializeSharedCart, SHARED_CART_PARAM } from '../../cart/sharedCart';
import { summarizeCart, type CartItem } from '../../cart/summary';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useCart } from '../../hooks/useCart';
import { useCatalogData } from '../../hooks/useCatalogData';
import { SITE_NAME, useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { ErrorState } from '../shared/ErrorState';
import { formatPrice, pluralizeProducts } from '../shared/format';
import { ShareButton } from '../shared/ShareButton';
import { StateMessage } from '../../components/ui/StateMessage';
import { StorePage } from '../shell/StorePage';
import { SharedCartNotice } from './SharedCartNotice';

function CartLineRow({ item, onRemoved }: { item: CartItem; onRemoved: () => void }) {
  const { store } = useCart();
  const announce = useAnnounce();
  const { product, quantity, lineTotal } = item;
  const remove = () => {
    store.remove(product.id);
    announce(`Removed ${product.title} from cart`, 100);
    onRemoved();
  };
  return (
    <li>
      <Card className="flex gap-4 p-3 sm:p-4">
        <Link to={`/product/${product.id}`} state={{ from: 'cart' }} tabIndex={-1} aria-hidden="true" className="shrink-0">
          <img src={product.thumbnailUrl} alt="" width={96} height={77} className="h-20 w-24 rounded-control bg-tint object-contain p-1" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-wider text-ink-muted uppercase">{product.brand}</p>
            <h2 className="text-base font-semibold text-ink">
              <Link to={`/product/${product.id}`} state={{ from: 'cart' }} className="hover:underline">
                {product.title}
              </Link>
            </h2>
            <p className="text-sm text-ink-muted">{formatPrice(product.price)} each</p>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <QuantityStepper
              label="Quantity"
              itemName={product.title}
              value={quantity}
              min={1}
              max={MAX_QUANTITY}
              onChange={(next) => {
                store.setQuantity(product.id, next);
                announce(`${product.title}: quantity ${next}`, 300);
              }}
              onRemove={remove}
            />
            <div className="min-w-24 text-right">
              <p className="text-xs font-semibold text-ink-muted">Line total</p>
              <p className="text-lg font-bold text-ink tabular-nums">{formatPrice(lineTotal)}</p>
            </div>
            <Button
              variant="ghost"
              className="px-2"
              aria-label={`Remove ${product.title}`}
              onClick={remove}
            >
              <TrashIcon className="size-4" />
              Remove
            </Button>
          </div>
        </div>
      </Card>
    </li>
  );
}

/**
 * `/cart` (lazy-loaded): lines, quantities, totals, clear, and the way to checkout.
 * The cart itself lives in storage, not the URL, so sharing it builds a link that carries
 * the lines (`/cart?items=id:qty,...`). Opening such a link shows what was shared and lets
 * the visitor add it; it never changes their cart on its own.
 */
export default function CartPage() {
  const { products, byId } = useCatalogData();
  const { store, summary, count } = useCart();
  const announce = useAnnounce();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryId = useId();
  const settled = products.status !== 'loading';
  const [params, setParams] = useSearchParams();

  useDocumentTitle(`Your cart (${count})`);
  useFocusOnNavigation(headingRef, settled);
  const focusHeading = () => headingRef.current?.focus();

  const sharedRaw = params.get(SHARED_CART_PARAM);
  const sharedLines = useMemo(() => parseSharedCart(sharedRaw), [sharedRaw]);
  const shared = useMemo(() => summarizeCart(sharedLines, (id) => byId?.get(id)), [sharedLines, byId]);

  const dismissShared = () => {
    const next = new URLSearchParams(params);
    next.delete(SHARED_CART_PARAM);
    setParams(next, { replace: true });
    focusHeading();
  };
  const addShared = () => {
    for (const item of shared.items) store.add(item.product.id, item.quantity);
    announce(`Added ${pluralizeProducts(shared.count)} from the shared cart`, 100);
    dismissShared();
  };
  const cartLink = () => {
    const lines = summary.items.map((item) => ({ productId: item.product.id, quantity: item.quantity }));
    return `${window.location.origin}/cart?${SHARED_CART_PARAM}=${serializeSharedCart(lines)}`;
  };

  return (
    <StorePage>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-ink focus:outline-none md:text-3xl">
          Your cart{count > 0 ? ` (${pluralizeProducts(count)})` : ''}
        </h1>
        {products.status === 'success' && summary.items.length > 0 && (
          <ShareButton
            label="Share this cart"
            getUrl={cartLink}
            getText={() => `My ${SITE_NAME} cart: ${pluralizeProducts(summary.count)}, ${formatPrice(summary.total)}`}
          />
        )}
      </div>

      {products.status === 'success' && sharedRaw !== null && (
        <SharedCartNotice
          shared={shared}
          skipped={sharedLines.length - shared.items.length}
          onAdd={addShared}
          onDismiss={dismissShared}
        />
      )}

      {products.status === 'loading' && (
        <div className="flex flex-col gap-4">
          <span className="sr-only">Loading your cart…</span>
          <Skeleton className="h-28 w-full rounded-card" />
          <Skeleton className="h-28 w-full rounded-card" />
        </div>
      )}
      {products.status === 'error' && (
        <ErrorState error={products.error} retrying={products.retrying} onRetry={products.retry} />
      )}

      {products.status === 'success' && summary.items.length === 0 && (
        <StateMessage
          headingLevel="h2"
          illustration={
            <span className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
              <CartIcon className="size-10" />
            </span>
          }
          title="Your cart is empty"
          action={
            <Link to="/" className={buttonClassName('primary')}>
              Browse the catalog
            </Link>
          }
        >
          <p>Add products from the catalog or a product page, and they will appear here.</p>
        </StateMessage>
      )}

      {products.status === 'success' && summary.items.length > 0 && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
          <ul aria-label="Items in your cart" className="flex flex-col gap-3">
            {summary.items.map((item) => (
              <CartLineRow key={item.product.id} item={item} onRemoved={focusHeading} />
            ))}
          </ul>
          <section aria-labelledby={summaryId} className="lg:sticky lg:top-[calc(var(--header-h)+1rem)]">
            <Card className="p-5">
              <h2 id={summaryId} className="text-lg font-bold text-ink">
                Order summary
              </h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-muted">Items</dt>
                  <dd className="font-semibold text-ink tabular-nums">{count}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base">
                  <dt className="font-bold text-ink">Total</dt>
                  <dd className="text-xl font-bold text-ink tabular-nums">{formatPrice(summary.total)}</dd>
                </div>
              </dl>
              <Link to="/checkout" className={buttonClassName('primary', 'mt-5 w-full')}>
                Proceed to checkout
              </Link>
              <Button
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => {
                  store.clear();
                  announce('Cart cleared', 100);
                  focusHeading();
                }}
              >
                Clear cart
              </Button>
              <p className="mt-3 text-xs text-ink-muted">
                Prices come from the catalog. This is a demo store: no payment is taken and nothing is shipped.
              </p>
            </Card>
          </section>
        </div>
      )}
    </StorePage>
  );
}
