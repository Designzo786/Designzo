import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  KYC_STATUS_LABEL,
  KYC_STATUS_COLOR,
  maskAadhaar,
  maskPan,
  maskBankAccount,
} from "@/lib/kyc";
import { formatDate } from "@/lib/utils";
import { KycForm } from "./KycForm";
import { WithdrawButton } from "./WithdrawButton";

export const metadata = { title: "KYC & Legal" };

export default async function KycPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/kyc");
  // KYC exists only to enable creator payouts — buy-only USERs don't need it.
  if (session.user.role === "USER") redirect("/dashboard/library");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      kycStatus: true,
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
      kycSubmittedAt: true,
      kycVerifiedAt: true,
      kycRejectionNote: true,
    },
  });
  if (!user) redirect("/login");

  const status = user.kycStatus;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          KYC &amp; Legal
        </h1>
        <p className="text-sm text-muted mt-1">
          Verify your identity to receive payouts. Required by Indian
          regulations for any payout above ₹50,000.
        </p>
      </header>

      <StatusCard
        status={status}
        submittedAt={user.kycSubmittedAt}
        verifiedAt={user.kycVerifiedAt}
        rejectionNote={user.kycRejectionNote}
      />

      {status === "VERIFIED" || status === "PENDING" ? (
        <SubmittedView user={user} />
      ) : (
        <KycForm
          initialLegalName={user.legalName ?? ""}
          initialAadhaar={user.aadhaarNumber ?? ""}
          initialPan={user.panNumber ?? ""}
          initialBankAccountName={user.bankAccountName ?? ""}
          initialBankAccount={user.bankAccount ?? ""}
          initialBankIfsc={user.bankIfsc ?? ""}
          initialBankName={user.bankName ?? ""}
        />
      )}
    </div>
  );
}

function StatusCard({
  status,
  submittedAt,
  verifiedAt,
  rejectionNote,
}: {
  status: string;
  submittedAt: Date | null;
  verifiedAt: Date | null;
  rejectionNote: string | null;
}) {
  const Icon =
    status === "VERIFIED"
      ? CheckCircle2
      : status === "PENDING"
        ? Clock
        : status === "REJECTED"
          ? AlertCircle
          : ShieldCheck;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted shrink-0" />
          <div>
            <div className="text-sm font-medium text-primary">
              Verification status
            </div>
            <div className="text-xs text-muted mt-0.5">
              {status === "PENDING" && submittedAt
                ? `Submitted on ${formatDate(submittedAt)} · usually reviewed within 2 business days`
                : status === "VERIFIED" && verifiedAt
                  ? `Verified on ${formatDate(verifiedAt)}`
                  : status === "REJECTED"
                    ? "Address the issue below and resubmit"
                    : "Complete the form below to submit for review"}
            </div>
          </div>
        </div>
        <span
          className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${KYC_STATUS_COLOR[status]}`}
        >
          {KYC_STATUS_LABEL[status]}
        </span>
      </div>

      {status === "REJECTED" && rejectionNote && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-semibold uppercase tracking-wider text-danger mb-1.5">
            Rejection reason
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            {rejectionNote}
          </p>
        </div>
      )}

      {status === "PENDING" && (
        <div className="mt-4 pt-4 border-t border-border">
          <WithdrawButton />
        </div>
      )}
    </div>
  );
}

function SubmittedView({
  user,
}: {
  user: {
    legalName: string | null;
    aadhaarNumber: string | null;
    panNumber: string | null;
    bankAccountName: string | null;
    bankAccount: string | null;
    bankIfsc: string | null;
    bankName: string | null;
  };
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2 text-xs text-muted mb-5">
        <Lock className="w-3.5 h-3.5" />
        Sensitive details — masked for your security
      </div>

      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Row label="Legal name" value={user.legalName ?? "—"} />
        <Row label="Aadhaar number" value={maskAadhaar(user.aadhaarNumber)} />
        <Row label="PAN" value={maskPan(user.panNumber)} />
        <Row label="Bank account name" value={user.bankAccountName ?? "—"} />
        <Row label="Bank name" value={user.bankName ?? "—"} />
        <Row label="Account number" value={maskBankAccount(user.bankAccount)} />
        <Row label="IFSC" value={user.bankIfsc ?? "—"} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-primary font-medium mt-0.5">{value}</dd>
    </div>
  );
}
