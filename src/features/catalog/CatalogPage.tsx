import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { Wordmark } from '../../components/layout/Wordmark';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Drawer } from '../../components/ui/Drawer';
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  type FilterPatch,
  type FilterState,
  type SortKey,
} from '../../domain/filters';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { useScrollMemory } from '../../hooks/useScrollMemory';
import { useServices } from '../../hooks/useServices';
import { CartButton } from '../cart/CartButton';
import { serializeFilters } from '../../url/serializeFilters';
import { useFilterState } from '../../url/useFilterState';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { FilterPanel } from './FilterPanel';
import { pluralizeProducts, pluralizeResults, relaxationNote } from './format';
import { LoadingState } from './LoadingState';
import { MockControls } from './MockControls';
import { ProductGrid } from './ProductGrid';
import { ResultSummary } from './ResultSummary';
import { SearchBox } from './SearchBox';
import { SmartSearchSuggestion } from './SmartSearchSuggestion';
import { useSearchText } from './useSearchText';

const EMPTY_PARAMS = new URLSearchParams();

export function CatalogPage() {
  const { createSearchEngine, queryInterpreter, mockControls } = useServices();
  const { products: productsState } = useCatalogData();
  const { retry } = productsState;
  const { filters, update } = useFilterState();
  const search = useSearchText(filters.q, update);
  const { reset: resetSearchText, onTextChange, flush: flushSearch } = search;
  const announce = useAnnounce();
  const scrollMemory = useScrollMemory();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const products = productsState.status === 'success' ? productsState.products : null;
  const engine = useMemo(() => (products ? createSearchEngine(products) : null), [products, createSearchEngine]);

  // Results follow the deferred text immediately; the URL `q` catches up after the debounce.
  const effectiveFilters = useMemo<FilterState>(
    () => ({ ...filters, q: search.deferredQuery }),
    [filters, search.deferredQuery],
  );
  const result = useMemo(() => engine?.search(effectiveFilters) ?? null, [engine, effectiveFilters]);
  const resetKey = useMemo(() => serializeFilters(effectiveFilters, EMPTY_PARAMS), [effectiveFilters]);

  // One polite announcement per settled state.
  const total = result?.total ?? null;
  const note = result?.relaxed ? relaxationNote(result.relaxed) : null;
  const status = productsState.status;
  useDocumentTitle(
    search.deferredQuery ? `“${search.deferredQuery}”${total === null ? '' : ` (${pluralizeResults(total)})`}` : 'Product catalog',
  );
  // Arriving from another page (not Back to a saved position): start at the results heading.
  useFocusOnNavigation(headingRef, scrollMemory.restore === null);
  useEffect(() => {
    if (status === 'loading') announce('Loading products', 0);
    else if (status === 'error') announce('Products could not be loaded. A Retry button is available.', 0);
    else if (total !== null) announce(`${pluralizeProducts(total)} found${note ? `. ${note}` : ''}`);
  }, [status, total, note, announce]);

  // After recovering from an error, move focus from the vanished Retry button to the results.
  const previousStatus = useRef(status);
  useEffect(() => {
    if (previousStatus.current === 'error' && status === 'success') headingRef.current?.focus();
    previousStatus.current = status;
  }, [status]);

  const clearAll = useCallback(() => {
    resetSearchText('');
    update(DEFAULT_FILTERS, { history: 'push' });
    setFiltersOpen(false);
    searchInputRef.current?.focus();
  }, [resetSearchText, update]);

  const removeFilter = useCallback(
    (patch: FilterPatch) => {
      if (patch.q !== undefined) resetSearchText(patch.q);
      update(patch, { history: 'push' });
      headingRef.current?.focus();
    },
    [resetSearchText, update],
  );

  const changeSort = useCallback((sort: SortKey | null) => update({ sort }, { history: 'push' }), [update]);

  const applySmartSearch = useCallback(
    (patch: FilterPatch) => {
      resetSearchText(patch.q ?? '');
      update({ ...patch, q: patch.q ?? '' }, { history: 'push' });
    },
    [resetSearchText, update],
  );

  const clearSearch = useCallback(() => {
    onTextChange('');
    flushSearch();
    searchInputRef.current?.focus();
  }, [onTextChange, flushSearch]);

  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  const canClear = hasActiveFilters(filters) || search.text !== '' || filters.sort !== null;
  const facetCounts = result?.facetCounts ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#results"
        className="sr-only z-50 rounded-control bg-card px-4 py-3 font-semibold text-brand-ink shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to results
      </a>

      <SiteHeader
        brand={
          <h1>
            <span className="sr-only">Bazora product catalog</span>
            <span aria-hidden="true">
              <Wordmark markOnlyOnPhones />
            </span>
          </h1>
        }
        actions={<CartButton />}
      >
        <SearchBox
          value={search.text}
          onChange={onTextChange}
          onSubmit={flushSearch}
          onClear={clearSearch}
          inputRef={searchInputRef}
        />
      </SiteHeader>

      <div className="mx-auto flex w-full max-w-screen-2xl flex-1 gap-6 px-4">
        <aside aria-label="Filters" className="hidden w-64 shrink-0 pt-4 lg:block">
          <Card className="sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100vh-var(--header-h)-2rem)] overflow-y-auto p-5">
            <FilterPanel filters={filters} facetCounts={facetCounts} onUpdate={update} />
          </Card>
        </aside>

        <main id="results" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <ResultSummary
            total={total}
            status={status}
            query={search.deferredQuery}
            note={note}
            filters={filters}
            canClear={canClear}
            onClearAll={clearAll}
            onRemove={removeFilter}
            onSortChange={changeSort}
            onOpenFilters={openFilters}
            headingRef={headingRef}
          />
          {queryInterpreter && (
            <SmartSearchSuggestion
              text={search.deferredQuery}
              interpreter={queryInterpreter}
              onApply={applySmartSearch}
            />
          )}
          <section aria-label="Results" aria-busy={status !== 'success'} className="pt-4">
            {productsState.status === 'loading' && <LoadingState />}
            {productsState.status === 'error' && (
              <ErrorState error={productsState.error} retrying={productsState.retrying} onRetry={retry} />
            )}
            {products && result && result.total === 0 && (
              <EmptyState query={search.deferredQuery} onClearAll={clearAll} />
            )}
            {products && result && result.total > 0 && (
              <ProductGrid
                products={products}
                indices={result.indices}
                resetKey={resetKey}
                restore={scrollMemory.restore}
                onOpenProduct={scrollMemory.rememberProduct}
              />
            )}
          </section>
        </main>
      </div>

      <SiteFooter />

      <Drawer
        open={filtersOpen}
        onClose={closeFilters}
        title="Filters"
        footer={
          <Button variant="primary" className="w-full" onClick={closeFilters}>
            {total === null ? 'Show results' : `Show ${pluralizeResults(total)}`}
          </Button>
        }
      >
        <FilterPanel filters={filters} facetCounts={facetCounts} onUpdate={update} />
      </Drawer>

      {mockControls && <MockControls controls={mockControls} onReload={retry} />}
    </div>
  );
}
