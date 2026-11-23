export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareEnvironment {
  share?: (data: { title: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  /** Last resort for pages not served over HTTPS, where the two APIs above do not exist. */
  legacyCopy?: (text: string) => boolean;
}

/**
 * Share a URL: the system share sheet where there is one (phones), else the clipboard.
 * The URL already holds the whole view (filters, product, or shared cart), so the link
 * restores it exactly.
 */
export async function shareLink(url: string, title: string, env: ShareEnvironment): Promise<ShareOutcome> {
  if (env.share) {
    try {
      await env.share({ title, url });
      return 'shared';
    } catch (error) {
      // The user closing the share sheet is not a failure, and must not fall through to a copy.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (env.writeText) {
    try {
      await env.writeText(url);
      return 'copied';
    } catch {
      // Permission denied or document not focused: try the legacy path.
    }
  }
  return env.legacyCopy?.(url) ? 'copied' : 'failed';
}

export interface ShareTarget {
  id: 'whatsapp' | 'email' | 'teams';
  label: string;
  href: string;
}

/**
 * Plain links to apps that accept a shared URL on the web. They are ordinary navigations:
 * nothing is sent to these services until the user follows the link and confirms there.
 * Apps without a web share link (Instagram, for one) are reached through the phone's share
 * sheet instead.
 */
export function shareTargets(url: string, title: string): ShareTarget[] {
  // The link goes on its own line: chat apps turn a URL into a link most reliably that way.
  const text = encodeURIComponent(`${title}\n${url}`);
  return [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}` },
    {
      id: 'email',
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    },
    {
      id: 'teams',
      label: 'Microsoft Teams',
      href: `https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(title)}`,
    },
  ];
}
