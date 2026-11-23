import type { ReactNode } from 'react';

export interface SiteHeaderProps {
  /** The wordmark: a heading on the catalog, a home link elsewhere. */
  brand: ReactNode;
  /** Middle slot, usually the search box. */
  children?: ReactNode;
  /** Right slot, e.g. the cart button. */
  actions?: ReactNode;
}

/**
 * The sticky dark top bar shared by every page. Its height is fixed per breakpoint
 * (`--header-h`) so the catalog's results bar can stick right underneath it.
 */
export function SiteHeader({ brand, children, actions }: SiteHeaderProps) {
  return (
    <header data-surface="dark" className="sticky top-0 z-30 h-(--header-h) bg-header shadow-header">
      <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-3 px-4 md:gap-10">
        <div className="shrink-0">{brand}</div>
        <div className="min-w-0 flex-1 md:max-w-3xl">{children}</div>
        {actions && <div className="ml-auto flex shrink-0 items-center">{actions}</div>}
      </div>
    </header>
  );
}
