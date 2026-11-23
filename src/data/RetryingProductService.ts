import type { Product } from '../domain/product';
import { classifyLoadError, isRetryLikelyToHelp, type LoadErrorKind } from './loadErrors';
import { createAbortError, isAbortError, type ProductService } from './ProductService';

export interface RetryOptions {
  /** Extra attempts after the first one. */
  retries?: number;
  /** Delay before the first retry; it doubles each time. */
  baseDelayMs?: number;
  /** Returns a number in [0, 1); spreads retries so many clients do not retry in step. */
  random?: () => number;
  isOnline?: () => boolean;
}

export const DEFAULT_RETRIES = 2;
export const DEFAULT_BASE_DELAY_MS = 400;

/** Kinds worth retrying without the user: brief server or network trouble. */
const AUTO_RETRY: ReadonlySet<LoadErrorKind> = new Set(['network', 'timeout', 'unavailable', 'server', 'rate-limited']);

/** Delay before retry number `attempt` (1-based): base x 2^(attempt-1), plus up to 50% jitter. */
export function retryDelay(attempt: number, baseDelayMs: number, random: () => number): number {
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  return Math.round(exponential * (1 + random() * 0.5));
}

/**
 * Wraps any `ProductService` so that a short-lived failure (a 503 during a deploy, a dropped
 * connection, a slow response) is retried quietly with exponential backoff, and the user only
 * sees an error if it persists. Errors that retrying cannot fix (404, 401/403, other 4xx, an
 * unreadable response) and being offline fail at once. Aborting stops waiting immediately.
 *
 * Used for the real API only. The mock service is left unwrapped on purpose: its simulated
 * failure must reach the screen so the error state and Retry button can be seen.
 */
export class RetryingProductService implements ProductService {
  private readonly retries: number;
  private readonly baseDelayMs: number;
  private readonly random: () => number;
  private readonly isOnline: () => boolean;

  constructor(
    private readonly inner: ProductService,
    options: RetryOptions = {},
  ) {
    this.retries = options.retries ?? DEFAULT_RETRIES;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.random = options.random ?? Math.random;
    this.isOnline = options.isOnline ?? (() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  }

  async getProducts(signal?: AbortSignal): Promise<readonly Product[]> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.inner.getProducts(signal);
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw error;
        const kind = classifyLoadError(error, this.isOnline());
        if (attempt >= this.retries || !AUTO_RETRY.has(kind) || !isRetryLikelyToHelp(kind)) throw error;
        await wait(retryDelay(attempt + 1, this.baseDelayMs, this.random), signal);
      }
    }
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(createAbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
