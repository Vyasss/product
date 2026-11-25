import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { generateProducts } from '../../data/generateProducts';
import { createTestServices, FakeProductService } from '../../test/fixtures';
import { renderApp } from '../../test/renderWithProviders';

// 130 products: pages of 60, 60 and 10.
const services = () => createTestServices({ service: new FakeProductService(generateProducts(7, 130)) });
const pages = () => screen.getByRole('navigation', { name: 'Result pages' });
const firstPosition = () => screen.getAllByRole('listitem')[0]?.getAttribute('aria-posinset');

describe('result pages', () => {
  it('moves between pages, keeps the page in the URL, and positions stay global', async () => {
    const { user, currentSearch } = renderApp({ services: services() });
    expect(await screen.findByText('Showing 1–60 of 130')).toBeInTheDocument();
    expect(within(pages()).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(within(pages()).getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(firstPosition()).toBe('1');

    await user.click(within(pages()).getByRole('button', { name: 'Next page' }));
    expect(await screen.findByText('Showing 61–120 of 130')).toBeInTheDocument();
    await waitFor(() => expect(currentSearch()).toBe('?page=2'));
    expect(firstPosition()).toBe('61');
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '130');
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Page 2 of 3'));

    await user.click(within(pages()).getByRole('button', { name: 'Page 3' }));
    expect(await screen.findByText('Showing 121–130 of 130')).toBeInTheDocument();
    expect(within(pages()).getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('opens the page from a shared URL', async () => {
    renderApp({ route: '/?page=2', services: services() });
    expect(await screen.findByText('Showing 61–120 of 130')).toBeInTheDocument();
  });

  it('a page past the end shows the last page', async () => {
    renderApp({ route: '/?page=9', services: services() });
    expect(await screen.findByText('Showing 121–130 of 130')).toBeInTheDocument();
  });

  it('changing a filter goes back to page 1', async () => {
    const { user, currentSearch } = renderApp({ route: '/?page=2', services: services() });
    await screen.findByText('Showing 61–120 of 130');
    await user.click(screen.getByRole('checkbox', { name: 'In stock only' }));
    await waitFor(() => expect(currentSearch()).toBe('?inStock=true'));
    expect(await screen.findByText(/^Showing 1–60 of/)).toBeInTheDocument();
  });

  it('is not shown when everything fits on one page', async () => {
    renderApp();
    await screen.findByRole('link', { name: 'Trail Running Shoes' });
    expect(screen.queryByRole('navigation', { name: 'Result pages' })).not.toBeInTheDocument();
  });
});
