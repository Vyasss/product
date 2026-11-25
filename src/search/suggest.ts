import type { Product } from '../domain/product';
import { normalize, tokenize } from './normalize';

export interface SuggestionEntry {
  /** What is shown and, when picked, searched for. */
  readonly text: string;
  /** normalize(text): what the query is matched against. */
  readonly key: string;
  readonly words: readonly string[];
  /** Number of products the phrase comes from; more common phrases rank higher. */
  readonly count: number;
  readonly kind: 'product' | 'brand';
}

const MAX_PHRASE_WORDS = 3;
/** A product phrase must occur in at least this many titles; one-off wordings are noise. */
const MIN_PHRASE_PRODUCTS = 2;
/** Single words shorter than this are model codes and the like ("z4"), not things to search for. */
const MIN_SINGLE_WORD_LENGTH = 3;
const TRAILING_PUNCTUATION = /[:;,.!?]+$/;
const MIN_QUERY_LENGTH = 1;

/**
 * Phrases worth completing to, taken from the catalog itself so they always lead to results:
 * every run of one to three consecutive title words ("smart tv" from "Smart TV Max Z4",
 * "running shoes" from "Trail Running Shoes") and every brand. Counting products per phrase
 * makes the common ones, which are the product types, rank above one-model wordings.
 * Built once per catalog; nothing here is hard-coded per product type.
 */
export function buildSuggestionEntries(products: readonly Product[]): SuggestionEntry[] {
  const phrases = new Map<string, { text: string; count: number; kind: SuggestionEntry['kind'] }>();
  const add = (key: string, text: string, kind: SuggestionEntry['kind']) => {
    if (key === '') return;
    const existing = phrases.get(key);
    if (existing) existing.count += 1;
    else phrases.set(key, { text, count: 1, kind });
  };

  // Titles reuse a small vocabulary, so each distinct raw word (and brand) is normalised once
  // and phrases are joined from normalised words. Normalising every phrase instead made this
  // build ~5x slower, and it runs when someone starts typing.
  const normalized = new Map<string, string>();
  const normalizeOnce = (text: string) => {
    let value = normalized.get(text);
    if (value === undefined) {
      value = normalize(text);
      normalized.set(text, value);
    }
    return value;
  };

  for (const product of products) {
    const words: string[] = [];
    for (const raw of product.title.split(/\s+/)) {
      const word = normalizeOnce(raw.replace(TRAILING_PUNCTUATION, ''));
      if (word !== '') words.push(word);
    }
    // A set, so a phrase repeated inside one title still counts that product once.
    const inTitle = new Set<string>();
    for (let start = 0; start < words.length; start++) {
      let phrase = '';
      for (let size = 1; size <= MAX_PHRASE_WORDS && start + size <= words.length; size++) {
        phrase = size === 1 ? (words[start] ?? '') : `${phrase} ${words[start + size - 1] ?? ''}`;
        inTitle.add(phrase);
      }
    }
    for (const phrase of inTitle) add(phrase, phrase, 'product');
    add(normalizeOnce(product.brand), product.brand, 'brand');
  }

  // A shorter phrase that only ever appears inside one longer phrase adds nothing: "yoga"
  // occurs in exactly the products that "yoga mat" does, so offer the full phrase only.
  const fragments = new Set<string>();
  for (const [key, { count, kind }] of phrases) {
    // Below the minimum, any fragment with the same count is dropped by that rule anyway.
    if (kind !== 'product' || count < MIN_PHRASE_PRODUCTS) continue;
    const words = key.split(' ');
    for (let size = 1; size < words.length; size++) {
      for (let start = 0; start + size <= words.length; start++) {
        const part = words.slice(start, start + size).join(' ');
        if (phrases.get(part)?.count === count) fragments.add(part);
      }
    }
  }

  const entries: SuggestionEntry[] = [];
  for (const [key, { text, count, kind }] of phrases) {
    const words = key.split(' ');
    if (kind === 'product') {
      if (count < MIN_PHRASE_PRODUCTS || fragments.has(key)) continue;
      if (words.length === 1 && key.length < MIN_SINGLE_WORD_LENGTH) continue;
    }
    entries.push({ text, key, words, count, kind });
  }
  return entries;
}

/**
 * Completions for what has been typed so far. Every typed word must be the start of a word
 * in the phrase, so "run sh" finds "running shoes" and "sho" finds "running shoes" too.
 * Order: phrases that begin with the typed text, then by how many products they cover, then
 * shorter, then alphabetical. A phrase identical to the query is left out (nothing to complete),
 * and suggestions start from the first typed letter.
 */
export function suggest(query: string, entries: readonly SuggestionEntry[], limit = 6): SuggestionEntry[] {
  const tokens = tokenize(query);
  const typed = tokens.join(' ');
  // From the first letter: the most common phrases starting with it come first.
  if (typed.length < MIN_QUERY_LENGTH) return [];

  const matches: { entry: SuggestionEntry; leading: boolean }[] = [];
  for (const entry of entries) {
    if (entry.key === typed) continue;
    if (!tokens.every((token) => entry.words.some((word) => word.startsWith(token)))) continue;
    matches.push({ entry, leading: entry.key.startsWith(typed) });
  }

  matches.sort(
    (a, b) =>
      Number(b.leading) - Number(a.leading) ||
      b.entry.count - a.entry.count ||
      a.entry.key.length - b.entry.key.length ||
      (a.entry.key < b.entry.key ? -1 : 1),
  );
  return matches.slice(0, limit).map((match) => match.entry);
}
