import { memo } from 'react';
import { Checkbox } from '../../components/ui/Checkbox';
import { ALL_ITEM_TYPES, type ItemType } from '../../domain/productType';
import { formatCount } from '../shared/format';

export interface TypeFilterProps {
  selected: readonly ItemType[];
  /** Products per type with every other filter applied; null while products load. */
  typeCounts: ReadonlyMap<ItemType, number> | null;
  onChange: (types: readonly ItemType[]) => void;
}

/**
 * Product types (sub-categories) of the current results: tick "LED Monitor" under Electronics,
 * or "Running Shoes" after searching "shoes". Only types that have products are listed, plus
 * any that are ticked. `Product` has no type field; the type is read from the title. The
 * filter panel renders this only once a category or a search narrows the catalog.
 */
export const TypeFilter = memo(function TypeFilter({ selected, typeCounts, onChange }: TypeFilterProps) {
  const options = ALL_ITEM_TYPES.filter((type) => selected.includes(type) || (typeCounts?.get(type) ?? 0) > 0);

  const toggle = (type: ItemType, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(type);
    else next.delete(type);
    onChange(ALL_ITEM_TYPES.filter((candidate) => next.has(candidate)));
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink uppercase">Product type</legend>
      {options.length === 0 ? (
        <p className="text-sm text-ink-muted">No product types match.</p>
      ) : (
        options.map((type) => (
          <Checkbox
            key={type}
            checked={selected.includes(type)}
            onChange={(event) => toggle(type, event.target.checked)}
            label={
              <span className="flex justify-between gap-2">
                <span>{type}</span>
                {typeCounts && (
                  <span className="text-ink-muted tabular-nums">
                    {formatCount(typeCounts.get(type) ?? 0)}
                    <span className="sr-only"> products</span>
                  </span>
                )}
              </span>
            }
          />
        ))
      )}
    </fieldset>
  );
});
