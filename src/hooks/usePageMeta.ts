import { useEffect, useRef, useState, type RefObject } from 'react';
import { useLocation } from 'react-router';

export const SITE_NAME = 'AllinONE';

/** Sets `document.title` to "<title> | AllinONE". */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`;
  }, [title]);
}

/**
 * After an in-app navigation to a page, move focus to its heading so keyboard and
 * screen-reader users start at the new content. Runs once per arrival, when `ready`:
 * - skipped on the very first page of a visit (the initial history entry, key "default");
 * - not repeated for URL changes made by the page itself (catalog filters), unless
 *   `refocusOnLocationChange` is set (product page: moving to another product).
 */
export function useFocusOnNavigation(
  ref: RefObject<HTMLElement | null>,
  ready = true,
  refocusOnLocationChange = false,
): void {
  const { key } = useLocation();
  const [arrivalKey] = useState(key);
  const focusedFor = useRef<string | null>(null);
  const target = refocusOnLocationChange ? key : arrivalKey;

  useEffect(() => {
    if (!ready || target === 'default' || focusedFor.current === target) return;
    focusedFor.current = target;
    ref.current?.focus({ preventScroll: true });
  }, [ready, target, ref]);
}
