import { memo, useEffect, useId, useRef, useState } from 'react';
import { Button, buttonClassName } from '../../components/ui/Button';
import { CheckIcon, ShareIcon } from '../../components/ui/icons';
import { useAnnounce } from '../../hooks/useAnnounce';
import { shareLink, shareTargets, type ShareTarget } from './shareLink';

const COPIED_RESET_MS = 2000;

export interface ShareButtonProps {
  /** Accessible name, e.g. "Share this view". Must start with the visible word "Share". */
  label?: string;
  /** Builds the URL when the button is pressed. Defaults to the address bar. */
  getUrl?: () => string;
  /** The message that goes with the link (e.g. product name and price). Defaults to the page title. */
  getText?: () => string;
  /** Icon only on small screens (the label stays available to assistive tech). */
  compact?: boolean;
}

function legacyCopy(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

const currentUrl = () => window.location.href;
const pageTitle = () => document.title;

/** The system share sheet, on touch devices that have one (it needs HTTPS). */
function nativeShare(): ((data: { title: string; url: string }) => Promise<void>) | undefined {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  return touch && typeof navigator.share === 'function' ? (data) => navigator.share(data) : undefined;
}

/**
 * Shares a link. On phones it opens the system share sheet, which lists every installed app.
 * Elsewhere (or when the sheet is unavailable) it opens a small menu: copy the link, or open
 * WhatsApp, email or Teams with the link filled in. The URL is read when the button is
 * pressed, so it is always exactly what a reload would restore.
 */
export const ShareButton = memo(function ShareButton({
  label = 'Share this view',
  getUrl = currentUrl,
  getText = pageTitle,
  compact = false,
}: ShareButtonProps) {
  const announce = useAnnounce();
  const [menu, setMenu] = useState<{ url: string; text: string; targets: ShareTarget[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const resetTimer = useRef<number | undefined>(undefined);
  const menuId = useId();
  const open = menu !== null;

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  // While open: Escape closes and returns focus; a press or focus move outside just closes.
  useEffect(() => {
    if (!open) return undefined;
    const container = containerRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenu(null);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !container?.contains(event.target)) setMenu(null);
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !container?.contains(event.relatedTarget)) setMenu(null);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    container?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
      container?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  const onPress = async () => {
    if (open) {
      setMenu(null);
      return;
    }
    const url = getUrl();
    const text = getText();
    const share = nativeShare();
    if (share) {
      const outcome = await shareLink(url, text, { share });
      if (outcome !== 'failed') return;
    }
    setMenu({ url, text, targets: shareTargets(url, text) });
  };

  const onCopy = async () => {
    if (!menu) return;
    const env = {
      legacyCopy,
      ...(navigator.clipboard ? { writeText: (text: string) => navigator.clipboard.writeText(text) } : {}),
    };
    const outcome = await shareLink(menu.url, menu.text, env);
    setMenu(null);
    buttonRef.current?.focus();
    if (outcome === 'copied') {
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
      announce('Link copied', 0);
    } else {
      announce('Could not copy the link. Copy it from the address bar instead.', 0);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        ref={buttonRef}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => void onPress()}
      >
        {copied ? <CheckIcon className="size-4" /> : <ShareIcon className="size-4" />}
        <span className={compact ? 'max-sm:sr-only' : ''}>{copied ? 'Copied' : 'Share'}</span>
      </Button>
      {menu && (
        <div
          id={menuId}
          role="group"
          aria-label="Share options"
          className="absolute top-full right-0 z-30 mt-1 flex w-56 flex-col rounded-card border border-line bg-card p-1 shadow-raised"
        >
          <Button variant="ghost" className="justify-start" onClick={() => void onCopy()}>
            Copy link
          </Button>
          {menu.targets.map((target) => (
            <a
              key={target.id}
              href={target.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName('ghost', 'justify-start')}
              onClick={() => setMenu(null)}
            >
              {target.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
});
