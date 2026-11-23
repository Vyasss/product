import { memo, useId, type Ref } from 'react';
import { IconButton } from '../../components/ui/IconButton';
import { CloseIcon, SearchIcon } from '../../components/ui/icons';
import { MAX_QUERY_LENGTH } from '../../domain/filters';

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  inputRef: Ref<HTMLInputElement>;
}

/**
 * Controlled by local state so every keystroke paints immediately. Results update as you
 * type, so there is no submit button; Enter writes the query to the URL at once.
 */
export const SearchBox = memo(function SearchBox({ value, onChange, onSubmit, onClear, inputRef }: SearchBoxProps) {
  const id = useId();
  return (
    <form
      role="search"
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
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
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={MAX_QUERY_LENGTH}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          placeholder="e.g. smart tv"
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
      </div>
    </form>
  );
});
