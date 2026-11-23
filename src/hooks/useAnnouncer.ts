import { useCallback, useEffect, useRef, useState } from 'react';

export interface Announcer {
  /** Current text for the single polite live region. */
  message: string;
  /** Announce `text` after `delayMs`, replacing any announcement still waiting. */
  announce: (text: string, delayMs?: number) => void;
}

export const ANNOUNCE_DELAY_MS = 500;
const NO_BREAK_SPACE = String.fromCharCode(0xa0);

/**
 * Drives one polite aria-live region. The delay lets results settle while the user types,
 * so a screen reader hears "128 products found" once instead of after every keystroke.
 */
export function useAnnouncer(): Announcer {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((text: string, delayMs: number = ANNOUNCE_DELAY_MS) => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      // Repeating identical text would not be re-read; a trailing no-break space changes it.
      setMessage((previous) => (previous === text ? `${text}${NO_BREAK_SPACE}` : text));
    }, delayMs);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return { message, announce };
}
