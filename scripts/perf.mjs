// Throttled-Chrome measurements (add-on). Requires `npm run build` first.
//
// Serves dist/ with `vite preview` and opens it in the locally installed Google Chrome at a
// phone viewport (390 x 844) with CPU throttling via CDP (Emulation.setCPUThrottlingRate).
// For each throttle rate (env PERF_RATES, default "1,4,6") it measures:
//   0. baseline: frame intervals for 3 s with the page idle (shows what the machine itself
//      costs; if the idle page already drops frames, the environment is the bottleneck);
//   1. typing at ~8 keys/s: time from each keydown to the next painted frame, plus long tasks;
//   2. scrolling with wheel steps at a human fling rate (~3,000 px/s for 6 s): frame intervals,
//      frames over 25 ms, long tasks, and a CPU-profile summary of where main-thread time went.
// This is throttled desktop Chrome, NOT a real phone: GPU, memory and thermal limits differ.

import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const PORT = 4192;
// Never hang: every browser step has a timeout, and the whole run is capped.
const STEP_TIMEOUT_MS = 30_000;
const WATCHDOG_MS = 8 * 60_000;
const watchdog = setTimeout(() => {
  console.error(`perf: no result within ${WATCHDOG_MS / 60_000} minutes, giving up`);
  process.exit(2);
}, WATCHDOG_MS);
watchdog.unref();
const RATES = (process.env.PERF_RATES ?? '1,4,6').split(',').map(Number);

const stats = (values) => {
  if (values.length === 0) return { n: 0, median: 0, p95: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const r = (v) => Math.round(v * 10) / 10;
  return { n: values.length, median: r(at(0.5)), p95: r(at(0.95)), max: r(sorted[sorted.length - 1]) };
};

async function frameIntervals(page, run) {
  await page.evaluate(() => {
    const perf = window.__perf;
    perf.frames = [];
    perf.stopFrames = false;
    perf.windowStart = performance.now();
    let last = performance.now();
    const loop = (now) => {
      perf.frames.push(now - last);
      last = now;
      if (!perf.stopFrames) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await run();
  return page.evaluate(() => {
    const perf = window.__perf;
    perf.stopFrames = true;
    const end = performance.now();
    return {
      frames: perf.frames.slice(1),
      longTasks: perf.longTasks.filter((t) => t.start >= perf.windowStart && t.start <= end).map((t) => t.duration),
    };
  });
}

function summarizeProfile(profile) {
  const byId = new Map(profile.nodes.map((node) => [node.id, node]));
  const self = new Map();
  profile.samples.forEach((id, i) => {
    const node = byId.get(id);
    const name = node.callFrame.functionName || '(anonymous)';
    const key = node.callFrame.url ? `${name} (app JS)` : name;
    self.set(key, (self.get(key) ?? 0) + (profile.timeDeltas[i] ?? 0));
  });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const jsTotal = [...self].filter(([k]) => k.endsWith('(app JS)')).reduce((a, [, v]) => a + v, 0);
  const share = (k) => Math.round(((self.get(k) ?? 0) / total) * 100);
  return {
    sampledMs: Math.round(total / 1000),
    idlePct: share('(idle)'),
    browserNativePct: share('(program)'),
    garbageCollectorPct: share('(garbage collector)'),
    appJsPct: Math.round((jsTotal / total) * 100),
  };
}

const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'error' });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];

try {
  for (const rate of RATES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(STEP_TIMEOUT_MS);
    const cdp = await context.newCDPSession(page);
    await page.goto(`http://localhost:${PORT}/`);
    await page.locator('[role="listitem"]').first().waitFor();
    await page.evaluate(() => {
      const perf = { keyToFrame: [], longTasks: [], frames: [] };
      window.__perf = perf;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) perf.longTasks.push({ start: entry.startTime, duration: entry.duration });
      }).observe({ type: 'longtask' });
      document.addEventListener(
        'keydown',
        () => {
          const start = performance.now();
          // rAF runs just before the frame is painted; the task after it runs once it has been.
          requestAnimationFrame(() => setTimeout(() => perf.keyToFrame.push(performance.now() - start), 0));
        },
        true,
      );
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });

    // 0. Idle baseline.
    const idle = await frameIntervals(page, () => page.waitForTimeout(3000));

    // 1. Typing.
    const search = page.getByRole('searchbox', { name: 'Search products' });
    await page.evaluate(() => (window.__perf.keyToFrame = []));
    const typingLongTasksFrom = await page.evaluate(() => performance.now());
    for (const query of ['running shoes', 'kitab', 'smart watch', 'cotton']) {
      await search.fill('');
      await search.click();
      await page.keyboard.type(query, { delay: 120 });
      await page.waitForTimeout(600);
    }
    const typing = await page.evaluate((from) => {
      const perf = window.__perf;
      return { keyToFrame: perf.keyToFrame, longTasks: perf.longTasks.filter((t) => t.start >= from).map((t) => t.duration) };
    }, typingLongTasksFrom);

    // 2. Scrolling: wheel steps of 60 px every 20 ms (~3,000 px/s) for 6 s.
    await search.fill('');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.mouse.move(195, 600);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.start');
    const scroll = await frameIntervals(page, async () => {
      for (let i = 0; i < 300; i++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(20);
      }
    });
    const { profile } = await cdp.send('Profiler.stop');
    const scrolledTo = await page.evaluate(() => Math.round(window.scrollY));

    results.push({
      cpuThrottling: `${rate}x`,
      idleBaseline: { frameIntervalMs: stats(idle.frames), framesOver25ms: idle.frames.filter((f) => f > 25).length, longTasks: idle.longTasks.length },
      typing: { keystrokeToNextFrameMs: stats(typing.keyToFrame), longTasks: { count: typing.longTasks.length, ...stats(typing.longTasks) } },
      scroll: {
        distancePx: scrolledTo,
        frameIntervalMs: stats(scroll.frames),
        framesOver25ms: scroll.frames.filter((f) => f > 25).length,
        longTasks: { count: scroll.longTasks.length, ...stats(scroll.longTasks) },
        cpuProfile: summarizeProfile(profile),
      },
    });
    await context.close();
  }

  const output = {
    environment: {
      note: 'Throttled desktop Chrome (headless), not a real phone',
      chrome: browser.version(),
      cpu: os.cpus()[0]?.model.trim(),
      node: process.version,
      viewport: '390x844 @2x, touch emulation',
    },
    results,
  };
  mkdirSync('docs', { recursive: true });
  writeFileSync('docs/perf-results.json', `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
} catch (error) {
  console.error('perf: failed', error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
