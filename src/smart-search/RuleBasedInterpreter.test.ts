import { describe, expect, it } from 'vitest';
import type { FilterPatch } from '../domain/filters';
import { RuleBasedInterpreter } from './RuleBasedInterpreter';

const interpreter = new RuleBasedInterpreter();

describe('RuleBasedInterpreter', () => {
  it.each<[string, FilterPatch]>([
    ['running shoes under 5000 in stock', { q: 'running shoes', maxPrice: 5000, inStock: true }],
    ['shoes below 5k', { q: 'shoes', maxPrice: 5000 }],
    ['earbuds under ₹2,500', { q: 'earbuds', maxPrice: 2500 }],
    ['lamp upto rs 1.5k', { q: 'lamp', maxPrice: 1500 }],
    ['joote 5000 se kam', { q: 'joote', maxPrice: 5000 }],
    ['kurta 2000 ke andar', { q: 'kurta', maxPrice: 2000 }],
    ['headphones above 2000', { q: 'headphones', minPrice: 2000 }],
    ['laptop 50000 se zyada', { q: 'laptop', minPrice: 50000 }],
    ['between 1000 and 3000 sports', { q: '', minPrice: 1000, maxPrice: 3000, categories: ['Sports'] }],
    ['between 3000 and 1000', { q: '', minPrice: 1000, maxPrice: 3000 }],
    ['from 1,500 to 2,500 watch', { q: 'watch', minPrice: 1500, maxPrice: 2500 }],
    ['cushion covers 500 se kam', { q: 'cushion covers', maxPrice: 500 }],
    ['cheapest yoga mat', { q: 'yoga mat', sort: 'price_asc' }],
    ['sabse sasta kapde', { q: '', sort: 'price_asc', categories: ['Apparel'] }],
    ['most expensive smart tv', { q: 'smart tv', sort: 'price_desc' }],
    ['top rated electronics available', { q: '', sort: 'rating_desc', categories: ['Electronics'], inStock: true }],
    ['किताब under ₹500', { q: '', maxPrice: 500, categories: ['Books'] }],
    ['show me sports shoes under 3000', { q: 'shoes', maxPrice: 3000, categories: ['Sports'] }],
    ['khel ka saman in-stock', { q: 'saman', categories: ['Sports'], inStock: true }],
    ['Books AND Home', { q: '', categories: ['Home', 'Books'] }],
  ])('interprets %j', (input, expected) => {
    expect(interpreter.interpret(input)).toEqual(expected);
  });

  it.each(['running shoes', '', '   ', 'iphone 15', 'Élan kurta'])(
    'returns null when nothing structured is found: %j',
    (input) => {
      expect(interpreter.interpret(input)).toBeNull();
    },
  );
});
