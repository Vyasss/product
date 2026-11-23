import { ApiError } from './ProductService';

/** The request did not finish within the time limit. */
export class TimeoutError extends Error {
  override readonly name = 'TimeoutError';
}

/** The server answered 2xx, but the body was not JSON or not a list of products. */
export class BadResponseError extends Error {
  override readonly name = 'BadResponseError';
}

/**
 * Why a catalog load failed, in terms the UI can explain and act on.
 * - offline: the browser reports no connection.
 * - network: no response at all (DNS, CORS, connection reset) while apparently online.
 * - timeout: no answer in time (client limit, or HTTP 408).
 * - not-found (404), forbidden (401/403), client (other 4xx): the request itself is wrong;
 *   retrying will not help until something changes.
 * - rate-limited (429), unavailable (502/503/504), server (other 5xx): the server's side;
 *   retrying is reasonable.
 * - bad-response: a 2xx answer that could not be used.
 */
export type LoadErrorKind =
  | 'offline'
  | 'network'
  | 'timeout'
  | 'not-found'
  | 'forbidden'
  | 'rate-limited'
  | 'unavailable'
  | 'server'
  | 'client'
  | 'bad-response';

export function classifyLoadError(error: unknown, online: boolean): LoadErrorKind {
  if (error instanceof TimeoutError) return 'timeout';
  if (error instanceof BadResponseError) return 'bad-response';
  if (error instanceof ApiError) {
    const { status } = error;
    if (status === 404) return 'not-found';
    if (status === 401 || status === 403) return 'forbidden';
    if (status === 408) return 'timeout';
    if (status === 429) return 'rate-limited';
    if (status === 502 || status === 503 || status === 504) return 'unavailable';
    if (status >= 500) return 'server';
    return 'client';
  }
  return online ? 'network' : 'offline';
}

/** Whether trying again, unchanged, has a fair chance of working. */
export function isRetryLikelyToHelp(kind: LoadErrorKind): boolean {
  return kind !== 'not-found' && kind !== 'forbidden' && kind !== 'client' && kind !== 'bad-response';
}
