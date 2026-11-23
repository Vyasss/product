// Regenerates docs/screenshots/ (add-on). Requires `npm run build` first.
// Serves dist/ with `vite preview` and drives the locally installed Google Chrome.

import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const PORT = 4194;
const BASE = `http://localhost:${PORT}`;
const OUT = 'docs/screenshots';

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function open(width, height, path, { mobile = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  await page.goto(BASE + path);
  return page;
}

const cards = (page) => page.locator('[role="listitem"]').first().waitFor();
// Wait for images in view to finish (lazy images below the fold never load, so cap the wait).
const settle = async (page) => {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        [...document.images]
          .filter((img) => img.getBoundingClientRect().top < window.innerHeight)
          .map((img) => (img.complete ? null : img.decode().catch(() => null))),
      ),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]),
  );
  await page.waitForTimeout(300);
};
const shot = async (page, name) => {
  await settle(page);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png`);
  await page.context().close();
};

/** Tab to an element (so :focus-visible applies) and capture the area around it, ring included. */
async function focusShot(page, locator, name, around = locator, pad = 14) {
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    if (await locator.evaluate((el) => el === document.activeElement)) break;
  }
  if (!(await locator.evaluate((el) => el === document.activeElement))) throw new Error(`could not focus ${name}`);
  await around.scrollIntoViewIfNeeded();
  const box = await around.boundingBox();
  if (!box) throw new Error(`no box for ${name}`);
  await page.screenshot({
    path: `${OUT}/focus/${name}.png`,
    clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 },
  });
  console.log(`${OUT}/focus/${name}.png`);
}

try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/focus`, { recursive: true });

  let page = await open(1440, 1000, '/?category=Apparel,Sports&sort=price_asc');
  await cards(page);
  await shot(page, 'catalog-1440');

  page = await open(768, 1024, '/');
  await cards(page);
  await shot(page, 'catalog-768');

  page = await open(390, 844, '/?q=shoes', { mobile: true });
  await cards(page);
  await shot(page, 'catalog-390');

  page = await open(1280, 800, '/?q=runing%20shoez');
  await cards(page);
  await shot(page, 'search-corrected');

  page = await open(1280, 800, '/?q=zzzz&inStock=true');
  await page.getByRole('heading', { name: /No products match/ }).waitFor();
  await shot(page, 'empty-state');

  page = await open(1280, 800, '/?mockFail=1');
  await page.getByRole('button', { name: 'Retry' }).waitFor();
  await shot(page, 'error-state');

  page = await open(390, 844, '/?category=Books', { mobile: true });
  await cards(page);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('dialog').waitFor();
  await shot(page, 'mobile-drawer');

  page = await open(1440, 1000, '/product/p-00002');
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'product-1440');

  page = await open(390, 844, '/product/p-00002', { mobile: true });
  await page.getByRole('heading', { level: 1 }).waitFor();
  await shot(page, 'product-390');

  page = await open(1280, 900, '/product/p-00002');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.goto(`${BASE}/product/p-00010`);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.goto(`${BASE}/cart`);
  await page.getByRole('heading', { level: 1, name: /Your cart/ }).waitFor();
  await settle(page);
  await page.screenshot({ path: `${OUT}/cart-1280.png` });
  console.log(`${OUT}/cart-1280.png`);
  await page.getByRole('link', { name: 'Proceed to checkout' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await settle(page);
  await page.screenshot({ path: `${OUT}/checkout-errors-1280.png` });
  console.log(`${OUT}/checkout-errors-1280.png`);
  await page.getByRole('textbox', { name: 'Full name' }).fill('Asha Rao');
  await page.getByRole('textbox', { name: 'Delivery address' }).fill('12 Lake View Road, Koramangala, Bengaluru');
  await page.getByRole('textbox', { name: 'PIN code' }).fill('560034');
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('9845012345');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.getByRole('heading', { name: 'Order placed' }).waitFor();
  await shot(page, 'confirmation-1280');

  page = await open(1280, 800, '/missing/page');
  await page.getByRole('heading', { name: 'Page not found' }).waitFor();
  await shot(page, 'not-found');

  // Focus rings on dark (header) and light surfaces.
  page = await open(1440, 1000, '/?q=shoes');
  await cards(page);
  await focusShot(page, page.getByRole('searchbox', { name: 'Search products' }), 'dark-search-field');
  await focusShot(page, page.getByRole('button', { name: 'Clear search' }), 'light-clear-button-in-field');
  await focusShot(page, page.getByRole('link', { name: /^Cart,/ }), 'dark-cart-link');
  const checkbox = page.getByRole('checkbox', { name: /^Electronics/ });
  await focusShot(page, checkbox, 'light-checkbox', page.locator('label', { has: checkbox }));
  await focusShot(page, page.getByRole('combobox', { name: 'Sort by' }), 'light-sort-select');
  await focusShot(page, page.getByRole('button', { name: 'Clear all filters' }), 'light-ghost-button');
  const productLink = page.locator('[data-product-link]').first();
  await focusShot(page, productLink, 'light-product-card', productLink.locator('xpath=ancestor::*[@role="listitem"]'));
  await page.context().close();

  page = await open(1280, 800, '/?mockFail=1');
  const retry = page.getByRole('button', { name: 'Retry' });
  await retry.waitFor();
  await retry.blur();
  await focusShot(page, retry, 'light-primary-button');
  await page.context().close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
