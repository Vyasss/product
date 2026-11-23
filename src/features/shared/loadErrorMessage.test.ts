import { describe, expect, it } from 'vitest';
import { BadResponseError, TimeoutError } from '../../data/loadErrors';
import { ApiError } from '../../data/ProductService';
import { describeLoadError } from './loadErrorMessage';

describe('describeLoadError', () => {
  it.each([
    [new ApiError('x', 500), 'server', 'The server responded with an error (status 500).', true],
    [new ApiError('x', 503), 'unavailable', /temporarily unavailable \(status 503\)/, true],
    [new ApiError('x', 502), 'unavailable', /status 502/, true],
    [new ApiError('x', 504), 'unavailable', /status 504/, true],
    [new ApiError('x', 429), 'rate-limited', /Too many requests.*status 429/, true],
    [new ApiError('x', 404), 'not-found', /could not be found \(status 404\).*unlikely to help/, false],
    [new ApiError('x', 403), 'forbidden', /refused \(status 403\).*unlikely to help/, false],
    [new ApiError('x', 400), 'client', /rejected \(status 400\).*unlikely to help/, false],
    [new TimeoutError('x'), 'timeout', /took too long/, true],
    [new BadResponseError('x'), 'bad-response', /could not read.*unlikely to help/, false],
  ] as const)('%o reads as %s', (error, kind, text, retryLikelyToHelp) => {
    const message = describeLoadError(error, true);
    expect(message.kind).toBe(kind);
    expect(message.text).toMatch(text);
    expect(message.retryLikelyToHelp).toBe(retryLikelyToHelp);
  });

  it('says offline when the browser is offline, and a connection problem otherwise', () => {
    const failure = new TypeError('Failed to fetch');
    expect(describeLoadError(failure, false)).toMatchObject({ kind: 'offline', retryLikelyToHelp: true });
    expect(describeLoadError(failure, false).text).toMatch(/offline.*by themselves/);
    expect(describeLoadError(failure, true).text).toBe('The request did not complete. Check your connection.');
  });

  it('never throws on something that is not an Error', () => {
    expect(describeLoadError('boom', true).kind).toBe('network');
    expect(describeLoadError(undefined, false).kind).toBe('offline');
  });
});
