import { useId, useState, type ReactNode } from 'react';
import { IconButton } from './IconButton';
import { MinusIcon, PlusIcon, TrashIcon } from './icons';

export interface QuantityStepperProps {
  /** Visible label, e.g. "Quantity". */
  label: ReactNode;
  /** Used in the button names: "Decrease quantity of <itemName>". */
  itemName?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /**
   * When given, the decrease button stays active at the minimum and removes the item
   * (it shows a bin instead of a minus), so "one less than one" does what people expect.
   */
  onRemove?: () => void;
}

/**
 * − / number / + control. The input accepts typing (committed when it is a whole number in
 * range, reset on blur otherwise); the buttons disable at the limits, except that with
 * `onRemove` the decrease button removes the item at the minimum.
 */
export function QuantityStepper({ label, itemName, value, min, max, onChange, onRemove }: QuantityStepperProps) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(String(value));
  }
  const of = itemName ? ` of ${itemName}` : '';
  const removesAtMin = onRemove !== undefined && value <= min;

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-muted">
        {label}
      </label>
      <div className="inline-flex items-center rounded-control border border-line-strong bg-card">
        <IconButton
          label={removesAtMin ? `Decrease quantity${of}: removes it from the cart` : `Decrease quantity${of}`}
          icon={removesAtMin ? <TrashIcon className="size-4" /> : <MinusIcon className="size-4" />}
          disabled={value <= min && !removesAtMin}
          onClick={() => (removesAtMin ? onRemove() : onChange(Math.max(min, value - 1)))}
          className="disabled:opacity-40"
        />
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            const next = Number(event.target.value);
            if (Number.isInteger(next) && next >= min && next <= max) onChange(next);
          }}
          onBlur={() => setDraft(String(value))}
          className="h-11 w-12 [appearance:textfield] border-x border-line bg-card text-center text-base font-semibold text-ink tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
        />
        <IconButton
          label={`Increase quantity${of}`}
          icon={<PlusIcon className="size-4" />}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="disabled:opacity-40"
        />
      </div>
    </div>
  );
}
