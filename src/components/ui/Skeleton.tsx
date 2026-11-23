export interface SkeletonProps {
  className?: string;
}

/**
 * Decorative shimmer placeholder; hidden from assistive tech (the loading state is
 * announced instead). Under reduced motion the shimmer stops and a flat block remains.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded bg-[linear-gradient(90deg,var(--color-skeleton)_25%,var(--color-skeleton-shine)_50%,var(--color-skeleton)_75%)] bg-size-[200%_100%] motion-reduce:animate-none ${className}`}
    />
  );
}
