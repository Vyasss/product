import { describe, expect, it, vi } from 'vitest';
import { createInMemorySearchEngine } from '../search/InMemorySearchEngine';
import { FIXTURE_PRODUCTS } from '../test/fixtures';
import { searchEngineFor, whenIdle } from './useSearchEngine';

describe('searchEngineFor', () => {
  it('builds one engine per product list and factory', () => {
    const create = vi.fn(createInMemorySearchEngine);
    const products = [...FIXTURE_PRODUCTS];
    const first = searchEngineFor(products, create);
    expect(searchEngineFor(products, create)).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);

    // A different list (a reload) or a different factory (a test fake) gets its own engine.
    expect(searchEngineFor([...FIXTURE_PRODUCTS], create)).not.toBe(first);
    expect(searchEngineFor(products, vi.fn(createInMemorySearchEngine))).not.toBe(first);
  });
});

describe('whenIdle', () => {
  it('runs the task later, and not at all once cancelled', async () => {
    const ran = vi.fn();
    const cancelled = vi.fn();
    whenIdle(ran);
    whenIdle(cancelled)();
    expect(ran).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(ran).toHaveBeenCalledTimes(1));
    expect(cancelled).not.toHaveBeenCalled();
  });
});
