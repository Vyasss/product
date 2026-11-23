import { expect, test } from '@playwright/test';

const BOOK = { id: 'p-00002', title: 'Coding for Everyone: Textbook' };

test('cart: decreasing below one removes the item, with the keyboard, and says so', async ({ page }) => {
  await page.goto(`/product/${BOOK.id}`);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.goto('/cart');

  const increase = page.getByRole('button', { name: `Increase quantity of ${BOOK.title}` });
  const decrease = page.getByRole('button', { name: `Decrease quantity of ${BOOK.title}` });
  const quantity = page.getByRole('spinbutton', { name: 'Quantity' });

  // At one, the button is enabled and its name says it will remove the item.
  await expect(quantity).toHaveValue('1');
  await expect(decrease).toBeEnabled();
  await expect(decrease).toHaveAccessibleName(`Decrease quantity of ${BOOK.title}: removes it from the cart`);

  // Above one it is an ordinary decrease.
  await increase.click();
  await expect(quantity).toHaveValue('2');
  await expect(decrease).toHaveAccessibleName(`Decrease quantity of ${BOOK.title}`);
  await decrease.click();
  await expect(quantity).toHaveValue('1');

  // One more press, from the keyboard, empties the cart.
  await decrease.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Your cart is empty' })).toBeVisible();
  await expect(page.getByRole('status').first()).toHaveText(`Removed ${BOOK.title} from cart`);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
});
