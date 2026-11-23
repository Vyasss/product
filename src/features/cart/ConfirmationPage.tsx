import { useRef } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { buttonClassName } from '../../components/ui/Button';
import { CheckIcon } from '../../components/ui/icons';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { formatPrice, pluralizeProducts } from '../shared/format';
import { StateMessage } from '../../components/ui/StateMessage';
import { StorePage } from '../shell/StorePage';
import type { ConfirmationState } from './CheckoutPage';

function isConfirmation(value: unknown): value is ConfirmationState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Record<string, unknown>;
  return typeof state.reference === 'string' && typeof state.count === 'number' && typeof state.total === 'number';
}

/** `/checkout/confirmation`: shown once after placing an order; direct visits go home. */
export default function ConfirmationPage() {
  const location = useLocation();
  const state: unknown = location.state;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDocumentTitle('Order placed');
  useFocusOnNavigation(headingRef);

  if (!isConfirmation(state)) return <Navigate to="/" replace />;

  return (
    <StorePage width="narrow">
      <StateMessage
        headingLevel="h1"
        headingRef={headingRef}
        illustration={
          <span className="flex size-20 items-center justify-center rounded-full bg-brand-soft text-success">
            <CheckIcon className="size-10" />
          </span>
        }
        title="Order placed"
        action={
          <Link to="/" className={buttonClassName('primary')}>
            Continue shopping
          </Link>
        }
      >
        <p className="text-base text-ink">
          Order reference <strong className="font-mono text-lg tracking-wider">{state.reference}</strong>
        </p>
        <p className="mt-1">
          {pluralizeProducts(state.count)} · {formatPrice(state.total)}
        </p>
        <p className="mt-4">
          This is a demo store: no payment was taken, nothing will be shipped, and the delivery details you entered
          were not sent or saved. Your cart has been emptied.
        </p>
      </StateMessage>
    </StorePage>
  );
}
