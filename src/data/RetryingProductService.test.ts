import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../domain/product';
import { BadResponseError, TimeoutError } from './loadErrors';
import { ApiError, isAbortError, type ProductService } from './ProductService';
import { retryDelay, RetryingProductService } from './RetryingProductService';

const PRODUCTS: readonly Product[] = [];

/** A service that fails with each given error in turn, then succeeds. */
function failingThenOk(...errors: unknown[]) {
  const getProducts = vi.fn<ProductService['getProducts']>();
  for (const error of errors) getProducts.mockRejectedValueOnce(error);
  getProducts.mockResolvedValue(PRODUCTS);
  return { getProducts };
}

const wrap = (inner: ProductService, isOnline = true) =>
  new RetryingProductService(inner, { retries: 2, baseDelayMs: 100, random: () => 0, isOnline: () => isOnline });

describe('RetryingProductService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([
    ['503', new ApiError('x', 503)],
    ['500', new ApiError('x', 500)],
    ['429', new ApiError('x', 429)],
    ['a timeout', new TimeoutError('x')],
    ['a dropped connection', new TypeError('Failed to fetch')],
  ])('recovers from %s without surfacing an error', async (_name, error) => {
    const inner = failingThenOk(error);
    const result = wrap(inner).getProducts();
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe(PRODUCTS);
    expect(inner.getProducts).toHaveBeenCalledTimes(2);
  });

  it('backs off exponentially and gives up after the configured retries', async () => {
    const inner = failingThenOk(new ApiError('x', 503), new ApiError('x', 503), new ApiError('x', 503));
    const result = wrap(inner).getProducts().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(99);
    expect(inner.getProducts).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1); // 100 ms: first retry
    expect(inner.getProducts).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200); // +200 ms: second retry
    expect(inner.getProducts).toHaveBeenCalledTimes(3);
    expect(await result).toMatchObject({ status: 503 });
  });

  it.each([
    ['404', new ApiError('x', 404)],
    ['403', new ApiError('x', 403)],
    ['400', new ApiError('x', 400)],
    ['an unreadable response', new BadResponseError('x')],
  ])('does not retry %s: trying again cannot fix it', async (_name, error) => {
    const inner = failingThenOk(error);
    await expect(wrap(inner).getProducts()).rejects.toBe(error);
    expect(inner.getProducts).toHaveBeenCalledTimes(1);
  });

  it('does not retry while offline: the request cannot succeed', async () => {
    const inner = failingThenOk(new TypeError('Failed to fetch'));
    await expect(wrap(inner, false).getProducts()).rejects.toBeInstanceOf(TypeError);
    expect(inner.getProducts).toHaveBeenCalledTimes(1);
  });

  it('stops waiting at once when aborted, and leaves no timer behind', async () => {
    const inner = failingThenOk(new ApiError('x', 503));
    const controller = new AbortController();
    const result = wrap(inner).getProducts(controller.signal).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(10);
    controller.abort();
    expect(isAbortError(await result)).toBe(true);
    expect(inner.getProducts).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('adds up to 50% jitter to each delay', () => {
    expect(retryDelay(1, 400, () => 0)).toBe(400);
    expect(retryDelay(2, 400, () => 0)).toBe(800);
    expect(retryDelay(3, 400, () => 0.999)).toBeGreaterThan(2300);
    expect(retryDelay(3, 400, () => 0.999)).toBeLessThanOrEqual(2400);
  });
});
