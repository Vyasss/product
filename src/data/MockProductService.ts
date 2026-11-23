import type { Product } from '../domain/product';
import { generateProducts } from './generateProducts';
import { createFailurePolicy, type FailurePolicy } from './mockControls';
import { ApiError, createAbortError, type ProductService } from './ProductService';

export interface MockProductServiceOptions {
  /** Returns the delay in ms for one request. Defaults to 300-600 ms. Tests pass `() => 0`. */
  latency?: () => number;
  failurePolicy?: FailurePolicy;
  /** Called once, lazily, on the first request. Defaults to the 5,000-product dataset. */
  loadProducts?: () => readonly Product[];
}

export const MIN_LATENCY_MS = 300;
export const MAX_LATENCY_MS = 600;

export function defaultLatency(random: () => number = Math.random): number {
  return MIN_LATENCY_MS + Math.round(random() * (MAX_LATENCY_MS - MIN_LATENCY_MS));
}

/**
 * Simulates a remote product API: latency, simulated 500s, and abort support.
 * The dataset is generated once and the same frozen objects are returned on every
 * call, so product references stay stable across retries (memoised cards do not re-render).
 */
export class MockProductService implements ProductService {
  private readonly latency: () => number;
  private readonly failurePolicy: FailurePolicy;
  private readonly loadProducts: () => readonly Product[];
  private products: readonly Product[] | null = null;

  constructor(options: MockProductServiceOptions = {}) {
    this.latency = options.latency ?? (() => defaultLatency());
    this.failurePolicy = options.failurePolicy ?? createFailurePolicy();
    this.loadProducts = options.loadProducts ?? (() => generateProducts());
  }

  getProducts(signal?: AbortSignal): Promise<readonly Product[]> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(createAbortError());
        return;
      }

      const onAbort = () => {
        clearTimeout(timer);
        reject(createAbortError());
      };

      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        if (this.failurePolicy.shouldFail()) {
          reject(new ApiError('Simulated server error', 500));
          return;
        }
        this.products ??= this.loadProducts();
        resolve(this.products);
      }, this.latency());

      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}
