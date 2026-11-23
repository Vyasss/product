export interface WordmarkProps {
  /** Never show the tagline. */
  compact?: boolean;
  /** Show only the bag mark below 768 px (compact phone header). */
  markOnlyOnPhones?: boolean;
}

/**
 * The invented store identity: a shopping-bag mark and the "AllinONE" wordmark, drawn for
 * dark backgrounds. Purely visual; the surrounding heading or link provides the name.
 */
export function Wordmark({ compact = false, markOnlyOnPhones = false }: WordmarkProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="10" className="fill-accent" />
        <path
          d="M12 15h16l-1.4 15.2a2 2 0 0 1-2 1.8H15.4a2 2 0 0 1-2-1.8L12 15z"
          className="fill-header"
        />
        <path d="M16 17v-3a4 4 0 0 1 8 0v3" fill="none" strokeWidth="2.4" strokeLinecap="round" className="stroke-header" />
        <circle cx="20" cy="23.5" r="2.2" className="fill-accent" />
      </svg>
      <span className={`${markOnlyOnPhones ? 'hidden md:flex' : 'flex'} flex-col leading-none`}>
        <span className="font-display text-2xl font-bold tracking-tight text-white">
          Allin<span className="text-accent">ONE</span>
        </span>
        {!compact && (
          <span className="mt-1 hidden text-[0.6875rem] font-medium tracking-[0.14em] text-header-muted uppercase md:block">
            everything in one place
          </span>
        )}
      </span>
    </span>
  );
}
