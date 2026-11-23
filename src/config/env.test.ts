import { describe, expect, it } from 'vitest';
import { parseConfig } from './env';

describe('parseConfig', () => {
  it('defaults to the mock service with add-ons off', () => {
    expect(parseConfig({})).toEqual({
      apiBaseUrl: null,
      mockFailRate: 0,
      enableMockControls: false,
      smartSearch: false,
    });
  });

  it('reads valid values', () => {
    expect(
      parseConfig({
        VITE_API_BASE_URL: 'https://api.example.com/v1/',
        VITE_MOCK_FAIL_RATE: '0.25',
        VITE_ENABLE_MOCK_CONTROLS: 'true',
        VITE_FEATURE_SMART_SEARCH: '1',
      }),
    ).toEqual({
      apiBaseUrl: 'https://api.example.com/v1',
      mockFailRate: 0.25,
      enableMockControls: true,
      smartSearch: true,
    });
  });

  it.each([
    ['not-a-url', null],
    ['ftp://example.com', null],
    ['   ', null],
  ])('rejects API base URL %j', (value, expected) => {
    expect(parseConfig({ VITE_API_BASE_URL: value }).apiBaseUrl).toBe(expected);
  });

  it.each([
    ['2', 1],
    ['-1', 0],
    ['abc', 0],
  ])('clamps fail rate %j to %d', (value, expected) => {
    expect(parseConfig({ VITE_MOCK_FAIL_RATE: value }).mockFailRate).toBe(expected);
  });

  it('treats anything but "true" or "1" as off', () => {
    expect(parseConfig({ VITE_FEATURE_SMART_SEARCH: 'yes' }).smartSearch).toBe(false);
  });
});
