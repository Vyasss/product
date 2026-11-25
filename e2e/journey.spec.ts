import { expect, test } from '@playwright/test';
import { expectResults, expectSearch, tabTo, waitForCards } from './helpers';

// Expected counts come from the deterministic dataset (seed 20240611, see the checksum test).
test('full journey with the keyboard only: search, category, price, sort, clear all', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  await expectResults(page, '5,000 results');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to results' })).toBeFocused();
  await page.keyboard.press('Tab');
  const search = page.getByRole('combobox', { name: 'Search products' });
  await expect(search).toBeFocused();

  // Search
  await page.keyboard.type('shoes', { delay: 40 });
  await expectResults(page, '317 results for “shoes”');
  await expectSearch(page, '?q=shoes');

  // Tick a category with Space; Enter toggles a checkbox too (on and off again)
  await tabTo(page, page.getByRole('checkbox', { name: /^Apparel/ }));
  await page.keyboard.press('Space');
  await expectResults(page, '82 results for “shoes”');
  await expectSearch(page, '?q=shoes&category=Apparel');
  const sports = page.getByRole('checkbox', { name: /^Sports/ });
  await tabTo(page, sports);
  await page.keyboard.press('Enter');
  await expect(sports).toBeChecked();
  await expectSearch(page, '?q=shoes&category=Apparel,Sports');
  await page.keyboard.press('Enter');
  await expect(sports).not.toBeChecked();
  await expectSearch(page, '?q=shoes&category=Apparel');

  // Set a maximum price, committed with Enter
  await tabTo(page, page.getByRole('spinbutton', { name: 'Max price' }));
  await page.keyboard.type('3000');
  await page.keyboard.press('Enter');
  await expectResults(page, '77 results for “shoes”');
  await expectSearch(page, '?q=shoes&category=Apparel&maxPrice=3000');

  // Change the sort with the arrow key on the native select
  const sort = page.getByRole('combobox', { name: 'Sort by' });
  await tabTo(page, sort);
  await page.keyboard.press('ArrowDown');
  await expect(sort).toHaveValue('price_asc');
  await expectSearch(page, '?q=shoes&category=Apparel&maxPrice=3000&sort=price_asc');
  await expectResults(page, '77 results for “shoes”');
  const prices = await page.$$eval('[role="listitem"] .sr-only', (nodes) =>
    nodes
      .map((node) => node.textContent ?? '')
      .filter((text) => text.startsWith('₹'))
      .map((text) => Number(text.replace(/[^\d]/g, ''))),
  );
  expect(prices.length).toBeGreaterThan(3);
  expect(prices).toEqual([...prices].sort((a, b) => a - b));

  // Clear all with Enter: URL reset, full count, focus back in the search box
  await tabTo(page, page.getByRole('button', { name: 'Clear all filters' }));
  await page.keyboard.press('Enter');
  await expectResults(page, '5,000 results');
  await expectSearch(page, '');
  await expect(search).toHaveValue('');
  await expect(search).toBeFocused();
});

test('conversational search and typo correction in real Chrome', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const search = page.getByRole('combobox', { name: 'Search products' });

  await search.click();
  await page.keyboard.type('ek smart tv chahie', { delay: 30 });
  await expectResults(page, '131 results for “ek smart tv chahie”');
  await expectSearch(page, '?q=ek%20smart%20tv%20chahie');

  await search.fill('');
  await page.keyboard.type('runing shoez', { delay: 30 });
  await expectResults(page, '210 results for “runing shoez”');
  await expect(page.getByText('Showing results for “running shoes” (corrected from “runing shoez”)')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText(
    '210 products found. Showing results for “running shoes” (corrected from “runing shoez”)',
  );
  await expectSearch(page, '?q=runing%20shoez');
  await expect(search).toHaveValue('runing shoez');
});
