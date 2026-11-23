import { useCallback, useState } from 'react';

export interface ContainerMetrics {
  /** Content-box width in px (0 until first measured). */
  width: number;
  /** Distance from the top of the document in px, for window-scroll virtualisation. */
  offsetTop: number;
}

const INITIAL: ContainerMetrics = { width: 0, offsetTop: 0 };

/**
 * Measures an element with ResizeObserver and returns a callback ref plus its metrics.
 * The document body is observed too, because content above the element (chips, messages)
 * can move it without resizing it. State only changes when a value actually changes.
 */
export function useContainerWidth<T extends HTMLElement>(): [
  ref: (node: T | null) => void,
  metrics: ContainerMetrics,
] {
  const [metrics, setMetrics] = useState<ContainerMetrics>(INITIAL);

  const ref = useCallback((node: T | null) => {
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = { width: Math.round(rect.width), offsetTop: Math.round(rect.top + window.scrollY) };
      setMetrics((current) =>
        current.width === next.width && current.offsetTop === next.offsetTop ? current : next,
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  return [ref, metrics];
}
