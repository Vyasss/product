import { expect, test, type Page } from '@playwright/test';
import { runAxe, tabTo, waitForCards } from './helpers';

// axe-core in real Chrome: unlike jsdom, this checks colour contrast on rendered pixels.
const states: { name: string; width: number; open: (page: Page) => Promise<void> }[] = [
  {
    name: 'loaded catalog',
    width: 1440,
    open: async (page) => {
      await page.goto('/');
      await waitForCards(page);
    },
  },
  {
    name: 'filtered catalog with chips',
    width: 1440,
    open: async (page) => {
      await page.goto('/?q=shoes&category=Apparel,Sports&inStock=true&maxPrice=3000&sort=price_asc');
      await waitForCards(page);
    },
  },
  {
    name: 'phone list layout',
    width: 390,
    open: async (page) => {
      await page.goto('/?q=shoes');
      await waitForCards(page);
    },
  },
  {
    name: 'empty state',
    width: 1440,
    open: async (page) => {
      await page.goto('/?q=zzzz');
      await expect(page.getByRole('heading', { name: 'No products match “zzzz”' })).toBeVisible();
    },
  },
  {
    name: 'error state',
    width: 1440,
    open: async (page) => {
      await page.goto('/?mockFail=1');
      await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    },
  },
  {
    name: 'filter drawer open',
    width: 390,
    open: async (page) => {
      await page.goto('/?category=Books');
      await waitForCards(page);
      await tabTo(page, page.getByRole('button', { name: /^Filters/ }));
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
    },
  },
  {
    name: 'not-found page',
    width: 1024,
    open: async (page) => {
      await page.goto('/missing/page');
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    },
  },
];

for (const state of states) {
  test(`axe: no violations in the ${state.name}`, async ({ page }) => {
    await page.setViewportSize({ width: state.width, height: 900 });
    await state.open(page);
    expect(await runAxe(page)).toEqual([]);
  });
}
