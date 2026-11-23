import { expect, test, type Page } from '@playwright/test';
import { expectSearch, nextFrames, runAxe, tabTo, waitForCards } from './helpers';

const IN_STOCK = { id: 'p-00002', title: 'Coding for Everyone: Textbook' };
const OUT_OF_STOCK = { id: 'p-00001', title: 'Pro Running Shoes' };

const cartLink = (page: Page, count: number) =>
  page.getByRole('link', { name: `Cart, ${count} ${count === 1 ? 'item' : 'items'}` });

/** First product link whose card is fully inside the viewport. */
async function visibleProductLink(page: Page) {
  const id = await page.evaluate(() => {
    for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-product-link]')) {
      const card = link.closest('[role="listitem"]')?.getBoundingClientRect();
      if (card && card.top > 160 && card.bottom < window.innerHeight) return link.dataset.productLink ?? null;
    }
    return null;
  });
  if (!id) throw new Error('no fully visible card');
  return page.locator(`[data-product-link="${id}"]`);
}

test('open a product from a filtered, scrolled list; Back restores filters, scroll and focus', async ({ page }) => {
  await page.goto('/?category=Sports&sort=price_asc');
  await waitForCards(page);
  await page.evaluate(() => window.scrollTo(0, 4200));
  await nextFrames(page);
  await page.waitForTimeout(400); // let the (debounced) scroll position be saved
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const link = await visibleProductLink(page);
  const title = (await link.textContent()) ?? '';
  const id = await link.getAttribute('data-product-link');
  await link.click();

  await expect(page).toHaveURL(/\/product\/p-\d{5}$/);
  const heading = page.getByRole('heading', { level: 1, name: title });
  await expect(heading).toBeFocused();
  await expect(page).toHaveTitle(`${title} | Bazora`);

  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(cartLink(page, 1)).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(`Added ${title} to cart`);

  await page.goBack();
  await waitForCards(page);
  await expectSearch(page, '?category=Sports&sort=price_asc');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore - 5);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThanOrEqual(5);
  // Focus returns to the link that was opened (titles can repeat, so match by product id).
  await expect(page.locator(`[data-product-link="${id}"]`)).toBeFocused();
  await expect(cartLink(page, 1)).toBeVisible();
});

test('the "Back to results" button on the product page returns to the same view', async ({ page }) => {
  await page.goto('/?q=shoes&category=Apparel');
  await waitForCards(page);
  await (await visibleProductLink(page)).click();
  await page.getByRole('button', { name: 'Back to results' }).click();
  await expectSearch(page, '?q=shoes&category=Apparel');
  await waitForCards(page);
});

test('deep links: reload /product/:id and /cart directly', async ({ page }) => {
  await page.goto(`/product/${IN_STOCK.id}`);
  await expect(page.getByRole('heading', { level: 1, name: IN_STOCK.title })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: IN_STOCK.title })).toBeVisible();
  await expect(cartLink(page, 1)).toBeVisible();

  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart (1 product)' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart (1 product)' })).toBeVisible();

  await page.goto('/product/p-99999');
  await expect(page.getByRole('heading', { level: 1, name: 'Product not found' })).toBeVisible();
});

test('unavailable product: Add to cart and Buy now disabled, with the reason', async ({ page }) => {
  await page.goto(`/product/${OUT_OF_STOCK.id}`);
  await expect(page.getByRole('heading', { level: 1, name: OUT_OF_STOCK.title })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to cart', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Buy now', exact: true })).toBeDisabled();
  await expect(page.getByText('Currently unavailable, so it can’t be added to the cart or bought.')).toBeVisible();
});

test('keyboard only: product page → cart → checkout → order placed', async ({ page }) => {
  await page.goto(`/product/${IN_STOCK.id}`);
  await expect(page.getByRole('heading', { level: 1, name: IN_STOCK.title })).toBeVisible();

  // Quantity 2 with the + button, then Add to cart, all by keyboard.
  await tabTo(page, page.getByRole('button', { name: `Increase quantity of ${IN_STOCK.title}` }));
  await page.keyboard.press('Enter');
  await tabTo(page, page.getByRole('button', { name: 'Add to cart', exact: true }));
  await page.keyboard.press('Enter');
  await expect(cartLink(page, 2)).toBeVisible();

  // Header cart link (Shift+Tab back up to it is fine too; Tab from the top is deterministic).
  await page.keyboard.press('Control+Home');
  await page.locator('body').focus();
  await tabTo(page, cartLink(page, 2));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart (2 products)' })).toBeFocused();

  await tabTo(page, page.getByRole('button', { name: `Increase quantity of ${IN_STOCK.title}` }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart (3 products)' })).toBeVisible();

  await tabTo(page, page.getByRole('link', { name: 'Proceed to checkout' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Checkout' })).toBeFocused();

  // Submit empty: focus goes to the first invalid field.
  await tabTo(page, page.getByRole('button', { name: 'Place order' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Full name' })).toBeFocused();

  await page.keyboard.type('Asha Rao');
  await page.keyboard.press('Tab');
  await page.keyboard.type('12 Lake View Road, Bengaluru');
  await page.keyboard.press('Tab');
  await page.keyboard.type('560034');
  await page.keyboard.press('Tab');
  await page.keyboard.type('9845012345');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Place order' })).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { level: 1, name: 'Order placed' })).toBeFocused();
  await expect(page.getByText(/^BZ-[A-Z2-9]{4}-[A-Z2-9]{4}$/)).toBeVisible();
  await expect(cartLink(page, 0)).toBeVisible();
  // The delivery details were not stored anywhere.
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }));
  expect(stored).not.toContain('Asha');
  expect(stored).not.toContain('560034');
});

test('a focused card stays mounted while the list scrolls away from it', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const link = await visibleProductLink(page);
  await link.focus();
  const id = await link.getAttribute('data-product-link');
  await page.evaluate(() => window.scrollTo(0, 60000));
  await nextFrames(page);
  const stillFocused = await page.evaluate(
    (productId) => document.activeElement?.getAttribute('data-product-link') === productId && document.activeElement.isConnected,
    id,
  );
  expect(stillFocused).toBe(true);
});

for (const [name, path, width] of [
  ['product page', `/product/${IN_STOCK.id}`, 1440],
  ['product page (phone)', `/product/${IN_STOCK.id}`, 390],
  ['unavailable product page', `/product/${OUT_OF_STOCK.id}`, 1440],
  ['empty cart', '/cart', 1440],
] as const) {
  test(`axe: no violations on the ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main [aria-hidden="true"].animate-shimmer')).toHaveCount(0);
    expect(await runAxe(page)).toEqual([]);
  });
}

test('axe: no violations on the filled cart, checkout with errors and the confirmation', async ({ page }) => {
  await page.goto(`/product/${IN_STOCK.id}`);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.goto('/cart');
  await expect(page.getByRole('heading', { level: 1, name: 'Your cart (1 product)' })).toBeVisible();
  expect(await runAxe(page)).toEqual([]);

  await page.getByRole('link', { name: 'Proceed to checkout' }).click();
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('textbox', { name: 'Full name' })).toBeFocused();
  expect(await runAxe(page)).toEqual([]);

  await page.getByRole('textbox', { name: 'Full name' }).fill('Asha Rao');
  await page.getByRole('textbox', { name: 'Delivery address' }).fill('12 Lake View Road, Bengaluru');
  await page.getByRole('textbox', { name: 'PIN code' }).fill('560034');
  await page.getByRole('textbox', { name: 'Mobile number' }).fill('9845012345');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Order placed' })).toBeVisible();
  expect(await runAxe(page)).toEqual([]);
});
