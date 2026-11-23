import { memo } from 'react';
import { Select, type SelectOption } from '../../components/ui/Select';
import { isSortKey, SORT_KEYS, SORT_LABELS, type SortKey } from '../../domain/filters';

export interface SortSelectProps {
  value: SortKey | null;
  onChange: (sort: SortKey | null) => void;
}

const OPTIONS: readonly SelectOption[] = [
  { value: '', label: 'Featured' },
  ...SORT_KEYS.map((key) => ({ value: key, label: SORT_LABELS[key] })),
];

export const SortSelect = memo(function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select
      label="Sort by"
      options={OPTIONS}
      value={value ?? ''}
      onChange={(event) => {
        const next = event.target.value;
        onChange(isSortKey(next) ? next : null);
      }}
    />
  );
});
