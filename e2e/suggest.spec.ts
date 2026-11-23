import { expect, test } from '@playwright/test';
import { expectSearch, runAxe, waitForCards } from './helpers';

test('typing offers completions; the keyboard picks one; results and URL follow', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const search = page.getByRole('combobox', { name: 'Search products' });
  const list = page.getByRole('listbox', { name: 'Search suggestions' });

  await search.click();
  await expect(list).toBeHidden(); // nothing typed, no recent searches yet
  await search.pressSequentially('sma');
  await expect(list).toBeVisible();
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  const options = list.getByRole('option');
  await expect(options.first()).toHaveText(/smart/);

  // Typing alone selects nothing: the search is still exactly what was typed.
  await expectSearch(page, '?q=sma');
  expect(await runAxe(page)).toEqual([]);

  // Down highlights the first option and tells assistive tech which one it is.
  await page.keyboard.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  const firstId = await options.first().getAttribute('id');
  await expect(search).toHaveAttribute('aria-activedescendant', firstId ?? '');
  const chosen = (await options.first().innerText()).split('\n')[0] ?? '';

  await page.keyboard.press('Enter');
  await expect(search).toHaveValue(chosen);
  await expect(list).toBeHidden();
  await expect(search).toBeFocused();
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe(chosen);
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
});

test('Esc closes the list and keeps the text; Tab moves on without picking', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const search = page.getByRole('combobox', { name: 'Search products' });
  const list = page.getByRole('listbox', { name: 'Search suggestions' });

  await search.click();
  await search.pressSequentially('run');
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(search).toHaveValue('run');

  // Down reopens it; Tab then leaves the field with the typed text untouched.
  await page.keyboard.press('ArrowDown');
  await expect(list).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(list).toBeHidden();
  await expect(search).toHaveValue('run');
  await expect(page.getByRole('button', { name: 'Clear search' })).toBeFocused();
});

test('a clicked suggestion is searched and remembered as a recent search across a reload', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  const search = page.getByRole('combobox', { name: 'Search products' });
  const list = page.getByRole('listbox', { name: 'Search suggestions' });

  await search.click();
  await search.pressSequentially('yog');
  await list.getByRole('option', { name: /yoga mat/ }).first().click();
  await expect(search).toHaveValue(/yoga mat/);
  const picked = await search.inputValue();

  await page.reload();
  await waitForCards(page);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(search).toBeFocused();
  const recent = list.getByRole('option').first();
  await expect(recent).toContainText(picked);
  await expect(recent).toContainText('Recent');
});

test('the header search on a product page offers completions and opens the catalog', async ({ page }) => {
  await page.goto('/product/p-00002');
  const search = page.getByRole('combobox', { name: 'Search products' });
  await search.click();
  await search.pressSequentially('sho');
  const list = page.getByRole('listbox', { name: 'Search suggestions' });
  await expect(list).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/\?q=/);
  await waitForCards(page);
});

test('phone: the list fits the screen and a tap picks', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await waitForCards(page);
  const search = page.getByRole('combobox', { name: 'Search products' });
  await search.click();
  await search.pressSequentially('hea');
  const list = page.getByRole('listbox', { name: 'Search suggestions' });
  await expect(list).toBeVisible();
  const box = await list.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.x ?? -1) >= 0 && (box?.x ?? 0) + (box?.width ?? 999) <= 360).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
  await list.getByRole('option').first().click();
  await expect(list).toBeHidden();
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
});
