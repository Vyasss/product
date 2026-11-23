import { createContext, useContext } from 'react';
import type { Announcer } from './useAnnouncer';

/** The app's single polite live region, shared by every page (see `app/AnnouncerProvider`). */
export const AnnounceContext = createContext<Announcer['announce'] | null>(null);

export function useAnnounce(): Announcer['announce'] {
  const announce = useContext(AnnounceContext);
  if (!announce) throw new Error('useAnnounce() must be used inside <AnnouncerProvider>.');
  return announce;
}
