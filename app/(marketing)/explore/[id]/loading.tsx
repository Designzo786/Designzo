/**
 * Skeleton for the asset detail page. The route does DB lookups (asset,
 * purchase, like state) — this mirrors the two-column detail layout so the
 * page streams in place instead of flashing blank.
 */
export default function AssetDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-4 w-64 rounded bg-elevated/60 mb-6" />

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
        {/* Left — preview + about */}
        <div className="space-y-4">
          <div className="aspect-square lg:aspect-[4/3] rounded-2xl bg-elevated" />
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
            <div className="h-5 w-40 rounded bg-elevated" />
            <div className="h-4 w-full rounded bg-elevated/60" />
            <div className="h-4 w-5/6 rounded bg-elevated/60" />
            <div className="h-4 w-2/3 rounded bg-elevated/60" />
          </div>
        </div>

        {/* Right — title, price, actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <div className="h-7 w-3/4 rounded bg-elevated" />
            <div className="h-4 w-1/3 rounded bg-elevated/60" />
            <div className="h-9 w-28 rounded bg-elevated" />
            <div className="h-11 w-full rounded-xl bg-elevated" />
            <div className="h-11 w-full rounded-xl bg-elevated/60" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
            <div className="h-4 w-1/2 rounded bg-elevated/60" />
            <div className="h-4 w-2/3 rounded bg-elevated/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
