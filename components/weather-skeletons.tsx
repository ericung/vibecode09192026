/**
 * Polished loading skeletons (Phase 5, Prompt 17).
 * Fixed heights mirror the loaded layout to avoid layout shift.
 * All are aria-hidden decorations paired with an sr-only live status.
 */

function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-foreground/10 dark:bg-white/10 ${className}`}
    />
  );
}

export function WeatherSkeleton({ label = "Loading weather…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="w-full min-w-0 max-w-full overflow-hidden">
      <p className="sr-only">{label}</p>
      <div aria-hidden="true" className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBar className="h-6 w-40" />
            <SkeletonBar className="h-4 w-28" />
          </div>
          <div className="h-13 w-13 animate-pulse rounded-full bg-foreground/10 dark:bg-white/10" />
        </div>
        <div className="mt-8 flex items-end gap-3">
          <SkeletonBar className="h-24 w-44" />
          <div className="ml-auto space-y-2">
            <SkeletonBar className="h-5 w-24" />
            <SkeletonBar className="h-4 w-32" />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <SkeletonBar className="h-4 w-36" />
          <SkeletonBar className="h-8 w-20" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[var(--line)] pt-5 dark:border-white/10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="h-5 w-12" />
            </div>
          ))}
        </div>
        <div className="mt-8 min-w-0">
          <SkeletonBar className="mb-3 h-3 w-28" />
          <div className="flex min-w-0 gap-2 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonBar key={i} className="h-22 w-16 shrink-0" />
            ))}
          </div>
        </div>
        <div className="mt-6 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBar key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LocatingSkeleton() {
  return <WeatherSkeleton label="Detecting your location and loading weather…" />;
}
