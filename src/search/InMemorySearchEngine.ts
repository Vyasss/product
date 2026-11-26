import { isPriceRangeInverted, type FilterState, type SortKey } from '../domain/filters';
import { CATEGORIES, type Product } from '../domain/product';
import { ALIAS_TERMS, expandToken } from './aliases';
import { ALL_ITEM_TYPES, type ItemType } from '../domain/productType';
import { buildIndex, CATEGORY_CODE, CATEGORY_KEYS, ITEM_TYPE_CODE, type SearchIndex } from './buildIndex';
import { facetCountsFromArray } from './facetCounts';
import { closestBySound, closestWord, splitCompound, type VocabularyWord } from './fuzzy';
import { tokenize } from './normalize';
import { withoutStopWords } from './stopWords';
import { buildSuggestionEntries, suggest, type SuggestionEntry } from './suggest';
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

/** Shortest query word that may name a category by its first letters ("ele" for Electronics). */
const MIN_CATEGORY_PREFIX = 3;

/** Category codes whose name starts with one of the terms; null when there is none. */
function categoriesNamedBy(terms: readonly string[]): Uint8Array | null {
  let named: Uint8Array | null = null;
  CATEGORY_KEYS.forEach((key, code) => {
    if (terms.some((term) => term.length >= MIN_CATEGORY_PREFIX && key.startsWith(term))) {
      named ??= new Uint8Array(CATEGORY_KEYS.length);
      named[code] = 1;
    }
  });
  return named;
}

/** One query word: the texts that may appear in title + brand, and the categories it names. */
interface TokenMatcher {
  readonly terms: readonly string[];
  readonly categories: Uint8Array | null;
}

const matcherFor = (token: string): TokenMatcher => {
  const terms = expandToken(token);
  return { terms, categories: categoriesNamedBy(terms) };
};

/** Distinct normalised words of titles, brands and category names (with product counts), plus alias keys. */
function buildVocabulary(index: SearchIndex): VocabularyWord[] {
  const frequency = new Map<string, number>();
  for (const haystack of index.haystacks) {
    for (const word of new Set(haystack.split(/[^\p{L}\p{M}\p{N}-]+/u))) {
      if (word.length >= 2) frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }
  for (const code of index.category) {
    const key = CATEGORY_KEYS[code];
    if (key !== undefined) frequency.set(key, (frequency.get(key) ?? 0) + 1);
  }
  for (const term of ALIAS_TERMS) if (!frequency.has(term)) frequency.set(term, 0);
  return Array.from(frequency, ([word, count]) => ({ word, frequency: count }));
}

/**
 * Linear scan over a column-oriented index. For 5,000 items this takes well under a
 * millisecond per query (see `npm run bench`), so there is no need for an inverted index.
 *
 * Rules: groups combine with AND; categories with OR (none = all), and so do product types;
 * price bounds are inclusive and ignored when inverted; every query token (or one of its
 * aliases) must appear in title + brand, or be the start of the product's category name
 * ("elec", "electronics"). Category counts apply every filter except category; type counts
 * apply every filter except type.
 *
 * Query handling, in order:
 * 1. Stop words ("ek", "please", "चाहिए") are removed, unless the query is only stop words.
 * 2. Strict: every remaining token must match. If that finds anything, it is the result.
 * 3. Otherwise, each token that matches no product at all is split into two catalog words
 *    if it is two words run together ("smarttv"), else corrected to the closest catalog
 *    word by edit distance, else to one that sounds alike ("hedfones"), else dropped, and
 *    the search runs again.
 *    The result says what was corrected or dropped. These steps only run when step 2 is
 *    empty, so the common case costs nothing extra.
 */
export class InMemorySearchEngine implements SearchEngine {
  private readonly index: SearchIndex;
  /** Built once with the index; only read when a strict search finds nothing. */
  private readonly vocabulary: readonly VocabularyWord[];
  private readonly wordFrequency: ReadonlyMap<string, number>;
  /** Built by `prepareSuggestions` (the UI calls it when idle) or, failing that, on first use. */
  private suggestionEntries: readonly SuggestionEntry[] | null = null;

  constructor(products: readonly Product[]) {
    this.index = buildIndex(products);
    this.vocabulary = buildVocabulary(this.index);
    this.wordFrequency = new Map(this.vocabulary.map(({ word, frequency }) => [word, frequency]));
  }

  prepareSuggestions(): readonly SuggestionEntry[] {
    this.suggestionEntries ??= buildSuggestionEntries(this.index.products);
    return this.suggestionEntries;
  }

  suggest(text: string, limit?: number): readonly SuggestionEntry[] {
    return suggest(text, this.prepareSuggestions(), limit);
  }

  search(filters: FilterState): SearchResult {
    const tokens = withoutStopWords(tokenize(filters.q));
    const strict = this.scan(filters, tokens.map(matcherFor));
    if (strict.indices.length > 0 || tokens.length === 0) return this.finish(filters, strict, null);

    const relaxation = this.relax(tokens);
    if (!relaxation) return this.finish(filters, strict, null);
    const relaxed = this.scan(filters, relaxation.tokens.map(matcherFor));
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
      const parts = splitCompound(token, this.wordFrequency);
      if (parts) {
        kept.push(...parts);
        corrections.push({ from: token, to: parts.join(' ') });
        continue;
      }
      const corrected = closestWord(token, this.vocabulary) ?? closestBySound(token, this.vocabulary);
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
    const matcher = matcherFor(token);
    const { haystacks, category } = this.index;
    return haystacks.some((haystack, i) => matchesToken(haystack, category[i] ?? 0, matcher));
  }

  private scan(filters: FilterState, matchers: readonly TokenMatcher[]): Scan {
    const { haystacks, price, inStock, category, itemType } = this.index;
    const count = haystacks.length;
    const applyPrice = !isPriceRangeInverted(filters);
    const min = applyPrice && filters.minPrice !== null ? filters.minPrice : -Infinity;
    const max = applyPrice && filters.maxPrice !== null ? filters.maxPrice : Infinity;

    const selected = new Uint8Array(CATEGORIES.length);
    for (const c of filters.categories) selected[CATEGORY_CODE[c]] = 1;
    const anyCategory = filters.categories.length === 0;

    const selectedTypes = new Uint8Array(ALL_ITEM_TYPES.length);
    for (const type of filters.types) selectedTypes[ITEM_TYPE_CODE.get(type) ?? 0] = 1;
    const anyType = filters.types.length === 0;

    const facets = new Uint32Array(CATEGORIES.length);
    const typeFacets = new Uint32Array(ALL_ITEM_TYPES.length);
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      if (filters.inStock && inStock[i] === 0) continue;
      const p = price[i] ?? 0;
      if (p < min || p > max) continue;
      const code = category[i] ?? 0;
      if (matchers.length > 0 && !matchesAllTokens(haystacks[i] ?? '', code, matchers)) continue;

      const type = itemType[i] ?? -1;
      const categoryOk = anyCategory || selected[code] === 1;
      const typeOk = anyType || (type >= 0 && selectedTypes[type] === 1);
      if (typeOk) facets[code] = (facets[code] ?? 0) + 1;
      if (categoryOk && type >= 0) typeFacets[type] = (typeFacets[type] ?? 0) + 1;
      if (categoryOk && typeOk) indices.push(i);
    }
    return { indices, facets, typeFacets };
  }

  private finish(filters: FilterState, { indices, facets, typeFacets }: Scan, relaxed: SearchRelaxation | null): SearchResult {
    if (filters.sort !== null) indices.sort(comparatorFor(filters.sort, this.index));
    const typeCounts = new Map<ItemType, number>();
    ALL_ITEM_TYPES.forEach((type, code) => {
      const matches = typeFacets[code] ?? 0;
      if (matches > 0) typeCounts.set(type, matches);
    });
    return { indices, total: indices.length, facetCounts: facetCountsFromArray(facets), typeCounts, relaxed };
  }
}

interface Scan {
  indices: number[];
  facets: Uint32Array;
  typeFacets: Uint32Array;
}

function matchesToken(haystack: string, categoryCode: number, { terms, categories }: TokenMatcher): boolean {
  if (categories !== null && categories[categoryCode] === 1) return true;
  for (const term of terms) if (haystack.includes(term)) return true;
  return false;
}

function matchesAllTokens(haystack: string, categoryCode: number, matchers: readonly TokenMatcher[]): boolean {
  for (const matcher of matchers) if (!matchesToken(haystack, categoryCode, matcher)) return false;
  return true;
}

export const createInMemorySearchEngine = (products: readonly Product[]): SearchEngine =>
  new InMemorySearchEngine(products);
