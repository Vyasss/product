export type PageItem = number | 'gap';

/**
 * Page buttons to show: always the first and last page, the current page with one neighbour
 * on each side, and a gap marker where pages are skipped. Short ranges are shown in full.
 * A gap never stands in for a single page: "1 2 3" is shown instead of "1 … 3".
 *
 *   pageItems(1, 84)  → 1 2 … 84
 *   pageItems(5, 84)  → 1 … 4 5 6 … 84
 *   pageItems(84, 84) → 1 … 83 84
 */
export function pageItems(current: number, count: number): PageItem[] {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);

  const wanted = new Set([1, count, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 1 && page <= count).sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;
  for (const page of pages) {
    if (page - previous === 2) items.push(previous + 1);
    else if (page - previous > 2) items.push('gap');
    items.push(page);
    previous = page;
  }
  return items;
}
