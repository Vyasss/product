import { Component, type ErrorInfo, type ReactNode } from 'react';
import { buttonClassName } from '../components/ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Last line of defence for render errors: a readable message and a reload action. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // A real deployment would report this to an error-tracking service.
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Something went wrong</h1>
        <p className="mt-3 text-ink-muted">An unexpected error stopped the page. Reloading usually fixes it.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={buttonClassName('primary', 'mt-6')}
        >
          Reload page
        </button>
      </main>
    );
  }
}
