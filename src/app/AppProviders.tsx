import { useMemo, type ReactNode } from 'react';
import { LiveRegion } from '../components/ui/LiveRegion';
import type { AppConfig } from '../config/env';
import { AnnounceContext } from '../hooks/useAnnounce';
import { useAnnouncer } from '../hooks/useAnnouncer';
import { CatalogDataContext } from '../hooks/useCatalogData';
import { useProducts } from '../hooks/useProducts';
import { useServices, type Services } from '../hooks/useServices';
import { ServicesProvider } from './ServicesProvider';

/** Loads the catalog once and shares it with every page. */
function CatalogDataProvider({ children }: { children: ReactNode }) {
  const { productService } = useServices();
  const products = useProducts(productService);
  const list = products.status === 'success' ? products.products : null;
  const byId = useMemo(() => (list ? new Map(list.map((product) => [product.id, product])) : null), [list]);
  const value = useMemo(() => ({ products, byId }), [products, byId]);
  return <CatalogDataContext value={value}>{children}</CatalogDataContext>;
}

/** One polite live region for the whole app; pages announce through `useAnnounce()`. */
function AnnouncerProvider({ children }: { children: ReactNode }) {
  const { message, announce } = useAnnouncer();
  return (
    <AnnounceContext value={announce}>
      {children}
      <LiveRegion message={message} />
    </AnnounceContext>
  );
}

export interface AppProvidersProps {
  config: AppConfig;
  /** Tests pass fakes; otherwise services are created from `config`. */
  services?: Services;
  children: ReactNode;
}

/** Everything above the router: services, the live region and the shared catalog data. */
export function AppProviders({ config, services, children }: AppProvidersProps) {
  return (
    <ServicesProvider config={config} {...(services ? { services } : {})}>
      <AnnouncerProvider>
        <CatalogDataProvider>{children}</CatalogDataProvider>
      </AnnouncerProvider>
    </ServicesProvider>
  );
}
