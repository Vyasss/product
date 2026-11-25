import { expect, test, type Page } from '@playwright/test';
import { expectSearch, runAxe, waitForCards } from './helpers';

// The build as shipped: a single catalog page. Product page, cart page and share are off; the
// buy buttons and the "Simulate API failure" button are on (see playwright.config.ts).

/**
 * Space between each card's last line and its bottom edge. Every card must keep its 12px
 * bottom padding (nothing cut off) and have little more (the cards are sized for what they
 * show, not just emptier).
 */
async function cardFit(page: Page): Promise<{ minGap: number; maxGap: number; cards: number }> {
  const gaps = await page.locator('[role="listitem"]').evaluateAll((cards) =>
    cards.map((card) => {
      const lastLine = card.lastElementChild?.lastElementChild;
      if (!lastLine) return Number.NaN;
      return Math.round(card.getBoundingClientRect().bottom - lastLine.getBoundingClientRect().bottom);
    }),
  );
  return { minGap: Math.min(...gaps), maxGap: Math.max(...gaps), cards: gaps.length };
}

for (const width of [1440, 768, 390, 320]) {
  test(`${width}px: cards show the product fields and the buy buttons, and fit their content`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?q=shoes');
    await waitForCards(page);

    const firstCard = page.locator('[role="listitem"]').first();
    await expect(firstCard.getByRole('link')).toHaveCount(0);
    await expect(firstCard.getByRole('button', { name: /^Add to cart:/ })).toBeVisible();
    await expect(firstCard.getByRole('button', { name: /^Buy now:/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Cart/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Share/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear all filters' })).toBeVisible();

    const fit = await cardFit(page);
    expect(fit.cards).toBeGreaterThan(0);
    expect(fit.minGap).toBeGreaterThanOrEqual(12);
    expect(fit.maxGap).toBeLessThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

for (const path of ['/product/p-00002', '/cart', '/cart?items=p-00001:2', '/checkout']) {
  test(`${path} shows the not-found page`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  });
}

test('?mockFail=1: the simulated API failure shows the error state, and Retry recovers', async ({ page }) => {
  await page.goto('/?mockFail=1');
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await expect(retry).toBeFocused();
  expect(await runAxe(page)).toEqual([]);
  await retry.click();
  await waitForCards(page);
});

test('the Simulate API failure button shows the error state, and Retry recovers', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  await page.getByRole('button', { name: 'Simulate API failure' }).click();
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeFocused();
  await retry.click();
  await waitForCards(page);
});

test('Buy now adds to the cart and stays on the page (there is no checkout page)', async ({ page }) => {
  await page.goto('/?q=shoes&inStock=true');
  await waitForCards(page);
  const card = page.locator('[role="listitem"]').first();
  await card.getByRole('button', { name: /^Buy now:/ }).click();
  await expect(card).toContainText('1 in cart');
  await expect(page.getByRole('status')).toContainText('Checkout is not part of this demo.');
  await expectSearch(page, '?q=shoes&inStock=true');
});

test('a brand that is not in the catalog offers the catalog brands; one click searches it', async ({ page }) => {
  await page.goto('/?q=samsung');
  await expect(page.getByText('Brands in this catalog')).toBeVisible();
  const brands = page.getByRole('list').filter({ has: page.getByRole('button', { name: 'Sonique' }) }).getByRole('button');
  // Two brands from each of the five categories.
  await expect(brands).toHaveCount(10);
  await page.getByRole('button', { name: 'Sonique' }).click();
  await expectSearch(page, '?q=Sonique');
  await waitForCards(page);
  await expect(page.locator('[role="listitem"]').first()).toContainText('Sonique');
});

test('catalog has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  expect(await runAxe(page)).toEqual([]);
});
