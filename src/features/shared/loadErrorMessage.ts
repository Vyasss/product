import { classifyLoadError, isRetryLikelyToHelp, type LoadErrorKind } from '../../data/loadErrors';
import { ApiError } from '../../data/ProductService';

export interface LoadErrorMessage {
  kind: LoadErrorKind;
  /** One or two sentences: what happened, and what to do about it. */
  text: string;
  /** False when pressing Retry unchanged is unlikely to work; the text then says so. */
  retryLikelyToHelp: boolean;
}

/**
 * Words for each way a catalog load can fail. The 500 wording is the one the simulated
 * failure produces, so it is also what appears with `?mockFail=1`.
 */
export function describeLoadError(error: unknown, online: boolean): LoadErrorMessage {
  const kind = classifyLoadError(error, online);
  const status = error instanceof ApiError ? ` (status ${error.status})` : '';
  const text: Record<LoadErrorKind, string> = {
    offline: 'You appear to be offline. The products will load by themselves when the connection is back.',
    network: 'The request did not complete. Check your connection.',
    timeout: `The server took too long to answer${status}. It may be busy; try again in a moment.`,
    'not-found': `The product service could not be found${status}. This is a problem on our side, and retrying is unlikely to help.`,
    forbidden: `Access to the products was refused${status}. This is a problem on our side, and retrying is unlikely to help.`,
    'rate-limited': `Too many requests were sent in a short time${status}. Wait a few seconds, then try again.`,
    unavailable: `The product service is temporarily unavailable${status}. This usually clears up within a minute.`,
    server: `The server responded with an error${status}.`,
    client: `The request was rejected${status}. This is a problem on our side, and retrying is unlikely to help.`,
    'bad-response': 'The server answered, but with data this page could not read. Retrying is unlikely to help.',
  };
  return { kind, text: text[kind], retryLikelyToHelp: isRetryLikelyToHelp(kind) };
}
