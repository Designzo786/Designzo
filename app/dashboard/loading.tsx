/**
 * Instant skeleton shown while a dashboard server component fetches.
 * Next.js streams this immediately on navigation, so the route feels
 * fast even when the underlying Prisma queries take a moment.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-elevated" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-elevated" />
          <div className="h-4 w-64 rounded bg-elevated/60" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="w-10 h-10 rounded-lg bg-elevated mb-4" />
            <div className="h-7 w-20 rounded bg-elevated" />
            <div className="h-3 w-24 rounded bg-elevated/60 mt-2" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
        <div className="h-5 w-32 rounded bg-elevated" />
        <div className="h-4 w-full max-w-md rounded bg-elevated/60" />
      </div>
    </div>
  );
}
