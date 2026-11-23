import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, nextFrames, tabTo, waitForCards } from './helpers';

test.describe('phone (390 x 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('filter drawer: keyboard opens it, focus moves in, Esc closes and focus returns', async ({ page }) => {
    await page.goto('/');
    await waitForCards(page);
    const trigger = page.getByRole('button', { name: /^Filters/ });
    await tabTo(page, trigger);
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: 'Filters' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);

    // Tab stays inside the dialog (focus trap).
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('pinned area stays small while scrolling', async ({ page }) => {
    await page.goto('/?q=shoes&category=Apparel,Sports');
    await waitForCards(page);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await nextFrames(page);
    const pinned = await page.evaluate(() => {
      let bottom = 0;
      for (const element of document.querySelectorAll<HTMLElement>('body *')) {
        const position = getComputedStyle(element).position;
        if (position !== 'sticky' && position !== 'fixed') continue;
        const rect = element.getBoundingClientRect();
        if (rect.height > 0 && rect.top <= 1 && rect.bottom > 0) bottom = Math.max(bottom, rect.bottom);
      }
      return Math.round(bottom);
    });
    test.info().annotations.push({ type: 'pinned-height-px', description: String(pinned) });
    console.log(`pinned area at 390x844 after scrolling: ${pinned}px`);
    expect(pinned).toBeGreaterThan(0);
    expect(pinned).toBeLessThanOrEqual(120);
    // Search stays reachable while scrolled.
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeInViewport();
  });
});

for (const width of [390, 768, 1440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?q=shoes&category=Apparel,Sports&inStock=true&minPrice=500&maxPrice=5000');
    await waitForCards(page);
    expect(await hasHorizontalScroll(page)).toBe(false);
    await page.goto('/?q=zzzz');
    await expect(page.getByRole('heading', { name: 'No products match “zzzz”' })).toBeVisible();
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
}

for (const viewport of [
  { width: 1440, height: 1000, step: 2500 },
  { width: 390, height: 844, step: 9000 },
]) {
  test(`fewer than 80 product cards in the DOM while scrolling the whole list (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/');
    await waitForCards(page);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    let maxCards = 0;
    let lastPosition = 0;
    for (let y = 0; y <= height + viewport.step; y += viewport.step) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await nextFrames(page);
      const { cards, last } = await page.evaluate(() => {
        const items = document.querySelectorAll('[role="listitem"]');
        const positions = Array.from(items, (item) => Number(item.getAttribute('aria-posinset')));
        return { cards: items.length, last: Math.max(0, ...positions) };
      });
      maxCards = Math.max(maxCards, cards);
      lastPosition = Math.max(lastPosition, last);
    }
    console.log(`${viewport.width}px: at most ${maxCards} cards in the DOM`);
    expect(maxCards).toBeLessThan(80);
    expect(lastPosition).toBe(5000);
  });
}
