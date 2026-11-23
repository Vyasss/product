import { useId, useMemo, useRef, type Ref } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { Badge } from '../../components/ui/Badge';
import { buttonClassName } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ArrowLeftIcon, CheckIcon } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { StarRating } from '../../components/ui/StarRating';
import type { Product } from '../../domain/product';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { useServices } from '../../hooks/useServices';
import { PurchasePanel } from '../cart/PurchasePanel';
import { ErrorState } from '../catalog/ErrorState';
import { Price } from '../catalog/Price';
import { CARD_HEIGHT_REM } from '../catalog/ProductGrid';
import { ProductCard } from '../catalog/ProductCard';
import { StateMessage } from '../catalog/StateMessage';
import { StorePage } from '../shell/StorePage';
import { relatedProducts } from './related';

function BackAction() {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from;
  const className = `${buttonClassName('ghost', '-ml-2 px-2')} mb-4`;
  if (from === 'catalog' || from === 'product') {
    // Real history Back: the catalog restores its filters (URL) and scroll position.
    return (
      <button type="button" className={className} onClick={() => void navigate(-1)}>
        <ArrowLeftIcon className="size-4" />
        {from === 'catalog' ? 'Back to results' : 'Back'}
      </button>
    );
  }
  return (
    <Link to="/" className={className}>
      <ArrowLeftIcon className="size-4" />
      Back to the catalog
    </Link>
  );
}

function RelatedStrip({ title, products }: { title: string; products: readonly Product[] }) {
  const headingId = useId();
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="mt-12">
      <h2 id={headingId} className="mb-4 text-xl font-bold text-ink">
        {title}
      </h2>
      <div role="list" className="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4">
        {products.map((product, index) => (
          <div key={product.id} role="presentation" style={{ height: `${CARD_HEIGHT_REM}rem` }}>
            <ProductCard product={product} position={index + 1} setSize={products.length} layout="grid" from="product" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductDetail({ product, headingRef }: { product: Product; headingRef: Ref<HTMLHeadingElement> }) {
  const { productContent } = useServices();
  const { products } = useCatalogData();
  const content = useMemo(() => productContent.contentFor(product), [productContent, product]);
  const related = useMemo(
    () => relatedProducts(product, products.status === 'success' ? products.products : []),
    [product, products],
  );
  const titleId = useId();

  return (
    <>
      <article aria-labelledby={titleId} className="grid gap-8 md:grid-cols-2 md:gap-12">
        <Card className="flex aspect-[5/4] items-center justify-center overflow-hidden bg-tint p-6">
          <img
            src={product.thumbnailUrl}
            alt=""
            width={400}
            height={320}
            className={`h-full w-full object-contain ${product.inStock ? '' : 'opacity-50 grayscale'}`}
          />
        </Card>
        <div>
          <p className="text-sm font-semibold tracking-wider text-ink-muted uppercase">{product.brand}</p>
          <h1
            id={titleId}
            ref={headingRef}
            tabIndex={-1}
            className="mt-1 text-2xl font-bold text-ink focus:outline-none md:text-3xl"
          >
            {product.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone="brand">{product.category}</Badge>
            <StarRating value={product.rating} reviewCount={content.reviewCount} />
          </div>
          <Price value={product.price} size="lg" className="mt-5" />
          <p className={`mt-2 text-base font-semibold ${product.inStock ? 'text-success' : 'text-danger'}`}>
            {product.inStock ? 'In stock' : 'Currently unavailable'}
          </p>
          <p className="mt-5 text-base text-ink">{content.description}</p>
          <h2 className="mt-5 text-sm font-bold tracking-wide text-ink uppercase">Highlights</h2>
          <ul className="mt-2 space-y-1.5">
            {content.highlights.map((highlight) => (
              <li key={highlight} className="flex items-start gap-2 text-sm text-ink">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                {highlight}
              </li>
            ))}
          </ul>
          <PurchasePanel product={product} />
          <p className="mt-3 text-xs text-ink-muted">
            Description, highlights and review count are generated demo content.
          </p>
        </div>
      </article>
      <RelatedStrip title={`More from ${product.brand}`} products={related.sameBrand} />
      <RelatedStrip title={`More in ${product.category}`} products={related.sameCategory} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12">
      <span className="sr-only">Loading product…</span>
      <Skeleton className="aspect-[5/4] w-full rounded-card" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

/** `/product/:id` (lazy-loaded add-on). Only the eight Product fields plus generated content. */
export default function ProductPage() {
  const { id = '' } = useParams();
  const { products, byId } = useCatalogData();
  const product = byId?.get(id) ?? null;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const settled = products.status !== 'loading';

  useDocumentTitle(product ? product.title : settled ? 'Product not found' : 'Loading product');
  useFocusOnNavigation(headingRef, settled, true);

  return (
    <StorePage>
      {/* The not-found state has its own link back, so the top one would be a duplicate. */}
      {!(products.status === 'success' && !product) && <BackAction />}
      {products.status === 'loading' && <DetailSkeleton />}
      {products.status === 'error' && (
        <ErrorState error={products.error} retrying={products.retrying} onRetry={products.retry} />
      )}
      {products.status === 'success' && !product && (
        <StateMessage
          headingLevel="h1"
          headingRef={headingRef}
          illustration={<span aria-hidden="true" className="text-5xl font-bold text-ink-muted">?</span>}
          title="Product not found"
          action={
            <Link to="/" className={buttonClassName('primary')}>
              Back to the catalog
            </Link>
          }
        >
          <p>There is no product with the id “{id}”. It may have been removed, or the link is mistyped.</p>
        </StateMessage>
      )}
      {product && <ProductDetail key={product.id} product={product} headingRef={headingRef} />}
    </StorePage>
  );
}
