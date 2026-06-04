import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, commissionCalc, creatorDisplayName } from "@/lib/utils";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Auth + asset fetch are independent — run them in parallel.
  const [session, asset] = await Promise.all([
    auth(),
    prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        previewKey: true,
        price: true,
        status: true,
        uploaderId: true,
        uploader: { select: { name: true, role: true, email: true } },
      },
    }),
  ]);

  if (!session) {
    redirect(`/login?callbackUrl=/checkout/${id}`);
  }

  if (!asset) notFound();

  // Free assets don't go through checkout — bounce them to the detail page
  // where the Download button is.
  if (asset.price === 0) {
    redirect(`/explore/${asset.id}`);
  }

  // Uploaders can't buy their own asset — silly UX
  if (asset.uploaderId === session.user.id) {
    redirect(`/explore/${asset.id}`);
  }

  // Already purchased? Send them to library.
  const existing = await prisma.purchase.findFirst({
    where: {
      buyerId: session.user.id,
      assetId: asset.id,
      status: "COMPLETED",
    },
    select: { id: true },
  });
  if (existing) {
    redirect("/dashboard/library?purchased=" + asset.id);
  }

  if (asset.status !== "APPROVED") {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border border-border border-dashed bg-surface/50 p-8 text-center">
          <h1 className="text-xl font-semibold text-primary mb-2">
            This asset isn&apos;t available
          </h1>
          <p className="text-sm text-muted mb-5">
            It hasn&apos;t been approved by an administrator yet.
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-border hover:border-accent/40 hover:text-accent-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const commissionPct = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "20");
  const { platformFee, creatorEarning } = commissionCalc(
    asset.price,
    commissionPct
  );

  const razorpayConfigured = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );

  const buyer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href={`/explore/${asset.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-secondary mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to asset
      </Link>

      <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              Checkout
            </h1>
            <p className="text-sm text-muted mt-1 inline-flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Secure one-time purchase
            </p>
          </header>

          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-4">
              {asset.previewKey ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.previewKey}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover bg-canvas shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-elevated shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-primary truncate">
                  {asset.title}
                </div>
                <div className="text-xs text-muted truncate">
                  by {creatorDisplayName(asset.uploader.name, asset.uploader.role, asset.uploader.email)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">
                  {formatPrice(asset.price)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 space-y-3 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
              <Receipt className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Order summary
            </h2>
            <div className="flex justify-between">
              <span className="text-secondary">Asset price</span>
              <span className="text-primary">{formatPrice(asset.price)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Creator earns</span>
              <span className="text-muted">{formatPrice(creatorEarning)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Platform fee ({commissionPct}%)</span>
              <span className="text-muted">{formatPrice(platformFee)}</span>
            </div>
            <div className="border-t border-border pt-3 mt-3 flex justify-between font-semibold">
              <span className="text-primary">Total</span>
              <span className="text-primary text-lg">
                {formatPrice(asset.price)}
              </span>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5 text-sm space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              What you&apos;re getting
            </h2>
            <ul className="space-y-1.5 text-secondary">
              <li className="inline-flex items-start gap-2 w-full">
                <CheckCircle2 className="w-4 h-4 text-info mt-0.5 shrink-0" />
                Lifetime download access
              </li>
              <li className="inline-flex items-start gap-2 w-full">
                <CheckCircle2 className="w-4 h-4 text-info mt-0.5 shrink-0" />
                Royalty-free commercial license
              </li>
              <li className="inline-flex items-start gap-2 w-full">
                <CheckCircle2 className="w-4 h-4 text-info mt-0.5 shrink-0" />
                Receipt and license key in your library
              </li>
            </ul>
          </section>
        </div>

        <aside className="md:sticky md:top-24">
          <CheckoutClient
            assetId={asset.id}
            assetTitle={asset.title}
            priceCents={asset.price}
            razorpayConfigured={razorpayConfigured}
            buyerName={buyer?.name}
            buyerEmail={buyer?.email}
          />
        </aside>
      </div>
    </div>
  );
}
