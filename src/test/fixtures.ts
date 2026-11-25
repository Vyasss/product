import { createCartStore, memoryCartStorage, type CartStore } from '../cart/cartStore';
import { createFailurePolicy } from '../data/mockControls';
import { templateProductContent } from '../data/productContent';
import { MockProductService } from '../data/MockProductService';
import { ApiError, createAbortError, type ProductService } from '../data/ProductService';
import type { Product } from '../domain/product';
import type { Features, Services } from '../hooks/useServices';
import { createInMemorySearchEngine } from '../search/InMemorySearchEngine';
import { createRecentSearches, memoryRecentSearchStorage } from '../search/recentSearches';
import { RuleBasedInterpreter } from '../smart-search/RuleBasedInterpreter';

export function makeProduct(overrides: Partial<Product> & Pick<Product, 'id'>): Product {
  return Object.freeze({
    title: 'Untitled',
    brand: 'Brand',
    category: 'Home',
    price: 100,
    rating: 3,
    inStock: true,
    thumbnailUrl: '/thumb.svg',
    ...overrides,
  });
}

/** A small, hand-checked catalog for engine and interaction tests. */
export const FIXTURE_PRODUCTS: readonly Product[] = [
  makeProduct({ id: 'p-1', title: 'Trail Running Shoes', brand: 'Stridex', category: 'Sports', price: 2499, rating: 4.5 }),
  makeProduct({ id: 'p-2', title: 'Leather Formal Shoes', brand: 'Élan', category: 'Apparel', price: 3999, rating: 4.1 }),
  makeProduct({ id: 'p-3', title: 'Cotton T-Shirt', brand: 'Kora', category: 'Apparel', price: 499, rating: 3.9, inStock: false }),
  makeProduct({ id: 'p-4', title: 'Wireless Earbuds Pro', brand: 'Voltix', category: 'Electronics', price: 2999, rating: 4.5 }),
  makeProduct({ id: 'p-5', title: 'Smart Watch Neo', brand: 'Nexora', category: 'Electronics', price: 8999, rating: 4.7, inStock: false }),
  makeProduct({ id: 'p-6', title: 'Jute Rug', brand: 'Café Living', category: 'Home', price: 1299, rating: 4.0 }),
  makeProduct({ id: 'p-7', title: 'Ceramic Dinner Set', brand: 'Casa Verde', category: 'Home', price: 2499, rating: 3.5 }),
  makeProduct({ id: 'p-8', title: 'Monsoon Letters: Novel', brand: 'Penrose Press', category: 'Books', price: 399, rating: 4.8 }),
  makeProduct({ id: 'p-9', title: 'Indian Kitchen Classics: Cookbook', brand: 'Banyan House', category: 'Books', price: 699, rating: 4.2, inStock: false }),
  makeProduct({ id: 'p-10', title: 'Yoga Mat Lightweight', brand: 'Peakform', category: 'Sports', price: 899, rating: 4.4 }),
  makeProduct({ id: 'p-11', title: 'Canvas Sneakers', brand: 'Urban Thread', category: 'Apparel', price: 1799, rating: 3.8 }),
  makeProduct({ id: 'p-12', title: 'Cricket Bat Pro', brand: 'Arena Pro', category: 'Sports', price: 5499, rating: 4.6 }),
];

/** Zero-latency service for interaction tests, with queued failures. */
export class FakeProductService implements ProductService {
  calls = 0;
  private failures: number;

  constructor(
    private readonly products: readonly Product[] = FIXTURE_PRODUCTS,
    options: { failures?: number } = {},
  ) {
    this.failures = options.failures ?? 0;
  }

  getProducts(signal?: AbortSignal): Promise<readonly Product[]> {
    this.calls += 1;
    if (signal?.aborted) return Promise.reject(createAbortError());
    if (this.failures > 0) {
      this.failures -= 1;
      return Promise.reject(new ApiError('Simulated server error', 500));
    }
    return Promise.resolve(this.products);
  }
}

export interface TestServicesOptions {
  service?: ProductService;
  /** Smart search and mock controls are off unless a test turns them on. */
  smartSearch?: boolean;
  mockControls?: boolean;
  /** Pass a store on a shared memory backend to simulate a reload. */
  cartStore?: CartStore;
  /**
   * Cart and share default to on here, so the tests of those features need no setup;
   * the shipped default (both off) is covered by tests that pass `{ cart: false, share: false }`.
   */
  features?: Partial<Features>;
}

export function createTestServices(options: TestServicesOptions = {}): Services {
  if (options.mockControls) {
    // The real mock service with zero latency, so the on-page controls drive actual failures.
    const failurePolicy = createFailurePolicy();
    return {
      productService:
        options.service ??
        new MockProductService({ latency: () => 0, failurePolicy, loadProducts: () => FIXTURE_PRODUCTS }),
      createSearchEngine: createInMemorySearchEngine,
      recentSearches: createRecentSearches(memoryRecentSearchStorage()),
      queryInterpreter: options.smartSearch ? new RuleBasedInterpreter() : null,
      mockControls: failurePolicy,
      cartStore: options.cartStore ?? createCartStore(memoryCartStorage()),
      productContent: templateProductContent,
      features: { cart: true, share: true, ...options.features },
    };
  }
  return {
    productService: options.service ?? new FakeProductService(),
    createSearchEngine: createInMemorySearchEngine,
    recentSearches: createRecentSearches(memoryRecentSearchStorage()),
    queryInterpreter: options.smartSearch ? new RuleBasedInterpreter() : null,
    mockControls: null,
    cartStore: options.cartStore ?? createCartStore(memoryCartStorage()),
    productContent: templateProductContent,
    features: { cart: true, share: true, ...options.features },
  };
}
