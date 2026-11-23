import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Fills `__SITE_URL__` in index.html with VITE_SITE_URL (no trailing slash). Link-preview
 * images must be absolute URLs; when the variable is unset the path stays root-relative,
 * which still works in browsers but not for preview fetchers.
 */
function siteUrl(mode: string): Plugin {
  const url = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
  return {
    name: 'site-url',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', url),
  };
}

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), tailwindcss(), siteUrl(mode)],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Keep thumbnails as real hashed files (lazy-loaded, cached immutably) rather than
    // inlining them into the JS bundle as data URIs.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
}));
