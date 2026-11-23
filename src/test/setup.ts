import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom has no layout engine. The window virtualizer reads window.innerWidth/innerHeight
// (1024 x 768 in jsdom), so rows render; the grid falls back to one column because element
// widths are 0. ResizeObserver and scrollTo are stubbed so the code paths run without errors.
class ResizeObserverStub implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);
window.scrollTo = () => undefined;

// axe-core probes <canvas> for icon-font detection; jsdom has no canvas. Returning null makes
// axe skip that probe instead of logging "Not implemented". Colour contrast is not checked in jsdom.
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
