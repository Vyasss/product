import { memo } from 'react';
import { Checkbox } from '../../components/ui/Checkbox';
import { CATEGORIES, type Category } from '../../domain/product';
import type { FacetCounts } from '../../search/facetCounts';
import { formatCount } from '../shared/format';

export interface CategoryFilterProps {
  selected: readonly Category[];
  /** Counts with every other filter applied; null while products load. */
  facetCounts: FacetCounts | null;
  onChange: (categories: readonly Category[]) => void;
}

export const CategoryFilter = memo(function CategoryFilter({ selected, facetCounts, onChange }: CategoryFilterProps) {
  const toggle = (category: Category, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(category);
    else next.delete(category);
    onChange(CATEGORIES.filter((c) => next.has(c)));
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink uppercase">Category</legend>
      {CATEGORIES.map((category) => (
        <Checkbox
          key={category}
          checked={selected.includes(category)}
          onChange={(event) => toggle(category, event.target.checked)}
          label={
            <span className="flex justify-between gap-2">
              <span>{category}</span>
              {facetCounts && (
                <span className="text-ink-muted tabular-nums">
                  {formatCount(facetCounts[category])}
                  <span className="sr-only"> products</span>
                </span>
              )}
            </span>
          }
        />
      ))}
    </fieldset>
  );
});
