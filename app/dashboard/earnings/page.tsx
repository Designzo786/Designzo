import { DollarSign } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { balance: true },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Earnings
        </h1>
        <p className="text-sm text-muted mt-1">
          Track creator earnings and request payouts.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center text-accent-light">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-muted">Available balance</div>
            <div className="text-2xl font-bold text-primary">
              {formatPrice(user?.balance ?? 0)}
            </div>
          </div>
        </div>
      </div>

      <EmptyState
        icon={DollarSign}
        title="Payouts coming soon"
        description="Once you start selling, you'll be able to request PayPal payouts from this page."
      />
    </div>
  );
}
