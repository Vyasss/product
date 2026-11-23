import { Button } from '../../components/ui/Button';
import { StateMessage } from '../../components/ui/StateMessage';

export interface EmptyStateProps {
  query: string;
  onClearAll: () => void;
}

function EmptyIllustration() {
  return (
    <svg viewBox="0 0 120 96" className="h-24 w-32" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="88" rx="40" ry="5" className="fill-line" />
      <path d="M22 38h56l-6 46H28z" className="fill-tint stroke-line-strong" strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 38l10-14h36l10 14" className="fill-card stroke-line-strong" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="84" cy="34" r="16" className="fill-card stroke-brand" strokeWidth="5" />
      <path d="M95.5 45.5 108 58" className="stroke-brand" strokeWidth="7" strokeLinecap="round" />
      <path d="M78 34h12" className="stroke-brand" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Shown only after a successful load that matched nothing. */
export function EmptyState({ query, onClearAll }: EmptyStateProps) {
  return (
    <StateMessage
      illustration={<EmptyIllustration />}
      title={`No products match ${query ? `“${query}”` : 'these filters'}`}
      action={
        <Button variant="primary" onClick={onClearAll}>
          Clear all filters
        </Button>
      }
    >
      <ul className="space-y-1 text-left">
        <li>Check the spelling, or try a shorter word such as a brand name.</li>
        <li>Remove a filter using the chips above the results.</li>
        <li>Widen the price range or include unavailable products.</li>
      </ul>
    </StateMessage>
  );
}
