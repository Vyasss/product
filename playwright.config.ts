import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests in the locally installed Google Chrome (`channel: 'chrome'`), so no
 * browser download is needed. Not part of `npm test`; run with `npm run e2e`.
 *
 * Two production builds, each served by `vite preview` from its own folder (dist/ is left alone):
 * - "full": every storefront feature on (cart, share); most specs run here.
 * - "default": the build as shipped, with VITE_FEATURE_CART and VITE_FEATURE_SHARE unset;
 *   `default-build.spec.ts` checks that those features are absent and that the layout fits.
 */
const FULL_PORT = 4190;
const DEFAULT_PORT = 4191;
const DEFAULT_SPEC = /default-build\.spec\.ts/;

const serve = (outDir: string, port: number) =>
  `npx vite build --outDir ${outDir} --emptyOutDir && npx vite preview --outDir ${outDir} --port ${port} --strictPort`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  workers: 2,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
  },
  projects: [
    { name: 'full', testIgnore: DEFAULT_SPEC, use: { baseURL: `http://localhost:${FULL_PORT}` } },
    { name: 'default', testMatch: DEFAULT_SPEC, use: { baseURL: `http://localhost:${DEFAULT_PORT}` } },
  ],
  webServer: [
    {
      // Typecheck once, before the first build.
      command: `npm run typecheck && ${serve('.e2e/full', FULL_PORT)}`,
      url: `http://localhost:${FULL_PORT}`,
      env: { VITE_FEATURE_CART: 'true', VITE_FEATURE_SHARE: 'true' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: serve('.e2e/default', DEFAULT_PORT),
      url: `http://localhost:${DEFAULT_PORT}`,
      env: { VITE_FEATURE_CART: 'false', VITE_FEATURE_SHARE: 'false' },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
