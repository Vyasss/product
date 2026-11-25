import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { FilterPatch, FilterState } from '../domain/filters';
import { parseFilters, parsePage } from './parseFilters';
import { serializeFilters, toSearchString } from './serializeFilters';

export type HistoryMode = 'push' | 'replace';

export interface UpdateOptions {
  history: HistoryMode;
}

export type UpdateFilters = (patch: FilterPatch, options: UpdateOptions) => void;

export interface FilterStateApi {
  filters: FilterState;
  /** Result page from the URL, 1-based (not yet clamped to the number of pages). */
  page: number;
  /** Changes filters; any real change goes back to page 1. */
  update: UpdateFilters;
  /** Moves to another result page; always a new history entry, so Back returns to the previous page. */
  setPage: (page: number) => void;
}

const NO_PARAMS = new URLSearchParams();

/**
 * The URL is the only store for filter state: `filters` is derived from `location.search`
 * and `update` writes a canonical query string. `update` has a stable identity, so memoised
 * children that receive it do not re-render when the URL changes.
 */
export function useFilterState(): FilterStateApi {
  const { search } = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(search), [search]);
  const filters = useMemo(() => parseFilters(params), [params]);
  const page = useMemo(() => parsePage(params), [params]);

  // The latest search string, also advanced synchronously by `update`, so two updates in the
  // same tick compose instead of the second overwriting the first.
  const latestSearch = useRef(search);
  useLayoutEffect(() => {
    latestSearch.current = search;
  }, [search]);

  const update = useCallback<UpdateFilters>(
    (patch, { history }) => {
      const current = new URLSearchParams(latestSearch.current);
      const before = parseFilters(current);
      const after = { ...before, ...patch };
      // A different result list starts on page 1; a patch that changes nothing keeps the page.
      const changed = serializeFilters(after, NO_PARAMS) !== serializeFilters(before, NO_PARAMS);
      const next = toSearchString(after, current, changed ? 1 : parsePage(current));
      if (next === latestSearch.current) return;
      latestSearch.current = next;
      void navigate({ search: next }, { replace: history === 'replace' });
    },
    [navigate],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const current = new URLSearchParams(latestSearch.current);
      const next = toSearchString(parseFilters(current), current, nextPage);
      if (next === latestSearch.current) return;
      latestSearch.current = next;
      void navigate({ search: next });
    },
    [navigate],
  );

  // A hand-edited or shared URL that is not canonical is rewritten once, in place.
  useEffect(() => {
    const canonical = toSearchString(parseFilters(params), params, parsePage(params));
    if (canonical !== search) {
      latestSearch.current = canonical;
      void navigate({ search: canonical }, { replace: true });
    }
  }, [params, search, navigate]);

  return useMemo(() => ({ filters, page, update, setPage }), [filters, page, update, setPage]);
}
