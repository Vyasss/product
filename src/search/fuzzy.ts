/**
 * Small, dependency-free typo tolerance over the catalog vocabulary (a few hundred words).
 * Only used when the strict search returns nothing.
 */

/** Optimal-string-alignment Damerau-Levenshtein distance, stopping early above `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i < rows; i++) {
    let rowMin = Infinity;
    const row = d[i] as number[];
    const prev = d[i - 1] as number[];
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min((prev[j] ?? 0) + 1, (row[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (d[i - 2]?.[j - 2] ?? 0) + 1);
      }
      row[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length]?.[b.length] ?? max + 1;
}

/**
 * Allowed edits by token length: none under 4 characters, 1 for 4, 2 for 5 to 8, 3 for 9 or
 * more. Generous on purpose ("shooz" is two edits from "shoes"): correction only runs when the
 * strict search found nothing, and the UI always says what was corrected.
 */
export function maxEditsFor(token: string): number {
  const length = [...token].length;
  if (length < 4) return 0;
  if (length === 4) return 1;
  return length >= 9 ? 3 : 2;
}

export interface VocabularyWord {
  word: string;
  /** Number of products whose title or brand contains the word. */
  frequency: number;
}

/**
 * Closest vocabulary word within the allowed distance. Ties: smaller distance, then more
 * products, then alphabetical, so the answer is deterministic. Null when nothing is close.
 */
export function closestWord(token: string, vocabulary: readonly VocabularyWord[]): string | null {
  const max = maxEditsFor(token);
  if (max === 0) return null;
  let best: { word: string; distance: number; frequency: number } | null = null;
  for (const { word, frequency } of vocabulary) {
    if (word === token) continue;
    const distance = editDistance(token, word, max);
    if (distance > max) continue;
    if (
      best === null ||
      distance < best.distance ||
      (distance === best.distance && (frequency > best.frequency || (frequency === best.frequency && word < best.word)))
    ) {
      best = { word, distance, frequency };
    }
  }
  return best?.word ?? null;
}

/**
 * Split a run-together token into two catalog words ("smarttv" -> ["smart", "tv"]). Both
 * parts must be vocabulary words of at least two characters. When several splits work, the
 * one whose rarer part is most common wins, then the earliest split, so it is deterministic.
 * Null when no split works.
 */
export function splitCompound(
  token: string,
  frequencyOf: ReadonlyMap<string, number>,
): [string, string] | null {
  const chars = [...token];
  let best: { parts: [string, string]; score: number } | null = null;
  for (let i = 2; i <= chars.length - 2; i++) {
    const left = chars.slice(0, i).join('');
    const right = chars.slice(i).join('');
    const leftFrequency = frequencyOf.get(left);
    const rightFrequency = frequencyOf.get(right);
    if (leftFrequency === undefined || rightFrequency === undefined) continue;
    const score = Math.min(leftFrequency, rightFrequency);
    if (best === null || score > best.score) best = { parts: [left, right], score };
  }
  return best?.parts ?? null;
}

/**
 * Rough "sounds like" key for Latin-script words: common spelling variants are unified
 * (ph -> f, ck/q -> k, soft c -> s, z -> s, x -> ks), vowels after the first letter are
 * dropped and repeated letters collapsed. "hedfones" and "headphones" both give "hdfns".
 * Null for words with other scripts or digits, where this makes no sense.
 */
export function soundKey(word: string): string | null {
  if (!/^[a-z-]+$/.test(word)) return null;
  const unified = word
    .replace(/-/g, '')
    .replace(/ph/g, 'f')
    .replace(/ck/g, 'k')
    .replace(/q/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/x/g, 'ks');
  const first = unified.charAt(0);
  const rest = unified.slice(1).replace(/[aeiouy]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

/**
 * Vocabulary word that sounds like the token, for misspellings too far for edit distance
 * ("hedfones"). Keys shorter than three letters are too vague and never match. Ties: more
 * products, then alphabetical. Null when nothing sounds alike.
 */
export function closestBySound(token: string, vocabulary: readonly VocabularyWord[]): string | null {
  const key = soundKey(token);
  if (key === null || key.length < 3) return null;
  let best: VocabularyWord | null = null;
  for (const entry of vocabulary) {
    if (entry.word === token || soundKey(entry.word) !== key) continue;
    if (
      best === null ||
      entry.frequency > best.frequency ||
      (entry.frequency === best.frequency && entry.word < best.word)
    ) {
      best = entry;
    }
  }
  return best?.word ?? null;
}
