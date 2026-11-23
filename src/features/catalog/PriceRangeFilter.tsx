import { memo, useState, type KeyboardEvent } from 'react';
import { TextField } from '../../components/ui/TextField';
import { isPriceRangeInverted } from '../../domain/filters';

export interface PriceRange {
  minPrice: number | null;
  maxPrice: number | null;
}

export interface PriceRangeFilterProps extends PriceRange {
  onCommit: (range: PriceRange) => void;
}

const toDraft = (value: number | null): string => (value === null ? '' : String(value));

/** '' is "no bound"; anything that is not a non-negative number is invalid (undefined). */
function parseDraft(draft: string): number | null | undefined {
  const trimmed = draft.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Drafts are local while typing; the URL is updated (push) on blur or Enter, so typing
 * "5000" creates one history entry, not four.
 */
export const PriceRangeFilter = memo(function PriceRangeFilter({ minPrice, maxPrice, onCommit }: PriceRangeFilterProps) {
  const [minDraft, setMinDraft] = useState(() => toDraft(minPrice));
  const [maxDraft, setMaxDraft] = useState(() => toDraft(maxPrice));
  const [synced, setSynced] = useState<PriceRange>({ minPrice, maxPrice });

  // Re-sync drafts when the URL changes from outside (clear all, chips, Back/Forward).
  if (synced.minPrice !== minPrice || synced.maxPrice !== maxPrice) {
    setSynced({ minPrice, maxPrice });
    setMinDraft(toDraft(minPrice));
    setMaxDraft(toDraft(maxPrice));
  }

  const parsedMin = parseDraft(minDraft);
  const parsedMax = parseDraft(maxDraft);

  const commit = () => {
    const next: PriceRange = {
      minPrice: parsedMin === undefined ? minPrice : parsedMin,
      maxPrice: parsedMax === undefined ? maxPrice : parsedMax,
    };
    if (next.minPrice !== minPrice || next.maxPrice !== maxPrice) onCommit(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
  };

  const invalid = 'Enter a number of 0 or more.';
  const inverted = isPriceRangeInverted({ minPrice, maxPrice });

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold tracking-wide text-ink uppercase">Price (₹)</legend>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Min price"
          prefix="₹"
          placeholder="Any"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={minDraft}
          onChange={(event) => setMinDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          error={
            parsedMin === undefined
              ? invalid
              : inverted
                ? 'Min is above max, so the price filter is not applied.'
                : undefined
          }
        />
        <TextField
          label="Max price"
          prefix="₹"
          placeholder="Any"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={maxDraft}
          onChange={(event) => setMaxDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          error={parsedMax === undefined ? invalid : undefined}
        />
      </div>
    </fieldset>
  );
});
