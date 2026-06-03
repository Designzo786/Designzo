import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { CreatorActions } from "./CreatorActions";
import type { CreatorStatus } from "@prisma/client";

const TABS: { value: CreatorStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const STATUS_BADGE: Record<CreatorStatus, string> = {
  NONE: "text-muted bg-elevated border-border",
  PENDING: "text-gold bg-gold-muted border-gold/20",
  APPROVED: "text-accent-light bg-accent-muted border-accent/20",
  REJECTED: "text-danger bg-danger-muted border-danger/20",
};

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status && ["PENDING", "APPROVED", "REJECTED"].includes(status)
      ? status
      : "PENDING"
  ) as CreatorStatus | "ALL";

  const creators = await prisma.user.findMany({
    where:
      filter === "ALL"
        ? { creatorStatus: { not: "NONE" } }
        : { creatorStatus: filter as CreatorStatus },
    select: {
      id: true,
      name: true,
      email: true,
      creatorStatus: true,
      createdAt: true,
      creatorDecidedAt: true,
      _count: { select: { assets: true } },
    },
    orderBy: [{ creatorStatus: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Collaborator Applications
        </h1>
        <p className="text-sm text-muted mt-1">
          Review accounts that registered as Collaborators. Approving one
          unlocks the upload tools and promotes the account to Creator.
        </p>
      </header>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <Link
              key={t.value}
              href={
                t.value === "PENDING"
                  ? "/admin/creators"
                  : `/admin/creators?status=${t.value}`
              }
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "text-primary border-accent"
                  : "text-muted border-transparent hover:text-secondary"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {creators.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No collaborator applications in this queue.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">Applicant</th>
                <th className="text-left font-medium px-4 py-3">Uploads</th>
                <th className="text-left font-medium px-4 py-3">Registered</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {creators.map((c) => (
                <tr key={c.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-primary truncate max-w-[220px]">
                      {c.name ?? "Unnamed"}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[220px]">
                      {c.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs">
                    {c._count.assets}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {formatRelativeTime(c.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[c.creatorStatus]}`}
                    >
                      {c.creatorStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CreatorActions
                      userId={c.id}
                      status={c.creatorStatus}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
