import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      bio: true,
      website: true,
      role: true,
      passwordHash: true,
      createdAt: true,
    },
  });
  if (!user) redirect("/login");

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  const hasPassword = !!user.passwordHash;

  return (
    <div className="space-y-8 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Profile
        </h1>
        <p className="text-sm text-muted mt-1">
          Manage your public profile and account settings.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-surface p-6 space-y-6">
        <div className="pb-6 border-b border-border">
          <AvatarUpload
            initialImage={user.image}
            name={user.name}
            email={user.email}
          />
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-accent-muted text-accent-light border border-accent/20">
              {user.role}
            </span>
            <span className="text-xs text-muted">
              Member since {memberSince}
            </span>
          </div>
        </div>

        <ProfileForm
          initialName={user.name ?? ""}
          initialBio={user.bio ?? ""}
          initialWebsite={user.website ?? ""}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-primary mb-1">
          {hasPassword ? "Change password" : "Set a password"}
        </h2>
        <p className="text-sm text-muted mb-5">
          {hasPassword
            ? "Update the password used to sign in with email."
            : "Add a password so you can sign in with email in addition to Google."}
        </p>
        <ChangePasswordForm requiresCurrent={hasPassword} />
      </section>
    </div>
  );
}
