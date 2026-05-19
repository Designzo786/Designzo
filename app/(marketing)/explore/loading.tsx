/**
 * Instant skeleton for the Explore grid. The page is ISR-cached (revalidate
 * = 60s) so most hits are instant — but on a cache miss or a filter change
 * this streams immediately instead of showing a blank screen.
 */
export default function ExploreLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 w-56 rounded bg-elevated mb-6" />

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0 space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-elevated" />
              <div className="h-3 w-full rounded bg-elevated/60" />
              <div className="h-3 w-3/4 rounded bg-elevated/60" />
            </div>
          ))}
        </aside>

        <div className="flex-1">
          <div className="h-9 w-44 rounded bg-elevated mb-5" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface overflow-hidden"
              >
                <div className="aspect-[4/3] bg-elevated" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-elevated" />
                  <div className="h-3 w-1/2 rounded bg-elevated/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
