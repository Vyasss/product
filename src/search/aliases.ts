import { normalize } from './normalize';

/**
 * Mixed-language (Hinglish, Hindi) shopping terms mapped to words that appear in catalog
 * titles. A query token matches when the token itself or any alias is a substring of the
 * product's haystack, so "jute" still finds jute rugs as well as shoes.
 *
 * Extend by adding entries; keys and values are normalised at load time.
 */
const RAW_ALIASES: Readonly<Record<string, readonly string[]>> = {
  // shoes
  joote: ['shoe', 'sneaker', 'sandal'],
  joota: ['shoe', 'sneaker', 'sandal'],
  jute: ['shoe', 'sneaker', 'sandal'],
  'जूते': ['shoe', 'sneaker', 'sandal'],
  'जूता': ['shoe', 'sneaker', 'sandal'],
  // everyday short forms
  tv: ['television'],
  television: ['tv'],
  earphones: ['earbuds', 'headphones'],
  headset: ['headphones'],
  tshirt: ['t-shirt'],
  tee: ['t-shirt'],
  pants: ['jeans', 'chinos', 'pants'],
  trousers: ['jeans', 'chinos', 'pants'],
  // books
  kitab: ['book', 'novel', 'guide', 'biography'],
  kitaab: ['book', 'novel', 'guide', 'biography'],
  'किताब': ['book', 'novel', 'guide', 'biography'],
  'पुस्तक': ['book', 'novel', 'guide', 'biography'],
  // clothes
  kapde: ['shirt', 'jeans', 'kurta', 'dress', 'jacket', 'hoodie', 'chinos', 'saree', 'pants'],
  kapda: ['shirt', 'jeans', 'kurta', 'dress', 'jacket', 'hoodie', 'chinos', 'saree', 'pants'],
  'कपड़े': ['shirt', 'jeans', 'kurta', 'dress', 'jacket', 'hoodie', 'chinos', 'saree', 'pants'],
  // watches
  ghadi: ['watch', 'clock'],
  'घड़ी': ['watch', 'clock'],
  // phones
  mobile: ['smartphone', 'phone'],
  'फ़ोन': ['smartphone', 'phone'],
  'फोन': ['smartphone', 'phone'],
  // kitchen
  bartan: ['kadai', 'cooker', 'dinner set', 'mug', 'bottle'],
  'बर्तन': ['kadai', 'cooker', 'dinner set', 'mug', 'bottle'],
  // bedding
  chadar: ['bedsheet'],
  'चादर': ['bedsheet'],
};

const ALIASES: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(RAW_ALIASES).map(([term, targets]) => [normalize(term), targets.map(normalize)]),
);

/** Alias keys, part of the vocabulary used for typo correction. */
export const ALIAS_TERMS: readonly string[] = [...ALIASES.keys()];

/** The token followed by its aliases, all normalised. */
export function expandToken(token: string): readonly string[] {
  const aliases = ALIASES.get(token);
  return aliases ? [token, ...aliases] : [token];
}
