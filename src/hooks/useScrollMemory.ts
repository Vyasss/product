import { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

export interface ScrollEntry {
  y: number;
  /** The product opened from this view, so focus can return to its link. */
  productId: string | null;
}

const STORAGE_KEY = 'allinone.scroll.v1';
const MAX_ENTRIES = 50;

function readAll(): Record<string, ScrollEntry> {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, ScrollEntry>) : {};
  } catch {
    return {};
  }
}

function write(key: string, entry: ScrollEntry): void {
  try {
    const all = readAll();
    delete all[key];
    all[key] = entry;
    const keys = Object.keys(all);
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete all[old];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: Back simply starts at the top.
  }
}

function isEntry(value: unknown): value is ScrollEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.y === 'number' && Number.isFinite(entry.y) && (entry.productId === null || typeof entry.productId === 'string');
}

/**
 * Remembers the window scroll position per history entry (React Router's `location.key`,
 * kept in sessionStorage so it also survives a reload). On a Back/Forward (POP) arrival it
 * returns the saved entry once, for the page to restore after its content has laid out.
 * The browser's own restoration is switched off in main.tsx because it runs before the
 * virtualised list has its height.
 */
export function useScrollMemory(): { restore: ScrollEntry | null; rememberProduct: (productId: string) => void } {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const [restore] = useState<ScrollEntry | null>(() => {
    if (navigationType !== NavigationType.Pop) return null;
    const saved = readAll()[key];
    return isEntry(saved) ? saved : null;
  });
  const productRef = useRef<string | null>(restore?.productId ?? null);

  useEffect(() => {
    // Debounced: storage writes on every scroll frame showed up in throttled profiles.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => write(key, { y: window.scrollY, productId: productRef.current }), 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [key]);

  const rememberProduct = useCallback(
    (productId: string) => {
      productRef.current = productId;
      write(key, { y: window.scrollY, productId });
    },
    [key],
  );

  return { restore, rememberProduct };
}
