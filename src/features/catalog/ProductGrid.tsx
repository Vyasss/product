import { defaultRangeExtractor, useWindowVirtualizer, type Range } from '@tanstack/react-virtual';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Product } from '../../domain/product';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import { useFeatures } from '../../hooks/useServices';
import type { ScrollEntry } from '../../hooks/useScrollMemory';
import { ProductCard, type CardLayout } from './ProductCard';

export interface ProductGridProps {
  products: readonly Product[];
  /** Positions into `products`, in display order. */
  indices: readonly number[];
  /** Changes whenever the filters change; the window scrolls back to the list top. */
  resetKey: string;
  /** Saved position to restore once (Back/Forward), and the product link to refocus. */
  restore?: ScrollEntry | null;
  onOpenProduct?: (productId: string) => void;
}

/** Grid card height (multi-column rows) with the Add to cart / Buy now row, in rem. */
export const CARD_HEIGHT_REM = 26.5;
/** List card height (one column: image left, details right) with the button row, in rem. */
export const LIST_CARD_HEIGHT_REM = 15.5;
/**
 * How much shorter a card is without the Add to cart / Buy now row, so the last line sits on
 * the card's bottom padding (measured in Chrome at 1440, 390 and 320 px).
 */
export const CARD_ACTIONS_REM = { grid: 3.125, list: 3.875 } as const;
export const GAP_REM = 1;
const MIN_CARD_WIDTH_PX = 220;
const MAX_COLUMNS = 6;
// Two rows each side: enough for keyboard Tab and fast scrolling, fewer DOM nodes to mount.
const OVERSCAN_ROWS = 2;
/** Room around each contained row for the focus ring (3px ring + 2px offset). */
const ROW_BLEED_PX = 6;

function readRootFontSize(): number {
  if (typeof window === 'undefined') return 16;
  const size = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(size) && size > 0 ? size : 16;
}

/** Fixed card height for a layout; cards without the cart buttons are shorter. */
export function cardHeightRem(layout: CardLayout, withActions: boolean): number {
  const full = layout === 'list' ? LIST_CARD_HEIGHT_REM : CARD_HEIGHT_REM;
  return withActions ? full : full - CARD_ACTIONS_REM[layout];
}

export function layoutForColumns(columns: number, withActions = true): { layout: CardLayout; heightRem: number } {
  const layout: CardLayout = columns === 1 ? 'list' : 'grid';
  return { layout, heightRem: cardHeightRem(layout, withActions) };
}

export function columnsForWidth(width: number, gapPx: number): number {
  if (width <= 0) return 1;
  const columns = Math.floor((width + gapPx) / (MIN_CARD_WIDTH_PX + gapPx));
  return Math.min(MAX_COLUMNS, Math.max(1, columns));
}

/**
 * The rows to render: the virtualizer's visible range plus the row that holds keyboard focus,
 * so scrolling away never unmounts the focused element (which would drop focus to <body>).
 */
export function withPinnedRow(rows: readonly number[], pinned: number | null, count: number): number[] {
  if (pinned === null || pinned < 0 || pinned >= count || rows.includes(pinned)) return [...rows];
  return [...rows, pinned].sort((a, b) => a - b);
}

/**
 * Window-scrolled, row-virtualised grid: only the rows near the viewport are in the DOM
 * (typically 20 to 40 cards), whatever the result count. Card height is fixed in rem, so row
 * offsets are computed, not measured, and scrolling never triggers layout reads per card.
 */
export const ProductGrid = memo(function ProductGrid({
  products,
  indices,
  resetKey,
  restore = null,
  onOpenProduct,
}: ProductGridProps) {
  const [containerRef, { width, offsetTop }] = useContainerWidth<HTMLDivElement>();
  const [rootFontSize] = useState(readRootFontSize);
  const [focusedRow, setFocusedRow] = useState<number | null>(null);

  const gapPx = GAP_REM * rootFontSize;
  const columns = columnsForWidth(width, gapPx);
  const { cart } = useFeatures();
  const { layout, heightRem } = layoutForColumns(columns, cart);
  const cardHeightPx = heightRem * rootFontSize;
  const total = indices.length;
  const rowCount = Math.ceil(total / columns);

  const rangeExtractor = useCallback(
    (range: Range) => withPinnedRow(defaultRangeExtractor(range), focusedRow, range.count),
    [focusedRow],
  );

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => cardHeightPx + gapPx,
    overscan: OVERSCAN_ROWS,
    scrollMargin: offsetTop,
    rangeExtractor,
    // Let React batch scroll-driven renders into the next frame instead of rendering
    // synchronously inside every scroll event (measured: big win under CPU throttling).
    useFlushSync: false,
  });

  // Back to the top of the list when filters change, but not on first render.
  const previousKey = useRef(resetKey);
  useEffect(() => {
    if (previousKey.current === resetKey) return;
    previousKey.current = resetKey;
    setFocusedRow(null);
    // Scroll to the very top: with the sticky header and results bar, the list start is
    // only fully visible from there.
    if (window.scrollY > offsetTop) window.scrollTo({ top: 0 });
  }, [resetKey, offsetTop]);

  // Back/Forward: restore the saved position once the container has its real width (so the
  // column count and total height are final), then return focus to the product link.
  const restored = useRef(false);
  useEffect(() => {
    if (!restore || restored.current || width === 0) return undefined;
    restored.current = true;
    let frame = requestAnimationFrame(() => {
      window.scrollTo({ top: restore.y });
      let attempts = 0;
      const focusLink = () => {
        const link = restore.productId
          ? document.querySelector<HTMLElement>(`[data-product-link="${CSS.escape(restore.productId)}"]`)
          : null;
        if (link) link.focus({ preventScroll: true });
        else if (attempts++ < 10) frame = requestAnimationFrame(focusLink);
      };
      frame = requestAnimationFrame(focusLink);
    });
    return () => cancelAnimationFrame(frame);
  }, [restore, width]);

  // Track which row holds keyboard focus (native focusin/focusout bubble from the cards).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;
    const onFocusIn = (event: FocusEvent) => {
      const row = event.target instanceof Element ? event.target.closest('[data-row]') : null;
      if (row) setFocusedRow(Number(row.getAttribute('data-row')));
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node && list.contains(event.relatedTarget))) setFocusedRow(null);
    };
    list.addEventListener('focusin', onFocusIn);
    list.addEventListener('focusout', onFocusOut);
    return () => {
      list.removeEventListener('focusin', onFocusIn);
      list.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <div
        ref={listRef}
        role="list"
        aria-label="Products"
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const cells = [];
          const first = row.index * columns;
          for (let position = first; position < Math.min(first + columns, total); position++) {
            const product = products[indices[position] ?? -1];
            if (product) {
              cells.push(
                <ProductCard
                  key={product.id}
                  product={product}
                  position={position + 1}
                  setSize={total}
                  layout={layout}
                  {...(onOpenProduct ? { onOpen: onOpenProduct } : {})}
                />,
              );
            }
          }
          return (
            <div
              key={row.key}
              role="presentation"
              data-row={row.index}
              // Fixed-size rows with strict containment (measured: by far the biggest win for
              // scrolling under CPU throttling). Paint containment clips at the row's padding box,
              // so each row gets ROW_BLEED px of padding on every side (and is shifted back by
              // the same amount): the cards' 3px focus ring plus offset fits inside it.
              className="absolute top-0 grid [contain:strict]"
              style={{
                left: -ROW_BLEED_PX,
                width: `calc(100% + ${ROW_BLEED_PX * 2}px)`,
                padding: ROW_BLEED_PX,
                height: cardHeightPx + ROW_BLEED_PX * 2,
                gap: gapPx,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                transform: `translateY(${row.start - offsetTop - ROW_BLEED_PX}px)`,
              }}
            >
              {cells}
            </div>
          );
        })}
      </div>
    </div>
  );
});
