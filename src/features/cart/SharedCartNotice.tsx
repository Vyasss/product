import { useId } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { CartSummary } from '../../cart/summary';
import { formatPrice, pluralizeProducts } from '../shared/format';

export interface SharedCartNoticeProps {
  /** The shared lines joined with the catalog; unknown and unavailable products are already left out. */
  shared: CartSummary;
  /** How many lines of the link could not be used (unknown or unavailable products). */
  skipped: number;
  onAdd: () => void;
  onDismiss: () => void;
}

/**
 * Shown on `/cart?items=...`. A shared link never changes the visitor's own cart by itself:
 * it lists what was shared and waits for them to add it or dismiss it.
 */
export function SharedCartNotice({ shared, skipped, onAdd, onDismiss }: SharedCartNoticeProps) {
  const headingId = useId();
  const empty = shared.items.length === 0;
  return (
    <section aria-labelledby={headingId} className="mb-6">
      <Card className="border-brand p-5">
        <h2 id={headingId} className="text-lg font-bold text-ink">
          {empty ? 'This shared cart has nothing available' : 'Someone shared a cart with you'}
        </h2>
        {empty ? (
          <p className="mt-2 text-sm text-ink-muted">
            The products in this link are unknown or currently unavailable.
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-1 text-sm text-ink">
              {shared.items.map((item) => (
                <li key={item.product.id} className="flex justify-between gap-4">
                  <span className="min-w-0 truncate">
                    {item.product.title} × {item.quantity}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPrice(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-ink">
              {pluralizeProducts(shared.count)} · {formatPrice(shared.total)}
            </p>
            {skipped > 0 && (
              <p className="mt-1 text-sm text-ink-muted">
                {skipped === 1 ? '1 product in the link is' : `${skipped} products in the link are`} unknown or
                unavailable and left out.
              </p>
            )}
          </>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {!empty && (
            <Button variant="primary" onClick={onAdd}>
              Add these to my cart
            </Button>
          )}
          <Button onClick={onDismiss}>Dismiss</Button>
        </div>
      </Card>
    </section>
  );
}
