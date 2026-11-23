import { createContext, useContext } from 'react';
import type { Product } from '../domain/product';
import type { UseProductsResult } from './useProducts';

/**
 * The catalog, loaded once for the whole app (see `app/CatalogDataProvider`), so moving
 * between the catalog, a product page and the cart never refetches, and Back to the catalog
 * renders immediately (which scroll restoration needs).
 */
export interface CatalogData {
  products: UseProductsResult;
  /** Lookup by id once loaded, otherwise null. */
  byId: ReadonlyMap<string, Product> | null;
}

export const CatalogDataContext = createContext<CatalogData | null>(null);

export function useCatalogData(): CatalogData {
  const data = useContext(CatalogDataContext);
  if (!data) throw new Error('useCatalogData() must be used inside <CatalogDataProvider>.');
  return data;
}
