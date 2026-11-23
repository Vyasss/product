import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAbortError, type ProductService } from '../data/ProductService';
import type { Product } from '../domain/product';

export type ProductsState =
  | { status: 'loading' }
  | { status: 'error'; error: Error; retrying: boolean }
  | { status: 'success'; products: readonly Product[] };

export type UseProductsResult = ProductsState & {
  /** Refetch. From the error state the error stays visible with `retrying: true`. */
  retry: () => void;
};

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * Loads the catalog once per `service` and on every `retry()`. The in-flight request is
 * aborted on unmount and before each retry; aborts are never surfaced as errors.
 */
export function useProducts(service: ProductService): UseProductsResult {
  const [state, setState] = useState<ProductsState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    service.getProducts(controller.signal).then(
      (products) => {
        if (!controller.signal.aborted) setState({ status: 'success', products });
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setState({ status: 'error', error: toError(error), retrying: false });
      },
    );
    return () => controller.abort();
  }, [service, attempt]);

  const retry = useCallback(() => {
    setState((current) =>
      current.status === 'error' ? { ...current, retrying: true } : { status: 'loading' },
    );
    setAttempt((n) => n + 1);
  }, []);

  return useMemo(() => ({ ...state, retry }), [state, retry]);
}
