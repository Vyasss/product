import { memo, useCallback } from 'react';
import type { FilterState } from '../../domain/filters';
import type { Category } from '../../domain/product';
import type { FacetCounts } from '../../search/facetCounts';
import type { UpdateFilters } from '../../url/useFilterState';
import { CategoryFilter } from './CategoryFilter';
import { PriceRangeFilter, type PriceRange } from './PriceRangeFilter';
import { StockToggle } from './StockToggle';

export interface FilterPanelProps {
  filters: FilterState;
  facetCounts: FacetCounts | null;
  onUpdate: UpdateFilters;
}

/** Discrete filter changes create history entries (push), so Back undoes them one by one. */
export const FilterPanel = memo(function FilterPanel({ filters, facetCounts, onUpdate }: FilterPanelProps) {
  const onCategories = useCallback(
    (categories: readonly Category[]) => onUpdate({ categories }, { history: 'push' }),
    [onUpdate],
  );
  const onPrice = useCallback((range: PriceRange) => onUpdate(range, { history: 'push' }), [onUpdate]);
  const onStock = useCallback((inStock: boolean) => onUpdate({ inStock }, { history: 'push' }), [onUpdate]);

  return (
    // Sections are wrapped in divs: padding on a fieldset sits below its legend, not above.
    <div className="divide-y divide-line [&>div]:py-5 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
      <div>
        <CategoryFilter selected={filters.categories} facetCounts={facetCounts} onChange={onCategories} />
      </div>
      <div>
        <PriceRangeFilter minPrice={filters.minPrice} maxPrice={filters.maxPrice} onCommit={onPrice} />
      </div>
      <div>
        <StockToggle checked={filters.inStock} onChange={onStock} />
      </div>
    </div>
  );
});
