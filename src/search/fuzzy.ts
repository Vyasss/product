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

/** Allowed edits by token length: none under 4 characters, 1 for 4 to 7, 2 for 8 or more. */
export function maxEditsFor(token: string): number {
  const length = [...token].length;
  if (length < 4) return 0;
  return length >= 8 ? 2 : 1;
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
