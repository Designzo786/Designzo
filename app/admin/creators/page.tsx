import Link from "next/link";
import { ExternalLink, FileText, ImageOff, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
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
      image: true,
      creatorStatus: true,
      createdAt: true,
      creatorDecidedAt: true,
      creatorPortfolioUrl: true,
      creatorDemoNote: true,
      creatorSampleKeys: true,
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
          Review portfolio + demo samples and decide. Approving promotes the
          account to Creator and unlocks the upload tools.
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
        <div className="space-y-4">
          {creators.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border border-border bg-surface overflow-hidden"
            >
              {/* ─── Card header — identity + meta + actions ─────────── */}
              <header className="flex items-start gap-4 p-5 border-b border-border">
                <Avatar src={c.image} name={c.name ?? c.email} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-semibold text-primary truncate">
                      {c.name ?? "Unnamed"}
                    </h2>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${STATUS_BADGE[c.creatorStatus]}`}
                    >
                      {c.creatorStatus}
                    </span>
                  </div>
                  <div className="text-xs text-muted truncate">{c.email}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span>
                      Registered {formatRelativeTime(c.createdAt)}
                    </span>
                    <span className="text-subtle">·</span>
                    <span>
                      {c._count.assets} upload
                      {c._count.assets === 1 ? "" : "s"}
                    </span>
                    {c.creatorDecidedAt && (
                      <>
                        <span className="text-subtle">·</span>
                        <span>
                          Decided {formatRelativeTime(c.creatorDecidedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <CreatorActions
                    userId={c.id}
                    status={c.creatorStatus}
                  />
                </div>
              </header>

              {/* ─── Card body — application materials ─────────────────
                  Only renders when the creator submitted at least one
                  field. Legacy rows from before the demo-work form get
                  a single 'No application materials submitted' line so
                  it's clear they applied under the older flow. */}
              {hasMaterials(c) ? (
                <div className="p-5 space-y-5">
                  {/* Portfolio URL */}
                  {c.creatorPortfolioUrl && (
                    <Field icon={ExternalLink} label="Portfolio">
                      <a
                        href={c.creatorPortfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent-light hover:text-accent break-all inline-flex items-center gap-1 transition-colors"
                      >
                        {c.creatorPortfolioUrl}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </Field>
                  )}

                  {/* Demo note */}
                  {c.creatorDemoNote && (
                    <Field icon={FileText} label="About their work">
                      <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">
                        {c.creatorDemoNote}
                      </p>
                    </Field>
                  )}

                  {/* Sample images */}
                  {c.creatorSampleKeys.length > 0 && (
                    <Field
                      icon={User}
                      label={`Demo samples (${c.creatorSampleKeys.length})`}
                    >
                      <div className="grid grid-cols-3 gap-3">
                        {c.creatorSampleKeys.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-elevated hover:border-accent/40 transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Sample ${i + 1}`}
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-canvas/80 backdrop-blur text-[10px] text-secondary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              Open full size
                            </span>
                          </a>
                        ))}
                      </div>
                    </Field>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted">
                  <ImageOff className="w-3.5 h-3.5 shrink-0" />
                  Applied under the legacy form — no portfolio or samples on
                  file.
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

interface ApplicantMaterials {
  creatorPortfolioUrl: string | null;
  creatorDemoNote: string | null;
  creatorSampleKeys: string[];
}

function hasMaterials(c: ApplicantMaterials): boolean {
  return (
    !!c.creatorPortfolioUrl ||
    !!c.creatorDemoNote ||
    c.creatorSampleKeys.length > 0
  );
}

/**
 * Field row inside an application card — icon + uppercase label + body.
 * Keeps every section (portfolio, demo note, samples) visually consistent.
 */
function Field({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof ExternalLink;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted mb-2">
        <Icon className="w-3.5 h-3.5 text-accent-light" />
        {label}
      </div>
      {children}
    </div>
  );
}
