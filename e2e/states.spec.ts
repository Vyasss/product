import { expect, test } from '@playwright/test';
import { expectResults, resultsHeading, waitForCards } from './helpers';

test('mockFail=1: error state, Retry has focus, Enter recovers', async ({ page }) => {
  await page.goto('/?mockFail=1');
  await expect(page.getByRole('heading', { name: 'We couldn’t load the products' })).toBeVisible();
  await expectResults(page, 'Products unavailable');
  const retry = page.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeFocused();

  await page.keyboard.press('Enter');
  await waitForCards(page);
  await expectResults(page, '5,000 results');
  await expect(resultsHeading(page)).toBeFocused();
  expect(page.url()).toContain('mockFail=1');
  await expect(page.getByRole('status')).toHaveText(/5,000 products found/);
});

test('empty state offers Clear all', async ({ page }) => {
  await page.goto('/?q=zzzz');
  await expect(page.getByRole('heading', { name: 'No products match “zzzz”' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Clear all filters' }).last().click();
  await waitForCards(page);
  await expectResults(page, '5,000 results');
});

test('unknown paths show the not-found page with a way back', async ({ page }) => {
  await page.goto('/no/such/page');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to the catalog' }).click();
  await waitForCards(page);
});
