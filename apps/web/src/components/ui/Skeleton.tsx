export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-skeleton rounded-xl bg-stone-200 ${className}`} aria-hidden="true" />;
}

export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}
