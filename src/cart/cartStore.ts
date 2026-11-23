/**
 * Client-side cart. Framework-free: React reads it through `useSyncExternalStore`.
 * Only product ids and quantities are stored; prices always come from the dataset.
 */

export const MAX_QUANTITY = 10;
export const CART_STORAGE_KEY = 'allinone.cart.v1';

export interface CartLine {
  readonly productId: string;
  readonly quantity: number;
}

/** Where the serialised cart lives (localStorage in the app, memory in tests). */
export interface CartStorage {
  read: () => string | null;
  write: (value: string) => void;
  /** Calls `onChange` when another tab or window changed the stored value. */
  subscribe: (onChange: () => void) => () => void;
}

export interface CartStore {
  getLines: () => readonly CartLine[];
  subscribe: (listener: () => void) => () => void;
  quantityOf: (productId: string) => number;
  /** Adds up to MAX_QUANTITY in total and returns the resulting quantity. */
  add: (productId: string, quantity?: number) => number;
  /** Clamps to 1..MAX_QUANTITY; 0 or less removes the line. */
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Drops lines whose product id fails `keep` (unknown or unavailable products). */
  retain: (keep: (productId: string) => boolean) => void;
}

export const PRODUCT_ID = /^[\w-]{1,64}$/;

/** Whole number in 0..MAX_QUANTITY; anything invalid becomes 0 (meaning "none"). */
export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(quantity)));
}

/**
 * Total: never throws. Corrupt JSON, non-arrays, bad ids and bad quantities are dropped;
 * duplicate ids are merged and capped at MAX_QUANTITY.
 */
export function parseCartLines(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const merged = new Map<string, number>();
  for (const entry of data) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { id, quantity } = entry as Record<string, unknown>;
    if (typeof id !== 'string' || !PRODUCT_ID.test(id)) continue;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) continue;
    merged.set(id, Math.min(MAX_QUANTITY, (merged.get(id) ?? 0) + quantity));
  }
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

export function serializeCartLines(lines: readonly CartLine[]): string {
  return JSON.stringify(lines.map((line) => ({ id: line.productId, quantity: line.quantity })));
}

function sameLines(a: readonly CartLine[], b: readonly CartLine[]): boolean {
  return a.length === b.length && a.every((line, i) => line.productId === b[i]?.productId && line.quantity === b[i]?.quantity);
}

/**
 * One store per app. `getLines` returns the same array until something changes, as
 * `useSyncExternalStore` requires. Changes from other tabs arrive through `storage.subscribe`
 * and are applied without writing back.
 */
export function createCartStore(storage: CartStorage): CartStore {
  let lines: readonly CartLine[] = parseCartLines(storage.read());
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  const commit = (next: readonly CartLine[]) => {
    if (sameLines(lines, next)) return;
    lines = next;
    storage.write(serializeCartLines(next));
    emit();
  };

  storage.subscribe(() => {
    const next = parseCartLines(storage.read());
    if (sameLines(lines, next)) return;
    lines = next;
    emit();
  });

  const quantityOf = (productId: string) => lines.find((line) => line.productId === productId)?.quantity ?? 0;

  const setQuantity = (productId: string, quantity: number) => {
    const next = clampQuantity(quantity);
    if (next === 0) {
      commit(lines.filter((line) => line.productId !== productId));
    } else if (lines.some((line) => line.productId === productId)) {
      commit(lines.map((line) => (line.productId === productId ? { productId, quantity: next } : line)));
    } else if (PRODUCT_ID.test(productId)) {
      commit([...lines, { productId, quantity: next }]);
    }
  };

  return {
    getLines: () => lines,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    quantityOf,
    add: (productId, quantity = 1) => {
      setQuantity(productId, quantityOf(productId) + Math.max(1, Math.floor(quantity)));
      return quantityOf(productId);
    },
    setQuantity,
    remove: (productId) => commit(lines.filter((line) => line.productId !== productId)),
    clear: () => commit([]),
    retain: (keep) => commit(lines.filter((line) => keep(line.productId))),
  };
}

/** localStorage backend. Storage can be unavailable (private mode, blocked): then the cart is per-page only. */
export function localCartStorage(key: string = CART_STORAGE_KEY, target: Window = window): CartStorage {
  return {
    read: () => {
      try {
        return target.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        target.localStorage.setItem(key, value);
      } catch {
        // Quota exceeded or storage blocked: keep working in memory.
      }
    },
    subscribe: (onChange) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) onChange();
      };
      target.addEventListener('storage', onStorage);
      return () => target.removeEventListener('storage', onStorage);
    },
  };
}

export interface MemoryCartStorage extends CartStorage {
  /** Test helper: simulate another tab writing a value. */
  writeFromElsewhere: (value: string | null) => void;
}

/** In-memory backend for tests; can be shared between stores to simulate a reload. */
export function memoryCartStorage(initial: string | null = null): MemoryCartStorage {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    writeFromElsewhere: (next) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}
