import { useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { AlertIcon, RefreshIcon } from '../../components/ui/icons';
import { StateMessage } from '../../components/ui/StateMessage';
import { describeLoadError } from './loadErrorMessage';

export interface ErrorStateProps {
  error: Error;
  retrying: boolean;
  onRetry: () => void;
}

/**
 * Explains the failure in words that match its cause (offline, timeout, 404, 429, 503, ...)
 * and always offers Retry. Retry receives focus when the error appears. While a retry is
 * pending the button is aria-disabled rather than disabled, so keyboard focus stays on it
 * instead of being lost.
 */
export function ErrorState({ error, retrying, onRetry }: ErrorStateProps) {
  const retryRef = useRef<HTMLButtonElement>(null);
  const message = describeLoadError(error, typeof navigator === 'undefined' ? true : navigator.onLine);

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
        {message.text} Your search and filters are kept.
      </p>
    </StateMessage>
  );
}
