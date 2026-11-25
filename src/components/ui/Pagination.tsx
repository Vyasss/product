import type { ReactNode } from 'react';
import { Button } from './Button';
import { ArrowLeftIcon } from './icons';
import { pageItems } from './pageItems';

export interface PaginationProps {
  /** Current page, 1-based, already within 1..pageCount. */
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
  /** Line above the buttons, e.g. "Showing 61–120 of 317". */
  summary?: ReactNode;
}

/**
 * Previous / numbered pages / Next. Numbered buttons from 640 px up; phones get
 * "Page 2 of 84" between Previous and Next, which fits at 320 px. Every control is a native
 * button (Tab, Enter, Space); the current page is marked with aria-current.
 */
export function Pagination({ page, pageCount, onChange, label = 'Pagination', summary }: PaginationProps) {
  return (
    <nav aria-label={label} className="flex flex-col items-center gap-3 py-8">
      {summary && <p className="text-sm text-ink-muted tabular-nums">{summary}</p>}
      <ul className="flex items-center gap-1.5">
        <li>
          <Button aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className="max-sm:px-3">
            <ArrowLeftIcon className="size-4" />
            <span className="max-sm:hidden">Previous</span>
          </Button>
        </li>
        <li className="px-2 text-sm font-semibold text-ink tabular-nums sm:hidden">
          Page {page} of {pageCount}
        </li>
        {pageItems(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-ink-muted max-sm:hidden">
              …
            </li>
          ) : (
            <li key={item} className="max-sm:hidden">
              <Button
                variant={item === page ? 'primary' : 'secondary'}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Page ${item}`}
                onClick={() => {
                  if (item !== page) onChange(item);
                }}
                className="px-3 tabular-nums"
              >
                {item}
              </Button>
            </li>
          ),
        )}
        <li>
          <Button aria-label="Next page" disabled={page >= pageCount} onClick={() => onChange(page + 1)} className="max-sm:px-3">
            <span className="max-sm:hidden">Next</span>
            <ArrowLeftIcon className="size-4 rotate-180" />
          </Button>
        </li>
      </ul>
    </nav>
  );
}
