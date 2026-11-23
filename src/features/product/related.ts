import type { Product } from '../../domain/product';

export interface RelatedProducts {
  /** Same brand (any category), in-stock first, then dataset order. */
  sameBrand: Product[];
  /** Same category, other brands, closest in price first. */
  sameCategory: Product[];
}

/**
 * "More from this brand" and "More in <category>" strips, computed from the dataset only.
 * The two lists never repeat a product, and never include the product itself.
 */
export function relatedProducts(product: Product, all: readonly Product[], limit = 4): RelatedProducts {
  const sameBrand = all
    .filter((p) => p.id !== product.id && p.brand === product.brand)
    .sort((a, b) => Number(b.inStock) - Number(a.inStock))
    .slice(0, limit);
  const taken = new Set(sameBrand.map((p) => p.id));
  const sameCategory = all
    .filter((p) => p.id !== product.id && p.category === product.category && p.brand !== product.brand && !taken.has(p.id))
    .map((p, index) => ({ p, index, distance: Math.abs(Math.log(p.price) - Math.log(product.price)) }))
    .sort((a, b) => Number(b.p.inStock) - Number(a.p.inStock) || a.distance - b.distance || a.index - b.index)
    .slice(0, limit)
    .map(({ p }) => p);
  return { sameBrand, sameCategory };
}
