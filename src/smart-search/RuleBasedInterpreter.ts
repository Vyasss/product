import { MAX_QUERY_LENGTH, type FilterPatch, type SortKey } from '../domain/filters';
import { CATEGORIES, type Category } from '../domain/product';
import { isStopWord } from '../search/stopWords';
import type { QueryInterpreter } from './QueryInterpreter';

/**
 * Lowercase and collapse whitespace. Deliberately simpler than search's `normalize`:
 * phrases are matched on the raw words and nothing here may strip Devanagari marks.
 */
function prepare(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

// An amount such as "5000", "5,000", "₹5000", "rs 5000", "5k", "1.5k", "5000 rupees".
// Word boundaries keep "rs" inside words such as "covers" from being read as a currency.
const AMOUNT = String.raw`(?:₹\s*|\b(?:rs\.?|inr)\s*)?(\d[\d,]*(?:\.\d+)?)(?:\s*(k)\b)?(?:\s*(?:rs|rupees|rupaye|inr)\b)?`;

function toAmount(digits: string | undefined, thousands: string | undefined): number | null {
  if (digits === undefined) return null;
  const value = Number(digits.replace(/,/g, '')) * (thousands ? 1000 : 1);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

const BETWEEN = [
  new RegExp(String.raw`\b(?:between|from)\s+${AMOUNT}\s+(?:and|to|-)\s+${AMOUNT}`),
  new RegExp(String.raw`${AMOUNT}\s+se\s+${AMOUNT}\s+(?:tak|ke beech|ke bich)`),
];
const AT_MOST = [
  new RegExp(String.raw`\b(?:under|below|less than|upto|up to|within|max|maximum|not more than|cheaper than)\s+${AMOUNT}`),
  new RegExp(String.raw`${AMOUNT}\s+(?:se kam|se neeche|se niche|ke andar|ke neeche|ke niche|tak|or less|and below)\b`),
];
const AT_LEAST = [
  new RegExp(String.raw`\b(?:above|over|more than|at least|min|minimum|starting at|starting from)\s+${AMOUNT}`),
  new RegExp(String.raw`${AMOUNT}\s+(?:se zyada|se jyada|se upar|se oopar|or more|and above|plus)\b`),
];

const IN_STOCK = /\b(?:in[ -]stock|available|stock (?:mein|me|main))\b/;

const SORT_PHRASES: readonly (readonly [RegExp, SortKey])[] = [
  [/\b(?:cheapest|lowest price|low to high|sabse sasta|sabse saste|sasta|saste|sasti)\b/, 'price_asc'],
  [/\b(?:most expensive|costliest|high to low|sabse mehenga|mehenga|mehnga|mehngi)\b/, 'price_desc'],
  [/\b(?:top rated|top-rated|best rated|highest rated|best)\b/, 'rating_desc'],
];

// Category words, including Hinglish and Hindi. Matched per whitespace token.
const CATEGORY_WORDS: Readonly<Record<Category, readonly string[]>> = {
  Electronics: ['electronics', 'electronic', 'gadget', 'gadgets'],
  Apparel: ['apparel', 'clothing', 'clothes', 'kapde', 'kapda', 'कपड़े'],
  Home: ['home', 'kitchen', 'decor', 'ghar', 'घर'],
  Books: ['books', 'book', 'kitab', 'kitaab', 'किताब', 'किताबें', 'पुस्तक'],
  Sports: ['sports', 'sport', 'fitness', 'khel', 'खेल'],
};
const CATEGORY_BY_WORD: ReadonlyMap<string, Category> = new Map(
  CATEGORIES.flatMap((category) => CATEGORY_WORDS[category].map((word) => [word, category] as const)),
);

// Removed from the leftover text only when a structured filter was found: the core search's
// shared stop words, plus two words that only make sense in a request.
const REQUEST_WORDS = new Set(['items', 'products']);
const isFiller = (token: string) => isStopWord(token) || REQUEST_WORDS.has(token);

interface Extraction {
  text: string;
  minPrice?: number;
  maxPrice?: number;
}

function extractPrice(text: string): Extraction {
  for (const pattern of BETWEEN) {
    const match = pattern.exec(text);
    if (match) {
      const a = toAmount(match[1], match[2]);
      const b = toAmount(match[3], match[4]);
      if (a !== null && b !== null) {
        return { text: text.replace(match[0], ' '), minPrice: Math.min(a, b), maxPrice: Math.max(a, b) };
      }
    }
  }

  const result: Extraction = { text };
  for (const pattern of AT_MOST) {
    const match = pattern.exec(result.text);
    const amount = match ? toAmount(match[1], match[2]) : null;
    if (match && amount !== null) {
      result.maxPrice = amount;
      result.text = result.text.replace(match[0], ' ');
      break;
    }
  }
  for (const pattern of AT_LEAST) {
    const match = pattern.exec(result.text);
    const amount = match ? toAmount(match[1], match[2]) : null;
    if (match && amount !== null) {
      result.minPrice = amount;
      result.text = result.text.replace(match[0], ' ');
      break;
    }
  }
  return result;
}

/**
 * Deterministic phrase rules for price, stock, category and sort, in English and Hinglish.
 * Whatever is left over becomes the text query. No network calls.
 */
export class RuleBasedInterpreter implements QueryInterpreter {
  interpret(input: string): FilterPatch | null {
    const price = extractPrice(prepare(input));
    let text = price.text;
    const patch: FilterPatch = {};

    if (price.minPrice !== undefined) patch.minPrice = price.minPrice;
    if (price.maxPrice !== undefined) patch.maxPrice = price.maxPrice;

    if (IN_STOCK.test(text)) {
      patch.inStock = true;
      text = text.replace(IN_STOCK, ' ');
    }

    for (const [pattern, sort] of SORT_PHRASES) {
      if (pattern.test(text)) {
        patch.sort = sort;
        text = text.replace(pattern, ' ');
        break;
      }
    }

    const categories = new Set<Category>();
    const remaining: string[] = [];
    for (const token of text.split(' ')) {
      if (token === '') continue;
      const category = CATEGORY_BY_WORD.get(token);
      if (category) categories.add(category);
      else remaining.push(token);
    }
    if (categories.size > 0) {
      patch.categories = CATEGORIES.filter((category) => categories.has(category));
    }

    if (Object.keys(patch).length === 0) return null;

    patch.q = remaining
      .filter((token) => !isFiller(token))
      .join(' ')
      .slice(0, MAX_QUERY_LENGTH)
      .trim();
    return patch;
  }
}
