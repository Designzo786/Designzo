const STATS = [
  { value: "10K+", label: "Premium Assets" },
  { value: "500+", label: "Active Creators" },
  { value: "1M+", label: "Downloads" },
  { value: "120+", label: "Countries" },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface px-6 py-8 text-center hover:bg-elevated transition-colors"
          >
            <div className="text-3xl sm:text-4xl font-bold gradient-text-hero">
              {stat.value}
            </div>
            <div className="mt-2 text-xs uppercase tracking-wider text-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
