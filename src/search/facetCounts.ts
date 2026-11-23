import { CATEGORIES, type Category } from '../domain/product';

/** How many products each category would contribute with every non-category filter applied. */
export type FacetCounts = Readonly<Record<Category, number>>;

export function facetCountsFromArray(counts: ArrayLike<number>): FacetCounts {
  const result = {} as Record<Category, number>;
  CATEGORIES.forEach((category, code) => {
    result[category] = counts[code] ?? 0;
  });
  return result;
}
