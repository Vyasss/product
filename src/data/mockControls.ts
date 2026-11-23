import type { Random } from './prng';

/**
 * Mock-only capabilities, kept off `ProductService` (interface segregation):
 * a real service has no business exposing "fail on purpose".
 */
export interface MockControls {
  /** Make the next `count` requests fail with a simulated 500. */
  failNext(count: number): void;
  /** How many forced failures are still queued. */
  pendingFailures(): number;
}

/** Decides, per request, whether the mock service should fail. */
export interface FailurePolicy extends MockControls {
  shouldFail(): boolean;
}

export interface FailurePolicyOptions {
  /** Probability in [0, 1] that any request fails (`VITE_MOCK_FAIL_RATE`). */
  failRate?: number;
  /** Fail the first N requests of this page load (`?mockFail=N`). */
  failFirst?: number;
  /** Injectable for tests. Latency jitter and fail rate are not part of the deterministic dataset. */
  random?: Random;
}

export function createFailurePolicy({
  failRate = 0,
  failFirst = 0,
  random = Math.random,
}: FailurePolicyOptions = {}): FailurePolicy {
  let forced = Math.max(0, Math.floor(failFirst));
  const rate = Number.isFinite(failRate) ? Math.min(1, Math.max(0, failRate)) : 0;

  return {
    failNext(count) {
      forced += Math.max(0, Math.floor(count));
    },
    pendingFailures() {
      return forced;
    },
    shouldFail() {
      if (forced > 0) {
        forced -= 1;
        return true;
      }
      return rate > 0 && random() < rate;
    },
  };
}

/** Reads `mockFail=<N>` from a query string. Invalid or missing values mean 0. */
export function readMockFailParam(search: string): number {
  const raw = new URLSearchParams(search).get('mockFail');
  if (raw === null) return 0;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? Math.min(value, 100) : 0;
}

/** What a simulated failure looks like: an HTTP status, a dropped connection, or no answer in time. */
export type MockFailure = number | 'network' | 'timeout';

const MOCK_STATUSES: ReadonlySet<number> = new Set([400, 401, 403, 404, 408, 429, 500, 502, 503, 504]);

/**
 * Reads `mockStatus` from a query string so each error message can be seen without a real
 * server: one of the listed HTTP statuses, `network` or `timeout`. Anything else means 500.
 */
export function readMockStatusParam(search: string): MockFailure {
  const raw = new URLSearchParams(search).get('mockStatus');
  if (raw === 'network' || raw === 'timeout') return raw;
  const status = Number(raw);
  return raw !== null && MOCK_STATUSES.has(status) ? status : 500;
}
