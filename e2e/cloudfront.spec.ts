import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Runs the CloudFront Function source in an isolated VM context (no AWS involved) and checks
// which request paths fall back to /index.html. Deep links such as /cart are what actually
// exercise the SPA fallback; product links go to their own preview page.
type Handler = (event: { request: { uri: string } }) => { uri: string };
const source = readFileSync(new URL('../infra/cloudfront/spa-rewrite.js', import.meta.url), 'utf8');
const handler = runInNewContext(`${source}\nhandler;`) as Handler;

for (const [uri, expected] of [
  ['/', '/index.html'],
  ['/product/p-00042', '/product/p-00042.html'],
  ['/product/p-05000', '/product/p-05000.html'],
  ['/product/p-00000', '/index.html'],
  ['/product/p-05001', '/index.html'],
  ['/product/p-99999', '/index.html'],
  ['/product/unknown', '/index.html'],
  ['/product/p-00042/', '/index.html'],
  ['/cart', '/index.html'],
  ['/checkout', '/index.html'],
  ['/checkout/confirmation', '/index.html'],
  ['/some/unknown/path', '/index.html'],
  ['/assets/index-abc123.js', '/assets/index-abc123.js'],
  ['/favicon.svg', '/favicon.svg'],
  ['/missing.png', '/missing.png'],
] as const) {
  test(`CloudFront rewrite: ${uri} -> ${expected}`, () => {
    expect(handler({ request: { uri } }).uri).toBe(expected);
  });
}
