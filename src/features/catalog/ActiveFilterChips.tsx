import { memo } from 'react';
import { CloseIcon } from '../../components/ui/icons';
import type { FilterPatch, FilterState } from '../../domain/filters';
import { formatPrice } from '../shared/format';

export interface ActiveFilterChipsProps {
  filters: FilterState;
  onRemove: (patch: FilterPatch) => void;
}

interface Chip {
  key: string;
  label: string;
  patch: FilterPatch;
}

function chipsFor(filters: FilterState): Chip[] {
  const chips: Chip[] = [];
  if (filters.q !== '') chips.push({ key: 'q', label: `“${filters.q}”`, patch: { q: '' } });
  for (const category of filters.categories) {
    chips.push({
      key: `category-${category}`,
      label: category,
      patch: { categories: filters.categories.filter((c) => c !== category) },
    });
  }
  if (filters.minPrice !== null) {
    chips.push({ key: 'min', label: `From ${formatPrice(filters.minPrice)}`, patch: { minPrice: null } });
  }
  if (filters.maxPrice !== null) {
    chips.push({ key: 'max', label: `Up to ${formatPrice(filters.maxPrice)}`, patch: { maxPrice: null } });
  }
  if (filters.inStock) chips.push({ key: 'stock', label: 'In stock', patch: { inStock: false } });
  return chips;
}

/** One remove button per active filter, so each can be undone without hunting for its control. */
export const ActiveFilterChips = memo(function ActiveFilterChips({ filters, onRemove }: ActiveFilterChipsProps) {
  const chips = chipsFor(filters);
  if (chips.length === 0) return null;

  return (
    <ul aria-label="Active filters" className="flex shrink-0 gap-2 md:shrink md:flex-wrap">
      {chips.map((chip) => (
        <li key={chip.key} className="shrink-0">
          <button
            type="button"
            onClick={() => onRemove(chip.patch)}
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft pr-2.5 pl-3.5 text-sm font-medium whitespace-nowrap text-brand-ink transition-[color,background-color,border-color] hover:border-brand hover:bg-card"
          >
            {chip.label}
            <CloseIcon className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
});
