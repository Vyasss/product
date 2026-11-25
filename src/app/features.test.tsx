import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createCartStore, memoryCartStorage } from '../cart/cartStore';
import { createTestServices } from '../test/fixtures';
import { renderApp } from '../test/renderWithProviders';

/** The shipped default: VITE_FEATURE_CART and VITE_FEATURE_SHARE both unset. */
const storefrontOff = (cartStore = createCartStore(memoryCartStorage())) =>
  createTestServices({ cartStore, features: { cart: false, share: false } });

describe('with the cart and share features off (the default build)', () => {
  it('catalog: no cart in the header, no buttons on the cards, no share button', async () => {
    renderApp({ services: storefrontOff() });
    expect(await screen.findByRole('link', { name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Add to cart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Buy now/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Share/ })).not.toBeInTheDocument();
    // The brief's controls are all still there.
    expect(screen.getByRole('combobox', { name: 'Search products' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument();
  });

  it('product page: details and related products, without purchase or share controls', async () => {
    renderApp({ route: '/product/p-1', services: storefrontOff() });
    expect(await screen.findByRole('heading', { level: 1, name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Highlights' })).toBeInTheDocument();
    expect(screen.getAllByText('In stock').length).toBeGreaterThan(0);
    expect(screen.queryByRole('spinbutton', { name: 'Quantity' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add to cart|Buy now|^Share/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument();
  });

  it.each(['/cart', '/cart?items=p-1:2', '/checkout', '/checkout/confirmation'])(
    '%s is an unknown page',
    async (route) => {
      renderApp({ route, services: storefrontOff() });
      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    },
  );

  it('a cart saved by an earlier build is not shown on the cards', async () => {
    const cartStore = createCartStore(memoryCartStorage(JSON.stringify([{ id: 'p-1', quantity: 2 }])));
    renderApp({ services: storefrontOff(cartStore) });
    expect(await screen.findByRole('link', { name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByText(/in cart/)).not.toBeInTheDocument();
  });
});
