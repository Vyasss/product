import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

export interface DebouncedCallback<Args extends unknown[]> {
  /** Schedule a call with these arguments, replacing any pending one. */
  run: (...args: Args) => void;
  /** Drop the pending call. */
  cancel: () => void;
  /** Run the pending call now, if there is one. */
  flush: () => void;
}

/**
 * Stable-identity debounce: `run`, `cancel` and `flush` never change, and the latest
 * `callback` is always the one invoked. Pending calls are cancelled on unmount.
 */
export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): DebouncedCallback<Args> {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgs = useRef<Args | null>(null);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingArgs.current = null;
  }, []);

  const flush = useCallback(() => {
    const args = pendingArgs.current;
    cancel();
    if (args) callbackRef.current(...args);
  }, [cancel]);

  const run = useCallback(
    (...args: Args) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      pendingArgs.current = args;
      timerRef.current = setTimeout(flush, delayMs);
    },
    [delayMs, flush],
  );

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ run, cancel, flush }), [run, cancel, flush]);
}
