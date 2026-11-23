import { defineConfig } from '@playwright/test';

/**
 * Add-on: end-to-end tests in the locally installed Google Chrome (`channel: 'chrome'`), so no
 * browser download is needed. Runs against the production build served by `vite preview`.
 * Not part of `npm test`; run with `npm run e2e`.
 */
const PORT = 4190;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
