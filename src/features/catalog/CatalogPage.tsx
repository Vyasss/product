import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { Wordmark } from '../../components/layout/Wordmark';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Drawer } from '../../components/ui/Drawer';
import { Pagination } from '../../components/ui/Pagination';
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  type FilterPatch,
  type FilterState,
  type SortKey,
} from '../../domain/filters';
import { clampPage, pageBounds, pageCountFor } from '../../domain/pagination';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { useScrollMemory } from '../../hooks/useScrollMemory';
import { useSearchEngine } from '../../hooks/useSearchEngine';
import { useServices } from '../../hooks/useServices';
import { CartButton } from '../cart/CartButton';
import { serializeFilters } from '../../url/serializeFilters';
import { useFilterState } from '../../url/useFilterState';
import { EmptyState } from './EmptyState';
import { ErrorState } from '../shared/ErrorState';
import { FilterPanel } from './FilterPanel';
import { formatCount, pluralizeProducts, pluralizeResults, relaxationNote } from '../shared/format';
import { LoadingState } from './LoadingState';
import { MockControls } from './MockControls';
import { ProductGrid } from './ProductGrid';
import { ResultSummary } from './ResultSummary';
import { sampleBrands } from './sampleBrands';
import { SearchBox } from './SearchBox';
import { SmartSearchSuggestion } from './SmartSearchSuggestion';
import { useSearchSuggestions } from './useSearchSuggestions';
import { useSearchText } from './useSearchText';

const EMPTY_PARAMS = new URLSearchParams();

export function CatalogPage() {
  const { queryInterpreter, mockControls, features } = useServices();
  const { cart } = features;
  const { products: productsState } = useCatalogData();
  const { retry } = productsState;
  const { filters, page, update, setPage } = useFilterState();
  const search = useSearchText(filters.q, update);
  const { reset: resetSearchText, onTextChange, flush: flushSearch } = search;
  const announce = useAnnounce();
  const scrollMemory = useScrollMemory();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const products = productsState.status === 'success' ? productsState.products : null;
  const engine = useSearchEngine(products);
  // Every brand, most products first: offered when a search finds nothing (the brands are invented).
  const brands = useMemo(() => sampleBrands(products ?? []), [products]);

  // Results follow the deferred text immediately; the URL `q` catches up after the debounce.
  const effectiveFilters = useMemo<FilterState>(
    () => ({ ...filters, q: search.deferredQuery }),
    [filters, search.deferredQuery],
  );
  const result = useMemo(() => engine?.search(effectiveFilters) ?? null, [engine, effectiveFilters]);

  // One page of the results is rendered (and virtualised); the page number lives in the URL.
  const pageCount = pageCountFor(result?.total ?? 0);
  // While typed text has not reached the URL yet, the results are new: show their first page.
  const requestedPage = search.deferredQuery === filters.q ? page : 1;
  const currentPage = clampPage(requestedPage, result?.total ?? 0);
  const pageRange = useMemo(() => pageBounds(currentPage, result?.total ?? 0), [currentPage, result]);
  const pageIndices = useMemo(
    () => result?.indices.slice(pageRange.start, pageRange.end) ?? [],
    [result, pageRange],
  );
  const resetKey = useMemo(
    () => serializeFilters(effectiveFilters, EMPTY_PARAMS, currentPage),
    [effectiveFilters, currentPage],
  );

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
    // The button disappears with the filters; continue from the results heading.
    headingRef.current?.focus();
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

  // The grid scrolls back to the top of the list; focus goes to the results heading so the
  // keyboard continues from the top of the new page, not from the buttons at the bottom.
  const goToPage = useCallback(
    (next: number) => {
      setPage(next);
      headingRef.current?.focus({ preventScroll: true });
      announce(`Page ${next} of ${pageCount}`, 0);
    },
    [setPage, announce, pageCount],
  );

  const applySmartSearch = useCallback(
    (patch: FilterPatch) => {
      resetSearchText(patch.q ?? '');
      update({ ...patch, q: patch.q ?? '' }, { history: 'push' });
    },
    [resetSearchText, update],
  );

  // Type-ahead: completions come from the catalog, recent searches from this browser.
  const { suggestions, remember } = useSearchSuggestions(search.text, engine);
  const submitSearch = useCallback(() => {
    flushSearch();
    remember(search.text);
  }, [flushSearch, remember, search.text]);
  const pickSuggestion = useCallback(
    (text: string) => {
      onTextChange(text);
      flushSearch();
      remember(text);
    },
    [onTextChange, flushSearch, remember],
  );

  const clearSearch = useCallback(() => {
    onTextChange('');
    flushSearch();
    searchInputRef.current?.focus();
  }, [onTextChange, flushSearch]);

  // The logo goes home: every filter, the search and the page are cleared (the link drops the
  // query string) and the window returns to the top.
  const showAllProducts = useCallback(() => {
    resetSearchText('');
    setFiltersOpen(false);
    window.scrollTo({ top: 0 });
  }, [resetSearchText]);

  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  // Phones: the filter sheet covers the lower part of the screen. While it is open, keep the
  // start of the list just under the header, so the space above the sheet shows products (not
  // the results bar) and they visibly change as filters are ticked. Runs after the grid's own
  // "back to the top" effect, so this position wins while the sheet is open.
  const resultsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!filtersOpen || typeof window.matchMedia !== 'function') return;
    if (!window.matchMedia('(max-width: 639px)').matches) return;
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }, [filtersOpen, resetKey]);

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
            <Link to="/" onClick={showAllProducts} title="Show all products" className="block rounded-control">
              <span className="sr-only">AllinONE product catalog</span>
              <span aria-hidden="true">
                <Wordmark markOnlyOnPhones />
              </span>
            </Link>
          </h1>
        }
        actions={cart ? <CartButton /> : undefined}
      >
        <SearchBox
          value={search.text}
          onChange={onTextChange}
          onSubmit={submitSearch}
          onClear={clearSearch}
          inputRef={searchInputRef}
          suggestions={suggestions}
          onPick={pickSuggestion}
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
          {mockControls && <MockControls controls={mockControls} onReload={retry} />}
          {queryInterpreter && (
            <SmartSearchSuggestion
              text={search.deferredQuery}
              interpreter={queryInterpreter}
              onApply={applySmartSearch}
            />
          )}
          <section ref={resultsRef} aria-label="Results" aria-busy={status !== 'success'} className="pt-4">
            {productsState.status === 'loading' && <LoadingState />}
            {productsState.status === 'error' && (
              <ErrorState error={productsState.error} retrying={productsState.retrying} onRetry={retry} />
            )}
            {products && result && result.total === 0 && (
              <EmptyState
                query={search.deferredQuery}
                onClearAll={clearAll}
                brands={brands}
                onSearch={pickSuggestion}
              />
            )}
            {products && result && result.total > 0 && (
              <ProductGrid
                products={products}
                indices={pageIndices}
                firstPosition={pageRange.start + 1}
                setSize={result.total}
                resetKey={resetKey}
                restore={scrollMemory.restore}
                onOpenProduct={scrollMemory.rememberProduct}
              />
            )}
            {products && result && pageCount > 1 && (
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                onChange={goToPage}
                label="Result pages"
                summary={`Showing ${formatCount(pageRange.start + 1)}–${formatCount(pageRange.end)} of ${formatCount(result.total)}`}
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

    </div>
  );
}
