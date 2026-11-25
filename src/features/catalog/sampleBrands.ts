import { CATEGORIES, type Category, type Product } from '../../domain/product';

const BRANDS_SHOWN = 10;

/**
 * Brands to suggest when a search finds nothing: taken in turn from each category (largest
 * brand first), so every kind of product is represented rather than only the biggest category.
 */
export function sampleBrands(products: readonly Product[], limit = BRANDS_SHOWN): string[] {
  const perCategory = new Map<Category, Map<string, number>>(CATEGORIES.map((category) => [category, new Map()]));
  for (const product of products) {
    const counts = perCategory.get(product.category);
    counts?.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }
  const queues = [...perCategory.values()].map((counts) =>
    [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([brand]) => brand),
  );
  const picked = new Set<string>();
  for (let round = 0; picked.size < limit && queues.some((queue) => queue.length > round); round++) {
    for (const queue of queues) {
      const brand = queue[round];
      if (brand !== undefined && picked.size < limit) picked.add(brand);
    }
  }
  return [...picked];
}
