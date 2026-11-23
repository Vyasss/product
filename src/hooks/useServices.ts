import { createContext, useContext } from 'react';
import type { CartStore } from '../cart/cartStore';
import type { ProductContentProvider } from '../data/productContent';
import type { MockControls } from '../data/mockControls';
import type { ProductService } from '../data/ProductService';
import type { SearchEngineFactory } from '../search/SearchEngine';
import type { QueryInterpreter } from '../smart-search/QueryInterpreter';

/**
 * Everything the UI needs from the outside world, as interfaces. Implementations are chosen
 * once in `app/ServicesProvider` and tests inject fakes. Add-ons are present only when enabled:
 * a null capability means the related UI is not rendered at all.
 */
export interface Services {
  productService: ProductService;
  /** Add-on: the shopping cart (localStorage in the app, memory in tests). */
  cartStore: CartStore;
  /** Add-on: generated display content (description, highlights, review count). */
  productContent: ProductContentProvider;
  createSearchEngine: SearchEngineFactory;
  /** Add-on: non-null only when VITE_FEATURE_SMART_SEARCH is on. */
  queryInterpreter: QueryInterpreter | null;
  /** Add-on: non-null only when VITE_ENABLE_MOCK_CONTROLS is on and the mock service is used. */
  mockControls: MockControls | null;
}

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices() must be used inside <ServicesProvider>.');
  }
  return services;
}
