import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS } from '../../domain/filters';
import { parseFilters } from '../../url/parseFilters';
import { serializeFilters } from '../../url/serializeFilters';
import { renderApp } from '../../test/renderWithProviders';

const squash = (text: string) => text.replace(/\s+/g, '');
const resultsHeading = (name: string) =>
  screen.findByRole('heading', { level: 2, name: (accessibleName) => squash(accessibleName) === squash(name) });
const typeGroup = () => screen.getByRole('group', { name: 'Product type' });
const titles = () =>
  within(screen.getByRole('list', { name: 'Products' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('heading', { level: 3 }).textContent);

describe('type in the URL', () => {
  const parse = (query: string) => parseFilters(new URLSearchParams(query));

  it('parses known types in canonical order, ignoring case, duplicates and unknown names', () => {
    expect(parse('type=smart%20tv,Toaster,LED%20Monitor,Smart%20TV').types).toEqual(['Smart TV', 'LED Monitor']);
    expect(parse('type=').types).toEqual([]);
  });

  it('is written after category with literal commas, and round-trips', () => {
    const filters = { ...DEFAULT_FILTERS, q: 'electronics', types: ['Smart TV', 'LED Monitor'] as const };
    const query = serializeFilters(filters, new URLSearchParams(), 2);
    expect(query).toBe('q=electronics&type=Smart%20TV,LED%20Monitor&page=2');
    expect(parse(query)).toEqual(filters);
  });
});

describe('product type filter', () => {
  it('asks for a category or a search first, then lists the types of the results with counts', async () => {
    const { user } = renderApp();
    await resultsHeading('12 results');
    expect(within(typeGroup()).getByText('Choose a category or search to filter by product type.')).toBeInTheDocument();
    expect(within(typeGroup()).queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /^Sports/ }));
    await resultsHeading('3 results');
    expect(within(typeGroup()).getAllByRole('checkbox').map((box) => box.getAttribute('aria-label') ?? box.closest('label')?.textContent)).toEqual([
      'Running Shoes1 products',
      'Yoga Mat1 products',
      'Cricket Bat1 products',
    ]);
  });

  it('ticking a type filters the results, writes the URL and shows a chip that removes it', async () => {
    const { user, currentSearch } = renderApp({ route: '/?category=Sports' });
    await resultsHeading('3 results');

    await user.click(within(typeGroup()).getByRole('checkbox', { name: /^Yoga Mat/ }));
    await resultsHeading('1 result');
    expect(titles()).toEqual(['Yoga Mat Lightweight']);
    expect(currentSearch()).toBe('?category=Sports&type=Yoga%20Mat');
    // The other types stay listed, so a second one can be added.
    expect(within(typeGroup()).getByRole('checkbox', { name: /^Cricket Bat/ })).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Remove filter: Yoga Mat' }));
    await resultsHeading('3 results');
    expect(currentSearch()).toBe('?category=Sports');
  });

  it('searching a category name shows that category, with its types to narrow by', async () => {
    const { user, currentSearch } = renderApp();
    await resultsHeading('12 results');
    await user.type(screen.getByRole('combobox', { name: 'Search products' }), 'elect');
    await resultsHeading('2 results for “elect”');
    expect(titles()).toEqual(['Wireless Earbuds Pro', 'Smart Watch Neo']);

    await user.click(within(typeGroup()).getByRole('checkbox', { name: /^Smart Watch/ }));
    await resultsHeading('1 result for “elect”');
    await waitFor(() => expect(currentSearch()).toBe('?q=elect&type=Smart%20Watch'));
  });

  it('unticking a category drops the types that belonged only to it', async () => {
    const { user, currentSearch } = renderApp({ route: '/?category=Electronics,Sports&type=Smart%20Watch,Yoga%20Mat' });
    await resultsHeading('2 results');
    await user.click(screen.getByRole('checkbox', { name: /^Electronics/ }));
    await resultsHeading('1 result');
    expect(currentSearch()).toBe('?category=Sports&type=Yoga%20Mat');
  });

  it('restores types from a shared URL, and Clear all removes them', async () => {
    const { user, currentSearch } = renderApp({ route: '/?q=shoes&type=Running%20Shoes' });
    await resultsHeading('1 result for “shoes”');
    expect(within(typeGroup()).getByRole('checkbox', { name: /^Running Shoes/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));
    await resultsHeading('12 results');
    expect(currentSearch()).toBe('');
  });
});
