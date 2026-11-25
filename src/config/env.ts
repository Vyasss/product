/**
 * The only module that reads `import.meta.env`. Values are inlined by Vite at build time,
 * so they are public: this app has no secrets and must never be given any.
 */
export interface AppConfig {
  /** Base URL of a real product API, or null to use the in-browser mock service. */
  apiBaseUrl: string | null;
  /** Mock only: probability in [0, 1] that a request fails with a simulated 500. */
  mockFailRate: number;
  /** Show the on-page control that simulates a failed API response (mock service only; on by default). */
  enableMockControls: boolean;
  /** Show smart-search suggestions. */
  smartSearch: boolean;
  /** Add to cart, Buy now, the cart and the demo checkout. */
  cart: boolean;
  /** Share buttons (copy link, WhatsApp, email, Teams). The URL alone still restores a view. */
  share: boolean;
  /** Product detail page at /product/:id; off, the app is the single catalog page. */
  productPage: boolean;
  /** Add to cart and Buy now on every product card (on by default). */
  buyButtons: boolean;
}

export type RawEnv = Readonly<Record<string, string | boolean | undefined>>;

function readString(env: RawEnv, key: string): string {
  const value = env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function readFlag(env: RawEnv, key: string): boolean {
  const value = env[key];
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

/** Like readFlag, but on unless the variable says "false" or "0". */
function readFlagDefaultOn(env: RawEnv, key: string): boolean {
  const value = env[key];
  if (typeof value === 'boolean') return value;
  return value !== 'false' && value !== '0';
}

function readRate(env: RawEnv, key: string): number {
  const raw = readString(env, key);
  if (raw === '') return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function readBaseUrl(env: RawEnv, key: string): string | null {
  const raw = readString(env, key);
  if (raw === '') return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return raw.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** Pure and total: invalid values fall back to safe defaults instead of throwing. */
export function parseConfig(env: RawEnv): AppConfig {
  return {
    apiBaseUrl: readBaseUrl(env, 'VITE_API_BASE_URL'),
    mockFailRate: readRate(env, 'VITE_MOCK_FAIL_RATE'),
    enableMockControls: readFlagDefaultOn(env, 'VITE_ENABLE_MOCK_CONTROLS'),
    smartSearch: readFlag(env, 'VITE_FEATURE_SMART_SEARCH'),
    cart: readFlag(env, 'VITE_FEATURE_CART'),
    share: readFlag(env, 'VITE_FEATURE_SHARE'),
    productPage: readFlag(env, 'VITE_FEATURE_PRODUCT_PAGE'),
    buyButtons: readFlagDefaultOn(env, 'VITE_FEATURE_BUY_BUTTONS'),
  };
}

export const appConfig: AppConfig = parseConfig({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_MOCK_FAIL_RATE: import.meta.env.VITE_MOCK_FAIL_RATE,
  VITE_ENABLE_MOCK_CONTROLS: import.meta.env.VITE_ENABLE_MOCK_CONTROLS,
  VITE_FEATURE_SMART_SEARCH: import.meta.env.VITE_FEATURE_SMART_SEARCH,
  VITE_FEATURE_CART: import.meta.env.VITE_FEATURE_CART,
  VITE_FEATURE_SHARE: import.meta.env.VITE_FEATURE_SHARE,
  VITE_FEATURE_PRODUCT_PAGE: import.meta.env.VITE_FEATURE_PRODUCT_PAGE,
  VITE_FEATURE_BUY_BUTTONS: import.meta.env.VITE_FEATURE_BUY_BUTTONS,
});
