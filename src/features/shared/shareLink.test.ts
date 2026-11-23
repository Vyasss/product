import { describe, expect, it, vi } from 'vitest';
import { shareLink, shareTargets } from './shareLink';

const URL = 'https://example.test/?q=shoes&category=Apparel,Sports&inStock=true&sort=price_asc';

describe('shareLink', () => {
  it('uses the share sheet when there is one, with the exact URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    expect(await shareLink(URL, 'Shop', { share, writeText })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Shop', url: URL });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('treats a dismissed share sheet as cancelled and does not copy without being asked', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('dismissed', 'AbortError'));
    const writeText = vi.fn();
    expect(await shareLink(URL, 'Shop', { share, writeText })).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies to the clipboard when there is no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    expect(await shareLink(URL, 'Shop', { writeText })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(URL);
  });

  it('falls back when sharing fails for another reason or the clipboard is refused', async () => {
    const share = vi.fn().mockRejectedValue(new Error('not allowed'));
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const legacyCopy = vi.fn().mockReturnValue(true);
    expect(await shareLink(URL, 'Shop', { share, writeText, legacyCopy })).toBe('copied');
    expect(legacyCopy).toHaveBeenCalledWith(URL);
  });

  it('builds app links that carry the exact URL, safely encoded', () => {
    const tricky = 'https://example.test/?q=H&M 50+&category=Apparel,Sports';
    const targets = shareTargets(tricky, 'Shoes & more');
    expect(targets.map((target) => target.id)).toEqual(['whatsapp', 'email', 'teams']);

    const whatsapp = new globalThis.URL(targets[0]?.href ?? '');
    expect(whatsapp.origin + whatsapp.pathname).toBe('https://wa.me/');
    expect(whatsapp.searchParams.get('text')).toBe(`Shoes & more\n${tricky}`);

    const email = targets[1]?.href ?? '';
    expect(email.startsWith('mailto:?subject=')).toBe(true);
    expect(decodeURIComponent(email.split('&body=')[1] ?? '')).toBe(tricky);

    const teams = new globalThis.URL(targets[2]?.href ?? '');
    expect(teams.hostname).toBe('teams.microsoft.com');
    expect(teams.searchParams.get('href')).toBe(tricky);
  });

  it('reports failure when nothing works', async () => {
    expect(await shareLink(URL, 'Shop', {})).toBe('failed');
    expect(await shareLink(URL, 'Shop', { legacyCopy: () => false })).toBe('failed');
  });
});
