import { memo, useId, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StarRating } from '../../components/ui/StarRating';
import { MAX_QUANTITY } from '../../cart/cartStore';
import type { Product } from '../../domain/product';
import { useCartQuantity } from '../../hooks/useCartQuantity';
import { useServices } from '../../hooks/useServices';
import { CardActions } from '../cart/CardActions';
import { Price } from '../shared/Price';

export type CardLayout = 'grid' | 'list';

export interface ProductCardProps {
  product: Product;
  /** 1-based position in the full result list, for aria-posinset. */
  position: number;
  setSize: number;
  /** 'grid' for multi-column rows; 'list' (image left, details right) for one column. */
  layout: CardLayout;
  /** Called when the product link is activated (the catalog remembers it for Back). */
  onOpen?: (productId: string) => void;
  /** Where the link is followed from; the product page uses it for its Back action. */
  from?: 'catalog' | 'product';
}

function Thumbnail({ product, className }: { product: Product; className: string }) {
  const [failed, setFailed] = useState(false);
  const dim = product.inStock ? '' : 'opacity-50 grayscale';
  return (
    <div className={`relative overflow-hidden bg-tint ${className}`}>
      {failed ? (
        <span aria-hidden="true" className="flex h-full items-center justify-center text-4xl font-bold text-ink-muted">
          {product.category.charAt(0)}
        </span>
      ) : (
        <img
          src={product.thumbnailUrl}
          alt=""
          width={200}
          height={160}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain p-2 transition-transform duration-300 ease-out motion-safe:group-hover:scale-[1.06] ${dim}`}
        />
      )}
    </div>
  );
}

/** `compact` (phone list card) uses the short label so it fits beside the price. */
function StockLine({ product, id, compact = false }: { product: Product; id: string; compact?: boolean }) {
  const inCart = useCartQuantity(product.id);
  if (!product.inStock) {
    return (
      <p id={id} className="truncate text-sm font-semibold text-danger">
        {compact ? 'Out of stock' : 'Currently unavailable'}
      </p>
    );
  }
  return (
    <p id={id} className="truncate text-sm font-semibold text-success">
      In stock
      {inCart > 0 && (
        <span className="font-normal text-ink-muted">
          {' · '}
          {inCart} in cart{inCart >= MAX_QUANTITY ? ' (limit reached)' : ''}
        </span>
      )}
    </p>
  );
}

/**
 * The title is the product link; its ::after overlay makes the whole card clickable, while the
 * action buttons sit above it. Keyboard focus on the link draws the ring on that overlay, i.e.
 * around the whole card (no :has() selector, which is costly to keep in sync while scrolling).
 * Height is fixed by the grid row; every text line is clamped so long text cannot grow it.
 */
export const ProductCard = memo(function ProductCard({
  product,
  position,
  setSize,
  layout,
  onOpen,
  from = 'catalog',
}: ProductCardProps) {
  const titleId = useId();
  const stockId = useId();
  const { productContent } = useServices();
  const content = useMemo(() => productContent.contentFor(product), [productContent, product]);

  const listItem = {
    role: 'listitem',
    'aria-posinset': position,
    'aria-setsize': setSize,
    'aria-labelledby': titleId,
  } as const;
  // Hover (pointer devices only; Tailwind's hover: is gated on `(hover: hover)`, so touch
  // screens never get a stuck state): a 2px lift, a tinted border and a tighter shadow. All of
  // it stays within the row's 6px paint bleed, and the lift is skipped for reduced motion.
  const cardClass =
    'group relative transition-[box-shadow,border-color,transform] duration-200 ease-out ' +
    'hover:border-brand/45 hover:shadow-hover motion-safe:hover:-translate-y-0.5';

  const title = (
    <h3 id={titleId} className="line-clamp-2 h-10 text-sm leading-5 font-medium text-ink">
      <Link
        to={`/product/${product.id}`}
        state={{ from }}
        data-product-link={product.id}
        title={product.title}
        onClick={() => onOpen?.(product.id)}
        className="transition-colors group-hover:text-brand-ink group-hover:underline after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:outline-none focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
      >
        {product.title}
      </Link>
    </h3>
  );
  const brand = (
    <p className="truncate text-xs font-semibold tracking-wider text-ink-muted uppercase">{product.brand}</p>
  );
  const description = (
    <p className="line-clamp-2 h-8 text-xs leading-4 text-ink-muted">{content.description}</p>
  );
  const rating = <StarRating value={product.rating} reviewCount={content.reviewCount} />;

  if (layout === 'list') {
    return (
      <Card {...listItem} className={`flex h-full ${cardClass}`}>
        <Thumbnail product={product} className="w-20 shrink-0 rounded-l-card min-[360px]:w-28" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
          <div className="flex items-center justify-between gap-2">
            {brand}
            <Badge tone="brand" className="shrink-0">
              {product.category}
            </Badge>
          </div>
          {title}
          {description}
          {rating}
          <div className="flex items-center justify-between gap-2">
            <Price value={product.price} />
            <div className="min-w-0 text-right">
              <StockLine product={product} id={stockId} compact />
            </div>
          </div>
          <CardActions product={product} reasonId={stockId} className="mt-auto" />
        </div>
      </Card>
    );
  }

  return (
    <Card {...listItem} className={`flex h-full flex-col ${cardClass}`}>
      <div className="relative">
        <Thumbnail product={product} className="h-40 rounded-t-card" />
        <Badge className="absolute top-2 left-2">{product.category}</Badge>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-3">
        {brand}
        {title}
        {description}
        {rating}
        <Price value={product.price} />
        <StockLine product={product} id={stockId} />
        <CardActions product={product} reasonId={stockId} className="mt-auto" />
      </div>
    </Card>
  );
});
