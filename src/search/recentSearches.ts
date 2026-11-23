import { normalize } from './normalize';

export const MAX_RECENT_SEARCHES = 5;
export const MAX_RECENT_LENGTH = 100;
export const RECENT_SEARCHES_KEY = 'allinone.recent-searches.v1';

/** Where the list is kept (localStorage in the app, memory in tests). */
export interface RecentSearchStorage {
  read: () => string | null;
  write: (value: string) => void;
}

export interface RecentSearches {
  /** Most recent first. */
  list: () => readonly string[];
  /** Remembers a search. Blank or one-character text is ignored; a repeat moves to the front. */
  add: (query: string) => void;
  clear: () => void;
}

/** Total: never throws. Anything that is not a list of short non-empty strings is dropped. */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of data) {
    if (typeof item !== 'string') continue;
    const text = item.trim().slice(0, MAX_RECENT_LENGTH);
    const key = normalize(text);
    if (key.length < 2 || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length === MAX_RECENT_SEARCHES) break;
  }
  return result;
}

/**
 * The last few searches, kept in this browser only so the search box can offer them again.
 * Nothing is sent anywhere.
 */
export function createRecentSearches(storage: RecentSearchStorage): RecentSearches {
  let items = parseRecentSearches(storage.read());
  const save = (next: string[]) => {
    items = next;
    storage.write(JSON.stringify(next));
  };
  return {
    list: () => items,
    add: (query) => {
      const text = query.trim().slice(0, MAX_RECENT_LENGTH);
      const key = normalize(text);
      if (key.length < 2) return;
      save([text, ...items.filter((item) => normalize(item) !== key)].slice(0, MAX_RECENT_SEARCHES));
    },
    clear: () => save([]),
  };
}

/** localStorage backend. Storage can be unavailable (private mode, blocked): then nothing is remembered. */
export function localRecentSearchStorage(key: string = RECENT_SEARCHES_KEY, target: Window = window): RecentSearchStorage {
  return {
    read: () => {
      try {
        return target.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (value) => {
      try {
        target.localStorage.setItem(key, value);
      } catch {
        // Quota exceeded or storage blocked: keep working for this page only.
      }
    },
  };
}

export function memoryRecentSearchStorage(initial: string | null = null): RecentSearchStorage {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}
