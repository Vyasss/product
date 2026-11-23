/**
 * Latin combining diacritics only (U+0300 to U+036F). Stripping every `\p{M}` would also
 * remove Devanagari vowel signs and viramas, turning "किताब" into nonsense.
 */
const LATIN_COMBINING_MARKS = /[̀-ͯ]/g;
const WHITESPACE = /\s+/g;

/** Case-, accent- and whitespace-insensitive form used for both haystacks and queries. */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(LATIN_COMBINING_MARKS, '')
    .toLowerCase()
    .replace(WHITESPACE, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  return normalized === '' ? [] : normalized.split(' ');
}
