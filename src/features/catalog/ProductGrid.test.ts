import { describe, expect, it } from 'vitest';
import { CARD_HEIGHT_REM, columnsForWidth, layoutForColumns, LIST_CARD_HEIGHT_REM, withPinnedRow } from './ProductGrid';

describe('columnsForWidth', () => {
  it.each([
    [0, 1], // not measured yet
    [200, 1], // narrower than one card still shows one column
    [390, 1], // phone
    [456, 2],
    [768, 3],
    [1100, 4],
    [5000, 6], // capped
  ])('%ipx wide gives %i columns (16px gap)', (width, columns) => {
    expect(columnsForWidth(width, 16)).toBe(columns);
  });
});

describe('layoutForColumns', () => {
  it('uses compact list cards for one column and taller grid cards otherwise', () => {
    expect(layoutForColumns(1)).toEqual({ layout: 'list', heightRem: LIST_CARD_HEIGHT_REM });
    expect(layoutForColumns(3)).toEqual({ layout: 'grid', heightRem: CARD_HEIGHT_REM });
  });
});

describe('withPinnedRow (keeps the focused row mounted)', () => {
  it('adds the focused row when it is outside the visible range, keeping order', () => {
    expect(withPinnedRow([10, 11, 12, 13], 2, 100)).toEqual([2, 10, 11, 12, 13]);
    expect(withPinnedRow([10, 11, 12], 40, 100)).toEqual([10, 11, 12, 40]);
  });

  it('changes nothing when the row is already visible, missing or out of range', () => {
    expect(withPinnedRow([1, 2, 3], 2, 100)).toEqual([1, 2, 3]);
    expect(withPinnedRow([1, 2, 3], null, 100)).toEqual([1, 2, 3]);
    expect(withPinnedRow([1, 2, 3], 120, 100)).toEqual([1, 2, 3]);
    expect(withPinnedRow([1, 2, 3], -1, 100)).toEqual([1, 2, 3]);
  });
});
