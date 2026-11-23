// Micro-benchmarks for the pure core: dataset generation, index build, filter and sort.
// Loads the real TypeScript modules through Vite's SSR module loader, so the numbers are for
// the same code the browser runs (minus minification). Run with `npm run bench`.
//
// These are Node timings on the machine printed in the header. They are not browser numbers
// and say nothing directly about a throttled phone.

import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  appType: 'custom',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
});

try {
  const { generateProducts } = await server.ssrLoadModule('/src/data/generateProducts.ts');
  const { buildIndex } = await server.ssrLoadModule('/src/search/buildIndex.ts');
  const { InMemorySearchEngine } = await server.ssrLoadModule('/src/search/InMemorySearchEngine.ts');
  const { DEFAULT_FILTERS } = await server.ssrLoadModule('/src/domain/filters.ts');

  const stats = (samples) => {
    const sorted = [...samples].sort((a, b) => a - b);
    const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return { median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] };
  };

  const time = (fn, { warmup = 5, runs = 50 } = {}) => {
    for (let i = 0; i < warmup; i++) fn();
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      fn();
      samples.push(performance.now() - start);
    }
    return stats(samples);
  };

  const rows = [];
  const record = (name, result, extra = '') => rows.push({ name, ...result, extra });

  record('generateProducts(5,000)', time(() => generateProducts(), { warmup: 2, runs: 20 }));

  const products = generateProducts();
  record('buildIndex(5,000)', time(() => buildIndex(products), { warmup: 2, runs: 20 }));

  const engine = new InMemorySearchEngine(products);
  const scenarios = [
    ['no filters (all 5,000)', {}],
    ['q="shoes"', { q: 'shoes' }],
    ['q="pro" (common substring)', { q: 'pro' }],
    ['q="running shoes" (2 tokens)', { q: 'running shoes' }],
    ['q="joote" (alias expansion)', { q: 'joote' }],
    ['q="zzzz" (no match)', { q: 'zzzz' }],
    ['q="ek smart tv chahie" (stop words)', { q: 'ek smart tv chahie' }],
    ['q="smart tv xyzabc" (unknown-word fallback)', { q: 'smart tv xyzabc' }],
    ['q="runing shoez" (typo correction)', { q: 'runing shoez' }],
    ['q="xqzvwkpt mnbvcxzl" (worst case: 2 long unknown words)', { q: 'xqzvwkpt mnbvcxzl' }],
    ['categories=Apparel,Sports + inStock', { categories: ['Apparel', 'Sports'], inStock: true }],
    ['price 1,000 to 5,000', { minPrice: 1000, maxPrice: 5000 }],
    ['sort=price_asc over all 5,000', { sort: 'price_asc' }],
    ['sort=rating_desc over all 5,000', { sort: 'rating_desc' }],
    [
      'brief example URL (q+category+inStock+sort)',
      { q: 'shoes', categories: ['Apparel', 'Sports'], inStock: true, sort: 'price_asc' },
    ],
  ];
  for (const [name, patch] of scenarios) {
    const filters = { ...DEFAULT_FILTERS, ...patch };
    const total = engine.search(filters).total;
    record(`search: ${name}`, time(() => engine.search(filters), { warmup: 20, runs: 300 }), `${total} matches`);
  }

  // Typing a misspelt query one character at a time: strict misses trigger the fuzzy path.
  const typo = 'runing shoez';
  record(
    `typing "${typo}" (${typo.length} searches)`,
    time(
      () => {
        for (let i = 1; i <= typo.length; i++) engine.search({ ...DEFAULT_FILTERS, q: typo.slice(0, i) });
      },
      { warmup: 5, runs: 100 },
    ),
  );

  // Typing "running shoes" one character at a time: one search per keystroke.
  const phrase = 'running shoes';
  record(
    `typing "${phrase}" (${phrase.length} searches)`,
    time(
      () => {
        for (let i = 1; i <= phrase.length; i++) engine.search({ ...DEFAULT_FILTERS, q: phrase.slice(0, i) });
      },
      { warmup: 5, runs: 100 },
    ),
  );

  const cpu = os.cpus()[0]?.model.trim() ?? 'unknown CPU';
  console.log('Product catalog core benchmark');
  console.log(`Machine: ${cpu}, ${os.cpus().length} logical cores, ${Math.round(os.totalmem() / 2 ** 30)} GB RAM`);
  console.log(`OS: ${os.type()} ${os.release()} (${os.arch()}), Node ${process.version}`);
  console.log('Times in milliseconds (median / p95 / max)\n');

  const fmt = (n) => n.toFixed(3).padStart(8);
  const width = Math.max(...rows.map((r) => r.name.length));
  console.log(`${'case'.padEnd(width)}   median      p95      max`);
  for (const r of rows) {
    console.log(`${r.name.padEnd(width)} ${fmt(r.median)} ${fmt(r.p95)} ${fmt(r.max)}  ${r.extra}`);
  }
} finally {
  await server.close();
}
