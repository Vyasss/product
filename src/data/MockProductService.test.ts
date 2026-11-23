import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { createFailurePolicy, readMockFailParam } from './mockControls';
import { defaultLatency, MAX_LATENCY_MS, MIN_LATENCY_MS, MockProductService } from './MockProductService';
import { ApiError, isAbortError } from './ProductService';

const products = [makeProduct({ id: 'p-1' }), makeProduct({ id: 'p-2' })];

describe('MockProductService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves only after the configured latency', async () => {
    const service = new MockProductService({ latency: () => 400, loadProducts: () => products });
    const onResolve = vi.fn();
    const pending = service.getProducts().then(onResolve);

    await vi.advanceTimersByTimeAsync(399);
    expect(onResolve).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(onResolve).toHaveBeenCalledWith(products);
  });

  it('returns the same array (stable references) on every call', async () => {
    const loadProducts = vi.fn(() => products);
    const service = new MockProductService({ latency: () => 0, loadProducts });
    const first = service.getProducts();
    await vi.advanceTimersByTimeAsync(0);
    const second = service.getProducts();
    await vi.advanceTimersByTimeAsync(0);
    expect(await first).toBe(await second);
    expect(loadProducts).toHaveBeenCalledTimes(1);
  });

  it('rejects with an ApiError(500) when a failure is due, then recovers', async () => {
    const failurePolicy = createFailurePolicy();
    failurePolicy.failNext(1);
    const service = new MockProductService({ latency: () => 10, failurePolicy, loadProducts: () => products });

    const failed = service.getProducts();
    const assertion = expect(failed).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 500,
    );
    await vi.advanceTimersByTimeAsync(10);
    await assertion;

    const ok = service.getProducts();
    await vi.advanceTimersByTimeAsync(10);
    await expect(ok).resolves.toBe(products);
  });

  it('rejects with an AbortError and clears its timer when aborted', async () => {
    const service = new MockProductService({ latency: () => 500, loadProducts: () => products });
    const controller = new AbortController();
    const pending = service.getProducts(controller.signal);
    controller.abort();

    await expect(pending).rejects.toSatisfy(isAbortError);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects immediately when given an already-aborted signal', async () => {
    const service = new MockProductService({ latency: () => 500, loadProducts: () => products });
    await expect(service.getProducts(AbortSignal.abort())).rejects.toSatisfy(isAbortError);
  });
});

describe('defaultLatency', () => {
  it('stays within 300 to 600 ms', () => {
    expect(MIN_LATENCY_MS).toBe(300);
    expect(MAX_LATENCY_MS).toBe(600);
    expect(defaultLatency(() => 0)).toBe(300);
    expect(defaultLatency(() => 0.9999)).toBe(600);
  });
});

describe('failure policy', () => {
  it('fails the first N requests, then succeeds', () => {
    const policy = createFailurePolicy({ failFirst: 2 });
    expect([policy.shouldFail(), policy.shouldFail(), policy.shouldFail()]).toEqual([true, true, false]);
  });

  it('applies the fail rate with an injectable random source', () => {
    expect(createFailurePolicy({ failRate: 0.5, random: () => 0.4 }).shouldFail()).toBe(true);
    expect(createFailurePolicy({ failRate: 0.5, random: () => 0.6 }).shouldFail()).toBe(false);
    expect(createFailurePolicy({ failRate: 0 }).shouldFail()).toBe(false);
  });

  it('queues failures through failNext', () => {
    const policy = createFailurePolicy();
    policy.failNext(2);
    expect(policy.pendingFailures()).toBe(2);
    policy.shouldFail();
    expect(policy.pendingFailures()).toBe(1);
  });

  it.each([
    ['?mockFail=2', 2],
    ['?mockFail=0', 0],
    ['?mockFail=-1', 0],
    ['?mockFail=abc', 0],
    ['?mockFail=1.5', 0],
    ['', 0],
  ])('reads mockFail from %j as %i', (search, expected) => {
    expect(readMockFailParam(search)).toBe(expected);
  });
});
