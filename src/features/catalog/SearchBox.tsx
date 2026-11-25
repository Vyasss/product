import { memo, useId, useState, type KeyboardEvent, type Ref } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { ClockIcon, CloseIcon, SearchIcon } from '../../components/ui/icons';
import { MAX_QUERY_LENGTH } from '../../domain/filters';
import type { SearchSuggestion } from './useSearchSuggestions';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  inputRef: Ref<HTMLInputElement>;
  /** Completions and recent searches for the current text. Omit for a plain search field. */
  suggestions?: readonly SearchSuggestion[];
  /** A suggestion was chosen (click, or Enter on the highlighted one). */
  onPick?: (text: string) => void;
}

const NO_SUGGESTIONS: readonly SearchSuggestion[] = [];
const KIND_LABEL: Record<SearchSuggestion['kind'], string | null> = {
  recent: 'Recent',
  brand: 'Brand',
  product: null,
};

/**
 * Controlled by local state so every keystroke paints immediately. Results update as you
 * type, so there is no submit button; Enter writes the query to the URL at once.
 *
 * With suggestions it is a combobox (WAI-ARIA list autocomplete, manual selection): focus
 * stays in the input, Down/Up move a highlight through the list, Enter picks the highlighted
 * item, Esc closes the list, and Tab moves on as usual. Typing never selects anything by
 * itself, so the instant search is unchanged.
 */
export const SearchBox = memo(function SearchBox({
  value,
  onChange,
  onSubmit,
  onClear,
  inputRef,
  suggestions = NO_SUGGESTIONS,
  onPick,
}: SearchBoxProps) {
  const id = useId();
  const listId = `${id}-suggestions`;
  const [focused, setFocused] = useState(false);
  // Opened by the user (a click or tap in the field, typing, or Down), never by focus alone:
  // focus that the app moves here (e.g. after Clear search) must not pop the list open.
  const [engaged, setEngaged] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  // The text for which the list was closed (Esc, or a pick); typing anything else reopens it.
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const count = suggestions.length;
  const open = focused && engaged && count > 0 && dismissedFor !== value;
  const active = open && highlighted < count ? highlighted : -1;

  const pick = (text: string) => {
    onPick?.(text);
    setDismissedFor(text);
    setHighlighted(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (count === 0) return;
      event.preventDefault();
      setEngaged(true);
      setDismissedFor(null);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      // Nothing highlighted yet: Down starts at the first item, Up at the last. Otherwise wrap.
      if (!open || active === -1) setHighlighted(step === 1 ? 0 : count - 1);
      else setHighlighted((active + step + count) % count);
    } else if (event.key === 'Enter') {
      const choice = suggestions[active];
      if (choice) {
        event.preventDefault();
        pick(choice.text);
      }
    } else if (event.key === 'Escape' && open) {
      // Close the list and keep the text (a search field would otherwise clear on Esc).
      event.preventDefault();
      setDismissedFor(value);
      setHighlighted(-1);
    }
  };

  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        setDismissedFor(value);
        onSubmit();
      }}
    >
      <label htmlFor={id} className="mb-1 block text-xs font-semibold tracking-wide text-header-muted">
        Search products
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-muted" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          value={value}
          onChange={(event) => {
            setHighlighted(-1);
            setEngaged(true);
            onChange(event.target.value);
          }}
          onPointerDown={() => setEngaged(true)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setEngaged(false);
            setHighlighted(-1);
          }}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="Product or brand, e.g. smart tv or Voltix"
          className="block h-11 w-full rounded-control md:h-12 border-2 border-transparent bg-card pr-12 pl-11 text-base text-ink shadow-card placeholder:text-ink-muted focus:border-accent"
        />
        {value !== '' && (
          <IconButton
            label="Clear search"
            icon={<CloseIcon />}
            onClick={onClear}
            className="absolute top-1/2 right-0.5 -translate-y-1/2 focus-visible:outline-focus"
          />
        )}
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          hidden={!open}
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-80 overflow-y-auto rounded-card border border-line bg-card py-1 text-ink shadow-raised"
        >
          {open &&
            suggestions.map((suggestion, index) => {
              const label = KIND_LABEL[suggestion.kind];
              return (
                <div
                  key={`${suggestion.kind}:${suggestion.text}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  tabIndex={-1}
                  // Focus stays in the input: stop the press from blurring it, then pick on release.
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerUp={() => pick(suggestion.text)}
                  onPointerEnter={() => setHighlighted(index)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 px-4 text-sm ${
                    index === active ? 'bg-brand-soft' : ''
                  }`}
                >
                  {suggestion.kind === 'recent' ? (
                    <ClockIcon className="size-4 shrink-0 text-ink-muted" />
                  ) : (
                    <SearchIcon className="size-4 shrink-0 text-ink-muted" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{suggestion.text}</span>
                  {label && <span className="shrink-0 text-xs text-ink-muted">{label}</span>}
                </div>
              );
            })}
        </div>
      </div>
    </form>
  );
});
