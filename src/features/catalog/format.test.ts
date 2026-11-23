import { describe, expect, it } from 'vitest';
import { formatCount, formatPrice, pluralizeProducts, pluralizeResults, priceParts } from './format';

describe('price formatting', () => {
  it.each<[number, string, string]>([
    [99, '₹99', '99'],
    [1249, '₹1,249', '1,249'],
    [124999, '₹1,24,999', '1,24,999'], // Indian lakh grouping
    [89999, '₹89,999', '89,999'],
    [1299.6, '₹1,300', '1,300'], // no paise
    [0, '₹0', '0'],
  ])('%d formats as %s', (value, full, amount) => {
    expect(formatPrice(value)).toBe(full);
    expect(priceParts(value)).toEqual({ symbol: '₹', amount });
  });

  it('splits into parts that recombine to the full format', () => {
    for (const value of [149, 7999, 24999, 100000]) {
      const { symbol, amount } = priceParts(value);
      expect(`${symbol}${amount}`).toBe(formatPrice(value));
    }
  });
});

describe('counts', () => {
  it('groups digits and pluralises', () => {
    expect(formatCount(5000)).toBe('5,000');
    expect(pluralizeProducts(1)).toBe('1 product');
    expect(pluralizeProducts(5000)).toBe('5,000 products');
    expect(pluralizeResults(1)).toBe('1 result');
    expect(pluralizeResults(0)).toBe('0 results');
  });
});
