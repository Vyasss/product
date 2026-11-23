import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { sanitizeQuery } from '../../url/parseFilters';
import type { UpdateFilters } from '../../url/useFilterState';

export const URL_QUERY_DEBOUNCE_MS = 250;

export interface SearchText {
  /** What the input shows; updated on every keystroke (urgent). */
  text: string;
  /** Sanitised deferred text: results follow it without ever blocking typing. */
  deferredQuery: string;
  onTextChange: (text: string) => void;
  /** Write a pending query to the URL now (Enter in the search box). */
  flush: () => void;
  /** Set the text from outside (clear all, chip removal, smart search) and drop pending writes. */
  reset: (text: string) => void;
}

/**
 * Local text state for instant paint, a debounced `replace` of `q` in the URL, and
 * `useDeferredValue` so filtering 5,000 products happens in an interruptible render.
 * When the URL `q` changes from outside (Back/Forward), the box re-syncs from the URL.
 */
export function useSearchText(urlQuery: string, update: UpdateFilters): SearchText {
  const [text, setText] = useState(urlQuery);
  // The last q this hook wrote (or reset to). A URL q equal to it is our own echo, which
  // must not overwrite newer keystrokes; anything else came from navigation.
  const [ownQuery, setOwnQuery] = useState(urlQuery);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);

  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    if (urlQuery !== ownQuery && urlQuery !== sanitizeQuery(text)) {
      setText(urlQuery);
      setOwnQuery(urlQuery);
    }
  }

  const writeQuery = useDebouncedCallback((value: string) => {
    const q = sanitizeQuery(value);
    setOwnQuery(q);
    update({ q }, { history: 'replace' });
  }, URL_QUERY_DEBOUNCE_MS);

  const { run, cancel, flush } = writeQuery;

  const onTextChange = useCallback(
    (value: string) => {
      setText(value);
      run(value);
    },
    [run],
  );

  const reset = useCallback(
    (value: string) => {
      cancel();
      setText(value);
      setOwnQuery(sanitizeQuery(value));
    },
    [cancel],
  );

  const deferredText = useDeferredValue(text);
  const deferredQuery = useMemo(() => sanitizeQuery(deferredText), [deferredText]);

  return { text, deferredQuery, onTextChange, flush, reset };
}
