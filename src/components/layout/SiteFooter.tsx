import { Wordmark } from './Wordmark';

/** Site footer: identity and an honest note about the demo data. No links that go nowhere. */
export function SiteFooter() {
  return (
    <footer data-surface="dark" className="mt-12 bg-header text-header-muted">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-4 py-8 text-sm md:flex-row md:items-center md:justify-between">
        <Wordmark compact />
        <p className="max-w-xl">
          A demonstration storefront. Products, prices and ratings are generated in your browser; nothing here is
          for sale. Prices are shown in Indian rupees.
        </p>
      </div>
    </footer>
  );
}
