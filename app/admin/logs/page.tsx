import { prisma } from "@/lib/prisma";

const TARGET_BADGE: Record<string, string> = {
  ASSET: "text-accent-light bg-accent-muted border-accent/20",
  USER: "text-info bg-info-muted border-info/20",
  PAYOUT: "text-gold bg-gold-muted border-gold/20",
};

export default async function AdminLogsPage() {
  const logs = await prisma.adminLog.findMany({
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Audit Log
        </h1>
        <p className="text-sm text-muted mt-1">
          Last {logs.length} admin action{logs.length === 1 ? "" : "s"}.
        </p>
      </header>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No admin actions recorded yet.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">When</th>
                <th className="text-left font-medium px-4 py-3">Admin</th>
                <th className="text-left font-medium px-4 py-3">Action</th>
                <th className="text-left font-medium px-4 py-3">Target</th>
                <th className="text-left font-medium px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(l.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs truncate max-w-[180px]">
                    {l.admin.name ?? l.admin.email}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs font-mono text-primary bg-elevated px-1.5 py-0.5 rounded">
                      {l.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border ${TARGET_BADGE[l.targetType] ?? "text-muted bg-elevated border-border"}`}
                    >
                      {l.targetType}
                    </span>
                    <span className="ml-2 font-mono text-muted">
                      {l.targetId.slice(0, 8)}…
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs truncate max-w-[260px]">
                    {l.note ?? <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
