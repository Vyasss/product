import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../domain/product';
import { HttpProductService } from './HttpProductService';
import {
  BadResponseError,
  classifyLoadError,
  isRetryLikelyToHelp,
  TimeoutError,
  type LoadErrorKind,
} from './loadErrors';
import { ApiError, isAbortError } from './ProductService';

const PRODUCT: Product = {
  id: 'p-1',
  title: 'Trail Running Shoes',
  brand: 'Stridex',
  category: 'Sports',
  price: 2999,
  rating: 4.4,
  inStock: true,
  thumbnailUrl: '/t.svg',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const serviceWith = (fetchImpl: typeof fetch, timeoutMs?: number) =>
  new HttpProductService('https://api.example.test', fetchImpl, timeoutMs);

describe('HttpProductService', () => {
  it('requests /products and returns frozen products', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json([PRODUCT]));
    const products = await serviceWith(fetchImpl).getProducts();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://api.example.test/products');
    expect(products).toEqual([PRODUCT]);
    expect(Object.isFrozen(products[0])).toBe(true);
  });

  it.each([400, 401, 403, 404, 408, 429, 500, 502, 503, 504])(
    'turns HTTP %i into an ApiError carrying that status',
    async (status) => {
      const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json({ message: 'no' }, status));
      const error: unknown = await serviceWith(fetchImpl).getProducts().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status });
    },
  );

  it.each([
    ['an HTML page served with 200', new Response('<!doctype html><html></html>', { status: 200 })],
    ['an empty body', new Response('', { status: 200 })],
    ['an object instead of a list', json({ products: [PRODUCT] })],
    ['a list with a malformed product', json([PRODUCT, { ...PRODUCT, price: 'free' }])],
    ['a product with an unknown category', json([{ ...PRODUCT, category: 'Toys' }])],
  ])('rejects %s as a bad response', async (_name, response) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(serviceWith(fetchImpl).getProducts()).rejects.toBeInstanceOf(BadResponseError);
  });

  it('passes a network failure through untouched', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(serviceWith(fetchImpl).getProducts()).rejects.toBeInstanceOf(TypeError);
  });

  describe('with fake timers', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    /** A fetch that never answers and rejects with AbortError when its signal aborts. */
    const hangingFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });

    it('gives up with a TimeoutError when there is no answer in time', async () => {
      const result = serviceWith(hangingFetch, 5_000).getProducts().catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(5_000);
      expect(await result).toBeInstanceOf(TimeoutError);
    });

    it('reports a caller abort as an abort, not a timeout', async () => {
      const controller = new AbortController();
      const result = serviceWith(hangingFetch, 5_000).getProducts(controller.signal).catch((e: unknown) => e);
      controller.abort();
      const error = await result;
      expect(isAbortError(error)).toBe(true);
      expect(error).not.toBeInstanceOf(TimeoutError);
      expect(vi.getTimerCount()).toBe(0);
    });
  });
});

describe('classifyLoadError', () => {
  it.each([
    [new ApiError('x', 404), 'not-found'],
    [new ApiError('x', 401), 'forbidden'],
    [new ApiError('x', 403), 'forbidden'],
    [new ApiError('x', 408), 'timeout'],
    [new ApiError('x', 429), 'rate-limited'],
    [new ApiError('x', 500), 'server'],
    [new ApiError('x', 502), 'unavailable'],
    [new ApiError('x', 503), 'unavailable'],
    [new ApiError('x', 504), 'unavailable'],
    [new ApiError('x', 418), 'client'],
    [new TimeoutError('x'), 'timeout'],
    [new BadResponseError('x'), 'bad-response'],
  ] as const)('%o is %s whether online or not', (error, kind) => {
    expect(classifyLoadError(error, true)).toBe(kind);
    expect(classifyLoadError(error, false)).toBe(kind);
  });

  it('tells a dropped connection from being offline', () => {
    const failure = new TypeError('Failed to fetch');
    expect(classifyLoadError(failure, true)).toBe('network');
    expect(classifyLoadError(failure, false)).toBe('offline');
  });

  it('knows when retrying unchanged is pointless', () => {
    const pointless: LoadErrorKind[] = ['not-found', 'forbidden', 'client', 'bad-response'];
    const worthwhile: LoadErrorKind[] = ['offline', 'network', 'timeout', 'rate-limited', 'unavailable', 'server'];
    expect(pointless.map(isRetryLikelyToHelp)).toEqual([false, false, false, false]);
    expect(worthwhile.map(isRetryLikelyToHelp)).toEqual([true, true, true, true, true, true]);
  });
});
