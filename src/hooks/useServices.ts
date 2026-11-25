import { createContext, useContext } from 'react';
import type { CartStore } from '../cart/cartStore';
import type { ProductContentProvider } from '../data/productContent';
import type { MockControls } from '../data/mockControls';
import type { ProductService } from '../data/ProductService';
import type { RecentSearches } from '../search/recentSearches';
import type { SearchEngineFactory } from '../search/SearchEngine';
import type { QueryInterpreter } from '../smart-search/QueryInterpreter';

/** Optional storefront features, fixed at build time. Off means the UI is not rendered at all. */
export interface Features {
  cart: boolean;
  share: boolean;
  /** Product detail page; off, cards are not links and the app is one page. */
  productPage: boolean;
}

/**
 * Everything the UI needs from the outside world, as interfaces. Implementations are chosen
 * once in `app/ServicesProvider` and tests inject fakes. Optional services are present only when enabled:
 * a null capability means the related UI is not rendered at all.
 */
export interface Services {
  productService: ProductService;
  /** The shopping cart (localStorage in the app, memory in tests). */
  cartStore: CartStore;
  /** Generated display content (description, highlights, review count). */
  productContent: ProductContentProvider;
  createSearchEngine: SearchEngineFactory;
  /** The last few searches, kept in this browser only (localStorage in the app, memory in tests). */
  recentSearches: RecentSearches;
  /** Non-null only when VITE_FEATURE_SMART_SEARCH is on. */
  queryInterpreter: QueryInterpreter | null;
  /** Non-null only when VITE_ENABLE_MOCK_CONTROLS is on and the mock service is used. */
  mockControls: MockControls | null;
  /** VITE_FEATURE_CART, VITE_FEATURE_SHARE and VITE_FEATURE_PRODUCT_PAGE. */
  features: Features;
}

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error('useServices() must be used inside <ServicesProvider>.');
  }
  return services;
}

export function useFeatures(): Features {
  return useServices().features;
}
