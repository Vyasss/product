/**
 * Demo checkout: delivery details are validated in the browser only. They are never stored or
 * sent anywhere (see CheckoutPage).
 */
export interface DeliveryDetails {
  name: string;
  address: string;
  pin: string;
  phone: string;
}

export type DeliveryField = keyof DeliveryDetails;
export type DeliveryErrors = Partial<Record<DeliveryField, string>>;

export const EMPTY_DELIVERY: DeliveryDetails = { name: '', address: '', pin: '', phone: '' };
export const DELIVERY_FIELDS: readonly DeliveryField[] = ['name', 'address', 'pin', 'phone'];

const NAME = /^[\p{L}][\p{L}\p{M} .'-]{1,79}$/u;
const PIN = /^[1-9]\d{5}$/;
const MOBILE = /^[6-9]\d{9}$/;

/** Removes spaces/dashes and an optional +91 or leading 0 from an Indian mobile number. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '');
  return digits.replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, '');
}

export function validateField(field: DeliveryField, value: string): string | undefined {
  const trimmed = value.trim();
  switch (field) {
    case 'name':
      return NAME.test(trimmed) ? undefined : 'Enter your full name (letters, spaces, dots, apostrophes and hyphens).';
    case 'address':
      return trimmed.length >= 10 && trimmed.length <= 300
        ? undefined
        : 'Enter the full delivery address: house or flat, street, area and city.';
    case 'pin':
      return PIN.test(trimmed.replace(/\s/g, '')) ? undefined : 'Enter a 6-digit PIN code. It cannot start with 0.';
    case 'phone':
      return MOBILE.test(normalizePhone(trimmed))
        ? undefined
        : 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.';
  }
}

export function validateDelivery(details: DeliveryDetails): DeliveryErrors {
  const errors: DeliveryErrors = {};
  for (const field of DELIVERY_FIELDS) {
    const message = validateField(field, details[field]);
    if (message) errors[field] = message;
  }
  return errors;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "BZ-7K2M-QX9D": random, unambiguous characters. Not stored anywhere. */
export function orderReference(randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  const chars = Array.from(randomBytes(8), (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length] ?? 'X');
  return `BZ-${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}
