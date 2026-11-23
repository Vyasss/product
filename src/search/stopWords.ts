import { normalize } from './normalize';

/**
 * Conversational filler in English and Hindi-English (Latin and Devanagari, with common
 * spellings), dropped from search queries so "ek smart tv chahie" searches for "smart tv".
 * Shared by the core engine and the smart-search interpreter. Values are normalised at load.
 */
const RAW_STOP_WORDS = [
  // English
  'a', 'an', 'the', 'i', 'me', 'my', 'want', 'need', 'show', 'find', 'get', 'please', 'for', 'of',
  'some', 'any', 'and', 'with', 'is', 'are', 'to',
  // Hindi-English (Latin)
  'ek', 'mujhe', 'mujhko', 'chahiye', 'chahie', 'chaiye', 'chahiey', 'chahiye', 'dikhao', 'dikha', 'do',
  'dedo', 'de', 'wala', 'wale', 'wali', 'koi', 'kuch', 'ka', 'ki', 'ke', 'hai', 'hain', 'lena', 'kharidna',
  // Hindi (Devanagari)
  'एक', 'मुझे', 'मुझको', 'चाहिए', 'चाहिये', 'दिखाओ', 'दिखा', 'कोई', 'कुछ', 'का', 'की', 'के', 'है', 'हैं', 'लेना', 'वाला', 'वाले', 'वाली',
];

export const STOP_WORDS: ReadonlySet<string> = new Set(RAW_STOP_WORDS.map(normalize));

export function isStopWord(token: string): boolean {
  return STOP_WORDS.has(normalize(token));
}

/**
 * Removes stop words from normalised tokens. A query made only of stop words is kept as is,
 * so "the" searches for "the" instead of silently matching every product.
 */
export function withoutStopWords(tokens: readonly string[]): string[] {
  const content = tokens.filter((token) => !STOP_WORDS.has(token));
  return content.length > 0 ? content : [...tokens];
}
