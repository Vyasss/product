import { describe, expect, it, vi } from 'vitest';
import { FIXTURE_PRODUCTS } from '../test/fixtures';
import {
  clampQuantity,
  createCartStore,
  localCartStorage,
  MAX_QUANTITY,
  memoryCartStorage,
  parseCartLines,
  serializeCartLines,
} from './cartStore';
import { summarizeCart } from './summary';

const byId = new Map(FIXTURE_PRODUCTS.map((product) => [product.id, product]));
const lookup = (id: string) => byId.get(id);

describe('cart store', () => {
  it('adds, accumulates and reports quantities', () => {
    const store = createCartStore(memoryCartStorage());
    expect(store.add('p-1')).toBe(1);
    expect(store.add('p-1', 2)).toBe(3);
    expect(store.add('p-4')).toBe(1);
    expect(store.getLines()).toEqual([
      { productId: 'p-1', quantity: 3 },
      { productId: 'p-4', quantity: 1 },
    ]);
    expect(store.quantityOf('p-1')).toBe(3);
    expect(store.quantityOf('p-99')).toBe(0);
  });

  it('caps quantity at the maximum and removes at zero', () => {
    const store = createCartStore(memoryCartStorage());
    expect(store.add('p-1', 50)).toBe(MAX_QUANTITY);
    store.setQuantity('p-1', 3.7);
    expect(store.quantityOf('p-1')).toBe(3);
    store.setQuantity('p-1', 0);
    expect(store.getLines()).toEqual([]);
    store.setQuantity('p-2', -4);
    expect(store.getLines()).toEqual([]);
  });

  it('removes one line, clears all, and retains only known products', () => {
    const store = createCartStore(memoryCartStorage());
    store.add('p-1');
    store.add('p-2');
    store.add('ghost-id');
    store.remove('p-2');
    expect(store.getLines().map((l) => l.productId)).toEqual(['p-1', 'ghost-id']);
    store.retain((id) => byId.has(id));
    expect(store.getLines().map((l) => l.productId)).toEqual(['p-1']);
    store.clear();
    expect(store.getLines()).toEqual([]);
  });

  it('keeps the same snapshot until something changes, and notifies subscribers', () => {
    const store = createCartStore(memoryCartStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.getLines();
    store.remove('nothing');
    expect(store.getLines()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    store.add('p-1');
    expect(store.getLines()).not.toBe(before);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.add('p-1');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('persists ids and quantities only, and reloads them in a new store', () => {
    const storage = memoryCartStorage();
    createCartStore(storage).add('p-1', 2);
    expect(storage.read()).toBe('[{"id":"p-1","quantity":2}]');
    expect(createCartStore(storage).getLines()).toEqual([{ productId: 'p-1', quantity: 2 }]);
  });

  it('applies changes made in another tab without writing them back', () => {
    const storage = memoryCartStorage();
    const store = createCartStore(storage);
    const write = vi.spyOn(storage, 'write');
    const listener = vi.fn();
    store.subscribe(listener);
    storage.writeFromElsewhere('[{"id":"p-4","quantity":5}]');
    expect(store.getLines()).toEqual([{ productId: 'p-4', quantity: 5 }]);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('parseCartLines', () => {
  it.each<[string, string | null]>([
    ['missing value', null],
    ['corrupt JSON', '{not json'],
    ['an object instead of an array', '{"id":"p-1","quantity":1}'],
    ['a string', '"p-1"'],
  ])('returns an empty cart for %s', (_name, raw) => {
    expect(parseCartLines(raw)).toEqual([]);
  });

  it('drops bad entries and merges duplicates', () => {
    const raw = JSON.stringify([
      { id: 'p-1', quantity: 2 },
      { id: 'p-1', quantity: 9 },
      { id: 'p-2', quantity: 0 },
      { id: 'p-3', quantity: 1.5 },
      { id: 'p-4', quantity: '2' },
      { id: 42, quantity: 1 },
      { id: '<script>', quantity: 1 },
      null,
      { id: 'p-5', quantity: 1 },
    ]);
    expect(parseCartLines(raw)).toEqual([
      { productId: 'p-1', quantity: MAX_QUANTITY },
      { productId: 'p-5', quantity: 1 },
    ]);
  });

  it('round-trips with serializeCartLines', () => {
    const lines = [{ productId: 'p-00042', quantity: 3 }];
    expect(parseCartLines(serializeCartLines(lines))).toEqual(lines);
  });

  it('clamps quantities', () => {
    expect([clampQuantity(-1), clampQuantity(2.9), clampQuantity(99), clampQuantity(Number.NaN)]).toEqual([
      0,
      2,
      MAX_QUANTITY,
      0,
    ]);
  });
});

describe('localCartStorage', () => {
  it('reads and writes window.localStorage and follows storage events for its key', () => {
    window.localStorage.clear();
    const storage = localCartStorage('test.cart');
    storage.write('[{"id":"p-1","quantity":1}]');
    expect(window.localStorage.getItem('test.cart')).toBe('[{"id":"p-1","quantity":1}]');

    const onChange = vi.fn();
    const unsubscribe = storage.subscribe(onChange);
    window.dispatchEvent(new StorageEvent('storage', { key: 'other.key' }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'test.cart' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('survives storage that throws', () => {
    const broken = {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('quota');
        },
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as Window;
    const storage = localCartStorage('x', broken);
    expect(storage.read()).toBeNull();
    expect(() => storage.write('[]')).not.toThrow();
    expect(createCartStore(storage).add('p-1')).toBe(1);
  });
});

describe('summarizeCart', () => {
  it('computes line totals and the grand total from dataset prices', () => {
    const summary = summarizeCart(
      [
        { productId: 'p-1', quantity: 2 }, // 2,499
        { productId: 'p-8', quantity: 3 }, // 399
      ],
      lookup,
    );
    expect(summary.items.map((item) => item.lineTotal)).toEqual([4998, 1197]);
    expect(summary.count).toBe(5);
    expect(summary.total).toBe(6195);
  });

  it('leaves out unknown and unavailable products', () => {
    const summary = summarizeCart(
      [
        { productId: 'ghost', quantity: 2 },
        { productId: 'p-3', quantity: 1 }, // out of stock
        { productId: 'p-4', quantity: 1 },
      ],
      lookup,
    );
    expect(summary.items.map((item) => item.product.id)).toEqual(['p-4']);
    expect(summary.total).toBe(2999);
  });
});
