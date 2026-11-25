import { useEffect, useMemo } from 'react';
import type { Product } from '../domain/product';
import type { SearchEngine, SearchEngineFactory } from '../search/SearchEngine';
import { useServices } from './useServices';

/**
 * One engine per product list (and factory). The catalog is loaded once for the whole app,
 * so the catalog page and the header search on other pages share it: going back to the
 * catalog, or typing in the header after visiting it, never rebuilds the index.
 */
const engines = new WeakMap<readonly Product[], Map<SearchEngineFactory, SearchEngine>>();

export function searchEngineFor(products: readonly Product[], create: SearchEngineFactory): SearchEngine {
  let byFactory = engines.get(products);
  if (!byFactory) {
    byFactory = new Map();
    engines.set(products, byFactory);
  }
  let engine = byFactory.get(create);
  if (!engine) {
    engine = create(products);
    byFactory.set(create, engine);
  }
  return engine;
}

/** Run `task` when the browser is idle (or soon, where `requestIdleCallback` is missing). */
export function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(task, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, 200);
  return () => window.clearTimeout(handle);
}

/**
 * The shared search engine for `products` (null while there are none). Suggestion data is
 * built in idle time, not on the first keystroke: that build is the one piece of search work
 * that would otherwise run in the urgent render, where `useDeferredValue` cannot help.
 */
export function useSearchEngine(products: readonly Product[] | null): SearchEngine | null {
  const { createSearchEngine } = useServices();
  const engine = useMemo(
    () => (products ? searchEngineFor(products, createSearchEngine) : null),
    [products, createSearchEngine],
  );
  useEffect(() => {
    if (!engine?.prepareSuggestions) return;
    return whenIdle(() => engine.prepareSuggestions?.());
  }, [engine]);
  return engine;
}
