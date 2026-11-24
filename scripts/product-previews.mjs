// Writes one HTML file per product into dist/product/, so a shared product link shows that
// product's name and price in WhatsApp, Teams and email previews. Preview fetchers do not run
// JavaScript; they only read the <head> of the URL they are given.
//
// Each file is dist/index.html with the title and preview tags changed, so a browser that
// opens it boots the same app. The CloudFront function serves /product/<id> from
// /product/<id>.html (see infra/cloudfront/spa-rewrite.js).
//
// Run after `npm run build`, with VITE_SITE_URL set: `npm run build:previews`.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, loadEnv } from 'vite';

const DIST = new URL('../dist/', import.meta.url);
const SITE_NAME = 'AllinONE';

const siteUrl = (loadEnv('production', process.cwd(), 'VITE_').VITE_SITE_URL ?? '').trim().replace(/\/+$/, '');
if (siteUrl === '') {
  console.error('VITE_SITE_URL is not set: previews need the absolute address of the site.');
  process.exit(1);
}

const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Replaces exactly one match and fails when the shell no longer has the expected tag. */
function replaceOnce(html, pattern, replacement, what) {
  let count = 0;
  const result = html.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  if (count !== 1) throw new Error(`dist/index.html: expected one ${what}, found ${count}.`);
  return result;
}

function previewPage(shell, product, formatPrice) {
  const title = escapeHtml(`${product.title} by ${product.brand}`);
  const description = escapeHtml(
    [
      formatPrice(product.price),
      `Rated ${product.rating.toFixed(1)} out of 5`,
      product.inStock ? 'In stock' : 'Currently unavailable',
      `${product.category} on ${SITE_NAME}`,
    ].join(' · '),
  );
  const url = `${siteUrl}/product/${product.id}`;

  let html = shell;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${title} | ${SITE_NAME}</title>`, '<title>');
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${description}" />`,
    'meta description',
  );
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${title}" />\n    <meta property="og:url" content="${url}" />`,
    'og:title',
  );
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*" \/>/,
    `<meta property="og:description" content="${description}" />`,
    'og:description',
  );
  return html;
}

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { generateProducts } = await server.ssrLoadModule('/src/data/generateProducts.ts');
  const { formatPrice } = await server.ssrLoadModule('/src/features/shared/format.ts');

  const shell = await readFile(new URL('index.html', DIST), 'utf8');
  const products = generateProducts();
  await mkdir(new URL('product/', DIST), { recursive: true });

  const BATCH = 200;
  for (let start = 0; start < products.length; start += BATCH) {
    await Promise.all(
      products
        .slice(start, start + BATCH)
        .map((product) =>
          writeFile(new URL(`product/${product.id}.html`, DIST), previewPage(shell, product, formatPrice)),
        ),
    );
  }
  console.log(`Wrote ${products.length} product preview pages to dist/product/ for ${siteUrl}.`);
} finally {
  await server.close();
}
