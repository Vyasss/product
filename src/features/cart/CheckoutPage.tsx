import { useId, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { InfoIcon } from '../../components/ui/icons';
import { Skeleton } from '../../components/ui/Skeleton';
import { TextAreaField } from '../../components/ui/TextAreaField';
import { TextField } from '../../components/ui/TextField';
import { useAnnounce } from '../../hooks/useAnnounce';
import { useCart } from '../../hooks/useCart';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { ErrorState } from '../catalog/ErrorState';
import { formatPrice } from '../catalog/format';
import { StorePage } from '../shell/StorePage';
import {
  DELIVERY_FIELDS,
  EMPTY_DELIVERY,
  orderReference,
  validateDelivery,
  validateField,
  type DeliveryDetails,
  type DeliveryField,
} from './checkoutForm';

export interface ConfirmationState {
  reference: string;
  count: number;
  total: number;
}

/**
 * `/checkout` (lazy-loaded add-on). There is no payment step. The delivery details live only
 * in this component's state: they are validated in the browser, never written to storage,
 * the URL or history state, and never sent anywhere. Placing the order clears the cart.
 */
export default function CheckoutPage() {
  const { products } = useCatalogData();
  const { store, summary } = useCart();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryId = useId();

  const [details, setDetails] = useState<DeliveryDetails>(EMPTY_DELIVERY);
  const [touched, setTouched] = useState<Partial<Record<DeliveryField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [placed, setPlaced] = useState(false);

  useDocumentTitle('Checkout');
  useFocusOnNavigation(headingRef, products.status !== 'loading');

  if (products.status === 'success' && summary.items.length === 0 && !placed) {
    return <Navigate to="/cart" replace />;
  }

  const errors = validateDelivery(details);
  const errorFor = (field: DeliveryField) => (submitted || touched[field] ? errors[field] : undefined);
  const bind = (field: DeliveryField) => ({
    value: details[field],
    onChange: (event: { target: { value: string } }) => setDetails((current) => ({ ...current, [field]: event.target.value })),
    onBlur: () => setTouched((current) => ({ ...current, [field]: true })),
    id: `checkout-${field}`,
    error: errorFor(field),
    required: true,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const invalid = DELIVERY_FIELDS.filter((field) => validateField(field, details[field]) !== undefined);
    if (invalid.length > 0) {
      announce(`${invalid.length} ${invalid.length === 1 ? 'field needs' : 'fields need'} attention`, 0);
      const first = invalid[0];
      if (first) document.getElementById(`checkout-${first}`)?.focus();
      return;
    }
    const confirmation: ConfirmationState = { reference: orderReference(), count: summary.count, total: summary.total };
    setPlaced(true);
    store.clear();
    setDetails(EMPTY_DELIVERY);
    void navigate('/checkout/confirmation', { replace: true, state: confirmation });
  };

  return (
    <StorePage width="narrow">
      <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-ink focus:outline-none md:text-3xl">
        Checkout
      </h1>
      <div role="note" className="mt-4 flex gap-3 rounded-card border border-line bg-warn-soft p-4 text-sm text-warn-ink">
        <InfoIcon className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>This is a demo store.</strong> No payment is taken and nothing is shipped. The details you type
          here are checked in your browser only; they are not sent anywhere or saved.
        </p>
      </div>

      {products.status === 'loading' && <Skeleton className="mt-6 h-64 w-full rounded-card" />}
      {products.status === 'error' && (
        <div className="mt-6">
          <ErrorState error={products.error} retrying={products.retrying} onRetry={products.retry} />
        </div>
      )}

      {products.status === 'success' && summary.items.length > 0 && (
        <div className="mt-6 grid items-start gap-6 md:grid-cols-[1fr_20rem]">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-ink">Delivery details</h2>
            <p className="mt-1 text-sm text-ink-muted">All fields are required.</p>
            <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-4" aria-label="Delivery details">
              <TextField label="Full name" autoComplete="name" {...bind('name')} />
              <TextAreaField label="Delivery address" autoComplete="street-address" {...bind('address')} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="PIN code"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  maxLength={7}
                  {...bind('pin')}
                />
                <TextField label="Mobile number" type="tel" autoComplete="tel" inputMode="tel" {...bind('phone')} />
              </div>
              <Button type="submit" variant="primary" className="mt-2 w-full sm:w-auto sm:self-start">
                Place order
              </Button>
            </form>
          </Card>
          <section aria-labelledby={summaryId}>
            <Card className="p-5">
              <h2 id={summaryId} className="text-lg font-bold text-ink">
                Order summary
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {summary.items.map(({ product, quantity, lineTotal }) => (
                  <li key={product.id} className="flex justify-between gap-3">
                    <span className="min-w-0 text-ink">
                      {product.title} <span className="text-ink-muted">× {quantity}</span>
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{formatPrice(lineTotal)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-line pt-3">
                <span className="font-bold text-ink">Total</span>
                <span className="text-xl font-bold text-ink tabular-nums">{formatPrice(summary.total)}</span>
              </div>
            </Card>
          </section>
        </div>
      )}
    </StorePage>
  );
}
