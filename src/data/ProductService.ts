import type { Product } from '../domain/product';

/** Where product data comes from. The UI depends on this interface only. */
export interface ProductService {
  /** Resolves with the full catalog. Rejects with an `AbortError` if `signal` aborts. */
  getProducts(signal?: AbortSignal): Promise<readonly Product[]>;
}

/** A failed API response, carrying the HTTP status (500 for the simulated failure). */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function createAbortError(): DOMException {
  return new DOMException('The request was aborted.', 'AbortError');
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
