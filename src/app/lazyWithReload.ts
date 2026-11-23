export const CHUNK_RELOAD_KEY = 'allinone.chunk-reload';

export interface ReloadEnvironment {
  /** Whether a reload for this reason already happened in this tab. */
  alreadyReloaded: () => boolean;
  markReloaded: () => void;
  clearReloaded: () => void;
  reload: () => void;
}

/**
 * Loads a code-split page. After a deploy, a tab opened before it still asks for the old
 * hashed chunk, which no longer exists, so the import fails. The fix is a reload, which picks
 * up the new index.html: do that once, automatically. If the import fails again right after
 * the reload, the cause is something else (offline, a real 5xx), so the error is passed on to
 * the error boundary instead of reloading in a loop.
 */
export async function loadWithReload<T>(load: () => Promise<T>, env: ReloadEnvironment): Promise<T> {
  try {
    const loaded = await load();
    env.clearReloaded();
    return loaded;
  } catch (error) {
    if (env.alreadyReloaded()) throw error;
    env.markReloaded();
    env.reload();
    // Never settles: the page is about to be replaced, and the Suspense fallback stays up.
    return new Promise<T>(() => undefined);
  }
}

/** sessionStorage-backed, so the "already reloaded" flag is per tab. Storage may be blocked. */
export function browserReloadEnvironment(): ReloadEnvironment {
  const storage = (action: (store: Storage) => void) => {
    try {
      action(window.sessionStorage);
    } catch {
      // Storage unavailable: without the flag we cannot tell a second failure from a first.
    }
  };
  return {
    alreadyReloaded: () => {
      try {
        return window.sessionStorage.getItem(CHUNK_RELOAD_KEY) !== null;
      } catch {
        // Cannot remember a reload, so do not start one: fall through to the error boundary.
        return true;
      }
    },
    markReloaded: () => storage((store) => store.setItem(CHUNK_RELOAD_KEY, '1')),
    clearReloaded: () => storage((store) => store.removeItem(CHUNK_RELOAD_KEY)),
    reload: () => window.location.reload(),
  };
}
