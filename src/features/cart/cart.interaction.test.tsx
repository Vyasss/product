import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createCartStore, memoryCartStorage } from '../../cart/cartStore';
import { createTestServices } from '../../test/fixtures';
import { renderApp } from '../../test/renderWithProviders';

const cartLink = (count: number) =>
  screen.findByRole('link', { name: `Cart, ${count} ${count === 1 ? 'item' : 'items'}` });

function servicesWithCart(raw: string | null = null) {
  const storage = memoryCartStorage(raw);
  const cartStore = createCartStore(storage);
  return { storage, cartStore, services: createTestServices({ cartStore }) };
}

describe('cart and product page (add-ons)', () => {
  it('adds from a product card, updates the badge and announces it', async () => {
    const { user } = renderApp();
    await cartLink(0);
    await user.click(await screen.findByRole('button', { name: 'Add to cart: Trail Running Shoes' }));
    await cartLink(1);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Added Trail Running Shoes to cart'));
    await user.click(screen.getByRole('button', { name: 'Add to cart: Trail Running Shoes' }));
    await cartLink(2);
    expect(screen.getByText(/2 in cart/)).toBeInTheDocument();
  });

  it('cannot add an unavailable product from its card, and says why', async () => {
    renderApp();
    const button = await screen.findByRole('button', { name: 'Add to cart: Cotton T-Shirt' });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription('Currently unavailable');
  });

  it('product page: content, quantity stepper and Add to cart', async () => {
    const { user } = renderApp({ route: '/product/p-1' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Highlights' })).toBeInTheDocument();
    expect(screen.getByText(/Rated 4\.5 out of 5/)).toBeInTheDocument();

    const increase = screen.getByRole('button', { name: 'Increase quantity of Trail Running Shoes' });
    await user.click(increase);
    await user.click(increase);
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(3);
    await user.click(screen.getByRole('button', { name: 'Add to cart' }));
    await cartLink(3);
    expect(screen.getByText(/In your cart:/)).toHaveTextContent('In your cart: 3');
    expect(document.title).toBe('Trail Running Shoes | Bazora');
  });

  it('product page: unavailable product has both buttons disabled with the reason', async () => {
    renderApp({ route: '/product/p-3' });
    await screen.findByRole('heading', { level: 1, name: 'Cotton T-Shirt' });
    const reason = 'Currently unavailable, so it can’t be added to the cart or bought.';
    for (const name of ['Add to cart', 'Buy now']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(reason);
    }
  });

  it('product page: unknown id shows not found with a way back', async () => {
    renderApp({ route: '/product/p-404' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Product not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the catalog' })).toHaveAttribute('href', '/');
  });

  it('cart page: quantities update line and grand totals; remove and clear', async () => {
    const { services } = servicesWithCart('[{"id":"p-1","quantity":2},{"id":"p-8","quantity":1}]');
    const { user } = renderApp({ route: '/cart', services });
    await screen.findByRole('heading', { level: 1, name: 'Your cart (3 products)' });
    const summary = screen.getByRole('region', { name: 'Order summary' });
    expect(within(summary).getByText('₹5,397')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Increase quantity of Monsoon Letters: Novel' }));
    expect(within(summary).getByText('₹5,796')).toBeInTheDocument();
    expect(screen.getByText('₹798')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Trail Running Shoes' }));
    expect(within(summary).getByText('₹798')).toBeInTheDocument();
    await cartLink(2);

    await user.click(screen.getByRole('button', { name: 'Clear cart' }));
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.queryByText(/Checkout is not part/)).not.toBeInTheDocument();
  });

  it('drops corrupt, unknown and unavailable entries read from storage', async () => {
    const { services } = servicesWithCart('[{"id":"p-1","quantity":1},{"id":"ghost","quantity":3},{"id":"p-3","quantity":1},{"id":"p-4","quantity":"x"}]');
    renderApp({ route: '/cart', services });
    await screen.findByRole('heading', { level: 1, name: 'Your cart (1 product)' });
    expect(within(screen.getByRole('list', { name: 'Items in your cart' })).getAllByRole('listitem')).toHaveLength(1);
  });

  it('keeps the cart across a remount (reload) through storage', async () => {
    const storage = memoryCartStorage();
    const first = renderApp({ services: createTestServices({ cartStore: createCartStore(storage) }) });
    await first.user.click(await screen.findByRole('button', { name: 'Add to cart: Trail Running Shoes' }));
    await cartLink(1);
    first.unmount();

    renderApp({ services: createTestServices({ cartStore: createCartStore(storage) }) });
    await cartLink(1);
  });

  it('Buy now → checkout: validation errors, then a placed order clears the cart', async () => {
    const { user } = renderApp({ route: '/product/p-1' });
    await screen.findByRole('heading', { level: 1, name: 'Trail Running Shoes' });
    await user.click(screen.getByRole('button', { name: 'Buy now' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(/No payment is taken and nothing is shipped/);
    // One line (₹2,499) and the total (₹2,499).
    expect(within(screen.getByRole('region', { name: 'Order summary' })).getAllByText('₹2,499')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Place order' }));
    const name = screen.getByRole('textbox', { name: 'Full name' });
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription(/Enter your full name/);
    expect(screen.getByRole('textbox', { name: 'PIN code' })).toHaveAttribute('aria-invalid', 'true');

    await user.type(name, 'Asha Rao');
    await user.type(screen.getByRole('textbox', { name: 'Delivery address' }), '12 Lake View Road, Bengaluru');
    await user.type(screen.getByRole('textbox', { name: 'PIN code' }), '560034');
    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '9845012345');
    await user.click(screen.getByRole('button', { name: 'Place order' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Order placed' })).toBeInTheDocument();
    expect(screen.getByText(/^BZ-[A-Z2-9]{4}-[A-Z2-9]{4}$/)).toBeInTheDocument();
    await cartLink(0);
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  });

  it('checkout with an empty cart goes to the empty cart page', async () => {
    renderApp({ route: '/checkout' });
    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });
});
