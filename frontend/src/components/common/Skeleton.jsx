export default function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse-soft rounded-inner bg-line/70 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}