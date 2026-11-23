import { BrowserRouter } from 'react-router';
import { appConfig } from '../config/env';
import { ErrorBoundary } from './ErrorBoundary';
import { AppRoutes } from './router';
import { AppProviders } from './AppProviders';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders config={appConfig}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProviders>
    </ErrorBoundary>
  );
}
