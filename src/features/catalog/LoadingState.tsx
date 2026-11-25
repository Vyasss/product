import { Card } from '../../components/ui/Card';
import { Skeleton } from '../../components/ui/Skeleton';
import { VisuallyHidden } from '../../components/ui/VisuallyHidden';
import { useFeatures } from '../../hooks/useServices';
import { cardHeightRem } from './ProductGrid';

const PLACEHOLDER_CARDS = 8;

function GridSkeleton() {
  const { buyButtons } = useFeatures();
  return (
    <Card aria-hidden="true" className="flex flex-col overflow-hidden" style={{ height: `${cardHeightRem('grid', buyButtons)}rem` }}>
      <Skeleton className="h-44 rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-auto h-6 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </Card>
  );
}

function ListSkeleton() {
  const { buyButtons } = useFeatures();
  return (
    <Card aria-hidden="true" className="flex overflow-hidden" style={{ height: `${cardHeightRem('list', buyButtons)}rem` }}>
      <Skeleton className="h-full w-32 shrink-0 rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-6 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
    </Card>
  );
}

/**
 * Shimmer cards with the same dimensions as the real ones (grid cards from 30.5rem up, list
 * cards below, matching ProductGrid's column switch), so nothing jumps when data arrives.
 */
export function LoadingState() {
  return (
    <div>
      <VisuallyHidden>Loading products…</VisuallyHidden>
      <div className="hidden grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-4 min-[30.5rem]:grid">
        {Array.from({ length: PLACEHOLDER_CARDS }, (_, i) => (
          <GridSkeleton key={i} />
        ))}
      </div>
      <div className="flex flex-col gap-4 min-[30.5rem]:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <ListSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
