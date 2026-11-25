import { expect, test, type Page } from '@playwright/test';
import { runAxe, waitForCards } from './helpers';

// The build as shipped: VITE_FEATURE_CART and VITE_FEATURE_SHARE unset (see playwright.config.ts).

/**
 * Space between each card's last line and its bottom edge. Every card must keep its 12px
 * bottom padding (nothing cut off) and have little more (the cards are shorter without the
 * cart buttons, not just emptier).
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
  test(`${width}px: no cart or share controls, and the shorter cards fit their content`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?q=shoes');
    await waitForCards(page);

    await expect(page.getByRole('link', { name: /^Cart/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Add to cart|Buy now|Share)/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Clear all filters' })).toBeVisible();

    const fit = await cardFit(page);
    expect(fit.cards).toBeGreaterThan(0);
    expect(fit.minGap).toBeGreaterThanOrEqual(12);
    expect(fit.maxGap).toBeLessThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
  });
}

test('product page has no purchase or share controls, and no accessibility violations', async ({ page }) => {
  await page.goto('/product/p-00002');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Highlights' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Add to cart|Buy now|Share)/ })).toHaveCount(0);
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
  const fit = await cardFit(page);
  expect(fit.minGap).toBeGreaterThanOrEqual(12);
  expect(fit.maxGap).toBeLessThanOrEqual(16);
  expect(await runAxe(page)).toEqual([]);
});

for (const path of ['/cart', '/cart?items=p-00001:2', '/checkout']) {
  test(`${path} shows the not-found page`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  });
}

test('catalog has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  expect(await runAxe(page)).toEqual([]);
});
