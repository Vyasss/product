import { HttpProductService } from './HttpProductService';
import { createFailurePolicy, readMockFailParam, type MockControls } from './mockControls';
import { MockProductService } from './MockProductService';
import type { ProductService } from './ProductService';

export interface ProductServiceSettings {
  apiBaseUrl: string | null;
  mockFailRate: number;
  /** The page's query string at startup; only the mock layer reads `mockFail` from it. */
  locationSearch: string;
}

export interface CreatedProductService {
  service: ProductService;
  /** Present only for the mock service. */
  mockControls: MockControls | null;
}

/** The single place that decides which `ProductService` implementation the app uses. */
export function createProductService(settings: ProductServiceSettings): CreatedProductService {
  if (settings.apiBaseUrl) {
    return { service: new HttpProductService(settings.apiBaseUrl), mockControls: null };
  }

  const failurePolicy = createFailurePolicy({
    failRate: settings.mockFailRate,
    failFirst: readMockFailParam(settings.locationSearch),
  });
  return { service: new MockProductService({ failurePolicy }), mockControls: failurePolicy };
}
