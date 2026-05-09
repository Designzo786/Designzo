import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileImage } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import {
  KYC_STATUS_LABEL,
  KYC_STATUS_COLOR,
} from "@/lib/kyc";
import { KycActions } from "./KycActions";

export default async function AdminKycReviewPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      legalName: true,
      aadhaarNumber: true,
      aadhaarKey: true,
      aadhaarBackKey: true,
      panNumber: true,
      panKey: true,
      bankAccountName: true,
      bankAccount: true,
      bankIfsc: true,
      bankName: true,
      kycStatus: true,
      kycSubmittedAt: true,
      kycVerifiedAt: true,
      kycRejectionNote: true,
    },
  });

  if (!user) notFound();
  if (user.kycStatus === "UNVERIFIED") {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/kyc"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KYC queue
        </Link>
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          This user hasn&apos;t submitted KYC yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/admin/kyc"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to KYC queue
      </Link>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            KYC review · {user.name ?? user.email}
          </h1>
          <p className="text-sm text-muted mt-1">{user.email}</p>
          {user.kycSubmittedAt && (
            <p className="text-xs text-muted mt-1">
              Submitted {formatDate(user.kycSubmittedAt)}
            </p>
          )}
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${KYC_STATUS_COLOR[user.kycStatus]}`}
        >
          {KYC_STATUS_LABEL[user.kycStatus]}
        </span>
      </header>

      {user.kycStatus === "REJECTED" && user.kycRejectionNote && (
        <div className="rounded-xl border border-danger/20 bg-danger-muted p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-danger mb-1">
            Previously rejected
          </div>
          <p className="text-secondary">{user.kycRejectionNote}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Section title="Identity">
          <Field label="Legal name" value={user.legalName} />
          <Field
            label="Aadhaar number"
            value={
              user.aadhaarNumber ? (
                <code className="font-mono">
                  {user.aadhaarNumber.slice(0, 4)} {user.aadhaarNumber.slice(4, 8)}{" "}
                  {user.aadhaarNumber.slice(8)}
                </code>
              ) : null
            }
          />
          <Field
            label="PAN"
            value={
              user.panNumber ? (
                <code className="font-mono">{user.panNumber}</code>
              ) : null
            }
          />
        </Section>

        <Section title="Bank account">
          <Field label="Account name" value={user.bankAccountName} />
          <Field label="Bank" value={user.bankName} />
          <Field
            label="Account number"
            value={
              user.bankAccount ? (
                <code className="font-mono">{user.bankAccount}</code>
              ) : null
            }
          />
          <Field
            label="IFSC"
            value={
              user.bankIfsc ? (
                <code className="font-mono">{user.bankIfsc}</code>
              ) : null
            }
          />
        </Section>
      </div>

      <Section title="Documents">
        <div className="grid sm:grid-cols-3 gap-4">
          <DocPreview
            label="Aadhaar — front"
            href={`/api/kyc/document/${user.id}/aadhaar-front`}
            present={!!user.aadhaarKey}
          />
          <DocPreview
            label="Aadhaar — back"
            href={`/api/kyc/document/${user.id}/aadhaar-back`}
            present={!!user.aadhaarBackKey}
          />
          <DocPreview
            label="PAN card"
            href={`/api/kyc/document/${user.id}/pan`}
            present={!!user.panKey}
          />
        </div>
      </Section>

      {user.kycStatus === "PENDING" && <KycActions userId={user.id} />}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted pb-2 border-b border-border">
        {title}
      </div>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 items-start text-sm">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-primary">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

function DocPreview({
  label,
  href,
  present,
}: {
  label: string;
  href: string;
  present: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted mb-2">{label}</div>
      {present ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="block aspect-[4/3] rounded-lg overflow-hidden bg-elevated border border-border hover:border-accent/40 transition-colors group relative"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={href}
            alt={label}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-canvas/0 group-hover:bg-canvas/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-xs font-medium text-white px-2 py-1 rounded bg-canvas/80">
              Open full size ↗
            </span>
          </div>
        </a>
      ) : (
        <div className="aspect-[4/3] rounded-lg border border-border border-dashed bg-surface/50 flex flex-col items-center justify-center text-muted text-xs gap-1.5">
          <FileImage className="w-5 h-5" />
          Not uploaded
        </div>
      )}
    </div>
  );
}
