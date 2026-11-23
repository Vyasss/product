import { expect, type Locator, type Page } from '@playwright/test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

/** The results heading (h2 in the results bar). */
export const resultsHeading = (page: Page): Locator => page.getByRole('heading', { level: 2 }).first();

export async function expectResults(page: Page, text: string): Promise<void> {
  await expect(resultsHeading(page)).toHaveText(text);
}

/** Current `location.search` (with the leading "?"), or '' when there is none. */
export const currentSearch = (page: Page): string => new URL(page.url()).search;

export async function expectSearch(page: Page, search: string): Promise<void> {
  await expect.poll(() => currentSearch(page)).toBe(search);
}

/** Wait until the catalog has loaded and product cards are on screen. */
export async function waitForCards(page: Page): Promise<void> {
  await expect(page.locator('[role="listitem"]').first()).toBeVisible();
}

/**
 * Press Tab until `target` has focus, proving it is reachable by keyboard. Fails if it is not
 * reached within `maxPresses`.
 */
export async function tabTo(page: Page, target: Locator, maxPresses = 40): Promise<number> {
  for (let presses = 1; presses <= maxPresses; presses++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return presses;
  }
  throw new Error(`Element not reached with ${maxPresses} Tab presses`);
}

export interface AxeViolationSummary {
  id: string;
  impact: string | null | undefined;
  help: string;
  targets: string[];
}

interface AxeResultsLike {
  violations: {
    id: string;
    impact?: string | null;
    help: string;
    nodes: { target: unknown[] }[];
  }[];
}

/** Run axe-core (WCAG 2.1 A/AA plus best practices) against the rendered page. */
export async function runAxe(page: Page): Promise<AxeViolationSummary[]> {
  await page.addScriptTag({ path: AXE_PATH });
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (context: Document, options: object) => Promise<unknown> } })
      .axe;
    return (await axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
    })) as AxeResultsLike;
  });
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

/** True when the page is wider than the viewport (horizontal scrolling). */
export const hasHorizontalScroll = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/** Resolve after two animation frames, so React has committed and the browser has painted. */
export const nextFrames = (page: Page): Promise<void> =>
  page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
