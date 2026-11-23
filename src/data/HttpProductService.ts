import { isCategory, type Product } from '../domain/product';
import { BadResponseError, TimeoutError } from './loadErrors';
import { ApiError, type ProductService } from './ProductService';

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * The seam for a real API: `GET ${baseUrl}/products` returning `Product[]`.
 * Not exercised against a live server in this project.
 *
 * Failure modes, each as a distinct error so the UI can explain it:
 * - no response in `timeoutMs` (headers or body): `TimeoutError`;
 * - non-2xx status: `ApiError` carrying the status (404, 429, 503, ...);
 * - 2xx with a body that is not JSON or not a list of products: `BadResponseError`;
 * - no response at all (offline, DNS, CORS): the `TypeError` from `fetch`, passed through;
 * - caller aborted: the `AbortError` from `fetch`, passed through.
 */
export class HttpProductService implements ProductService {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {}

  async getProducts(signal?: AbortSignal): Promise<readonly Product[]> {
    // One controller for both reasons to stop: the caller's signal and the time limit.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);
    const onCallerAbort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/products`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new ApiError(`Request failed with status ${response.status}`, response.status);
      }
      const body = await readJson(response);
      if (!Array.isArray(body) || !body.every(isProduct)) {
        throw new BadResponseError('The products response had an unexpected shape');
      }
      return body.map((product) => Object.freeze(product));
    } catch (error) {
      if (timedOut) throw new TimeoutError(`No response within ${this.timeoutMs} ms`);
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }
}

/** A body that is not JSON (an HTML error page served with 200, say) is a bad response, not a crash. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new BadResponseError('The products response was not valid JSON');
  }
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.brand === 'string' &&
    typeof p.category === 'string' &&
    isCategory(p.category) &&
    typeof p.price === 'number' &&
    Number.isFinite(p.price) &&
    typeof p.rating === 'number' &&
    typeof p.inStock === 'boolean' &&
    typeof p.thumbnailUrl === 'string'
  );
}
