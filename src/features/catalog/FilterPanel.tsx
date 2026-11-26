import { memo, useCallback } from 'react';
import type { FilterState } from '../../domain/filters';
import type { Category } from '../../domain/product';
import { typesWithin, type ItemType } from '../../domain/productType';
import type { FacetCounts } from '../../search/facetCounts';
import type { UpdateFilters } from '../../url/useFilterState';
import { CategoryFilter } from './CategoryFilter';
import { PriceRangeFilter, type PriceRange } from './PriceRangeFilter';
import { StockToggle } from './StockToggle';
import { TypeFilter } from './TypeFilter';

export interface FilterPanelProps {
  filters: FilterState;
  facetCounts: FacetCounts | null;
  typeCounts: ReadonlyMap<ItemType, number> | null;
  /** The search text the results currently reflect (it reaches `filters.q` a moment later). */
  query: string;
  onUpdate: UpdateFilters;
}

/** Discrete filter changes create history entries (push), so Back undoes them one by one. */
export const FilterPanel = memo(function FilterPanel({ filters, facetCounts, typeCounts, query, onUpdate }: FilterPanelProps) {
  const { types } = filters;
  // Unticking a category also drops the ticked types that belonged only to it.
  const onCategories = useCallback(
    (categories: readonly Category[]) =>
      onUpdate({ categories, types: typesWithin(types, categories) }, { history: 'push' }),
    [onUpdate, types],
  );
  const onTypes = useCallback(
    (next: readonly ItemType[]) => onUpdate({ types: next }, { history: 'push' }),
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
        <TypeFilter
          selected={types}
          typeCounts={typeCounts}
          narrowed={filters.categories.length > 0 || query !== ''}
          onChange={onTypes}
        />
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
