import { isCategory, type Product } from '../domain/product';
import { ApiError, type ProductService } from './ProductService';

/**
 * The seam for a real API: `GET ${baseUrl}/products` returning `Product[]`.
 * Not exercised against a live server in this project.
 */
export class HttpProductService implements ProductService {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  async getProducts(signal?: AbortSignal): Promise<readonly Product[]> {
    const response = await this.fetchImpl(`${this.baseUrl}/products`, {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }
    const body: unknown = await response.json();
    if (!Array.isArray(body) || !body.every(isProduct)) {
      throw new ApiError('The products response had an unexpected shape', 502);
    }
    return body.map((product) => Object.freeze(product));
  }
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.title === 'string' &&
    typeof p.brand === 'string' &&
    typeof p.category === 'string' &&
    isCategory(p.category) &&
    typeof p.price === 'number' &&
    Number.isFinite(p.price) &&
    typeof p.rating === 'number' &&
    typeof p.inStock === 'boolean' &&
    typeof p.thumbnailUrl === 'string'
  );
}
