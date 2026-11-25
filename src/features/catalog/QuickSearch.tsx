import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_FILTERS } from '../../domain/filters';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useSearchEngine, whenIdle } from '../../hooks/useSearchEngine';
import { sanitizeQuery } from '../../url/parseFilters';
import { toSearchString } from '../../url/serializeFilters';
import { SearchBox } from './SearchBox';
import { useSearchSuggestions } from './useSearchSuggestions';

/**
 * Header search on pages other than the catalog: Enter, or picking a suggestion, opens the
 * catalog with that query. The engine is built in idle time, never on a keystroke if avoidable.
 */
export function QuickSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { products } = useCatalogData();
  const list = products.status === 'success' ? products.products : null;
  // The engine is wanted once the browser is idle after this page loads, or at the first
  // letter typed if that comes sooner. Once wanted it stays: clearing the box and typing
  // again must not rebuild it. It is shared with the catalog page (see useSearchEngine).
  const [wanted, setWanted] = useState(false);
  if (!wanted && text.trim() !== '') setWanted(true);
  useEffect(() => (wanted ? undefined : whenIdle(() => setWanted(true))), [wanted]);
  const engine = useSearchEngine(wanted ? list : null);
  const { suggestions, remember } = useSearchSuggestions(text, engine);

  const open = useCallback(
    (value: string) => {
      const q = sanitizeQuery(value);
      remember(q);
      void navigate({ pathname: '/', search: toSearchString({ ...DEFAULT_FILTERS, q }, new URLSearchParams()) });
    },
    [navigate, remember],
  );
  const submit = useCallback(() => open(text), [open, text]);

  const clear = useCallback(() => {
    setText('');
    inputRef.current?.focus();
  }, []);

  return (
    <SearchBox
      value={text}
      onChange={setText}
      onSubmit={submit}
      onClear={clear}
      inputRef={inputRef}
      suggestions={suggestions}
      onPick={open}
    />
  );
}
