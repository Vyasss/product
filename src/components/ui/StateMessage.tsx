import type { ReactNode, Ref } from 'react';
import { Card } from './Card';

export interface StateMessageProps {
  illustration: ReactNode;
  title: string;
  children: ReactNode;
  action: ReactNode;
  /** h3 inside the results area; h1 or h2 when the message is the page content. */
  headingLevel?: 'h1' | 'h2' | 'h3';
  headingRef?: Ref<HTMLHeadingElement>;
}

/** Shared layout for the empty and error states: illustration, headline, help, one action. */
export function StateMessage({
  illustration,
  title,
  children,
  action,
  headingLevel: Heading = 'h3',
  headingRef,
}: StateMessageProps) {
  return (
    <Card className="mx-auto flex max-w-lg flex-col items-center px-6 py-10 text-center">
      {illustration}
      <Heading ref={headingRef} tabIndex={-1} className="mt-5 text-xl font-bold text-ink focus:outline-none">
        {title}
      </Heading>
      <div className="mt-2 text-sm text-balance text-ink-muted">{children}</div>
      <div className="mt-6">{action}</div>
    </Card>
  );
}
