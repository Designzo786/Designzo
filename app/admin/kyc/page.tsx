import Link from "next/link";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/utils";
import {
  KYC_STATUS_LABEL,
  KYC_STATUS_COLOR,
  maskAadhaar,
} from "@/lib/kyc";
import type { KycStatus } from "@prisma/client";

const TABS: { value: KycStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (
    status && ["PENDING", "VERIFIED", "REJECTED"].includes(status)
      ? status
      : "PENDING"
  ) as KycStatus | "ALL";

  const users = await prisma.user.findMany({
    where:
      filter === "ALL"
        ? { kycStatus: { not: "UNVERIFIED" } }
        : { kycStatus: filter as KycStatus },
    select: {
      id: true,
      name: true,
      email: true,
      legalName: true,
      aadhaarNumber: true,
      kycStatus: true,
      kycSubmittedAt: true,
      kycVerifiedAt: true,
    },
    orderBy: [{ kycSubmittedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          KYC Verification
        </h1>
        <p className="text-sm text-muted mt-1">
          Review submitted Aadhaar, PAN, and bank details for creator payout
          eligibility.
        </p>
      </header>

      <div className="rounded-xl border border-warning/20 bg-gold-muted p-3 flex items-start gap-2.5 text-xs text-secondary">
        <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <div>
          <strong className="text-primary">PII reminder.</strong> Documents
          contain Aadhaar numbers and bank details. Verify only — do not
          export, screenshot, or share. Every action is logged.
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <Link
              key={t.value}
              href={t.value === "PENDING" ? "/admin/kyc" : `/admin/kyc?status=${t.value}`}
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

      {users.length === 0 ? (
        <div className="rounded-xl border border-border border-dashed bg-surface/50 p-12 text-center text-sm text-muted">
          No KYC submissions in this queue.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-160 text-sm">
            <thead className="bg-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3">User</th>
                <th className="text-left font-medium px-4 py-3">Legal name</th>
                <th className="text-left font-medium px-4 py-3">Aadhaar</th>
                <th className="text-left font-medium px-4 py-3">Submitted</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-elevated/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-primary truncate max-w-[180px]">
                      {u.name ?? "Unnamed"}
                    </div>
                    <div className="text-xs text-muted truncate max-w-[180px]">
                      {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary text-xs">
                    {u.legalName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-secondary font-mono text-xs">
                    {maskAadhaar(u.aadhaarNumber)}
                  </td>
                  <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                    {u.kycSubmittedAt
                      ? formatRelativeTime(u.kycSubmittedAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${KYC_STATUS_COLOR[u.kycStatus]}`}
                    >
                      {KYC_STATUS_LABEL[u.kycStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/kyc/${u.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Review
                    </Link>
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
