import { expect, test, type Page } from '@playwright/test';
import { runAxe, waitForCards } from './helpers';

const BOOK = { id: 'p-00002', title: 'Coding for Everyone: Textbook' };
const FILTERED = '/?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function copyLinkFrom(page: Page, buttonName: string): Promise<string> {
  await page.getByRole('button', { name: buttonName }).click();
  await page.getByRole('group', { name: 'Share options' }).getByRole('button', { name: 'Copy link' }).click();
  await expect(page.getByRole('status').first()).toHaveText('Link copied');
  return clipboard(page);
}

test('catalog: the share menu copies the exact filtered URL and offers app links', async ({ page, baseURL }) => {
  await page.goto(FILTERED);
  await waitForCards(page);

  const share = page.getByRole('button', { name: 'Share this view' });
  await share.click();
  const menu = page.getByRole('group', { name: 'Share options' });
  await expect(menu).toBeVisible();
  await expect(share).toHaveAttribute('aria-expanded', 'true');

  const whatsapp = await menu.getByRole('link', { name: 'WhatsApp' }).getAttribute('href');
  expect(new URL(whatsapp ?? '').searchParams.get('text')).toContain(`${baseURL}${FILTERED}`);
  await expect(menu.getByRole('link', { name: 'Email' })).toHaveAttribute('href', /^mailto:\?subject=/);
  const teams = await menu.getByRole('link', { name: 'Microsoft Teams' }).getAttribute('href');
  expect(new URL(teams ?? '').searchParams.get('href')).toBe(`${baseURL}${FILTERED}`);

  expect(await runAxe(page)).toEqual([]);

  // Escape closes the menu and focus returns to the button.
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(share).toBeFocused();

  expect(await copyLinkFrom(page, 'Share this view')).toBe(`${baseURL}${FILTERED}`);
});

test('product page: the copied link opens the same product', async ({ page, baseURL }) => {
  await page.goto(`/product/${BOOK.id}`);
  await expect(page.getByRole('heading', { level: 1, name: BOOK.title })).toBeVisible();

  const link = await copyLinkFrom(page, 'Share this product');
  expect(link).toBe(`${baseURL}/product/${BOOK.id}`);

  await page.goto(link);
  await expect(page.getByRole('heading', { level: 1, name: BOOK.title })).toBeVisible();
});

test('cart: a shared cart link shows the items to a new visitor and adds them only when asked', async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto(`/product/${BOOK.id}`);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.goto('/cart');
  await expect(page.getByRole('list', { name: 'Items in your cart' })).toBeVisible();

  const link = await copyLinkFrom(page, 'Share this cart');
  expect(link).toBe(`${baseURL}/cart?items=${BOOK.id}:1`);

  // A different visitor: fresh storage, so their own cart is empty.
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.goto(link);
  const notice = visitor.getByRole('region', { name: 'Someone shared a cart with you' });
  await expect(notice).toContainText(`${BOOK.title} × 1`);
  await expect(visitor.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  expect(await runAxe(visitor)).toEqual([]);

  await notice.getByRole('button', { name: 'Add these to my cart' }).click();
  await expect(visitor.getByRole('list', { name: 'Items in your cart' })).toContainText(BOOK.title);
  await expect(notice).toBeHidden();
  expect(new URL(visitor.url()).search).toBe('');
  await context.close();
});

test('cart: a shared link with unknown or malformed items never breaks the page', async ({ page }) => {
  await page.goto('/cart?items=nope:2,%3Cscript%3E:1,p-00002:abc');
  await expect(page.getByRole('heading', { name: 'This shared cart has nothing available' })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss' }).click();
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});
