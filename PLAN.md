# Build plan: High-Density Product Catalog & Search

This plan is the single source of instructions for building the app. The client brief is the
authority on requirements; where this plan goes further, it says why.

## 1. Goal and non-goals

Build a React + TypeScript SPA that searches, filters and sorts 5,000 products smoothly on
desktop and low-powered phones, keeps its state in the URL, is accessible by keyboard and
screen reader, and ships as a static bundle for S3 + CloudFront.

Non-goals: no backend, no LLM call, no Redux, no data-fetching library, no SSR, no Web Worker
(the engine sits behind an interface so a Worker can be added later without touching the UI).

## 2. Stack

Use the latest stable version of each at install time.

| Concern | Choice |
|---|---|
| UI | React 18+ (latest stable), function components, hooks |
| Language | TypeScript, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` |
| Bundler | Vite, `base: '/'`, output `dist/` |
| Routing | React Router (library mode): `/` catalog, `*` not-found page |
| Virtualisation | `@tanstack/react-virtual` (`useWindowVirtualizer`) |
| Styling | Tailwind CSS (Vite plugin) |
| Tests | Vitest, React Testing Library, `@testing-library/user-event`, jsdom, `vitest-axe` |
| Lint | ESLint flat config with `typescript-eslint`, `react-hooks`, `jsx-a11y` |

npm scripts: `dev`, `build` (typecheck then `vite build`), `preview`, `test`, `test:watch`,
`typecheck`, `lint`, `bench`.

## 3. Folder structure

```
product-catalog/
  infra/cloudfront/
    spa-rewrite.js          CloudFront Function (viewer request)
    deploy.sh               two-pass S3 upload + index.html invalidation
  scripts/bench.mjs         timings for generate / index / filter / sort
  .github/workflows/ci.yml  typecheck, lint, test, build
  .env.example
  src/
    app/                    App.tsx, router.tsx, ErrorBoundary.tsx, ServicesProvider.tsx
    config/env.ts           the only file that reads import.meta.env
    domain/                 product.ts, filters.ts (types and constants only)
    data/                   prng.ts, generateProducts.ts, ProductService.ts,
                            MockProductService.ts, HttpProductService.ts,
                            createProductService.ts, mockControls.ts
    search/                 normalize.ts, aliases.ts, buildIndex.ts, SearchEngine.ts,
                            InMemorySearchEngine.ts, facetCounts.ts
    smart-search/           QueryInterpreter.ts, RuleBasedInterpreter.ts
    url/                    parseFilters.ts, serializeFilters.ts, useFilterState.ts
    hooks/                  useProducts.ts, useDebouncedCallback.ts,
                            useContainerWidth.ts, useAnnouncer.ts
    components/ui/          Button, Checkbox, TextField, Select, Skeleton,
                            VisuallyHidden, Drawer, LiveRegion
    features/catalog/       CatalogPage, SearchBox, SmartSearchSuggestion, FilterPanel,
                            CategoryFilter, PriceRangeFilter, StockToggle, SortSelect,
                            ResultSummary, ActiveFilterChips, ProductGrid, ProductCard,
                            LoadingState, EmptyState, ErrorState, MockControls
    features/not-found/     NotFoundPage
    assets/thumbnails/      a small set of local SVG thumbnails (one or two per category)
    test/                   setup.ts, fixtures.ts, renderWithProviders.tsx
```

Dependency direction (enforce by imports): `domain` ← `data`, `search`, `smart-search`, `url`
← `hooks` ← `features` ← `app`. `components/ui` knows nothing about products. `domain`,
`search`, `smart-search` and the pure parts of `url` and `data` must not import React.

## 4. Design principles applied

- **Single responsibility:** one module, one reason to change (generator, service, index,
  filter, URL codec, each UI control).
- **Open/closed + dependency inversion:** UI depends on three interfaces, not implementations:
  `ProductService` (where data comes from), `SearchEngine` (where filtering runs),
  `QueryInterpreter` (text to filters). Implementations are created in one place
  (`ServicesProvider`) and injected through React context, so tests pass fakes.
- **Interface segregation:** mock-only capabilities (`failNext`) live in `mockControls.ts`,
  not on `ProductService`.
- **Reuse:** `components/ui` primitives and `hooks` are generic; feature components compose
  them. No duplicated formatters: one `formatPrice`, one `normalize`.
- **Pure core, thin shell:** all rules are pure functions tested without React.

## 5. Domain

`Product` exactly as in the brief. `CATEGORIES` is a readonly tuple in a fixed order
(Electronics, Apparel, Home, Books, Sports); the union type is derived from it.

```ts
type SortKey = 'price_asc' | 'price_desc' | 'rating_desc';
interface FilterState {
  q: string;                 // trimmed, max 100 chars
  categories: readonly Category[];   // canonical order, no duplicates
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;          // true = only in stock; false = all
  sort: SortKey | null;      // null = dataset order
}
```

Price is INR, shown with `Intl.NumberFormat('en-IN')`.

## 6. Data layer

- `prng.ts`: seeded PRNG (mulberry32). No `Math.random`, no dates in generation.
- `generateProducts(seed, count)`: 5,000 products, ids `p-00001`…, realistic brand and title
  pools per category, price positive, rating 1.0–5.0 with one decimal, about 80% in stock,
  `thumbnailUrl` pointing to a bundled local thumbnail chosen by category.
- `ProductService { getProducts(signal?: AbortSignal): Promise<Product[]> }`.
- `MockProductService`: latency 300–600 ms (injectable for tests), honours `AbortSignal`
  (clears the timer, rejects with `AbortError`), throws an `ApiError` with status 500 when a
  failure is due.
- Failure mechanisms, all read only inside the mock layer:
  `VITE_MOCK_FAIL_RATE` (0–1), URL param `mockFail=<N>` (fail the first N calls of this page
  load, so Retry visibly recovers), and `mockControls.failNext(n)` used by the on-page
  `MockControls` button (shown when `VITE_ENABLE_MOCK_CONTROLS` is true).
- `HttpProductService`: fetches `${VITE_API_BASE_URL}/products`; selected by
  `createProductService` only when `VITE_API_BASE_URL` is set. Shows the seam for a real API.
- `useProducts`: discriminated union `{status:'loading'} | {status:'error', error} |
  {status:'success', products}` plus `retry()`. Aborts on unmount and before each retry;
  aborts are ignored, never shown as errors.

## 7. Search engine

- `normalize(text)`: lowercase, NFKD, remove Latin combining marks only (`̀-ͯ`),
  collapse whitespace, trim. Do not strip `\p{M}` globally: that would break Devanagari.
- `aliases.ts`: a small, extensible map from mixed-language terms to catalog terms, in Latin
  and Devanagari (for example joote/jute/जूते → shoes, kitab/किताब → book, kapde → clothing
  terms). A query token matches a product if the token or any of its aliases is a substring
  of the product's haystack.
- `buildIndex(products)`: one normalised haystack string per product (`title + ' ' + brand`),
  typed arrays for price, rating, stock and category code, and the original array.
- `SearchEngine { search(filters): SearchResult }` where `SearchResult` has `indices`
  (positions into the products array), `total`, and `facetCounts` per category.
- Rules: groups combine with AND; categories combine with OR, none selected means all; price
  bounds are inclusive and either may be null; if `minPrice > maxPrice` the price filter is
  not applied (the UI shows an inline error); every query token must match; ties in any sort
  break by dataset index so order is stable.
- Facet counts for categories are computed with every filter applied except category.

## 8. Smart search (feature flag `VITE_FEATURE_SMART_SEARCH`)

- `QueryInterpreter { interpret(text): Partial<FilterState> | null }`.
- `RuleBasedInterpreter`: extracts price phrases ("under 5000", "below 5k", "5000 se kam",
  "5000 ke andar", "above 2000", "between 1000 and 3000"), stock phrases ("in stock",
  "available"), category words through a synonym list including mixed-language terms, and
  sort words ("cheapest", "sasta", "top rated"). What remains becomes `q`.
- UI: when the flag is on and the interpreter extracts at least one structured filter,
  `SmartSearchSuggestion` shows a button under the search box, for example
  "Apply: Sports · up to ₹5,000 · in stock". Activating it pushes the resulting filters to
  the URL. Nothing is applied automatically.
- No network call. The interface is the place a model-backed interpreter would plug in later;
  its output would pass through the same `FilterState` validation.

## 9. URL state

- Params: `q`, `category` (comma-separated), `minPrice`, `maxPrice`, `inStock=true`,
  `sort`. Defaults are omitted. Fixed param order and canonical category order, so one view
  has one URL. Commas in `category` stay literal to match the brief's example.
- `parseFilters(URLSearchParams)` is total: unknown categories dropped, unknown sort → null,
  non-numeric or negative prices → null, `q` capped at 100 chars. It never throws.
- `serializeFilters(filters, currentParams)` rewrites only the params this app owns and
  preserves all others (`mockFail`, `utm_*`).
- `useFilterState()` returns `filters` and `update(patch, { history: 'push' | 'replace' })`.
  The URL is the only store for filter state.
- History rules: search text → `replace` after 250 ms idle; checkboxes, stock, sort, clear
  all, chip removal, smart-search apply → `push`; price → `push` on blur or Enter.
- Search box: local text state for instant paint. Results are computed from
  `useDeferredValue(localText)` combined with the URL filters, so results follow every
  keystroke while the URL write is debounced. When the URL `q` changes through navigation
  (Back/Forward), the box re-syncs from the URL.
- If the URL on load is not canonical, rewrite it once with `replace`.

## 10. UI

- Layout: header with search; filter sidebar on wide screens; `Drawer` on small screens
  (focus moves in on open, Esc closes, focus returns to the trigger); result summary always
  visible; "Skip to results" link first in tab order.
- Controls are native `input`, `select`, `button`. Categories in a `fieldset` with `legend`.
  Every field has a visible `label`. Category labels show facet counts.
- `ResultSummary`: heading with the count, "Clear all filters" button (moves focus to the
  search box), `ActiveFilterChips` with a remove button per active filter.
- `ProductGrid`: `useWindowVirtualizer` over rows; column count from `useContainerWidth`
  (ResizeObserver); fixed card height in rem converted to px; overscan of a few rows;
  `role="list"` with `role="listitem"` cards carrying `aria-posinset` and `aria-setsize`,
  row wrappers `role="presentation"`; custom `rangeExtractor` keeps the row containing the
  focused card mounted; scroll to top when filters change (not on first load).
- `ProductCard`: `React.memo`, receives a stable product object; fixed-ratio thumbnail box,
  `loading="lazy"`, `decoding="async"`, fallback tile on image error; title clamped to two
  lines; out-of-stock stated in text, not colour alone.
- States: skeleton cards while loading (`aria-busy`); `EmptyState` only after a successful
  load with zero matches, offering Clear all; `ErrorState` with a Retry button that receives
  focus and is disabled while a request is pending.
- `useAnnouncer`: one polite `aria-live` region, updated about 500 ms after results settle
  ("128 products found"); loading and error are announced through the same region.
- `ErrorBoundary` at the app root with a reload action.
- Respect `prefers-reduced-motion`; visible focus ring; touch targets at least 44 px.

## 11. Configuration

`config/env.ts` reads and validates: `VITE_API_BASE_URL`, `VITE_MOCK_FAIL_RATE`,
`VITE_ENABLE_MOCK_CONTROLS`, `VITE_FEATURE_SMART_SEARCH`. `.env.example` documents each.
No secrets exist; say so in the README.

## 12. CloudFront and S3

- `infra/cloudfront/spa-rewrite.js`: viewer-request function; if the URI has no file
  extension, rewrite to `/index.html`. Missing assets stay real 404s.
- `infra/cloudfront/deploy.sh`: upload `dist/assets` with
  `Cache-Control: public,max-age=31536000,immutable`, then everything else with `no-cache`,
  `index.html` last, then invalidate `/index.html`. Do not delete old assets in the same run.
- README notes: private bucket with Origin Access Control, query strings excluded from the
  cache key, compression on, security headers policy.
- These files are written, not executed. Nothing is deployed.

## 13. Tests

Unit (no React):
- Generator: 5,000 items, unique ids, only the five categories, rating in range with one
  decimal, positive price, same seed gives identical output, checksum of the dataset.
- Engine: table-driven cases for each filter alone and combined, category OR, inclusive
  price bounds, min above max, multi-word query, accents, mixed-language aliases, each sort
  order with tie-breaks, facet counts.
- URL: round trip `parse(serialize(x))` equals `x`; bad input table; canonical order;
  foreign params preserved; special characters (`&`, `+`, Devanagari).
- Interpreter: phrase table including mixed-language phrases.
- Mock service: resolves after latency, fails when told, abort rejects with `AbortError`.

Interaction (RTL + user-event, fake service with zero latency):
- Type a query and tick a category: count and URL update.
- Load from a URL with filters: controls and results reflect it.
- Service fails: error state, Retry, products appear.
- Zero matches: empty state, Clear all resets URL and focuses the search box.
- `vitest-axe` scan of the loaded page has no violations.

jsdom has no layout: give the virtualizer a fixed size in tests (stub element sizes in
`test/setup.ts`) so rows render.

## 14. Deliverable docs

`README.md` with: setup and scripts; architecture and performance notes (rendering strategy
and why not pagination or a Worker, state approach, re-render prevention, measured numbers
from `npm run bench` with the machine stated and a note that phone numbers still need a
throttled-Chrome run); URL contract; accessibility notes; CloudFront deployment notes;
growth path (users vs catalog size, the two seams); what to improve with more time.
State plainly anything not verified.

## 15. Build order

1. Scaffold: Vite React-TS, strict tsconfig, Tailwind, ESLint, Vitest setup, scripts.
2. `domain` + `data` with tests.
3. `search` with tests, then `scripts/bench.mjs`.
4. `url` with tests.
5. `smart-search` with tests.
6. `components/ui` and `hooks`.
7. `features/catalog`, `app`, not-found page.
8. Interaction tests and axe scan.
9. `infra/`, CI workflow, `.env.example`, README.
10. Verify: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run bench`
    all pass; start `npm run preview` and confirm the page responds.

## 16. Definition of done

- Every requirement in the client brief is implemented and listed in a traceability table in
  the README (requirement → file → test).
- All five commands in step 10 exit 0 with no skipped tests and no lint suppressions added to
  get there.
- No `any`, no `@ts-ignore`, no `eslint-disable` without a one-line reason.
- No git commits, no deployment, nothing written outside this folder.
