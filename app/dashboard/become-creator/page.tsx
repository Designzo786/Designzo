import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpgradeToCollaborator } from "./UpgradeToCollaborator";

export const metadata = { title: "Become a Collaborator" };

export default async function BecomeCreatorPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/become-creator");

  // Admins and existing Creators don't need this page — bounce them.
  if (session.user.role === "CREATOR" || session.user.role === "ADMIN") {
    redirect("/dashboard");
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { creatorStatus: true, creatorDecidedAt: true },
  });
  if (!me) redirect("/login");

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Become a Collaborator
        </h1>
        <p className="text-sm text-muted mt-1">
          Upgrade your account so you can upload, sell, and earn from your 3D
          assets on Dezignxo.
        </p>
      </header>

      <UpgradeToCollaborator
        initialStatus={me.creatorStatus}
        decidedAt={me.creatorDecidedAt}
      />
    </div>
  );
}
