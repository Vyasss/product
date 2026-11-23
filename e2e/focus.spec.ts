import { expect, test, type Locator, type Page } from '@playwright/test';
import { tabTo, waitForCards } from './helpers';

const FOCUS_BLUE = 'rgb(31, 95, 209)'; // --color-focus, light surfaces
const ACCENT = 'rgb(242, 198, 207)'; // --color-accent, dark header and footer

async function outlineOf(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
  });
}

async function expectRing(page: Page, target: Locator, color: string) {
  await tabTo(page, target);
  expect(await target.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
  expect(await outlineOf(target)).toEqual({ style: 'solid', width: '3px', color });
}

test('keyboard focus shows a 3px ring in the right colour on light and dark surfaces', async ({ page }) => {
  await page.goto('/?q=shoes');
  await waitForCards(page);

  // Dark header: mint ring around the search field.
  await expectRing(page, page.getByRole('combobox', { name: 'Search products' }), ACCENT);
  // The Clear button sits on the white field, so it switches back to blue.
  await expectRing(page, page.getByRole('button', { name: 'Clear search' }), FOCUS_BLUE);
  // Light surfaces.
  await expectRing(page, page.getByRole('checkbox', { name: /^Electronics/ }), FOCUS_BLUE);
  await expectRing(page, page.getByRole('combobox', { name: 'Sort by' }), FOCUS_BLUE);
  await expectRing(page, page.getByRole('button', { name: 'Remove filter: “shoes”' }), FOCUS_BLUE);
  await expectRing(page, page.getByRole('button', { name: 'Clear all filters' }), FOCUS_BLUE);
});

test('focus ring on a primary button and on a link in the dark header', async ({ page }) => {
  await page.goto('/?mockFail=1');
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await retry.blur();
  await expectRing(page, retry, FOCUS_BLUE);

  await page.goto('/not-here');
  await expectRing(page, page.getByRole('link', { name: 'AllinONE home' }), ACCENT);
});

test('a focused product link rings the whole card (on its overlay)', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const link = page.locator('[data-product-link]').first();
  await tabTo(page, link, 60);
  const ring = await link.evaluate((element) => {
    const after = getComputedStyle(element, '::after');
    const card = element.closest('[role="listitem"]')?.getBoundingClientRect();
    return { style: after.outlineStyle, width: after.outlineWidth, color: after.outlineColor, cardWidth: card?.width ?? 0 };
  });
  expect(ring).toMatchObject({ style: 'solid', width: '3px', color: FOCUS_BLUE });
  expect(ring.cardWidth).toBeGreaterThan(200);
});
