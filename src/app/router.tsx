import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';

// Add-on pages are code-split so the catalog bundle stays small.
const ProductPage = lazy(() => import('../features/product/ProductPage'));
const CartPage = lazy(() => import('../features/cart/CartPage'));
const CheckoutPage = lazy(() => import('../features/cart/CheckoutPage'));
const ConfirmationPage = lazy(() => import('../features/cart/ConfirmationPage'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-6">
      <span className="sr-only">Loading page…</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-6 h-72 w-full rounded-card" />
    </div>
  );
}

const lazyPage = (page: ReactNode) => <Suspense fallback={<PageFallback />}>{page}</Suspense>;

/** Route table, shared by the browser app and by tests (which wrap it in a MemoryRouter). */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/product/:id" element={lazyPage(<ProductPage />)} />
      <Route path="/cart" element={lazyPage(<CartPage />)} />
      <Route path="/checkout" element={lazyPage(<CheckoutPage />)} />
      <Route path="/checkout/confirmation" element={lazyPage(<ConfirmationPage />)} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
