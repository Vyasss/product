import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { FilterPatch, FilterState } from '../domain/filters';
import { parseFilters } from './parseFilters';
import { toSearchString } from './serializeFilters';

export type HistoryMode = 'push' | 'replace';

export interface UpdateOptions {
  history: HistoryMode;
}

export type UpdateFilters = (patch: FilterPatch, options: UpdateOptions) => void;

export interface FilterStateApi {
  filters: FilterState;
  update: UpdateFilters;
}

/**
 * The URL is the only store for filter state: `filters` is derived from `location.search`
 * and `update` writes a canonical query string. `update` has a stable identity, so memoised
 * children that receive it do not re-render when the URL changes.
 */
export function useFilterState(): FilterStateApi {
  const { search } = useLocation();
  const navigate = useNavigate();

  const filters = useMemo(() => parseFilters(new URLSearchParams(search)), [search]);

  // The latest search string, also advanced synchronously by `update`, so two updates in the
  // same tick compose instead of the second overwriting the first.
  const latestSearch = useRef(search);
  useLayoutEffect(() => {
    latestSearch.current = search;
  }, [search]);

  const update = useCallback<UpdateFilters>(
    (patch, { history }) => {
      const current = new URLSearchParams(latestSearch.current);
      const next = toSearchString({ ...parseFilters(current), ...patch }, current);
      if (next === latestSearch.current) return;
      latestSearch.current = next;
      void navigate({ search: next }, { replace: history === 'replace' });
    },
    [navigate],
  );

  // A hand-edited or shared URL that is not canonical is rewritten once, in place.
  useEffect(() => {
    const params = new URLSearchParams(search);
    const canonical = toSearchString(parseFilters(params), params);
    if (canonical !== search) {
      latestSearch.current = canonical;
      void navigate({ search: canonical }, { replace: true });
    }
  }, [search, navigate]);

  return useMemo(() => ({ filters, update }), [filters, update]);
}
