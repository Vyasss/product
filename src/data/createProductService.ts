import { HttpProductService } from './HttpProductService';
import { createFailurePolicy, readMockFailParam, readMockStatusParam, type MockControls } from './mockControls';
import { MockProductService } from './MockProductService';
import type { ProductService } from './ProductService';
import { RetryingProductService } from './RetryingProductService';

export interface ProductServiceSettings {
  apiBaseUrl: string | null;
  mockFailRate: number;
  /** The page's query string at startup; only the mock layer reads `mockFail` and `mockStatus` from it. */
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
    // A real API can have a bad moment: retry short-lived failures quietly before showing an error.
    const service = new RetryingProductService(new HttpProductService(settings.apiBaseUrl));
    return { service, mockControls: null };
  }

  const failurePolicy = createFailurePolicy({
    failRate: settings.mockFailRate,
    failFirst: readMockFailParam(settings.locationSearch),
  });
  const failure = readMockStatusParam(settings.locationSearch);
  // Not wrapped in RetryingProductService: the simulated failure must reach the screen.
  return { service: new MockProductService({ failurePolicy, failure }), mockControls: failurePolicy };
}
