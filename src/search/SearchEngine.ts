import type { FilterState } from '../domain/filters';
import type { Product } from '../domain/product';
import type { FacetCounts } from './facetCounts';
import type { SuggestionEntry } from './suggest';

export interface SearchResult {
  /** Positions into the products array the engine was built with, in display order. */
  readonly indices: readonly number[];
  readonly total: number;
  readonly facetCounts: FacetCounts;
  /**
   * Set only when the strict match was empty and the query was relaxed: the words actually
   * searched for, typo corrections made, and words dropped because nothing matched them.
   */
  readonly relaxed: SearchRelaxation | null;
}

export interface SearchRelaxation {
  /** The words searched for after relaxing (stop words removed), e.g. "smart tv". */
  readonly appliedQuery: string;
  /** The content words as typed (stop words removed), e.g. "smrt tv xyz". */
  readonly originalQuery: string;
  readonly corrections: readonly { readonly from: string; readonly to: string }[];
  readonly ignored: readonly string[];
}

/**
 * Where filtering runs. The in-memory implementation is synchronous; a Web Worker
 * implementation could sit behind the same contract if the catalog grows.
 */
export interface SearchEngine {
  search(filters: FilterState): SearchResult;
  /** Completions for partly typed text, best first. Each one finds products when searched. */
  suggest(text: string, limit?: number): readonly SuggestionEntry[];
}

export type SearchEngineFactory = (products: readonly Product[]) => SearchEngine;
