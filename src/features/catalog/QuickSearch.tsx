import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DEFAULT_FILTERS } from '../../domain/filters';
import { sanitizeQuery } from '../../url/parseFilters';
import { toSearchString } from '../../url/serializeFilters';
import { SearchBox } from './SearchBox';

/** Header search on pages other than the catalog: Enter opens the catalog with that query. */
export function QuickSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useCallback(() => {
    const q = sanitizeQuery(text);
    void navigate({ pathname: '/', search: toSearchString({ ...DEFAULT_FILTERS, q }, new URLSearchParams()) });
  }, [navigate, text]);

  const clear = useCallback(() => {
    setText('');
    inputRef.current?.focus();
  }, []);

  return <SearchBox value={text} onChange={setText} onSubmit={submit} onClear={clear} inputRef={inputRef} />;
}
