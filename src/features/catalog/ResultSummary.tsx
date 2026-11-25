import { memo, type Ref } from 'react';
import { Button } from '../../components/ui/Button';
import { FilterIcon } from '../../components/ui/icons';
import type { FilterPatch, FilterState, SortKey } from '../../domain/filters';
import { useFeatures } from '../../hooks/useServices';
import { ActiveFilterChips } from './ActiveFilterChips';
import { pluralizeResults } from '../shared/format';
import { ShareButton } from '../shared/ShareButton';
import { SortSelect } from './SortSelect';

export interface ResultSummaryProps {
  /** null while loading or after an error. */
  total: number | null;
  status: 'loading' | 'error' | 'success';
  /** The query the count belongs to (the deferred search text). */
  query: string;
  /** Explanation when the search was relaxed (typos corrected, unknown words ignored). */
  note: string | null;
  filters: FilterState;
  canClear: boolean;
  onClearAll: () => void;
  onRemove: (patch: FilterPatch) => void;
  onSortChange: (sort: SortKey | null) => void;
  /** Opens the filter drawer on narrow screens. */
  onOpenFilters: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}

function activeFilterCount(filters: FilterState): number {
  return (
    filters.categories.length +
    (filters.minPrice !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.inStock ? 1 : 0)
  );
}

function Heading({ status, total, query }: Pick<ResultSummaryProps, 'status' | 'total' | 'query'>) {
  if (status === 'loading') return <>Loading products…</>;
  if (status === 'error' || total === null) return <>Products unavailable</>;
  return (
    <>
      {pluralizeResults(total)}
      {query !== '' && (
        <span className="font-normal text-ink-muted">
          {' for '}
          <span className="font-semibold text-brand-ink">“{query}”</span>
        </span>
      )}
    </>
  );
}

/** Sticky results bar under the header: count, sort, filters button, and active chips. */
export const ResultSummary = memo(function ResultSummary({
  total,
  status,
  query,
  note,
  filters,
  canClear,
  onClearAll,
  onRemove,
  onSortChange,
  onOpenFilters,
  headingRef,
}: ResultSummaryProps) {
  const { share } = useFeatures();
  const filterCount = activeFilterCount(filters);
  // Pinned under the header from 768 px up; on phones it scrolls away to keep the pinned area small.
  return (
    <div className="z-20 -mx-4 flex flex-col gap-2 md:sticky md:top-(--header-h) border-b border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate text-base font-bold text-ink tabular-nums md:text-lg"
        >
          <Heading status={status} total={total} query={query} />
        </h2>
        {/* Phones: Share sits beside the count and the controls take the next line. Wider: one row. */}
        {share && (
          <div className="md:order-last">
            <ShareButton compact />
          </div>
        )}
        <div className="flex max-w-full items-center gap-2 max-md:basis-full max-[359px]:flex-wrap">
          <Button className="lg:hidden" onClick={onOpenFilters}>
            <FilterIcon className="size-4" />
            Filters{filterCount > 0 ? ` (${filterCount})` : ''}
          </Button>
          <SortSelect value={filters.sort} onChange={onSortChange} />
        </div>
      </div>
      {note && <p className="-mt-1 text-sm text-ink-muted">{note}</p>}
      {/* Mobile: chips stay on one scrollable line. Padding leaves room for focus rings. */}
      {/* "Clear all filters" is always on the page; it is disabled while there is nothing to clear. */}
      <div className="-mx-1.5 -my-1 flex items-center gap-2 overflow-x-auto px-1.5 py-1.5 md:flex-wrap md:overflow-visible">
        {canClear && <ActiveFilterChips filters={filters} onRemove={onRemove} />}
        <Button variant="ghost" className="shrink-0 px-2" disabled={!canClear} onClick={onClearAll}>
          Clear all filters
        </Button>
      </div>
    </div>
  );
});
