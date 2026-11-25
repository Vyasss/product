import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { Wordmark } from '../../components/layout/Wordmark';
import { CartButton } from '../cart/CartButton';
import { useFeatures } from '../../hooks/useServices';
import { QuickSearch } from '../catalog/QuickSearch';

export interface StorePageProps {
  children: ReactNode;
  /** Narrow pages (checkout) use a smaller max width. */
  width?: 'wide' | 'narrow';
}

/**
 * Layout for every page except the catalog: header (home link, search that opens the catalog,
 * cart), main content, footer. Pages start at the top: the app restores scroll itself only on
 * the catalog, so the browser's restoration is off.
 */
export function StorePage({ children, width = 'wide' }: StorePageProps) {
  const { cart } = useFeatures();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-card px-4 py-3 font-semibold text-brand-ink shadow-raised focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader
        brand={
          <Link to="/" className="block rounded-control">
            <span className="sr-only">AllinONE home</span>
            <span aria-hidden="true">
              <Wordmark markOnlyOnPhones />
            </span>
          </Link>
        }
        actions={cart ? <CartButton /> : undefined}
      >
        <QuickSearch />
      </SiteHeader>
      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto w-full flex-1 px-4 py-6 focus:outline-none ${width === 'narrow' ? 'max-w-5xl' : 'max-w-screen-2xl'}`}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
