import type { Category, Product } from '../domain/product';
import { ITEM_TYPES, type ItemType } from './itemTypes';
import { mulberry32, pick, type Random } from './prng';
import { ILLUSTRATION_FOR_ITEM, type IllustrationName } from './thumbnails';

/**
 * Generated display content layered on top of the eight-field `Product`.
 * Descriptions, highlights and review counts are MOCK content derived deterministically from
 * the product (its id seeds a private PRNG, separate from the dataset's stream, so the dataset
 * and its checksum are unaffected). A real API would return these fields from its own data,
 * and a different `ProductContentProvider` would pass them through.
 */
export interface ProductContent {
  /** One or two sentences. */
  description: string;
  /** Three or four short bullet points. */
  highlights: readonly string[];
  /** 0 or more; mock data. */
  reviewCount: number;
}

export interface ProductContentProvider {
  contentFor: (product: Product) => ProductContent;
}

interface KindText {
  /** What the thing is, in a sentence: "laptop", "pair of running shoes". */
  noun: string;
  purposes: readonly string[];
  qualities: readonly string[];
  highlights: readonly string[];
}

type Kind = IllustrationName | `any-${Category}`;

const TEXT: Readonly<Record<Kind, KindText>> = {
  laptop: {
    noun: 'laptop',
    purposes: ['everyday work and study', 'browsing, streaming and video calls'],
    qualities: ['a slim, light body', 'a sharp, bright display', 'a comfortable backlit keyboard', 'all-day battery life'],
    highlights: ['Slim and light to carry', 'Backlit keyboard', 'Fast-charging battery', 'HD webcam for calls', 'USB-C and HDMI ports'],
  },
  phone: {
    noun: 'smartphone',
    purposes: ['staying in touch on the go', 'photos, maps and messaging'],
    qualities: ['a vivid edge-to-edge screen', 'a capable dual camera', 'a battery that lasts the day', 'quick face unlock'],
    highlights: ['Large vivid display', 'Dual rear camera', 'Fast charging', 'Dual SIM support', 'Expandable storage'],
  },
  earbuds: {
    noun: 'pair of wireless earbuds',
    purposes: ['music and calls on the move', 'commutes and workouts'],
    qualities: ['a snug, secure fit in the ear', 'clear call microphones', 'a pocket-sized charging case', 'quick Bluetooth pairing'],
    highlights: ['Pocket charging case', 'Touch controls', 'Sweat resistant', 'Clear call microphones', 'Quick pairing'],
  },
  headphones: {
    noun: 'pair of over-ear headphones',
    purposes: ['long listening sessions', 'focused work and travel'],
    qualities: ['active noise cancellation', 'soft cushioned ear cups', 'rich, balanced sound', 'a fold-flat design'],
    highlights: ['Active noise cancellation', 'Cushioned ear cups', 'Long battery life', 'Fold-flat for travel', 'Built-in microphone'],
  },
  watch: {
    noun: 'smart watch',
    purposes: ['tracking steps, sleep and workouts', 'notifications at a glance'],
    qualities: ['a bright always-on display', 'heart-rate tracking', 'a soft, adjustable strap', 'several days of battery'],
    highlights: ['Heart-rate tracking', 'Sleep insights', 'Call and message alerts', 'Water resistant', 'Interchangeable strap'],
  },
  speaker: {
    noun: 'Bluetooth speaker',
    purposes: ['music at home and outdoors', 'parties, picnics and travel'],
    qualities: ['punchy bass for its size', 'a splash-resistant body', 'hours of playback', 'a built-in carry loop'],
    highlights: ['Room-filling sound', 'Splash resistant', 'Long playback time', 'Built-in microphone', 'Pairs with a second speaker'],
  },
  screen: {
    noun: 'screen',
    purposes: ['films, sport and gaming', 'work, streaming and gaming'],
    qualities: ['crisp, high-resolution picture', 'slim bezels', 'an adjustable stand', 'HDMI and USB connections'],
    highlights: ['High-resolution panel', 'Slim bezels', 'HDMI inputs', 'Low-blue-light mode', 'Wall-mount ready'],
  },
  tshirt: {
    noun: 'T-shirt',
    purposes: ['easy everyday wear', 'layering through the seasons'],
    qualities: ['soft breathable cotton', 'a relaxed regular fit', 'a neat ribbed collar', 'colour that holds wash after wash'],
    highlights: ['Soft breathable cotton', 'Regular fit', 'Machine washable', 'Ribbed collar', 'Pre-shrunk fabric'],
  },
  trousers: {
    noun: 'pair of trousers',
    purposes: ['work days and weekends', 'everyday comfort'],
    qualities: ['a comfortable mid-rise waist', 'durable stretch fabric', 'deep, usable pockets', 'a clean tapered leg'],
    highlights: ['Stretch fabric', 'Mid-rise waist', 'Five pockets', 'Machine washable', 'Tapered leg'],
  },
  hoodie: {
    noun: 'hoodie',
    purposes: ['cool mornings and evenings', 'lounging and travel'],
    qualities: ['a soft brushed fleece lining', 'a roomy drawstring hood', 'a front pouch pocket', 'ribbed cuffs that keep their shape'],
    highlights: ['Brushed fleece lining', 'Drawstring hood', 'Front pouch pocket', 'Ribbed cuffs and hem', 'Machine washable'],
  },
  jacket: {
    noun: 'jacket',
    purposes: ['layering through the year', 'casual days out'],
    qualities: ['sturdy washed denim', 'classic button-front styling', 'two chest pockets', 'a comfortable regular fit'],
    highlights: ['Durable denim', 'Button front', 'Two chest pockets', 'Regular fit', 'Goes with almost anything'],
  },
  dress: {
    noun: 'dress',
    purposes: ['warm days and evenings out', 'summer outings'],
    qualities: ['a light, flowing fabric', 'a flattering defined waist', 'an easy pull-on style', 'a delicate all-over print'],
    highlights: ['Light flowing fabric', 'Defined waist', 'Easy pull-on style', 'Machine washable', 'Midi length'],
  },
  kurta: {
    noun: 'kurta',
    purposes: ['festive occasions and daily wear', 'office days and celebrations'],
    qualities: ['breathable cotton', 'fine detailing at the neckline', 'side slits for easy movement', 'a straight, comfortable cut'],
    highlights: ['Breathable cotton', 'Detailed neckline', 'Side slits', 'Straight cut', 'Pairs with churidar or jeans'],
  },
  sneaker: {
    noun: 'pair of shoes',
    purposes: ['daily runs and long walks', 'all-day wear in the city'],
    qualities: ['a cushioned, responsive sole', 'a breathable mesh upper', 'a grippy rubber outsole', 'a padded heel collar'],
    highlights: ['Cushioned sole', 'Breathable upper', 'Grippy outsole', 'Lightweight build', 'Padded heel collar'],
  },
  rug: {
    noun: 'rug',
    purposes: ['living rooms and bedrooms', 'adding warmth to a room'],
    qualities: ['natural hand-woven jute', 'an earthy, textured look', 'a low pile that is easy to clean', 'a classic woven border'],
    highlights: ['Natural jute fibres', 'Hand-woven', 'Low pile', 'Easy to vacuum', 'Reversible'],
  },
  cookware: {
    noun: 'pressure cooker',
    purposes: ['dal, rice and everyday cooking', 'quick family meals'],
    qualities: ['a sturdy steel body', 'a secure locking lid', 'cool-touch handles', 'even heat on gas and induction'],
    highlights: ['Works on gas and induction', 'Secure locking lid', 'Cool-touch handles', 'Safety valve', 'Easy to clean'],
  },
  plates: {
    noun: 'dinner set',
    purposes: ['family meals and guests', 'everyday dining'],
    qualities: ['glazed ceramic', 'a simple rim pattern', 'plates and bowls that stack neatly', 'a chip-resistant finish'],
    highlights: ['Glazed ceramic', 'Microwave safe', 'Dishwasher safe', 'Stacks neatly', 'Plates and bowls included'],
  },
  lamp: {
    noun: 'table lamp',
    purposes: ['reading corners and bedside tables', 'soft evening light'],
    qualities: ['a warm, glare-free shade', 'a solid weighted base', 'an easy inline switch', 'a timeless shape'],
    highlights: ['Warm diffused light', 'Weighted base', 'Inline switch', 'Fits standard bulbs', 'Fabric shade'],
  },
  cushion: {
    noun: 'set of cushion covers',
    purposes: ['refreshing a sofa or bed', 'adding colour to a room'],
    qualities: ['soft woven cotton', 'a hidden zip closure', 'a subtle geometric pattern', 'colour that stays bright after washing'],
    highlights: ['Soft cotton weave', 'Hidden zip', 'Machine washable', 'Fits standard cushions', 'Set of covers'],
  },
  clock: {
    noun: 'wall clock',
    purposes: ['living rooms, kitchens and offices', 'an easy-to-read time'],
    qualities: ['a clear, high-contrast dial', 'a silent sweep movement', 'a slim frame', 'a single battery that lasts months'],
    highlights: ['Silent movement', 'Easy-to-read dial', 'Slim frame', 'Runs on one AA battery', 'Ready to hang'],
  },
  mug: {
    noun: 'mug set',
    purposes: ['morning chai and coffee', 'sharing a hot drink with family'],
    qualities: ['sturdy glazed stoneware', 'comfortable wide handles', 'a generous capacity', 'cheerful colours'],
    highlights: ['Glazed stoneware', 'Microwave safe', 'Dishwasher safe', 'Comfortable handles', 'Set of mugs'],
  },
  'open-book': {
    noun: 'book',
    purposes: ['quiet evenings and long journeys', 'readers who love a good story'],
    qualities: ['an absorbing, well-paced story', 'memorable characters', 'clear, readable type', 'a sturdy paperback binding'],
    highlights: ['Paperback edition', 'Clear, readable type', 'Great for gifting', 'Fits in a bag', 'Popular with book clubs'],
  },
  'book-stack': {
    noun: 'book',
    purposes: ['learning something new', 'practical everyday use'],
    qualities: ['clear step-by-step chapters', 'helpful examples', 'a handy index', 'a durable binding'],
    highlights: ['Step-by-step chapters', 'Worked examples', 'Handy index', 'Paperback edition', 'Good for beginners'],
  },
  'yoga-mat': {
    noun: 'yoga mat',
    purposes: ['yoga, stretching and floor workouts', 'home workouts'],
    qualities: ['a non-slip textured surface', 'cushioning that is kind to knees', 'a carry strap', 'a lightweight roll-up design'],
    highlights: ['Non-slip surface', 'Cushioned support', 'Carry strap included', 'Lightweight', 'Easy to wipe clean'],
  },
  'cricket-bat': {
    noun: 'cricket bat',
    purposes: ['nets practice and weekend matches', 'club and school cricket'],
    qualities: ['a well-balanced willow blade', 'a cushioned grip', 'a generous sweet spot', 'a protective edge finish'],
    highlights: ['Willow blade', 'Cushioned grip', 'Balanced pick-up', 'Large sweet spot', 'Ready to play'],
  },
  ball: {
    noun: 'football',
    purposes: ['matches, training and kickabouts', 'parks and school grounds'],
    qualities: ['a durable stitched cover', 'a true, consistent flight', 'good grip in all weather', 'a butyl bladder that holds air'],
    highlights: ['Stitched panels', 'Holds air well', 'All-weather grip', 'Size 5', 'Training and match use'],
  },
  racket: {
    noun: 'badminton racket',
    purposes: ['evening games and club play', 'fast, accurate shots'],
    qualities: ['a light, stiff frame', 'a comfortable cushioned grip', 'factory-strung tension', 'a protective cover'],
    highlights: ['Lightweight frame', 'Cushioned grip', 'Pre-strung', 'Cover included', 'Good for beginners and club players'],
  },
  dumbbell: {
    noun: 'dumbbell set',
    purposes: ['strength training at home', 'toning and conditioning'],
    qualities: ['secure screw-lock collars', 'knurled steel handles', 'adjustable weight plates', 'a compact storage case'],
    highlights: ['Adjustable plates', 'Screw-lock collars', 'Knurled grip', 'Storage case', 'Suits beginners and regulars'],
  },
  helmet: {
    noun: 'cycling helmet',
    purposes: ['daily commutes and weekend rides', 'safer rides in the city'],
    qualities: ['a light, impact-absorbing shell', 'plenty of air vents', 'an adjustable dial fit', 'a detachable visor'],
    highlights: ['Impact-absorbing shell', 'Ventilated design', 'Adjustable dial fit', 'Detachable visor', 'Reflective details'],
  },
  'any-Electronics': {
    noun: 'gadget',
    purposes: ['everyday convenience', 'work and entertainment'],
    qualities: ['dependable build quality', 'simple setup', 'useful everyday features', 'a clean, modern design'],
    highlights: ['Simple setup', 'Modern design', 'Dependable build', 'Easy to use'],
  },
  'any-Apparel': {
    noun: 'wardrobe piece',
    purposes: ['everyday wear', 'casual outings'],
    qualities: ['comfortable materials', 'a versatile look', 'neat finishing', 'easy care'],
    highlights: ['Comfortable materials', 'Versatile style', 'Neat finishing', 'Easy care'],
  },
  'any-Home': {
    noun: 'piece for the home',
    purposes: ['everyday living', 'making a home feel finished'],
    qualities: ['practical design', 'durable materials', 'a look that suits most rooms', 'easy care'],
    highlights: ['Practical design', 'Durable materials', 'Suits most rooms', 'Easy care'],
  },
  'any-Books': {
    noun: 'book',
    purposes: ['curious readers', 'reading at home or on the go'],
    qualities: ['clear, readable type', 'a well-organised layout', 'a durable binding', 'engaging writing'],
    highlights: ['Paperback edition', 'Readable type', 'Durable binding', 'Great for gifting'],
  },
  'any-Sports': {
    noun: 'piece of sports gear',
    purposes: ['training and play', 'staying active'],
    qualities: ['durable materials', 'a comfortable grip', 'a light build', 'easy care'],
    highlights: ['Durable materials', 'Comfortable to use', 'Lightweight', 'Training and play'],
  },
};

/** Item types named in the plural ("running shoes are ..."), so the templates agree in number. */
export const PLURAL_ITEM_TYPES: ReadonlySet<ItemType> = new Set<ItemType>([
  'Wireless Earbuds',
  'Noise-Cancelling Headphones',
  'Slim Fit Jeans',
  'Chinos',
  'Track Pants',
  'Running Shoes',
  'Sneakers',
  'Training Shoes',
  'Cushion Covers',
]);

interface Lead {
  text: (brand: string, item: string, noun: string, purpose: string, plural: boolean) => string;
  /** Whether the sentence's subject is the item (plural-capable) rather than the singular noun. */
  subjectIsItem: boolean;
}

const LEADS: readonly Lead[] = [
  {
    text: (brand, item, _noun, purpose, plural) => `The ${brand} ${item} ${plural ? 'are' : 'is'} made for ${purpose}.`,
    subjectIsItem: true,
  },
  { text: (brand, _item, noun, purpose) => `A ${noun} from ${brand}, designed for ${purpose}.`, subjectIsItem: false },
  {
    text: (brand, item, _noun, purpose, plural) =>
      `${brand}'s ${item} ${plural ? 'are an easy choice' : 'is an easy choice'} for ${purpose}.`,
    subjectIsItem: true,
  },
];

const DETAILS: readonly ((a: string, b: string, plural: boolean) => string)[] = [
  (a, b, plural) => `${plural ? 'They bring' : 'It brings'} together ${a} and ${b}.`,
  (a, b) => `Expect ${a}, plus ${b}.`,
  (a, b, plural) => `${plural ? 'They offer' : 'It offers'} ${a} and ${b}.`,
];

/** FNV-1a, so a product id becomes a stable 32-bit seed. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The item type named in the title (longest match in the product's category), if any. */
export function itemTypeOf(product: Pick<Product, 'title' | 'category'>): ItemType | null {
  const title = product.title.toLowerCase();
  let best: ItemType | null = null;
  for (const item of ITEM_TYPES[product.category]) {
    if (title.includes(item.toLowerCase()) && (best === null || item.length > best.length)) best = item;
  }
  return best;
}

export function kindOf(product: Pick<Product, 'title' | 'category'>): Kind {
  const item = itemTypeOf(product);
  return item ? ILLUSTRATION_FOR_ITEM[item] : `any-${product.category}`;
}

/** Deterministic selection of `count` distinct entries. */
function sample<T>(random: Random, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const [item] = pool.splice(Math.floor(random() * pool.length), 1);
    if (item !== undefined) chosen.push(item);
  }
  return chosen;
}

function reviewCountFor(product: Product, random: Random): number {
  if (random() < 0.04) return 0; // a few products have no reviews yet
  // Log-uniform between 3 and 2,500, boosted for mid-priced items (where most buyers are).
  const base = Math.exp(Math.log(3) + random() * (Math.log(2500) - Math.log(3)));
  const midPriced = product.price >= 500 && product.price <= 5000 ? 1.6 : 1;
  return Math.round(base * midPriced);
}

export const templateProductContent: ProductContentProvider = {
  contentFor(product) {
    const random = mulberry32(hash(`content:${product.id}`));
    const kind = kindOf(product);
    const text = TEXT[kind];
    const itemType = itemTypeOf(product);
    const item = (itemType ?? text.noun).toLowerCase();
    const [first, second] = sample(random, text.qualities, 2);
    const lead = pick(random, LEADS);
    // Plural only when the sentence is about the item itself ("the running shoes are"), not
    // about a singular noun phrase ("a pair of shoes ... It offers").
    const plural = lead.subjectIsItem && itemType !== null && PLURAL_ITEM_TYPES.has(itemType);
    const description = `${lead.text(product.brand, item, text.noun, pick(random, text.purposes), plural)} ${pick(
      random,
      DETAILS,
    )(first ?? '', second ?? '', plural)}`;
    const highlights = sample(random, text.highlights, 3 + Math.floor(random() * 2));
    return { description, highlights, reviewCount: reviewCountFor(product, random) };
  },
};
