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

const FAILURES: [string, RegExp][] = [
  ['500', /The server responded with an error \(status 500\)\./],
  ['503', /temporarily unavailable \(status 503\)/],
  ['404', /could not be found \(status 404\).*retrying is unlikely to help/],
  ['403', /Access to the products was refused \(status 403\)/],
  ['429', /Too many requests.*\(status 429\)/],
  ['network', /The request did not complete\. Check your connection\./],
  ['timeout', /The server took too long to answer/],
];

for (const [failure, message] of FAILURES) {
  test(`simulated ${failure}: the message names the cause, filters are kept, Retry recovers`, async ({ page }) => {
    await page.goto(`/?q=shoes&mockFail=1&mockStatus=${failure}`);
    await expect(page.getByRole('heading', { name: 'We couldn’t load the products' })).toBeVisible();
    await expect(page.getByRole('main')).toContainText(message);
    await expect(page.getByRole('main')).toContainText('Your search and filters are kept.');
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('[role="listitem"]').first()).toBeVisible();
    expect(new URL(page.url()).searchParams.get('q')).toBe('shoes');
  });
}

test('offline: says so, and loads by itself when the connection returns', async ({ page, context }) => {
  // Two simulated network failures: the first on load, the second on the retry made while offline.
  await page.goto('/?mockFail=2&mockStatus=network');
  await expect(page.getByRole('main')).toContainText('The request did not complete. Check your connection.');

  await context.setOffline(true);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  // Wait for that retry to finish failing (the button reads "Retrying…" meanwhile), so the
  // reconnect below starts a fresh attempt instead of replacing one still in flight.
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('You appear to be offline.');
  await expect(page.locator('[role="listitem"]')).toHaveCount(0);

  // No click from here on: coming back online retries on its own.
  await context.setOffline(false);
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
});
