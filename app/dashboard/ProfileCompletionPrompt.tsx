"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Sparkles, X, ArrowRight, Camera, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "designo.profile-completion.dismissed";

interface Props {
  /** True if any of avatar, bio, or website is missing. */
  isIncomplete: boolean;
  /** Created less than ~10 min ago — treat as a fresh signup. */
  isFresh: boolean;
  /** Quick checklist for the body — drives the bullet icons. */
  missing: {
    avatar: boolean;
    bio: boolean;
    website: boolean;
  };
}

/**
 * One-time post-signup nudge to flesh out the user's profile. Appears only
 * when (a) the account is brand new AND (b) the profile has obvious gaps
 * (no avatar / bio / website). Self-dismisses for the rest of the browser
 * session via localStorage so a user who closes it doesn't see it again on
 * every dashboard reload.
 */
export function ProfileCompletionPrompt({
  isIncomplete,
  isFresh,
  missing,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isIncomplete || !isFresh) return;
    // Don't re-prompt if the user already chose "Maybe later" once.
    if (typeof window !== "undefined") {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    }
    // Tiny delay so the dashboard finishes its fade-in before the modal lands.
    const t = window.setTimeout(() => setOpen(true), 350);
    return () => window.clearTimeout(t);
  }, [isIncomplete, isFresh]);

  // Lock scroll + ESC handler while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function dismiss() {
    setOpen(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  }

  function navigateToProfile() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
    setOpen(false);
    router.push("/dashboard/profile");
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-completion-title"
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in cursor-default"
      />

      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl bg-surface border border-border p-6",
          "animate-[scale-in_0.18s_ease-out]",
          "shadow-[0_30px_80px_-20px_rgba(124,58,237,0.4),0_0_0_1px_rgba(124,58,237,0.15)_inset]"
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted hover:text-primary hover:bg-elevated transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Sparkle hero icon */}
        <div
          className={cn(
            "w-14 h-14 rounded-2xl border border-accent/40 flex items-center justify-center mb-5",
            "bg-gradient-to-br from-accent/30 to-accent/5 text-accent-light",
            "shadow-[0_0_32px_-6px_rgba(124,58,237,0.55)]"
          )}
        >
          <Sparkles className="w-6 h-6" strokeWidth={2.2} />
        </div>

        <h2
          id="profile-completion-title"
          className="text-lg font-semibold text-primary leading-tight"
        >
          Welcome — finish setting up your profile
        </h2>
        <p className="mt-2 text-sm text-secondary leading-relaxed">
          A complete profile builds trust with buyers and creators. Takes less
          than a minute.
        </p>

        {/* Checklist of missing pieces */}
        <ul className="mt-5 space-y-2.5">
          {missing.avatar && (
            <ChecklistItem
              icon={Camera}
              label="Upload an avatar"
              hint="Helps people recognise you across the marketplace"
            />
          )}
          {missing.bio && (
            <ChecklistItem
              icon={FileText}
              label="Write a short bio"
              hint="Tell buyers what you make or what you're into"
            />
          )}
          {missing.website && (
            <ChecklistItem
              icon={Globe}
              label="Add your website or portfolio"
              hint="Optional — link your work so visitors can dig deeper"
            />
          )}
        </ul>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-primary hover:bg-elevated border border-border hover:border-border-hover transition-colors"
          >
            Maybe later
          </button>
          <button
            type="button"
            onClick={navigateToProfile}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold",
              "bg-accent text-white hover:bg-accent/90 transition-all",
              "shadow-[0_8px_24px_-8px_rgba(124,58,237,0.6)]"
            )}
          >
            Complete profile
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ChecklistItem({
  icon: Icon,
  label,
  hint,
}: {
  icon: typeof Camera;
  label: string;
  hint: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-elevated/40 p-3">
      <div className="w-8 h-8 rounded-lg bg-accent-muted text-accent-light flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-primary">{label}</div>
        <div className="text-xs text-muted leading-snug mt-0.5">{hint}</div>
      </div>
    </li>
  );
}
