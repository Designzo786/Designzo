import Link from "next/link";
import { redirect } from "next/navigation";
import {
  User,
  ShieldCheck,
  Check,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AvatarUpload } from "./AvatarUpload";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/dashboard/profile");

  // Profile + linked-account state in parallel so the page loads in one
  // round-trip even on a cold Neon connection.
  const [user, googleAccount] = await Promise.all([
    prisma.user.findUnique({
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
    }),
    prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
      select: { id: true },
    }),
  ]);
  if (!user) redirect("/login");

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  const hasPassword = !!user.passwordHash;
  const hasGoogle = !!googleAccount;

  // Profile-completion checklist. Four equally-weighted fields drive a
  // 0-100% progress bar at the top of the page — gentle nudge for users
  // to round out their public profile without nagging.
  const checks = [
    { key: "avatar", label: "Profile photo", done: !!user.image },
    { key: "name", label: "Display name", done: !!user.name?.trim() },
    { key: "bio", label: "Short bio", done: !!user.bio?.trim() },
    { key: "website", label: "Website", done: !!user.website?.trim() },
  ];
  const completedCount = checks.filter((c) => c.done).length;
  const completion = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* ─── Hero header ─────────────────────────────────────────────────
          Profile photo upload + role badge + member-since + completion
          progress bar. All in one bordered card so the rest of the page
          can stay structurally identical (sections under the hero). */}
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative">
          <AvatarUpload
            initialImage={user.image}
            name={user.name}
            email={user.email}
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-accent-muted text-accent-light border border-accent/20">
              {user.role}
            </span>
            <span className="text-xs text-muted">
              Member since {memberSince}
            </span>
          </div>

          {/* Profile-completion progress */}
          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Profile completeness
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  completion === 100 ? "text-info" : "text-primary"
                }`}
              >
                {completion}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full gradient-accent transition-all duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            {/* Checklist — completed items show a check, missing items
                show a faint dot so the user knows where the gap is. */}
            <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {checks.map((c) => (
                <li
                  key={c.key}
                  className={`inline-flex items-center gap-1.5 ${
                    c.done ? "text-secondary" : "text-muted"
                  }`}
                >
                  {c.done ? (
                    <Check className="w-3.5 h-3.5 text-info shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 inline-flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                    </span>
                  )}
                  <span className={c.done ? "line-through opacity-70" : ""}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </header>

      {/* ─── Account & connections ──────────────────────────────────────
          Read-only summary of how the user signs in. Email is implicit;
          the Google row shows ✓ Connected when an OAuth row exists for
          this user, "Not connected" otherwise. Separate from the public
          profile form below — security stays in its own bucket. */}
      <SectionCard
        icon={ShieldCheck}
        title="Account & sign-in"
        subtitle="How you log into Dezignxo."
      >
        <ul className="divide-y divide-border">
          <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="w-9 h-9 rounded-lg bg-elevated border border-border text-accent-light flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-primary truncate">
                {user.email}
              </div>
              <div className="text-xs text-muted mt-0.5">Primary email</div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-info shrink-0">
              <Check className="w-3.5 h-3.5" />
              Verified
            </span>
          </li>
          <li className="flex items-center gap-3 py-3 last:pb-0">
            <span className="w-9 h-9 rounded-lg bg-elevated border border-border flex items-center justify-center shrink-0">
              <GoogleGlyph />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-primary">Google</div>
              <div className="text-xs text-muted mt-0.5">
                {hasGoogle
                  ? "One-click sign-in is enabled."
                  : "Not connected to this account."}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                hasGoogle ? "text-info" : "text-muted"
              }`}
            >
              {hasGoogle ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  Not linked
                </>
              )}
            </span>
          </li>
        </ul>
      </SectionCard>

      {/* ─── Public profile form ────────────────────────────────────── */}
      <SectionCard
        icon={User}
        title="Public profile"
        subtitle="What buyers see when they browse your assets."
      >
        <ProfileForm
          initialName={user.name ?? ""}
          initialBio={user.bio ?? ""}
          initialWebsite={user.website ?? ""}
        />
      </SectionCard>

      {/* ─── Password / security ────────────────────────────────────── */}
      <SectionCard
        icon={Lock}
        title={hasPassword ? "Change password" : "Set a password"}
        subtitle={
          hasPassword
            ? "Update the password used to sign in with email."
            : "Add a password so you can sign in with email in addition to Google."
        }
      >
        <ChangePasswordForm requiresCurrent={hasPassword} />
      </SectionCard>

      {/* ─── Optional next step ─────────────────────────────────────── */}
      {user.role !== "USER" && (
        <Link
          href="/dashboard/uploads"
          className="group block rounded-2xl border border-border bg-surface p-5 hover:border-accent/40 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-muted border border-accent/20 text-accent-light flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-primary">
                See how your profile reads to buyers
              </div>
              <div className="text-xs text-muted mt-0.5">
                Your name, bio and avatar appear on every asset you ship.
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent-light group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      )}
    </div>
  );
}

/**
 * Uniform section wrapper. Icon + title + subtitle in the header, the
 * actual form / list below. Keeps every section visually consistent.
 */
function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex items-start gap-3 mb-5">
        <span className="w-9 h-9 rounded-lg bg-accent-muted border border-accent/20 text-accent-light flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-primary">{title}</h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Inline Google "G" glyph — keeps a recognisable brand mark on the
 * connections row without pulling in the lucide brand pack.
 */
function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.997 10.997 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
