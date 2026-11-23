import { memo, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { SORT_LABELS, type FilterPatch } from '../../domain/filters';
import type { QueryInterpreter } from '../../smart-search/QueryInterpreter';
import { formatPrice } from './format';

export interface SmartSearchSuggestionProps {
  text: string;
  interpreter: QueryInterpreter;
  onApply: (patch: FilterPatch) => void;
}

export function describePatch(patch: FilterPatch): string {
  const parts: string[] = [];
  if (patch.categories && patch.categories.length > 0) parts.push(patch.categories.join(' or '));
  const { minPrice, maxPrice } = patch;
  if (minPrice !== undefined && minPrice !== null && maxPrice !== undefined && maxPrice !== null) {
    parts.push(`${formatPrice(minPrice)} to ${formatPrice(maxPrice)}`);
  } else if (maxPrice !== undefined && maxPrice !== null) {
    parts.push(`up to ${formatPrice(maxPrice)}`);
  } else if (minPrice !== undefined && minPrice !== null) {
    parts.push(`from ${formatPrice(minPrice)}`);
  }
  if (patch.inStock) parts.push('in stock');
  if (patch.sort) parts.push(SORT_LABELS[patch.sort].toLowerCase());
  if (patch.q) parts.push(`“${patch.q}”`);
  return parts.join(' · ');
}

/**
 * Add-on (VITE_FEATURE_SMART_SEARCH): offers structured filters parsed from the text.
 * Nothing is applied until the user activates the button.
 */
export const SmartSearchSuggestion = memo(function SmartSearchSuggestion({
  text,
  interpreter,
  onApply,
}: SmartSearchSuggestionProps) {
  const patch = useMemo(() => interpreter.interpret(text), [interpreter, text]);
  if (!patch) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-ink">
      <span className="font-semibold">Smart filters found in your search</span>
      <Button variant="secondary" onClick={() => onApply(patch)}>
        <span>
          <span className="font-bold">Apply:</span> <span className="font-medium">{describePatch(patch)}</span>
        </span>
      </Button>
    </div>
  );
});
