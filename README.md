# Product Catalog ("bazora" storefront)

A React + TypeScript single-page app that searches, filters and sorts 5,000 products in the
browser, presented as an invented storefront called **bazora**. Filter state lives in the URL,
every control works from the keyboard, and the build is a static bundle for S3 + CloudFront.
On top of the brief's catalog it has product pages, a cart, Buy now and a demo checkout.

![Desktop catalog at 1440 px: sticky header with search and cart, filter sidebar, results bar with chips, product grid](docs/screenshots/catalog-1440.png)

- [Quick start](#quick-start)
- [Brief requirements and add-ons](#brief-requirements-and-add-ons)
- [Features](#features)
- [UI and design system](#ui-and-design-system)
- [Architecture](#architecture)
- [Performance](#performance)
- [URL contract](#url-contract)
- [Accessibility](#accessibility)
- [Configuration](#configuration)
- [Deploying to S3 + CloudFront](#deploying-to-s3--cloudfront)
- [Tests](#tests)
- [Growth path](#growth-path)
- [What I would improve with more time](#what-i-would-improve-with-more-time)
- [What has and has not been verified](#what-has-and-has-not-been-verified)

## Quick start

Requires Node 22.22+ or 24+ (React Router 8 needs Node 22.22 or later; developed on Node
24.15.0, npm 11.12.1). The e2e, perf and screenshot scripts use the locally installed Google
Chrome; no browser is downloaded.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve `dist/` locally (http://localhost:4173) |
| `npm test` | All Vitest suites once (jsdom, React Testing Library) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc -b` over app, tooling and e2e configs (strict) |
| `npm run lint` | ESLint (typescript-eslint, react-hooks, jsx-a11y, import boundaries) |
| `npm run bench` | Node timings for generate / index / search / sort |
| `npm run e2e` | Playwright end-to-end suite in local Chrome (builds and serves on port 4190) |
| `npm run perf` | Throttled-Chrome measurements at 1x, 4x, 6x CPU (run `npm run build` first) |
| `npm run screenshots` | Regenerates `docs/screenshots/` (run `npm run build` first) |

To see the error state: open `/?mockFail=1` (the first load fails, Retry recovers), set
`VITE_MOCK_FAIL_RATE=0.3`, or enable the on-page mock controls (see [Configuration](#configuration)).

## Brief requirements and add-ons

### Required by the brief

The mandated stack is used as specified: React 18+ (19.3.1), TypeScript in strict mode
(6.0.3), Vite (8.3.8), `npm run build` to `dist/`, Vitest (5.1.1) + React Testing Library
(16.3.3), `VITE_*` build-time env vars, and S3 + CloudFront static hosting. Tailwind CSS
(4.3.5) is this project's choice for "any styling approach". The `Product` interface is exactly
the brief's eight fields, and the mock API returns exactly that shape.

| Requirement | How it is met | Main files | Tests |
|---|---|---|---|
| React 18+, TypeScript strict, Vite | React 19, `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride` | `tsconfig.app.json`, `vite.config.ts` | `npm run typecheck` |
| `npm run build` outputs `dist/` | Typecheck then `vite build`, `base: '/'` | `package.json`, `vite.config.ts` | `npm run build` |
| Deterministic 5,000-product dataset with the given interface | Seeded mulberry32 PRNG, no `Math.random` or dates, frozen objects; item types limited to ones that have an illustration; bell-shaped shop-style prices | `src/domain/product.ts`, `src/data/generateProducts.ts`, `src/data/itemTypes.ts` | `generateProducts.test.ts` (count, ids, categories, ratings, prices, determinism, recorded checksum, price spread, every item type illustrated) |
| Async service, 300–600 ms latency | `MockProductService` with injectable latency, honours `AbortSignal` | `src/data/MockProductService.ts` | `MockProductService.test.ts` |
| Simulated failed (500) response | `ApiError(500)` from a failure policy: `VITE_MOCK_FAIL_RATE`, `?mockFail=N`, `mockControls.failNext(n)` | `src/data/mockControls.ts` | `MockProductService.test.ts`, `CatalogPage.test.tsx`, e2e `states.spec.ts` |
| Instant search by title or brand that never blocks typing | Local input state paints every keystroke; results use `useDeferredValue`; pre-normalised haystacks; stop words, unknown-word and typo fallback (title and brand only, descriptions are not indexed) | `useSearchText.ts`, `src/search/*` | `InMemorySearchEngine.test.ts`, `conversational.test.ts`, `CatalogPage.test.tsx`, e2e `journey.spec.ts` |
| Multi-select category filter | Native checkboxes in a `fieldset`; categories combine with OR | `CategoryFilter.tsx` | engine tests, interaction tests, e2e journey |
| Min / max price | Labelled number inputs, committed on blur or Enter, inclusive, inverted range explained and not applied | `PriceRangeFilter.tsx` | engine tests, interaction tests, e2e journey |
| In-stock filter | Checkbox "In stock only" | `StockToggle.tsx` | engine tests, e2e history |
| Sort: price low-high, high-low, rating highest first | Native select; ties broken by dataset order (stable) | `SortSelect.tsx`, `InMemorySearchEngine.ts` | engine sort tests, e2e journey (prices ascending) |
| Total match count | Heading "N results for “q”" in the results bar; the live region says "N products found" | `ResultSummary.tsx` | interaction and e2e tests |
| "Clear all filters" | Resets query, filters and sort, keeps foreign URL params, focuses the search box | `CatalogPage.tsx`, `ResultSummary.tsx`, `EmptyState.tsx` | interaction tests, e2e journey |
| Filters, query and sort in the URL; reload or shared link restores the view | URL is the only filter store; total parser, canonical serializer | `src/url/*` | `filters-url.test.ts`, e2e `history.spec.ts` (reload, Back/Forward, no history flooding) |
| Loading skeletons | Shimmer skeletons with the exact grid/list card dimensions, `aria-busy` | `LoadingState.tsx` | dimensions shared with the card constants; reviewed visually in an earlier round, not re-captured this round |
| Helpful empty state | Only after a successful load with zero matches; illustration, tips, Clear all | `EmptyState.tsx` | interaction tests, e2e |
| Clean error state with Retry | Status message, Retry focused, `aria-disabled` while retrying, filters kept | `ErrorState.tsx`, `useProducts.ts` | interaction tests, e2e `states.spec.ts` |
| Keyboard navigable (Tab, Enter, Space) | Native controls only; skip links; drawer focus trap; focus moves to page headings on navigation | `src/components/ui`, features | interaction tests, e2e keyboard-only journey and checkout |
| Semantic HTML and label associations | Landmarks, `form role=search`, `fieldset`/`legend`, visible `label` for every field | `src/components/ui/*` | axe in jsdom and in real Chrome |
| aria-live announcement of result count | One app-wide polite region, about 500 ms after results settle; also cart changes and search corrections | `useAnnouncer.ts`, `AppProviders.tsx` | interaction tests, e2e |
| No lag typing or rendering large lists; justified strategy; no redundant re-renders | Row virtualisation, deferred search, memoised cards, cheap per-card cart subscription | `ProductGrid.tsx`, `ProductCard.tsx` | `npm run bench`, `npm run perf`, e2e DOM-count test |
| Client-side routing on S3 + CloudFront with fallback to `/index.html` | CloudFront Function rewrites extension-less paths (`/product/p-00042`, `/cart`, `/checkout`) | `infra/cloudfront/spa-rewrite.js`, `src/app/router.tsx` | e2e `cloudfront.spec.ts` (runs the function in a VM), e2e deep-link reloads |
| No hardcoded secrets; `VITE_*` config | One module reads `import.meta.env` and validates it | `src/config/env.ts`, `.env.example` | `env.test.ts` |
| Vitest + RTL tests: core filter/sort logic and a user flow | 362 tests in 16 files | `src/**/*.test.ts(x)` | `npm test` |
| README with setup, architecture, performance, CloudFront notes, improvements | This file | `README.md` | n/a |

### Add-ons beyond the brief

The core catalog (search, filters, sort, URL sync, states, accessibility) works with both
feature flags off; the core interaction tests run with both flags off.

| Add-on | Why it was added | How to turn it off or remove it |
|---|---|---|
| Product page `/product/:id` (lazy chunk) | Clicking a product should show it: large illustration, details, Add to cart, Buy now, "More from this brand" / "More in <category>" | `src/features/product/`; remove the route in `src/app/router.tsx` and the title link in `ProductCard.tsx`. |
| Cart (`CartStore`, localStorage, `/cart`) | Real add / change quantity / remove / clear, totals in INR, header badge, cross-tab sync | `src/cart/`, `src/features/cart/`, `useCart`; remove the route, `CartButton` and `CardActions`. |
| Buy now and demo checkout `/checkout` | Full shopping flow requested by the user. No payment step; delivery details are validated in the browser only and never stored or sent | `CheckoutPage.tsx`, `ConfirmationPage.tsx`, `checkoutForm.ts`; remove the routes and the Buy now buttons. |
| Generated descriptions, highlights, review counts | Requested for a fuller storefront. Mock content derived from the product, layered on top of the unchanged eight-field `Product` (see [Generated content](#generated-display-content)) | `src/data/productContent.ts` behind `ProductContentProvider`; swap for a provider that reads real API fields. |
| Conversational search: stop words, unknown-word and typo fallback | "ek smart tv chahie" and "runing shoez" should find products; the strict match always wins | `src/search/stopWords.ts`, `src/search/fuzzy.ts`, `InMemorySearchEngine.ts`. Empty the stop-word list / skip `relax()` to turn off. |
| Mixed-language aliases (joote, जूते, kitab, किताब, tv/television, earphones...) | Mixed-language shoppers type these terms | `src/search/aliases.ts`; empty `RAW_ALIASES`. |
| React Router | URL state with history, routes for product/cart/checkout and the 404 | `src/url/useFilterState.ts`, `src/app/*`. |
| TanStack Virtual | A few dozen cards in the DOM for any result count | `ProductGrid.tsx`. |
| Smart search (rule-based phrase interpreter) | Turns "shoes under 5000 in stock" into filters on click | Off by default (`VITE_FEATURE_SMART_SEARCH`); `src/smart-search/`, `SmartSearchSuggestion.tsx`. |
| Category facet counts, active filter chips | Quicker refinement and undo | Stop passing `facetCounts`; delete `<ActiveFilterChips>`. |
| On-page mock controls | Trigger the simulated 500 without editing the URL | Off by default (`VITE_ENABLE_MOCK_CONTROLS`). |
| `HttpProductService` | Seam for a real API (`VITE_API_BASE_URL`) | Unused unless the variable is set. |
| 29 bundled product illustrations | Every item type shows a picture of that kind of item | `src/assets/thumbnails/`, `src/data/thumbnails.ts`. |
| Playwright e2e suite (dev only) | Verifies in real Chrome what jsdom cannot: layout, scrolling, Back/Forward, focus rings, contrast via axe | `e2e/`, `playwright.config.ts`, `npm run e2e`. Not in CI (Chrome on CI runners not verified from here). |
| Perf and screenshot scripts (dev only) | Real throttled-Chrome numbers and reproducible docs screenshots | `scripts/perf.mjs`, `scripts/screenshots.mjs`. |
| vitest-axe, axe-core | Accessibility scans in jsdom and in real Chrome | Dev dependencies. |
| ESLint with import-boundary rules | Hook mistakes, a11y regressions, layer dependencies | `eslint.config.js`. |
| `infra/cloudfront/`, CI workflow, bench script | Deployment notes made concrete; checks on push; numbers for this file | Delete the files. |

## Features

### Catalog search

Search runs on title and brand only, as the brief specifies (descriptions are not indexed).
For a query the engine does, in order:

1. **Stop words.** Conversational filler in English and Hindi-English, Latin and Devanagari
   (a, the, please, show, ek, mujhe, chahiye/chahie/chaiye, dikhao, wala, एक, मुझे, चाहिए, ...)
   is removed. A query made only of stop words is kept as ordinary words, so "the" searches
   for "the" instead of silently returning 5,000 products.
2. **Strict match.** Every remaining word (or one of its aliases) must appear. If anything
   matches, that is the result and nothing else runs.
3. **Typo correction.** Each word that matches no product at all is replaced by the closest
   catalog word (titles, brands and alias keys, built once with the index):
   Damerau-Levenshtein distance 1 for 4–7 letters, 2 for 8 or more, none for shorter words;
   ties go to the word in more products, then alphabetical.
4. **Unknown words.** Words with no close match are dropped and the search runs again.

When steps 3–4 change the result, a note appears above the results and in the live region,
for example `Showing results for “running shoes” (corrected from “runing shoez”)` or
`Showing results for “smart tv” — ignored: “xyzabc”`. The URL and the search box keep exactly
what was typed; the relaxation is derived, and the result object carries the corrections so
the UI does not recompute them. If no word matches anything, the normal empty state shows.

![Search with a typo corrected and the note above the results](docs/screenshots/search-corrected.png)

### Product page, cart, Buy now, checkout

- **Product page** `/product/:id` (lazy-loaded): large illustration, brand, title, category,
  star rating with review count, price, stock, generated description and highlights, quantity
  stepper, Add to cart, Buy now, and two related strips computed from the dataset. Unknown ids
  show "Product not found" with a link back. The card's title is a real router link and its
  overlay makes the whole card clickable; the card actions sit above it.
- **Back to results** returns to the same filtered view (the URL) at the same scroll position
  (saved per history entry and restored once the virtual list has its height), with focus on
  the product link that was opened. The browser's own scroll restoration is switched off
  because it runs before the list exists.
- **Cart** (`CartStore` interface, localStorage implementation, memory implementation in
  tests): add, change quantity (1–10), remove, clear, line totals and grand total in INR,
  count badge in the header, cross-tab sync via the `storage` event. Only ids and quantities
  are stored; prices always come from the dataset. Corrupt JSON, bad quantities, unknown or
  unavailable ids read from storage are dropped, never a crash. Changes are announced
  ("Added Olive Running Shoes to cart"). Cart state is not in the URL.
- **Buy now** adds one (if not already in the cart) and opens `/checkout`.
- **Demo checkout**: order summary and a delivery form (name, address, PIN code, mobile) with
  native inputs, visible labels, inline validation, messages tied with `aria-describedby`,
  and focus on the first invalid field. A visible notice says this is a demo store: **no
  payment is taken, nothing is shipped, and the details are not sent anywhere or stored**.
  That is true in code: the values live only in component state and are cleared when the
  order is placed; the e2e test checks localStorage and sessionStorage afterwards. Placing the
  order clears the cart and shows a confirmation with a random reference. An empty cart on
  `/checkout` goes to the cart's empty state.
- **Unavailable products**: Add to cart and Buy now are disabled, with the reason in text
  ("Currently unavailable", linked with `aria-describedby`).
- **Phone list cards** carry Add to cart only (two buttons do not fit next to the price at
  390 px); Buy now is on the product page. Grid cards carry both.

![Product page at 1440 px](docs/screenshots/product-1440.png)

### Generated display content

Descriptions, highlights and review counts are **generated mock content**, not part of the
brief's data. `Product` stays exactly the eight fields and the mock API returns exactly that.
`src/data/productContent.ts` derives the content deterministically from a product: its id
seeds a private PRNG (separate from the dataset's stream, so the dataset and its checksum are
unaffected), and templates are chosen by item kind so the wording fits (no "comfortable fit"
on a speaker), with verb agreement for plural items ("running shoes are"). Review counts are
spread log-uniformly, loosely higher for mid-priced items, with a few at zero. A real API
would return these fields itself, and a different `ProductContentProvider` would pass them
through. The product page labels them as generated demo content.

### Dataset

- **Illustrations**: 29 SVGs (0.47–0.92 kB each). Every item type the generator can produce
  maps to an illustration of that kind of item (a TV shows a screen, a helmet a helmet). The
  mapping is a total `Record<ItemType, ...>`, so a missing one fails to compile, and a test
  checks every item type and that no illustration is unused. Item-type pools were narrowed to
  types worth drawing.
- **Prices**: drawn bell-shaped in log space (mean of three uniforms) and rounded shop-style
  (ending in 5 or 9 below ₹1,000, in 9 above, in 99 above ₹10,000). The earlier log-uniform
  draw piled products onto each category minimum (eight or more cards at ₹199 when sorting
  low to high). Now the most common price is shared by 22 products (the test allows at most
  25) and the 16 cheapest products have at most four at one price. This changed the dataset;
  the recorded checksum was updated deliberately.

## UI and design system

The UI follows shopping-site conventions (strong search bar, dense grid, filter sidebar,
results bar, chips) with its own identity: the store **bazora**, a shopping-bag mark, a deep
teal and mint palette, the system font stack. No third-party brand assets, fonts, icons or
images, and nothing is fetched from a CDN.

| Area | What it looks like |
|---|---|
| Header | Sticky dark bar: wordmark (bag mark only on phones), visible "Search products" label, search field with icon and Clear button, cart link with count badge. One compact row on phones (72 px). |
| Results bar | "N results for “q”", Filters button (below 1024 px), Sort select, relaxation note, chips and Clear all. Sticky under the header from 768 px up; on phones it scrolls away so the pinned area stays at 72 px. |
| Filter sidebar | Card with Category, Price and Availability sections and right-aligned facet counts; stays in view. Below 1024 px the same panel opens in a drawer with a sticky "Show N results" button. |
| Product card | Tinted illustration with category badge, brand, two-line title link, two-line description, star rating with review count, price with a raised ₹, stock line, Add to cart and Buy now. Restrained hover (shadow, title underline, small image zoom only without reduced motion). Fixed height: 26.5 rem in the grid, 14 rem in the phone list layout; all text clamps. |
| Pages | Product page, cart, checkout, confirmation and 404 share one layout with a header search that opens the catalog. |
| States | Shimmer skeletons matching both card layouts; empty and error states with an illustration and one action. |

![Phone layout at 390 px: compact header, list cards](docs/screenshots/catalog-390.png)

Screenshots in [`docs/screenshots/`](docs/screenshots) (headless Chrome against the production
build, regenerated with `npm run screenshots`): catalog at 1440, 768 and 390 px, typo
correction, empty, error, phone filter drawer, product page at 1440 and 390 px, cart, checkout
with validation errors, confirmation, 404, and `focus/` with the focus ring on the search field
and cart link (dark header), the Clear button inside the field, a checkbox, the sort select, a
ghost button, a primary button and a product card (light surfaces).

### Design tokens

Defined once in `src/index.css` (Tailwind v4 `@theme`). The default Tailwind palette is
switched off (`--color-*: initial`), so only token colours exist.

| Group | Tokens |
|---|---|
| Text | `ink` #17202b, `ink-muted` #4f5b67 |
| Surfaces and lines | `surface` #f2f4f3, `card` #ffffff, `tint` #e8f0ee, `line` #dde3e1, `line-strong` #7d8a92 |
| Brand | `brand` #0f6b62, `brand-strong` #0a524b, `brand-soft` #e1f1ed, `brand-ink` #0b5c54, `header` #10302d, `header-muted` #b7d4cf, `accent` #7fdcc1, `accent-strong` #5ccfae |
| Status | `success` #17763a, `danger` #b3261e, `danger-soft` #fdecea, `warn-soft` / `warn-ink`, `star` #b9770e, `star-empty` #cfd6d4 |
| Interaction | `focus` #1f5fd1 (ring on light surfaces; `accent` on the dark header and footer), `overlay`, `skeleton`, `skeleton-shine` |
| Shape, depth, type | `radius-control`, `radius-card`, `shadow-card`, `shadow-raised`, `shadow-header`, `font-sans`, `animate-shimmer` |

Contrast, computed from the hex values (and checked on rendered pages by axe in real Chrome,
which found no violations):

| Pair | Ratio |
|---|---:|
| `ink` on `card` / `surface` / `tint` | 16.43 / 14.88 / 14.19 |
| `ink-muted` on `card` / `surface` / `tint` | 6.94 / 6.28 / 5.99 |
| white on `brand` (primary button) / `brand-strong` (hover) | 6.36 / 9.05 |
| `ink` on `accent` (Buy now) / `accent-strong` (hover) | 10.10 / 8.60 |
| `brand-ink` on `card` / `surface` / `brand-soft` | 7.86 / 7.11 / 6.74 |
| white / `header-muted` on `header` | 14.16 / 8.99 |
| `success` on `card`; `danger` on `card` / `danger-soft` | 5.69; 6.54 / 5.72 |
| `warn-ink` on `warn-soft` (demo notice, mock panel) | 7.36 |
| Focus ring `focus` on `card` / `surface`; `accent` on `header` (non-text, 3:1 needed) | 5.81 / 5.26 / 8.71 |
| Input border, filled star on `card` (non-text) | 3.55, 3.68 |

### Primitives

`src/components/ui`: `Button` (primary, accent, secondary, ghost; `buttonClassName` for links),
`IconButton`, `Card`, `Badge`, `StarRating` (single SVG, fill to the decimal, review count,
"Rated 4.3 out of 5 from 1,284 reviews" for screen readers), `QuantityStepper`, `TextField`,
`TextAreaField`, `Checkbox`, `Select`, `Skeleton`, `Drawer`, `LiveRegion`, `VisuallyHidden`,
inline `icons`. `src/components/layout`: `SiteHeader`, `Wordmark`, `SiteFooter`.

## Architecture

```
src/
  domain/        Product, Category, FilterState, SortKey
  data/          PRNG, item types, generator, illustrations, ProductService (mock/HTTP),
                 mock controls, generated product content
  search/        normalize, aliases, stop words, fuzzy matching, index, SearchEngine
  smart-search/  QueryInterpreter + rule-based implementation (add-on)
  cart/          CartStore (framework-free), storage backends, cart summary (add-on)
  url/           parseFilters / serializeFilters (pure), useFilterState
  config/        env.ts: the only reader of import.meta.env
  hooks/         useServices, useCatalogData, useProducts, useCart, useCartQuantity, useAnnounce,
                 useScrollMemory, usePageMeta, useDebouncedCallback, useContainerWidth
  components/    ui/ primitives, layout/ header, wordmark, footer
  features/      catalog/, product/, cart/ (cart, checkout, confirmation), shell/, not-found/
  app/           App, AppProviders, ServicesProvider, router (lazy routes), ErrorBoundary
```

Dependency direction is `domain` ← `data`, `search`, `smart-search`, `cart`, `url` ← `hooks` ←
`features` ← `app`, enforced by `no-restricted-imports` in `eslint.config.js`. Framework-free
layers cannot import React; `components/ui` cannot import anything product-specific.

**Interfaces, injected.** The UI depends on `ProductService`, `SearchEngine`,
`QueryInterpreter`, `CartStore` and `ProductContentProvider`. `app/ServicesProvider.tsx` picks
implementations; tests pass fakes (memory cart, zero-latency service) through the same context.

**State.** The URL is the only store for filter state. The catalog is loaded once for the whole
app (`AppProviders`), so moving between pages never refetches and Back renders immediately.
Cart state lives in `CartStore` (read with `useSyncExternalStore`). Everything else is local:
search text, price drafts, the drawer flag, the checkout form.

**Data flow on a keystroke.** The input updates local text (urgent render); `useDeferredValue`
feeds the search in an interruptible render; after 250 ms idle `q` is written to the URL with
`replace`, so typing does not flood history. Discrete changes (checkboxes, sort, chips, clear)
use `push`.

## Performance

### Rendering strategy

- **Virtualised rows, window scrolling.** `useWindowVirtualizer` over rows; column count from
  the container width; fixed card heights, so offsets are computed. While scrolling the whole
  list, the e2e suite saw at most 32 cards in the DOM at 1440 px and 9 at 390 px.
- **Rows are contained.** Each row has `contain: strict` (with 6 px of padding so focus rings
  are not clipped). Rendering is batched into frames (`useFlushSync: false`). The row holding
  keyboard focus is kept mounted by a custom range extractor.
- **Cheap cards.** `React.memo` with stable frozen products; a per-card cart subscription that
  reads one number (`useCartQuantity`); the star rating is one small SVG.
- **Why not pagination or a Worker?** Filtering is sub-millisecond in Node and a few ms at 6x
  throttle; the measured cost is rendering, which neither would remove. The engine sits behind
  `SearchEngine`, so a Worker can replace it if the catalog grows a lot.

### Node bench

`npm run bench` (real modules through Vite; median / p95 ms). Machine: Intel Core i7-1355U,
12 logical cores, 32 GB RAM, Windows 11, Node v24.15.0. **These figures were taken while the
machine was under other load** (a dev server and desktop apps using 1.5+ cores); earlier
quiet runs were roughly a third faster.

| Case | Median | p95 | Matches |
|---|---:|---:|---:|
| `generateProducts(5,000)` | 2.863 | 5.458 | |
| `buildIndex(5,000)` (with vocabulary) | 4.596 | 8.216 | |
| no filters | 0.036 | 0.078 | 5,000 |
| `q="shoes"` | 0.322 | 0.448 | 317 |
| `q="running shoes"` | 0.337 | 0.467 | 210 |
| `q="joote"` (alias) | 1.356 | 1.413 | 396 |
| `q="ek smart tv chahie"` (stop words) | 0.341 | 0.376 | 131 |
| `q="smart tv xyzabc"` (unknown-word fallback) | 1.460 | 2.266 | 131 |
| `q="runing shoez"` (typo correction) | 2.675 | 3.694 | 210 |
| worst case: two long unknown words | 2.032 | 2.927 | 0 |
| sort by price, all 5,000 | 1.160 | 1.266 | 5,000 |
| the brief's example URL | 0.320 | 0.447 | 260 |
| typing "runing shoez", 12 searches (total) | 14.804 | 22.332 | |
| typing "running shoes", 13 searches (total) | 5.416 | 7.608 | |

The stop-word step costs nothing measurable. The fallback and fuzzy path only run when the
strict match is empty; then a search costs about 1.5–2.7 ms here instead of about 0.3 ms
(roughly 1.2 ms per keystroke while typing a misspelt query versus 0.4 ms).

### Throttled Chrome (`npm run perf`)

Headless Chrome 157, 390×844 phone viewport with touch emulation, CPU throttled via CDP.
Typing at about 8 keys/s (keydown to next painted frame) and scrolling with wheel steps at
about 3,000 px/s for 6 s. An idle baseline is recorded first; it showed no late frames, so
the browser itself was producing frames normally. Results in `docs/perf-results.json`. **This
run was also taken while the machine was under other load. It is throttled desktop Chrome,
not a phone: no real phone has been measured.**

| CPU | Typing: keystroke to frame (median / p95 / max) | Typing long tasks | Scroll: frame interval (median / p95) | Late frames (> 25 ms) | Scroll long tasks | Main thread during scroll |
|---|---|---:|---|---:|---:|---|
| 1x | 8.1 / 17.2 / 18.1 ms | 0 | 16.7 / 16.8 ms | 0 of 645 | 0 | mostly idle |
| 4x | 33.8 / 83.8 / 92.4 ms | 8 | 16.7 / 33.3 ms | 50 of 791 | 0 | 46% browser-native, 10% app JS |
| 6x | 72.6 / 245.7 / 253.4 ms | 24 (median 77 ms) | 16.7 / 66.7 ms (max 183) | 200 of 804 | 28 (median 58 ms) | 66% browser-native, 13% app JS |

Reading: smooth at 1x and acceptable at 4x. **At 6x, typing p95 is above a 200 ms
responsiveness target and a quarter of scroll frames are late.** The profile shows the time is
mostly the browser's own style, layout and paint work for newly mounted cards, not app
JavaScript. Run-to-run variance is large under load (an earlier 6x run on the same code had 91
late frames and typing p95 142 ms).

**What the earlier 466 ms scroll result was, and what changed.** Two things combined:

1. **The measurement.** It used a synthetic CDP scroll gesture and ran while the machine was
   overloaded (the dev server on port 5173 alone was using about 1.5–1.75 cores). The script
   now scrolls with human-rate wheel steps, records an idle baseline to expose environmental
   frame loss, profiles the main thread, measures 1x/4x/6x, and has hard timeouts.
2. **A real regression in the app.** To stop focus rings being clipped, I had replaced the
   rows' `contain: strict` with containment that excluded paint. A controlled A/B under the
   same load showed paint containment was the single biggest scroll win (19 versus about 75
   late frames per 100). Strict containment is back, with 6 px of row padding so the ring fits
   inside the row.

Earlier fixes from the first throttled measurement (75% of frames late at 6x):
- Virtualizer renders batched per frame instead of `flushSync` inside every scroll event.
- Per-card cart subscriptions reduced to one number, with no effects.
- Star rating drawn as a single small SVG.
- Scroll-position saves debounced.
- The per-card `:has()` focus selector replaced by a ring on the link overlay.
- No backdrop blur on the results bar.
- Overscan reduced from 3 rows to 2.

## URL contract

| Param | Example | Meaning | Default (omitted) |
|---|---|---|---|
| `q` | `q=running%20shoes` | Text query exactly as typed (trimmed, max 100 characters) | empty |
| `category` | `category=Apparel,Sports` | Comma-separated, canonical order | all |
| `minPrice` / `maxPrice` | `maxPrice=5000` | Inclusive bounds (INR) | none |
| `inStock` | `inStock=true` | Only in-stock products | all |
| `sort` | `sort=price_asc` | `price_asc`, `price_desc`, `rating_desc` | dataset order ("Featured") |

Parsing never throws; one view has one canonical URL (rewritten once with `replace` if not);
foreign params (`mockFail`, `utm_*`) are preserved. Stop-word removal, corrections and ignored
words are derived from `q`, never written back. Cart state is not in the URL. Other routes:
`/product/:id`, `/cart`, `/checkout`, `/checkout/confirmation` (shown once after an order).

## Accessibility

- Native controls with visible labels everywhere; `fieldset`/`legend` for filter groups;
  skip links on every page.
- One polite live region for results, loading, errors, cart changes and search corrections.
- Focus: Clear all → search box; chip removal → results heading; Retry focused on error and
  results heading after recovery; drawer traps focus, Esc closes, focus returns; after
  navigation focus moves to the page heading; Back to the catalog refocuses the opened
  product link; checkout submit focuses the first invalid field.
- Product list is `role="list"` with `aria-posinset`/`aria-setsize`; the focused row stays
  mounted while scrolling (tested in real Chrome).
- Ratings, prices and the cart badge have one plain screen-reader text each ("Rated 4.3 out
  of 5 from 1,284 reviews", "₹1,249", "Cart, 2 items"); decorative icons are `aria-hidden`;
  stock is stated in text.
- Focus ring 3 px, blue on light surfaces and mint on the dark header, never animated
  (components transition colour, background and border only); 44 px touch targets; motion only
  without `prefers-reduced-motion`.
- axe-core in real Chrome found no violations on: catalog, filtered catalog, phone list, empty,
  error, drawer, 404, product page (desktop and phone), unavailable product, empty cart, filled
  cart, checkout with errors and confirmation. It found and I fixed one issue on the way: the
  header cart link's name did not contain its visible text.

## Configuration

`VITE_*` variables are read at build time in `src/config/env.ts` (see `.env.example`) and are
public; there are no secrets. `VITE_API_BASE_URL` (real API), `VITE_MOCK_FAIL_RATE`,
`VITE_ENABLE_MOCK_CONTROLS`, `VITE_FEATURE_SMART_SEARCH`. `?mockFail=N` fails the first N loads.

## Deploying to S3 + CloudFront

Nothing has been deployed. The files in `infra/cloudfront/` have not been run against AWS.

1. `npm ci && npm run build` with any `VITE_*` variables set.
2. Private S3 bucket with Origin Access Control.
3. Attach `infra/cloudfront/spa-rewrite.js` as a viewer-request CloudFront Function: paths
   without a file extension go to `/index.html`. **The deep links `/product/p-00042`, `/cart`,
   `/checkout` and unknown paths are what exercise this fallback**; files such as
   `/assets/x.js` pass through, so a missing asset stays a real 404. The function is run in a
   VM by `e2e/cloudfront.spec.ts` against those sample paths.
4. Cache policy without query strings in the key; compression on.
5. `infra/cloudfront/deploy.sh`: hashed assets with a one-year immutable cache first, then
   `index.html` with `no-cache`, then invalidate `/index.html`; old assets kept.
6. Response headers policy with HSTS, nosniff, referrer policy, frame denial and a CSP tested
   in report-only mode first.

## Tests

`npm test`: **362 tests in 16 files** (Vitest, jsdom, React Testing Library, user-event):
generator (determinism, checksum, price spread, illustrations for every item type), mock
service, engine filters and sorts, conversational search (stop words, fallback, typo table
including brand typos, short-token and correct-query cases), URL codec, smart-search phrases,
env, generated content (determinism, length, category-appropriate wording, subject-verb
agreement for every item type), cart store (bounds, corrupt storage, unknown ids, cross-tab),
cart summary, checkout validation, related products, star rating, price formatting, grid
helpers (columns, layout, pinned focused row), catalog interactions (flags off), cart/product/
checkout interactions, and an axe scan.

`npm run e2e`: **45 tests in real Chrome** (about 1.2 minutes):
- **Journeys:** keyboard-only (search, category, price, sort, clear all) with the URL and count
  asserted at each step; conversational and typo search; reload and Back/Forward; no history
  flooding.
- **Error and pages:** `mockFail=1` → Retry → recovery; empty state; 404.
- **Phone layout:** drawer focus at 390 px; pinned area at most 120 px (measured 72 px).
- **Rendering limits:** no horizontal scroll at 390/768/1440 px; fewer than 80 cards in the DOM
  while scrolling the whole list; a focused card stays mounted while scrolling.
- **Shop flow:** open a product from a scrolled, filtered list, add to cart, Back to the same
  filters, scroll and focus; deep-link reloads of `/product/:id` and `/cart`; keyboard-only
  product → cart → checkout → confirmation (checking nothing was stored); unavailable product.
- **Accessibility and hosting:** focus-ring colour and width on light and dark surfaces; axe on
  every main page; the CloudFront rewrite.

## Growth path

- **More users:** static files on a CDN; search runs on each device, so users add no backend load.
- **Bigger catalog:** up to tens of thousands of products the design holds (move search into a
  Worker if traces show long tasks). Beyond that, implement `SearchEngine` and
  `ProductService` against a search backend that receives the same `FilterState`; the URL
  contract and UI stay. `ProductContentProvider` would read real descriptions and review data.
  `CartStore` could sync to a server for signed-in users behind the same interface.

## What I would improve with more time

- 6x throttled typing and scrolling: reuse card DOM by slot instead of remounting per product
  id, trim card DOM further, and measure on real mid-range Android hardware.
- Profile with source maps to name the remaining app-JS hot spots.
- Run the e2e suite in CI (Chrome is present on hosted runners but this was not verified).
- Per-product photos from a CDN with `srcset`; the 29 illustrations are shared by item type.
- Relevance ranking for "Featured" (title matches before brand matches).
- A real checkout would need an order API, payment provider, address validation and
  server-side pricing; none of that exists here.

## What has and has not been verified

Verified on this machine (Windows 11, Node 24.15.0, Chrome 157):

- `npm run typecheck`, `npm run lint` exit 0; `npm test` 362 passed in 16 files;
  `npm run e2e` 45 passed in real Chrome, including axe on every main page.
- Build: main JS 372.26 kB (119.90 kB gzip), CSS 33.08 kB (7.45 kB gzip); lazy chunks
  ProductPage 6.30 kB (2.52 kB gzip), CheckoutPage 5.48 kB (2.44 kB gzip), CartPage 4.52 kB
  (1.74 kB gzip), QuantityStepper 1.26 kB, ConfirmationPage 1.25 kB.
- Pinned area on 390×844 after scrolling: 72 px. Cards in the DOM while scrolling the whole
  list: at most 32 at 1440 px, 9 at 390 px.
- Throttled-Chrome and bench numbers above (both taken under other machine load).
- Screenshots in `docs/screenshots/` reviewed at 1440, 768 and 390 px, including focus rings.

Not verified:

- Safari and Firefox.
- A real phone (only throttled desktop Chrome).
- A screen reader (NVDA, VoiceOver, TalkBack): accessible names and live-region texts are
  tested, but not heard.
- The AWS deployment: CloudFront, S3, `deploy.sh` and the CI workflow have never run.
- `HttpProductService` against a live API.
