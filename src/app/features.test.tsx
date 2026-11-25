import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createCartStore, memoryCartStorage } from '../cart/cartStore';
import { createTestServices } from '../test/fixtures';
import { renderApp } from '../test/renderWithProviders';

/** The shipped default: VITE_FEATURE_CART, VITE_FEATURE_SHARE and VITE_FEATURE_PRODUCT_PAGE unset. */
const defaultBuild = (cartStore = createCartStore(memoryCartStorage())) =>
  createTestServices({ cartStore, features: { cart: false, share: false, productPage: false } });

describe('the default build: a single catalog page', () => {
  it('cards show the product fields only: no links, cart buttons, share button or description', async () => {
    renderApp({ services: defaultBuild() });
    expect(await screen.findByRole('heading', { level: 3, name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trail Running Shoes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Add to cart|Buy now|Share)/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/reviews?\)/)).not.toBeInTheDocument();
    // The brief's controls are all there.
    expect(screen.getByRole('combobox', { name: 'Search products' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all filters' })).toBeInTheDocument();
  });

  it.each(['/product/p-1', '/cart', '/cart?items=p-1:2', '/checkout', '/checkout/confirmation'])(
    '%s is an unknown page',
    async (route) => {
      renderApp({ route, services: defaultBuild() });
      expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    },
  );

  it('a cart saved by an earlier build is not shown on the cards', async () => {
    const cartStore = createCartStore(memoryCartStorage(JSON.stringify([{ id: 'p-1', quantity: 2 }])));
    renderApp({ services: defaultBuild(cartStore) });
    expect(await screen.findByRole('heading', { level: 3, name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByText(/in cart/)).not.toBeInTheDocument();
  });

  it('a search that finds nothing offers the catalog brands, and one click searches a brand', async () => {
    const { user, currentSearch } = renderApp({ route: '/?q=samsung', services: defaultBuild() });
    expect(await screen.findByText('Brands in this catalog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Arena Pro' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Cricket Bat Pro' })).toBeInTheDocument();
    await waitFor(() => expect(currentSearch()).toBe('?q=Arena%20Pro'));
  });
});
