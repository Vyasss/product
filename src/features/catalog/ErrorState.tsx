import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { AlertIcon, RefreshIcon } from '../../components/ui/icons';
import { ApiError } from '../../data/ProductService';
import { StateMessage } from './StateMessage';

export interface ErrorStateProps {
  error: Error;
  retrying: boolean;
  onRetry: () => void;
}

function describe(error: Error): string {
  if (error instanceof ApiError) return `The server responded with an error (status ${error.status}).`;
  return 'The request did not complete. Check your connection.';
}

/**
 * Retry receives focus when the error appears. While a retry is pending the button is
 * aria-disabled rather than disabled, so keyboard focus stays on it instead of being lost.
 */
export function ErrorState({ error, retrying, onRetry }: ErrorStateProps) {
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    retryRef.current?.focus();
  }, []);

  return (
    <StateMessage
      illustration={
        <span className="flex size-20 items-center justify-center rounded-full bg-danger-soft text-danger">
          <AlertIcon className="size-10" />
        </span>
      }
      title="We couldn’t load the products"
      action={
        <Button
          ref={retryRef}
          variant="primary"
          aria-disabled={retrying}
          onClick={() => {
            if (!retrying) onRetry();
          }}
        >
          <RefreshIcon className={`size-4 ${retrying ? 'motion-safe:animate-spin' : ''}`} />
          {retrying ? 'Retrying…' : 'Retry'}
        </Button>
      }
    >
      <p>
        {describe(error)} Your search and filters are kept.
      </p>
    </StateMessage>
  );
}
