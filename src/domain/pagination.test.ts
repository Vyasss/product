import { describe, expect, it } from 'vitest';
import { clampPage, pageBounds, pageCountFor, PAGE_SIZE } from './pagination';

describe('pagination', () => {
  it('fills whole rows at every column count the grid uses', () => {
    for (const columns of [1, 2, 3, 4, 5, 6]) expect(PAGE_SIZE % columns).toBe(0);
  });

  it.each([
    [0, 1],
    [1, 1],
    [60, 1],
    [61, 2],
    [5000, 84],
  ])('%i results make %i pages', (total, pages) => {
    expect(pageCountFor(total)).toBe(pages);
  });

  it('clamps a page past the end to the last page, and below 1 to 1', () => {
    expect(clampPage(9, 130)).toBe(3);
    expect(clampPage(0, 130)).toBe(1);
    expect(clampPage(5, 0)).toBe(1);
  });

  it('gives the slice of the result list for a page', () => {
    expect(pageBounds(1, 130)).toEqual({ start: 0, end: 60 });
    expect(pageBounds(2, 130)).toEqual({ start: 60, end: 120 });
    expect(pageBounds(3, 130)).toEqual({ start: 120, end: 130 });
  });
});
