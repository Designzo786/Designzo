import { redirect } from "next/navigation";
import { Clock, AlertCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { DashboardNav } from "./DashboardNav";
import { ProfileCompletionPrompt } from "./ProfileCompletionPrompt";

// A user counts as "fresh" for ~10 minutes after sign-up — long enough that
// the post-register dashboard arrival catches it, short enough that a regular
// return visit never re-triggers the welcome prompt.
const FRESH_ACCOUNT_MS = 10 * 60 * 1000;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard");

  // Surface the collaborator application state so a pending creator knows
  // why the upload tools aren't available yet. Pull a few profile fields at
  // the same time so we can decide whether to nudge the user toward the
  // "complete your profile" modal.
  const me = await prisma.user
    .findUnique({
      where: { id: session.user.id },
      select: {
        creatorStatus: true,
        image: true,
        bio: true,
        website: true,
        createdAt: true,
      },
    })
    .catch(() => null);

  const isFresh =
    !!me && Date.now() - me.createdAt.getTime() < FRESH_ACCOUNT_MS;
  const missingAvatar = !me?.image;
  const missingBio = !me?.bio || me.bio.trim().length === 0;
  const missingWebsite = !me?.website || me.website.trim().length === 0;
  const isIncomplete = missingAvatar || missingBio || missingWebsite;

  return (
    <div className="min-h-dvh bg-canvas">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {me?.creatorStatus === "PENDING" && (
          <div className="mb-6 rounded-xl border border-gold/20 bg-gold-muted p-4 flex items-start gap-3">
            <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <div className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary">
                Your Collaborator account is under review.
              </strong>{" "}
              An admin typically approves new creators within 1 business day.
              You&apos;ll get a notification the moment you&apos;re approved —
              then the upload tools unlock.
            </div>
          </div>
        )}
        {me?.creatorStatus === "REJECTED" && (
          <div className="mb-6 rounded-xl border border-danger/20 bg-danger-muted p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary">
                Your Collaborator application was not approved.
              </strong>{" "}
              You can still browse and buy assets. Reach out via the contact
              page if you have questions.
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[220px_1fr] gap-4 lg:gap-8">
          <aside className="lg:sticky lg:top-24 lg:self-start min-w-0">
            <DashboardNav role={session.user.role} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {/* Post-signup nudge — only renders on the client when both conditions
          (fresh account + missing profile fields) hold, and respects a
          per-browser dismissal flag so it never feels annoying. */}
      <ProfileCompletionPrompt
        isFresh={isFresh}
        isIncomplete={isIncomplete}
        missing={{
          avatar: missingAvatar,
          bio: missingBio,
          website: missingWebsite,
        }}
      />
    </div>
  );
}
