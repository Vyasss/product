import { describe, expect, it } from 'vitest';
import { MAX_QUANTITY } from './cartStore';
import { MAX_SHARED_LINES, parseSharedCart, serializeSharedCart } from './sharedCart';

describe('shared cart link', () => {
  it('round-trips ids and quantities', () => {
    const lines = [
      { productId: 'p-00042', quantity: 2 },
      { productId: 'p-00100', quantity: 1 },
    ];
    expect(serializeSharedCart(lines)).toBe('p-00042:2,p-00100:1');
    expect(parseSharedCart(serializeSharedCart(lines))).toEqual(lines);
  });

  it('treats a missing quantity as 1 and tolerates spaces', () => {
    expect(parseSharedCart('p-00001, p-00002:3')).toEqual([
      { productId: 'p-00001', quantity: 1 },
      { productId: 'p-00002', quantity: 3 },
    ]);
  });

  it.each([
    ['empty', ''],
    ['null', null],
    ['zero quantity', 'p-00001:0'],
    ['negative quantity', 'p-00001:-2'],
    ['non-numeric quantity', 'p-00001:abc'],
    ['fractional quantity', 'p-00001:1.5'],
    ['script in the id', '<script>alert(1)</script>:1'],
    ['too many parts', 'p-00001:1:1'],
    ['only separators', ',,,'],
  ])('drops bad input: %s', (_name, raw) => {
    expect(parseSharedCart(raw)).toEqual([]);
  });

  it('keeps the valid entries around bad ones', () => {
    expect(parseSharedCart('p-00001:2,bad id:1,p-00002:x,p-00003')).toEqual([
      { productId: 'p-00001', quantity: 2 },
      { productId: 'p-00003', quantity: 1 },
    ]);
  });

  it('merges duplicates and caps the quantity', () => {
    expect(parseSharedCart('p-00001:6,p-00001:7')).toEqual([{ productId: 'p-00001', quantity: MAX_QUANTITY }]);
    expect(parseSharedCart('p-00001:999')).toEqual([{ productId: 'p-00001', quantity: MAX_QUANTITY }]);
  });

  it('reads at most MAX_SHARED_LINES distinct products', () => {
    const raw = Array.from({ length: MAX_SHARED_LINES + 20 }, (_, i) => `p-${i}:1`).join(',');
    expect(parseSharedCart(raw)).toHaveLength(MAX_SHARED_LINES);
  });
});
