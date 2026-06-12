type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-pump-surface/80 ring-1 ring-inset ring-pump-border/12 ${className}`}
      aria-hidden
    />
  );
}
