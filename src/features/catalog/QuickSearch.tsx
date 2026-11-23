import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_FILTERS } from '../../domain/filters';
import { useCatalogData } from '../../hooks/useCatalogData';
import { useServices } from '../../hooks/useServices';
import { sanitizeQuery } from '../../url/parseFilters';
import { toSearchString } from '../../url/serializeFilters';
import { SearchBox } from './SearchBox';
import { useSearchSuggestions } from './useSearchSuggestions';

/**
 * Header search on pages other than the catalog: Enter, or picking a suggestion, opens the
 * catalog with that query. The engine is only built once someone starts typing here.
 */
export function QuickSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { products } = useCatalogData();
  const { createSearchEngine } = useServices();
  const list = products.status === 'success' ? products.products : null;
  const typing = text.trim() !== '';
  const engine = useMemo(() => (typing && list ? createSearchEngine(list) : null), [typing, list, createSearchEngine]);
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
