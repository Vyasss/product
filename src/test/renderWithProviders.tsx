import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from '../app/router';
import { AppProviders } from '../app/AppProviders';
import type { AppConfig } from '../config/env';
import type { Services } from '../hooks/useServices';
import { createTestServices } from './fixtures';

/** Both feature flags off: the core catalog must work without them. */
export const TEST_CONFIG: AppConfig = {
  apiBaseUrl: null,
  mockFailRate: 0,
  enableMockControls: false,
  smartSearch: false,
};

function LocationSpy({ onChange }: { onChange: (search: string) => void }) {
  const { search } = useLocation();
  useEffect(() => onChange(search), [search, onChange]);
  return null;
}

export interface RenderAppOptions {
  route?: string;
  services?: Services;
}

export interface RenderAppResult extends RenderResult {
  user: UserEvent;
  /** The router's current `location.search`. */
  currentSearch: () => string;
}

export function renderApp({ route = '/', services = createTestServices() }: RenderAppOptions = {}): RenderAppResult {
  let search = '';
  const onChange = (next: string) => {
    search = next;
  };
  const user = userEvent.setup();
  const result = render(
    <AppProviders config={TEST_CONFIG} services={services}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
        <LocationSpy onChange={onChange} />
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, user, currentSearch: () => search };
}
