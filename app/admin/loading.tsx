/**
 * Instant skeleton for admin routes (tables of assets, users, payouts, KYC).
 * Streamed on navigation while the server component runs its Prisma queries.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-elevated" />
        <div className="h-4 w-72 rounded bg-elevated/60" />
      </div>

      <div className="flex gap-1 border-b border-border pb-px">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-24 rounded-t bg-elevated/60" />
        ))}
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="h-11 bg-elevated" />
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-4 flex-1 rounded bg-elevated/60" />
              <div className="h-4 w-20 rounded bg-elevated/60" />
              <div className="h-4 w-16 rounded bg-elevated/60" />
              <div className="h-7 w-20 rounded bg-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
