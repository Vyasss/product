import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { Skeleton } from '../components/ui/Skeleton';
import { CatalogPage } from '../features/catalog/CatalogPage';
import { NotFoundPage } from '../features/not-found/NotFoundPage';
import { useFeatures } from '../hooks/useServices';
import { browserReloadEnvironment, loadWithReload } from './lazyWithReload';

// These pages are code-split so the catalog bundle stays small. A chunk that fails to load
// (typically a tab opened before a deploy) triggers one automatic reload; see lazyWithReload.
const reloadEnv = browserReloadEnvironment();
const page = <T extends ComponentType>(load: () => Promise<{ default: T }>) =>
  lazy(() => loadWithReload(load, reloadEnv));

const ProductPage = page(() => import('../features/product/ProductPage'));
const CartPage = page(() => import('../features/cart/CartPage'));
const CheckoutPage = page(() => import('../features/cart/CheckoutPage'));
const ConfirmationPage = page(() => import('../features/cart/ConfirmationPage'));

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

/**
 * Route table, shared by the browser app and by tests (which wrap it in a MemoryRouter).
 * Features that are off have no routes: their paths are unknown paths like any other. With
 * every optional feature off (the default build) the app is the single catalog page.
 */
export function AppRoutes() {
  const { cart, productPage } = useFeatures();
  return (
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      {productPage && <Route path="/product/:id" element={lazyPage(<ProductPage />)} />}
      {cart && <Route path="/cart" element={lazyPage(<CartPage />)} />}
      {cart && <Route path="/checkout" element={lazyPage(<CheckoutPage />)} />}
      {cart && <Route path="/checkout/confirmation" element={lazyPage(<ConfirmationPage />)} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
