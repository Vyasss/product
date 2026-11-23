export interface LiveRegionProps {
  message: string;
}

/**
 * A single polite live region. It is always mounted (regions added together with their
 * text are often not announced) and only its text changes.
 */
export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
