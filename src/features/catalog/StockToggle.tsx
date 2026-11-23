import { memo } from 'react';
import { Checkbox } from '../../components/ui/Checkbox';

export interface StockToggleProps {
  checked: boolean;
  onChange: (inStock: boolean) => void;
}

export const StockToggle = memo(function StockToggle({ checked, onChange }: StockToggleProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink uppercase">Availability</legend>
      <Checkbox label="In stock only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </fieldset>
  );
});
