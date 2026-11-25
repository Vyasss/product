/**
 * Products per page. 60 is a whole number of rows at every column count the grid uses
 * (1 to 6), so no page ends on a half-empty row.
 */
export const PAGE_SIZE = 60;

/** Highest page number the URL parser accepts; larger values are treated as page 1. */
export const MAX_PAGE = 10_000;

/** At least one page, so an empty result still has "page 1 of 1". */
export function pageCountFor(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** A requested page that is past the end (e.g. after a filter shrank the list) shows the last page. */
export function clampPage(page: number, total: number, pageSize: number = PAGE_SIZE): number {
  return Math.min(Math.max(1, page), pageCountFor(total, pageSize));
}

/** Zero-based [start, end) positions in the result list for a page that is already clamped. */
export function pageBounds(page: number, total: number, pageSize: number = PAGE_SIZE): { start: number; end: number } {
  const start = (page - 1) * pageSize;
  return { start, end: Math.min(total, start + pageSize) };
}
