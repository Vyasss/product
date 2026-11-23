import { screen, waitFor, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { createTestServices, FakeProductService } from '../../test/fixtures';
import { renderApp } from '../../test/renderWithProviders';

// The results heading styles its parts in separate spans; compare names ignoring whitespace
// differences that jsdom's accessible-name computation introduces at span boundaries.
const squash = (text: string) => text.replace(/\s+/g, '');
const resultsHeading = (name: string) =>
  screen.findByRole('heading', { level: 2, name: (accessibleName) => squash(accessibleName) === squash(name) });
const productTitles = () =>
  within(screen.getByRole('list', { name: 'Products' }))
    .getAllByRole('listitem')
    .map((item) => within(item).getByRole('heading', { level: 3 }).textContent);

describe('CatalogPage (core, add-on flags off)', () => {
  it('filters as you type and tick a category, updating the count and the URL', async () => {
    const { user, currentSearch } = renderApp();
    await resultsHeading('12 results');

    // Add-ons are absent when their flags are off.
    expect(screen.queryByRole('button', { name: /^Apply:/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Mock API controls' })).not.toBeInTheDocument();

    await user.type(screen.getByRole('combobox', { name: 'Search products' }), 'shoes');
    await resultsHeading('2 results for “shoes”');
    expect(productTitles()).toEqual(['Trail Running Shoes', 'Leather Formal Shoes']);
    await waitFor(() => expect(currentSearch()).toBe('?q=shoes'));

    await user.click(screen.getByRole('checkbox', { name: /^Sports/ }));
    await resultsHeading('1 result for “shoes”');
    expect(currentSearch()).toBe('?q=shoes&category=Sports');
    expect(productTitles()).toEqual(['Trail Running Shoes']);

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 product found'));
  });

  it('conversational and unknown words: results stay, with a visible and announced note', async () => {
    const { user, currentSearch } = renderApp();
    await resultsHeading('12 results');
    await user.type(screen.getByRole('combobox', { name: 'Search products' }), 'mujhe shoes xyzabc chahiye');
    await resultsHeading('2 results for “mujhe shoes xyzabc chahiye”');
    expect(screen.getByText('Showing results for “shoes” — ignored: “xyzabc”')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('2 products found. Showing results for “shoes” — ignored: “xyzabc”'),
    );
    // The URL and the box keep exactly what was typed.
    await waitFor(() => expect(currentSearch()).toBe('?q=mujhe%20shoes%20xyzabc%20chahiye'));
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue('mujhe shoes xyzabc chahiye');
  });

  it('restores the exact view from a shared URL', async () => {
    renderApp({ route: '/?q=shoes&category=Apparel,Sports&inStock=true&sort=price_desc' });
    await resultsHeading('2 results for “shoes”');

    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue('shoes');
    expect(screen.getByRole('checkbox', { name: /^Apparel/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Sports/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /^Books/ })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'In stock only' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('price_desc');
    expect(productTitles()).toEqual(['Leather Formal Shoes', 'Trail Running Shoes']);
  });

  it('rewrites a non-canonical URL once, keeping foreign params', async () => {
    const { currentSearch } = renderApp({ route: '/?sort=bogus&category=sports,Books,Toys&utm_source=mail' });
    await resultsHeading('5 results');
    await waitFor(() => expect(currentSearch()).toBe('?category=Books,Sports&utm_source=mail'));
  });

  it('shows an error with a focused Retry button, then recovers', async () => {
    const service = new FakeProductService(undefined, { failures: 1 });
    const { user } = renderApp({ services: createTestServices({ service }) });

    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('heading', { name: 'We couldn’t load the products' })).toBeInTheDocument();
    await waitFor(() => expect(retry).toHaveFocus());

    await user.click(retry);
    const heading = await resultsHeading('12 results');
    expect(service.calls).toBe(2);
    await waitFor(() => expect(heading).toHaveFocus());
  });

  it('shows the empty state; Clear all resets the URL and focuses the search box', async () => {
    const { user, currentSearch } = renderApp({ route: '/?q=zzzz&inStock=true&utm_source=mail' });
    const empty = await screen.findByRole('heading', { name: 'No products match “zzzz”' });

    const panel = empty.parentElement;
    if (!panel) throw new Error('empty state has no container');
    await user.click(within(panel).getByRole('button', { name: 'Clear all filters' }));

    await resultsHeading('12 results');
    expect(currentSearch()).toBe('?utm_source=mail');
    const search = screen.getByRole('combobox', { name: 'Search products' });
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
  });

  it('removes a single filter with its chip', async () => {
    const { user, currentSearch } = renderApp({ route: '/?q=shoes&minPrice=3000' });
    await resultsHeading('1 result for “shoes”');

    await user.click(screen.getByRole('button', { name: 'Remove filter: “shoes”' }));
    await resultsHeading('3 results');
    expect(currentSearch()).toBe('?minPrice=3000');
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue('');
  });

  it('commits price on Enter and explains an inverted range', async () => {
    const { user, currentSearch } = renderApp();
    await resultsHeading('12 results');

    await user.type(screen.getByRole('spinbutton', { name: 'Max price' }), '1000{Enter}');
    await resultsHeading('4 results');
    expect(currentSearch()).toBe('?maxPrice=1000');

    await user.type(screen.getByRole('spinbutton', { name: 'Min price' }), '5000{Enter}');
    await resultsHeading('12 results');
    expect(currentSearch()).toBe('?minPrice=5000&maxPrice=1000');
    expect(screen.getByRole('spinbutton', { name: 'Min price' })).toHaveAccessibleDescription(
      'Min is above max, so the price filter is not applied.',
    );
  });

  it('opens the filter drawer with focus inside, closes on Escape and returns focus', async () => {
    const { user } = renderApp();
    await resultsHeading('12 results');

    const trigger = screen.getByRole('button', { name: 'Filters' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    // The sticky footer action shows the live count and also closes the drawer.
    await user.click(trigger);
    const dialogAgain = screen.getByRole('dialog', { name: 'Filters' });
    await user.click(within(dialogAgain).getByRole('checkbox', { name: /^Books/ }));
    await user.click(await within(dialogAgain).findByRole('button', { name: 'Show 2 results' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await resultsHeading('2 results');
  });

  it('is operable with the keyboard alone (Tab, Space, Enter)', async () => {
    const { user, currentSearch } = renderApp();
    await resultsHeading('12 results');

    await user.tab();
    expect(screen.getByRole('link', { name: 'Skip to results' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveFocus();
    await user.keyboard('rug{Enter}');
    await waitFor(() => expect(currentSearch()).toBe('?q=rug'));

    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear search' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Cart, 0 items' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('checkbox', { name: /^Electronics/ })).toHaveFocus();
    await user.tab();
    await user.tab();
    expect(screen.getByRole('checkbox', { name: /^Home/ })).toHaveFocus();
    await user.keyboard(' ');
    await resultsHeading('1 result for “rug”');
    expect(currentSearch()).toBe('?q=rug&category=Home');
  });

  it('has no axe violations once loaded', async () => {
    renderApp({ route: '/?q=shoes&category=Apparel' });
    await resultsHeading('1 result for “shoes”');
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});

describe('CatalogPage add-ons (flags on)', () => {
  it('offers a smart-search suggestion and applies it only when activated', async () => {
    const { user, currentSearch } = renderApp({ services: createTestServices({ smartSearch: true }) });
    await resultsHeading('12 results');

    await user.type(screen.getByRole('combobox', { name: 'Search products' }), 'shoes under 3000 in stock');
    const apply = await screen.findByRole('button', { name: 'Apply: up to ₹3,000 · in stock · “shoes”' });
    // Nothing is applied automatically: no price or stock filter until the button is used.
    // (The core search's unknown-word fallback already shows shoes for the literal text.)
    await screen.findByText(/Showing results for “shoes in”/);
    expect(currentSearch()).not.toMatch(/maxPrice|inStock/);
    expect(screen.getByRole('checkbox', { name: 'In stock only' })).not.toBeChecked();

    await user.click(apply);
    await resultsHeading('1 result for “shoes”');
    expect(currentSearch()).toBe('?q=shoes&maxPrice=3000&inStock=true');
    expect(screen.getByRole('combobox', { name: 'Search products' })).toHaveValue('shoes');
  });

  it('shows mock controls that force a simulated 500, and Retry recovers', async () => {
    const { user } = renderApp({ services: createTestServices({ mockControls: true }) });
    await resultsHeading('12 results');

    expect(screen.getByRole('complementary', { name: 'Mock API controls' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reload with a simulated 500' }));
    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText(/status 500/)).toBeInTheDocument();

    await user.click(retry);
    await resultsHeading('12 results');
  });
});
