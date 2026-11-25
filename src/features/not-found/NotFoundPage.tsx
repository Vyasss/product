import { useRef } from 'react';
import { Link } from 'react-router';
import { buttonClassName } from '../../components/ui/Button';
import { RefreshIcon } from '../../components/ui/icons';
import { useDocumentTitle, useFocusOnNavigation } from '../../hooks/usePageMeta';
import { StateMessage } from '../../components/ui/StateMessage';
import { StorePage } from '../shell/StorePage';

function LostIllustration() {
  return (
    <svg viewBox="0 0 160 110" className="h-28 w-40" aria-hidden="true" focusable="false">
      <ellipse cx="80" cy="102" rx="54" ry="6" className="fill-line" />
      <path d="M48 40h64l-6 58H54z" className="fill-tint stroke-line-strong" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M64 44V34a16 16 0 0 1 32 0v10" fill="none" className="stroke-brand" strokeWidth="5" strokeLinecap="round" />
      <text x="80" y="82" textAnchor="middle" className="fill-brand-ink text-[26px] font-extrabold">
        404
      </text>
    </svg>
  );
}

/**
 * Client-side 404. CloudFront serves index.html for extension-less paths, so unknown
 * routes reach the app and land here instead of a bare S3 error. Retry opens the catalog,
 * the one page this app has.
 */
export function NotFoundPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useDocumentTitle('Page not found');
  useFocusOnNavigation(headingRef);

  return (
    <StorePage width="narrow">
      <div className="py-8">
        <StateMessage
          headingLevel="h1"
          headingRef={headingRef}
          illustration={<LostIllustration />}
          title="Page not found"
          action={
            <Link to="/" className={buttonClassName('primary')}>
              <RefreshIcon className="size-4" />
              Retry
            </Link>
          }
        >
          <p>This page doesn’t exist or has moved. The full catalog is one click away.</p>
        </StateMessage>
      </div>
    </StorePage>
  );
}
