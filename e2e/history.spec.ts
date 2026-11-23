import { expect, test } from '@playwright/test';
import { expectResults, expectSearch, waitForCards } from './helpers';

const BRIEF = '/?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc';

test('a shared URL restores the exact view, also after reload', async ({ page }) => {
  for (const step of ['load', 'reload'] as const) {
    if (step === 'load') await page.goto(BRIEF);
    else await page.reload();
    await waitForCards(page);
    await expectResults(page, '260 results for “shoes”');
    await expectSearch(page, '?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc');
    await expect(page.getByRole('searchbox', { name: 'Search products' })).toHaveValue('shoes');
    await expect(page.getByRole('checkbox', { name: /^Apparel/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^Sports/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^Books/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'In stock only' })).toBeChecked();
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price_asc');
  }
});

test('Back and Forward step through filter changes', async ({ page }) => {
  await page.goto(BRIEF);
  await waitForCards(page);
  const inStock = page.getByRole('checkbox', { name: 'In stock only' });

  await inStock.click();
  await expectResults(page, '317 results for “shoes”');
  await expectSearch(page, '?q=shoes&category=Apparel,Sports&sort=price_asc');

  await page.goBack();
  await expectResults(page, '260 results for “shoes”');
  await expectSearch(page, '?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc');
  await expect(inStock).toBeChecked();

  await page.goForward();
  await expectResults(page, '317 results for “shoes”');
  await expect(inStock).not.toBeChecked();
});

test('typing does not flood the history, and Back re-syncs the search box', async ({ page }) => {
  await page.goto('/?category=Books');
  await waitForCards(page);
  const before = await page.evaluate(() => history.length);

  const search = page.getByRole('searchbox', { name: 'Search products' });
  await search.click();
  await page.keyboard.type('running shoes', { delay: 40 });
  await expectSearch(page, '?q=running%20shoes&category=Books');
  await expectResults(page, '0 results for “running shoes”');
  expect(await page.evaluate(() => history.length)).toBe(before);

  // A discrete change pushes one entry; Back returns to the typed query and the box follows.
  await page.getByRole('button', { name: 'Remove filter: Books' }).click();
  await expectResults(page, '210 results for “running shoes”');
  expect(await page.evaluate(() => history.length)).toBe(before + 1);

  await page.goBack();
  await expectSearch(page, '?q=running%20shoes&category=Books');
  await expect(search).toHaveValue('running shoes');
});
