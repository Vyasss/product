import { describe, expect, it } from 'vitest';
import { normalizePhone, orderReference, validateDelivery, validateField } from './checkoutForm';

describe('delivery form validation', () => {
  it('accepts a complete, valid set of details', () => {
    expect(
      validateDelivery({
        name: 'Asha Rao',
        address: '12 Lake View Road, Koramangala, Bengaluru',
        pin: '560034',
        phone: '+91 98450 12345',
      }),
    ).toEqual({});
  });

  it('reports every missing field', () => {
    expect(Object.keys(validateDelivery({ name: '', address: '', pin: '', phone: '' }))).toEqual([
      'name',
      'address',
      'pin',
      'phone',
    ]);
  });

  it.each([
    ['name', 'A', false],
    ['name', "D'Souza-Pinto Jr.", true],
    ['name', 'अनन्या शर्मा', true],
    ['name', '1234', false],
    ['address', 'short', false],
    ['address', 'Flat 3, MG Road, Pune', true],
    ['pin', '560034', true],
    ['pin', '056003', false],
    ['pin', '56003', false],
    ['pin', '560 034', true],
    ['phone', '9845012345', true],
    ['phone', '09845012345', true],
    ['phone', '+91-98450-12345', true],
    ['phone', '5845012345', false],
    ['phone', '98450', false],
  ] as const)('%s %j valid: %s', (field, value, valid) => {
    expect(validateField(field, value) === undefined).toBe(valid);
  });

  it('normalises Indian mobile numbers', () => {
    expect(normalizePhone('+91 98450 12345')).toBe('9845012345');
    expect(normalizePhone('09845012345')).toBe('9845012345');
  });
});

describe('orderReference', () => {
  it('has a readable, unambiguous format', () => {
    const reference = orderReference((n) => Uint8Array.from({ length: n }, (_, i) => i * 7));
    expect(reference).toMatch(/^BZ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(orderReference()).toMatch(/^BZ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });
});
