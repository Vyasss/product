import { isPriceRangeInverted, type FilterState, type SortKey } from '../domain/filters';
import { CATEGORIES, type Product } from '../domain/product';
import { ALIAS_TERMS, expandToken } from './aliases';
import { buildIndex, CATEGORY_CODE, type SearchIndex } from './buildIndex';
import { facetCountsFromArray } from './facetCounts';
import { closestWord, type VocabularyWord } from './fuzzy';
import { tokenize } from './normalize';
import { withoutStopWords } from './stopWords';
import type { SearchEngine, SearchRelaxation, SearchResult } from './SearchEngine';

type Comparator = (a: number, b: number) => number;

function comparatorFor(sort: SortKey, index: SearchIndex): Comparator {
  const { price, rating } = index;
  // Ties always fall back to dataset position so the order is stable and deterministic.
  switch (sort) {
    case 'price_asc':
      return (a, b) => (price[a] ?? 0) - (price[b] ?? 0) || a - b;
    case 'price_desc':
      return (a, b) => (price[b] ?? 0) - (price[a] ?? 0) || a - b;
    case 'rating_desc':
      return (a, b) => (rating[b] ?? 0) - (rating[a] ?? 0) || a - b;
  }
}

/** Distinct normalised words of titles and brands (with product counts), plus alias keys. */
function buildVocabulary(haystacks: readonly string[]): VocabularyWord[] {
  const frequency = new Map<string, number>();
  for (const haystack of haystacks) {
    for (const word of new Set(haystack.split(/[^\p{L}\p{M}\p{N}-]+/u))) {
      if (word.length >= 2) frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }
  for (const term of ALIAS_TERMS) if (!frequency.has(term)) frequency.set(term, 0);
  return Array.from(frequency, ([word, count]) => ({ word, frequency: count }));
}

/**
 * Linear scan over a column-oriented index. For 5,000 items this takes well under a
 * millisecond per query (see `npm run bench`), so there is no need for an inverted index.
 *
 * Rules: groups combine with AND; categories with OR (none = all); price bounds are
 * inclusive and ignored when inverted; every query token (or one of its aliases) must
 * appear in title + brand. Facet counts apply every filter except category.
 *
 * Query handling, in order:
 * 1. Stop words ("ek", "please", "चाहिए") are removed, unless the query is only stop words.
 * 2. Strict: every remaining token must match. If that finds anything, it is the result.
 * 3. Otherwise, each token that matches no product at all is corrected to the closest
 *    catalog word (typo tolerance) or, if none is close, dropped, and the search runs again.
 *    The result says what was corrected or dropped. These steps only run when step 2 is
 *    empty, so the common case costs nothing extra.
 */
export class InMemorySearchEngine implements SearchEngine {
  private readonly index: SearchIndex;
  /** Built once with the index; only read when a strict search finds nothing. */
  private readonly vocabulary: readonly VocabularyWord[];

  constructor(products: readonly Product[]) {
    this.index = buildIndex(products);
    this.vocabulary = buildVocabulary(this.index.haystacks);
  }

  search(filters: FilterState): SearchResult {
    const tokens = withoutStopWords(tokenize(filters.q));
    const strict = this.scan(filters, tokens.map(expandToken));
    if (strict.indices.length > 0 || tokens.length === 0) return this.finish(filters, strict, null);

    const relaxation = this.relax(tokens);
    if (!relaxation) return this.finish(filters, strict, null);
    const relaxed = this.scan(filters, relaxation.tokens.map(expandToken));
    if (relaxed.indices.length === 0) return this.finish(filters, strict, null);
    return this.finish(filters, relaxed, relaxation.info);
  }

  /** Correct or drop the tokens that match no product at all. Null when nothing changes. */
  private relax(tokens: readonly string[]): { tokens: string[]; info: SearchRelaxation } | null {
    const kept: string[] = [];
    const corrections: { from: string; to: string }[] = [];
    const ignored: string[] = [];
    for (const token of tokens) {
      if (this.matchesAnyProduct(token)) {
        kept.push(token);
        continue;
      }
      const corrected = closestWord(token, this.vocabulary);
      if (corrected) {
        kept.push(corrected);
        corrections.push({ from: token, to: corrected });
      } else {
        ignored.push(token);
      }
    }
    if (kept.length === 0 || (corrections.length === 0 && ignored.length === 0)) return null;
    return {
      tokens: kept,
      info: { appliedQuery: kept.join(' '), originalQuery: tokens.join(' '), corrections, ignored },
    };
  }

  private matchesAnyProduct(token: string): boolean {
    const group = expandToken(token);
    return this.index.haystacks.some((haystack) => group.some((term) => haystack.includes(term)));
  }

  private scan(filters: FilterState, tokenGroups: readonly (readonly string[])[]): { indices: number[]; facets: Uint32Array } {
    const { haystacks, price, inStock, category } = this.index;
    const count = haystacks.length;
    const applyPrice = !isPriceRangeInverted(filters);
    const min = applyPrice && filters.minPrice !== null ? filters.minPrice : -Infinity;
    const max = applyPrice && filters.maxPrice !== null ? filters.maxPrice : Infinity;

    const selected = new Uint8Array(CATEGORIES.length);
    for (const c of filters.categories) selected[CATEGORY_CODE[c]] = 1;
    const anyCategory = filters.categories.length === 0;

    const facets = new Uint32Array(CATEGORIES.length);
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      if (filters.inStock && inStock[i] === 0) continue;
      const p = price[i] ?? 0;
      if (p < min || p > max) continue;
      if (tokenGroups.length > 0 && !matchesAllTokens(haystacks[i] ?? '', tokenGroups)) continue;

      const code = category[i] ?? 0;
      facets[code] = (facets[code] ?? 0) + 1;
      if (anyCategory || selected[code] === 1) indices.push(i);
    }
    return { indices, facets };
  }

  private finish(
    filters: FilterState,
    { indices, facets }: { indices: number[]; facets: Uint32Array },
    relaxed: SearchRelaxation | null,
  ): SearchResult {
    if (filters.sort !== null) indices.sort(comparatorFor(filters.sort, this.index));
    return { indices, total: indices.length, facetCounts: facetCountsFromArray(facets), relaxed };
  }
}

function matchesAllTokens(haystack: string, tokenGroups: readonly (readonly string[])[]): boolean {
  for (const group of tokenGroups) {
    let matched = false;
    for (const term of group) {
      if (haystack.includes(term)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }
  return true;
}

export const createInMemorySearchEngine = (products: readonly Product[]): SearchEngine =>
  new InMemorySearchEngine(products);
