/**
 * Generic skeleton for marketing pages (home, about, sell, help, docs, …).
 * Next.js streams this immediately on navigation — and shows it during
 * on-demand route compilation in dev — so a page never flashes blank.
 */
export default function MarketingLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 animate-pulse">
      {/* Heading block */}
      <div className="space-y-3 text-center">
        <div className="h-9 w-2/3 max-w-md mx-auto rounded-lg bg-elevated" />
        <div className="h-4 w-full max-w-lg mx-auto rounded bg-elevated/60" />
        <div className="h-4 w-3/4 max-w-md mx-auto rounded bg-elevated/60" />
      </div>

      {/* Content blocks */}
      <div className="mt-14 grid sm:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <div className="w-11 h-11 rounded-xl bg-elevated" />
            <div className="h-4 w-3/4 rounded bg-elevated mt-4" />
            <div className="h-3 w-full rounded bg-elevated/60 mt-3" />
            <div className="h-3 w-2/3 rounded bg-elevated/60 mt-2" />
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        <div className="h-4 w-full rounded bg-elevated/60" />
        <div className="h-4 w-5/6 rounded bg-elevated/60" />
        <div className="h-4 w-4/6 rounded bg-elevated/60" />
      </div>
    </div>
  );
}
