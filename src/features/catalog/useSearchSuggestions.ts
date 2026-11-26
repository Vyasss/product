import { useCallback, useMemo, useState } from 'react';
import { useServices } from '../../hooks/useServices';
import { normalize } from '../../search/normalize';
import type { SearchEngine } from '../../search/SearchEngine';

export interface SearchSuggestion {
  text: string;
  kind: 'recent' | 'product' | 'brand' | 'category';
}

const MAX_MATCHING_RECENTS = 2;
const MAX_COMPLETIONS = 6;

/**
 * What the search box offers for the current text. Empty box: the recent searches. While
 * typing: recent searches that start with the text, then completions from the catalog.
 */
export function buildSuggestionList(
  text: string,
  engine: Pick<SearchEngine, 'suggest'> | null,
  recents: readonly string[],
): SearchSuggestion[] {
  const typed = normalize(text);
  if (typed === '') return recents.map((recent) => ({ text: recent, kind: 'recent' }));

  const matchingRecents = recents
    .filter((recent) => {
      const key = normalize(recent);
      return key !== typed && key.startsWith(typed);
    })
    .slice(0, MAX_MATCHING_RECENTS);
  const taken = new Set(matchingRecents.map(normalize));
  const completions = (engine?.suggest(text, MAX_COMPLETIONS) ?? []).filter((entry) => !taken.has(entry.key));

  return [
    ...matchingRecents.map((recent): SearchSuggestion => ({ text: recent, kind: 'recent' })),
    ...completions.map((entry): SearchSuggestion => ({ text: entry.text, kind: entry.kind })),
  ];
}

export interface SearchSuggestions {
  suggestions: readonly SearchSuggestion[];
  /** Remember a search the user committed to (Enter, or picking a suggestion). */
  remember: (query: string) => void;
}

/** Suggestions for `text`, plus the way to record a search in this browser's recent list. */
export function useSearchSuggestions(text: string, engine: Pick<SearchEngine, 'suggest'> | null): SearchSuggestions {
  const { recentSearches } = useServices();
  const [recents, setRecents] = useState(() => recentSearches.list());

  const remember = useCallback(
    (query: string) => {
      recentSearches.add(query);
      setRecents(recentSearches.list());
    },
    [recentSearches],
  );

  const suggestions = useMemo(() => buildSuggestionList(text, engine, recents), [text, engine, recents]);
  return { suggestions, remember };
}
