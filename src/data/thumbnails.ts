import ball from '../assets/thumbnails/ball.svg';
import bookStack from '../assets/thumbnails/book-stack.svg';
import clock from '../assets/thumbnails/clock.svg';
import cookware from '../assets/thumbnails/cookware.svg';
import cricketBat from '../assets/thumbnails/cricket-bat.svg';
import cushion from '../assets/thumbnails/cushion.svg';
import dress from '../assets/thumbnails/dress.svg';
import dumbbell from '../assets/thumbnails/dumbbell.svg';
import earbuds from '../assets/thumbnails/earbuds.svg';
import headphones from '../assets/thumbnails/headphones.svg';
import helmet from '../assets/thumbnails/helmet.svg';
import hoodie from '../assets/thumbnails/hoodie.svg';
import jacket from '../assets/thumbnails/jacket.svg';
import kurta from '../assets/thumbnails/kurta.svg';
import lamp from '../assets/thumbnails/lamp.svg';
import laptop from '../assets/thumbnails/laptop.svg';
import mug from '../assets/thumbnails/mug.svg';
import openBook from '../assets/thumbnails/open-book.svg';
import phone from '../assets/thumbnails/phone.svg';
import plates from '../assets/thumbnails/plates.svg';
import racket from '../assets/thumbnails/racket.svg';
import rug from '../assets/thumbnails/rug.svg';
import screen from '../assets/thumbnails/screen.svg';
import sneaker from '../assets/thumbnails/sneaker.svg';
import speaker from '../assets/thumbnails/speaker.svg';
import trousers from '../assets/thumbnails/trousers.svg';
import tshirt from '../assets/thumbnails/tshirt.svg';
import watch from '../assets/thumbnails/watch.svg';
import yogaMat from '../assets/thumbnails/yoga-mat.svg';
import type { ItemType } from './itemTypes';

/**
 * Bundled illustrations (under 1 kB each), hashed by Vite so they can be cached immutably.
 * A real catalog would use per-product image URLs from a CDN.
 */
export const ILLUSTRATIONS = {
  ball,
  'book-stack': bookStack,
  clock,
  cookware,
  'cricket-bat': cricketBat,
  cushion,
  dress,
  dumbbell,
  earbuds,
  headphones,
  helmet,
  hoodie,
  jacket,
  kurta,
  lamp,
  laptop,
  mug,
  'open-book': openBook,
  phone,
  plates,
  racket,
  rug,
  screen,
  sneaker,
  speaker,
  trousers,
  tshirt,
  watch,
  'yoga-mat': yogaMat,
} as const satisfies Readonly<Record<string, string>>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

/**
 * Which illustration depicts each item type. Typed as a total record over `ItemType`, so adding
 * an item type without an illustration fails to compile.
 */
export const ILLUSTRATION_FOR_ITEM: Readonly<Record<ItemType, IllustrationName>> = {
  // Electronics
  Laptop: 'laptop',
  Smartphone: 'phone',
  'Wireless Earbuds': 'earbuds',
  'Noise-Cancelling Headphones': 'headphones',
  'Smart Watch': 'watch',
  'Bluetooth Speaker': 'speaker',
  'Smart TV': 'screen',
  'LED Monitor': 'screen',
  // Apparel
  'Cotton T-Shirt': 'tshirt',
  'Polo T-Shirt': 'tshirt',
  'Slim Fit Jeans': 'trousers',
  Chinos: 'trousers',
  'Track Pants': 'trousers',
  Hoodie: 'hoodie',
  'Denim Jacket': 'jacket',
  'Summer Dress': 'dress',
  Kurta: 'kurta',
  'Running Shoes': 'sneaker',
  Sneakers: 'sneaker',
  // Home
  'Jute Rug': 'rug',
  'Pressure Cooker': 'cookware',
  'Ceramic Dinner Set': 'plates',
  'Table Lamp': 'lamp',
  'Cushion Covers': 'cushion',
  'Wall Clock': 'clock',
  'Coffee Mug Set': 'mug',
  // Books
  Novel: 'open-book',
  'Story Book': 'open-book',
  Biography: 'open-book',
  'Poetry Collection': 'open-book',
  'Comic Book': 'open-book',
  Cookbook: 'book-stack',
  Workbook: 'book-stack',
  Textbook: 'book-stack',
  'Travel Guide': 'book-stack',
  'Self-Help Book': 'book-stack',
  // Sports
  'Training Shoes': 'sneaker',
  'Yoga Mat': 'yoga-mat',
  'Cricket Bat': 'cricket-bat',
  Football: 'ball',
  'Badminton Racket': 'racket',
  'Dumbbell Set': 'dumbbell',
  'Cycling Helmet': 'helmet',
};

export function thumbnailFor(item: ItemType): string {
  return ILLUSTRATIONS[ILLUSTRATION_FOR_ITEM[item]];
}
