import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createCartStore, memoryCartStorage } from '../cart/cartStore';
import { createTestServices } from '../test/fixtures';
import { renderApp } from '../test/renderWithProviders';

/** The shipped default: product page, cart page and share off; buy buttons on. */
const defaultBuild = (cartStore = createCartStore(memoryCartStorage())) =>
  createTestServices({ cartStore, features: { cart: false, share: false, productPage: false, buyButtons: true } });

describe('the default build: a single catalog page', () => {
  it('cards show the product fields and the buy buttons: no links, cart link, share button or description', async () => {
    renderApp({ services: defaultBuild() });
    expect(await screen.findByRole('heading', { level: 3, name: 'Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Trail Running Shoes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Cart/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to cart: Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy now: Trail Running Shoes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Share/ })).not.toBeInTheDocument();
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

  it('Add to cart and Buy now add and say so, without leaving the page (there is no checkout)', async () => {
    const { user, currentSearch } = renderApp({ services: defaultBuild() });
    await user.click(await screen.findByRole('button', { name: 'Add to cart: Trail Running Shoes' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Added Trail Running Shoes to cart'));
    expect(screen.getByText(/1 in cart/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buy now: Leather Formal Shoes' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Added Leather Formal Shoes to cart. Checkout is not part of this demo.'),
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Leather Formal Shoes' })).toBeInTheDocument();
    expect(currentSearch()).toBe('');
  });

  it('a search that finds nothing offers the catalog brands, and one click searches a brand', async () => {
    const { user, currentSearch } = renderApp({ route: '/?q=samsung', services: defaultBuild() });
    expect(await screen.findByText('Brands in this catalog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Arena Pro' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Cricket Bat Pro' })).toBeInTheDocument();
    await waitFor(() => expect(currentSearch()).toBe('?q=Arena%20Pro'));
  });
});
