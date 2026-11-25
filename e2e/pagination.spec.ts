import { expect, test, type Page } from '@playwright/test';
import { expectSearch, resultsHeading, tabTo, waitForCards } from './helpers';

const pages = (page: Page) => page.getByRole('navigation', { name: 'Result pages' });

test('keyboard: Next page, then reload and Back keep the page in step with the URL', async ({ page }) => {
  await page.goto('/');
  await waitForCards(page);
  await expect(pages(page).getByText('Showing 1–60 of 5,000')).toBeAttached();
  await expect(pages(page).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');

  const next = pages(page).getByRole('button', { name: 'Next page' });
  await tabTo(page, next, 200);
  await page.keyboard.press('Enter');
  await expectSearch(page, '?page=2');
  await expect(pages(page).getByText('Showing 61–120 of 5,000')).toBeAttached();
  // The new page starts at the top, and so does the keyboard.
  await expect(resultsHeading(page)).toBeFocused();
  await expect(page.locator('[role="listitem"]').first()).toHaveAttribute('aria-posinset', '61');
  await expect(page.locator('[role="listitem"]').first()).toBeInViewport();

  await page.reload();
  await waitForCards(page);
  await expect(pages(page).getByText('Showing 61–120 of 5,000')).toBeAttached();

  await page.goBack();
  await expectSearch(page, '');
  await expect(pages(page).getByText('Showing 1–60 of 5,000')).toBeAttached();
});

test('a numbered page from a shared URL, and a filter change goes back to page 1', async ({ page }) => {
  await page.goto('/?q=shoes&page=3');
  await waitForCards(page);
  await expect(pages(page).getByText('Showing 121–180 of 317')).toBeAttached();
  await expect(pages(page).getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page');

  await page.getByRole('checkbox', { name: 'In stock only' }).click();
  await expectSearch(page, '?q=shoes&inStock=true');
  await expect(pages(page).getByText(/^Showing 1–60 of/)).toBeAttached();
});

test('phone at 320 px: compact controls that fit, and a tap moves on', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/?q=shoes');
  await waitForCards(page);
  const nav = pages(page);
  await nav.scrollIntoViewIfNeeded();
  await expect(nav.getByText('Page 1 of 6')).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Page 2' })).toBeHidden();
  const box = await nav.getByRole('list').boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 320).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);

  await nav.getByRole('button', { name: 'Next page' }).click();
  await expectSearch(page, '?q=shoes&page=2');
  await expect(nav.getByText('Page 2 of 6')).toBeAttached();
});
