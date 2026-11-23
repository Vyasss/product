import { describe, expect, it, vi } from 'vitest';
import { loadWithReload, type ReloadEnvironment } from './lazyWithReload';

function environment(reloadedBefore = false) {
  let reloaded = reloadedBefore;
  const env: ReloadEnvironment = {
    alreadyReloaded: () => reloaded,
    markReloaded: () => {
      reloaded = true;
    },
    clearReloaded: () => {
      reloaded = false;
    },
    reload: vi.fn(),
  };
  return { env, wasReloaded: () => reloaded };
}

describe('loadWithReload', () => {
  it('returns the module and clears the flag when the chunk loads', async () => {
    const { env, wasReloaded } = environment(true);
    await expect(loadWithReload(() => Promise.resolve('page'), env)).resolves.toBe('page');
    expect(wasReloaded()).toBe(false);
    expect(env.reload).not.toHaveBeenCalled();
  });

  it('reloads once when the chunk is missing (a tab from before a deploy)', async () => {
    const { env, wasReloaded } = environment();
    const settled = vi.fn();
    void loadWithReload(() => Promise.reject(new TypeError('Failed to fetch dynamically imported module')), env).then(
      settled,
      settled,
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(env.reload).toHaveBeenCalledTimes(1);
    expect(wasReloaded()).toBe(true);
    expect(settled).not.toHaveBeenCalled();
  });

  it('does not reload in a loop: a second failure goes to the error boundary', async () => {
    const { env } = environment(true);
    const failure = new TypeError('Failed to fetch dynamically imported module');
    await expect(loadWithReload(() => Promise.reject(failure), env)).rejects.toBe(failure);
    expect(env.reload).not.toHaveBeenCalled();
  });
});
